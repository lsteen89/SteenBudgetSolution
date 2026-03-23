import type { ApiEnvelope, ApiInfoDto } from "@/api/api.types";
import { api } from "@/api/axios";
import { unwrapEnvelopeInfo } from "@/api/envelope";
import { toApiProblem } from "@/api/toApiProblem";
import { isAxiosError } from "axios";

export type ResendVerificationRecoveryRequest = {
  email: string;
};

export async function resendVerificationRecovery(
  req: ResendVerificationRecoveryRequest,
): Promise<ApiInfoDto | null> {
  try {
    const res = await api.post<ApiEnvelope<null>>(
      "/api/auth/resend-verification-recovery",
      req,
    );
    return unwrapEnvelopeInfo(res, "Resend failed.");
  } catch (e) {
    if (isAxiosError(e)) throw toApiProblem(e);
    throw e;
  }
}
