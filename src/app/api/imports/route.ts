import { NextResponse } from "next/server";

import { getOwnerEmail } from "@/lib/auth/config";
import type {
  ImportApiResult,
  ImportBoundaryResult,
  ImportCommitPayload,
} from "@/lib/import/commit-types";
import { prepareImportCommit } from "@/lib/import/server";
import type { Direction } from "@/lib/import/types";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

interface AuthenticatedOwner {
  accessToken: string;
  ownerId: string;
}

interface ImportRouteDependencies {
  authenticate: () => Promise<AuthenticatedOwner | null>;
  commit: (
    payload: ImportCommitPayload,
    accessToken: string,
  ) => Promise<ImportBoundaryResult>;
}

function errorResponse(error: string, status: number) {
  return NextResponse.json<ImportApiResult>({ ok: false, error }, { status });
}

async function authenticateOwner(): Promise<AuthenticatedOwner | null> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (
    claimsError ||
    !claims?.sub ||
    typeof claims.email !== "string" ||
    claims.email.toLowerCase() !== getOwnerEmail()
  ) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token || session.user.id !== claims.sub) {
    return null;
  }

  return { accessToken: session.access_token, ownerId: claims.sub };
}

async function commitThroughTrustedBoundary(
  payload: ImportCommitPayload,
  accessToken: string,
): Promise<ImportBoundaryResult> {
  const { publishableKey, url } = getSupabasePublicEnv();
  const response = await fetch(`${url}/functions/v1/commit-import`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  let result: ImportBoundaryResult | null = null;
  try {
    result = (await response.json()) as ImportBoundaryResult;
  } catch {
    // The browser receives only the safe error below.
  }

  if (!response.ok && !result) {
    throw new Error("trusted_import_boundary_unavailable");
  }

  return result ?? { ok: false, error: "import_commit_failed" };
}

export function createImportPostHandler(
  dependencies: ImportRouteDependencies,
) {
  return async function POST(request: Request) {
    const owner = await dependencies.authenticate();
    if (!owner) {
      return errorResponse("Sign in to approve this import.", 401);
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return errorResponse("The import request is not valid.", 400);
    }

    const file = formData.get("file");
    const direction = formData.get("direction");

    if (!(file instanceof File)) {
      return errorResponse("Choose a workbook before approving the import.", 400);
    }
    if (direction !== "bullish" && direction !== "bearish") {
      return errorResponse("Choose a bullish or bearish direction.", 400);
    }

    let payload: ImportCommitPayload;
    try {
      payload = await prepareImportCommit(file, direction as Direction);
    } catch (error) {
      return errorResponse(
        error instanceof Error
          ? error.message
          : "The workbook could not be validated.",
        422,
      );
    }

    let boundaryResult: ImportBoundaryResult;
    try {
      boundaryResult = await dependencies.commit(
        payload,
        owner.accessToken,
      );
    } catch {
      return errorResponse(
        "The import could not be saved. No success was recorded.",
        502,
      );
    }

    if (!boundaryResult.ok || !boundaryResult.batch_id) {
      return errorResponse(
        "The import failed safely and was not marked completed.",
        422,
      );
    }
    if (
      boundaryResult.duplicate_file === true &&
      boundaryResult.processing_status !== "completed"
    ) {
      return errorResponse(
        "An existing batch was found but is not completed. No success was reported.",
        409,
      );
    }

    const duplicateFile = boundaryResult.duplicate_file === true;
    const hasCounts =
      typeof boundaryResult.total_rows === "number" &&
      typeof boundaryResult.valid_rows === "number" &&
      typeof boundaryResult.invalid_rows === "number" &&
      typeof boundaryResult.duplicate_rows === "number";

    return NextResponse.json<ImportApiResult>({
      ok: true,
      batchId: boundaryResult.batch_id,
      duplicateFile,
      processingStatus: boundaryResult.processing_status ?? "unknown",
      counts: hasCounts
        ? {
            totalRows: boundaryResult.total_rows!,
            validRows: boundaryResult.valid_rows!,
            invalidRows: boundaryResult.invalid_rows!,
            duplicateRows: boundaryResult.duplicate_rows!,
          }
        : null,
      message: duplicateFile
        ? "This workbook was already imported. The existing batch was returned."
        : "Workbook imported successfully.",
    });
  };
}

export const POST = createImportPostHandler({
  authenticate: authenticateOwner,
  commit: commitThroughTrustedBoundary,
});
