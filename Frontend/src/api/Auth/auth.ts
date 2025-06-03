import { api, refreshInFlight } from '@/api/axios'; // Assuming queueRefresh is also in @api/axios
import { isAxiosError } from 'axios';
import { useAuthStore } from '@/stores/Auth/authStore';
import type { UserLoginDto } from '@/types/User/Auth/userLoginForm'; // Ensure this type can include rememberMe or adjust DTO
import type { LoginRes } from '@/types/User/Auth/authTypes';

// Define an extended DTO for login if your backend expects 'rememberMe' in the body
interface UserLoginDtoWithRemember extends UserLoginDto {
  rememberMe?: boolean;
}

let logoutOnce: Promise<void> | null = null;
let isLoggingOutFlag = false; // Renamed to avoid conflict if isLoggingOut is exported

/* ───── silent refresh ───── */
export async function refreshToken(): Promise<string> {
  const { setAuth, sessionId, accessToken: currentAccessToken } = useAuthStore.getState();


  const { data } = await api.post('/api/auth/refresh',
    { sessionId: sessionId, // Make sure these are correctly fetched if null initially
      accessToken: currentAccessToken },
    { headers: { 'X-Session-Id': sessionId ?? '' } });

  // Ensure the response includes 'persoid', which is required for identifying the user session.
  if (!data.success || !data.accessToken || !data.persoid) {
    throw new Error('refresh failed');
  }

  // When refreshing, we don't change the original rememberMe preference.
  // It's preserved in the store. setAuth should be smart enough or we fetch existing rememberMe.
  const existingRememberMe = useAuthStore.getState().rememberMe;
  setAuth(data.accessToken, data.sessionId, data.persoid, data.wsMac, existingRememberMe);
  api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
  return data.accessToken;
}

/* ───── interactive login ───── */
export async function callLogin(dto: UserLoginDto, rememberMe: boolean): Promise<LoginRes> {
  try {
    const loginPayload: UserLoginDtoWithRemember = { ...dto, rememberMe };
    const { data } = await api.post<LoginRes>('/api/auth/login', loginPayload);

    return data;
  } catch (err) {
    const message = isAxiosError(err)
      ? err.response?.data?.message ?? 'Login misslyckades'
      : 'Nätverksfel';
    return { success: false, message };
  }
}


/* ───── logout ───── */
export async function callLogout(): Promise<void> {
  if (isLoggingOutFlag) return logoutOnce ?? Promise.resolve();
  isLoggingOutFlag = true;

  if (!logoutOnce) {
    const tok = useAuthStore.getState().accessToken;
    logoutOnce = api.post(
      '/api/auth/logout',
      {},
      tok ? { headers: { Authorization: `Bearer ${tok}` } } : undefined
    )
      .then(() => { }) // ensure Promise<void>
      .catch(() => { })  // swallow 4xx/5xx
      .finally(() => {
        useAuthStore.getState().clear(); // This should also clear rememberMe in the store and sessionStorage marker
        delete api.defaults.headers.common.Authorization;
        isLoggingOutFlag = false;
        logoutOnce = null;
        if (window.location.pathname !== '/login') { // Avoid loop if already on login
          window.location.href = '/login'; // Redirect to login
        }
      });
  }
  return logoutOnce;
}

// Exporting the flag for Axios interceptor if needed
export { isLoggingOutFlag as isLoggingOut };