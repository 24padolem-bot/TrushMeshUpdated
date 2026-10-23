"""Dataset and test scenarios for TrustMesh Python Engine."""

import random
from typing import List, Optional
from .models import InsuranceClaim, TestCase


INITIAL_CLAIMS: List[InsuranceClaim] = [
    InsuranceClaim(
        claim_id='CLM-2026-001',
        customer_name='Rahul Sharma',
        customer_id='CUST-8842',
        policy_number='POL-88421',
        insurance_type='Motor Insurance',
        vehicle_number='MH31AB1234',
        incident_date='2026-10-18',
        claim_submission_date='2026-10-20',
        reported_damage='Front bumper and headlight damage',
        estimated_repair_cost=48000.0,
        policy_coverage_limit=100000.0,
        policy_status='Active',
        deductible=5000.0,
        previous_related_claims=1,
        original_claim_amount=48000.0,
        expected_eligible_amount=43000.0,
        initial_claim_status='Under Review',
        location='Nagpur, Maharashtra',
        notes='Initial benchmark claim. Night parking collision with bollard.'
    ),
    InsuranceClaim(
        claim_id='CLM-2026-002',
        customer_name='Priya Iyer',
        customer_id='CUST-9120',
        policy_number='POL-91204',
        insurance_type='Motor Insurance',
        vehicle_number='KA01MJ4492',
        incident_date='2026-09-12',
        claim_submission_date='2026-09-14',
        reported_damage='Rear fender dent and tail light breakage',
        estimated_repair_cost=32000.0,
        policy_coverage_limit=250000.0,
        policy_status='Active',
        deductible=3000.0,
        previous_related_claims=0,
        original_claim_amount=32000.0,
        expected_eligible_amount=29000.0,
        initial_claim_status='Under Review',
        location='Bengaluru, Karnataka',
        notes='Rear-ended at signal intersection.'
    ),
    InsuranceClaim(
        claim_id='CLM-2026-003',
        customer_name='Amitabh Sen',
        customer_id='CUST-3041',
        policy_number='POL-30418',
        insurance_type='Commercial Property',
        incident_date='2026-10-02',
        claim_submission_date='2026-10-05',
        reported_damage='Water pipe rupture causing warehouse inventory spoilage',
        estimated_repair_cost=450000.0,
        policy_coverage_limit=1500000.0,
        policy_status='Active',
        deductible=25000.0,
        previous_related_claims=0,
        original_claim_amount=450000.0,
        expected_eligible_amount=425000.0,
        initial_claim_status='Under Review',
        location='Kolkata, West Bengal',
        notes='Commercial warehouse plumbing failure.'
    ),
    InsuranceClaim(
        claim_id='CLM-2026-004',
        customer_name='Sunita Deshmukh',
        customer_id='CUST-5519',
        policy_number='POL-55193',
        insurance_type='Health Insurance',
        incident_date='2026-08-20',
        claim_submission_date='2026-08-24',
        reported_damage='Laparoscopic cholecystectomy and 3-day hospitalization',
        estimated_repair_cost=135000.0,
        policy_coverage_limit=500000.0,
        policy_status='Active',
        deductible=10000.0,
        previous_related_claims=0,
        original_claim_amount=135000.0,
        expected_eligible_amount=125000.0,
        initial_claim_status='Under Review',
        location='Pune, Maharashtra',
        notes='Network hospital admission and surgery bills.'
    ),
    InsuranceClaim(
        claim_id='CLM-2026-005',
        customer_name='Vikram Malhotra',
        customer_id='CUST-7728',
        policy_number='POL-77281',
        insurance_type='Homeowners Insurance',
        incident_date='2026-09-28',
        claim_submission_date='2026-10-01',
        reported_damage='Rooftop solar panel cracking from severe hailstorm',
        estimated_repair_cost=85000.0,
        policy_coverage_limit=800000.0,
        policy_status='Active',
        deductible=7500.0,
        previous_related_claims=1,
        original_claim_amount=85000.0,
        expected_eligible_amount=77500.0,
        initial_claim_status='Under Review',
        location='Shimla, Himachal Pradesh',
        notes='Meteorological department hailstorm advisory confirmed.'
    )
]


DETERMINISTIC_TEST_CASES: List[TestCase] = [
    TestCase(
        id='TM-TEST-001',
        name='Clean Compliant Claim Handoff',
        claim_id='CLM-2026-001',
        error_category='CLEAN_VERIFIED',
        error_description='Normal end-to-end handoff across all 5 agents. All schemas and calculations match.',
        affected_handoff='A_TO_B',
        source_agent='agent_a',
        dest_agent='agent_b',
        severity='info',
        expected_status='VERIFIED',
        expected_detection='All 10 TrustMesh verification checks pass without anomalies.',
        expected_action='Allow continuous pipeline execution to Agent E decision.'
    ),
    TestCase(
        id='TM-TEST-002',
        name='Data Loss: Missing Policy Number',
        claim_id='CLM-2026-001',
        error_category='DATA_LOSS',
        error_description='Agent A dispatches claim intake record, but mandatory policy_number is dropped in transit.',
        affected_handoff='A_TO_B',
        source_agent='agent_a',
        dest_agent='agent_b',
        affected_field='policy_number',
        original_value='POL-88421',
        injected_value=None,
        severity='high',
        expected_status='BLOCKED',
        expected_detection='Missing required field policy_number detected at Checkpoint 1.',
        expected_action='Block workflow. Request state recovery from Agent A snapshot.',
        is_recoverable=True
    ),
    TestCase(
        id='TM-TEST-003',
        name='Data Manipulation: Coverage Limit 10x Inflation',
        claim_id='CLM-2026-001',
        error_category='DATA_MANIPULATION',
        error_description='Policy coverage limit unexpectedly inflated 10x during transfer from Agent B to Agent C.',
        affected_handoff='B_TO_C',
        source_agent='agent_b',
        dest_agent='agent_c',
        affected_field='policy_coverage_limit',
        original_value=100000.0,
        injected_value=1000000.0,
        severity='critical',
        expected_status='BLOCKED',
        expected_detection='Field-level comparison flags unauthorized modification of policy_coverage_limit.',
        expected_action='Block unauthorized change. Preserve original verified limit.',
        is_recoverable=True
    ),
    TestCase(
        id='TM-TEST-004',
        name='Incorrect Calculation: Arithmetic Mismatch',
        claim_id='CLM-2026-001',
        error_category='INCORRECT_CALCULATIONS',
        error_description='Agent C calculates eligible amount with arithmetic error instead of correct deduction.',
        affected_handoff='C_TO_D',
        source_agent='agent_c',
        dest_agent='agent_d',
        affected_field='calculated_eligible_amount',
        original_value=43000.0,
        injected_value=35000.0,
        severity='high',
        expected_status='BLOCKED',
        expected_detection='Independent audit engine recalculates and identifies mathematical mismatch.',
        expected_action='Halt workflow and enforce verified recalculated amount.',
        is_recoverable=True
    ),
    TestCase(
        id='TM-TEST-005',
        name='Data Loss: Missing Risk Findings at Decision Stage',
        claim_id='CLM-2026-001',
        error_category='DATA_LOSS',
        error_description='Risk findings and risk_score are completely stripped when passing from Agent D to Agent E.',
        affected_handoff='D_TO_E',
        source_agent='agent_d',
        dest_agent='agent_e',
        affected_field='risk_score',
        original_value=18,
        injected_value=None,
        severity='high',
        expected_status='BLOCKED',
        expected_detection='Required risk assessment payload missing at Checkpoint 4.',
        expected_action='Prevent decision that requires findings. Request missing evidence.',
        is_recoverable=True
    ),
    TestCase(
        id='TM-TEST-006',
        name='Data Corruption: Non-Numeric Claim Amount',
        claim_id='CLM-2026-001',
        error_category='DATA_CORRUPTION',
        error_description='Claim amount converted into invalid text string [CORRUPT_PAYLOAD_STRING].',
        affected_handoff='A_TO_B',
        source_agent='agent_a',
        dest_agent='agent_b',
        affected_field='original_claim_amount',
        original_value=48000.0,
        injected_value='[CORRUPT_PAYLOAD_STRING]',
        severity='high',
        expected_status='BLOCKED',
        expected_detection='Schema validator detects non-numeric string for original_claim_amount.',
        expected_action='Quarantine payload and trigger rollback.'
    ),
    TestCase(
        id='TM-TEST-007',
        name='Semantic Inconsistency: Contradictory Damage Facts',
        claim_id='CLM-2026-001',
        error_category='SEMANTIC_INCONSISTENCY',
        error_description='Reported damage altered from front bumper to rear bumper smash in transit.',
        affected_handoff='B_TO_C',
        source_agent='agent_b',
        dest_agent='agent_c',
        affected_field='reported_damage',
        original_value='Front bumper and headlight damage',
        injected_value='Rear bumper total smash and shattered windshield',
        severity='high',
        expected_status='HUMAN_REVIEW',
        expected_detection='Semantic damage verification flags cross-handoff contradiction.',
        expected_action='Route to Senior Human Adjuster review.'
    ),
    TestCase(
        id='TM-TEST-011',
        name='Network Timeout & State Retry Recovery',
        claim_id='CLM-2026-001',
        error_category='PARTIAL_FAILED_HANDOFF',
        error_description='Agent C endpoint drops connection before acknowledgement.',
        affected_handoff='B_TO_C',
        source_agent='agent_b',
        dest_agent='agent_c',
        severity='high',
        expected_status='RECOVERY',
        expected_detection='Network socket dropped connection. Checkpoint snapshot created.',
        expected_action='Initiate state snapshot retry.',
        is_recoverable=True,
        simulated_timeout=True
    ),
    TestCase(
        id='TM-TEST-012',
        name='Unsupported Risk Score (No Corroborating Evidence)',
        claim_id='CLM-2026-001',
        error_category='MISLEADING_OUTPUT',
        error_description='Agent D produces an elevated risk score of 94 with empty evidence package.',
        affected_handoff='D_TO_E',
        source_agent='agent_d',
        dest_agent='agent_e',
        affected_field='risk_score',
        original_value=18,
        injected_value=94,
        severity='high',
        expected_status='HUMAN_REVIEW',
        expected_detection='High risk score not supported by evidence package.',
        expected_action='Flag for Human Adjuster oversight; prevent automatic rejection.'
    )
]


def bind_scenario_to_claim(test_case: TestCase, claim: InsuranceClaim) -> TestCase:
    """Adapts a test scenario so that its target values and fields match the selected claim."""
    cost = float(claim.estimated_repair_cost or claim.original_claim_amount)
    deductible = float(claim.deductible or 5000.0)
    limit = float(claim.policy_coverage_limit or 100000.0)
    expected_eligible = min(limit, max(0.0, cost - deductible))

    orig_val = test_case.original_value
    inj_val = test_case.injected_value

    if test_case.affected_field == 'policy_coverage_limit':
        orig_val = limit
        inj_val = limit * 10.0
    elif test_case.affected_field == 'policy_number':
        orig_val = claim.policy_number
        inj_val = None
    elif test_case.affected_field == 'calculated_eligible_amount':
        orig_val = expected_eligible
        inj_val = max(0.0, expected_eligible - 8000.0) if expected_eligible > 10000 else expected_eligible + 50000.0
    elif test_case.affected_field == 'original_claim_amount':
        orig_val = claim.original_claim_amount
        inj_val = '[CORRUPT_PAYLOAD_STRING]'
    elif test_case.affected_field == 'reported_damage':
        orig_val = claim.reported_damage
        inj_val = 'Rear bumper total smash and shattered windshield'

    return TestCase(
        id=test_case.id,
        name=test_case.name,
        claim_id=claim.claim_id,
        error_category=test_case.error_category,
        error_description=test_case.error_description,
        affected_handoff=test_case.affected_handoff,
        source_agent=test_case.source_agent,
        dest_agent=test_case.dest_agent,
        affected_field=test_case.affected_field,
        original_value=orig_val,
        injected_value=inj_val,
        severity=test_case.severity,
        expected_status=test_case.expected_status,
        expected_detection=test_case.expected_detection,
        expected_action=test_case.expected_action,
        is_recoverable=test_case.is_recoverable,
        simulated_timeout=test_case.simulated_timeout
    )
