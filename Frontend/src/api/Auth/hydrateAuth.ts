import type { ApiEnvelope } from "@/api/api.types";
import type { AuthResult } from "@/api/auth.types";
import { applySession } from "@/api/Auth/session";
import { api } from "@/api/axios";
import type { UserPreferencesDto } from "@/api/Services/User/settings.types";
import { useAuthStore } from "@/stores/Auth/authStore";
import { useUserPreferencesStore } from "@/stores/UserPreferences/userPreferencesStore";
import type { UserDto } from "@/types/User/UserDto";
import { setAppLocale } from "@/utils/i18n/appLocaleStore";

export async function hydrateCurrentAuthenticatedState() {
  try {
    const resp = await api.get<ApiEnvelope<UserDto>>("/api/users/me");
    const env = resp.data;

    if (env.isSuccess && env.data && !env.error) {
      useAuthStore.getState().mergeUser(env.data);
    }
  } catch (error) {
    console.error("Failed to load current user.", error);
  }

  try {
    const resp = await api.get<ApiEnvelope<UserPreferencesDto>>(
      "/api/users/preferences",
    );
    const env = resp.data;

    if (env.isSuccess && env.data && !env.error) {
      useUserPreferencesStore.getState().setPreferences(env.data);
      setAppLocale(env.data.locale);
    }
  } catch (error) {
    console.error("Failed to load user preferences.", error);
  }
}

export async function hydrateAuthenticatedState(auth: AuthResult) {
  applySession(auth);
  await hydrateCurrentAuthenticatedState();
}
