type ProviderMode = "mock" | "production";

type ProviderResponse = {
  data?: Record<string, unknown>;
  code?: string;
  message?: string;
  [key: string]: unknown;
};

type ProviderConfig = {
  apiUrl: string | null;
  username: string | null;
  password: string | null;
  timeoutMs: number;
};

export type SmsProviderAdapterRequest = {
  recipient: string;
  providerRecipient?: string;
  message: string;
  segments: number;
  cost: number;
  requestId?: string;
  ruc?: string;
};

export type SmsProviderAdapterResult = {
  success: boolean;
  status: "sent" | "failed";
  provider: string;
  provider_message_id?: string;
  provider_response?: Record<string, unknown>;
  error?: string;
  external_balance?: number | null;
};

export type ProviderBalanceResult = {
  success: boolean;
  provider: string;
  provider_response?: Record<string, unknown>;
  error?: string;
  external_balance?: number | null;
};

export type ProviderApiKeyResult = {
  success: boolean;
  provider: string;
  provider_response?: Record<string, unknown>;
  error?: string;
};

const PROVIDER_NAME = "fortuna_services";
const MOCK_PROVIDER_NAME = "mock_fortuna_services";

export async function sendSmsViaProviderAdapter(
  request: SmsProviderAdapterRequest,
): Promise<SmsProviderAdapterResult> {
  if (!request.ruc) {
    return providerFailed("PROVIDER_RUC_REQUIRED");
  }

  return await sendIndividualSms(request.ruc, request.providerRecipient ?? request.recipient, request.message, request.requestId);
}

export async function sendIndividualSms(
  ruc: string,
  telefono: string,
  mensaje: string,
  requestId?: string,
): Promise<SmsProviderAdapterResult> {
  const resolvedRequestId = requestId?.trim() || crypto.randomUUID();
  const cleanRuc = normalizeRuc(ruc);
  if (!cleanRuc) {
    return providerFailed("INVALID_RUC");
  }

  if (getProviderMode() !== "production") {
    return {
      success: true,
      status: "sent",
      provider: MOCK_PROVIDER_NAME,
      provider_message_id: `mock_${resolvedRequestId}`,
      provider_response: {
        test_mode: true,
        adapter: "current",
        endpoint: `/v1/api/sms/individual/${cleanRuc}`,
        request_id: resolvedRequestId,
      },
    };
  }

  const session = await createProviderSession();
  if (!session.success || !session.config || !session.token) {
    return providerFailed(session.error ?? "PROVIDER_AUTH_FAILED", session.provider_response);
  }

  try {
    const response = await fetchWithTimeout(`${session.config.apiUrl}/v1/api/sms/individual/${cleanRuc}`, {
      method: "POST",
      headers: {
        Authorization: authorizationHeader(session.token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        telefono: normalizeProviderRecipient(telefono),
        mensaje,
      }),
    }, session.config.timeoutMs);

    const payload = await readProviderJson(response);
    const providerCode = readString(payload.data?.codigo);
    const success = response.ok && payload.code === "0" && payload.message === "OK" && providerCode === "OK";

    if (!success) {
      return providerFailed(payload.code ?? String(response.status) ?? "PROVIDER_REQUEST_FAILED", payload);
    }

    return {
      success: true,
      status: "sent",
      provider: PROVIDER_NAME,
      provider_message_id: readString(payload.data?.id) ?? readString(payload.data?.message_id) ?? undefined,
      provider_response: sanitizeProviderResponse(payload),
    };
  } catch (error) {
    return providerFailed(isTimeoutError(error) ? "PROVIDER_TIMEOUT" : "PROVIDER_REQUEST_FAILED");
  }
}

export async function registerProviderBalance(recarga: number): Promise<ProviderBalanceResult> {
  if (!Number.isFinite(recarga) || recarga <= 0) {
    return balanceFailed("INVALID_PROVIDER_RECHARGE");
  }

  if (getProviderMode() !== "production") {
    return {
      success: true,
      provider: MOCK_PROVIDER_NAME,
      provider_response: { test_mode: true, endpoint: "/v1/api/sms/registrar/proveedor", recarga },
    };
  }

  const session = await createProviderSession();
  if (!session.success || !session.config || !session.token) {
    return balanceFailed(session.error ?? "PROVIDER_AUTH_FAILED", session.provider_response);
  }

  return await postProviderJson(session.config, session.token, "/v1/api/sms/registrar/proveedor", { recarga });
}

export async function getProviderBalance(): Promise<ProviderBalanceResult> {
  if (getProviderMode() !== "production") {
    return {
      success: true,
      provider: MOCK_PROVIDER_NAME,
      external_balance: 0,
      provider_response: { test_mode: true, endpoint: "/v1/api/sms/consultar/proveedor" },
    };
  }

  const session = await createProviderSession();
  if (!session.success || !session.config || !session.token) {
    return balanceFailed(session.error ?? "PROVIDER_AUTH_FAILED", session.provider_response);
  }

  return await getProviderJson(session.config, session.token, "/v1/api/sms/consultar/proveedor");
}

export async function registerClientBalance(ruc: string, recarga: number): Promise<ProviderBalanceResult> {
  const cleanRuc = normalizeRuc(ruc);
  if (!cleanRuc) {
    return balanceFailed("INVALID_RUC");
  }

  if (!Number.isFinite(recarga) || recarga <= 0) {
    return balanceFailed("INVALID_CLIENT_RECHARGE");
  }

  if (getProviderMode() !== "production") {
    return {
      success: true,
      provider: MOCK_PROVIDER_NAME,
      provider_response: { test_mode: true, endpoint: "/v1/api/sms/registrar/saldo", ruc: cleanRuc, recarga },
    };
  }

  const session = await createProviderSession();
  if (!session.success || !session.config || !session.token) {
    return balanceFailed(session.error ?? "PROVIDER_AUTH_FAILED", session.provider_response);
  }

  return await postProviderJson(session.config, session.token, "/v1/api/sms/registrar/saldo", {
    ruc: cleanRuc,
    recarga,
  });
}

export async function getClientBalance(ruc: string): Promise<ProviderBalanceResult> {
  const cleanRuc = normalizeRuc(ruc);
  if (!cleanRuc) {
    return balanceFailed("INVALID_RUC");
  }

  if (getProviderMode() !== "production") {
    return {
      success: true,
      provider: MOCK_PROVIDER_NAME,
      external_balance: 0,
      provider_response: { test_mode: true, endpoint: `/v1/api/sms/consultar/saldo/${cleanRuc}` },
    };
  }

  const session = await createProviderSession();
  if (!session.success || !session.config || !session.token) {
    return balanceFailed(session.error ?? "PROVIDER_AUTH_FAILED", session.provider_response);
  }

  return await getProviderJson(session.config, session.token, `/v1/api/sms/consultar/saldo/${cleanRuc}`);
}

export async function registerApiKey(ruc: string, nombre: string): Promise<ProviderApiKeyResult> {
  const cleanRuc = normalizeRuc(ruc);
  const cleanName = readString(nombre);
  if (!cleanRuc) {
    return apiKeyFailed("INVALID_RUC");
  }
  if (!cleanName) {
    return apiKeyFailed("API_KEY_NAME_REQUIRED");
  }

  const endpoint = "/v1/api/sms/registrar/apikey";
  if (getProviderMode() !== "production") {
    return {
      success: true,
      provider: MOCK_PROVIDER_NAME,
      provider_response: { test_mode: true, endpoint, ruc: cleanRuc, nombre: cleanName },
    };
  }

  const session = await createProviderSession();
  if (!session.success || !session.config || !session.token) {
    return apiKeyFailed(session.error ?? "PROVIDER_AUTH_FAILED", session.provider_response);
  }

  return await postProviderJson(session.config, session.token, endpoint, { ruc: cleanRuc, nombre: cleanName });
}

export async function deleteApiKey(
  ruc: string,
  params: { nombre?: string; id?: string },
): Promise<ProviderApiKeyResult> {
  const cleanRuc = normalizeRuc(ruc);
  const cleanName = readString(params.nombre ?? "");
  const cleanId = readString(params.id ?? "");
  if (!cleanRuc) {
    return apiKeyFailed("INVALID_RUC");
  }
  if (!cleanName && !cleanId) {
    return apiKeyFailed("API_KEY_IDENTIFIER_REQUIRED");
  }

  const endpoint = "/v1/api/sms/eliminar/apikey";
  const body: Record<string, unknown> = { ruc: cleanRuc };
  if (cleanName) body["nombre"] = cleanName;
  if (cleanId) body["id"] = cleanId;

  if (getProviderMode() !== "production") {
    return {
      success: true,
      provider: MOCK_PROVIDER_NAME,
      provider_response: { test_mode: true, endpoint, ...body },
    };
  }

  const session = await createProviderSession();
  if (!session.success || !session.config || !session.token) {
    return apiKeyFailed(session.error ?? "PROVIDER_AUTH_FAILED", session.provider_response);
  }

  return await postProviderJson(session.config, session.token, endpoint, body);
}

export async function getApiKey(ruc: string): Promise<ProviderApiKeyResult> {
  const cleanRuc = normalizeRuc(ruc);
  if (!cleanRuc) {
    return apiKeyFailed("INVALID_RUC");
  }

  const endpoint = `/v1/api/sms/consultar/apikey?ruc=${encodeURIComponent(cleanRuc)}`;
  if (getProviderMode() !== "production") {
    return {
      success: true,
      provider: MOCK_PROVIDER_NAME,
      provider_response: { test_mode: true, endpoint, ruc: cleanRuc },
    };
  }

  const session = await createProviderSession();
  if (!session.success || !session.config || !session.token) {
    return apiKeyFailed(session.error ?? "PROVIDER_AUTH_FAILED", session.provider_response);
  }

  return await getProviderJson(session.config, session.token, endpoint);
}

export async function listApiKeys(): Promise<ProviderApiKeyResult> {
  const endpoint = "/v1/api/sms/listar/apikey";
  if (getProviderMode() !== "production") {
    return {
      success: true,
      provider: MOCK_PROVIDER_NAME,
      provider_response: { test_mode: true, endpoint, data: [] },
    };
  }

  const session = await createProviderSession();
  if (!session.success || !session.config || !session.token) {
    return apiKeyFailed(session.error ?? "PROVIDER_AUTH_FAILED", session.provider_response);
  }

  return await getProviderJson(session.config, session.token, endpoint);
}

async function createProviderSession(): Promise<{
  success: boolean;
  config?: ProviderConfig;
  token?: string;
  provider_response?: Record<string, unknown>;
  error?: string;
}> {
  const config = getProviderConfig();
  if (!config.apiUrl || !config.username || !config.password) {
    return { success: false, error: "PROVIDER_NOT_CONFIGURED" };
  }

  const login = await loginProviderCurrent(config);
  if (!login.success || !login.token) {
    return {
      success: false,
      error: login.error ?? "PROVIDER_AUTH_FAILED",
      provider_response: login.provider_response,
    };
  }

  return { success: true, config, token: login.token };
}

async function loginProviderCurrent(config: ProviderConfig): Promise<{
  success: boolean;
  token?: string;
  provider_response?: Record<string, unknown>;
  error?: string;
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
    const token = readString(payload.data?.token) ? normalizeProviderToken(readString(payload.data?.token) ?? "") : null;

    if (!response.ok || payload.code !== "0" || payload.message !== "OK" || !token) {
      return {
        success: false,
        provider_response: sanitizeProviderResponse(payload),
        error: token ? "PROVIDER_AUTH_FAILED" : "PROVIDER_INVALID_RESPONSE",
      };
    }

    return {
      success: true,
      token,
      provider_response: { code: payload.code, message: payload.message },
    };
  } catch (error) {
    return {
      success: false,
      error: isTimeoutError(error) ? "PROVIDER_TIMEOUT" : "PROVIDER_REQUEST_FAILED",
    };
  }
}

async function postProviderJson(
  config: ProviderConfig,
  token: string,
  path: string,
  body: Record<string, unknown>,
): Promise<ProviderBalanceResult> {
  try {
    const response = await fetchWithTimeout(`${config.apiUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: authorizationHeader(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }, config.timeoutMs);

    const payload = await readProviderJson(response);
    if (!isProviderOk(response, payload)) {
      return balanceFailed(payload.code ?? String(response.status) ?? "PROVIDER_REQUEST_FAILED", payload);
    }

    return {
      success: true,
      provider: PROVIDER_NAME,
      provider_response: sanitizeProviderResponse(payload),
      external_balance: extractExternalBalance(payload),
    };
  } catch (error) {
    return balanceFailed(isTimeoutError(error) ? "PROVIDER_TIMEOUT" : "PROVIDER_REQUEST_FAILED");
  }
}

async function getProviderJson(
  config: ProviderConfig,
  token: string,
  path: string,
): Promise<ProviderBalanceResult> {
  try {
    const response = await fetchWithTimeout(`${config.apiUrl}${path}`, {
      method: "GET",
      headers: {
        Authorization: authorizationHeader(token),
      },
    }, config.timeoutMs);

    const payload = await readProviderJson(response);
    if (!isProviderOk(response, payload)) {
      return balanceFailed(payload.code ?? String(response.status) ?? "PROVIDER_REQUEST_FAILED", payload);
    }

    return {
      success: true,
      provider: PROVIDER_NAME,
      provider_response: sanitizeProviderResponse(payload),
      external_balance: extractExternalBalance(payload),
    };
  } catch (error) {
    return balanceFailed(isTimeoutError(error) ? "PROVIDER_TIMEOUT" : "PROVIDER_REQUEST_FAILED");
  }
}

export function sanitizeProviderResponse(value: unknown): Record<string, unknown> {
  const sanitized = sanitizeProviderValue(value);
  return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
    ? sanitized as Record<string, unknown>
    : {};
}

export function mapProviderError(code: string): string {
  const normalized = normalizeProviderErrorCode(code);

  const messages: Record<string, string> = {
    INVALID_RUC: "RUC inválido.",
    PROVIDER_RUC_REQUIRED: "RUC requerido para enviar SMS.",
    PROVIDER_NOT_CONFIGURED: "Proveedor SMS real aún no configurado.",
    PROVIDER_AUTH_FAILED: "No se pudo autenticar con el proveedor SMS.",
    PROVIDER_REQUEST_FAILED: "No se pudo conectar con el proveedor SMS.",
    PROVIDER_TIMEOUT: "El proveedor SMS no respondió a tiempo.",
    PROVIDER_INVALID_RESPONSE: "Respuesta inválida del proveedor SMS.",
    PROVIDER_ERROR: "No se pudo conectar con el proveedor SMS.",
  };

  return messages[normalized] ?? "No se pudo completar la operación SMS.";
}

export function normalizeProviderErrorCode(value: string): string {
  const upper = value.toUpperCase();
  const keys = [
    "INVALID_RUC",
    "PROVIDER_RUC_REQUIRED",
    "PROVIDER_NOT_CONFIGURED",
    "PROVIDER_AUTH_FAILED",
    "PROVIDER_REQUEST_FAILED",
    "PROVIDER_TIMEOUT",
    "PROVIDER_INVALID_RESPONSE",
    "PROVIDER_ERROR",
  ];

  return keys.find((key) => upper.includes(key)) ?? upper;
}

function providerFailed(error: string, response?: unknown): SmsProviderAdapterResult {
  return {
    success: false,
    status: "failed",
    provider: PROVIDER_NAME,
    provider_response: sanitizeProviderResponse(response ?? { code: error }),
    error: normalizeProviderErrorCode(error),
  };
}

function balanceFailed(error: string, response?: unknown): ProviderBalanceResult {
  return {
    success: false,
    provider: PROVIDER_NAME,
    provider_response: sanitizeProviderResponse(response ?? { code: error }),
    error: normalizeProviderErrorCode(error),
    external_balance: null,
  };
}

function apiKeyFailed(error: string, response?: unknown): ProviderApiKeyResult {
  return {
    success: false,
    provider: PROVIDER_NAME,
    provider_response: sanitizeProviderResponse(response ?? { code: error }),
    error: normalizeProviderErrorCode(error),
  };
}

function getProviderMode(): ProviderMode {
  const mode = Deno.env.get("SMS_PROVIDER_MODE")?.trim().toLowerCase();
  return mode === "production" ? "production" : "mock";
}

function getProviderConfig(): ProviderConfig {
  return {
    apiUrl: normalizeBaseUrl(getEnv("SMS_PROVIDER_API_URL")),
    username: getEnv("SMS_PROVIDER_USERNAME"),
    password: getEnv("SMS_PROVIDER_PASSWORD"),
    timeoutMs: Number(Deno.env.get("SMS_PROVIDER_TIMEOUT_MS") ?? 10000),
  };
}

function getEnv(name: string): string | null {
  const value = Deno.env.get(name)?.trim();
  return value || null;
}

function normalizeProviderToken(value: string): string {
  return value.trim().replace(/^bearer\s+/i, "");
}

function authorizationHeader(token: string): string {
  return `Bearer ${normalizeProviderToken(token)}`;
}

function normalizeProviderRecipient(value: string): string {
  return value.trim().replace(/^\+/, "");
}

function normalizeBaseUrl(value: string | null): string | null {
  return value ? value.replace(/\/+$/, "") : null;
}

function normalizeRuc(value: string): string | null {
  const ruc = value.trim();
  return /^[0-9]{11}$/.test(ruc) ? ruc : null;
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

function isProviderOk(response: Response, payload: ProviderResponse): boolean {
  return response.ok && payload.code === "0" && payload.message === "OK";
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractExternalBalance(payload: ProviderResponse): number | null {
  const data = payload.data ?? {};
  const raw = data.saldo ?? data.balance ?? data.creditos ?? data.credits ?? payload.saldo ?? payload.balance;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
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
        normalized === "authorization"
        || normalized === "token"
        || normalized === "bearer"
        || normalized === "password"
        || normalized === "apikey"
        || normalized === "api_key"
        || normalized === "x-api-key"
        || normalized === "service_role"
        || normalized === "access_token"
        || normalized === "refresh_token"
        || normalized.includes("token")
        || normalized.includes("password")
        || normalized.includes("secret")
      ) {
        return [key, "[redacted]"];
      }

      return [key, sanitizeProviderValue(item)];
    }),
  );
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
