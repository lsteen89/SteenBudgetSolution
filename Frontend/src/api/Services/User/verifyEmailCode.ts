import type { ApiEnvelope } from "@/api/api.types";
import type { AuthResult } from "@/api/auth.types";
import { api } from "@/api/axios";
import { unwrapEnvelopeData } from "@/api/envelope";
import { toApiProblem } from "@/api/toApiProblem";
import { isAxiosError } from "axios";

export type VerifyEmailCodeRequest = { code: string };

export async function verifyEmailCode(
  req: VerifyEmailCodeRequest,
): Promise<AuthResult> {
  try {
    const res = await api.post<ApiEnvelope<AuthResult>>(
      "/api/auth/verify-email-code",
      req,
    );
    return unwrapEnvelopeData(res, "Verification failed.");
  } catch (e) {
    if (isAxiosError(e)) throw toApiProblem(e);
    throw e;
  }
}
