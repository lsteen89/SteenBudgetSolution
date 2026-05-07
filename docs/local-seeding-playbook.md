# Local Seeding Playbook

This playbook describes the primary supported local seeding flow for the eBudget dev database.

This is separate from the Playwright E2E seed flow. E2E tests use `Backend.Tools seed-e2e` against `steenbudgetE2E`; this playbook stays focused on the Docker-first local developer seed flow for `steenbudgetDEV`.

`devhistory@local.test` is a local development playground account, not a Playwright fixture. Keep focused E2E regression accounts in `seed-e2e`; do not write brittle Playwright assertions against the local dev-history account.

The flow is intentionally Docker-first and reset-first:

- reset the Docker Compose dev database volume
- start the Docker Compose dev stack
- seed fixed local users
- seed fixed local users with budget/month data

Do not use this for production data.

## Reset And Seed

Run from the repository root:

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml down -v
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d
docker compose --env-file .env.dev -f docker-compose.dev.yml --profile seed run --rm seed-users
docker compose --env-file .env.dev -f docker-compose.dev.yml --profile seed run --rm seed-users-with-budget
```

`down -v` deletes the local MariaDB Docker volume. That is the intended reset model for deterministic local data.

## Seed Commands

### `seed-users`

Creates four fixed local users:

| Name | Email | Password | Purpose |
| --- | --- | --- | --- |
| Demo One | `demo1@local.test` | `ChangeMe123!` | Plain login/auth smoke user |
| Demo Two | `demo2@local.test` | `ChangeMe123!` | Second plain user for multi-user sanity checks |
| Budget Demo | `budgetdemo@local.test` | `ChangeMe123!` | Dashboard-ready budget demo user |
| Close Month | `closemonth@local.test` | `ChangeMe123!` | Close-month testing budget demo user |

All seeded users are created with:

- `EmailConfirmed = 1`
- `Locale = sv-SE`
- `Currency = SEK`
- one refresh token issued by the registration/session flow

Plain users remain first-login users:

- `demo1@local.test`: `FirstLogin = 1`
- `demo2@local.test`: `FirstLogin = 1`

### `seed-users-with-budget`

Reuses or creates:

- `budgetdemo@local.test`
- `closemonth@local.test`
- `devhistory@local.test`

Then it creates budget data and sets:

- `FirstLogin = 0`
- `DebtRepaymentStrategy = snowball`

This lets the dashboard open without the setup wizard.

`budgetdemo@local.test` and `closemonth@local.test` keep the existing fixed three-month timeline.

`devhistory@local.test` uses password `ChangeMe123!` and gets the richer `local-dev-year-history` profile:

- historical budget months from `2025-04` through `2026-03`
- exactly one skipped month: `2025-09`
- open `2026-04`, close-window eligible under the fixed seed clock `2026-04-26T12:00:00Z`
- salary, freelance income, household contribution, living/fixed expenses, subscriptions, savings goals, revolving debt, and installment debt
- high-income, low-income, expense-spike, near-zero/negative, large-surplus, full-carry-over, and no-carry-over months
- subscription rename, new subscription, paused subscription, cancelled subscription, removed subscription, savings/debt adjustments, current-only savings goal, and current-only debt examples

## Budget Baseline

`budgetdemo@local.test` and `closemonth@local.test` get one baseline budget with:

### Income

| Type | Name | Amount | Frequency |
| --- | --- | ---: | --- |
| Salary | Net salary | `32000.00` | Monthly |
| Side hustle | Freelance | `2500.00` | Monthly |
| Household member | Partner contribution | `1800.00` | Monthly |

Salary payment timing:

- `IncomePaymentDayType = dayOfMonth`
- `IncomePaymentDay = 25`

### Expense Items

| Category | Name | Amount |
| --- | --- | ---: |
| Rent | Rent | `12000.00` |
| Food | Groceries | `3200.00` |
| Transport | Transport Pass | `850.00` |
| FixedExpense | Electricity | `720.00` |
| FixedExpense | Home Internet | `349.00` |
| FixedExpense | Mobile Plan | `299.00` |
| Subscription | Netflix | `159.00` |
| Subscription | Spotify | `119.00` |

### Savings

| Name | Amount |
| --- | ---: |
| Monthly savings | `3000.00` |

Savings goal:

| Name | Target | Target date | Saved | Monthly contribution |
| --- | ---: | --- | ---: | ---: |
| Emergency Fund | `100000.00` | `2028-04-01` | `40000.00` | `1500.00` |

### Debts

| Name | Type | Balance | APR | Monthly fee | Min payment | Term months |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Credit Card | revolving | `18500.00` | `19.90` | `25.00` | `500.00` | |
| Student Loan | installment | `95000.00` | `1.20` | `0.00` | `1500.00` | `72` |

## Default Budget Month Timeline

`budgetdemo@local.test` and `closemonth@local.test` get a fixed three-month timeline:

| Month | Status | Carry-over mode | Notes |
| --- | --- | --- | --- |
| `2026-02` | closed | none | Baseline month |
| `2026-03` | closed | full | Changed income, expenses, savings, and debt |
| `2026-04` | open | full | Dashboard and close-month work month |

Closed month snapshots:

| Month | Income | Expenses | Savings | Debt payments | Final balance |
| --- | ---: | ---: | ---: | ---: | ---: |
| `2026-02` | `36300.00` | `17696.00` | `4500.00` | `1893.17` | `12210.83` |
| `2026-03` | `37000.00` | `18175.00` | `4900.00` | `1885.25` | `12039.75` |

`2026-04` is open, so its snapshot columns are `NULL`.

### Month Scenario Details

`2026-02` is the baseline month.

`2026-03` changes:

- Groceries: `3520.00`
- Electricity: `810.00`
- Netflix: `179.00`
- Cloud Storage added: `49.00`
- Freelance income: `3200.00`
- Monthly savings: `3200.00`
- Emergency Fund saved/contribution: `41700.00` / `1700.00`
- Credit Card balance: `17100.00`
- Student Loan balance: `94450.00`

`2026-04` changes:

- Groceries: `3340.00`
- Electricity: `960.00`
- Netflix: `199.00`
- Cloud Storage added: `59.00`
- Transport Pass inactive
- Spotify soft-deleted
- Freelance income: `2200.00`
- Partner contribution: `1500.00`
- Monthly savings: `2800.00`
- Emergency Fund saved/contribution: `42800.00` / `1100.00`
- Credit Card balance/min payment: `15850.00` / `650.00`
- Student Loan balance: `93880.00`

## Dev History Timeline

`devhistory@local.test` gets a local-only development timeline:

| Month | Status | Carry-over mode | Notes |
| --- | --- | --- | --- |
| `2025-04` | closed | none | Normal baseline month |
| `2025-05` | closed | full | Lower freelance income; this surplus is not carried into June |
| `2025-06` | closed | none | High freelance income and large surplus |
| `2025-07` | closed | full | Low income and expense pressure |
| `2025-08` | closed | full | Appliance spike and negative final balance |
| `2025-09` | skipped | none | Intentional skipped month |
| `2025-10` | closed | none | Rebound month with a paused subscription |
| `2025-11` | closed | full | Renamed subscription and new subscription |
| `2025-12` | closed | full | Medical spike and cancelled subscription |
| `2026-01` | closed | none | Current-only savings goal |
| `2026-02` | closed | full | Removed subscription and renamed subscription |
| `2026-03` | closed | full | Current-only debt |
| `2026-04` | open | full | Close-window eligible playground month with a near-zero surplus |

Selected closed snapshots:

| Month | Income | Expenses | Savings | Debt payments | Final balance |
| --- | ---: | ---: | ---: | ---: | ---: |
| `2025-04` | `54000.00` | `30095.00` | `7800.00` | `2935.00` | `13170.00` |
| `2025-06` | `65500.00` | `31895.00` | `9500.00` | `3185.00` | `20920.00` |
| `2025-12` | `54000.00` | `46696.00` | `4500.00` | `3185.00` | `-381.00` |
| `2026-03` | `56500.00` | `30095.00` | `7200.00` | `2685.00` | `16520.00` |

Open `2026-04` is adjusted to a computed final balance of `950.00`, but its snapshot columns remain `NULL` until the month is closed.

## Expected Row Counts After A Clean Seed

After running both seed commands on a clean reset, the seeded database should contain:

| Table | Rows |
| --- | ---: |
| Users | 5 |
| UserSettings | 5 |
| RefreshTokens | 5 |
| Budget | 3 |
| Income | 3 |
| IncomeSideHustle | 3 |
| IncomeHouseholdMember | 3 |
| ExpenseCategory | 7 |
| ExpenseItem | 29 |
| Savings | 3 |
| SavingsGoal | 5 |
| Debt | 6 |
| BudgetMonth | 21 |
| BudgetMonthIncome | 18 |
| BudgetMonthIncomeSideHustle | 18 |
| BudgetMonthIncomeHouseholdMember | 18 |
| BudgetMonthExpenseItem | 218 |
| BudgetMonthSavings | 18 |
| BudgetMonthSavingsGoal | 43 |
| BudgetMonthDebt | 38 |
| BudgetMonthChangeEvent | 142 |

## Useful Verification Queries

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml exec -T db \
  mariadb -uapp -papppwd steenbudgetDEV \
  -e "SELECT Firstname, Lastname, Email, FirstLogin, EmailConfirmed FROM Users ORDER BY Email;"
```

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml exec -T db \
  mariadb -uapp -papppwd steenbudgetDEV \
  -e "SELECT u.Email, bm.YearMonth, bm.Status, bm.CarryOverMode
      FROM Users u
      JOIN Budget b ON b.Persoid = u.Persoid
      JOIN BudgetMonth bm ON bm.BudgetId = b.Id
      WHERE u.Email IN ('budgetdemo@local.test','closemonth@local.test','devhistory@local.test')
      ORDER BY u.Email, bm.YearMonth;"
```

## Failure Model

The primary supported model is reset-first. If the database already has budget months for a budget demo user, budget seeding refuses to append a second timeline.

Use the reset command when you want a known clean state:

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml down -v
```
