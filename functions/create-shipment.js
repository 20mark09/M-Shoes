export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const orderData = await request.json();

    // 1. Authenticate with Wingezz
    const authResponse = await fetch("https://www.wingezz.com/api/v1/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: env.WINGEZZ_EMAIL,
        password: env.WINGEZZ_PASSWORD
      })
    });

    if (!authResponse.ok) throw new Error("Wingezz Auth Failed");
    const { token } = await authResponse.json();

    // 2. Map your frontend data to Wingezz fields
    const wingezzPayload = {
      customer_name: orderData.name,
      customer_phone: orderData.phone,
      address: orderData.address,
      govern_id: orderData.governorate, 
      city_id: orderData.city,
      order_details: orderData.cart.map(i => `${i.name} (${i.size}) x${i.qty}`).join(', '),
      total_price: orderData.total
    };

    const orderResponse = await fetch("https://www.wingezz.com/api/v1/order/insert", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(wingezzPayload)
    });

    const result = await orderResponse.json();
    
    return new Response(JSON.stringify({ success: orderResponse.ok, result }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
