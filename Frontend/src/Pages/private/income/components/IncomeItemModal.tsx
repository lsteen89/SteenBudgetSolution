import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { FormField } from "@/components/atoms/forms/FormField";
import { TextInput } from "@/components/atoms/InputField/TextInputv2";
import BudgetEntryModalShell from "@/components/molecules/forms/budgetEditor/BudgetEntryModalShell";
import EditorPreviewCard from "@/components/molecules/forms/budgetEditor/EditorPreviewCard";
import MoneyInput from "@/components/molecules/forms/budgetEditor/MoneyInput";
import EditScopeRadioCards from "@/components/molecules/forms/editScope/EditScopeRadioCards";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type {
  BudgetMonthIncomeItemEditorRowDto,
  BudgetMonthIncomeItemKind,
  IncomeCreateScope,
  IncomeEditScope,
} from "@/types/budget/BudgetMonthsStatusDto";
import { incomeItemModalDict } from "@/utils/i18n/pages/private/income/IncomeItemModal.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { parseMoneyInput } from "@/utils/money/moneyInput";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import IncomeCreateScopeCards from "./IncomeCreateScopeCards";

type IncomeItemModalProps = {
  open: boolean;
  mode: "create" | "edit";
  row: BudgetMonthIncomeItemEditorRowDto | null;
  monthLabel: string;
  isSaving?: boolean;
  /**
   * Optional kind to preselect when opening the create drawer. Used by the
   * per-group `Lägg till` button so a click on Sidoinkomst's add seeds the
   * selector with `sideHustle` instead of always defaulting to it.
   *
   * Also drives the PR 4 distinction between global add (hero CTA, kind
   * unknown → type selector visible) and group add (kind known → type
   * selector hidden, subtitle copy changes accordingly). Ignored in edit
   * mode.
   */
  presetKind?: Exclude<BudgetMonthIncomeItemKind, "salary"> | null;
  onClose: () => void;
  /**
   * Discriminated by `mode` so `kind` is genuinely create-only. The previous
   * shape forced edits to invent a `kind` value (defaulting to `sideHustle`
   * even when editing salary), which lied about the modal's contract — the
   * patch endpoint ignores `kind` entirely. Keeping these as two distinct
   * shapes makes the wire payload honest and lets the parent narrow on
   * `mode` instead of carrying dead fields.
   */
  onSubmit: (values: IncomeItemSubmitValues) => Promise<void>;
};

export type IncomeItemSubmitValues =
  | {
      mode: "create";
      kind: Exclude<BudgetMonthIncomeItemKind, "salary">;
      name: string;
      amountMonthly: number;
      // Whether this counts in the CURRENT open month. Separate from
      // `scope` on purpose — the active toggle controls month inclusion,
      // the scope controls plan participation.
      isActive: boolean;
      // Narrower than the edit-scope union: only `currentMonthOnly` and
      // `currentMonthAndBudgetPlan` reach the create endpoint.
      scope: IncomeCreateScope;
    }
  | {
      mode: "edit";
      name: string;
      amountMonthly: number;
      isActive: boolean;
      scope?: IncomeEditScope;
    };

const interpolate = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");

export default function IncomeItemModal({
  open,
  mode,
  row,
  monthLabel,
  isSaving = false,
  presetKind = null,
  onClose,
  onSubmit,
}: IncomeItemModalProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof incomeItemModalDict.sv>(key: K) =>
    tDict(key, locale, incomeItemModalDict);

  const [kind, setKind] =
    useState<Exclude<BudgetMonthIncomeItemKind, "salary">>("sideHustle");
  const [name, setName] = useState("");
  const [amountMonthly, setAmountMonthly] = useState("");
  const [isActive, setIsActive] = useState(true);
  // Edit scope: full three-value union; defaults to `currentMonthOnly` so
  // a stale local state never leaks plan writes on close/reopen.
  const [scope, setScope] = useState<IncomeEditScope>("currentMonthOnly");
  // Create scope: two-value narrower union. Defaults to the recurring
  // choice because income is usually recurring; month-only is the
  // intentional alternative. Stored separately from `scope` so toggling
  // between the create and edit drawers (same component, different mode)
  // never lets one path overwrite the other's last selection.
  const [createScope, setCreateScope] = useState<IncomeCreateScope>(
    "currentMonthAndBudgetPlan",
  );
  const [error, setError] = useState<string | null>(null);

  const isSalary = mode === "edit" && row?.kind === "salary";
  // Plan-writing scopes are only meaningful when the backend will actually
  // accept them: the row must be linked to a plan source row AND the read
  // model must say the user can update the default. Salary has no scope
  // cards at all (the handover places salary on its own special track), so
  // it's excluded explicitly even though the value is unused for it.
  const canUpdatePlan =
    mode === "edit" &&
    !isSalary &&
    !!row?.canUpdateDefault &&
    row?.sourceIncomeItemId != null;

  // Hide the type selector when the drawer was opened from a group's
  // `Lägg till` (i.e. the kind is already known). Global add (hero CTA)
  // leaves it visible so the user picks the type here. Edit mode never
  // shows the selector — the row's kind is fixed.
  const showKindSelector = mode === "create" && presetKind === null;

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && row) {
      setKind(row.kind === "householdMember" ? "householdMember" : "sideHustle");
      setName(row.name);
      setAmountMonthly(String(row.amountMonthly));
      setIsActive(row.isActive);
      setScope("currentMonthOnly");
      // Reset create scope to the recurring default on every reopen so a
      // previously-opened create drawer never carries last-selected state
      // into a follow-up edit-then-create flow.
      setCreateScope("currentMonthAndBudgetPlan");
      setError(null);
      return;
    }

    // Group add seeds `presetKind`; global add does not. Falling back to
    // `sideHustle` preserves the previous default for the hero CTA.
    setKind(presetKind ?? "sideHustle");
    setName("");
    setAmountMonthly("");
    setIsActive(true);
    setScope("currentMonthOnly");
    setCreateScope("currentMonthAndBudgetPlan");
    setError(null);
  }, [mode, open, row, presetKind]);

  const canClose = !isSaving;

  useEffect(() => {
    if (!open || !canClose) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, canClose, onClose]);

  const title = mode === "create" ? t("titleCreate") : t("titleEdit");
  const description =
    mode === "edit"
      ? t("descriptionEdit")
      : interpolate(
          presetKind === null
            ? t("descriptionCreateGlobal")
            : t("descriptionCreateGroup"),
          { month: monthLabel },
        );

  const parsedAmount = useMemo(
    () =>
      parseMoneyInput(amountMonthly, {
        allowNegative: false,
        maxDecimals: 2,
      }),
    [amountMonthly],
  );

  // Preview content. Honest by construction:
  //   - title comes from the form field (salary uses the row's name, since
  //     salary's name is locked anyway)
  //   - subtitle is the localized kind label (Lön / Sidoinkomst / Hushållsinkomst)
  //   - amount is the parsed input (or 0 if the user hasn't typed yet)
  //   - status copy reflects whether the saved row will count this month
  //
  // We deliberately do NOT show a "Budgetplanen framåt" column here — that
  // requires the source-plan read-model fields from PR 5. Until those land,
  // the preview is single-column and only describes the current month so
  // we never imply a future plan delta we can't compute.
  const previewKind: BudgetMonthIncomeItemKind = isSalary
    ? "salary"
    : kind;
  const previewSubtitle =
    previewKind === "salary"
      ? t("previewSubtitleSalary")
      : previewKind === "householdMember"
        ? t("previewSubtitleHouseholdMember")
        : t("previewSubtitleSideHustle");
  const previewTitle = isSalary
    ? row?.name ?? t("previewUntitled")
    : name.trim() || t("previewUntitled");
  const previewAmountValue = parsedAmount ?? 0;
  const previewAmountFormatted = formatMoneyV2(
    previewAmountValue,
    currency,
    locale,
    { fractionDigits: 0 },
  );
  const previewIsActive = isSalary ? true : isActive;
  const previewStatus = previewIsActive
    ? interpolate(t("previewStatusActive"), { month: monthLabel })
    : t("previewStatusInactive");
  // Scope-aware extra preview line, create-mode only. Reflects the user's
  // plan-vs-month choice independently from the active toggle: e.g. a
  // recurring row that's inactive THIS month still shows "Återkommande i
  // budgetplanen" because the plan row will exist and pull into future
  // months. Edit mode keeps the existing single-status preview shape.
  const previewScopeStatus =
    mode === "create"
      ? createScope === "currentMonthAndBudgetPlan"
        ? t("previewScopeCurrentMonthAndBudgetPlan")
        : t("previewScopeCurrentMonthOnly")
      : null;

  if (!open) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isSalary && name.trim().length === 0) {
      setError(t("nameRequired"));
      return;
    }

    if (parsedAmount === null) {
      setError(t("amountInvalid"));
      return;
    }

    if (mode === "create") {
      // `scope` is required on the create wire payload. `isActive` is the
      // current-month inclusion choice — independent. The backend handler
      // forces the plan row active when the scope writes the plan, so
      // `isActive=false + currentMonthAndBudgetPlan` correctly means
      // "skip THIS month, recur from next month".
      await onSubmit({
        mode: "create",
        kind,
        name: name.trim(),
        amountMonthly: parsedAmount,
        isActive,
        scope: createScope,
      });
      return;
    }

    // Edit mode never carries `kind` — the patch endpoint ignores it and
    // including it would force salary edits to either lie about the row
    // kind or invent a non-salary value. Salary edits also omit `scope`:
    // salary has no scope cards, so the parent's existing fallback of
    // `currentMonthOnly` is the only correct wire value.
    await onSubmit({
      mode: "edit",
      // Salary's name is locked; submit the row's stable name back so a
      // stale local string can never drift onto the wire.
      name: isSalary ? row?.name ?? "Net salary" : name.trim(),
      amountMonthly: parsedAmount,
      // Salary is always active by backend invariant — never let a stale
      // local toggle leak into the payload.
      isActive: isSalary ? true : isActive,
      scope: isSalary ? undefined : scope,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[90]"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !canClose) return;

        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <button
        type="button"
        aria-label={t("closeAriaLabel")}
        onClick={canClose ? onClose : undefined}
        disabled={!canClose}
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(21,39,81,0.18),rgba(21,39,81,0.52))]"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-[680px]">
          <BudgetEntryModalShell
            titleId="income-item-modal-title"
            descriptionId="income-item-modal-description"
            eyebrow={t("eyebrow")}
            title={title}
            context={monthLabel}
            description={description}
            closeAriaLabel={t("closeAriaLabel")}
            canClose={canClose}
            onClose={onClose}
            footer={
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={!canClose}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/25 px-4 text-sm font-medium text-eb-text/70 transition hover:bg-[rgb(var(--eb-shell)/0.28)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("cancel")}
                </button>
                <CtaButton
                  type="submit"
                  form="income-item-form"
                  disabled={isSaving}
                  aria-busy={isSaving}
                  className="h-11"
                >
                  {isSaving
                    ? t("saving")
                    : mode === "create"
                      ? t("create")
                      : t("saveChanges")}
                </CtaButton>
              </div>
            }
          >
            {/*
              Drawer order (handover): fields → status → scope → preview →
              footer. The footer lives in `BudgetEntryModalShell`. Salary
              gets the same row of fields/status but with the disabled-and-
              explained variants; the scope step is omitted entirely.
            */}
            <form
              id="income-item-form"
              onSubmit={submit}
              className="grid gap-3.5"
              noValidate
            >
              {/* 1. Fields */}
              {showKindSelector ? (
                <FormField label={t("kindLabel")} htmlFor="income-kind">
                  <select
                    id="income-kind"
                    value={kind}
                    onChange={(event) =>
                      setKind(
                        event.target.value as Exclude<
                          BudgetMonthIncomeItemKind,
                          "salary"
                        >,
                      )
                    }
                    className="flex h-11 w-full rounded-2xl border border-eb-stroke/25 bg-eb-surface px-4 text-sm text-eb-text outline-none transition focus:border-eb-stroke/40 focus:ring-2 focus:ring-[rgb(var(--eb-accent)/0.16)]"
                  >
                    <option value="sideHustle">{t("sideHustleOption")}</option>
                    <option value="householdMember">
                      {t("householdMemberOption")}
                    </option>
                  </select>
                </FormField>
              ) : null}

              <div className="grid gap-1.5">
                <FormField label={t("nameLabel")} htmlFor="income-name">
                  <TextInput
                    id="income-name"
                    value={isSalary ? row?.name ?? "" : name}
                    onChange={(event) => setName(event.target.value)}
                    // `readOnly` is the right primitive here: the input is
                    // still focusable and screen-reader-readable, the user
                    // can tab through and select the text, but typing does
                    // nothing. (Earlier revision forced a blur on focus —
                    // that broke keyboard nav by making focus appear to
                    // vanish.) `<input readonly>` already exposes the
                    // read-only state to AT, so no extra `aria-readonly`
                    // is needed.
                    readOnly={isSalary}
                    aria-describedby={
                      isSalary ? "income-name-hint" : undefined
                    }
                    autoComplete="off"
                    className={
                      isSalary
                        ? "cursor-not-allowed bg-[rgb(var(--eb-shell)/0.32)] text-eb-text/65"
                        : undefined
                    }
                  />
                </FormField>
                {isSalary ? (
                  <p
                    id="income-name-hint"
                    data-testid="income-item-modal-salary-name-hint"
                    className="px-1 text-[11.5px] leading-snug text-eb-text/55"
                  >
                    {t("salaryNameHint")}
                  </p>
                ) : null}
              </div>

              <FormField label={t("amountLabel")} htmlFor="income-amount">
                <MoneyInput
                  id="income-amount"
                  value={amountMonthly}
                  onChange={(event) => setAmountMonthly(event.target.value)}
                />
              </FormField>

              {/* 2. Active / month status */}
              <div className="grid gap-1.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={previewIsActive}
                  aria-disabled={isSalary || undefined}
                  data-testid="income-item-modal-active-toggle"
                  onClick={
                    isSalary ? undefined : () => setIsActive((value) => !value)
                  }
                  disabled={isSalary}
                  aria-describedby={
                    isSalary ? "income-active-hint" : undefined
                  }
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                    previewIsActive
                      ? "border-[rgb(var(--eb-accent)/0.24)] bg-[rgb(var(--eb-accent)/0.08)]"
                      : "border-amber-200/80 bg-amber-50/70",
                    isSalary && "cursor-not-allowed opacity-80",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-eb-text">
                      {t("activeLabel")}
                    </span>
                    {/*
                      Side/household rows show the generic activate/deactivate
                      description inside the switch. Salary skips it entirely
                      — the salary hint paragraph below already says the
                      toggle is locked to active, so rendering
                      "Stäng av om posten inte ska räknas denna månad."
                      next to a locked-on switch read as contradictory copy.
                    */}
                    {isSalary ? null : (
                      <span className="mt-0.5 block text-xs font-medium leading-snug text-eb-text/58">
                        {previewIsActive
                          ? t("activeDescription")
                          : t("inactiveDescription")}
                      </span>
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "relative inline-flex h-8 w-14 shrink-0 rounded-full border transition",
                      previewIsActive
                        ? "border-[rgb(var(--eb-accent)/0.40)] bg-[rgb(var(--eb-accent)/0.34)]"
                        : "border-amber-300 bg-amber-200/90",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1 h-6 w-6 rounded-full bg-white shadow-[0_6px_14px_rgba(21,39,81,0.20)] transition-all",
                        previewIsActive ? "left-7" : "left-1",
                      )}
                    />
                  </span>
                </button>
                {isSalary ? (
                  <p
                    id="income-active-hint"
                    data-testid="income-item-modal-salary-active-hint"
                    className="px-1 text-[11.5px] leading-snug text-eb-text/55"
                  >
                    {t("salaryActiveHint")}
                  </p>
                ) : null}
              </div>

              {/*
                3. Scope.
                Create mode shows the narrower two-card create scope
                selector (no `budgetPlanOnly` — see `IncomeCreateScope`
                type). Edit mode keeps the shared three-card edit scope
                cards. Salary edit omits scope entirely per the handover
                (salary has no scope cards).
              */}
              {mode === "create" ? (
                <IncomeCreateScopeCards
                  value={createScope}
                  onChange={setCreateScope}
                  monthLabel={monthLabel}
                  legend={t("createScopeLegend")}
                  currentMonthOnlyLabel={t("createScopeCurrentMonthOnlyLabel")}
                  currentMonthOnlyHelp={t("createScopeCurrentMonthOnlyHelp")}
                  currentMonthAndBudgetPlanLabel={t(
                    "createScopeCurrentMonthAndBudgetPlanLabel",
                  )}
                  currentMonthAndBudgetPlanHelp={t(
                    "createScopeCurrentMonthAndBudgetPlanHelp",
                  )}
                  disabled={isSaving}
                  testId="income-item-modal-create-scope"
                />
              ) : isSalary ? null : (
                <EditScopeRadioCards
                  value={scope}
                  onChange={setScope}
                  monthLabel={monthLabel}
                  canUpdatePlan={canUpdatePlan}
                  disabledPlanHint={t("scopePlanDisabledHint")}
                  disabled={isSaving}
                  testId="income-item-modal-scope-toggle"
                />
              )}

              {/*
                4. Live preview.
                In create mode the preview adds a second line below the
                main row carrying the scope choice — so the user sees both
                "Räknas/inte räknas i månaden" (top, driven by the active
                toggle) and "Återkommande / Bara denna månad" (bottom,
                driven by the scope cards) without one collapsing into
                the other. Edit mode keeps the original single-status
                shape.
              */}
              <EditorPreviewCard
                label={t("previewLabel")}
                title={previewTitle}
                subtitle={previewSubtitle}
                amount={previewAmountFormatted}
                status={previewStatus}
                muted={!previewIsActive}
              >
                {previewScopeStatus ? (
                  <div
                    data-testid="income-item-modal-preview-scope"
                    className="text-xs font-semibold text-eb-text/68"
                  >
                    {previewScopeStatus}
                  </div>
                ) : null}
              </EditorPreviewCard>

              {error ? (
                <p className="text-sm font-semibold text-red-500">{error}</p>
              ) : null}
            </form>
          </BudgetEntryModalShell>
        </div>
      </div>
    </div>
  );
}
