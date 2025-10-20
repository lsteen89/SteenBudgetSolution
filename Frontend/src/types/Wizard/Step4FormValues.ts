import { DebtItem, DebtsIntro, DebtsSummary } from "./DebtFormValues";

export interface Step4FormValues {
  intro?: DebtsIntro;
  summary?: DebtsSummary;
  debts?: DebtItem[];
}