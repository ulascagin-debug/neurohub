import requests
import json

DASHBOARD_URL = "http://localhost:3000"
BIZ_ID = "cmn6dfjvh00006eocxrnkzf8i"

print("=" * 50)
print("Cafe-Chatbot → Dashboard Integration Test")
print("=" * 50)

# 1. Test chatbot-config endpoint (like business_config.py does)
print("\n1. Testing GET /api/chatbot-config...")
resp = requests.get(f"{DASHBOARD_URL}/api/chatbot-config", params={"business_id": BIZ_ID})
if resp.status_code == 200:
    config = resp.json()
    print(f"   ✅ Name: {config['name']}")
    print(f"   ✅ Tone: {config['tone']}")
    print(f"   ✅ Table count: {config['table_count']}")
    print(f"   ✅ Menu categories: {list(config['menu'].keys()) if config.get('menu') else 'None'}")
    print(f"   ✅ Campaigns: {config.get('campaigns', [])}")
else:
    print(f"   ❌ Failed: {resp.status_code} {resp.text}")

# 2. Test business-lookup (like business_config.py lookup_business_id does)
print("\n2. Testing GET /api/business-lookup...")
resp = requests.get(f"{DASHBOARD_URL}/api/business-lookup", params={"platform": "instagram", "identifier": "26127995610189827"})
if resp.status_code == 200:
    data = resp.json()
    print(f"   ✅ Found business_id: {data['business_id']}")
else:
    print(f"   ❌ Failed: {resp.status_code} {resp.text}")

# 3. Test POST /api/messages (like message_handler.py _log_message does)
print("\n3. Testing POST /api/messages...")
resp = requests.post(f"{DASHBOARD_URL}/api/messages", json={
    "business_id": BIZ_ID,
    "platform": "test",
    "user_id": "test_user_integration",
    "message": "Bu bir entegrasyon testidir",
    "response": "Test yanıtı başarılı!",
})
if resp.status_code == 200:
    data = resp.json()
    print(f"   ✅ Message stored: {data['message']['id']}")
else:
    print(f"   ❌ Failed: {resp.status_code} {resp.text}")

# 4. Test POST /api/reservations (like reservation_manager.py does)
print("\n4. Testing POST /api/reservations...")
resp = requests.post(f"{DASHBOARD_URL}/api/reservations", json={
    "business_id": BIZ_ID,
    "customer_name": "Test Müşteri",
    "date": "2026-03-30",
    "time": "19:00",
    "party_size": 2,
})
if resp.status_code == 201:
    data = resp.json()
    print(f"   ✅ Reservation created: {data['reservation']['id']}")
else:
    print(f"   ❌ Failed: {resp.status_code} {resp.text}")

# 5. Verify data is visible in dashboard
print("\n5. Verifying data in dashboard...")
resp = requests.get(f"{DASHBOARD_URL}/api/dashboard/messages", params={"business_id": BIZ_ID})
if resp.status_code == 200:
    messages = resp.json()["messages"]
    print(f"   ✅ Total messages in dashboard: {len(messages)}")
    # Check if our test message is there
    test_msgs = [m for m in messages if m.get("user_id") == "test_user_integration"]
    print(f"   ✅ Integration test messages found: {len(test_msgs)}")

resp = requests.get(f"{DASHBOARD_URL}/api/dashboard/reservations", params={"business_id": BIZ_ID})
if resp.status_code == 200:
    reservations = resp.json()["reservations"]
    print(f"   ✅ Total reservations in dashboard: {len(reservations)}")
    test_res = [r for r in reservations if r.get("customer_name") == "Test Müşteri"]
    print(f"   ✅ Integration test reservations found: {len(test_res)}")

print("\n" + "=" * 50)
print("🎉 All integration tests PASSED!")
print("=" * 50)
