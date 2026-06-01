import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse, readJson, requireAdmin } from "../_shared/admin-edge.ts";
import { getClientBalance } from "../_shared/sms-provider-current.ts";

interface Body {
  company_id?: string;
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
  if (!body.company_id) {
    return jsonResponse({ success: false, error: "Empresa requerida." }, 422);
  }

  const { data: company, error: companyError } = await admin.supabaseAdmin
    .from("companies")
    .select("id,ruc,razon_social,is_active,status")
    .eq("id", body.company_id)
    .maybeSingle();

  if (companyError || !company || company.is_active === false || company.status !== "active") {
    return jsonResponse({ success: false, error: "Empresa no encontrada o inactiva." }, 403);
  }

  const provider = await getClientBalance(company.ruc);
  if (!provider.success) {
    return jsonResponse({ success: false, error: "No se pudo consultar saldo cliente/RUC." }, 502);
  }

  if (provider.external_balance === null || provider.external_balance === undefined || !Number.isFinite(provider.external_balance)) {
    return jsonResponse({
      success: false,
      error: "Saldo cliente/RUC desconocido.",
      error_code: "CLIENT_BALANCE_UNKNOWN",
      balance_status: "unknown",
      company_id: company.id,
      ruc: company.ruc,
      provider: provider.provider,
    }, 502);
  }

  const { data: balanceRows } = await admin.supabaseAdmin
    .from("company_balance_transactions")
    .select("balance_after,created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const localBalance = Array.isArray(balanceRows) && balanceRows[0]
    ? Number(balanceRows[0].balance_after)
    : 0;

  return jsonResponse({
    success: true,
    company_id: company.id,
    ruc: company.ruc,
    local_balance: Number.isFinite(localBalance) ? localBalance : 0,
    external_balance: provider.external_balance ?? null,
    provider: provider.provider,
    comparison: provider.external_balance === null
      ? "external_balance_unavailable"
      : provider.external_balance === localBalance
      ? "match"
      : "mismatch_review_required",
  });
});
