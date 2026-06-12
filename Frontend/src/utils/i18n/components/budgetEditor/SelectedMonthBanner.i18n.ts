/**
 * Copy for the SelectedMonthBanner shown on full editor pages when the
 * targeted month is not the default open month, or is read-only. Plain
 * budget language only — no implementation terms.
 */
export const selectedMonthBannerDict = {
  sv: {
    plannedNotice:
      "Du redigerar {month} i förväg. Ändringar gäller den månaden när den startar.",
    readOnlyNotice: "{month} är stängd och kan inte ändras.",
    skippedNotice: "{month} hoppades över och kan inte ändras.",
    offOpenNotice: "Du redigerar {month}, inte din aktiva månad.",
  },
  en: {
    plannedNotice:
      "You are editing {month} ahead of time. Changes apply to that month when it starts.",
    readOnlyNotice: "{month} is closed and cannot be changed.",
    skippedNotice: "{month} was skipped and cannot be changed.",
    offOpenNotice: "You are editing {month}, not your active month.",
  },
  et: {
    plannedNotice:
      "Muudad kuud {month} ette. Muudatused kehtivad sellele kuule, kui see algab.",
    readOnlyNotice: "{month} on suletud ja seda ei saa muuta.",
    skippedNotice: "{month} jäeti vahele ja seda ei saa muuta.",
    offOpenNotice: "Muudad kuud {month}, mitte oma aktiivset kuud.",
  },
} as const;
