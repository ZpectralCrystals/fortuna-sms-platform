type ProviderMode = "test" | "prod";

type ProviderResponse = {
  data?: Record<string, unknown>;
  code?: string;
  message?: string;
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
  requestId: string;
};

export type SmsProviderAdapterResult = {
  success: boolean;
  status: "sent" | "failed";
  provider: string;
  provider_message_id?: string;
  provider_response?: Record<string, unknown>;
  error?: string;
};

const PROVIDER_NAME = "fortuna_services";

export async function sendSmsViaProviderAdapter(
  request: SmsProviderAdapterRequest,
): Promise<SmsProviderAdapterResult> {
  // TODO: reemplazar por adapter X-Internal-Token cuando backend externo entregue endpoints internos.
  if (getProviderMode() !== "prod") {
    return {
      success: true,
      status: "sent",
      provider: "internal_test",
      provider_message_id: `test_${request.requestId}`,
      provider_response: {
        test_mode: true,
        adapter: "current",
        request_id: request.requestId,
      },
    };
  }

  const config = getProviderConfig();
  if (!config.apiUrl || !config.username || !config.password) {
    return providerFailed("PROVIDER_NOT_CONFIGURED");
  }

  const login = await loginProviderCurrent(config);
  if (!login.success || !login.token) {
    return providerFailed(
      login.error ?? "PROVIDER_AUTH_FAILED",
      login.provider_response,
    );
  }

  return await sendProviderCurrentSms(request, config, login.token);
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
    const token = typeof payload.data?.["token"] === "string"
      ? normalizeProviderToken(payload.data["token"])
      : null;

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

async function sendProviderCurrentSms(
  request: SmsProviderAdapterRequest,
  config: ProviderConfig,
  token: string,
): Promise<SmsProviderAdapterResult> {
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
    const success = response.ok && payload.code === "0" && payload.message === "OK" && providerCode === "OK";

    if (!success) {
      return providerFailed(
        payload.code ?? String(response.status) ?? "PROVIDER_REQUEST_FAILED",
        payload,
      );
    }

    return {
      success: true,
      status: "sent",
      provider: PROVIDER_NAME,
      provider_response: sanitizeProviderResponse(payload),
    };
  } catch (error) {
    return providerFailed(
      isTimeoutError(error) ? "PROVIDER_TIMEOUT" : "PROVIDER_REQUEST_FAILED",
    );
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
    PROVIDER_NOT_CONFIGURED: "Proveedor SMS real aún no configurado.",
    PROVIDER_AUTH_FAILED: "No se pudo autenticar con el proveedor SMS.",
    PROVIDER_REQUEST_FAILED: "No se pudo conectar con el proveedor SMS.",
    PROVIDER_TIMEOUT: "El proveedor SMS no respondió a tiempo.",
    PROVIDER_INVALID_RESPONSE: "Respuesta inválida del proveedor SMS.",
    PROVIDER_ERROR: "No se pudo conectar con el proveedor SMS.",
  };

  return messages[normalized] ?? "No se pudo enviar el SMS.";
}

export function normalizeProviderErrorCode(value: string): string {
  const upper = value.toUpperCase();
  const keys = [
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

function getProviderMode(): ProviderMode {
  return Deno.env.get("SMS_PROVIDER_MODE") === "prod" ? "prod" : "test";
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
  const token = value.trim();
  return token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`;
}

function normalizeProviderRecipient(value: string): string {
  return value.trim().replace(/^\+/, "");
}

function normalizeBaseUrl(value: string | null): string | null {
  return value ? value.replace(/\/+$/, "") : null;
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

function isTimeoutError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
