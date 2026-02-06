// schemas/helpers/yupBuilders.ts
import { svMoneyNullable } from "@/schemas/helpers/wizard/wizardHelpers";

// Optional money (null allowed), with max
export const moneyOpt = (max: number, maxMsg: string) =>
    svMoneyNullable().max(max, maxMsg);

// Required money (null NOT allowed), min>=1, with max
export const moneyReq = (
    requiredMsg: string,
    minMsg: string,
    max: number,
    maxMsg: string
) =>
    svMoneyNullable()
        .required(requiredMsg) // disallow null/undefined
        .min(1, minMsg)        // 0 is not ok for required ones
        .max(max, maxMsg);
