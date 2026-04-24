export async function onRequestGet(context) {
  // Load products from Cloudflare KV
  const products = await context.env.MSHOES_DATA.get("products");
  return new Response(products || "[]", {
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestPost(context) {
  // Save products to Cloudflare KV
  const body = await context.request.json();
  await context.env.MSHOES_DATA.put("products", JSON.stringify(body));
  return new Response("Saved", { status: 200 });
}
