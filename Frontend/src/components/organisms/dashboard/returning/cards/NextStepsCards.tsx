import React from "react";
import PlayfulBirdCard from "@components/molecules/cards/dashboard/PlayfulBirdCard";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { nextStepsCardsDict } from "@/utils/i18n/pages/private/dashboard/cards/NextStepsCards.i18n";
import { tDict } from "@/utils/i18n/translate";

type Props = {
    onOpenWizard: () => void;
};

const NextStepsCards: React.FC<Props> = ({ onOpenWizard }) => {
    const locale = useAppLocale();
    const t = <K extends keyof typeof nextStepsCardsDict.sv>(key: K) =>
        tDict(key, locale, nextStepsCardsDict);

    return (
        <>
            <PlayfulBirdCard
                title={t("journeyTitle")}
                description={t("journeyDescription")}
                ctaLabel={t("journeyCta")}
                onClick={onOpenWizard}
            />
            <PlayfulBirdCard
                title={t("expensesTitle")}
                description={t("expensesDescription")}
                ctaLabel={t("expensesCta")}
                to="/expenses"
            />
        </>
    );
};

export default NextStepsCards;
