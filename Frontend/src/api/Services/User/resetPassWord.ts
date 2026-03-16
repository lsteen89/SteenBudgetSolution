import type { ApiEnvelope, ApiInfoDto } from "@/api/api.types";
import { api } from "@/api/axios";
import { unwrapEnvelopeInfo } from "@/api/envelope";
import { toApiProblem } from "@/api/toApiProblem";
import { isAxiosError } from "axios";

export async function requestPasswordReset(dto: {
  email: string;
  locale?: string;
}): Promise<ApiInfoDto | null> {
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

export async function resetPassword(dto: {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ApiInfoDto | null> {
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
