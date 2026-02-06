export type GoalTemplateName =
    | "Buffert"
    | "Ny bil"
    | "Kontantinsats"
    | "Resa till solen";

export type GoalTemplate = {
    name: GoalTemplateName;
    targetAmount: number;

    /** Optional preset date (YYYY-MM-DD). UI can ignore it. */
    targetDate?: string;
};