import type { ApiEnvelope, ApiProblem } from "@/api/api.types";
import { api } from "@/api/axios";
import { toApiProblem } from "@/api/toApiProblem";
import { isAxiosError } from "axios";

export type VerifyEmailCodeRequest = {
  email: string;
  code: string;
};

export async function verifyEmailCode(
  req: VerifyEmailCodeRequest,
): Promise<void> {
  try {
    const res = await api.post<ApiEnvelope<string>>(
      "/api/auth/verify-email-code",
      req,
    );

    const env = res.data;

    if (!env.isSuccess || env.error) {
      const p: ApiProblem = {
        message: env.error?.message ?? "Verification failed.",
        code: env.error?.code ?? "Unknown",
        status: res.status,
        raw: env,
      };
      throw p;
    }
  } catch (e) {
    if (isAxiosError(e)) throw toApiProblem(e);
    if (typeof e === "object" && e && "message" in e) throw e;
    throw toApiProblem(e);
  }
}
