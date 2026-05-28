import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { FormField } from "@/components/atoms/forms/FormField";
import { TextInput } from "@/components/atoms/InputField/TextInputv2";
import BudgetEntryModalShell from "@/components/molecules/forms/budgetEditor/BudgetEntryModalShell";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { BudgetMonthSavingsGoalEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import { savingsGoalRenameModalDict } from "@/utils/i18n/pages/private/savings/SavingsGoalRenameModal.i18n";
import { tDict } from "@/utils/i18n/translate";
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";

/**
 * V2 PR-10 — "Byt namn" focused modal.
 *
 * Wires the kebab → Byt namn item on each goal card to the
 * `PATCH .../savings-goals/{id}/name` endpoint shipped in PR-05.
 *
 * Design intent (`Work/Dashboard/savings/PR-10-fe-kebab-rename-target-amount.md`):
 *   - One modal, one mutation, no scope strip. Name is plan-level by
 *     definition; the BE writes both the snapshot row and the source
 *     baseline in one transaction when a baseline exists.
 *   - Trim defensively before submit so the FE dirty-check lines up
 *     with the BE no-op short-circuit (same trimmed value ⇒ no audit
 *     row, no toast spam).
 *   - Length cap (255) mirrored from `CreateBudgetMonthSavingsGoalCommandValidator`.
 */
export type SavingsGoalRenameSavePayload = {
  name: string;
};

type SavingsGoalRenameModalProps = {
  open: boolean;
  row: BudgetMonthSavingsGoalEditorRowDto | null;
  monthLabel: string;
  isSaving?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (values: SavingsGoalRenameSavePayload) => Promise<void> | void;
};

const NAME_MAX_LENGTH = 255;

type FieldErrors = {
  name?: string;
};

export default function SavingsGoalRenameModal({
  open,
  row,
  monthLabel,
  isSaving = false,
  errorMessage,
  onClose,
  onSubmit,
}: SavingsGoalRenameModalProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof savingsGoalRenameModalDict.sv>(key: K) =>
    tDict(key, locale, savingsGoalRenameModalDict);
  const reactId = useId();
  const nameInputId = `${reactId}-name`;

  const [name, setName] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  // Reset transient state every time the modal opens against a new row.
  // We intentionally don't re-seed on every render so the user's
  // keystrokes survive any background refetch that re-emits `row` with
  // the same id.
  useEffect(() => {
    if (!open || !row) return;
    setName(row.name);
    setErrors({});
  }, [open, row]);

  const trimmed = useMemo(() => name.trim(), [name]);
  const originalTrimmed = row?.name?.trim() ?? "";
  const isUnchanged = trimmed.length > 0 && trimmed === originalTrimmed;

  const updateName = (value: string) => {
    setName(value);
    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    if (!row) return;

    const next: FieldErrors = {};
    if (trimmed.length === 0) {
      next.name = t("nameRequired");
    } else if (trimmed.length > NAME_MAX_LENGTH) {
      next.name = t("nameTooLong");
    }
    if (next.name) {
      setErrors(next);
      return;
    }
    if (isUnchanged) {
      // BE short-circuits this as a no-op; saving the round-trip here
      // keeps the toast surface honest and the audit log clean.
      onClose();
      return;
    }

    setErrors({});
    await onSubmit({ name: trimmed });
  };

  if (!open || !row) return null;

  // Save stays enabled on field-level invalid states (empty, too long)
  // so the form's onSubmit can render the inline error. We only block
  // the click when the mutation is in flight, or when the trimmed value
  // is identical to the row name — in which case Save is a no-op and the
  // inline "Same name as before" hint is already visible.
  const saveDisabled = isSaving || isUnchanged;

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label={t("closeAriaLabel")}
        data-testid="savings-goal-rename-backdrop"
        onClick={isSaving ? undefined : onClose}
        disabled={isSaving}
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(21,39,81,0.18),rgba(21,39,81,0.52))]"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-[480px]">
          <BudgetEntryModalShell
            titleId="savings-goal-rename-modal-title"
            descriptionId="savings-goal-rename-modal-description"
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
                    form="savings-goal-rename-form"
                    disabled={saveDisabled}
                    aria-busy={isSaving}
                    className="h-11"
                    data-testid="savings-goal-rename-save"
                  >
                    {isSaving ? t("saving") : t("saveChanges")}
                  </CtaButton>
                </div>
              </div>
            }
          >
            <form
              id="savings-goal-rename-form"
              onSubmit={submit}
              className="grid gap-3.5"
              noValidate
            >
              <FormField
                label={t("nameLabel")}
                htmlFor={nameInputId}
                error={errors.name}
                hint={errors.name ? undefined : t("nameHint")}
              >
                <TextInput
                  id={nameInputId}
                  type="text"
                  value={name}
                  maxLength={NAME_MAX_LENGTH}
                  disabled={isSaving}
                  onChange={(event) => updateName(event.target.value)}
                  data-testid="savings-goal-rename-input"
                  autoFocus
                  aria-invalid={errors.name ? "true" : undefined}
                />
              </FormField>

              {isUnchanged ? (
                <p
                  data-testid="savings-goal-rename-unchanged"
                  className="text-xs text-eb-text/55"
                >
                  {t("nameUnchanged")}
                </p>
              ) : null}

              {errorMessage ? (
                <p
                  role="alert"
                  data-testid="savings-goal-rename-error"
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
