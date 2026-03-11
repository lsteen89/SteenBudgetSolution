import type { ApiEnvelope } from "@/api/api.types";
import { api } from "@/api/axios";
import { unwrapEnvelope } from "@/api/envelope";
import { toApiProblem } from "@/api/toApiProblem";
import { isAxiosError } from "axios";

export type ResendVerificationRecoveryRequest = {
  email: string;
};

export async function resendVerificationRecovery(
  req: ResendVerificationRecoveryRequest,
): Promise<void> {
  try {
    const res = await api.post<ApiEnvelope<string>>(
      "/api/auth/resend-verification-recovery",
      req,
    );
    unwrapEnvelope(res, "Resend failed.");
  } catch (e) {
    if (isAxiosError(e)) throw toApiProblem(e);
    throw e;
  }
}
