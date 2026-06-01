import { createClient } from "npm:@supabase/supabase-js@2";
import { sanitizeProviderResponse } from "./sms-provider-current.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

export type AdminContext = {
  userId: string;
  supabaseAdmin: AnySupabaseClient;
};

export type RpcResult = {
  data: unknown;
  error: { message: string } | null;
};

export type AnySupabaseClient = any;

export async function requireAdmin(req: Request): Promise<AdminContext | Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ success: false, error: "Edge Function no configurada." }, 500);
  }

  const token = getBearerToken(req.headers.get("Authorization"));
  if (!token) {
    return jsonResponse({ success: false, error: "Sesión inválida." }, 401);
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !authData.user) {
    return jsonResponse({ success: false, error: "Sesión inválida." }, 401);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: admin, error: adminError } = await supabaseAdmin
    .from("admins")
    .select("id,is_active")
    .eq("id", authData.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (adminError || !admin || admin.is_active !== true) {
    return jsonResponse({ success: false, error: "No autorizado." }, 403);
  }

  return { userId: authData.user.id, supabaseAdmin: supabaseAdmin as unknown as AnySupabaseClient };
}

export async function readJson<T = unknown>(req: Request): Promise<T> {
  try {
    return await req.json() as T;
  } catch {
    return {} as T;
  }
}

export function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(sanitizeProviderResponse(body)), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export function normalizeRpcResult(data: unknown): Record<string, unknown> {
  if (Array.isArray(data)) {
    return normalizeRpcResult(data[0]);
  }

  if (data && typeof data === "object") {
    return data as Record<string, unknown>;
  }

  return {};
}

export async function rpcUntyped(
  client: AnySupabaseClient,
  name: string,
  params: Record<string, unknown>,
): Promise<RpcResult> {
  return await (client as any).rpc(name, params) as RpcResult;
}

export function parsePositiveInteger(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim() || null;
}
