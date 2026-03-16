import type { ApiEnvelope, ApiInfoDto } from "@/api/api.types";
import { api } from "@/api/axios";
import { unwrapEnvelopeInfo } from "@/api/envelope";
import { toApiProblem } from "@/api/toApiProblem";
import type { SendSupportMessageDto } from "@/types/User/Email/SendSupportMessageDto";
import { isAxiosError } from "axios";

export async function sendSupportMessage(
  dto: SendSupportMessageDto,
): Promise<ApiInfoDto | null> {
  try {
    const res = await api.post<ApiEnvelope<null>>(
      "/api/support/messages",
      dto,
    );
    return unwrapEnvelopeInfo(res, "Support request failed.");
  } catch (e) {
    if (isAxiosError(e)) throw toApiProblem(e);
    throw e;
  }
}
