import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendSmsBody {
  recipient?: string;
  message?: string;
}

interface RpcResult {
  message_id?: string;
  id?: string;
  recipient?: string;
  segments?: number;
  cost?: number;
  status?: string;
  test_mode?: boolean;
}

type SmsProviderMode = "test" | "prod";
type SupabaseClientInstance = ReturnType<typeof createClient>;

type SmsProviderRequest = {
  userId: string;
  recipient: string;
  message: string;
  segments: number;
};

type SmsProviderResult = {
  success: boolean;
  provider: string;
  providerMessageId?: string;
  providerResponse?: unknown;
  errorMessage?: string;
  rawStatus?: string;
  messageId?: string;
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
  PROVIDER_REQUEST_FAILED: "No se pudo conectar con el proveedor SMS.",
  PROVIDER_TIMEOUT: "El proveedor SMS no respondió a tiempo.",
  PROVIDER_INVALID_RESPONSE: "Respuesta inválida del proveedor SMS.",
};

Deno.serve(async (req: Request) => {
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
    };

    const providerMode = getProviderMode();
    const providerResult = providerMode === "prod"
      ? await sendWithRealProvider(providerRequest, getRealProviderConfig())
      : await sendWithTestProvider(supabaseAdmin, providerRequest);

    if (!providerResult.success) {
      const mappedError = mapProviderError(providerResult.errorMessage ?? providerResult.rawStatus ?? "");
      console.error("send-sms provider failed:", {
        provider: providerResult.provider,
        mode: providerMode,
        rawStatus: providerResult.rawStatus ?? null,
        mapped: mappedError,
      });

      return jsonResponse({ success: false, error: mappedError }, mappedError === errorMessages.NOT_AUTHORIZED ? 401 : 400);
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
    console.error("send-sms failed:", error instanceof Error ? error.name : "UnknownError");
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
  _request: SmsProviderRequest,
  config: RealProviderConfig,
): Promise<SmsProviderResult> {
  if (!config.apiUrl || (!config.apiKey && (!config.username || !config.password))) {
    return {
      success: false,
      provider: "real_provider",
      errorMessage: "PROVIDER_NOT_CONFIGURED",
      rawStatus: "PROVIDER_NOT_CONFIGURED",
    };
  }

  return {
    success: false,
    provider: "real_provider",
    errorMessage: "PROVIDER_NOT_CONFIGURED",
    rawStatus: "PROVIDER_NOT_CONFIGURED",
  };
}

function getProviderMode(): SmsProviderMode {
  return Deno.env.get("SMS_PROVIDER_MODE") === "prod" ? "prod" : "test";
}

function getRealProviderConfig(): RealProviderConfig {
  return {
    apiUrl: getEnv("SMS_PROVIDER_API_URL"),
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

function mapProviderError(message: string): string {
  const upperMessage = message.toUpperCase();
  const key = Object.keys(errorMessages).find((item) => upperMessage.includes(item));

  return key ? errorMessages[key] : "No se pudo enviar el SMS.";
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
