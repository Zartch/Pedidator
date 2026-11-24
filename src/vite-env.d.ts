/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `demo` runs on local data only. Unset is treated as demo until F2-8 adds the real login. */
  readonly VITE_MODE?: string
  /** Public path the app is served from (GitHub Pages: /pedidator/). */
  readonly VITE_BASE?: string
}
