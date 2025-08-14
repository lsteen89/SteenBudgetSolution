## TL;DR

- **Verification**: create token (`Guid`), upsert single active per user, email link with `token` query param, confirm flips `EmailConfirmed`.
- **Resend**: reuse existing token if ≥5m left; otherwise mint new; rate-limit; email.
- **Contact**: CAPTCHA, rate-limit by email + IP, sanitize body, send to support address with **Reply-To** set.

---

## Verification email

- **Token storage:** `VerificationToken` (`PersoId UNIQUE`, `Token UNIQUE`, `TokenExpiryDate`).
- **Generation:** handler generates `Guid` + expiry (`_clock.UtcNow + TTL hours`), calls `UpsertSingleActiveAsync`.
- **Composer:** builds link `GET <VerifyUrl>?token=<N-format>`.

Example HTML:

```html
<h1>Welcome to eBudget!</h1>
<p>Please click the link below to confirm your email address:</p>
<p><a href="https://app.ebudget.se/verify?token=..."><strong>Confirm My Email</strong></a></p>
```

### Verify endpoint (server)

- Load token by value, ensure `expiry >= now`.
- Load user; if already confirmed → `EmailAlreadyVerified`.
- Update `EmailConfirmed=1, EmailConfirmedAt=now` (predicate update).
- Delete tokens for that user (cleanup).
- Return 200.

---

## Resend verification

- **Input:** `{ email }`
- **Lookup:** user by normalized email → if missing or confirmed, return success (don’t enumerate).
- **Rate limit:** `EmailRateLimiter` with `user:{Guid}`.
- **Reuse vs rotate:** if existing token exists and `TokenExpiryDate > now + 5m`, reuse; else mint new (`UpsertSingleActiveAsync`).
- **Send:** same composer, same link.
- **Mark sent:** rate limiter mark.

---

## Contact form

- **Input:** `{ subject, body, senderEmail, captchaToken }` (+ IP from controller).
- **Validate**: subject ≤ 200, body ≤ 4000.
- **CAPTCHA**: validate unless test bypass.
- **Rate limit:** per `contact:{email}`, and `contact-ip:{ip}`.
- **Sanitize:** HTML-encode sender and body; convert `\n` → `<br/>`.
- **Compose:**
  - **From:** system address (`_settings.FromAddress`)
  - **To:** system address (support mailbox)
  - **Reply-To:** user’s email
  - **Body:** multipart/alternative (plain + HTML).
- **Send:** MailKit via `IEmailService`.

---

## Failure behavior

- **Verification send fails:** log; user can retry (subject to rate limit).
- **Resend throttled:** return success (generic) or 429 per API contract.
- **Verify invalid/expired token:** `VerificationTokenNotFound`.
- **Contact send fails:** `EmailSendFailed`.

---

## SMTP config (env)

- `SMTP__Host`, `SMTP__Port`, `SMTP__User`, `SMTP__Password`, `SMTP__FromAddress`, `SMTP__FromName`, `SMTP__UseSsl` (if applicable).

---

## Security

- Don’t log raw tokens; log PersoId/hashed prefix only.
- Consider hashing verification tokens at rest (store hash; compare on verify).
- DKIM/SPF/DMARC on domain for deliverability.

---
