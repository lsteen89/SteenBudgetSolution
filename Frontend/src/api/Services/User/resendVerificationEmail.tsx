import type { ApiEnvelope, ApiProblem } from "@/api/api.types";
import { api } from "@/api/axios";
import { toApiProblem } from "@/api/toApiProblem";
import { isAxiosError } from "axios";

export type ResendVerificationRequest = {
  email: string;
};

export async function resendVerificationEmail(
  req: ResendVerificationRequest,
): Promise<string> {
  try {
    const res = await api.post<ApiEnvelope<string>>(
      "/api/auth/resend-verification",
      req,
    );

    const env = res.data;

    if (!env.isSuccess || env.error) {
      const p: ApiProblem = {
        message: env.error?.message ?? "Resend failed.",
        code: env.error?.code ?? "Unknown",
        status: res.status,
        raw: env,
      };
      throw p;
    }

    return env.data ?? "OK";
  } catch (e) {
    if (isAxiosError(e)) throw toApiProblem(e);
    if (typeof e === "object" && e && "message" in e) throw e;
    throw toApiProblem(e);
  }
}
