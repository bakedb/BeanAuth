from flask import Flask, request, jsonify
from firebase_admin import credentials, firestore, initialize_app
from flask_cors import CORS
import os, json, re, hashlib, logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
CORS(app)

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

# 🚧 Create Account
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

# 🔐 Login
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

    if user_doc.to_dict().get("passwordHash") != hash_password(password):
        return jsonify({"error": "Invalid credentials"}), 403

    return jsonify({"success": True, "userId": uid}), 200

# 🔄 Update Password
@app.route("/update-password", methods=["POST"])
def update_password():
    data = request.get_json(force=True)
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not is_valid_username(username) or not is_valid_password(password):
        return jsonify({"error": "Invalid username or weak password"}), 400

    users = db.collection("users").where("username", "==", username).get()
    if not users:
        return jsonify({"error": "User not found"}), 404

    uid = users[0].id
    db.collection("users").document(uid).update({"passwordHash": hash_password(password)})
    logging.info(f"Password updated for user: {username}")
    return jsonify({"success": True}), 200

# 🛠️ Fetch Used Services
@app.route("/used-services", methods=["GET"])
def used_services():
    username = request.args.get("username", "").strip()

    if not is_valid_username(username):
        return jsonify({"error": "Invalid username"}), 400

    services = []
    results = db.collection("usage").where("username", "==", username).get()
    for doc in results:
        info = doc.to_dict()
        services.append(info.get("service"))

    return jsonify({"services": services}), 200

# 🗑️ Delete Account
@app.route("/delete-account", methods=["POST"])
def delete_account():
    data = request.get_json(force=True)
    username = data.get("username", "").strip()

    if not is_valid_username(username):
        return jsonify({"error": "Invalid username"}), 400

    users = db.collection("users").where("username", "==", username).get()
    if not users:
        return jsonify({"error": "User not found"}), 404

    uid = users[0].id
    db.collection("users").document(uid).delete()

    # Optional: also delete usage records
    usage_docs = db.collection("usage").where("username", "==", username).get()
    for doc in usage_docs:
        doc.reference.delete()

    logging.info(f"Deleted account + usage for: {username}")
    return jsonify({"success": True}), 200

# 🧪 Run
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
