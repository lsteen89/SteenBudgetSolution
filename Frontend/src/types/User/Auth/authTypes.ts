export interface LoginOk {
  success: true;
  accessToken: string;
  sessionId: string;
  persoId: string;
  wsMac: string;
}

export interface LoginFail {
  success: false
  message: string
}

export type LoginRes =
  | { success: true; accessToken: string; sessionId: string, persoId: string, wsMac: string }   // success path
  | { success: false; message: string }                          // failure path
