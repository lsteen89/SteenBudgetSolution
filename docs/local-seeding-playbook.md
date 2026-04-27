# Local Seeding Playbook

This playbook describes the primary supported local seeding flow for the eBudget dev database.

This is separate from the Playwright E2E seed flow. E2E tests use `Backend.Tools seed-e2e` against `steenbudgetE2E`; this playbook stays focused on the Docker-first local developer seed flow for `steenbudgetDEV`.

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

Then it creates the same budget data for each user and sets:

- `FirstLogin = 0`
- `DebtRepaymentStrategy = snowball`

This lets the dashboard open without the setup wizard.

## Budget Baseline

Each budget demo user gets one baseline budget with:

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

## Budget Month Timeline

Each budget demo user gets a fixed three-month timeline:

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

## Expected Row Counts After A Clean Seed

After running both seed commands on a clean reset, the seeded database should contain:

| Table | Rows |
| --- | ---: |
| Users | 4 |
| UserSettings | 4 |
| RefreshTokens | 4 |
| Budget | 2 |
| Income | 2 |
| IncomeSideHustle | 2 |
| IncomeHouseholdMember | 2 |
| ExpenseCategory | 7 |
| ExpenseItem | 16 |
| Savings | 2 |
| SavingsGoal | 2 |
| Debt | 4 |
| BudgetMonth | 6 |
| BudgetMonthIncome | 6 |
| BudgetMonthIncomeSideHustle | 6 |
| BudgetMonthIncomeHouseholdMember | 6 |
| BudgetMonthExpenseItem | 52 |
| BudgetMonthSavings | 6 |
| BudgetMonthSavingsGoal | 6 |
| BudgetMonthDebt | 12 |
| BudgetMonthChangeEvent | 42 |

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
      WHERE u.Email IN ('budgetdemo@local.test','closemonth@local.test')
      ORDER BY u.Email, bm.YearMonth;"
```

## Failure Model

The primary supported model is reset-first. If the database already has budget months for a budget demo user, budget seeding refuses to append a second timeline.

Use the reset command when you want a known clean state:

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml down -v
```
