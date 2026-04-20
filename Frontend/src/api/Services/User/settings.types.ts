import type { AppLocale } from "@/types/i18n/appLocale";
import type { CurrencyCode } from "@/types/i18n/currency";
import type { UserDto } from "@/types/User/UserDto";
import type { IncomePaymentDayType } from "@/types/User/Settings/settings.types";

export type UserPreferencesDto = {
  locale: AppLocale;
  currency: CurrencyCode;
};

export type UpdatePreferencesRequest = {
  locale: AppLocale;
  currency: CurrencyCode;
};

export type UpdateSalaryPaymentTimingRequest = {
  incomePaymentDayType: IncomePaymentDayType;
  incomePaymentDay: number | null;
  updateCurrentAndFuture: boolean;
};

export type SalaryPaymentTimingDto = {
  incomePaymentDayType: IncomePaymentDayType;
  incomePaymentDay: number | null;
  updateCurrentAndFuture: boolean;
};

export type UpdateProfileRequest = {
  firstName: string;
  lastName: string;
};
export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};
export type UpdatePasswordResultDto = {
  updated: boolean;
};

export type UpdateProfileResponse = UserDto;
