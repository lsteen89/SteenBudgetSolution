export type JwtPayload = Record<string, unknown>;

function padBase64Url(value: string): string {
  return value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
}

export function readJwtPayload(token: string | null): JwtPayload | null {
  if (!token) return null;

  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return null;

    const json = atob(
      padBase64Url(payloadB64).replace(/-/g, "+").replace(/_/g, "/"),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function readJwtClaim<T = unknown>(
  token: string | null,
  claim: string,
): T | null {
  const payload = readJwtPayload(token);
  return (payload?.[claim] as T | undefined) ?? null;
}

export function readJwtEmail(token: string | null): string | null {
  const email = readJwtClaim<unknown>(token, "email");
  return typeof email === "string" && email.trim() ? email.trim() : null;
}

export function readJwtEmailConfirmed(token: string | null): boolean {
  const value = readJwtClaim<unknown>(token, "email_confirmed");
  return value === true || value === "true";
}
