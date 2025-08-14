## TL;DR

- **Auth uses cookies + bearer:** AT in `Authorization: Bearer <jwt>`, RT in **HttpOnly cookie**.
- **Refresh endpoint** sets **new RT cookie** and returns **new AT**.
- **Errors** are consistent `ApiErrorResponse { code, description }`.
- **All endpoints are JSON.**

---

## Conventions

- **Base URL:** `/api`
- **Auth header:** `Authorization: Bearer <accessToken>` (protected endpoints).
- **Refresh:** relies on RT cookie automatically attached by the browser.
- **Responses:**
  - Success: `ApiResponse<T> { data: T }` or plain payload.
  - Error: `ApiErrorResponse { code: string, description: string }`.

### Common error codes

`InvalidCaptcha`, `UserLockedOut`, `InvalidCredentials`, `InvalidRefreshToken`, `RefreshUserNotFound`, `LoginTransactionFailed`, `RefreshTransactionFailed`, `EmailAlreadyVerified`, `VerificationTokenNotFound`, `VerificationUpdateFailed`, `EmailSendFailed`, `TooManyRequests`, `ValidationFailed`.

---

## Endpoints

### POST `/api/auth/login`

**Body**

```json
{
  "email": "user@example.com",
  "password": "secret",
  "captchaToken": "…",
  "deviceId": "device-uuid",
  "userAgent": "UA string"
}
```

**200 Response**

```json
{
  "accessToken": "<jwt>",
  "persoId": "guid",
  "sessionId": "guid",
  "wsMac": "string",
  "rememberMe": true
}
```

**Set-Cookie**: new `RefreshToken=<opaque>; HttpOnly; Secure; SameSite=Strict; Path=/; Expires=...`

**4xx**: `InvalidCaptcha`, `InvalidCredentials`, `UserLockedOut`, `LoginTransactionFailed`.

---

### POST `/api/auth/refresh`

**Body** *(optional AT for blacklist)*:

```json
{ "accessToken": "<previous jwt>" }
```

**Cookie**: `RefreshToken` (sent automatically)

**200 Response**

```json
{ "accessToken": "<new jwt>" }
```

**Set-Cookie**: rotated `RefreshToken=...`

**4xx**: `InvalidRefreshToken`, `RefreshUserNotFound`, `RefreshTransactionFailed`.

---

### POST `/api/auth/logout`

**Body**

```json
{
  "accessToken": "<current jwt>",
  "sessionId": "guid",
  "logoutAll": false
}
```

**200**: clears cookie, best-effort blacklist AT, revokes RT(s).\
**WS**: `LOGOUT` or `LOGOUT_ALL` message.

---

### POST `/api/auth/register`

**Body**

```json
{
  "firstName": "A",
  "lastName": "B",
  "email": "user@example.com",
  "password": "Secret123!",
  "captchaToken": "…",
  "honeypot": ""
}
```

**200**: success (generic).\
**4xx**: `InvalidCaptcha`, `EmailAlreadyExists`, `RegistrationFailed`.

---

### POST `/api/auth/resend-verification`

**Body**

```json
{ "email": "user@example.com" }
```

**200**: generic success (no enumeration).\
**429** (optional policy): `TooManyRequests`.

---

### GET `/api/auth/verify`

**Query**

```
/api/auth/verify?token=<guidN>
```

**200**: success\
**4xx**: `VerificationTokenNotFound`, `EmailAlreadyVerified`, `VerificationUpdateFailed`.

---

### POST `/api/contact`

**Body**

```json
{
  "senderEmail": "user@example.com",
  "subject": "Hello",
  "body": "Message...",
  "captchaToken": "…"
}
```

**200**: generic success.\
**4xx**: `InvalidCaptcha`, `ValidationFailed`, `EmailSendFailed`.\
**429** (optional): `TooManyRequests`.

---

## WebSocket auth

- Client gets `wsMac` at login.
- Connect with `sessionId` + `wsMac` per WS manager contract (see `docs/websocket-auth.md`).
- Server can push `LOGOUT`/`LOGOUT_ALL` to terminate sessions proactively.

---

## Health & docs

- **Swagger/OpenAPI:** `/swagger` (if enabled).
- **Health:** `/health` (liveness), `/ready` (readiness) if present.

---

## Security headers (reverse proxy)

- `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`.
- CORS as needed; SameSite cookies recommended for refresh.

---

## Examples

### cURL login

```bash
curl -i -X POST https://api.ebudget.se/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email":"user@example.com","password":"Secret123!","captchaToken":"…","deviceId":"dev-1","userAgent":"myapp/1.0" }'
```

### cURL refresh (cookie jar)

```bash
curl -i -X POST https://api.ebudget.se/api/auth/refresh \
  -H "Content-Type: application/json" \
  -b cookies.txt -c cookies.txt
```

