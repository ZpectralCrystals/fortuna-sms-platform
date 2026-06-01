import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse, requireAdmin } from "../_shared/admin-edge.ts";
import { listApiKeys } from "../_shared/sms-provider-current.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  const admin = await requireAdmin(req);
  if (admin instanceof Response) {
    return admin;
  }

  const provider = await listApiKeys();
  if (!provider.success) {
    return jsonResponse({ success: false, error: provider.error ?? "PROVIDER_REQUEST_FAILED" }, 502);
  }

  return jsonResponse({
    success: true,
    provider: provider.provider,
    result: provider.provider_response ?? {},
  });
});
