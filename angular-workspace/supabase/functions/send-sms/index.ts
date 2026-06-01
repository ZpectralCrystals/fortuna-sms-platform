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
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Idempotency-Key",
};

interface SendSmsBody {
  recipient?: string;
  message?: string;
  idempotency_key?: string;
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
  balance_before?: number;
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
  error_message?: string;
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
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

    const body = await readBody(req);
    const recipient = body.recipient?.trim();
    const message = body.message?.trim();
    const idempotencyKey = resolveIdempotencyKey(req, body);

    if (!isValidIdempotencyKey(idempotencyKey)) {
      return jsonResponse({ success: false, error: "No se pudo validar este envío. Intenta nuevamente." }, 409);
    }

    if (!recipient) {
      return jsonResponse({ success: false, error: "Número inválido. Usa formato peruano +51XXXXXXXXX." }, 422);
    }

    if (!message) {
      return jsonResponse({ success: false, error: "El mensaje no puede estar vacío." }, 422);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const begin = await beginCompanyAttempt(
      supabaseAdmin,
      authData.user.id,
      idempotencyKey,
      recipient,
      message,
    );

    if (!begin.success || !begin.attempt_id || !begin.ruc) {
      return jsonResponse(
        { success: false, error: "No se pudo preparar el envío." },
        500,
      );
    }

    if (begin.already_processed) {
      return jsonResponse({
        success: true,
        message_id: begin.message_id ?? null,
        company_id: begin.company_id ?? null,
        ruc: begin.ruc,
        recipient: begin.recipient ?? recipient,
        segments: Number(begin.segments ?? 1),
        cost: Number(begin.cost ?? begin.segments ?? 1),
        status: begin.status ?? "sent",
        test_mode: false,
        already_processed: true,
      });
    }

    const providerResult = await sendIndividualSms(
      begin.ruc,
      begin.provider_recipient ?? begin.recipient ?? recipient,
      message,
      begin.attempt_id,
    );

    if (!providerResult.success) {
      const errorCode = providerResult.error ?? "PROVIDER_REQUEST_FAILED";
      let failed: CompleteAttemptResult = { status: "failed" };

      try {
        failed = await completeCompanyAttemptFailed(
          supabaseAdmin,
          begin.attempt_id,
          providerResult.provider,
          providerResult.provider_response,
          errorCode,
        );
      } catch (completeError) {
        logSafe("send-sms provider failed local completion failed", {
          request_id: requestId,
          user_id: authData.user.id,
          company_id: begin.company_id,
          ruc: begin.ruc,
          attempt_id: begin.attempt_id,
          provider: providerResult.provider,
          error_code: normalizeProviderErrorCode(errorCode),
          completion_error: completeError instanceof Error ? completeError.message : String(completeError),
          reconciliation_required: true,
          status: "provider_failed_local_completion_failed",
          duration_ms: Date.now() - startedAt,
        });

        return jsonResponse({
          success: false,
          error: mapProviderError(errorCode),
          reconciliation_required: true,
          reconciliation_reason: "provider_failed_but_local_attempt_update_failed",
        }, 502);
      }

      logSafe("send-sms provider failed", {
        request_id: requestId,
        user_id: authData.user.id,
        company_id: begin.company_id,
        ruc: begin.ruc,
        provider: providerResult.provider,
        error_code: normalizeProviderErrorCode(errorCode),
        status: failed.status ?? "failed",
        duration_ms: Date.now() - startedAt,
      });

      return jsonResponse(
        { success: false, error: mapProviderError(errorCode) },
        getHttpStatusForError(errorCode),
      );
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
      logSafe("send-sms provider success local completion failed", {
        request_id: requestId,
        user_id: authData.user.id,
        company_id: begin.company_id,
        ruc: begin.ruc,
        attempt_id: begin.attempt_id,
        provider: providerResult.provider,
        provider_message_id: providerResult.provider_message_id ?? null,
        completion_error: completeError instanceof Error ? completeError.message : String(completeError),
        reconciliation_required: true,
        status: "provider_sent_local_completion_failed",
        duration_ms: Date.now() - startedAt,
      });

      return jsonResponse({
        success: false,
        error: "SMS enviado por proveedor, pero requiere conciliación local.",
        reconciliation_required: true,
        reconciliation_reason: "provider_sent_local_completion_failed",
      }, 502);
    }

    return jsonResponse({
      success: true,
      message_id: complete.message_id ?? providerResult.provider_message_id ?? null,
      company_id: complete.company_id ?? begin.company_id ?? null,
      ruc: complete.ruc ?? begin.ruc,
      recipient: complete.recipient ?? begin.recipient ?? recipient,
      segments: Number(complete.segments ?? begin.segments ?? 1),
      cost: Number(complete.cost ?? begin.cost ?? begin.segments ?? 1),
      balance_after: complete.balance_after ?? null,
      status: complete.status ?? "sent",
      test_mode: providerResult.provider === "mock_fortuna_services",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = normalizeRpcError(message);

    logSafe("send-sms failed", {
      request_id: requestId,
      status: "failed",
      error_code: code,
      duration_ms: Date.now() - startedAt,
    });

    return jsonResponse({ success: false, error: publicErrorMessage(code) }, getHttpStatusForError(code));
  }
});

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

  if (error) {
    throw new Error(error.message);
  }

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

  if (error) {
    throw new Error(error.message);
  }

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

  if (error) {
    throw new Error(error.message);
  }

  return normalizeRpcResult(data) as CompleteAttemptResult;
}

function getBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim() || null;
}

async function readBody(req: Request): Promise<SendSmsBody> {
  try {
    return await req.json() as SendSmsBody;
  } catch {
    return {};
  }
}

function resolveIdempotencyKey(req: Request, body: SendSmsBody): string {
  return body.idempotency_key?.trim()
    || req.headers.get("Idempotency-Key")?.trim()
    || crypto.randomUUID();
}

function isValidIdempotencyKey(value: string): boolean {
  return /^[A-Za-z0-9_.-]{8,120}$/.test(value);
}

function normalizeRpcResult(data: unknown): Record<string, unknown> {
  if (Array.isArray(data)) {
    return normalizeRpcResult(data[0]);
  }

  if (data && typeof data === "object") {
    return data as Record<string, unknown>;
  }

  return {};
}

function normalizeRpcError(message: string): string {
  const upper = message.toUpperCase();
  const known = [
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
    NOT_AUTHORIZED: "Sesión inválida.",
    COMPANY_NOT_FOUND: "Usuario sin empresa activa.",
    COMPANY_INACTIVE: "Empresa inactiva.",
    INSUFFICIENT_CREDITS: "Saldo insuficiente.",
    INVALID_IDEMPOTENCY_KEY: "No se pudo validar este envío. Intenta nuevamente.",
    SMS_SEND_ALREADY_PROCESSING: "Este envío ya está en proceso. Espera unos segundos.",
    SMS_SEND_ALREADY_FAILED_USE_NEW_KEY: "Este envío falló. Intenta nuevamente.",
    RATE_LIMIT_EXCEEDED: "Has enviado demasiados SMS en poco tiempo.",
    INVALID_PHONE: "Número inválido. Usa formato peruano +51XXXXXXXXX.",
    EMPTY_MESSAGE: "El mensaje no puede estar vacío.",
    INVALID_RUC: "RUC inválido.",
    PROVIDER_TIMEOUT: "El proveedor SMS no respondió a tiempo.",
    PROVIDER_REQUEST_FAILED: "No se pudo conectar con el proveedor SMS.",
    PROVIDER_AUTH_FAILED: "No se pudo autenticar con el proveedor SMS.",
    PROVIDER_NOT_CONFIGURED: "Proveedor SMS real aún no configurado.",
    PROVIDER_INVALID_RESPONSE: "Respuesta inválida del proveedor SMS.",
  };

  return messages[code] ?? "No se pudo enviar el SMS.";
}

function getHttpStatusForError(code: string): number {
  const normalized = normalizeRpcError(code);

  if (normalized === "NOT_AUTHORIZED") return 401;
  if (normalized === "COMPANY_NOT_FOUND" || normalized === "COMPANY_INACTIVE") return 403;
  if (
    normalized === "INSUFFICIENT_CREDITS"
    || normalized === "INVALID_IDEMPOTENCY_KEY"
    || normalized === "SMS_SEND_ALREADY_PROCESSING"
    || normalized === "SMS_SEND_ALREADY_FAILED_USE_NEW_KEY"
    || normalized === "RATE_LIMIT_EXCEEDED"
  ) return 409;
  if (normalized === "INVALID_PHONE" || normalized === "EMPTY_MESSAGE" || normalized === "INVALID_RUC") return 422;
  if (normalized === "PROVIDER_TIMEOUT") return 504;
  if (normalized.startsWith("PROVIDER_")) return 502;

  return 500;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function logSafe(message: string, payload: Record<string, unknown>): void {
  console.log(message, JSON.stringify(sanitizeProviderResponse(payload)));
}
