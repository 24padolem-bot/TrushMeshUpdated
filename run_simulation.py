#!/usr/bin/env python3
"""
TrustMesh Python Simulation Runner
Multi-Agent AI Verification & Cryptographic Checkpoint Audit Layer for Insurance Claims.
"""

import argparse
import sys
import json
from trustmesh.models import InsuranceClaim
from trustmesh.dataset import INITIAL_CLAIMS, DETERMINISTIC_TEST_CASES, bind_scenario_to_claim
from trustmesh.engine import execute_full_pipeline
from trustmesh.crypto import format_inr


def main():
    parser = argparse.ArgumentParser(description="TrustMesh Multi-Agent Verification Pipeline")
    parser.add_argument("--claim", default="CLM-2026-001", help="Claim ID to test (e.g., CLM-2026-001, CLM-2026-005)")
    parser.add_argument("--scenario", default="TM-TEST-003", help="Scenario ID (e.g., TM-TEST-001 for Clean Pass, TM-TEST-003 for Manipulation)")
    parser.add_argument("--clean", action="store_true", help="Force clean compliant pass")
    parser.add_argument("--json", action="store_true", help="Output raw JSON result")
    parser.add_argument("--list-claims", action="store_true", help="List all available claims")
    parser.add_argument("--list-scenarios", action="store_true", help="List all test scenarios")

    args = parser.parse_args()

    if args.list_claims:
        print("\n=== Available Insurance Claims ===")
        for c in INITIAL_CLAIMS:
            print(f"• {c.claim_id}: {c.customer_name} ({format_inr(c.original_claim_amount)}) - {c.insurance_type}")
        return

    if args.list_scenarios:
        print("\n=== Available Test Scenarios ===")
        for s in DETERMINISTIC_TEST_CASES:
            print(f"• [{s.id}] {s.name} ({s.error_category}) -> Handoff: {s.affected_handoff}")
        return

    # Select claim
    claim = next((c for c in INITIAL_CLAIMS if c.claim_id == args.claim), INITIAL_CLAIMS[0])

    # Select scenario
    if args.clean or args.scenario in ("CLEAN", "none", "NONE"):
        test_case = None
    else:
        raw_test_case = next((tc for tc in DETERMINISTIC_TEST_CASES if tc.id == args.scenario), DETERMINISTIC_TEST_CASES[2])
        test_case = bind_scenario_to_claim(raw_test_case, claim)

    if not args.json:
        print("=" * 72)
        print("  TRUSTMESH: MULTI-AGENT VERIFICATION ENGINE (PYTHON)")
        print("=" * 72)
        print(f"  Selected Claim   : {claim.claim_id} · {claim.customer_name}")
        print(f"  Insurance Type   : {claim.insurance_type}")
        print(f"  Repair Estimate  : {format_inr(claim.estimated_repair_cost)}")
        print(f"  Coverage Limit   : {format_inr(claim.policy_coverage_limit)}")
        print(f"  Deductible       : {format_inr(claim.deductible)}")
        print(f"  Test Scenario    : {test_case.name if test_case else 'Clean Compliant Pass (No Injected Errors)'}")
        if test_case:
            print(f"  Target Handoff   : {test_case.affected_handoff} ({test_case.error_category})")
        print("-" * 72)

    # Execute simulation
    result = execute_full_pipeline(claim, test_case)

    if args.json:
        # Convert dataclasses to dict for clean JSON
        output = {
            "claim_id": claim.claim_id,
            "scenario": test_case.id if test_case else "CLEAN",
            "decision": {
                "status": result["final_decision"].status,
                "summary": result["final_decision"].summary,
                "risk_score": result["final_decision"].risk_score,
                "recommended_payout": result["final_decision"].recommended_payout,
                "evidence": result["final_decision"].evidence
            },
            "handoffs": {
                hid: {
                    "status": res.status,
                    "severity": res.severity,
                    "issues": res.issues,
                    "hash_match": res.hash_match,
                    "source_hash": res.source_hash[:16] + "...",
                    "received_hash": res.received_hash[:16] + "..." if res.received_hash else None
                } for hid, res in result["handoff_results"].items()
            }
        }
        print(json.dumps(output, indent=2))
        return

    # Terminal Report
    handoff_titles = {
        "A_TO_B": "Checkpoint 1: Agent A (Intake) → Agent B (Policy)",
        "B_TO_C": "Checkpoint 2: Agent B (Policy) → Agent C (Damage)",
        "C_TO_D": "Checkpoint 3: Agent C (Damage) → Agent D (Risk)",
        "D_TO_E": "Checkpoint 4: Agent D (Risk)   → Agent E (Decision)"
    }

    for hid, res in result["handoff_results"].items():
        title = handoff_titles.get(hid, hid)
        status_symbol = "✔" if res.status == "VERIFIED" else ("✖ [BLOCKED]" if res.status == "BLOCKED" else f"⚠ [{res.status}]")
        print(f"\n[{res.status}] {title}")
        print(f"  SHA-256 Source Hash   : {res.source_hash[:32]}...")
        print(f"  SHA-256 Received Hash : {res.received_hash[:32]}...")
        print(f"  Cryptographic Match   : {'MATCH' if res.hash_match else 'TAMPERED / MISMATCH'}")

        if res.issues:
            print("  Detected Violations   :")
            for issue in res.issues:
                print(f"    • {issue}")
            print(f"  Required Action       : {res.required_action}")

        if res.recalculation:
            recalc = res.recalculation
            print(f"  Independent Audit     : Expected {format_inr(recalc.expected)} | Actual {format_inr(recalc.actual)} (Diff: {format_inr(recalc.difference)})")

    dec = result["final_decision"]
    print("\n" + "=" * 72)
    print(f"  FINAL ADJUDICATION VERDICT : {dec.status}")
    print("=" * 72)
    print(f"  Summary            : {dec.summary}")
    print(f"  Approved Payout    : {format_inr(dec.recommended_payout)}")
    print(f"  Calculated Risk    : {dec.risk_score}/100")
    print("  Evidence Package   :")
    for ev in dec.evidence:
        print(f"    • {ev}")
    print("=" * 72 + "\n")


if __name__ == "__main__":
    main()
