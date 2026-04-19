import type { AppLocale } from "@/types/i18n/appLocale";
import type { CurrencyCode } from "@/types/i18n/currency";
import type { UserDto } from "@/types/User/UserDto";

export type UserPreferencesDto = {
  locale: AppLocale;
  currency: CurrencyCode;
  budgetPeriodCloseDay?: number | null;
};

export type UpdatePreferencesRequest = {
  locale: AppLocale;
  currency: CurrencyCode;
  budgetPeriodCloseDay?: number | null;
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
