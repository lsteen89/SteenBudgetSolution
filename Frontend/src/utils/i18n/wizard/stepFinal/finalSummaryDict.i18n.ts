export const finalSummaryDict = {
  sv: {
    salaryNet: "Lön (netto)",
    sideIncome: "Sidoinkomst",
    householdMember: "Hushållsmedlem",

    rowIncome: "Inkomster",
    rowExpenses: "Utgifter",
    rowSavings: "Sparande",
    rowDebtsMinimum: "Skulder (minimi)",

    verdictGoodTitle: "Tryggt",
    verdictGoodDetail:
      "Du har ett överskott på {amount} per månad. Skapa budgeten — du kan finjustera efteråt.",
    verdictTightTitle: "Tight",
    verdictTightDetail:
      "Det går ihop, men marginalen är liten. Skapa budgeten och justera vid behov.",
    verdictBadTitle: "Ohållbart",
    verdictBadDetail:
      "Du går minus varje månad. Skapa budgeten ändå — men vi markerar vad som bör justeras direkt.",

    savingsRate: "Spargrad {percent}%",
    highInterest: "Hög ränta: {name} ({apr}%)",
    noInterestFound: "Inga räntor hittades",

    coachFixTitle: "En enkel fix nu",
    coachFixDetail: "Sänk sparandet eller justera utgifter så att du går plus.",
    coachSuggestTightTitle: "Gör planen enklare",
    coachSuggestTightDetail:
      "Välj ett huvudmål och låt resten vänta tills du har mer marginal.",
    coachSuggestGoodTitle: "Bra läge",
    coachSuggestGoodDetail:
      "Vill du att överskottet går till buffert eller extra amortering?",

    pillarIncome: "Från lön, sidoinkomster och andra källor i hushållet.",
    pillarExpenditure: "Dina största utgifter syns i sammanställningen ovan.",
    pillarSavingsWithGoals: "Du sparar mot {count} mål.",
    pillarSavingsNoGoals: "Du har inga sparmål registrerade.",
    pillarDebts: "Skuldbetalningar baseras på dina angivna lån och villkor.",
  },

  en: {
    salaryNet: "Salary (net)",
    sideIncome: "Side income",
    householdMember: "Household member",

    rowIncome: "Income",
    rowExpenses: "Expenses",
    rowSavings: "Savings",
    rowDebtsMinimum: "Debts (minimum)",

    verdictGoodTitle: "Stable",
    verdictGoodDetail:
      "You have a surplus of {amount} per month. Create the budget — you can fine-tune it afterwards.",
    verdictTightTitle: "Tight",
    verdictTightDetail:
      "It works, but the margin is small. Create the budget and adjust if needed.",
    verdictBadTitle: "Unsustainable",
    verdictBadDetail:
      "You are in the negative every month. Create the budget anyway — but we will highlight what should be adjusted first.",

    savingsRate: "Savings rate {percent}%",
    highInterest: "High interest: {name} ({apr}%)",
    noInterestFound: "No interest rates found",

    coachFixTitle: "One simple fix now",
    coachFixDetail:
      "Lower savings or adjust expenses so you stay in the positive.",
    coachSuggestTightTitle: "Make the plan simpler",
    coachSuggestTightDetail:
      "Choose one main goal and let the rest wait until you have more margin.",
    coachSuggestGoodTitle: "Good position",
    coachSuggestGoodDetail:
      "Do you want the surplus to go to a buffer or extra debt repayment?",

    pillarIncome: "From salary, side income, and other household sources.",
    pillarExpenditure: "Your biggest expenses are shown in the summary above.",
    pillarSavingsWithGoals: "You are saving toward {count} goals.",
    pillarSavingsNoGoals: "You have no savings goals registered.",
    pillarDebts: "Debt payments are based on your entered loans and terms.",
  },

  et: {
    salaryNet: "Palk (neto)",
    sideIncome: "Lisasissetulek",
    householdMember: "Leibkonnaliige",

    rowIncome: "Sissetulekud",
    rowExpenses: "Kulud",
    rowSavings: "Säästud",
    rowDebtsMinimum: "Võlad (miinimum)",

    verdictGoodTitle: "Stabiilne",
    verdictGoodDetail:
      "Sul on iga kuu ülejääk {amount}. Loo eelarve — saad seda hiljem täpsustada.",
    verdictTightTitle: "Pingeline",
    verdictTightDetail:
      "See tuleb välja, aga varu on väike. Loo eelarve ja kohanda vajadusel.",
    verdictBadTitle: "Jätkusuutmatu",
    verdictBadDetail:
      "Sul jääb iga kuu puudu. Loo eelarve siiski — aga märgime kohe ära, mida tuleks esimesena kohandada.",

    savingsRate: "Säästumäär {percent}%",
    highInterest: "Kõrge intress: {name} ({apr}%)",
    noInterestFound: "Intresse ei leitud",

    coachFixTitle: "Üks lihtne parandus kohe",
    coachFixDetail: "Vähenda säästmist või kohanda kulusid, et jääksid plussi.",
    coachSuggestTightTitle: "Tee plaan lihtsamaks",
    coachSuggestTightDetail:
      "Vali üks põhieesmärk ja lase ülejäänutel oodata, kuni sul on rohkem varu.",
    coachSuggestGoodTitle: "Hea seis",
    coachSuggestGoodDetail:
      "Kas soovid, et ülejääk läheks puhvrisse või lisatagasimakseks?",

    pillarIncome:
      "Palgast, lisasissetulekutest ja muudest leibkonna allikatest.",
    pillarExpenditure: "Sinu suurimad kulud on näha ülaltoodud kokkuvõttes.",
    pillarSavingsWithGoals: "Sa säästad {count} eesmärgi nimel.",
    pillarSavingsNoGoals: "Sul ei ole registreeritud säästueesmärke.",
    pillarDebts:
      "Võlamaksed põhinevad sinu sisestatud laenudel ja tingimustel.",
  },
} as const;
