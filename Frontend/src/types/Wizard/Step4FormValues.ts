import { DebtItem, DebtsIntro, DebtsInfo } from "./DebtFormValues";

export interface Step4FormValues {
  intro?: DebtsIntro;
  info?:  DebtsInfo;
  debts?: DebtItem[];
}