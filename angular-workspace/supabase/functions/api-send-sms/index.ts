import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  mapProviderError,
  normalizeProviderErrorCode,
  sanitizeProviderResponse,
  sendSmsViaProviderAdapter,
} from "../_shared/sms-provider-current.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, Idempotency-Key",
};

const ENDPOINT = "api-send-sms";
const SMS_COST = 0.08;

type SupabaseClientInstance = ReturnType<typeof createClient>;

type ApiSendSmsBody = {
  recipient?: string;
  message?: string;
  idempotency_key?: string;
};

type ApiKeyRow = {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  revoked_at: string | null;
  expires_at: string | null;
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
};

type ProfileRow = {
  id: string;
  is_active: boolean | null;
  credits: number | null;
};

type RpcResult = {
  success?: boolean;
  already_processed?: boolean;
  attempt_id?: string;
  message_id?: string;
  sms_message_id?: string;
  id?: string;
  recipient?: string;
  provider_recipient?: string;
  segments?: number;
  cost?: number;
  status?: string;
  test_mode?: boolean;
  error_message?: string;
};

const publicMessages: Record<string, string> = {
  METHOD_NOT_ALLOWED: "Método no permitido.",
  API_KEY_REQUIRED: "API Key requerida.",
  API_KEY_INVALID: "API Key inválida.",
  API_KEY_REVOKED: "API Key revocada o inactiva.",
  API_KEY_EXPIRED: "API Key expirada.",
  INSUFFICIENT_SCOPE: "La API Key no tiene permisos para enviar SMS.",
  PROFILE_INACTIVE: "La cuenta está inactiva.",
  INVALID_PHONE: "Número de teléfono inválido.",
  EMPTY_MESSAGE: "El mensaje no puede estar vacío.",
  MESSAGE_TOO_LONG: "El mensaje es demasiado largo.",
  INVALID_IDEMPOTENCY_KEY: "Idempotency key inválida.",
  INSUFFICIENT_CREDITS: "Créditos insuficientes.",
  RATE_LIMIT_EXCEEDED: "Límite de uso excedido.",
  PROVIDER_ERROR: "No se pudo enviar el SMS con el proveedor.",
  INTERNAL_ERROR: "Error interno.",
  SMS_SEND_ALREADY_PROCESSING: "Este envío ya está en proceso.",
  SMS_SEND_ALREADY_FAILED_USE_NEW_KEY: "Este envío falló. Usa una nueva idempotency_key.",
};

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  let stage = "REQUEST_START";

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", 405);
  }

  let apiKeyRow: ApiKeyRow | null = null;

  try {
    stage = "ENV_CHECK";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    logStage(stage, requestId, {
      has_supabase_url: Boolean(supabaseUrl),
      has_service_role_key: Boolean(serviceRoleKey),
    });

    if (!supabaseUrl || !serviceRoleKey) {
      logStageError(stage, requestId, "MISSING_ENV", {
        has_supabase_url: Boolean(supabaseUrl),
        has_service_role_key: Boolean(serviceRoleKey),
      });
      return errorResponse("INTERNAL_ERROR", 500);
    }

    const apiKey = readApiKey(req.headers);
    if (!apiKey) {
      return errorResponse("API_KEY_REQUIRED", 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    stage = "API_KEY_LOOKUP";
    logStage(stage, requestId, {
      has_api_key: true,
    });
    const apiKeyHash = await sha256Hex(apiKey);
    apiKeyRow = await findApiKey(supabaseAdmin, apiKeyHash);

    if (!apiKeyRow) {
      logStageError(stage, requestId, "API_KEY_INVALID");
      return errorResponse("API_KEY_INVALID", 401);
    }

    logStage(stage, requestId, {
      api_key_id: apiKeyRow.id,
      user_id: apiKeyRow.user_id,
      key_prefix: apiKeyRow.key_prefix,
      scopes: apiKeyRow.scopes,
      is_active: apiKeyRow.is_active,
      has_revoked_at: Boolean(apiKeyRow.revoked_at),
      has_expires_at: Boolean(apiKeyRow.expires_at),
    });

    const keyValidation = validateApiKey(apiKeyRow);
    if (keyValidation) {
      logStageError(stage, requestId, keyValidation, {
        api_key_id: apiKeyRow.id,
        user_id: apiKeyRow.user_id,
      });
      await logApiRequest(supabaseAdmin, apiKeyRow, "failed", keyValidation);
      return errorResponse(keyValidation, keyValidation === "INSUFFICIENT_SCOPE" ? 403 : 401);
    }

    stage = "PROFILE_LOOKUP";
    logStage(stage, requestId, {
      api_key_id: apiKeyRow.id,
      user_id: apiKeyRow.user_id,
    });
    const profile = await findProfile(supabaseAdmin, apiKeyRow.user_id);
    if (!profile || profile.is_active !== true) {
      logStageError(stage, requestId, "PROFILE_INACTIVE", {
        api_key_id: apiKeyRow.id,
        user_id: apiKeyRow.user_id,
        found_profile: Boolean(profile),
        is_active: profile?.is_active ?? null,
      });
      await logApiRequest(supabaseAdmin, apiKeyRow, "failed", "PROFILE_INACTIVE");
      return errorResponse("PROFILE_INACTIVE", 403);
    }
    logStage(stage, requestId, {
      api_key_id: apiKeyRow.id,
      user_id: apiKeyRow.user_id,
      profile_active: profile.is_active,
      credits: Number(profile.credits ?? 0),
    });

    stage = "RATE_LIMIT";
    logStage(stage, requestId, {
      api_key_id: apiKeyRow.id,
      user_id: apiKeyRow.user_id,
      rate_limit_per_minute: apiKeyRow.rate_limit_per_minute,
      rate_limit_per_day: apiKeyRow.rate_limit_per_day,
    });
    const rateError = await validateRateLimit(supabaseAdmin, apiKeyRow);
    if (rateError) {
      logStageError(stage, requestId, rateError, {
        api_key_id: apiKeyRow.id,
        user_id: apiKeyRow.user_id,
      });
      await logApiRequest(supabaseAdmin, apiKeyRow, "failed", rateError);
      return errorResponse(rateError, 429);
    }

    const body = await readBody(req);
    const recipient = body.recipient?.trim() ?? "";
    const normalizedRecipient = normalizePeruPhone(recipient);
    const message = body.message?.trim() ?? "";
    const idempotencyKey = resolveIdempotencyKey(req, body);

    if (!normalizedRecipient) {
      await logApiRequest(supabaseAdmin, apiKeyRow, "failed", "INVALID_PHONE");
      return errorResponse("INVALID_PHONE", 400);
    }

    if (!message) {
      await logApiRequest(supabaseAdmin, apiKeyRow, "failed", "EMPTY_MESSAGE");
      return errorResponse("EMPTY_MESSAGE", 400);
    }

    if (!isValidIdempotencyKey(idempotencyKey)) {
      await logApiRequest(supabaseAdmin, apiKeyRow, "failed", "INVALID_IDEMPOTENCY_KEY");
      return errorResponse("INVALID_IDEMPOTENCY_KEY", 400);
    }

    stage = "BEGIN_ATTEMPT_RPC";
    logStage(stage, requestId, {
      api_key_id: apiKeyRow.id,
      user_id: apiKeyRow.user_id,
      recipient: normalizedRecipient,
      message_length: message.length,
      idempotency_key_length: idempotencyKey.length,
      rpc: "internal_begin_sms_send_attempt",
      params: ["p_user_id", "p_idempotency_key", "p_recipient", "p_message"],
    });
    const attempt = await beginSmsAttempt(
      supabaseAdmin,
      apiKeyRow.user_id,
      idempotencyKey,
      normalizedRecipient,
      message,
    );

    if (!attempt.success) {
      const errorCode = normalizePublicErrorCode(attempt.error_message ?? attempt.status ?? "INTERNAL_ERROR");
      logStageError(stage, requestId, errorCode, {
        api_key_id: apiKeyRow.id,
        user_id: apiKeyRow.user_id,
        rpc_status: attempt.status ?? null,
      });
      await logApiRequest(supabaseAdmin, apiKeyRow, "failed", errorCode);
      return errorResponse(errorCode, statusForError(errorCode));
    }
    logStage(stage, requestId, {
      api_key_id: apiKeyRow.id,
      user_id: apiKeyRow.user_id,
      attempt_id: attempt.attempt_id ?? null,
      already_processed: attempt.already_processed ?? false,
      segments: Number(attempt.segments ?? 0),
      cost: Number(attempt.cost ?? 0),
    });

    if (attempt.already_processed) {
      await markApiKeyUsed(supabaseAdmin, apiKeyRow.id);
      await logApiRequest(supabaseAdmin, apiKeyRow, "success");
      return successResponse({
        message_id: attempt.message_id ?? attempt.sms_message_id ?? attempt.id ?? null,
        recipient: attempt.recipient ?? normalizedRecipient,
        segments: Number(attempt.segments ?? calculateSmsSegments(message)),
        cost: Number(attempt.cost ?? calculateSmsSegments(message) * SMS_COST),
        status: "sent",
      });
    }

    if (!attempt.attempt_id) {
      await logApiRequest(supabaseAdmin, apiKeyRow, "failed", "INTERNAL_ERROR");
      return errorResponse("INTERNAL_ERROR", 500);
    }

    stage = "PROVIDER_ADAPTER";
    logStage(stage, requestId, {
      api_key_id: apiKeyRow.id,
      user_id: apiKeyRow.user_id,
      attempt_id: attempt.attempt_id,
      provider_recipient_present: Boolean(attempt.provider_recipient),
      segments: Number(attempt.segments ?? 0),
      cost: Number(attempt.cost ?? 0),
    });
    const providerResult = await sendSmsViaProviderAdapter({
      recipient: attempt.recipient ?? normalizedRecipient,
      providerRecipient: attempt.provider_recipient,
      message,
      segments: Number(attempt.segments ?? calculateSmsSegments(message)),
      cost: Number(attempt.cost ?? calculateSmsSegments(message) * SMS_COST),
      requestId,
    });

    if (!providerResult.success) {
      const providerError = normalizeProviderErrorCode(providerResult.error ?? "PROVIDER_ERROR");
      logStageError(stage, requestId, providerError, {
        api_key_id: apiKeyRow.id,
        user_id: apiKeyRow.user_id,
        attempt_id: attempt.attempt_id,
        provider: providerResult.provider,
      });
      stage = "COMPLETE_FAILED_RPC";
      logStage(stage, requestId, {
        api_key_id: apiKeyRow.id,
        user_id: apiKeyRow.user_id,
        attempt_id: attempt.attempt_id,
        rpc: "internal_complete_sms_send_failed",
        params: ["p_attempt_id", "p_provider", "p_provider_response", "p_error_message"],
      });
      const failed = await completeSmsFailed(
        supabaseAdmin,
        attempt.attempt_id,
        providerResult.provider,
        sanitizeProviderResponse(providerResult.provider_response),
        mapProviderError(providerError),
      );

      if (failed.success === true || failed.status === "sent") {
        logStage(stage, requestId, {
          api_key_id: apiKeyRow.id,
          user_id: apiKeyRow.user_id,
          attempt_id: attempt.attempt_id,
          recovered_as_sent: true,
        });
        await markApiKeyUsed(supabaseAdmin, apiKeyRow.id);
        await logApiRequest(supabaseAdmin, apiKeyRow, "success");
        return successResponse({
          message_id: failed.message_id ?? failed.id ?? null,
          recipient: failed.recipient ?? normalizedRecipient,
          segments: Number(failed.segments ?? attempt.segments ?? 1),
          cost: Number(failed.cost ?? attempt.cost ?? SMS_COST),
          status: "sent",
        });
      }

      logStageError(stage, requestId, providerError, {
        api_key_id: apiKeyRow.id,
        user_id: apiKeyRow.user_id,
        attempt_id: attempt.attempt_id,
        status: failed.status ?? null,
      });
      await logApiRequest(supabaseAdmin, apiKeyRow, "failed", providerError);
      return errorResponse("PROVIDER_ERROR", 502);
    }
    logStage(stage, requestId, {
      api_key_id: apiKeyRow.id,
      user_id: apiKeyRow.user_id,
      attempt_id: attempt.attempt_id,
      provider: providerResult.provider,
      status: providerResult.status,
    });

    stage = "COMPLETE_SUCCESS_RPC";
    logStage(stage, requestId, {
      api_key_id: apiKeyRow.id,
      user_id: apiKeyRow.user_id,
      attempt_id: attempt.attempt_id,
      rpc: "internal_complete_sms_send_success",
      params: ["p_attempt_id", "p_provider", "p_provider_message_id", "p_provider_response"],
    });
    const completed = await completeSmsSuccess(
      supabaseAdmin,
      attempt.attempt_id,
      providerResult.provider,
      providerResult.provider_message_id ?? null,
      sanitizeProviderResponse(providerResult.provider_response),
    );

    if (!completed.success) {
      const errorCode = normalizePublicErrorCode(completed.error_message ?? completed.status ?? "INTERNAL_ERROR");
      logStageError(stage, requestId, errorCode, {
        api_key_id: apiKeyRow.id,
        user_id: apiKeyRow.user_id,
        attempt_id: attempt.attempt_id,
        rpc_status: completed.status ?? null,
      });
      await logApiRequest(supabaseAdmin, apiKeyRow, "failed", errorCode);
      return errorResponse(errorCode, statusForError(errorCode));
    }
    logStage(stage, requestId, {
      api_key_id: apiKeyRow.id,
      user_id: apiKeyRow.user_id,
      attempt_id: attempt.attempt_id,
      message_id: completed.message_id ?? completed.id ?? null,
      status: completed.status ?? "sent",
    });

    await markApiKeyUsed(supabaseAdmin, apiKeyRow.id);
    await logApiRequest(supabaseAdmin, apiKeyRow, "success");

    logSafe("api-send-sms success", {
      request_id: requestId,
      api_key_id: apiKeyRow.id,
      user_id: apiKeyRow.user_id,
      duration_ms: Date.now() - startedAt,
    });

    return successResponse({
      message_id: completed.message_id ?? completed.id ?? null,
      recipient: completed.recipient ?? normalizedRecipient,
      segments: Number(completed.segments ?? attempt.segments ?? 1),
      cost: Number(completed.cost ?? attempt.cost ?? SMS_COST),
      status: "sent",
    });
  } catch (error) {
    logStageError(stage, requestId, error instanceof Error ? error.name : "UnknownError", {
      request_id: requestId,
      api_key_id: apiKeyRow?.id ?? null,
      user_id: apiKeyRow?.user_id ?? null,
      error_message: error instanceof Error ? error.message : "Unknown error",
      duration_ms: Date.now() - startedAt,
    });

    return errorResponse("INTERNAL_ERROR", 500);
  }
});

function readApiKey(headers: Headers): string | null {
  const direct = headers.get("X-API-Key")?.trim();
  if (direct) {
    return direct;
  }

  const auth = headers.get("Authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice("Bearer ".length).trim() || null;
  }

  return null;
}

async function readBody(req: Request): Promise<ApiSendSmsBody> {
  try {
    return await req.json() as ApiSendSmsBody;
  } catch {
    return {};
  }
}

async function findApiKey(
  supabaseAdmin: SupabaseClientInstance,
  hash: string,
): Promise<ApiKeyRow | null> {
  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id,user_id,name,key_prefix,scopes,is_active,revoked_at,expires_at,rate_limit_per_minute,rate_limit_per_day")
    .eq("key_hash", hash)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ApiKeyRow | null;
}

async function findProfile(
  supabaseAdmin: SupabaseClientInstance,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id,is_active,credits")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ProfileRow | null;
}

function validateApiKey(row: ApiKeyRow): string | null {
  if (!row.is_active || row.revoked_at) {
    return "API_KEY_REVOKED";
  }

  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return "API_KEY_EXPIRED";
  }

  if (!Array.isArray(row.scopes) || !row.scopes.includes("sms:send")) {
    return "INSUFFICIENT_SCOPE";
  }

  return null;
}

async function validateRateLimit(
  supabaseAdmin: SupabaseClientInstance,
  row: ApiKeyRow,
): Promise<string | null> {
  const minuteStart = new Date(Date.now() - 60_000).toISOString();
  const dayStart = new Date(Date.now() - 24 * 60 * 60_000).toISOString();

  const [minuteResult, dayResult] = await Promise.all([
    supabaseAdmin
      .from("api_request_logs")
      .select("id", { count: "exact", head: true })
      .eq("api_key_id", row.id)
      .eq("endpoint", ENDPOINT)
      .gte("created_at", minuteStart),
    supabaseAdmin
      .from("api_request_logs")
      .select("id", { count: "exact", head: true })
      .eq("api_key_id", row.id)
      .eq("endpoint", ENDPOINT)
      .gte("created_at", dayStart),
  ]);

  if (minuteResult.error) throw minuteResult.error;
  if (dayResult.error) throw dayResult.error;

  if ((minuteResult.count ?? 0) >= row.rate_limit_per_minute) {
    return "RATE_LIMIT_EXCEEDED";
  }

  if ((dayResult.count ?? 0) >= row.rate_limit_per_day) {
    return "RATE_LIMIT_EXCEEDED";
  }

  return null;
}

async function beginSmsAttempt(
  supabaseAdmin: SupabaseClientInstance,
  userId: string,
  idempotencyKey: string,
  recipient: string,
  message: string,
): Promise<RpcResult> {
  const { data, error } = await supabaseAdmin.rpc("internal_begin_sms_send_attempt", {
    p_user_id: userId,
    p_idempotency_key: idempotencyKey,
    p_recipient: recipient,
    p_message: message,
  });

  if (error) {
    return {
      success: false,
      status: error.code,
      error_message: error.message,
    };
  }

  return normalizeRpcResult(data);
}

async function completeSmsSuccess(
  supabaseAdmin: SupabaseClientInstance,
  attemptId: string,
  provider: string,
  providerMessageId: string | null,
  providerResponse: Record<string, unknown>,
): Promise<RpcResult> {
  const { data, error } = await supabaseAdmin.rpc("internal_complete_sms_send_success", {
    p_attempt_id: attemptId,
    p_provider: provider,
    p_provider_message_id: providerMessageId,
    p_provider_response: providerResponse,
  });

  if (error) {
    return {
      success: false,
      status: error.code,
      error_message: error.message,
    };
  }

  return normalizeRpcResult(data);
}

async function completeSmsFailed(
  supabaseAdmin: SupabaseClientInstance,
  attemptId: string,
  provider: string,
  providerResponse: Record<string, unknown>,
  errorMessage: string,
): Promise<RpcResult> {
  const { data, error } = await supabaseAdmin.rpc("internal_complete_sms_send_failed", {
    p_attempt_id: attemptId,
    p_provider: provider,
    p_provider_response: providerResponse,
    p_error_message: errorMessage,
  });

  if (error) {
    return {
      success: false,
      status: error.code,
      error_message: error.message,
    };
  }

  return normalizeRpcResult(data);
}

async function markApiKeyUsed(
  supabaseAdmin: SupabaseClientInstance,
  apiKeyId: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("api_keys")
    .update({
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", apiKeyId);

  if (error) {
    logSafe("api-send-sms last_used_at update failed", {
      api_key_id: apiKeyId,
      error_code: error.code,
    });
  }
}

async function logApiRequest(
  supabaseAdmin: SupabaseClientInstance,
  apiKey: ApiKeyRow,
  status: "success" | "failed",
  errorCode: string | null = null,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("api_request_logs")
    .insert({
      api_key_id: apiKey.id,
      user_id: apiKey.user_id,
      endpoint: ENDPOINT,
      status,
      error_code: errorCode,
    });

  if (error) {
    logSafe("api-send-sms request log failed", {
      api_key_id: apiKey.id,
      error_code: error.code,
    });
  }
}

function normalizeRpcResult(data: unknown): RpcResult {
  if (Array.isArray(data)) {
    return normalizeRpcResult(data[0]);
  }

  if (data && typeof data === "object") {
    return data as RpcResult;
  }

  return {};
}

function resolveIdempotencyKey(req: Request, body: ApiSendSmsBody): string {
  return body.idempotency_key?.trim()
    || req.headers.get("Idempotency-Key")?.trim()
    || crypto.randomUUID();
}

function isValidIdempotencyKey(value: string): boolean {
  return /^[A-Za-z0-9_.-]{8,120}$/.test(value);
}

function normalizePeruPhone(value: string): string | null {
  const clean = value.trim().replace(/[\s().-]/g, "");

  if (/^\+519[0-9]{8}$/.test(clean)) {
    return clean;
  }

  if (/^519[0-9]{8}$/.test(clean)) {
    return `+${clean}`;
  }

  if (/^9[0-9]{8}$/.test(clean)) {
    return `+51${clean}`;
  }

  return null;
}

function calculateSmsSegments(message: string): number {
  return Math.ceil(message.length / 160) || 1;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizePublicErrorCode(value: string): string {
  const upper = value.toUpperCase();
  const keys = Object.keys(publicMessages);
  return keys.find((key) => upper.includes(key)) ?? "INTERNAL_ERROR";
}

function statusForError(code: string): number {
  if (code === "API_KEY_REQUIRED" || code === "API_KEY_INVALID" || code === "API_KEY_REVOKED" || code === "API_KEY_EXPIRED") {
    return 401;
  }

  if (code === "INSUFFICIENT_SCOPE" || code === "PROFILE_INACTIVE") {
    return 403;
  }

  if (code === "RATE_LIMIT_EXCEEDED") {
    return 429;
  }

  if (code === "SMS_SEND_ALREADY_PROCESSING" || code === "SMS_SEND_ALREADY_FAILED_USE_NEW_KEY") {
    return 409;
  }

  if (code === "PROVIDER_ERROR") {
    return 502;
  }

  return code === "INTERNAL_ERROR" ? 500 : 400;
}

function successResponse(payload: {
  message_id: string | null;
  recipient: string;
  segments: number;
  cost: number;
  status: string;
}): Response {
  return jsonResponse({
    success: true,
    message_id: payload.message_id,
    recipient: payload.recipient,
    segments: payload.segments,
    cost: Number(payload.cost.toFixed(4)),
    status: payload.status,
  });
}

function errorResponse(errorCode: string, status: number): Response {
  return jsonResponse({
    success: false,
    error_code: errorCode,
    message: publicMessages[errorCode] ?? publicMessages.INTERNAL_ERROR,
  }, status);
}

function jsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function logStage(stage: string, requestId: string, payload: Record<string, unknown> = {}): void {
  logSafe("api-send-sms stage", {
    stage,
    request_id: requestId,
    ...sanitizeLogPayload(payload),
  });
}

function logStageError(
  stage: string,
  requestId: string,
  errorCode: string,
  payload: Record<string, unknown> = {},
): void {
  logSafe("api-send-sms stage failed", {
    stage,
    request_id: requestId,
    error_code: errorCode,
    ...sanitizeLogPayload(payload),
  });
}

function sanitizeLogPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      const normalized = key.toLowerCase();
      if (
        normalized.includes("api_key")
        && !["api_key_id", "has_api_key"].includes(normalized)
      ) {
        return [key, "[redacted]"];
      }

      if (
        normalized.includes("secret")
        || normalized.includes("token")
        || normalized.includes("password")
        || normalized.includes("authorization")
        || normalized.includes("key_hash")
      ) {
        return [key, "[redacted]"];
      }

      return [key, value];
    }),
  );
}

function logSafe(message: string, payload: Record<string, unknown>): void {
  console.error(message, payload);
}
