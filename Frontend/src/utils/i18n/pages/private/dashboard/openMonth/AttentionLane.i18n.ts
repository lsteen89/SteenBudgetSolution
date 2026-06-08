/**
 * i18n dictionary for the open-month AttentionLane (PR4).
 *
 * Copy rules:
 *  - Items are on-device guidance, not backend advice. The "How these are
 *    chosen" affordance must say so clearly in every language.
 *  - Deficit copy is factual and calm; no shame language (handover § "Hard
 *    Constraints" item 8).
 *  - Surplus copy is actionable, not celebratory noise.
 *  - No transaction, burn-rate, spend-progress, or due-date language —
 *    everything here describes planned budget signals.
 *  - Action labels describe where the button goes (close flow, quick drawer
 *    for a pillar, full editor route, or the breakdown analysis page).
 */
export const attentionLaneDict = {
  en: {
    sectionTitle: "Worth a quick look",
    sectionEyebrow: "Attention",
    sectionHint:
      "A short list of items derived from this month's planned numbers.",

    howChosenLabel: "How these are chosen",
    howChosenBody:
      "These items are on-device checks against your planned numbers — they are not backend advice. We surface up to three signals that affect how this month closes: lifecycle pressure (overdue or eligible to close), money state (deficit or unallocated surplus), and planned commitments like savings, subscriptions, debt payments and recurring expenses.",

    emptyTitle: "Plan looks stable",
    emptyBody:
      "Nothing needs urgent attention right now. The breakdown view shows the full picture if you want to dig deeper.",

    itemOverdueTitle: "Month is past its close window",
    itemOverdueBody:
      "Review and close this month so the next one starts with a fresh carry-over.",
    itemOverdueAction: "Review & close",

    itemDeficitTitle: "Plan is over what is coming in",
    itemDeficitBody:
      "Expenses, savings and debts together exceed income plus carry-over. Adjust expenses, savings or debt before closing.",
    itemDeficitAction: "Adjust expenses",

    itemEligibleCloseTitle: "Month is ready to close",
    itemEligibleCloseBody:
      "The close window is open. You can close this month and carry the remaining balance forward.",
    itemEligibleCloseAction: "Review & close",

    itemCloseCountdownTitle: "Closing window approaching",
    itemCloseCountdownBody: "{label}.",
    itemCloseCountdownAction: "Open breakdown",

    itemNoSavingsTitle: "No savings planned this month",
    itemNoSavingsBody:
      "Income is planned but nothing is going to savings. Add a contribution if you want to.",
    itemNoSavingsAction: "Quick adjust savings",

    itemSubscriptionsTitle: "Subscriptions are part of this month",
    itemSubscriptionsBody:
      "{count} active subscription planned. Review what is still worth keeping.",
    itemSubscriptionsBodyOther:
      "{count} active subscriptions planned. Review what is still worth keeping.",
    itemSubscriptionsAction: "Quick adjust expenses",

    itemDebtPressureTitle: "Debt payments are planned",
    itemDebtPressureBody:
      "Adjusting monthly payments here changes the plan, not balances.",
    itemDebtPressureAction: "Quick adjust debts",

    itemRecurringTitle: "Recurring expenses are part of this month",
    itemRecurringBody:
      "{count} recurring item is part of the plan (beyond subscriptions).",
    itemRecurringBodyOther:
      "{count} recurring items are part of the plan (beyond subscriptions).",
    itemRecurringAction: "Quick adjust expenses",

    itemLargeSurplusTitle: "Unassigned room",
    itemLargeSurplusBody:
      "A meaningful share of income is left unallocated. Send some to savings if it fits your plan.",
    itemLargeSurplusAction: "Quick adjust savings",

    itemStablePlanTitle: "Plan looks stable",
    itemStablePlanBody:
      "Nothing stands out on the on-device checks. The breakdown shows the full picture.",
    itemStablePlanAction: "Open breakdown",
  },

  sv: {
    sectionTitle: "Värt en snabb koll",
    sectionEyebrow: "Uppmärksamhet",
    sectionHint:
      "En kort lista som bygger på månadens planerade siffror.",

    howChosenLabel: "Så väljs de här",
    howChosenBody:
      "De här punkterna är kontroller som görs lokalt i appen mot dina planerade siffror — det är inga råd från servern. Vi visar upp till tre signaler som påverkar hur månaden stängs: livscykel (försenad eller redo att stänga), pengaläge (underskott eller oplacerat överskott) och planerade åtaganden som sparande, prenumerationer, skulder och återkommande utgifter.",

    emptyTitle: "Planen ser stabil ut",
    emptyBody:
      "Inget akut just nu. Översikten visar hela bilden om du vill gå djupare.",

    itemOverdueTitle: "Månaden har passerat stängningsfönstret",
    itemOverdueBody:
      "Granska och stäng månaden så att nästa månad börjar med ett färskt överfört saldo.",
    itemOverdueAction: "Granska & stäng",

    itemDeficitTitle: "Planen överstiger det som kommer in",
    itemDeficitBody:
      "Utgifter, sparande och skulder är tillsammans större än inkomster plus överfört saldo. Justera utgifter, sparande eller skulder innan stängning.",
    itemDeficitAction: "Justera utgifter",

    itemEligibleCloseTitle: "Månaden är redo att stängas",
    itemEligibleCloseBody:
      "Stängningsfönstret är öppet. Du kan stänga månaden och föra över det som är kvar.",
    itemEligibleCloseAction: "Granska & stäng",

    itemCloseCountdownTitle: "Stängningsfönster närmar sig",
    itemCloseCountdownBody: "{label}.",
    itemCloseCountdownAction: "Öppna översikt",

    itemNoSavingsTitle: "Inget sparande planerat i månaden",
    itemNoSavingsBody:
      "Inkomster är planerade men inget går till sparande. Lägg till ett belopp om du vill.",
    itemNoSavingsAction: "Snabbjustera sparande",

    itemSubscriptionsTitle: "Prenumerationer ingår i månaden",
    itemSubscriptionsBody:
      "{count} aktiv prenumeration är planerad. Se över vad som fortfarande är värt att behålla.",
    itemSubscriptionsBodyOther:
      "{count} aktiva prenumerationer är planerade. Se över vad som fortfarande är värt att behålla.",
    itemSubscriptionsAction: "Snabbjustera utgifter",

    itemDebtPressureTitle: "Skuldbetalningar är planerade",
    itemDebtPressureBody:
      "Att justera månadsbetalningar här ändrar planen, inte saldon.",
    itemDebtPressureAction: "Snabbjustera skulder",

    itemRecurringTitle: "Återkommande utgifter ingår i månaden",
    itemRecurringBody:
      "{count} återkommande post ingår i planen (utöver prenumerationer).",
    itemRecurringBodyOther:
      "{count} återkommande poster ingår i planen (utöver prenumerationer).",
    itemRecurringAction: "Snabbjustera utgifter",

    itemLargeSurplusTitle: "Oplacerat utrymme",
    itemLargeSurplusBody:
      "En betydande del av inkomsten är inte fördelad. Skicka en del till sparande om det passar din plan.",
    itemLargeSurplusAction: "Snabbjustera sparande",

    itemStablePlanTitle: "Planen ser stabil ut",
    itemStablePlanBody:
      "Inget sticker ut i de lokala kontrollerna. Översikten visar hela bilden.",
    itemStablePlanAction: "Öppna översikt",
  },

  et: {
    sectionTitle: "Tasub kiirelt vaadata",
    sectionEyebrow: "Tähelepanu",
    sectionHint:
      "Lühike loend, mis põhineb selle kuu planeeritud arvudel.",

    howChosenLabel: "Kuidas need valitakse",
    howChosenBody:
      "Need punktid on rakenduses tehtud kontrollid sinu planeeritud arvude põhjal — need ei ole serveri nõuanded. Näitame kuni kolme signaali, mis mõjutavad selle kuu sulgemist: elutsükkel (hilinenud või sulgemiseks valmis), rahaseis (puudujääk või jaotamata ülejääk) ja planeeritud kohustused nagu säästud, tellimused, võlamaksed ja püsikulud.",

    emptyTitle: "Plaan näib stabiilne",
    emptyBody:
      "Praegu ei vaja miski kiiret tähelepanu. Ülevaade näitab kogu pilti, kui soovid süveneda.",

    itemOverdueTitle: "Kuu on sulgemisaknast üle",
    itemOverdueBody:
      "Vaata kuu üle ja sulge see, et järgmine kuu algaks värske ülekantud saldoga.",
    itemOverdueAction: "Vaata üle & sulge",

    itemDeficitTitle: "Plaan ületab sissetuleku",
    itemDeficitBody:
      "Kulud, säästud ja võlad on koos suuremad kui tulu pluss ülekantud saldo. Kohanda kulusid, sääste või võlgu enne sulgemist.",
    itemDeficitAction: "Kohanda kulusid",

    itemEligibleCloseTitle: "Kuu on sulgemiseks valmis",
    itemEligibleCloseBody:
      "Sulgemise aken on avatud. Saad kuu sulgeda ja kanda jäägi edasi.",
    itemEligibleCloseAction: "Vaata üle & sulge",

    itemCloseCountdownTitle: "Sulgemise aken läheneb",
    itemCloseCountdownBody: "{label}.",
    itemCloseCountdownAction: "Ava ülevaade",

    itemNoSavingsTitle: "Selle kuu sääste pole planeeritud",
    itemNoSavingsBody:
      "Tulu on planeeritud, kuid säästudesse ei lähe midagi. Lisa panus, kui soovid.",
    itemNoSavingsAction: "Kiirkohandus säästudele",

    itemSubscriptionsTitle: "Tellimused on selle kuu osa",
    itemSubscriptionsBody:
      "{count} aktiivne tellimus on planeeritud. Vaata üle, mida tasub veel hoida.",
    itemSubscriptionsBodyOther:
      "{count} aktiivset tellimust on planeeritud. Vaata üle, mida tasub veel hoida.",
    itemSubscriptionsAction: "Kiirkohandus kuludele",

    itemDebtPressureTitle: "Võlamaksed on planeeritud",
    itemDebtPressureBody:
      "Kuumaksete muutmine siin muudab plaani, mitte jääki.",
    itemDebtPressureAction: "Kiirkohandus võlgadele",

    itemRecurringTitle: "Püsikulud on selle kuu osa",
    itemRecurringBody:
      "{count} korduv kirje on plaanis (lisaks tellimustele).",
    itemRecurringBodyOther:
      "{count} korduvat kirjet on plaanis (lisaks tellimustele).",
    itemRecurringAction: "Kiirkohandus kuludele",

    itemLargeSurplusTitle: "Jaotamata ruum",
    itemLargeSurplusBody:
      "Märgatav osa tulust on jaotamata. Saada osa säästudesse, kui see sobib su plaaniga.",
    itemLargeSurplusAction: "Kiirkohandus säästudele",

    itemStablePlanTitle: "Plaan näib stabiilne",
    itemStablePlanBody:
      "Lokaalsetes kontrollides ei paista midagi silma. Ülevaade näitab kogu pilti.",
    itemStablePlanAction: "Ava ülevaade",
  },
} as const;
