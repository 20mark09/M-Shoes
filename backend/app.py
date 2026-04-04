from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

WINGEZZ_EMAIL = "YOUR_EMAIL"
WINGEZZ_PASSWORD = "YOUR_PASSWORD"

# 🔐 Step 1: Get Token
def get_token():
    response = requests.post("https://api.wingezz.com/api/v1/auth", json={
        "email": WINGEZZ_EMAIL,
        "password": WINGEZZ_PASSWORD
    })

    data = response.json()
    return data.get("token")


# 📦 Step 2: Create Order
@app.route('/create-shipment', methods=['POST'])
def create_shipment():
    data = request.json

    token = get_token()
    if not token:
        return jsonify({"error": "Auth failed"}), 401

    # Convert cart → Wingezz format
    items = []
    for item in data['cart']:
        items.append({
            "name": item['name'],
            "quantity": item['qty'],
            "price": item['price']
        })

    payload = {
        "customer_name": data['name'],
        "phone": data['phone'],
        "address": data['address'],
        "city": data['city'],
        "items": items,
        "total": data['total']
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    response = requests.post(
        "https://api.wingezz.com/api/v1/order/insert",
        json=payload,
        headers=headers
    )

    return jsonify(response.json()), response.status_code


if __name__ == '__main__':
    app.run()
