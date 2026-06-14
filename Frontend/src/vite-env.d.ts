/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_APP_API_URL: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  readonly VITE_WIZARD_PROFILER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
