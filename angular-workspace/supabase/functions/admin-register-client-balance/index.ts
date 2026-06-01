import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders,
  jsonResponse,
  normalizeRpcResult,
  readJson,
  requireAdmin,
  rpcUntyped,
} from "../_shared/admin-edge.ts";
import { registerClientBalance, sanitizeProviderResponse } from "../_shared/sms-provider-current.ts";

interface Body {
  company_id?: string;
  package_id?: string;
  payment_method?: string;
  operation_code?: string;
  notes?: string;
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
  if (!body.company_id || !body.package_id || !body.payment_method || !body.operation_code) {
    return jsonResponse({ success: false, error: "Datos de recarga incompletos." }, 422);
  }

  const pending = await rpcUntyped(admin.supabaseAdmin, "admin_register_company_recharge", {
    p_actor_user_id: admin.userId,
    p_company_id: body.company_id,
    p_package_id: body.package_id,
    p_payment_method: body.payment_method,
    p_operation_code: body.operation_code,
    p_notes: body.notes ?? null,
  });

  if (pending.error) {
    return jsonResponse({ success: false, error: pending.error.message }, 409);
  }

  const pendingResult = normalizeRpcResult(pending.data);
  const rechargeId = String(pendingResult.recharge_id ?? "");
  const ruc = String(pendingResult.ruc ?? "");
  const smsCredits = Number(pendingResult.sms_credits ?? 0);

  if (!rechargeId || !ruc || !Number.isFinite(smsCredits) || smsCredits <= 0) {
    return jsonResponse({ success: false, error: "Recarga local inválida." }, 500);
  }

  const provider = await registerClientBalance(ruc, smsCredits);
  if (!provider.success) {
    await rpcUntyped(admin.supabaseAdmin, "admin_fail_company_recharge_external_sync", {
      p_actor_user_id: admin.userId,
      p_recharge_id: rechargeId,
      p_external_response: sanitizeProviderResponse(provider.provider_response),
      p_error_message: provider.error ?? "PROVIDER_REQUEST_FAILED",
    });

    return jsonResponse({ success: false, error: "Proveedor rechazó recarga cliente/RUC." }, 502);
  }

  const complete = await rpcUntyped(admin.supabaseAdmin, "admin_complete_company_recharge_external_sync", {
    p_actor_user_id: admin.userId,
    p_recharge_id: rechargeId,
    p_external_response: sanitizeProviderResponse(provider.provider_response),
  });

  if (complete.error) {
    return jsonResponse({
      success: false,
      error: complete.error.message,
      reconciliation_required: true,
      reconciliation_reason: "provider_client_balance_registered_local_completion_failed",
      recharge_id: rechargeId,
      ruc,
    }, 409);
  }

  return jsonResponse({
    success: true,
    result: complete.data,
    provider: provider.provider,
  });
});
