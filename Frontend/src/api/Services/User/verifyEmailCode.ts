import type { ApiEnvelope } from "@/api/api.types";
import { api } from "@/api/axios";
import { unwrapEnvelope } from "@/api/envelope";
import { toApiProblem } from "@/api/toApiProblem";
import { isAxiosError } from "axios";

export type VerifyEmailCodeRequest = { email: string; code: string };

export async function verifyEmailCode(
  req: VerifyEmailCodeRequest,
): Promise<void> {
  try {
    const res = await api.post<ApiEnvelope<string>>(
      "/api/auth/verify-email-code",
      req,
    );
    unwrapEnvelope(res, "Verification failed.");
  } catch (e) {
    if (isAxiosError(e)) throw toApiProblem(e);
    throw e;
  }
}
