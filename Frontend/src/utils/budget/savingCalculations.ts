export function monthsToTarget(monthly: number, target: number) {
    if (!Number.isFinite(monthly) || monthly <= 0) return null;
    return Math.ceil(target / monthly);
}
export function formatDuration(totalMonths: number | null) {
    if (!totalMonths || totalMonths <= 0) return "—";
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    const yearPart = years > 0 ? `${years} år` : "";
    const monthPart = months > 0 ? `${months} månader` : "";

    return [yearPart, monthPart].filter(Boolean).join(" och ");
}

export function calculateBoost(currentMonthly: number, target: number, boostAmount = 1000) {
    if (!Number.isFinite(currentMonthly) || currentMonthly <= 0) return null;
    const currentMonths = Math.ceil(target / currentMonthly);
    const boostedMonths = Math.ceil(target / (currentMonthly + boostAmount));
    return Math.max(0, currentMonths - boostedMonths);
}

function monthsBetweenTodayAnd(date: Date) {
    const a = new Date(); a.setHours(0, 0, 0, 0);
    const b = new Date(date); b.setHours(0, 0, 0, 0);

    // month diff rounded up-ish by day: if you want strict, just do month math
    const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    return Math.max(1, months + (b.getDate() > a.getDate() ? 1 : 0));
}

export function requiredPerMonth(goal: { targetAmount: number | null; amountSaved?: number | null; targetDate?: string | null }) {
    if (!goal.targetAmount || goal.targetAmount <= 0) return 0;
    if (!goal.targetDate) return 0;

    const date = new Date(String(goal.targetDate).split("T")[0]);
    if (Number.isNaN(date.getTime())) return 0;

    const saved = Math.max(0, Number(goal.amountSaved ?? 0));
    const remaining = Math.max(0, goal.targetAmount - saved);
    const months = monthsBetweenTodayAnd(date);

    return remaining / months;
}