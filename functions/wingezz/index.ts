// Supabase Edge Function: wingezz
// Deploy with: supabase functions deploy wingezz
// Set secrets: supabase secrets set WINGEZZ_USERNAME=your_user WINGEZZ_PASSWORD=your_pass

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const WINGEZZ_BASE = "https://wingezz.com/api/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // restrict to your domain in production
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Cache the JWT token so we don't re-auth on every request
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(`${WINGEZZ_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: Deno.env.get("WINGEZZ_USERNAME"),
      password: Deno.env.get("WINGEZZ_PASSWORD"),
    }),
  });

  if (!res.ok) throw new Error(`Wingezz auth failed: ${res.status}`);
  const data = await res.json();
  cachedToken = data.token || data.access_token || data.jwt;
  tokenExpiry = Date.now() + 50 * 60 * 1000; // refresh 10 min before expiry (assuming 1h)
  return cachedToken!;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const token = await getToken();

    // ── GET governorates ──────────────────────────────────────────────
    if (req.method === "GET" && action === "governs") {
      const res = await fetch(`${WINGEZZ_BASE}/governs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GET areas for a governorate ───────────────────────────────────
    if (req.method === "GET" && action === "areas") {
      const governId = url.searchParams.get("govern_id");
      if (!governId) return new Response(JSON.stringify({ error: "Missing govern_id" }), { status: 400, headers: corsHeaders });

      const res = await fetch(`${WINGEZZ_BASE}/areas/${governId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── POST create order ─────────────────────────────────────────────
    if (req.method === "POST" && action === "create_order") {
      const body = await req.json();

      // Map our checkout form fields to Wingezz expected fields
      // Adjust field names to match what Wingezz actually expects
      const wingezzOrder = {
        receiver_name:    body.name,
        receiver_phone:   body.phone,
        receiver_address: body.address,
        receiver_city:    body.city,
        govern_id:        body.govern_id,   // numeric ID from governs list
        area_id:          body.area_id,     // numeric ID from areas list (optional)
        cod_amount:       body.total,       // cash on delivery amount in EGP
        description:      body.items,       // order description
        payment_type:     body.payment === "COD" ? 1 : 2,
        notes:            body.notes || "",
      };

      const res = await fetch(`${WINGEZZ_BASE}/order/insert`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(wingezzOrder),
      });

      const data = await res.json();

      if (!res.ok) {
        return new Response(JSON.stringify({ error: data }), {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, order: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
