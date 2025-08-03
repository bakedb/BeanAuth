from flask import Flask, request, jsonify
from firebase_admin import credentials, firestore, initialize_app
import os, json, re, hashlib, logging
from datetime import datetime, timedelta

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

# 🔧 Init Firestore
cred = credentials.Certificate(json.loads(os.environ["FIREBASE_CONFIG"]))
initialize_app(cred)
db = firestore.client()

BLACKLIST_PATH = "name-blacklist.txt"
if os.path.exists(BLACKLIST_PATH):
    with open(BLACKLIST_PATH) as f:
        NAME_BLACKLIST = set(line.strip().lower() for line in f if line.strip())
else:
    NAME_BLACKLIST = set()

# 🧪 Username & Password Checks
def is_valid_username(name):
    return (
        len(name) >= 3 and
        re.match(r"^[a-zA-Z0-9_-]+$", name) and
        name.lower() not in NAME_BLACKLIST
    )

def is_valid_password(pw):
    return (
        8 <= len(pw) <= 64 and
        re.search(r"[0-9]", pw) and
        re.search(r"[!@#$%^&*(),.?\":{}|<>]", pw)
    )

def hash_password(pw):
    return hashlib.sha256(pw.encode("utf-8")).hexdigest()

def get_ip_mac_key(req):
    return f"{req.remote_addr}_{req.headers.get('X-MAC-Address', '')}"

# 🔐 Account creation rate limit
def can_create_from_ip_mac(ip_mac):
    doc = db.collection("ip_mac_creations").document(ip_mac).get()
    if not doc.exists:
        return True
    last = doc.to_dict().get("lastAttempt")
    return datetime.utcnow() - last.replace(tzinfo=None) > timedelta(days=1)

def record_creation_ip_mac(ip_mac):
    db.collection("ip_mac_creations").document(ip_mac).set({
        "lastAttempt": datetime.utcnow()
    })

# 🔒 Failed login tracking
def record_failed_attempt(uid):
    ref = db.collection("failed_attempts").document(uid)
    doc = ref.get()
    now = datetime.utcnow()

    if doc.exists:
        data = doc.to_dict()
        timestamps = [ts.replace(tzinfo=None) for ts in data.get("timestamps", []) if now - ts.replace(tzinfo=None) < timedelta(hours=1)]
        timestamps.append(now)
        locked_until = data.get("lockedUntil")
        if len(timestamps) >= 5:
            ref.set({"timestamps": timestamps, "lockedUntil": now + timedelta(minutes=60)})
        else:
            ref.set({"timestamps": timestamps}, merge=True)
    else:
        ref.set({"timestamps": [now]})

def is_locked(uid):
    doc = db.collection("failed_attempts").document(uid).get()
    if doc.exists:
        locked_until = doc.to_dict().get("lockedUntil")
        return locked_until and datetime.utcnow() < locked_until.replace(tzinfo=None)
    return False

# 🚧 Create Account
@app.route("/create-account", methods=["POST"])
def create_account():
    data = request.get_json(force=True)
    username = data.get("username", "").strip()
    password = data.get("password", "")
    ip_mac = get_ip_mac_key(request)

    if not is_valid_username(username):
        return jsonify({"error": "Invalid or forbidden username"}), 400
    if not is_valid_password(password):
        return jsonify({"error": "Weak password"}), 400
    if not can_create_from_ip_mac(ip_mac):
        return jsonify({"error": "Rate limit: 1 account/day per IP/MAC"}), 429

    existing = db.collection("users").where("username", "==", username).get()
    if existing:
        return jsonify({"error": "Username already taken"}), 409

    uid = hashlib.sha256(username.encode()).hexdigest()[:32]
    db.collection("users").document(uid).set({
        "username": username,
        "passwordHash": hash_password(password),
        "createdAt": firestore.SERVER_TIMESTAMP
    })

    record_creation_ip_mac(ip_mac)
    logging.info(f"Created user: {username} from {ip_mac}")
    return jsonify({"success": True, "userId": uid}), 201

# 🔐 Login (with lockout)
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(force=True)
    username = data.get("username", "").strip()
    password = data.get("password", "")

    users = db.collection("users").where("username", "==", username).get()
    if not users:
        return jsonify({"error": "User not found"}), 404

    user_doc = users[0]
    uid = user_doc.id
    if is_locked(uid):
        return jsonify({"error": "Account temporarily locked"}), 403

    if user_doc.to_dict().get("passwordHash") != hash_password(password):
        record_failed_attempt(uid)
        return jsonify({"error": "Invalid credentials"}), 403

    return jsonify({"success": True, "userId": uid}), 200

# 🧪 Run
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
