import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse, readJson, requireAdmin } from "../_shared/admin-edge.ts";
import { registerApiKey } from "../_shared/sms-provider-current.ts";

interface Body {
  ruc?: string;
  nombre?: string;
  name?: string;
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
  const ruc = body.ruc?.trim() ?? "";
  const nombre = (body.nombre ?? body.name ?? "").trim();
  if (!/^[0-9]{11}$/.test(ruc)) {
    return jsonResponse({ success: false, error: "RUC inválido." }, 422);
  }
  if (!nombre) {
    return jsonResponse({ success: false, error: "Nombre de API Key requerido." }, 422);
  }

  const provider = await registerApiKey(ruc, nombre);
  if (!provider.success) {
    return jsonResponse({ success: false, error: provider.error ?? "PROVIDER_REQUEST_FAILED" }, 502);
  }

  return jsonResponse({
    success: true,
    provider: provider.provider,
    result: provider.provider_response ?? {},
  });
});
