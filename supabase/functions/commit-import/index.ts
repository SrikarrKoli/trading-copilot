import { createClient } from "npm:@supabase/supabase-js@2.110.8";

const PERMANENT_OWNER_ID = "2d3ed39f-52f6-40df-8b65-820283a25e08";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { headers: jsonHeaders, status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
  }

  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer (.+)$/i)?.[1];

  if (!accessToken) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey =
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    console.error("commit-import is missing required server configuration");
    return jsonResponse({ ok: false, error: "service_unavailable" }, 503);
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(accessToken);

  if (
    userError ||
    !user ||
    user.is_anonymous ||
    user.id !== PERMANENT_OWNER_ID
  ) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_request" }, 400);
  }

  if (
    !isRecord(payload) ||
    typeof payload.original_filename !== "string" ||
    typeof payload.file_sha256 !== "string" ||
    typeof payload.file_size_bytes !== "number" ||
    typeof payload.source_type !== "string" ||
    !Array.isArray(payload.rows)
  ) {
    return jsonResponse({ ok: false, error: "invalid_request" }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await adminClient.rpc("commit_daily_import", {
    p_owner_id: user.id,
    p_original_filename: payload.original_filename,
    p_file_sha256: payload.file_sha256,
    p_file_size_bytes: payload.file_size_bytes,
    p_source_type: payload.source_type,
    p_market_data_timestamp:
      typeof payload.market_data_timestamp === "string"
        ? payload.market_data_timestamp
        : null,
    p_rows: payload.rows,
  });

  if (error) {
    console.error("commit_daily_import RPC failed", { code: error.code });
    return jsonResponse({ ok: false, error: "import_commit_failed" }, 500);
  }

  if (!isRecord(data)) {
    return jsonResponse({ ok: false, error: "import_commit_failed" }, 500);
  }
  return jsonResponse(data, data.ok === true ? 200 : 422);
});
