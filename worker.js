// Cloudflare Worker — M Shoes × Wingezz
// Deploy at: https://dash.cloudflare.com → Workers & Pages → Create Worker
// Set env vars: WINGEZZ_USERNAME, WINGEZZ_PASSWORD  (Settings → Variables)

const WINGEZZ_BASE = "https://wingezz.com/api/v1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── Token cache (lives for the duration of the Worker instance) ───────────────
let cachedToken = null;
let tokenExpiry = 0;

async function getToken(env) {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(`${WINGEZZ_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: env.WINGEZZ_USERNAME,
      password: env.WINGEZZ_PASSWORD,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Wingezz auth ${res.status}: ${txt}`);
  }

  const data = await res.json();
  // Wingezz returns { token: "..." } based on Swagger POST /auth
  cachedToken = data.token || data.access_token || data.jwt;
  if (!cachedToken) throw new Error("No token in Wingezz auth response: " + JSON.stringify(data));
  tokenExpiry = Date.now() + 50 * 60 * 1000; // cache 50 min
  return cachedToken;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    try {
      const token = await getToken(env);
      const authHeader = { Authorization: `Bearer ${token}` };

      // ── GET /governs ────────────────────────────────────────────────────────
      if (request.method === "GET" && action === "governs") {
        const res = await fetch(`${WINGEZZ_BASE}/governs`, { headers: authHeader });
        const data = await res.json();
        return json(data);
      }

      // ── GET /areas/:govern_id ───────────────────────────────────────────────
      if (request.method === "GET" && action === "areas") {
        const governId = url.searchParams.get("govern_id");
        if (!governId) return json({ error: "Missing govern_id" }, 400);
        const res = await fetch(`${WINGEZZ_BASE}/areas/${governId}`, { headers: authHeader });
        const data = await res.json();
        return json(data);
      }

      // ── POST /order/insert ──────────────────────────────────────────────────
      if (request.method === "POST" && action === "create_order") {
        const body = await request.json();

        // Exact field names from Wingezz Swagger docs
        const wingezzPayload = {
          order: {
            shipment_type:              1,           // standard delivery
            with_get_cash:              body.payment === "COD" ? 1 : 0,
            cost_from_customer:         Number(body.total),
            type_id:                    1,
            items_no:                   Number(body.items_count) || 1,
            shipment_description:       body.items_description || "M Shoes Order",
            allow_customer_to_open:     1,
            allow_customer_to_part:     0,
            customer_name:              body.name,
            customer_phone:             body.phone.replace(/\D/g, ""),  // digits only
            customer_phone_2:           body.phone2 ? body.phone2.replace(/\D/g, "") : "",
            deliver_notes:              body.deliver_notes || "",
            reference_no:               body.reference_no || String(Date.now()).slice(-6),
            govern_id:                  String(body.govern_id),
            area_id:                    String(body.area_id || ""),
            floor_no:                   body.floor_no || "",
            apartment_no:               body.apartment_no || "",
            address_notes:              body.address_notes || "",
          }
        };

        const res = await fetch(`${WINGEZZ_BASE}/order/insert`, {
          method: "POST",
          headers: { ...authHeader, "Content-Type": "application/json" },
          body: JSON.stringify(wingezzPayload),
        });

        const data = await res.json();

        if (!res.ok) return json({ error: data }, res.status);

        return json({ success: true, order: data });
      }

      return json({ error: `Unknown action: ${action}` }, 400);

    } catch (err) {
      console.error(err);
      return json({ error: err.message }, 500);
    }
  },
};
