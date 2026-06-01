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

interface Body {
  recipients?: string[];
  message?: string;
  messages?: MessageInput[];
  idempotency_key?: string;
}

interface MessageInput {
  recipient?: string;
  message?: string;
}

interface BatchItem {
  recipient: string;
  message: string;
  segments: number;
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
  message_id?: string;
  company_id?: string;
  ruc?: string;
  recipient?: string;
  segments?: number;
  cost?: number;
  balance_after?: number;
  status?: string;
}

interface ItemResult {
  recipient: string;
  success: boolean;
  message_id?: string | null;
  status?: string;
  segments?: number;
  cost?: number;
  balance_after?: number | null;
  error?: string;
  error_code?: string;
  error_message?: string;
  provider_message?: string | null;
}

const MAX_SMS_MESSAGE_LENGTH = 918;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed", error_code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ success: false, error: "Edge Function no configurada.", error_code: "FUNCTION_NOT_CONFIGURED" }, 500);
    }

    const token = getBearerToken(req.headers.get("Authorization"));
    if (!token) {
      return jsonResponse({ success: false, error: "Sesión inválida.", error_code: "NOT_AUTHORIZED" }, 401);
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return jsonResponse({ success: false, error: "Sesión inválida.", error_code: "NOT_AUTHORIZED" }, 401);
    }

    const body = await readBody(req);
    const batch = buildBatchItems(body);
    if (!batch.items.length) {
      return jsonResponse({ success: false, error: "No hay mensajes válidos.", error_code: batch.error_code ?? "INVALID_PHONE" }, 422);
    }
    if (batch.items.length > 50) {
      return jsonResponse({ success: false, error: "Máximo 50 destinatarios por lote.", error_code: "BATCH_LIMIT_EXCEEDED" }, 422);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }) as unknown as AnySupabaseClient;

    const batchKey = body.idempotency_key?.trim() || req.headers.get("Idempotency-Key")?.trim() || crypto.randomUUID();
    if (!isValidBatchIdempotencyKey(batchKey)) {
      return jsonResponse({ success: false, error: "Idempotency-Key inválido.", error_code: "INVALID_IDEMPOTENCY_KEY" }, 409);
    }

    const company = await getUserCompany(supabaseAdmin, authData.user.id);
    const requiredCredits = batch.items.reduce((total, item) => total + item.segments, 0);
    const currentBalance = Number(company.balance ?? 0);
    if (Number.isFinite(currentBalance) && currentBalance < requiredCredits) {
      return jsonResponse({
        success: false,
        error: "Saldo insuficiente.",
        error_code: "INSUFFICIENT_CREDITS",
        required_credits: requiredCredits,
        balance: currentBalance,
      }, 409);
    }

    const results: ItemResult[] = [];

    for (const [index, item] of batch.items.entries()) {
      const itemKey = `${batchKey.slice(0, 80)}_${index}_${item.recipient.replace(/[^0-9]/g, "")}`;
      results.push(await sendOne(supabaseAdmin, authData.user.id, item.recipient, item.message, itemKey));
    }

    const sent = results.filter((result) => result.success).length;
    const failed = results.length - sent;

    return jsonResponse({
      success: failed === 0,
      status: failed === 0 ? "sent" : sent > 0 ? "partial_success" : "failed",
      total: results.length,
      sent,
      failed,
      required_credits: requiredCredits,
      invalid: batch.invalid,
      duplicates_removed: batch.duplicates,
      results,
    });
  } catch (error) {
    const code = normalizeRpcError(error instanceof Error ? error.message : String(error));
    return jsonResponse({ success: false, error_code: code, error: publicErrorMessage(code) }, getHttpStatusForError(code));
  }
});

async function sendOne(
  supabaseAdmin: AnySupabaseClient,
  userId: string,
  recipient: string,
  message: string,
  idempotencyKey: string,
): Promise<ItemResult> {
  try {
    const begin = await beginCompanyAttempt(supabaseAdmin, userId, idempotencyKey, recipient, message);
    if (!begin.success || !begin.attempt_id || !begin.ruc) {
      throw new Error("SMS_ATTEMPT_NOT_CREATED");
    }

    if (begin.already_processed) {
      return {
        recipient,
        success: true,
        message_id: begin.message_id ?? null,
        status: begin.status ?? "sent",
        segments: Number(begin.segments ?? 1),
        cost: Number(begin.cost ?? begin.segments ?? 1),
        balance_after: begin.balance_after ?? null,
      };
    }

    const provider = await sendIndividualSms(
      begin.ruc,
      begin.provider_recipient ?? begin.recipient ?? recipient,
      message,
      begin.attempt_id,
    );

    if (!provider.success) {
      const errorCode = provider.error ?? "PROVIDER_REQUEST_FAILED";
      await completeCompanyAttemptFailed(supabaseAdmin, begin.attempt_id, provider.provider, provider.provider_response, errorCode);
      const providerMessage = readProviderErrorMessage(provider.provider_response);
      const publicMessage = providerMessage
        ? `Proveedor rechazó el SMS: ${providerMessage}`
        : mapProviderError(errorCode);
      return {
        recipient,
        success: false,
        error_code: normalizeProviderErrorCode(errorCode),
        error: publicMessage,
        error_message: publicMessage,
        provider_message: providerMessage,
      };
    }

    let complete: CompleteAttemptResult;
    try {
      complete = await completeCompanyAttemptSuccess(
        supabaseAdmin,
        begin.attempt_id,
        provider.provider,
        provider.provider_message_id ?? null,
        provider.provider_response,
      );
    } catch (completeError) {
      console.warn("send-sms-batch provider success local completion failed", sanitizeProviderResponse({
        user_id: userId,
        attempt_id: begin.attempt_id,
        recipient,
        provider: provider.provider,
        provider_message_id: provider.provider_message_id ?? null,
        completion_error: completeError instanceof Error ? completeError.message : String(completeError),
        reconciliation_required: true,
      }));

      return {
        recipient,
        success: false,
        error_code: "PROVIDER_SENT_LOCAL_COMPLETION_FAILED",
        error: "SMS enviado por proveedor, pero requiere conciliación local.",
      };
    }

    return {
      recipient,
      success: true,
      message_id: complete.message_id ?? provider.provider_message_id ?? null,
      status: complete.status ?? "sent",
      segments: Number(complete.segments ?? begin.segments ?? 1),
      cost: Number(complete.cost ?? complete.segments ?? begin.cost ?? begin.segments ?? 1),
      balance_after: complete.balance_after ?? null,
    };
  } catch (error) {
    const code = normalizeRpcError(error instanceof Error ? error.message : String(error));
    return {
      recipient,
      success: false,
      error_code: code,
      error: publicErrorMessage(code),
    };
  }
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
): Promise<void> {
  const { error } = await rpcUntyped(supabaseAdmin, "internal_complete_company_sms_send_failed", {
    p_attempt_id: attemptId,
    p_provider: provider,
    p_provider_response: sanitizeProviderResponse(providerResponse),
    p_error_message: normalizeProviderErrorCode(errorCode),
  });

  if (error) throw new Error(error.message);
}

async function getUserCompany(supabaseAdmin: AnySupabaseClient, userId: string): Promise<Record<string, unknown>> {
  const { data, error } = await rpcUntyped(supabaseAdmin, "internal_get_user_company", {
    p_user_id: userId,
  });

  if (error) throw new Error(error.message);
  return normalizeRpcResult(data);
}

function buildBatchItems(body: Body): {
  items: BatchItem[];
  invalid: string[];
  duplicates: string[];
  error_code?: string;
} {
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    return normalizeMessageItems(body.messages);
  }

  const message = sanitizeSmsMessage(body.message ?? "");
  if (!message) {
    return { items: [], invalid: [], duplicates: [], error_code: "EMPTY_MESSAGE" };
  }

  const normalized = normalizeRecipients(body.recipients ?? []);
  return {
    items: normalized.valid.map((recipient) => ({
      recipient,
      message,
      segments: calculateSegments(message),
    })),
    invalid: normalized.invalid,
    duplicates: normalized.duplicates,
    error_code: normalized.valid.length ? undefined : "INVALID_PHONE",
  };
}

function normalizeMessageItems(values: MessageInput[]): {
  items: BatchItem[];
  invalid: string[];
  duplicates: string[];
  error_code?: string;
} {
  const seen = new Set<string>();
  const items: BatchItem[] = [];
  const invalid: string[] = [];
  const duplicates: string[] = [];
  let emptyMessages = 0;

  for (const [index, value] of values.entries()) {
    const rawRecipient = String(value?.recipient ?? "");
    const normalized = normalizePhone(rawRecipient);
    const message = providerSafeSmsText(String(value?.message ?? ""));

    if (!normalized) {
      invalid.push(rawRecipient || "(vacío)");
      continue;
    }

    if (!message) {
      console.warn("send-sms-batch empty sanitized message", sanitizeProviderResponse({
        row_index: index,
        recipient: normalized,
        reason: "empty_message_after_sanitize",
      }));
      invalid.push(normalized);
      emptyMessages += 1;
      continue;
    }

    if (seen.has(normalized)) {
      duplicates.push(normalized);
      continue;
    }

    seen.add(normalized);
    items.push({
      recipient: normalized,
      message,
      segments: calculateSegments(message),
    });
  }

  return {
    items,
    invalid,
    duplicates,
    error_code: items.length ? undefined : emptyMessages > 0 ? "EMPTY_MESSAGE" : "INVALID_PHONE",
  };
}

function normalizeRecipients(values: string[]): { valid: string[]; invalid: string[]; duplicates: string[] } {
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  const duplicates: string[] = [];

  for (const value of values) {
    const normalized = normalizePhone(String(value ?? ""));
    if (!normalized) {
      invalid.push(String(value ?? ""));
      continue;
    }
    if (seen.has(normalized)) {
      duplicates.push(normalized);
      continue;
    }
    seen.add(normalized);
    valid.push(normalized);
  }

  return { valid, invalid, duplicates };
}

function calculateSegments(message: string): number {
  return Math.ceil(message.length / 160) || 1;
}

function sanitizeSmsMessage(value: unknown): string {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SMS_MESSAGE_LENGTH);
}

function providerSafeSmsText(text: string): string {
  return sanitizeSmsMessage(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N")
    .replace(/[^A-Za-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SMS_MESSAGE_LENGTH);
}

function readProviderErrorMessage(value: unknown): string | null {
  const payload = sanitizeProviderResponse(value);
  const direct = readString(payload["message"]) ?? readString(payload["mensaje"]) ?? readString(payload["error"]);
  if (direct) return direct;

  const data = payload["data"];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const row = data as Record<string, unknown>;
    return readString(row["message"]) ?? readString(row["mensaje"]) ?? readString(row["error"]);
  }

  return null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizePhone(value: string): string | null {
  const clean = value.trim().replace(/[^\d+]/g, "");
  if (/^9\d{8}$/.test(clean)) return `+51${clean}`;
  if (/^519\d{8}$/.test(clean)) return `+${clean}`;
  if (/^\+519\d{8}$/.test(clean)) return clean;
  return null;
}

function isValidBatchIdempotencyKey(value: string): boolean {
  return /^[A-Za-z0-9_.-]{8,120}$/.test(value);
}

function getBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim() || null;
}

async function readBody(req: Request): Promise<Body> {
  try {
    return await req.json() as Body;
  } catch {
    return {};
  }
}

function normalizeRpcResult(data: unknown): Record<string, unknown> {
  if (Array.isArray(data)) return normalizeRpcResult(data[0]);
  return data && typeof data === "object" ? data as Record<string, unknown> : {};
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
    "BATCH_LIMIT_EXCEEDED",
    "SMS_ATTEMPT_NOT_CREATED",
  ];

  return known.find((code) => upper.includes(code)) ?? "UNKNOWN_ERROR";
}

function publicErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    NOT_AUTHORIZED: "Sesión inválida.",
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
    BATCH_LIMIT_EXCEEDED: "Máximo 50 destinatarios por lote.",
    SMS_ATTEMPT_NOT_CREATED: "No se pudo preparar el intento de envío.",
  };

  return messages[normalizeProviderErrorCode(code)] ?? messages[code] ?? "No se pudo completar el envío.";
}

function getHttpStatusForError(code: string): number {
  const normalized = normalizeProviderErrorCode(code);
  if (normalized.includes("NOT_AUTHORIZED")) return 401;
  if (normalized.includes("COMPANY")) return 403;
  if (normalized.includes("INSUFFICIENT") || normalized.includes("IDEMPOTENCY") || normalized.includes("RATE_LIMIT")) return 409;
  if (normalized.includes("INVALID_PHONE") || normalized.includes("EMPTY_MESSAGE") || normalized.includes("INVALID_RUC") || normalized.includes("BATCH_LIMIT")) return 422;
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
