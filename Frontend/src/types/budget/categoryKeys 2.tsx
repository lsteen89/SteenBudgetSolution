export type KnownExpenseCategoryCode =
  | "housing"
  | "food"
  | "transport"
  | "clothing"
  | "fixed"
  | "subscription"
  | "other";

export type ExpenseCategoryCode = KnownExpenseCategoryCode | (string & {});
