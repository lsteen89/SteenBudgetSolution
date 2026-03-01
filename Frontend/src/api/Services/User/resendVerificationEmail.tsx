import type { ApiEnvelope } from "@/api/api.types";
import { api } from "@/api/axios";
import { unwrapEnvelope } from "@/api/envelope";
import { toApiProblem } from "@/api/toApiProblem";
import { isAxiosError } from "axios";

export type ResendVerificationRequest = { email: string };

export async function resendVerificationEmail(
  req: ResendVerificationRequest,
): Promise<string> {
  try {
    const res = await api.post<ApiEnvelope<string>>(
      "/api/auth/resend-verification",
      req,
    );
    return unwrapEnvelope(res, "Resend failed.");
  } catch (e) {
    if (isAxiosError(e)) throw toApiProblem(e);
    throw e;
  }
}
