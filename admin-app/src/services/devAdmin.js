/**
 * Development-only admin session.
 *
 * This module is intentionally gated by Vite's `import.meta.env.DEV` flag.
 * The credentials below are never accepted by a production build, so they
 * cannot become a deployed backdoor. Use `npm run dev` to access this login.
 *
 * To change the local credentials, edit DEV_ADMIN_EMAIL and
 * DEV_ADMIN_PASSWORD. To disable the bypass entirely, set
 * VITE_DISABLE_DEV_ADMIN=true in admin-app/.env.local.
 */
const STORAGE_KEY = "cambobid-dev-admin-session";
const FIXED_TIME = "2026-01-01T00:00:00.000Z";
const DEV_ADMIN_ID = "00000000-0000-4000-8000-000000000001";

export const DEV_ADMIN_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_DISABLE_DEV_ADMIN !== "true";

export const DEV_ADMIN_EMAIL = "admin@cambobid.local";
export const DEV_ADMIN_PASSWORD = "cambobid-dev";

export const devAdminUser = {
  id: DEV_ADMIN_ID,
  aud: "authenticated",
  role: "authenticated",
  email: DEV_ADMIN_EMAIL,
  email_confirmed_at: FIXED_TIME,
  phone: "",
  confirmed_at: FIXED_TIME,
  last_sign_in_at: FIXED_TIME,
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { display_name: "Dev Admin" },
  identities: [],
  created_at: FIXED_TIME,
  updated_at: FIXED_TIME,
};

export const devAdminProfile = {
  id: DEV_ADMIN_ID,
  display_name: "Dev Admin",
  full_name: "Dev Admin",
  email: DEV_ADMIN_EMAIL,
  role: "super_admin",
  suspended: false,
  created_at: FIXED_TIME,
  updated_at: FIXED_TIME,
};

function hasSessionStorage() {
  return typeof window !== "undefined" && !!window.sessionStorage;
}

export function isDevAdminSession() {
  if (!DEV_ADMIN_ENABLED || !hasSessionStorage()) return false;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function startDevAdminSession() {
  if (!DEV_ADMIN_ENABLED || !hasSessionStorage()) return false;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

export function endDevAdminSession() {
  if (!hasSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Ignore storage failures; the in-memory store is still cleared. */
  }
}

export function isDevAdminCredentials(email, password) {
  if (!DEV_ADMIN_ENABLED) return false;
  return (
    String(email || "")
      .trim()
      .toLowerCase() === DEV_ADMIN_EMAIL && String(password || "") === DEV_ADMIN_PASSWORD
  );
}

export function getDevAdminSession() {
  if (!isDevAdminSession()) return null;
  const expiresIn = 60 * 60 * 8;
  return {
    access_token: "dev-admin-access-token",
    token_type: "bearer",
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    refresh_token: "dev-admin-refresh-token",
    user: devAdminUser,
  };
}
