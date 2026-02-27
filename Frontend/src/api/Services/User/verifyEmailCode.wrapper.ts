import type { ApiProblem } from "@/api/api.types";
import {
  verifyEmailCode,
  type VerifyEmailCodeRequest,
} from "@/api/Services/User/verifyEmailCode";

export type VerifyEmailCodeFn = (req: VerifyEmailCodeRequest) => Promise<void>;

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
};

export const realVerifyEmailCodeWrapper: VerifyEmailCodeFn = async (req) => {
  await verifyEmailCode(req);
};
