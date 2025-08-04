from flask import Flask, request, jsonify
from firebase_admin import credentials, firestore, initialize_app
from flask_cors import CORS
import os, json, re, hashlib, logging
from uuid import uuid4

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
CORS(app)

# 🔧 Init Firestore
cred = credentials.Certificate(json.loads(os.environ["FIREBASE_CONFIG"]))
initialize_app(cred)
db = firestore.client()

# 🛡️ In-memory session store (replaceable with Redis later)
SESSIONS = {}
ALLOWED_FIELDS = {"nickname", "score", "favoriteColor"}

BLACKLIST_PATH = "name-blacklist.txt"
NAME_BLACKLIST = set()
if os.path.exists(BLACKLIST_PATH):
    with open(BLACKLIST_PATH) as f:
        NAME_BLACKLIST = set(line.strip().lower() for line in f if line.strip())

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
@app.route("/create-account", methods=["POST"])
def create_account():
    data = request.get_json(force=True)
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not is_valid_username(username):
        return jsonify({"error": "Invalid or forbidden username"}), 400
    if not is_valid_password(password):
        return jsonify({"error": "Weak password"}), 400

    existing = db.collection("users").where("username", "==", username).get()
    if existing:
        return jsonify({"error": "Username already taken"}), 409

    uid = hashlib.sha256(username.encode()).hexdigest()[:32]
    db.collection("users").document(uid).set({
        "username": username,
        "passwordHash": hash_password(password),
        "createdAt": firestore.SERVER_TIMESTAMP
    })

    logging.info(f"Created user: {username}")
    return jsonify({"success": True, "userId": uid}), 201
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(force=True)
    username = data.get("username", "").strip()
    password = data.get("password", "")

    users = db.collection("users").where("username", "==", username).get()
    if not users:
        return jsonify({"error": "User not found"}), 404

    user_doc = users[0]
    if user_doc.to_dict().get("passwordHash") != hash_password(password):
        return jsonify({"error": "Invalid credentials"}), 403

    token = str(uuid4())
    SESSIONS[token] = user_doc.id

    return jsonify({"success": True, "token": token}), 200
@app.route("/get-user-data", methods=["POST"])
def get_user_data():
    token = request.get_json(force=True).get("token", "").strip()
    uid = SESSIONS.get(token)
    if not uid:
        return jsonify({"error": "Invalid session"}), 401

    doc = db.collection("user-data").document(uid).get().to_dict() or {}
    return jsonify(doc), 200
@app.route("/update-user-data", methods=["POST"])
def update_user_data():
    data = request.get_json(force=True)
    token = data.get("token", "").strip()
    updates = data.get("info", {})

    uid = SESSIONS.get(token)
    if not uid:
        return jsonify({"error": "Invalid session"}), 401

    cleaned = {k: v for k, v in updates.items() if k in ALLOWED_FIELDS}
    if not cleaned:
        return jsonify({"error": "No valid fields"}), 400

    db.collection("user-data").document(uid).set(cleaned, merge=True)
    return jsonify({"success": True}), 200
@app.route("/update-password", methods=["POST"])
def update_password():
    data = request.get_json(force=True)
    token = data.get("token", "").strip()
    new_pw = data.get("password", "")

    uid = SESSIONS.get(token)
    if not uid:
        return jsonify({"error": "Invalid session"}), 401
    if not is_valid_password(new_pw):
        return jsonify({"error": "Weak password"}), 400

    db.collection("users").document(uid).update({"passwordHash": hash_password(new_pw)})
    logging.info(f"Password updated for: {uid}")
    return jsonify({"success": True}), 200
@app.route("/used-services", methods=["POST"])
def used_services():
    token = request.get_json(force=True).get("token", "").strip()
    uid = SESSIONS.get(token)
    if not uid:
        return jsonify({"error": "Invalid session"}), 401

    usage = db.collection("usage").where("uid", "==", uid).get()
    services = [doc.to_dict().get("service") for doc in usage]
    return jsonify({"services": services}), 200
@app.route("/delete-account", methods=["POST"])
def delete_account():
    token = request.get_json(force=True).get("token", "").strip()
    uid = SESSIONS.pop(token, None)
    if not uid:
        return jsonify({"error": "Invalid session"}), 401

    db.collection("users").document(uid).delete()
    for doc in db.collection("usage").where("uid", "==", uid).get():
        doc.reference.delete()

    db.collection("user-data").document(uid).delete()
    logging.info(f"Deleted account + data for: {uid}")
    return jsonify({"success": True}), 200
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
