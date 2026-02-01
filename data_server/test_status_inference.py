#!/usr/bin/env python3
"""Test script for status inference system."""
import asyncio
import time
from database.postgres import init_db, ensure_user_exists, append_call, append_location, get_user
from database.db import Call, LocationPoint
from status_inference import infer_civilian_status, calculate_priority_score
import uuid


async def test_status_inference():
    """Test the status inference system."""
    print("🧪 Testing Status Inference System\n")

    # Initialize database
    await init_db()
    print("✅ Database initialized\n")

    # Test 1: Create a civilian with an emergency call
    print("📞 Test 1: Civilian emergency call → needs_help")
    user_id = "test_civilian_001"
    await ensure_user_exists(user_id, role="civilian", status="normal")

    # Add location
    await append_location(user_id, LocationPoint(
        lat=51.5074,
        lon=-0.1278,
        timestamp=time.time(),
        accuracy=10.0
    ))

    # Add emergency call with priority keywords
    call = Call(
        call_id=uuid.uuid4().hex,
        transcript="Help! There's a fire and people are trapped!",
        start_time=time.time() - 60,
        end_time=time.time(),
        tags=["help", "fire", "trapped"]
    )
    await append_call(user_id, call)

    # Trigger inference
    new_status = await infer_civilian_status(user_id)
    user = await get_user(user_id)
    print(f"   Status after call: {user.status}")
    print(f"   Expected: needs_help, Got: {user.status}")
    assert user.status == "needs_help", "Status should be needs_help"
    print("   ✅ Passed\n")

    # Test 2: Priority score calculation
    print("🎯 Test 2: Priority score calculation")
    score = await calculate_priority_score(user_id)
    print(f"   Priority score: {score}")
    print(f"   Expected: > 50 (has medical keywords)")
    assert score > 50, "Priority score should be above 50"
    print("   ✅ Passed\n")

    # Test 3: Create first responder
    print("🚑 Test 3: First responder creation")
    responder_id = "test_responder_001"
    await ensure_user_exists(responder_id, role="first_responder", status="docked")

    # Add location near hospital (mock hospital coordinates)
    await append_location(responder_id, LocationPoint(
        lat=51.5074,
        lon=-0.1278,
        timestamp=time.time(),
        accuracy=5.0
    ))

    responder = await get_user(responder_id)
    print(f"   Responder status: {responder.status}")
    print("   ✅ Passed\n")

    print("🎉 All tests passed!")


if __name__ == "__main__":
    asyncio.run(test_status_inference())
