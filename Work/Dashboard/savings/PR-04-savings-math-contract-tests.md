# PR 4 — Savings-math contract tests (BE lock + cross-page E2E parity)

| | |
| --- | --- |
| **Type** | Test additions — backend unit/integration + Playwright cross-page parity |
| **Depends on** | The goals-included `TotalSavingsMonthly` contract (the uncommitted `fix(budget): include goal contributions in savings total` change, or whichever commit ships it). PR 1, PR 2, PR 2.5, PR 2.6, PR 2.7, PR 3 all already landed. |
| **Risk** | None — test code only, no production change beyond adding a single dashboard `data-testid` if missing |
| **Branch** | current branch — do not branch/worktree |

---

## 1. Why this PR exists

A real production bug got past us: `devhistory@local.test` April 2026 showed
**"Pengaläge +950 kr"** on the dashboard and **"Kvar −3 050 kr"** on the
savings page — the same user, the same month, two different numbers. Root
cause was a contract reversal: commits `84d008c8` (2026-05-21) and
`fff019ac` (2026-05-23) excluded goal contributions from
`TotalSavingsMonthly`, while the savings page derived its own six-term Kvar
that included them. The fix (the goals-included supersede commit) restored
the right contract, but two failure modes are now permanently dangerous and
deserve explicit regression guards:

- **BE contract drift.** The bug projector was *internally consistent* —
  `TotalSavingsMonthly` and `FinalBalanceWithCarryMonthly` both excluded
  goals. A test that only asserts the inside-DTO identity would pass under
  the broken contract. What needs locking is the *meaning* of
  `TotalSavingsMonthly`, named explicitly.
- **FE re-derivation drift.** The savings page derives its own Kvar from
  the six visible terms instead of reading the BE final balance. If any
  surface ever re-derives money math in a way that drifts from the BE, the
  only regression net is a cross-page E2E that loads both pages and
  compares displayed numbers.

This PR adds both guards.

## 2. Read first

- **`Work/Dashboard/savings/SAVINGS-WIRING-AUDIT.md`** — the audit that
  set the testid conventions and the savings page's math model. The "six-term
  Kvar identity" assertion from PR-03 §7.5 is the within-page counterpart of
  the cross-page test added here.
- **`Work/Dashboard/savings/PR-03-savings-e2e.md`** §5 (selector
  inventory), §7.5 (the within-page identity spec), and the seeded users
  (`savingsEditor`, `savingsOrphan`) — this PR reuses both.
- **`docs/ai/savings-mvp-report.md`** §6 Q1/Q2/Q3 — the resolved contract.
- **`docs/ai/ai-changelog.md`** — the supersede entry naming `84d008c8` /
  `fff019ac` and the math each surface now uses. The contract-lock test's
  comment must reference that history so the next agent who tries to flip
  it has to read why.
- The actual committed BE math is the source of truth — inspect
  `BudgetDashboardProjector` and `BudgetMonthlyTotalsService` before
  writing the contract-lock tests.

## 3. Patterns to mirror

| Concern | Mirror this | Where it lives |
| --- | --- | --- |
| BE unit test on the dashboard projector | the existing class | `tests/Backend.UnitTests/Services/Budget/Projections/BudgetDashboardProjectorTests.cs` |
| BE unit test on the snapshot totals service | the existing class | `tests/Backend.UnitTests/Features/BudgetMonths/BudgetMonthlyTotalsServiceTests.cs` |
| Cross-page Playwright spec | `Frontend/e2e/savings/savings-balance-identity.spec.ts` (within-page identity from PR 3) and `Frontend/e2e/smoke/savings-load.spec.ts` (smoke-tag + seeded user) | `Frontend/e2e/` |
| Reading money values in E2E | the helper PR 3 introduced for the six-term identity | wherever the savings-balance-identity spec parses the displayed term |

If a helper does not exist for parsing the displayed money string, add a
small one (`Frontend/e2e/helpers/money.ts` or similar) — do not paste
`Number.parseFloat(text.replace(...))` snippets across specs.

## 4. Work to do

### 4.1 BE contract-lock test — projector

In `BudgetDashboardProjectorTests.cs`, add a test that explicitly names the
contract:

```csharp
[Fact]
public void Projects_TotalSavingsMonthly_AsBaseSavingsPlusActiveGoalContributions()
{
    // Contract guard for the supersede commit
    // (fix(budget): include goal contributions in savings total, supersedes
    // 84d008c8 + fff019ac). TotalSavingsMonthly is the total monthly
    // savings outflow — bassparande base PLUS active goal contributions.
    // Goals are independent commitments, not allocation detail of the base.
    //
    // If this test ever flips back to "base only", the dashboard's Kvar
    // will silently drift from the savings page's six-term identity again.
    // Read docs/ai/ai-changelog.md (2026-05-24 supersede entry) before
    // changing it.
    //
    // Given MonthlySavings = 3000 and active goals summing to 4000
    // Then  TotalSavingsMonthly = 7000
    // Then  FinalBalanceWithCarryMonthly = income + carry − expenses − 7000 − debts
}
```

Drive the test with the smallest in-memory fixture the existing tests use.
The numbers above mirror `devhistory@local.test`'s open-month seed so the
test reads like the bug report.

### 4.2 BE contract-lock test — snapshot totals service

In `BudgetMonthlyTotalsServiceTests.cs`, mirror the projector test for the
close-time snapshot. Same contract, same comment block, same fixture
numbers. Fences both the live read and the close-time write.

### 4.3 E2E cross-page parity spec

New file: `Frontend/e2e/smoke/savings-dashboard-parity.spec.ts`. Tag with
`@smoke` — this is a fast, critical-path regression that should gate every
PR.

```ts
test("dashboard Pengaläge equals savings page Kvar @smoke", async ({ page }) => {
  await login(page, e2eUsers.savingsEditor);

  await page.goto("/dashboard");
  const dashboardAmount = await readMoneyTextByTestId(
    page,
    "dashboard-pengalage-amount",
  );

  await page.goto("/dashboard/savings");
  const savingsAmount = await readMoneyTextByTestId(
    page,
    "savings-plan-balance-term-remaining",
  );

  expect(savingsAmount).toBe(dashboardAmount);
});
```

The exact testid for the dashboard "Pengaläge" amount must be confirmed
against the dashboard component. If it does not exist, add a single
`data-testid="dashboard-pengalage-amount"` to the displayed amount node
in the dashboard's hero/headline component — one-line additive change, no
behaviour modification.

> The seeded `savingsEditor` user already exists from PR 3. Use it. Do
> not seed a new user just for this spec.

### 4.4 Decimal-tolerance policy

Money equality should be **exact string match on the displayed text**, not
a numeric compare with a tolerance. The bug class this PR guards against is
"two surfaces show different numbers to the user" — and the user reads
text, not floats. If both surfaces round identically (which they must),
the strings match. If they don't, the spec fails for exactly the right
reason.

If the displayed strings legitimately differ on punctuation/locale (e.g.
`"−3 050,00 kr"` vs `"-3,050.00 kr"`), normalise both via a single helper
(`readMoneyTextByTestId` → strip currency suffix + non-digit/non-minus
chars → compare). Do not add a numeric tolerance.

## 5. What NOT to do

- Do **not** weaken or delete the existing test updates from the supersede
  commit. Those tests assert goals are included; this PR strengthens them
  with a named contract test, it doesn't replace them.
- Do **not** add tests to other money totals (expenses, debts) in this PR.
  This PR is about savings; widening it dilutes the regression net.
- Do **not** add `Math.Abs(...) < tolerance` checks. See §4.4.
- Do **not** introduce a new test runner, new fixture system, or new
  Playwright project. Use the existing `smoke` project and `IntegrationTestBase`
  patterns.
- Do **not** touch auth, Docker, Caddy, CI, or env config.

## 6. Acceptance criteria

- `BudgetDashboardProjectorTests` has a new test named explicitly after the
  contract (e.g. `Projects_TotalSavingsMonthly_AsBaseSavingsPlusActiveGoalContributions`),
  with a comment block naming the superseded commits and pointing to the
  changelog entry.
- `BudgetMonthlyTotalsServiceTests` has a mirror test for the snapshot side.
- `Frontend/e2e/smoke/savings-dashboard-parity.spec.ts` exists, tagged
  `@smoke`, passes against the seeded `savingsEditor` user.
- `npm run test:e2e:smoke` passes (includes the new parity spec).
- `dotnet test` for the two backend test projects passes.
- If a dashboard `data-testid` was added, it is the only production-code
  change in this PR.

## 7. Validation

```
# DB up (from repo root)
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d db

# BE
dotnet test tests/Backend.UnitTests/Backend.UnitTests.csproj \
  --filter "FullyQualifiedName~BudgetDashboardProjector|FullyQualifiedName~BudgetMonthlyTotalsService"

# E2E smoke
cd Frontend && npm run test:e2e:smoke
```

To prove the guards bite, before committing flip the production projector
back to "base only" locally and re-run the smoke + unit tests — both must
fail. Then revert the flip.

## 8. Wrap-up (repo rule)

1. Append a short entry to `docs/ai/ai-changelog.md` (date, what changed,
   files touched, risk = none).
2. Write the commit message to `COMMIT_MSG.tmp`, e.g.
   `test(savings): lock goals-included savings-total contract end-to-end`.
3. Stop. Do not commit or push.
