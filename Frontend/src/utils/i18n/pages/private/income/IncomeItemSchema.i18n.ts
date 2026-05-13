export const incomeItemSchemaDict = {
  sv: {
    nameRequired: "Namn krävs",
    nameTooLong: "Namnet är för långt",
    amountRequired: "Belopp krävs",
    amountInvalid: "Ogiltigt belopp",
    amountNegative: "Beloppet kan inte vara negativt",
    kindRequired: "Typ krävs",
    atLeastOneItem: "Minst en rad krävs",
  },
  en: {
    nameRequired: "Name is required",
    nameTooLong: "Name is too long",
    amountRequired: "Amount is required",
    amountInvalid: "Invalid amount",
    amountNegative: "Amount cannot be negative",
    kindRequired: "Type is required",
    atLeastOneItem: "At least one row is required",
  },
  et: {
    nameRequired: "Nimi on nõutud",
    nameTooLong: "Nimi on liiga pikk",
    amountRequired: "Summa on nõutud",
    amountInvalid: "Vigane summa",
    amountNegative: "Summa ei saa olla negatiivne",
    kindRequired: "Tüüp on nõutud",
    atLeastOneItem: "Vähemalt üks rida on nõutud",
  },
} as const;
