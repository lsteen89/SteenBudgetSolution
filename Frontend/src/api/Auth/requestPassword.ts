import type { ApiEnvelope, ApiInfoDto } from "@/api/api.types";
import { api } from "@/api/axios";
import { unwrapEnvelopeInfo } from "@/api/envelope";
import { toApiProblem } from "@/api/toApiProblem";
import { isAxiosError } from "axios";

export type ForgotPasswordRequest = {
  email: string;
  locale?: string;
};

export type ResetPasswordRequest = {
  email: string;
  code: string;
  newPassword: string;
};

export async function requestPasswordReset(
  dto: ForgotPasswordRequest,
): Promise<ApiInfoDto | null> {
  try {
    const res = await api.post<ApiEnvelope<null>>(
      "/api/auth/forgot-password",
      dto,
    );
    return unwrapEnvelopeInfo(res, "Password reset request failed.");
  } catch (e) {
    if (isAxiosError(e)) throw toApiProblem(e);
    throw e;
  }
}

export async function resetPassword(
  dto: ResetPasswordRequest,
): Promise<ApiInfoDto | null> {
  try {
    const res = await api.post<ApiEnvelope<null>>(
      "/api/auth/reset-password",
      dto,
    );
    return unwrapEnvelopeInfo(res, "Password reset failed.");
  } catch (e) {
    if (isAxiosError(e)) throw toApiProblem(e);
    throw e;
  }
}
