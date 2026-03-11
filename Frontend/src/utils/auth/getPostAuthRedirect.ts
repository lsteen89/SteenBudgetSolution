import { readJwtEmailConfirmed } from "@/utils/auth/jwt";

export function getPostAuthRedirect(accessToken: string | null): string {
  return readJwtEmailConfirmed(accessToken)
    ? "/dashboard"
    : "/email-confirmation";
}
