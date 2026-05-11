import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { SecondaryButton } from "@/components/atoms/buttons/SecondaryButton";
import type { ReactNode } from "react";

type EditorStickyFooterProps = {
  summary: ReactNode;
  saveLabel: string;
  discardLabel: string;
  isSaving?: boolean;
  disabled?: boolean;
  onSave: () => void;
  onDiscard: () => void;
};

export default function EditorStickyFooter({
  summary,
  saveLabel,
  discardLabel,
  isSaving = false,
  disabled = false,
  onSave,
  onDiscard,
}: EditorStickyFooterProps) {
  return (
    <div
      className="sticky bottom-4 z-20 rounded-[1.5rem] border border-eb-stroke/24 bg-eb-surface/95 p-4 shadow-[0_18px_50px_rgba(21,39,81,0.12)] backdrop-blur supports-[backdrop-filter]:bg-eb-surface/86"
      data-testid="editor-sticky-footer"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 text-sm text-eb-text/68">{summary}</div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <SecondaryButton
            type="button"
            onClick={onDiscard}
            disabled={isSaving || disabled}
            className="h-11 rounded-2xl px-4"
          >
            {discardLabel}
          </SecondaryButton>

          <CtaButton
            type="button"
            onClick={onSave}
            disabled={isSaving || disabled}
            aria-busy={isSaving}
            className="h-11 rounded-2xl px-5"
          >
            {saveLabel}
          </CtaButton>
        </div>
      </div>
    </div>
  );
}
