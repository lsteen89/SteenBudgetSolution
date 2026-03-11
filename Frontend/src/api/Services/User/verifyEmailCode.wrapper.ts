import type { ApiProblem } from "@/api/api.types";
import type { AuthResult } from "@/api/auth.types";
import {
  verifyEmailCode,
  type VerifyEmailCodeRequest,
} from "@/api/Services/User/verifyEmailCode";

export type VerifyEmailCodeFn = (
  req: VerifyEmailCodeRequest,
) => Promise<AuthResult>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockVerifyEmailCode: VerifyEmailCodeFn = async ({ code }) => {
  await sleep(200);

  if (code !== "123456") {
    throw {
      message: "Invalid code",
      code: "Registration.InvalidVerificationCode",
      status: 400,
    } satisfies ApiProblem;
  }

  return {
    accessToken: "mock-at",
    persoId: "00000000-0000-0000-0000-000000000000",
    sessionId: "00000000-0000-0000-0000-000000000001",
    wsMac: "mock-mac",
    rememberMe: true,
  };
};

export const realVerifyEmailCodeWrapper: VerifyEmailCodeFn = async (req) => {
  return await verifyEmailCode(req);
};
