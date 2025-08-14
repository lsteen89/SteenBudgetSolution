## TL;DR

- **What:** Daily cap + cooldown per **key**.
- **Keys:**
  - Verification/resend → `user:{Guid}`
  - Contact form → `contact:{emailNorm}`, `contact-ip:{ip}`
- **Storage:** `EmailRateLimit` table keyed by **SHA-256(key)** + `Kind` + `DateUtc`.
- **Behavior:** `Check` before send; `MarkSent` after successful send.

---

## Configuration

`EmailRateLimitOptions`:

- `DailyLimit` – max sends per day per (key, kind).
- `CooldownPeriodMinutes` – minimum seconds between sends for same (key, kind).

Tune per environment.

---

## Data model

```sql
CREATE TABLE IF NOT EXISTS EmailRateLimit (
  KeyHash BINARY(32) NOT NULL,
  Kind TINYINT NOT NULL,
  DateUtc DATE NOT NULL,
  SentCount INT NOT NULL DEFAULT 1,
  LastSentAtUtc DATETIME NOT NULL,
  PRIMARY KEY (KeyHash, Kind, DateUtc)
) ENGINE=InnoDB;
```

- Keep **30 days** (cleanup job).
- Never store raw emails/IPs—**hash** keys in app code.

---

## Keys

- **User-based:** `user:{persoId:N}` → SHA-256.
- **Email-based:** `contact:{email.Trim().ToLowerInvariant()}` → SHA-256.
- **IP-based:** `contact-ip:{ip}` → SHA-256.

---

## Service interface

```csharp
public enum EmailKind : byte { Verification = 1, Contact = 2 }

public interface IEmailRateLimiter {
  Task<RateLimitDecision> CheckAsync(Guid userId, EmailKind kind, CancellationToken ct);
  Task<RateLimitDecision> CheckAsync(string key, EmailKind kind, CancellationToken ct);
  Task MarkSentAsync(Guid userId, EmailKind kind, DateTimeOffset sentAtUtc, CancellationToken ct);
  Task MarkSentAsync(string key, EmailKind kind, DateTimeOffset sentAtUtc, CancellationToken ct);
}
```

---

## Usage

### Verification/resend (user-scoped)

```csharp
var decision = await _rateLimiter.CheckAsync(user.PersoId, EmailKind.Verification, ct);
if (!decision.Allowed) return Result.Success(); // or 429 if you prefer
// send...
await _rateLimiter.MarkSentAsync(user.PersoId, EmailKind.Verification, _clock.UtcNow, ct);
```

### Contact form (email + IP)

```csharp
var emailKey = $"contact:{emailNorm}";
var ipKey    = $"contact-ip:{ip ?? "unknown"}";

var emailOk = await _rateLimiter.CheckAsync(emailKey, EmailKind.Contact, ct);
var ipOk    = await _rateLimiter.CheckAsync(ipKey, EmailKind.Contact, ct);
if (!emailOk.Allowed || !ipOk.Allowed) return Result.Success(); // silent throttle

// send...
await _rateLimiter.MarkSentAsync(emailKey, EmailKind.Contact, now, ct);
await _rateLimiter.MarkSentAsync(ipKey, EmailKind.Contact, now, ct);
```

---

## Ops

- **Cleanup:**
  ```sql
  DELETE FROM EmailRateLimit WHERE DateUtc < (CURRENT_DATE - INTERVAL 30 DAY);
  ```
- **Tuning:** Adjust `DailyLimit` / `CooldownPeriodMinutes`; monitor bounce/spam.
- **Observability:** Log reason when throttled: `daily_limit:<N>` or `cooldown:<secs>`.

---
