from flask import Flask, request, jsonify
from firebase_admin import auth, firestore, credentials, initialize_app
import os
import logging
import json

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

# 🧠 Firebase credentials from env
firebase_json = os.environ.get("FIREBASE_CONFIG")
if not firebase_json:
    raise RuntimeError("FIREBASE_CONFIG environment variable is not set.")

cred_dict = json.loads(firebase_json)
cred = credentials.Certificate(cred_dict)
initialize_app(cred)
db = firestore.client()

@app.route("/link-service", methods=["POST"])
def link_service():
    data = request.get_json(force=True)
    id_token = data.get("idToken")
    platform = data.get("platform")
    platform_data = data.get("platformData")
    api_key = data.get("apiKey")

    try:
        decoded_token = auth.verify_id_token(id_token)
        user_id = decoded_token["uid"]
    except Exception as e:
        logging.warning(f"ID token validation failed: {e}")
        return jsonify({"error": "Invalid ID token"}), 401

    platform_doc = db.collection("approved_platforms").document(platform).get()
    if not platform_doc.exists:
        logging.warning(f"Platform not approved: {platform}")
        return jsonify({"error": "Unknown platform"}), 403

    stored_key = platform_doc.to_dict().get("apiKey")
    if stored_key != api_key:
        logging.warning(f"Invalid API key for platform: {platform}")
        return jsonify({"error": "Invalid API key"}), 403

    db.collection("links").document(user_id).set({
        "platform": platform,
        "platformData": platform_data,
        "linkedAt": firestore.SERVER_TIMESTAMP,
    })

    logging.info(f"Linked {platform} for user {user_id}")
    return jsonify({"success": True}), 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
