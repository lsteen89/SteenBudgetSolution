import React from "react";
import PlayfulBirdCard from "@components/molecules/cards/dashboard/PlayfulBirdCard";

type Props = {
    onOpenWizard: () => void;
};

const NextStepsCards: React.FC<Props> = ({ onOpenWizard }) => {
    return (
        <>
            <PlayfulBirdCard
                title="Fortsätt din resa"
                description="Du är på rätt spår – granska din guide en gång i månaden för att hålla din plan i linje med verkligheten."
                ctaLabel="Öppna guiden"
                onClick={onOpenWizard}
            />
            <PlayfulBirdCard
                title="Lägg till denna veckas transaktioner"
                description="Att logga dagens utgifter tar mindre än en minut och ger dig mycket bättre beslut imorgon."
                ctaLabel="Lägg till utgifter"
                to="/expenses"
            />
        </>
    );
};

export default NextStepsCards;
