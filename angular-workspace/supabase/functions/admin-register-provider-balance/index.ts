import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse, parsePositiveInteger, readJson, requireAdmin, rpcUntyped } from "../_shared/admin-edge.ts";
import { registerProviderBalance, sanitizeProviderResponse } from "../_shared/sms-provider-current.ts";

interface Body {
  recarga?: number;
}

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

  const body = await readJson<Body>(req);
  const recarga = parsePositiveInteger(body.recarga);
  if (!recarga) {
    return jsonResponse({ success: false, error: "Recarga proveedor inválida." }, 422);
  }

  const provider = await registerProviderBalance(recarga);
  if (!provider.success) {
    return jsonResponse({ success: false, error: "No se pudo registrar saldo proveedor." }, 502);
  }

  const { data, error } = await rpcUntyped(admin.supabaseAdmin, "admin_register_provider_balance_local", {
    p_actor_user_id: admin.userId,
    p_sms_delta: recarga,
    p_external_code: String(provider.provider_response?.code ?? ""),
    p_external_message: String(provider.provider_response?.message ?? ""),
    p_external_response: sanitizeProviderResponse(provider.provider_response),
  });

  if (error) {
    return jsonResponse({ success: false, error: error.message }, 409);
  }

  return jsonResponse({
    success: true,
    result: data,
    provider: provider.provider,
  });
});
