```md
# eBudget API (Public Contract)

This document describes the public JSON contract for the eBudget backend.

---

## TL;DR

- **Access Token (AT)** is sent as `Authorization: Bearer <jwt>` to protected endpoints.
- **Refresh Token (RT)** is stored as an **HttpOnly cookie** and is used by `/api/auth/refresh`.
- **All endpoints return an ApiEnvelope**:
  - Success: `{ isSuccess: true, data: ... }`
  - Failure: `{ isSuccess: false, error: { code, message } }`
- **All endpoints are JSON** (except `/api/auth/verify` which uses query string).

---

## Conventions

- **Base URL:** `/api`
- **Auth header (protected endpoints):** `Authorization: Bearer <accessToken>`
- **Refresh uses cookie:** browser sends RT cookie automatically.
  - Frontend must use `credentials: "include"` (fetch) or `withCredentials: true` (axios).
- **Response envelope:** `ApiEnvelope<T>`

### ApiEnvelope shape

**Success**
```json
{
  "isSuccess": true,
  "data": { },
  "error": null
}

```

**Failure**

```json
{
  "isSuccess": false,
  "data": null,
  "error": {
    "code": "SOME_CODE",
    "message": "Human readable message"
  }
}

```

> Note: the API may return HTTP 200 with `isSuccess=false` for domain errors. Always check the envelope.

### Common error codes

Auth / public:

-   `InvalidCaptcha`
    
-   `InvalidCredentials`
    
-   `UserLockedOut`
    
-   `InvalidRefreshToken`
    
-   `RefreshUserNotFound`
    
-   `LoginTransactionFailed`
    
-   `RefreshTransactionFailed`
    
-   `EmailAlreadyVerified`
    
-   `VerificationTokenNotFound`
    
-   `VerificationUpdateFailed`
    
-   `EmailSendFailed`
    
-   `TooManyRequests`
    
-   `ValidationFailed`
    

Budget / months:

-   `INVALID_YEARMONTH`
    
-   `INVALID_CARRY_MODE`
    
-   `INVALID_CARRY_AMOUNT`
    
-   `INVALID_TARGET_MONTH`
    
-   `OPEN_MONTH_EXISTS`
    
-   `MONTH_IS_CLOSED`
    
-   `MONTH_NOT_FOUND`
    
-   `SNAPSHOT_MISSING`
    
-   `BUDGET_NOT_FOUND`
    

(Exact codes may be returned from domain errors; FE should treat `error.code` as the stable identifier.)

----------

# Auth

## POST `/api/auth/login`

**Body**

```json
{
  "email": "user@example.com",
  "password": "secret",
  "captchaToken": "...",
  "deviceId": "device-uuid",
  "userAgent": "UA string"
}

```

**200 (Success)**

```json
{
  "isSuccess": true,
  "data": {
    "accessToken": "<jwt>",
    "persoId": "guid",
    "sessionId": "guid",
    "rememberMe": true
  },
  "error": null
}

```

**Set-Cookie**

-   `RefreshToken=<opaque>; HttpOnly; Secure; SameSite=Strict; Path=/; Expires=...`
    

**Failure codes**

-   `InvalidCaptcha`, `InvalidCredentials`, `UserLockedOut`, `LoginTransactionFailed`
    

----------

## POST `/api/auth/refresh`

Refreshes access token using the refresh cookie.

**Body**

```json
{}

```

**Cookie**

-   `RefreshToken` (sent automatically by browser)
    

**200 (Success)**

```json
{
  "isSuccess": true,
  "data": { "accessToken": "<new jwt>" },
  "error": null
}

```

**Set-Cookie**

-   rotated `RefreshToken=...`
    

**Failure codes**

-   `InvalidRefreshToken`, `RefreshUserNotFound`, `RefreshTransactionFailed`
    

----------

## POST `/api/auth/logout`

**Body**

```json
{
  "accessToken": "<current jwt>",
  "sessionId": "guid",
  "logoutAll": false
}

```

**200 (Success)**

```json
{ "isSuccess": true, "data": null, "error": null }

```

Notes:

-   Clears refresh cookie.
    
-   Invalidates session(s) server-side (implementation detail).
    

----------

## POST `/api/auth/register`

**Body**

```json
{
  "firstName": "A",
  "lastName": "B",
  "email": "user@example.com",
  "password": "Secret123!",
  "captchaToken": "...",
}

```

**200 (Success)**

```json
{ "isSuccess": true, "data": null, "error": null }

```

**Failure codes**

-   `InvalidCaptcha`, `EmailAlreadyExists`, `RegistrationFailed`
    

----------

## POST `/api/auth/resend-verification`

**Body**

```json
{ "email": "user@example.com" }

```

**200 (Success)**

```json
{ "isSuccess": true, "data": null, "error": null }

```

**Failure codes**

-   `TooManyRequests` (optional policy)
    

----------

## GET `/api/auth/verify?token=<guid>`

**200 (Success)**

```json
{ "isSuccess": true, "data": null, "error": null }

```

**Failure codes**

-   `VerificationTokenNotFound`, `EmailAlreadyVerified`, `VerificationUpdateFailed`
    

----------

# Contact

## POST `/api/contact`

**Body**

```json
{
  "senderEmail": "user@example.com",
  "subject": "Hello",
  "body": "Message...",
  "captchaToken": "..."
}

```

**200 (Success)**

```json
{ "isSuccess": true, "data": null, "error": null }

```

**Failure codes**

-   `InvalidCaptcha`, `ValidationFailed`, `EmailSendFailed`
    
-   `TooManyRequests` (optional policy)
    

----------

# Budget

All budget endpoints require:

-   `Authorization: Bearer <accessToken>`
    

## GET `/api/budgets/months/status`

Returns month overview for the current user’s budget.

**200 (Success)**

```json
{
  "isSuccess": true,
  "data": {
    "openMonthYearMonth": "2026-01",
    "currentYearMonth": "2026-01",
    "gapMonthsCount": 0,
    "suggestedAction": "None",
    "months": [
      { "yearMonth": "2026-01", "status": "open", "openedAt": "2026-01-01T00:00:00Z", "closedAt": null }
    ]
  },
  "error": null
}

```

**Failure codes**

-   `BUDGET_NOT_FOUND`
    

----------

## POST `/api/budgets/months/start`

Starts a month explicitly (and optionally closes the previous open month).

**Body**

```json
{
  "targetYearMonth": "2026-01",
  "closePreviousOpenMonth": true,
  "carryOverMode": "none",
  "carryOverAmount": 0,
  "createSkippedMonths": true
}

```

**200 (Success)** returns updated `BudgetMonthsStatusDto` in `data`.

**Failure codes**

-   `INVALID_YEARMONTH`
    
-   `INVALID_CARRY_MODE`
    
-   `INVALID_CARRY_AMOUNT`
    
-   `INVALID_TARGET_MONTH`
    
-   `OPEN_MONTH_EXISTS`
    
-   `MONTH_IS_CLOSED`
    
-   `BUDGET_NOT_FOUND`
    

----------

## GET `/api/budgets/dashboard?yearMonth=YYYY-MM`

Returns dashboard for a specific month.

### Important behavior (only allowed automation)

On dashboard load, backend ensures that if the user has **zero months**, it creates the **current month as open**.  
(Frontend does not need a separate bootstrap call; just call dashboard normally.)

**Query**

-   `yearMonth` optional.
    
    -   If omitted, backend chooses: current open month if exists, otherwise current year-month.
        

**200 (Success)**

```json
{
  "isSuccess": true,
  "data": {
    "month": {
      "yearMonth": "2026-01",
      "status": "open",
      "carryOverMode": "none",
      "carryOverAmount": null
    },
    "liveDashboard": {
      "budgetId": "guid",
      "income": { "...": "..." },
      "expenditure": { "...": "..." },
      "savings": { "...": "..." },
      "debt": { "...": "..." },
      "recurringExpenses": [],
      "subscriptions": { "...": "..." },

      "carryOverAmountMonthly": 0,
      "disposableAfterExpensesWithCarryMonthly": 20500,
      "disposableAfterExpensesAndSavingsWithCarryMonthly": 18000,
      "finalBalanceWithCarryMonthly": 12345
    },
    "snapshotTotals": null
  },
  "error": null
}

```

If `month.status == "closed"`:

-   `liveDashboard` is `null`
    
-   `snapshotTotals` is present:
    

```json
{
  "totalIncomeMonthly": 32500,
  "totalExpensesMonthly": 12000,
  "totalSavingsMonthly": 2500,
  "totalDebtPaymentsMonthly": 1234,
  "finalBalanceMonthly": 16766
}

```

**Failure codes**

-   `BUDGET_NOT_FOUND`
    
-   `INVALID_YEARMONTH`
    
-   `MONTH_NOT_FOUND`
    
-   `SNAPSHOT_MISSING`
    

----------

# Health & docs

-   Swagger/OpenAPI: `/swagger` (if enabled)
    
-   Health checks: `/health` / `/ready` (if enabled)
    

----------

# Examples

## cURL login

```bash
curl -i -X POST https://<host>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email":"user@example.com","password":"Secret123!","captchaToken":"...","deviceId":"dev-1","userAgent":"myapp/1.0" }'

```

## cURL refresh (cookie jar)

```bash
curl -i -X POST https://<host>/api/auth/refresh \
  -H "Content-Type: application/json" \
  -b cookies.txt -c cookies.txt \
  -d '{}'

```

## cURL month dashboard

```bash
curl -i https://<host>/api/budgets/dashboard?yearMonth=2026-01 \
  -H "Authorization: Bearer <jwt>"

```


