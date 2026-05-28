# PR 2.7 — Per-term testids on `SavingsPlanBalanceStrip`

| | |
| --- | --- |
| **Type** | Tiny additive FE change — `data-testid` props only |
| **Depends on** | Nothing |
| **Blocks** | PR 3 §7.5 (the six-term Kvar identity check). Without these testids the spec has to fall back to locale-dependent text matching, which the PR-03 brief forbids. |
| **Risk** | None — adds attributes, no behaviour change |
| **Branch** | current branch (`feature/PolishDashboardEditor`) — do not branch/worktree |

---

## 1. Why this PR exists

`SAVINGS-WIRING-AUDIT.md` §2 (Minor #1) and §5 flag this: the savings balance
strip exposes outer testids (`savings-plan-balance-strip`, `-headline`,
`-chip`, `-message`, `-breakdown`), but the seven individual `<dd>` cells
inside `-breakdown` are anonymous. PR 3 §7.5 asserts the six-term identity
`kvar == income + carry − expenses − base − goals − debts` and needs to read
each term by testid. Locale-dependent text selectors are explicitly forbidden
by PR-03 §3.

## 2. Read first

- **`Work/Dashboard/savings/SAVINGS-WIRING-AUDIT.md`** §5 — the exact list
  of missing testids and the convention to follow (`savings-*`).
- **`Work/Dashboard/savings/PR-03-savings-e2e.md`** §5 (selector inventory)
  and §7.5 (the identity assertion that consumes these testids).
- **`docs/ai/ai-changelog.md`** — for context on what PRs 1 / 2 / 2.5 / 2.6
  already shipped.
- The existing `SavingsPlanBalanceStrip.tsx` for the breakdown grid (around
  L201–238 per the audit) — confirm the actual map / loop generating the
  `<dd>` cells and which keys are present today.

## 3. What to change

`Frontend/src/Pages/private/savings/components/SavingsPlanBalanceStrip.tsx`
(path may differ slightly — find the file by component name).

For each term rendered in the breakdown grid, add
`data-testid="savings-plan-balance-term-<key>"` to the value `<dd>` (or the
wrapping element if that's the natural query target — match the existing
testid style elsewhere in the savings folder).

Required keys (use exactly these strings so PR 3 can hard-code them):

- `income`
- `carryOver`
- `expenses`
- `baseSavings`
- `goalSavings`
- `debtPayments`
- `remaining`  *(this is the Kvar value)*

If the breakdown currently iterates over a typed config array, the cleanest
shape is to add a `testIdKey` (or similar) to each entry in that array and
template the attribute once. If it's hand-rolled JSX, add the seven
attributes inline.

## 4. What NOT to do

- Do **not** rename the existing outer testids
  (`savings-plan-balance-strip`, etc.). PR 3 already depends on them.
- Do **not** rework the markup, restyle, refactor the component, or "tidy"
  the breakdown logic. This is a one-line-per-term change.
- Do **not** add testids to the headline or chip — they already have them.
- Do **not** touch any other savings component, the BE, auth, Docker,
  Caddy, or CI.

## 5. Acceptance criteria

- `grep -rn 'savings-plan-balance-term-' Frontend/src/Pages/private/savings/`
  returns exactly seven hits (one per key listed in §3).
- `npm run build` and the existing `SavingsEditorPage.balance.test.tsx`
  pass without changes. If a test happens to query a breakdown cell by
  text, leave the text query alone — the new testids are additive.
- No visual diff (run the page locally and confirm the breakdown looks
  identical).

## 6. Validation

```
cd Frontend && npm run build
cd Frontend && npm run test -- SavingsEditorPage.balance
grep -rn 'savings-plan-balance-term-' Frontend/src/Pages/private/savings/
```

## 7. Wrap-up (repo rule)

1. Append a one-line entry to `docs/ai/ai-changelog.md`.
2. Write the commit message to `COMMIT_MSG.tmp`, e.g.
   `chore(savings): add per-term testids to balance strip for e2e`.
3. Stop. Do not commit or push.
