"""Standard unittest test suite for TrustMesh Python Engine (no external dependencies required)."""

import unittest
from trustmesh.models import InsuranceClaim
from trustmesh.dataset import INITIAL_CLAIMS, DETERMINISTIC_TEST_CASES, bind_scenario_to_claim
from trustmesh.engine import execute_full_pipeline
from trustmesh.crypto import compute_sha256, canonical_json_dumps


class TestTrustMesh(unittest.TestCase):

    def test_clean_pipeline_execution(self):
        claim = INITIAL_CLAIMS[0]
        result = execute_full_pipeline(claim, test_case=None)

        self.assertFalse(result['is_blocked'])
        self.assertEqual(result['final_decision'].status, 'APPROVED')
        self.assertEqual(result['final_decision'].recommended_payout, 43000.0)
        self.assertEqual(len(result['handoff_results']), 4)
        for res in result['handoff_results'].values():
            self.assertEqual(res.status, 'VERIFIED')
            self.assertTrue(res.hash_match)

    def test_data_manipulation_detection(self):
        claim = INITIAL_CLAIMS[0]
        test_case = next(tc for tc in DETERMINISTIC_TEST_CASES if tc.error_category == 'DATA_MANIPULATION')
        bound_tc = bind_scenario_to_claim(test_case, claim)

        result = execute_full_pipeline(claim, test_case=bound_tc)
        self.assertTrue(result['is_blocked'])
        self.assertEqual(result['stopped_at'], 'B_TO_C')
        self.assertEqual(result['final_decision'].status, 'BLOCKED')

        b_to_c_res = result['handoff_results']['B_TO_C']
        self.assertEqual(b_to_c_res.status, 'BLOCKED')
        self.assertFalse(b_to_c_res.hash_match)
        self.assertTrue(any('Coverage limit' in issue for issue in b_to_c_res.issues))

    def test_incorrect_calculation_detection(self):
        claim = INITIAL_CLAIMS[0]
        test_case = next(tc for tc in DETERMINISTIC_TEST_CASES if tc.error_category == 'INCORRECT_CALCULATIONS')
        bound_tc = bind_scenario_to_claim(test_case, claim)

        result = execute_full_pipeline(claim, test_case=bound_tc)
        self.assertTrue(result['is_blocked'])
        self.assertEqual(result['stopped_at'], 'C_TO_D')
        self.assertEqual(result['final_decision'].status, 'BLOCKED')

        c_to_d_res = result['handoff_results']['C_TO_D']
        self.assertEqual(c_to_d_res.status, 'BLOCKED')
        self.assertIsNotNone(c_to_d_res.recalculation)
        self.assertGreater(c_to_d_res.recalculation.difference, 0)

    def test_canonical_sha256_stability(self):
        payload1 = {'b': 2, 'a': 1, 'c': {'y': 20, 'x': 10}}
        payload2 = {'a': 1, 'c': {'x': 10, 'y': 20}, 'b': 2}

        hash1 = compute_sha256(canonical_json_dumps(payload1))
        hash2 = compute_sha256(canonical_json_dumps(payload2))

        self.assertEqual(hash1, hash2)


if __name__ == '__main__':
    unittest.main()
