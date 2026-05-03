import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

interface RpcResult {
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
  credits_before?: number;
}

interface ProviderResponse {
  data?: Record<string, unknown>;
  code?: string;
  message?: string;
}

type SmsProviderMode = "test" | "prod";
type SupabaseClientInstance = ReturnType<typeof createClient>;

type SmsProviderRequest = {
  userId: string;
  recipient: string;
  providerRecipient?: string;
  message: string;
  segments: number;
  cost?: number;
  idempotencyKey: string;
};

type SmsProviderResult = {
  success: boolean;
  provider: string;
  providerMessageId?: string;
  providerRecipient?: string;
  providerResponse?: unknown;
  errorMessage?: string;
  rawStatus?: string;
  messageId?: string;
  attemptId?: string;
  alreadyProcessed?: boolean;
  recipient?: string;
  segments?: number;
  cost?: number;
  status?: string;
  testMode?: boolean;
};

type RealProviderConfig = {
  apiUrl: string | null;
  apiKey: string | null;
  username: string | null;
  password: string | null;
  senderId: string | null;
  timeoutMs: number;
};

const errorMessages: Record<string, string> = {
  INVALID_PHONE: "Número inválido. Usa formato peruano +51XXXXXXXXX.",
  EMPTY_MESSAGE: "El mensaje no puede estar vacío.",
  INSUFFICIENT_CREDITS: "Créditos insuficientes.",
  PROFILE_INACTIVE: "Tu cuenta está inactiva.",
  PROFILE_NOT_FOUND: "Perfil no encontrado.",
  NOT_AUTHORIZED: "Sesión inválida.",
  PROVIDER_NOT_CONFIGURED: "Proveedor SMS real aún no configurado.",
  PROVIDER_AUTH_FAILED: "No se pudo autenticar con el proveedor SMS.",
  PROVIDER_REQUEST_FAILED: "No se pudo conectar con el proveedor SMS.",
  PROVIDER_TIMEOUT: "El proveedor SMS no respondió a tiempo.",
  PROVIDER_INVALID_RESPONSE: "Respuesta inválida del proveedor SMS.",
  INVALID_IDEMPOTENCY_KEY: "No se pudo validar este envío. Intenta nuevamente.",
  SMS_SEND_ALREADY_PROCESSING: "Este envío ya está en proceso. Espera unos segundos.",
  SMS_SEND_ALREADY_FAILED_USE_NEW_KEY: "Este envío falló. Intenta nuevamente.",
  RATE_LIMIT_EXCEEDED: "Has enviado demasiados SMS en poco tiempo. Intenta nuevamente en unos segundos.",
  DUPLICATE_SEND_ATTEMPT: "Este envío ya fue procesado.",
  SMS_SEND_ATTEMPT_NOT_FOUND: "No se pudo validar este envío. Intenta nuevamente.",
};

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
      return jsonResponse({ success: false, error: errorMessages.NOT_AUTHORIZED }, 401);
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !authData.user) {
      return jsonResponse({ success: false, error: errorMessages.NOT_AUTHORIZED }, 401);
    }

    const body = await readBody(req);
    const recipient = body.recipient?.trim();
    const message = body.message?.trim();
    const idempotencyKey = resolveIdempotencyKey(req, body);

    if (!isValidIdempotencyKey(idempotencyKey)) {
      return jsonResponse({ success: false, error: errorMessages.INVALID_IDEMPOTENCY_KEY }, 400);
    }

    if (!recipient) {
      return jsonResponse({ success: false, error: errorMessages.INVALID_PHONE }, 400);
    }

    if (!message) {
      return jsonResponse({ success: false, error: errorMessages.EMPTY_MESSAGE }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const providerRequest: SmsProviderRequest = {
      userId: authData.user.id,
      recipient,
      message,
      segments: calculateSmsSegments(message),
      idempotencyKey,
    };

    const providerMode = getProviderMode();
    const providerResult = providerMode === "prod"
      ? await sendWithRealProvider(supabaseAdmin, providerRequest, getRealProviderConfig())
      : await sendWithTestProvider(supabaseAdmin, providerRequest);

    if (!providerResult.success) {
      const errorCode = providerResult.errorMessage ?? providerResult.rawStatus ?? "";
      const mappedError = mapProviderError(errorCode);

      logSafe("send-sms provider failed", {
        request_id: requestId,
        user_id: authData.user.id,
        provider: providerResult.provider,
        mode: providerMode,
        status: providerResult.status ?? "failed",
        error_code: normalizeProviderErrorCode(errorCode),
        duration_ms: Date.now() - startedAt,
      });

      return jsonResponse(
        { success: false, error: mappedError },
        getHttpStatusForError(errorCode),
      );
    }

    return jsonResponse({
      success: true,
      message_id: providerResult.messageId ?? providerResult.providerMessageId ?? null,
      recipient: providerResult.recipient ?? recipient,
      segments: Number(providerResult.segments ?? providerRequest.segments),
      cost: Number(providerResult.cost ?? providerResult.segments ?? providerRequest.segments),
      status: providerResult.status ?? "sent",
      test_mode: providerResult.testMode ?? providerMode === "test",
    });
  } catch (error) {
    logSafe("send-sms failed", {
      request_id: requestId,
      status: "failed",
      error_code: error instanceof Error ? error.name : "UnknownError",
      duration_ms: Date.now() - startedAt,
    });

    return jsonResponse({ success: false, error: "No se pudo enviar el SMS." }, 500);
  }
});

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

function normalizeRpcResult(data: unknown): RpcResult {
  if (Array.isArray(data)) {
    return normalizeRpcResult(data[0]);
  }

  if (data && typeof data === "object") {
    return data as RpcResult;
  }

  return {};
}

async function sendWithTestProvider(
  supabaseAdmin: SupabaseClientInstance,
  request: SmsProviderRequest,
): Promise<SmsProviderResult> {
  const { data, error } = await supabaseAdmin.rpc("internal_send_sms_test", {
    p_user_id: request.userId,
    p_recipient: request.recipient,
    p_message: request.message,
  });

  if (error) {
    return {
      success: false,
      provider: "internal_test",
      errorMessage: error.message,
      rawStatus: error.code,
    };
  }

  const result = normalizeRpcResult(data);

  return {
    success: true,
    provider: "internal_test",
    providerMessageId: result.message_id ?? result.id,
    providerResponse: { test_mode: result.test_mode ?? true },
    messageId: result.message_id ?? result.id,
    recipient: result.recipient ?? request.recipient,
    segments: Number(result.segments ?? request.segments),
    cost: Number(result.cost ?? result.segments ?? request.segments),
    status: result.status ?? "sent",
    testMode: result.test_mode ?? true,
  };
}

async function sendWithRealProvider(
  supabaseAdmin: SupabaseClientInstance,
  request: SmsProviderRequest,
  config: RealProviderConfig,
): Promise<SmsProviderResult> {
  const attempt = await beginSmsSendAttempt(supabaseAdmin, request);

  if (!attempt.success || attempt.alreadyProcessed) {
    return attempt;
  }

  if (!attempt.attemptId) {
    return {
      success: false,
      provider: "fortuna_services",
      errorMessage: "SMS_SEND_ATTEMPT_NOT_FOUND",
      rawStatus: "SMS_SEND_ATTEMPT_NOT_FOUND",
    };
  }

  const attemptedRequest: SmsProviderRequest = {
    ...request,
    recipient: attempt.recipient ?? request.recipient,
    providerRecipient: attempt.providerRecipient,
    segments: attempt.segments ?? request.segments,
    cost: attempt.cost ?? request.cost ?? request.segments,
  };

  if (!config.apiUrl || !config.username || !config.password) {
    return await completeSmsSendFailed(
      supabaseAdmin,
      attempt.attemptId,
      "fortuna_services",
      { code: "PROVIDER_NOT_CONFIGURED" },
      "PROVIDER_NOT_CONFIGURED",
    );
  }

  const loginResult = await loginRealProvider(config);
  if (!loginResult.success || !loginResult.token) {
    return await completeSmsSendFailed(
      supabaseAdmin,
      attempt.attemptId,
      "fortuna_services",
      loginResult.providerResponse,
      loginResult.errorMessage ?? "PROVIDER_AUTH_FAILED",
    );
  }

  const smsResult = await sendRealProviderSms(attemptedRequest, config, loginResult.token);

  if (!smsResult.success) {
    return await completeSmsSendFailed(
      supabaseAdmin,
      attempt.attemptId,
      smsResult.provider,
      smsResult.providerResponse,
      smsResult.errorMessage ?? smsResult.rawStatus ?? "PROVIDER_REQUEST_FAILED",
    );
  }

  return await completeSmsSendSuccess(supabaseAdmin, attempt.attemptId, smsResult);
}

async function beginSmsSendAttempt(
  supabaseAdmin: SupabaseClientInstance,
  request: SmsProviderRequest,
): Promise<SmsProviderResult> {
  const { data, error } = await supabaseAdmin.rpc("internal_begin_sms_send_attempt", {
    p_user_id: request.userId,
    p_idempotency_key: request.idempotencyKey,
    p_recipient: request.recipient,
    p_message: request.message,
  });

  if (error) {
    return {
      success: false,
      provider: "fortuna_services",
      errorMessage: error.message,
      rawStatus: error.code,
    };
  }

  const result = normalizeRpcResult(data);

  return {
    success: true,
    provider: "fortuna_services",
    attemptId: result.attempt_id,
    alreadyProcessed: result.already_processed ?? false,
    messageId: result.message_id ?? result.sms_message_id ?? result.id,
    recipient: result.recipient ?? request.recipient,
    providerRecipient: result.provider_recipient,
    segments: Number(result.segments ?? request.segments),
    cost: Number(result.cost ?? request.cost ?? request.segments),
    status: result.status ?? (result.already_processed ? "sent" : "processing"),
    testMode: result.test_mode ?? false,
    rawStatus: result.already_processed ? "DUPLICATE_SEND_ATTEMPT" : "ATTEMPT_STARTED",
    providerResponse: sanitizeProviderResponse(result),
  };
}

async function completeSmsSendSuccess(
  supabaseAdmin: SupabaseClientInstance,
  attemptId: string,
  providerResult: SmsProviderResult,
): Promise<SmsProviderResult> {
  const { data, error } = await supabaseAdmin.rpc("internal_complete_sms_send_success", {
    p_attempt_id: attemptId,
    p_provider: providerResult.provider,
    p_provider_message_id: providerResult.providerMessageId ?? null,
    p_provider_response: sanitizeProviderResponse(providerResult.providerResponse),
  });

  if (error) {
    return {
      success: false,
      provider: providerResult.provider,
      providerResponse: providerResult.providerResponse,
      errorMessage: error.message,
      rawStatus: error.code,
    };
  }

  const result = normalizeRpcResult(data);

  return {
    success: true,
    provider: providerResult.provider,
    providerMessageId: providerResult.providerMessageId,
    providerResponse: providerResult.providerResponse,
    messageId: result.message_id ?? result.id,
    recipient: result.recipient,
    segments: Number(result.segments ?? providerResult.segments ?? 1),
    cost: Number(result.cost ?? providerResult.cost ?? providerResult.segments ?? 1),
    status: result.status ?? "sent",
    testMode: false,
    alreadyProcessed: result.already_processed ?? false,
  };
}

async function completeSmsSendFailed(
  supabaseAdmin: SupabaseClientInstance,
  attemptId: string,
  provider: string,
  providerResponse: unknown,
  errorCode: string,
): Promise<SmsProviderResult> {
  const safeErrorCode = normalizeProviderErrorCode(errorCode);
  const { data, error } = await supabaseAdmin.rpc("internal_complete_sms_send_failed", {
    p_attempt_id: attemptId,
    p_provider: provider,
    p_provider_response: sanitizeProviderResponse(providerResponse),
    p_error_message: mapProviderError(safeErrorCode),
  });

  if (error) {
    return {
      success: false,
      provider,
      providerResponse,
      errorMessage: error.message,
      rawStatus: error.code,
    };
  }

  const result = normalizeRpcResult(data);
  const completedAsSent = result.success === true || result.status === "sent";

  return {
    success: completedAsSent,
    provider,
    providerResponse,
    messageId: result.message_id ?? result.id,
    recipient: result.recipient,
    segments: Number(result.segments ?? 0),
    cost: Number(result.cost ?? 0),
    status: result.status ?? "failed",
    testMode: false,
    errorMessage: completedAsSent ? undefined : safeErrorCode,
    rawStatus: completedAsSent ? "DUPLICATE_SEND_ATTEMPT" : safeErrorCode,
  };
}

function getProviderMode(): SmsProviderMode {
  return Deno.env.get("SMS_PROVIDER_MODE") === "prod" ? "prod" : "test";
}

function getRealProviderConfig(): RealProviderConfig {
  return {
    apiUrl: normalizeBaseUrl(getEnv("SMS_PROVIDER_API_URL")),
    apiKey: getEnv("SMS_PROVIDER_API_KEY"),
    username: getEnv("SMS_PROVIDER_USERNAME"),
    password: getEnv("SMS_PROVIDER_PASSWORD"),
    senderId: getEnv("SMS_PROVIDER_SENDER_ID"),
    timeoutMs: Number(Deno.env.get("SMS_PROVIDER_TIMEOUT_MS") ?? 10000),
  };
}

function getEnv(name: string): string | null {
  const value = Deno.env.get(name)?.trim();
  return value || null;
}

function calculateSmsSegments(message: string): number {
  return Math.ceil(message.length / 160) || 1;
}

async function loginRealProvider(config: RealProviderConfig): Promise<{
  success: boolean;
  token?: string;
  providerResponse?: unknown;
  errorMessage?: string;
  rawStatus?: string;
}> {
  const form = new URLSearchParams();
  form.set("usuario", config.username ?? "");
  form.set("password", config.password ?? "");

  try {
    const response = await fetchWithTimeout(`${config.apiUrl}/v1/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    }, config.timeoutMs);

    const payload = await readProviderJson(response);

    if (!response.ok) {
      return {
        success: false,
        providerResponse: sanitizeProviderResponse(payload),
        errorMessage: "PROVIDER_AUTH_FAILED",
        rawStatus: String(response.status),
      };
    }

    const token = typeof payload.data?.["token"] === "string"
      ? normalizeProviderToken(payload.data["token"])
      : null;

    if (payload.code !== "0" || payload.message !== "OK" || !token) {
      return {
        success: false,
        providerResponse: sanitizeProviderResponse(payload),
        errorMessage: token ? "PROVIDER_AUTH_FAILED" : "PROVIDER_INVALID_RESPONSE",
        rawStatus: payload.code ?? "PROVIDER_AUTH_FAILED",
      };
    }

    return {
      success: true,
      token,
      providerResponse: { code: payload.code, message: payload.message },
      rawStatus: payload.code,
    };
  } catch (error) {
    return providerFetchError(error);
  }
}

async function sendRealProviderSms(
  request: SmsProviderRequest,
  config: RealProviderConfig,
  token: string,
): Promise<SmsProviderResult> {
  try {
    const response = await fetchWithTimeout(`${config.apiUrl}/v1/api/sms/individual`, {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        telefono: request.providerRecipient ?? normalizeProviderRecipient(request.recipient),
        mensaje: request.message,
      }),
    }, config.timeoutMs);

    const payload = await readProviderJson(response);
    const providerCode = typeof payload.data?.["codigo"] === "string" ? payload.data["codigo"] : null;
    const isSuccess = response.ok && payload.code === "0" && payload.message === "OK" && providerCode === "OK";

    if (!isSuccess) {
      return {
        success: false,
        provider: "fortuna_services",
        providerResponse: sanitizeProviderResponse(payload),
        errorMessage: "PROVIDER_REQUEST_FAILED",
        rawStatus: payload.code ?? String(response.status),
        recipient: request.recipient,
        segments: request.segments,
        cost: request.cost ?? request.segments,
        status: "failed",
        testMode: false,
      };
    }

    return {
      success: true,
      provider: "fortuna_services",
      providerResponse: sanitizeProviderResponse(payload),
      rawStatus: providerCode,
      recipient: request.recipient,
      segments: request.segments,
      cost: request.cost ?? request.segments,
      status: "sent",
      testMode: false,
    };
  } catch (error) {
    return {
      ...providerFetchError(error),
      provider: "fortuna_services",
      recipient: request.recipient,
      segments: request.segments,
      cost: request.cost ?? request.segments,
      status: "failed",
      testMode: false,
    };
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readProviderJson(response: Response): Promise<ProviderResponse> {
  try {
    const value = await response.json();
    return value && typeof value === "object" ? value as ProviderResponse : {};
  } catch {
    return {};
  }
}

function normalizeProviderToken(value: string): string {
  const token = value.trim();
  return token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`;
}

function normalizeProviderRecipient(value: string): string {
  return value.trim().replace(/^\+/, "");
}

function normalizeBaseUrl(value: string | null): string | null {
  return value ? value.replace(/\/+$/, "") : null;
}

function sanitizeProviderResponse(value: unknown): Record<string, unknown> {
  const sanitized = sanitizeProviderValue(value);
  return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
    ? sanitized as Record<string, unknown>
    : {};
}

function sanitizeProviderValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeProviderValue(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      const normalized = key.toLowerCase();
      if (
        normalized.includes("token")
        || normalized.includes("password")
        || normalized.includes("authorization")
        || normalized.includes("api_key")
        || normalized.includes("apikey")
        || normalized.includes("secret")
      ) {
        return [key, "[redacted]"];
      }

      return [key, sanitizeProviderValue(item)];
    }),
  );
}

function providerFetchError(error: unknown): {
  success: false;
  provider: string;
  providerResponse?: unknown;
  errorMessage: string;
  rawStatus: string;
} {
  const isTimeout = error instanceof DOMException && error.name === "AbortError";

  return {
    success: false,
    provider: "fortuna_services",
    errorMessage: isTimeout ? "PROVIDER_TIMEOUT" : "PROVIDER_REQUEST_FAILED",
    rawStatus: isTimeout ? "PROVIDER_TIMEOUT" : "PROVIDER_REQUEST_FAILED",
  };
}

function normalizeProviderErrorCode(message: string): string {
  const upperMessage = message.toUpperCase();
  const key = Object.keys(errorMessages).find((item) => upperMessage.includes(item));
  return key ?? upperMessage;
}

function mapProviderError(message: string): string {
  const key = normalizeProviderErrorCode(message);
  return errorMessages[key] ?? "No se pudo enviar el SMS.";
}

function getHttpStatusForError(message: string): number {
  const key = normalizeProviderErrorCode(message);

  if (key === "NOT_AUTHORIZED") return 401;
  if (key === "RATE_LIMIT_EXCEEDED") return 429;
  if (
    key === "SMS_SEND_ALREADY_PROCESSING"
    || key === "DUPLICATE_SEND_ATTEMPT"
    || key === "SMS_SEND_ALREADY_FAILED_USE_NEW_KEY"
  ) {
    return 409;
  }
  if (key === "PROVIDER_TIMEOUT") return 504;
  if (key.startsWith("PROVIDER_")) return 502;

  return 400;
}

function logSafe(message: string, payload: Record<string, unknown>): void {
  console.error(message, payload);
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
