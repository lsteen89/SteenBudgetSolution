import type { ApiEnvelope } from "@/api/api.types";
import { api } from "@/api/axios";
import { unwrapEnvelopeData, unwrapEnvelopeResult } from "@/api/envelope";
import type { UserDto } from "@/types/User/UserDto";
import type {
  ChangePasswordRequest,
  SalaryPaymentTimingDto,
  UpdatePasswordResultDto,
  UpdatePreferencesRequest,
  UpdateProfileRequest,
  UpdateSalaryPaymentTimingRequest,
  UserPreferencesDto,
} from "./settings.types";

export async function getMyPreferences(): Promise<UserPreferencesDto> {
  const resp = await api.get<ApiEnvelope<UserPreferencesDto>>(
    "/api/users/preferences",
  );
  return unwrapEnvelopeData(resp, "Failed to load user preferences.");
}

export async function updatePreferences(
  payload: UpdatePreferencesRequest,
): Promise<UserPreferencesDto> {
  const resp = await api.put<ApiEnvelope<UserPreferencesDto>>(
    "/api/users/preferences",
    payload,
  );
  return unwrapEnvelopeData(resp, "Failed to update user preferences.");
}

export async function updateSalaryPaymentTiming(
  payload: UpdateSalaryPaymentTimingRequest,
): Promise<SalaryPaymentTimingDto> {
  const resp = await api.put<ApiEnvelope<SalaryPaymentTimingDto>>(
    "/api/users/salary-payment-timing",
    payload,
  );
  return unwrapEnvelopeData(resp, "Failed to update salary payment timing.");
}

export async function changePassword(
  payload: ChangePasswordRequest,
): Promise<void> {
  const resp = await api.put<ApiEnvelope<UpdatePasswordResultDto>>(
    "/api/users/password",
    payload,
  );
  unwrapEnvelopeResult(resp, "Failed to update password.");
}

export async function updateProfile(
  payload: UpdateProfileRequest,
): Promise<UserDto> {
  const resp = await api.put<ApiEnvelope<UserDto>>(
    "/api/users/profile",
    payload,
  );
  return unwrapEnvelopeData(resp, "Failed to update profile.");
}
