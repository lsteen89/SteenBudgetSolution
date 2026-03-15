import type { ApiEnvelope } from "@/api/api.types";
import { api } from "@/api/axios";
import { unwrapEnvelope } from "@/api/envelope";
import { toApiProblem } from "@/api/toApiProblem";
import type { SendSupportMessageDto } from "@/types/User/Email/SendSupportMessageDto";
import { isAxiosError } from "axios";

export async function sendSupportMessage(
  dto: SendSupportMessageDto,
): Promise<string> {
  try {
    const res = await api.post<ApiEnvelope<string>>("/api/email/contact", dto);
    return unwrapEnvelope(res, "Support request failed.");
  } catch (e) {
    if (isAxiosError(e)) throw toApiProblem(e);
    throw e;
  }
}
