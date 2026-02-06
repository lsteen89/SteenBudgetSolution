import React from "react";
import { useWizardSessionStore } from "@/stores/Wizard/wizardSessionStore";
import WizardSummaryJumpHint from "./WizardSummaryJumpHint";
import WizardSummaryStickyCTA from "./WizardSummaryStickyCTA";
import { FINAL_SUMMARY_UNLOCK } from "../Const/wizardEntitlements";

type Props = {
    step: number;
    isMobile: boolean;

    onGoToSummary: () => void; // typically: () => jumpTo(5, 1)
    onContinue: () => void;    // typically: nextStep()

    className?: string;
};

export default function WizardSummaryNavAssist({
    step,
    isMobile,
    onGoToSummary,
    onContinue,
}: Props) {
    const unlocked = useWizardSessionStore(
        (s) => (s.maxSubStepByMajor?.[FINAL_SUMMARY_UNLOCK.major] ?? 0) >= FINAL_SUMMARY_UNLOCK.sub
    );

    const show = unlocked && step !== 5;

    return (
        <>
            {/* Desktop: subtle hint under progress */}
            <WizardSummaryJumpHint show={!isMobile && show} />

            {/* Mobile: sticky CTA */}
            <WizardSummaryStickyCTA
                show={isMobile && show}
                onGoToSummary={onGoToSummary}
                onContinue={onContinue}
            />
        </>
    );
}
