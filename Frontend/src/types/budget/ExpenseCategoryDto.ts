import type { ExpenseCategoryCode } from "@/types/budget/categoryKeys";

export type ExpenseCategoryDto = {
  id: string;
  name: string;
  code: ExpenseCategoryCode;
};
