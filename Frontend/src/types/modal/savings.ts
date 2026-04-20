export type GoalTemplateId = "sun_trip" | "buffer" | "new_car" | "down_payment";

export type GoalTemplate = {
  id: GoalTemplateId;
  name: string;
  targetAmount: number;
  targetDate: string | null;
};
