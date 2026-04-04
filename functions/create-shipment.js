export async function onRequestPost(context) {
  const { request, env } = context;
  const orderData = await request.json();

  try {
    // STEP 1: Authenticate with Wingezz to get a JWT Token
    // Matches your screenshot: POST /api/v1/auth
    const authResponse = await fetch("https://www.wingezz.com/api/v1/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: env.WINGEZZ_EMAIL,
        password: env.WINGEZZ_PASSWORD
      })
    });
    
    const authResult = await authResponse.json();
    const token = authResult.token; 

    // STEP 2: Insert the Order
    // Matches your screenshot: POST /api/v1/order/insert
    const wingezzOrder = {
      customer_name: orderData.name,
      customer_phone: orderData.phone,
      address: orderData.address,
      govern_id: orderData.governorate_id, // API usually needs ID, not name
      city_id: orderData.city_id,
      order_details: orderData.cart.map(item => `${item.name} x${item.qty}`).join(', '),
      total_price: orderData.total
    };

    const orderResponse = await fetch("https://www.wingezz.com/api/v1/order/insert", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(wingezzOrder)
    });

    const result = await orderResponse.json();
    return new Response(JSON.stringify(result), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}