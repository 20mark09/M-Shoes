from flask import Flask, request, jsonify
import requests
import os

app = Flask(__name__)

WINGEZZ_BASE = "https://wingezz.com/api/v1"

USERNAME = os.environ.get("WINGEZZ_USER")
PASSWORD = os.environ.get("WINGEZZ_PASS")

# 🔑 Get token
def get_token():
    res = requests.post(f"{WINGEZZ_BASE}/auth", json={
        "username": USERNAME,
        "password": PASSWORD
    })
    return res.json().get("token")

# 🚀 Create order endpoint
@app.route("/create-order", methods=["POST"])
def create_order():
    data = request.json

    token = get_token()

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
        "price": float(data.get("price"))
    }

    res = requests.post(
        f"{WINGEZZ_BASE}/order/insert",
        json=order_data,
        headers=headers
    )

    return jsonify(res.json())

if __name__ == "__main__":
    app.run()