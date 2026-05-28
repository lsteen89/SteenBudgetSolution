import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { FormField } from "@/components/atoms/forms/FormField";
import { TextInput } from "@/components/atoms/InputField/TextInputv2";
import BudgetEntryModalShell from "@/components/molecules/forms/budgetEditor/BudgetEntryModalShell";
import MoneyInput from "@/components/molecules/forms/budgetEditor/MoneyInput";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type {
  BudgetMonthSavingsGoalEditorRowDto,
  SavingsGoalTransferDirection,
} from "@/types/budget/BudgetMonthsStatusDto";
import type {
  SavingsMethodCode,
  SavingsMethodDto,
} from "@/types/budget/SavingsMethodDto";
import { isSavingsMethodCode } from "@/types/budget/SavingsMethodDto";
import { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";
import { savingsGoalTransferModalDict } from "@/utils/i18n/pages/private/savings/SavingsGoalTransferModal.i18n";
import { tDict } from "@/utils/i18n/translate";
import { parseMoneyInput } from "@/utils/money/moneyInput";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";

/**
 * V2 PR-09 — "Engångsöverföring" focused modal.
 *
 * Wires the deposit / withdraw chip on each goal card to the new
 * `POST .../savings-goals/{id}/transfer` endpoint. The modal is the
 * sole surface that mutates a goal's running `AmountSaved` outside of
 * goal creation and the close-month accumulation.
 *
 * Design intent (see `/Work/Dashboard/savings/PR-09-fe-one-time-transfer-modal.md`):
 *   - One modal, one mutation, no scope strip — the "snapshot vs plan"
 *     decision is made BE-side by always writing both rows when the
 *     goal links to a plan baseline.
 *   - The chosen counter-account is persisted only in the audit note as
 *     a structured prefix (`counterAccount: …`) — there is no
 *     per-transfer column on the row.
 *   - Withdrawals that would push `AmountSaved` below zero are blocked
 *     inline BEFORE the round-trip to avoid a known-bad submission, and
 *     the BE also rejects them as defence in depth.
 */

export type SavingsGoalTransferSavePayload = {
  amount: number;
  direction: SavingsGoalTransferDirection;
  /** Structured note destined for the audit log; never null. */
  note: string;
};

type SavingsGoalTransferModalProps = {
  open: boolean;
  row: BudgetMonthSavingsGoalEditorRowDto | null;
  monthLabel: string;
  methods: readonly SavingsMethodDto[] | undefined;
  isSaving?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (values: SavingsGoalTransferSavePayload) => Promise<void> | void;
};

type FieldErrors = {
  amount?: string;
  source?: string;
};

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

const QUICK_FILL_VALUES = [500, 1000, 2500, 5000] as const;
const MAX_AMOUNT = 10_000_000;
const NOTE_MAX_LENGTH = 200;

function formatNumberForInput(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function formatDateForInput(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : "";
}

function formatIsoDateForDisplay(value: string, locale: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function SavingsGoalTransferModal({
  open,
  row,
  monthLabel,
  methods,
  isSaving = false,
  errorMessage,
  onClose,
  onSubmit,
}: SavingsGoalTransferModalProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof savingsGoalTransferModalDict.sv>(key: K) =>
    tDict(key, locale, savingsGoalTransferModalDict);
  const tPage = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);
  const reactId = useId();

  const [direction, setDirection] =
    useState<SavingsGoalTransferDirection>("deposit");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const sourceOptions = useMemo(
    () => buildSourceOptions(methods, (code) => labelForMethodCode(code, tPage)),
    [methods, tPage],
  );

  // Reset transient state every time the modal re-opens against a new
  // row. We don't reset on every render so the user's keystrokes are
  // preserved while the modal is open and the goal hasn't changed.
  useEffect(() => {
    if (!open || !row) return;
    setDirection("deposit");
    setAmount("");
    setNote("");
    setErrors({});
    setSource((current) => {
      if (current && sourceOptions.some((option) => option.value === current)) {
        return current;
      }
      return sourceOptions[0]?.value ?? "";
    });
    // We intentionally do not depend on `sourceOptions` here — the
    // method list can re-fetch behind the modal and we don't want to
    // stomp the user's pick on every refetch. Initialise once per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row]);

  // Keep `source` honest against the live options list:
  //   - When the modal opens before the methods query resolves, pick the
  //     first option as soon as one lands.
  //   - When a methods refetch drops the currently-selected method (e.g.
  //     the user removed it in another tab), reset to the new head so the
  //     audit note never carries a stale id. Without this guard the
  //     submit branch below would fall back to the raw id string in the
  //     audit `counterAccount:` prefix.
  useEffect(() => {
    if (!open) return;
    if (sourceOptions.length === 0) {
      if (source) setSource("");
      return;
    }
    const stillValid = sourceOptions.some((option) => option.value === source);
    if (!stillValid) {
      setSource(sourceOptions[0].value);
    }
  }, [open, source, sourceOptions]);

  const parsedAmount = useMemo(
    () => parseMoneyInput(amount, { allowNegative: false, maxDecimals: 2 }),
    [amount],
  );

  const fmtMoney = useMemo(
    () => (value: number) =>
      formatMoneyV2(value, currency, locale, {
        fractionDigits: moneyDecimalsFor(value),
      }),
    [currency, locale],
  );

  const saved = row?.amountSaved ?? 0;
  const target = row?.targetAmount ?? null;
  const signedDelta =
    parsedAmount != null && parsedAmount > 0
      ? direction === "deposit"
        ? parsedAmount
        : -parsedAmount
      : 0;
  const projectedSaved = saved + signedDelta;
  const withdrawTooMuch =
    direction === "withdraw" &&
    parsedAmount != null &&
    parsedAmount > 0 &&
    projectedSaved < 0;

  const outcomeText = useMemo(
    () =>
      buildOutcomeText({
        direction,
        parsedAmount,
        saved,
        target,
        fmtMoney,
        t,
      }),
    [direction, parsedAmount, saved, target, fmtMoney, t],
  );

  const snapshotSaved = fmtMoney(saved);
  const snapshotTarget = target != null ? fmtMoney(target) : "—";
  const snapshotDeadline =
    formatIsoDateForDisplay(formatDateForInput(row?.targetDate), locale) ||
    t("snapshotDeadlineOngoing");

  const sourceLabel = direction === "deposit" ? t("sourceLabel") : t("targetLabel");

  const sourceLabelByValue = useMemo(() => {
    const map = new Map<string, string>();
    sourceOptions.forEach((option) => map.set(option.value, option.label));
    return map;
  }, [sourceOptions]);

  const updateAmount = (next: string) => {
    setAmount(next);
    if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
  };

  const updateSource = (next: string) => {
    setSource(next);
    if (errors.source) setErrors((prev) => ({ ...prev, source: undefined }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    if (!row) return;

    const next: FieldErrors = {};
    if (parsedAmount == null) {
      next.amount = amount.trim().length === 0
        ? t("amountRequired")
        : t("amountInvalid");
    } else if (parsedAmount <= 0) {
      next.amount = t("amountNotPositive");
    } else if (parsedAmount > MAX_AMOUNT) {
      next.amount = t("amountTooLarge");
    }
    if (!source) {
      next.source = t("sourceRequired");
    }
    if (withdrawTooMuch) {
      // Tracked separately below the input — don't double-report under
      // the amount field.
    }
    if (next.amount || next.source) {
      setErrors(next);
      return;
    }
    if (withdrawTooMuch) {
      // Already surfaced by the inline guard panel.
      return;
    }

    setErrors({});
    // Resolve the human label before composing. If the methods list has
    // refetched out from under us and dropped this id, the label-clear
    // effect above has already reset `source`, but defend against a race
    // by refusing to submit a note that would carry an opaque id.
    const sourceLabelForNote = sourceLabelByValue.get(source);
    if (!sourceLabelForNote) {
      setErrors({ source: t("sourceRequired") });
      return;
    }

    // Compose the structured audit note. The counterAccount prefix is the
    // anchor a future "transactions" view will read; user-supplied text
    // is appended. Three layers of length defence:
    //   1. Cap the label itself so the prefix never alone overflows the
    //      BE's 200-char limit (a very long custom method name could).
    //   2. Cap the user tail at the remaining budget.
    //   3. Final slice as belt-and-braces.
    const PREFIX = "counterAccount: ";
    const SEPARATOR = " · ";
    const labelBudget = Math.max(
      8,
      NOTE_MAX_LENGTH - PREFIX.length - SEPARATOR.length - 1,
    );
    const safeLabel = sourceLabelForNote.slice(0, labelBudget);
    const prefix = `${PREFIX}${safeLabel}`;
    const trimmedNote = note.trim();
    let composedNote = prefix;
    if (trimmedNote.length > 0) {
      const tailBudget = NOTE_MAX_LENGTH - prefix.length - SEPARATOR.length;
      if (tailBudget > 0) {
        composedNote = `${prefix}${SEPARATOR}${trimmedNote.slice(0, tailBudget)}`;
      }
    }
    if (composedNote.length > NOTE_MAX_LENGTH) {
      composedNote = composedNote.slice(0, NOTE_MAX_LENGTH);
    }

    await onSubmit({
      amount: parsedAmount!,
      direction,
      note: composedNote,
    });
  };

  if (!open || !row) return null;

  const directionDepositId = `${reactId}-direction-deposit`;
  const directionWithdrawId = `${reactId}-direction-withdraw`;
  const amountInputId = `${reactId}-amount`;
  const sourceSelectId = `${reactId}-source`;
  const noteInputId = `${reactId}-note`;

  const saveLabel = (() => {
    if (isSaving) return t("saving");
    const hasAmount = parsedAmount != null && parsedAmount > 0;
    if (direction === "deposit") {
      return hasAmount
        ? interpolate(t("saveDepositWithAmount"), {
            amount: fmtMoney(parsedAmount!),
          })
        : t("saveDeposit");
    }
    return hasAmount
      ? interpolate(t("saveWithdrawWithAmount"), {
          amount: fmtMoney(parsedAmount!),
        })
      : t("saveWithdraw");
  })();

  const saveDisabled =
    isSaving ||
    parsedAmount == null ||
    parsedAmount <= 0 ||
    parsedAmount > MAX_AMOUNT ||
    !source ||
    withdrawTooMuch;

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label={t("closeAriaLabel")}
        data-testid="savings-goal-transfer-backdrop"
        onClick={isSaving ? undefined : onClose}
        disabled={isSaving}
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(21,39,81,0.18),rgba(21,39,81,0.52))]"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-[560px]">
          <BudgetEntryModalShell
            titleId="savings-goal-transfer-modal-title"
            descriptionId="savings-goal-transfer-modal-description"
            eyebrow={t("eyebrow")}
            title={t("title")}
            context={`${row.name} · ${monthLabel}`}
            description={t("description")}
            closeAriaLabel={t("closeAriaLabel")}
            canClose={!isSaving}
            onClose={onClose}
            footer={
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-medium text-eb-text/45">
                  {t("footerNote")}
                </span>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/25 px-4 text-sm font-medium text-eb-text/70 transition hover:bg-[rgb(var(--eb-shell)/0.28)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("cancel")}
                  </button>
                  <CtaButton
                    type="submit"
                    form="savings-goal-transfer-form"
                    disabled={saveDisabled}
                    aria-busy={isSaving}
                    className="h-11"
                    data-testid="savings-goal-transfer-save"
                  >
                    {saveLabel}
                  </CtaButton>
                </div>
              </div>
            }
          >
            <form
              id="savings-goal-transfer-form"
              onSubmit={submit}
              className="grid gap-3.5"
              noValidate
            >
              <SnapshotDl
                saved={snapshotSaved}
                target={snapshotTarget}
                deadline={snapshotDeadline}
                labels={{
                  saved: t("snapshotSavedLabel"),
                  target: t("snapshotTargetLabel"),
                  deadline: t("snapshotDeadlineLabel"),
                }}
              />

              <div
                role="radiogroup"
                aria-label={t("title")}
                data-testid="savings-goal-transfer-direction"
                className="grid grid-cols-2 gap-1 rounded-2xl border border-eb-stroke/40 bg-[rgb(var(--eb-shell)/0.18)] p-1"
              >
                <DirectionOption
                  id={directionDepositId}
                  name={`${reactId}-direction`}
                  checked={direction === "deposit"}
                  onChange={() => setDirection("deposit")}
                  disabled={isSaving}
                  label={t("directionDeposit")}
                  tone="deposit"
                />
                <DirectionOption
                  id={directionWithdrawId}
                  name={`${reactId}-direction`}
                  checked={direction === "withdraw"}
                  onChange={() => setDirection("withdraw")}
                  disabled={isSaving}
                  label={t("directionWithdraw")}
                  tone="withdraw"
                />
              </div>

              <FormField
                label={t("amountLabel")}
                htmlFor={amountInputId}
                error={errors.amount}
              >
                <div className="flex items-baseline gap-2 rounded-2xl border border-eb-stroke/40 bg-eb-surface px-3.5 py-2.5">
                  <MoneyInput
                    id={amountInputId}
                    value={amount}
                    onChange={(event) => updateAmount(event.target.value)}
                    disabled={isSaving}
                    placeholder="0"
                    className="h-12 flex-1 border-0 bg-transparent p-0 text-right text-[26px] font-extrabold tracking-tight focus:ring-0"
                    aria-invalid={errors.amount ? "true" : undefined}
                  />
                  <span className="text-[15px] font-semibold text-eb-text/45">
                    {t("amountUnit")}
                  </span>
                </div>
                <QuickFillRow
                  label={t("quickFillLabel")}
                  disabled={isSaving}
                  onPick={(value) => updateAmount(String(value))}
                />
              </FormField>

              {withdrawTooMuch ? (
                <div
                  role="status"
                  data-testid="savings-goal-transfer-withdraw-warning"
                  className="rounded-2xl border border-amber-300/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-900"
                >
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-800/80">
                    {t("withdrawTooMuchLabel")}
                  </span>
                  <span className="mt-1 block">
                    {interpolate(t("withdrawTooMuch"), {
                      available: fmtMoney(saved),
                    })}
                  </span>
                </div>
              ) : null}

              <FormField
                label={sourceLabel}
                htmlFor={sourceSelectId}
                error={errors.source}
              >
                <SourceSelect
                  id={sourceSelectId}
                  value={source}
                  options={sourceOptions}
                  placeholder={t("sourcePlaceholder")}
                  disabled={isSaving}
                  onChange={updateSource}
                  invalid={!!errors.source}
                />
              </FormField>

              <FormField
                label={t("noteLabel")}
                htmlFor={noteInputId}
                hint={t("noteHint")}
              >
                <TextInput
                  id={noteInputId}
                  type="text"
                  value={note}
                  maxLength={NOTE_MAX_LENGTH}
                  disabled={isSaving}
                  placeholder={t("notePlaceholder")}
                  onChange={(event) => setNote(event.target.value)}
                />
              </FormField>

              <div
                role="status"
                aria-live="polite"
                data-testid="savings-goal-transfer-outcome"
                className={cn(
                  "rounded-2xl border px-4 py-3 text-[13px] leading-relaxed",
                  withdrawTooMuch
                    ? "border-amber-300/70 bg-amber-50/80 text-amber-900"
                    : direction === "withdraw" && parsedAmount != null && parsedAmount > 0
                      ? "border-eb-stroke/40 bg-[rgb(var(--eb-shell)/0.28)] text-eb-text"
                      : "border-eb-accent/20 bg-eb-accentSoft text-[#14532d]",
                )}
              >
                <span
                  className={cn(
                    "block text-[11px] font-semibold uppercase tracking-[0.12em]",
                    withdrawTooMuch
                      ? "text-amber-800/80"
                      : direction === "withdraw" && parsedAmount != null && parsedAmount > 0
                        ? "text-eb-text/55"
                        : "text-[#14532d]/70",
                  )}
                >
                  {t("outcomeLabel")}
                </span>
                <span className="mt-1 block font-semibold">{outcomeText}</span>
              </div>

              {errorMessage ? (
                <p
                  role="alert"
                  data-testid="savings-goal-transfer-error"
                  className="rounded-2xl border border-eb-danger/30 bg-[rgb(var(--eb-danger)/0.06)] px-4 py-2.5 text-sm font-medium text-eb-danger"
                >
                  {errorMessage}
                </p>
              ) : null}
            </form>
          </BudgetEntryModalShell>
        </div>
      </div>
    </div>
  );
}

function buildOutcomeText({
  direction,
  parsedAmount,
  saved,
  target,
  fmtMoney,
  t,
}: {
  direction: SavingsGoalTransferDirection;
  parsedAmount: number | null;
  saved: number;
  target: number | null;
  fmtMoney: (value: number) => string;
  t: <K extends keyof typeof savingsGoalTransferModalDict.sv>(key: K) => string;
}) {
  if (parsedAmount == null || parsedAmount <= 0) return t("outcomeEmpty");

  const signed = direction === "deposit" ? parsedAmount : -parsedAmount;
  const next = saved + signed;

  if (target == null || target <= 0) {
    return direction === "deposit"
      ? interpolate(t("outcomeDepositOngoing"), { next: fmtMoney(next) })
      : interpolate(t("outcomeWithdrawOngoing"), { next: fmtMoney(next) });
  }

  if (direction === "deposit" && next > target) {
    return interpolate(t("outcomeOverTarget"), {
      next: fmtMoney(next),
      over: fmtMoney(next - target),
    });
  }

  const remaining = Math.max(0, target - next);
  const pct = Math.max(0, Math.round((next / target) * 100));
  if (direction === "deposit") {
    return interpolate(t("outcomeDeposit"), {
      next: fmtMoney(next),
      pct,
      remaining: fmtMoney(remaining),
    });
  }
  return interpolate(t("outcomeWithdraw"), {
    next: fmtMoney(next),
    remaining: fmtMoney(remaining),
  });
}

type SourceOption = { value: string; label: string };

function buildSourceOptions(
  methods: readonly SavingsMethodDto[] | undefined,
  labelForCode: (code: SavingsMethodCode) => string,
): SourceOption[] {
  if (!methods?.length) return [];
  const seen = new Set<string>();
  const options: SourceOption[] = [];
  for (const row of methods) {
    if (!row || typeof row.id !== "string" || row.id.length === 0) continue;
    if (!isSavingsMethodCode(row.code)) continue;

    let label: string;
    if (row.code === "custom") {
      label =
        typeof row.customLabel === "string" ? row.customLabel.trim() : "";
    } else {
      label = labelForCode(row.code).trim();
    }
    if (!label) continue;
    // De-duplicate by visible label so two ISK rows do not render twice
    // in the select; the note prefix uses the label so duplicates would
    // produce identical audit rows anyway.
    if (seen.has(label)) continue;
    seen.add(label);
    options.push({ value: row.id, label });
  }
  return options;
}

function labelForMethodCode(
  code: SavingsMethodCode,
  tPage: <K extends keyof typeof savingsEditorPageDict.sv>(key: K) => string,
): string {
  switch (code) {
    case "savings_account":
      return tPage("methodSavingsAccount");
    case "isk":
      return tPage("methodIsk");
    case "funds":
      return tPage("methodFunds");
    case "cash":
      return tPage("methodCash");
    case "custom":
      return "";
  }
}

function DirectionOption({
  id,
  name,
  checked,
  disabled,
  onChange,
  label,
  tone,
}: {
  id: string;
  name: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
  tone: SavingsGoalTransferDirection;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex h-11 cursor-pointer items-center justify-center rounded-xl text-sm font-extrabold transition",
        "focus-within:ring-2 focus-within:ring-eb-accent/40",
        checked
          ? tone === "deposit"
            ? "bg-eb-surface text-[#14532d] shadow-[0_1px_3px_rgba(15,23,42,0.10)]"
            : "bg-eb-surface text-[rgb(var(--eb-danger))] shadow-[0_1px_3px_rgba(15,23,42,0.10)]"
          : "text-eb-text/60 hover:text-eb-text",
        disabled && "cursor-not-allowed opacity-50",
      )}
      data-testid={`savings-goal-transfer-direction-${tone}`}
      data-checked={checked ? "true" : "false"}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={tone}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      {label}
    </label>
  );
}

function QuickFillRow({
  label,
  disabled,
  onPick,
}: {
  label: string;
  disabled?: boolean;
  onPick: (value: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="mt-2 flex flex-wrap gap-1.5"
    >
      {QUICK_FILL_VALUES.map((value) => (
        <button
          key={value}
          type="button"
          disabled={disabled}
          onClick={() => onPick(value)}
          data-testid="savings-goal-transfer-quick-fill"
          className="inline-flex h-7 items-center rounded-full border border-eb-stroke/50 bg-eb-surface px-2.5 text-[12px] font-semibold tabular-nums text-eb-text/72 transition hover:bg-[rgb(var(--eb-shell)/0.36)] hover:text-eb-text disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-eb-surface"
        >
          +{" "}
          {new Intl.NumberFormat(undefined, { useGrouping: true }).format(value)}
        </button>
      ))}
    </div>
  );
}

function SourceSelect({
  id,
  value,
  options,
  placeholder,
  disabled,
  invalid,
  onChange,
}: {
  id: string;
  value: string;
  options: readonly SourceOption[];
  placeholder: string;
  disabled?: boolean;
  invalid?: boolean;
  onChange: (next: string) => void;
}) {
  const empty = options.length === 0;
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled || empty}
      aria-invalid={invalid ? "true" : undefined}
      data-testid="savings-goal-transfer-source"
      className={cn(
        "h-11 w-full rounded-2xl border bg-eb-surface px-3.5 text-sm font-semibold text-eb-text transition",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/20",
        invalid ? "border-eb-danger" : "border-eb-stroke/40",
        (disabled || empty) && "cursor-not-allowed opacity-60",
      )}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function SnapshotDl({
  saved,
  target,
  deadline,
  labels,
}: {
  saved: string;
  target: string;
  deadline: string;
  labels: { saved: string; target: string; deadline: string };
}) {
  return (
    <dl
      data-testid="savings-goal-modal-snapshot"
      className="grid grid-cols-3 gap-2.5"
    >
      <SnapshotCell label={labels.saved} value={saved} />
      <SnapshotCell label={labels.target} value={target} />
      <SnapshotCell label={labels.deadline} value={deadline} />
    </dl>
  );
}

function SnapshotCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-eb-stroke/40 bg-[rgb(var(--eb-shell)/0.18)] px-3 py-2.5">
      <dt className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-eb-text/50">
        {label}
      </dt>
      <dd className="mt-1 text-[14px] font-extrabold tabular-nums text-eb-text">
        {value}
      </dd>
    </div>
  );
}
