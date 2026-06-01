import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse, readJson, requireAdmin, rpcUntyped } from "../_shared/admin-edge.ts";
import { getProviderBalance, sanitizeProviderResponse } from "../_shared/sms-provider-current.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  await readJson(req);

  const admin = await requireAdmin(req);
  if (admin instanceof Response) {
    return admin;
  }

  const provider = await getProviderBalance();
  if (!provider.success) {
    return jsonResponse({ success: false, error: "No se pudo consultar saldo proveedor." }, 502);
  }

  if (provider.external_balance === null || provider.external_balance === undefined || !Number.isFinite(provider.external_balance)) {
    return jsonResponse({
      success: false,
      error: "Saldo proveedor desconocido.",
      error_code: "PROVIDER_BALANCE_UNKNOWN",
      balance_status: "unknown",
      provider: provider.provider,
    }, 502);
  }

  const { data, error } = await rpcUntyped(admin.supabaseAdmin, "admin_save_provider_balance_snapshot", {
    p_actor_user_id: admin.userId,
    p_external_balance: provider.external_balance,
    p_external_response: sanitizeProviderResponse(provider.provider_response),
  });

  if (error) {
    return jsonResponse({ success: false, error: error.message }, 409);
  }

  return jsonResponse({
    success: true,
    result: data,
    provider: provider.provider,
    external_balance: provider.external_balance ?? null,
  });
});
