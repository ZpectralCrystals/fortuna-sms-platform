import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type AnySupabaseClient, rpcUntyped } from "../_shared/admin-edge.ts";
import {
  mapProviderError,
  normalizeProviderErrorCode,
  sanitizeProviderResponse,
  sendIndividualSms,
} from "../_shared/sms-provider-current.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Idempotency-Key",
};

interface Body {
  telefono?: string;
  recipient?: string;
  mensaje?: string;
  message?: string;
  idempotency_key?: string;
}

interface ApiKeyRow {
  id: string;
  user_id: string;
  scopes: string[] | null;
  is_active: boolean;
  revoked_at: string | null;
  expires_at: string | null;
  rate_limit_per_minute: number | null;
  rate_limit_per_day: number | null;
}

interface BeginAttemptResult {
  success?: boolean;
  already_processed?: boolean;
  attempt_id?: string;
  message_id?: string;
  company_id?: string;
  ruc?: string;
  recipient?: string;
  provider_recipient?: string;
  segments?: number;
  cost?: number;
  balance_after?: number;
  status?: string;
}

interface CompleteAttemptResult {
  success?: boolean;
  already_processed?: boolean;
  message_id?: string;
  company_id?: string;
  ruc?: string;
  recipient?: string;
  segments?: number;
  cost?: number;
  balance_after?: number;
  status?: string;
}

Deno.serve(async (req: Request) => {
  const startedAt = Date.now();
  let apiKeyId: string | null = null;
  let apiUserId: string | null = null;

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error_code: "METHOD_NOT_ALLOWED", error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ success: false, error_code: "FUNCTION_NOT_CONFIGURED", error: "Edge Function no configurada." }, 500);
    }

    const apiKey = req.headers.get("X-API-Key")?.trim() ?? "";
    if (!apiKey) {
      return jsonResponse({ success: false, error_code: "API_KEY_REQUIRED", error: "X-API-Key requerido." }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }) as unknown as AnySupabaseClient;

    const keyRow = await findApiKey(supabaseAdmin, apiKey);
    apiKeyId = keyRow.id;
    apiUserId = keyRow.user_id;

    const keyError = validateApiKey(keyRow);
    if (keyError) {
      await logApiRequest(supabaseAdmin, apiKeyId, apiUserId, "failed", keyError);
      return jsonResponse({ success: false, error_code: keyError, error: publicErrorMessage(keyError) }, 401);
    }

    const rateLimitError = await checkRateLimit(supabaseAdmin, keyRow);
    if (rateLimitError) {
      await logApiRequest(supabaseAdmin, apiKeyId, apiUserId, "failed", rateLimitError);
      return jsonResponse({ success: false, error_code: rateLimitError, error: publicErrorMessage(rateLimitError) }, 429);
    }

    const body = await readBody(req);
    const telefono = (body.telefono ?? body.recipient ?? "").trim();
    const mensaje = (body.mensaje ?? body.message ?? "").trim();
    const idempotencyKey = resolveIdempotencyKey(req, body, apiKeyId);

    if (!isValidIdempotencyKey(idempotencyKey)) {
      await logApiRequest(supabaseAdmin, apiKeyId, apiUserId, "failed", "INVALID_IDEMPOTENCY_KEY");
      return jsonResponse({ success: false, error_code: "INVALID_IDEMPOTENCY_KEY", error: publicErrorMessage("INVALID_IDEMPOTENCY_KEY") }, 409);
    }

    if (!telefono) {
      await logApiRequest(supabaseAdmin, apiKeyId, apiUserId, "failed", "INVALID_PHONE");
      return jsonResponse({ success: false, error_code: "INVALID_PHONE", error: publicErrorMessage("INVALID_PHONE") }, 422);
    }

    if (!mensaje) {
      await logApiRequest(supabaseAdmin, apiKeyId, apiUserId, "failed", "EMPTY_MESSAGE");
      return jsonResponse({ success: false, error_code: "EMPTY_MESSAGE", error: publicErrorMessage("EMPTY_MESSAGE") }, 422);
    }

    const begin = await beginCompanyAttempt(supabaseAdmin, keyRow.user_id, idempotencyKey, telefono, mensaje);
    if (!begin.success || !begin.attempt_id || !begin.ruc) {
      throw new Error("SMS_ATTEMPT_NOT_CREATED");
    }

    if (begin.already_processed) {
      await touchApiKey(supabaseAdmin, apiKeyId);
      await logApiRequest(supabaseAdmin, apiKeyId, apiUserId, "sent", null);
      return jsonResponse({
        success: true,
        status: begin.status ?? "sent",
        message_id: begin.message_id ?? null,
        credits_used: Number(begin.cost ?? begin.segments ?? 1),
        balance_after: begin.balance_after ?? null,
        already_processed: true,
      });
    }

    const providerResult = await sendIndividualSms(
      begin.ruc,
      begin.provider_recipient ?? begin.recipient ?? telefono,
      mensaje,
      begin.attempt_id,
    );

    if (!providerResult.success) {
      const errorCode = providerResult.error ?? "PROVIDER_REQUEST_FAILED";
      try {
        await completeCompanyAttemptFailed(
          supabaseAdmin,
          begin.attempt_id,
          providerResult.provider,
          providerResult.provider_response,
          errorCode,
        );
      } catch (completeError) {
        logSafe("api-send-sms provider failed local completion failed", {
          api_key_id: apiKeyId,
          user_id: apiUserId,
          attempt_id: begin.attempt_id,
          error_code: normalizeProviderErrorCode(errorCode),
          completion_error: completeError instanceof Error ? completeError.message : String(completeError),
          reconciliation_required: true,
        });
      }
      await logApiRequest(supabaseAdmin, apiKeyId, apiUserId, "failed", normalizeProviderErrorCode(errorCode));
      return jsonResponse({
        success: false,
        error_code: normalizeProviderErrorCode(errorCode),
        error: mapProviderError(errorCode),
      }, getHttpStatusForError(errorCode));
    }

    let complete: CompleteAttemptResult;
    try {
      complete = await completeCompanyAttemptSuccess(
        supabaseAdmin,
        begin.attempt_id,
        providerResult.provider,
        providerResult.provider_message_id ?? null,
        providerResult.provider_response,
      );
    } catch (completeError) {
      await logApiRequest(supabaseAdmin, apiKeyId, apiUserId, "failed", "PROVIDER_SENT_LOCAL_COMPLETION_FAILED");
      logSafe("api-send-sms provider success local completion failed", {
        api_key_id: apiKeyId,
        user_id: apiUserId,
        attempt_id: begin.attempt_id,
        provider: providerResult.provider,
        provider_message_id: providerResult.provider_message_id ?? null,
        completion_error: completeError instanceof Error ? completeError.message : String(completeError),
        reconciliation_required: true,
      });

      return jsonResponse({
        success: false,
        error_code: "PROVIDER_SENT_LOCAL_COMPLETION_FAILED",
        error: "SMS enviado por proveedor, pero requiere conciliación local.",
        reconciliation_required: true,
        reconciliation_reason: "provider_sent_local_completion_failed",
      }, 502);
    }

    await touchApiKey(supabaseAdmin, apiKeyId);
    await logApiRequest(supabaseAdmin, apiKeyId, apiUserId, "sent", null);

    return jsonResponse({
      success: true,
      status: complete.status ?? "sent",
      message_id: complete.message_id ?? providerResult.provider_message_id ?? null,
      credits_used: Number(complete.cost ?? complete.segments ?? begin.cost ?? begin.segments ?? 1),
      balance_after: complete.balance_after ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = normalizeRpcError(message);
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceRoleKey && apiKeyId && apiUserId) {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        }) as unknown as AnySupabaseClient;
        await logApiRequest(supabaseAdmin, apiKeyId, apiUserId, "failed", code);
      }
    } catch {
      // Logging must not hide main API error.
    }

    logSafe("api-send-sms failed", {
      status: "failed",
      error_code: code,
      duration_ms: Date.now() - startedAt,
    });

    return jsonResponse({ success: false, error_code: code, error: publicErrorMessage(code) }, getHttpStatusForError(code));
  }
});

async function findApiKey(supabaseAdmin: AnySupabaseClient, rawKey: string): Promise<ApiKeyRow> {
  const keyHash = await sha256Hex(rawKey);
  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id,user_id,scopes,is_active,revoked_at,expires_at,rate_limit_per_minute,rate_limit_per_day")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !data) {
    throw new Error("API_KEY_INVALID");
  }

  return data as ApiKeyRow;
}

function validateApiKey(key: ApiKeyRow): string | null {
  if (key.is_active !== true || key.revoked_at) {
    return "API_KEY_REVOKED";
  }

  if (key.expires_at && new Date(key.expires_at).getTime() <= Date.now()) {
    return "API_KEY_EXPIRED";
  }

  if (!Array.isArray(key.scopes) || !key.scopes.includes("sms:send")) {
    return "API_KEY_SCOPE_DENIED";
  }

  return null;
}

async function checkRateLimit(supabaseAdmin: AnySupabaseClient, key: ApiKeyRow): Promise<string | null> {
  const minuteLimit = Number(key.rate_limit_per_minute ?? 60);
  const dayLimit = Number(key.rate_limit_per_day ?? 1000);
  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();

  const minuteCount = await countApiLogs(supabaseAdmin, key.id, minuteAgo);
  if (minuteCount >= minuteLimit) {
    return "RATE_LIMIT_EXCEEDED";
  }

  const dayCount = await countApiLogs(supabaseAdmin, key.id, dayAgo);
  if (dayCount >= dayLimit) {
    return "RATE_LIMIT_EXCEEDED";
  }

  return null;
}

async function countApiLogs(supabaseAdmin: AnySupabaseClient, apiKeyId: string, fromIso: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("api_request_logs")
    .select("id", { count: "exact", head: true })
    .eq("api_key_id", apiKeyId)
    .gte("created_at", fromIso);

  if (error) {
    return 0;
  }

  return Number(count ?? 0);
}

async function beginCompanyAttempt(
  supabaseAdmin: AnySupabaseClient,
  userId: string,
  idempotencyKey: string,
  recipient: string,
  message: string,
): Promise<BeginAttemptResult> {
  const { data, error } = await rpcUntyped(supabaseAdmin, "internal_begin_company_sms_send_attempt", {
    p_user_id: userId,
    p_idempotency_key: idempotencyKey,
    p_recipient: recipient,
    p_message: message,
  });

  if (error) throw new Error(error.message);
  return normalizeRpcResult(data) as BeginAttemptResult;
}

async function completeCompanyAttemptSuccess(
  supabaseAdmin: AnySupabaseClient,
  attemptId: string,
  provider: string,
  providerMessageId: string | null,
  providerResponse: unknown,
): Promise<CompleteAttemptResult> {
  const { data, error } = await rpcUntyped(supabaseAdmin, "internal_complete_company_sms_send_success", {
    p_attempt_id: attemptId,
    p_provider: provider,
    p_provider_message_id: providerMessageId,
    p_provider_response: sanitizeProviderResponse(providerResponse),
  });

  if (error) throw new Error(error.message);
  return normalizeRpcResult(data) as CompleteAttemptResult;
}

async function completeCompanyAttemptFailed(
  supabaseAdmin: AnySupabaseClient,
  attemptId: string,
  provider: string,
  providerResponse: unknown,
  errorCode: string,
): Promise<CompleteAttemptResult> {
  const { data, error } = await rpcUntyped(supabaseAdmin, "internal_complete_company_sms_send_failed", {
    p_attempt_id: attemptId,
    p_provider: provider,
    p_provider_response: sanitizeProviderResponse(providerResponse),
    p_error_message: normalizeProviderErrorCode(errorCode),
  });

  if (error) throw new Error(error.message);
  return normalizeRpcResult(data) as CompleteAttemptResult;
}

async function touchApiKey(supabaseAdmin: AnySupabaseClient, apiKeyId: string): Promise<void> {
  await supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", apiKeyId);
}

async function logApiRequest(
  supabaseAdmin: AnySupabaseClient,
  apiKeyId: string | null,
  userId: string | null,
  status: "sent" | "failed",
  errorCode: string | null,
): Promise<void> {
  await supabaseAdmin
    .from("api_request_logs")
    .insert({
      api_key_id: apiKeyId,
      user_id: userId,
      endpoint: "api-send-sms",
      status,
      error_code: errorCode,
    });
}

async function readBody(req: Request): Promise<Body> {
  try {
    return await req.json() as Body;
  } catch {
    return {};
  }
}

function resolveIdempotencyKey(req: Request, body: Body, apiKeyId: string): string {
  return body.idempotency_key?.trim()
    || req.headers.get("Idempotency-Key")?.trim()
    || `api_${apiKeyId}_${crypto.randomUUID()}`;
}

function isValidIdempotencyKey(value: string): boolean {
  return /^[A-Za-z0-9_.-]{8,160}$/.test(value);
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeRpcResult(data: unknown): Record<string, unknown> {
  if (Array.isArray(data)) return normalizeRpcResult(data[0]);
  return data && typeof data === "object" ? data as Record<string, unknown> : {};
}

function normalizeRpcError(message: string): string {
  const upper = message.toUpperCase();
  const known = [
    "API_KEY_INVALID",
    "API_KEY_REQUIRED",
    "API_KEY_REVOKED",
    "API_KEY_EXPIRED",
    "API_KEY_SCOPE_DENIED",
    "NOT_AUTHORIZED",
    "COMPANY_NOT_FOUND",
    "COMPANY_INACTIVE",
    "INSUFFICIENT_CREDITS",
    "INVALID_IDEMPOTENCY_KEY",
    "SMS_SEND_ALREADY_PROCESSING",
    "SMS_SEND_ALREADY_FAILED_USE_NEW_KEY",
    "RATE_LIMIT_EXCEEDED",
    "INVALID_PHONE",
    "EMPTY_MESSAGE",
    "INVALID_RUC",
    "PROVIDER_TIMEOUT",
    "PROVIDER_REQUEST_FAILED",
    "PROVIDER_AUTH_FAILED",
    "PROVIDER_NOT_CONFIGURED",
    "PROVIDER_INVALID_RESPONSE",
  ];

  return known.find((code) => upper.includes(code)) ?? "UNKNOWN_ERROR";
}

function publicErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    API_KEY_INVALID: "API Key inválida.",
    API_KEY_REQUIRED: "X-API-Key requerido.",
    API_KEY_REVOKED: "API Key revocada o inactiva.",
    API_KEY_EXPIRED: "API Key expirada.",
    API_KEY_SCOPE_DENIED: "API Key sin permiso sms:send.",
    NOT_AUTHORIZED: "No autorizado.",
    COMPANY_NOT_FOUND: "Empresa/RUC no encontrada.",
    COMPANY_INACTIVE: "Empresa/RUC inactiva.",
    INSUFFICIENT_CREDITS: "Saldo insuficiente.",
    INVALID_IDEMPOTENCY_KEY: "Idempotency-Key inválido.",
    SMS_SEND_ALREADY_PROCESSING: "Envío ya está en proceso.",
    SMS_SEND_ALREADY_FAILED_USE_NEW_KEY: "El envío anterior falló. Usa otro Idempotency-Key.",
    RATE_LIMIT_EXCEEDED: "Límite de uso excedido.",
    INVALID_PHONE: "Teléfono inválido.",
    EMPTY_MESSAGE: "Mensaje vacío.",
    INVALID_RUC: "RUC inválido.",
    PROVIDER_TIMEOUT: "Proveedor SMS no respondió a tiempo.",
    PROVIDER_REQUEST_FAILED: "Proveedor SMS no disponible.",
    PROVIDER_AUTH_FAILED: "No se pudo autenticar con proveedor SMS.",
    PROVIDER_NOT_CONFIGURED: "Proveedor SMS no configurado.",
    PROVIDER_INVALID_RESPONSE: "Respuesta inválida del proveedor SMS.",
  };

  return messages[normalizeProviderErrorCode(code)] ?? messages[code] ?? "No se pudo completar el envío.";
}

function getHttpStatusForError(code: string): number {
  const normalized = normalizeProviderErrorCode(code);
  if (normalized === "API_KEY_INVALID" || normalized === "API_KEY_REQUIRED") return 401;
  if (normalized.includes("NOT_AUTHORIZED") || normalized.includes("COMPANY")) return 403;
  if (normalized.includes("INSUFFICIENT") || normalized.includes("IDEMPOTENCY") || normalized.includes("RATE_LIMIT")) return 409;
  if (normalized.includes("INVALID_PHONE") || normalized.includes("EMPTY_MESSAGE") || normalized.includes("INVALID_RUC")) return 422;
  if (normalized.includes("TIMEOUT")) return 504;
  if (normalized.includes("PROVIDER")) return 502;
  return 500;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(sanitizeProviderResponse(body)), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function logSafe(message: string, details: Record<string, unknown>): void {
  console.warn(message, sanitizeProviderResponse(details));
}
