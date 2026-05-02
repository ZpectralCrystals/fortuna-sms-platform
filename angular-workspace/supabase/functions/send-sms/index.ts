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

const errorMessages: Record<string, string> = {
  INVALID_PHONE: "Número inválido. Usa formato peruano +51XXXXXXXXX.",
  EMPTY_MESSAGE: "El mensaje no puede estar vacío.",
  INSUFFICIENT_CREDITS: "Créditos insuficientes.",
  PROFILE_INACTIVE: "Tu cuenta está inactiva.",
  PROFILE_NOT_FOUND: "Perfil no encontrado.",
  NOT_AUTHORIZED: "Sesión inválida.",
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

    const { data, error } = await supabaseAdmin.rpc("internal_send_sms_test", {
      p_user_id: authData.user.id,
      p_recipient: recipient,
      p_message: message,
    });

    if (error) {
      const mappedError = mapRpcError(error.message);
      console.error("send-sms RPC failed:", {
        code: error.code,
        mapped: mappedError,
      });

      return jsonResponse({ success: false, error: mappedError }, mappedError === errorMessages.NOT_AUTHORIZED ? 401 : 400);
    }

    const result = normalizeRpcResult(data);

    return jsonResponse({
      success: true,
      message_id: result.message_id ?? result.id ?? null,
      recipient: result.recipient ?? recipient,
      segments: Number(result.segments ?? 1),
      cost: Number(result.cost ?? result.segments ?? 1),
      status: result.status ?? "sent",
      test_mode: result.test_mode ?? true,
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

function mapRpcError(message: string): string {
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
