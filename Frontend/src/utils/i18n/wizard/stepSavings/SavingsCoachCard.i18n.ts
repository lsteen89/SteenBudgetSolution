export const savingsCoachCardDict = {
  sv: {
    beforeDebts: "Innan skulder",
    ctaAdjust: "Justera",

    badgeDeficit: "Går inte ihop (än)",
    badgeTight: "Tight men möjlig",
    badgeOk: "Ser hållbart ut",

    titleDeficit: "Du sparar mer än du har utrymme för",
    titleTight: "Du har liten marginal efter sparande",
    titleOk: "Sparplanen ser realistisk ut",

    bulletDeficitMissingTemplate: "Efter sparande saknas {amount} kr/mån.",
    bulletDeficitAdjust:
      "Justera sparande eller utgifter så budgeten går plus.",

    bulletTightLeftTemplate: "Kvar efter sparande: {amount} kr/mån.",
    bulletTightDiscipline:
      "Bra disciplin — men lämna gärna luft för oväntade kostnader.",

    bulletOkAfterExpensesTemplate: "Utrymme efter utgifter: {amount} kr/mån.",
    bulletOkAfterSavingsTemplate: "Kvar efter sparande: {amount} kr/mån.",

    hintDeficitWithGoals:
      "Rekommendation: pausa ett mål eller sänk målsparandet tillfälligt.",
    hintDeficitNoGoals:
      "Rekommendation: börja med en liten sparvana och bygg upp över tid.",

    hintTight: "Rekommendation: sänk sparandet lite eller skapa buffert först.",

    hintOkWithGoals:
      "Rekommendation: prioritera 1 mål tydligt — annars sprids sparandet för tunt.",
    hintOkWithSavingsNoGoals:
      "Rekommendation: lägg till ett mål så sparandet får ett jobb.",
    hintOkNoSavings:
      "Rekommendation: börja med 200–300 kr/mån. Kontinuitet slår ambition.",
  },

  en: {
    beforeDebts: "Before debts",
    ctaAdjust: "Adjust",

    badgeDeficit: "Does not add up yet",
    badgeTight: "Tight but possible",
    badgeOk: "Looks sustainable",

    titleDeficit: "You are saving more than you have room for",
    titleTight: "You have a small margin after savings",
    titleOk: "The savings plan looks realistic",

    bulletDeficitMissingTemplate:
      "After savings, you are short by {amount} /mo.",
    bulletDeficitAdjust:
      "Adjust savings or expenses so the budget stays positive.",

    bulletTightLeftTemplate: "Left after savings: {amount} /mo.",
    bulletTightDiscipline:
      "Good discipline — but leave some room for unexpected costs.",

    bulletOkAfterExpensesTemplate: "Available after expenses: {amount} /mo.",
    bulletOkAfterSavingsTemplate: "Left after savings: {amount} /mo.",

    hintDeficitWithGoals:
      "Recommendation: pause one goal or lower goal savings temporarily.",
    hintDeficitNoGoals:
      "Recommendation: start with a small savings habit and build up over time.",

    hintTight:
      "Recommendation: lower savings slightly or build a buffer first.",

    hintOkWithGoals:
      "Recommendation: prioritize 1 goal clearly — otherwise the savings get spread too thin.",
    hintOkWithSavingsNoGoals:
      "Recommendation: add a goal so the savings have a job to do.",
    hintOkNoSavings:
      "Recommendation: start with 200–300 per month. Consistency beats ambition.",
  },

  et: {
    beforeDebts: "Enne võlgu",
    ctaAdjust: "Kohanda",

    badgeDeficit: "Ei tule veel välja",
    badgeTight: "Pingeline, aga võimalik",
    badgeOk: "Paistab jätkusuutlik",

    titleDeficit: "Sa säästad rohkem, kui sul on ruumi",
    titleTight: "Pärast säästmist jääb väike varu",
    titleOk: "Säästuplaan tundub realistlik",

    bulletDeficitMissingTemplate: "Pärast säästmist jääb puudu {amount} /kuu.",
    bulletDeficitAdjust: "Kohanda sääste või kulusid, et eelarve jääks plussi.",

    bulletTightLeftTemplate: "Alles pärast säästmist: {amount} /kuu.",
    bulletTightDiscipline:
      "Hea distsipliin — aga jäta veidi ruumi ootamatuteks kuludeks.",

    bulletOkAfterExpensesTemplate: "Pärast kulusid saadaval: {amount} /kuu.",
    bulletOkAfterSavingsTemplate: "Alles pärast säästmist: {amount} /kuu.",

    hintDeficitWithGoals:
      "Soovitus: peata üks eesmärk või vähenda ajutiselt eesmärkidele säästmist.",
    hintDeficitNoGoals:
      "Soovitus: alusta väikese säästmisharjumusega ja kasvata seda ajapikku.",

    hintTight: "Soovitus: vähenda säästmist veidi või loo enne puhver.",

    hintOkWithGoals:
      "Soovitus: sea 1 eesmärk selgelt esikohale — muidu jaguneb sääst liiga õhukeselt.",
    hintOkWithSavingsNoGoals:
      "Soovitus: lisa eesmärk, et säästudel oleks kindel töö.",
    hintOkNoSavings:
      "Soovitus: alusta 200–300 kuus. Järjepidevus võidab ambitsiooni.",
  },
} as const;
