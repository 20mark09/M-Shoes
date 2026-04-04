from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)  # ✅ THIS FIXES YOUR ERROR

WINGEZZ_BASE = "https://wingezz.com/api/v1"

EMAIL = os.environ.get("WINGEZZ_USER")
PASSWORD = os.environ.get("WINGEZZ_PASS")

def get_token():
    res = requests.post("https://api.wingezz.com/api/v1/auth", json={
        "email": EMAIL,
        "password": PASSWORD
    })

    print("AUTH RESPONSE:", res.text)  # 🔥 ADD THIS

    if res.status_code != 200:
        return None

    return res.json().get("token")


@app.route("/create-order", methods=["POST"])
def create_order():
    data = request.json

    token = get_token()
    if not token:
        return jsonify({"error": "Auth failed"}), 401

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    order_data = {
        "customer_name": data.get("name"),
        "phone": data.get("phone"),
        "address": data.get("address"),
        "govern_id": int(data.get("govern_id")),
        "area_id": int(data.get("area_id")),
        "price": float(data.get("price")),
        "items": data.get("items", []),
        "notes": ""
    }

    res = requests.post(
        f"{WINGEZZ_BASE}/order/insert",
        json=order_data,
        headers=headers
    )

    return jsonify(res.json()), res.status_code


if __name__ == "__main__":
    app.run()
