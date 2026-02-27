import type { ApiEnvelope, ApiProblem } from "@/api/api.types";
import { api } from "@/api/axios";
import { toApiProblem } from "@/api/toApiProblem";
import type {
  RegistrationFormValues,
  RegistrationRequest,
} from "@/types/User/Creation/registration.types";
import { toRegistrationRequest } from "@/types/User/Creation/registration.types";
import { isAxiosError } from "axios";
import type { AuthResult } from "types/User/Auth/AuthResult";

export const registerUser = async (
  form: RegistrationFormValues,
): Promise<AuthResult> => {
  const user: RegistrationRequest = toRegistrationRequest(form);

  try {
    const response = await api.post<ApiEnvelope<AuthResult>>(
      "/api/auth/register",
      user,
    );
    const env = response.data;

    if (!env.isSuccess || env.error || !env.data) {
      const p: ApiProblem = {
        message: env.error?.message ?? "Registreringen misslyckades.",
        code: env.error?.code ?? "Unknown",
        status: response.status,
        raw: env,
      };
      throw p;
    }

    return env.data;
  } catch (e) {
    if (isAxiosError(e)) throw toApiProblem(e);
    if (typeof e === "object" && e && "message" in e) throw e;
    throw toApiProblem(e);
  }
};
