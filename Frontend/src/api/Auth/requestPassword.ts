import type { ApiEnvelope } from "@/api/api.types";
import { api } from "@/api/axios";
import { unwrapEnvelope } from "@/api/envelope";
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
): Promise<string> {
  try {
    const res = await api.post<ApiEnvelope<string>>(
      "/api/auth/forgot-password",
      dto,
    );
    return unwrapEnvelope(res, "Password reset request failed.");
  } catch (e) {
    if (isAxiosError(e)) throw toApiProblem(e);
    throw e;
  }
}

export async function resetPassword(
  dto: ResetPasswordRequest,
): Promise<string> {
  try {
    const res = await api.post<ApiEnvelope<string>>(
      "/api/auth/reset-password",
      dto,
    );
    return unwrapEnvelope(res, "Password reset failed.");
  } catch (e) {
    if (isAxiosError(e)) throw toApiProblem(e);
    throw e;
  }
}
