import type { ApiEnvelope } from "@/api/api.types";
import { api } from "@/api/axios";
import type { UserDto } from "@/types/User/UserDto";
import type {
  ChangePasswordRequest,
  UpdatePasswordResultDto,
  UpdatePreferencesRequest,
  UpdateProfileRequest,
  UserPreferencesDto,
} from "./settings.types";

export async function getMyPreferences(): Promise<UserPreferencesDto> {
  const resp = await api.get<ApiEnvelope<UserPreferencesDto>>(
    "/api/users/preferences",
  );

  const env = resp.data;
  if (!env.isSuccess || !env.data || env.error) {
    throw new Error("Failed to load user preferences.");
  }

  return env.data;
}

export async function updatePreferences(
  payload: UpdatePreferencesRequest,
): Promise<UserPreferencesDto> {
  const resp = await api.put<ApiEnvelope<UserPreferencesDto>>(
    "/api/users/preferences",
    payload,
  );

  const env = resp.data;
  if (!env.isSuccess || !env.data || env.error) {
    throw new Error("Failed to update user preferences.");
  }

  return env.data;
}

export async function changePassword(
  payload: ChangePasswordRequest,
): Promise<void> {
  const resp = await api.put<ApiEnvelope<UpdatePasswordResultDto>>(
    "/api/users/password",
    payload,
  );

  const env = resp.data;
  if (!env.isSuccess || env.error) {
    throw new Error("Failed to update password.");
  }
}

export async function updateProfile(
  payload: UpdateProfileRequest,
): Promise<UserDto> {
  const resp = await api.put<ApiEnvelope<UserDto>>(
    "/api/users/profile",
    payload,
  );

  const env = resp.data;
  if (!env.isSuccess || !env.data || env.error) {
    throw new Error("Failed to update profile.");
  }

  return env.data;
}
