import hashlib

uids = ["UID_5578_8", "UID_1234_A", "UID_1234_B", "UID_1234_C", "UID_1238_B", "UID_5678_B"]

for uid in uids:
    h = hashlib.sha256(uid.encode()).hexdigest()
    print(f"{uid} -> {h}")
