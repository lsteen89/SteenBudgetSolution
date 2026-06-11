export type PlanNextMonthResultDto = {
  fromYearMonth: string;
  plannedYearMonth: string;
  status: "planned";
  wasCreated: boolean;
};
