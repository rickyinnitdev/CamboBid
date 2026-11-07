import { supabase } from "./supabase";
import {
  devAdminProfile,
  devAdminUser,
  endDevAdminSession,
  getDevAdminSession,
  isDevAdminCredentials,
  isDevAdminSession,
  startDevAdminSession,
} from "./devAdmin";

export const authService = {
  async login({ email, password }) {
    if (isDevAdminCredentials(email, password)) {
      // Clear any real Supabase session so it cannot overwrite the local
      // development identity through the auth state listener.
      try {
        await supabase.auth.signOut();
      } catch {
        /* No existing session is fine. */
      }
      startDevAdminSession();
      return { user: devAdminUser, session: getDevAdminSession() };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/admin`,
      },
    });
    if (error) throw error;
    return data;
  },

  async getMfaFactors() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    return data;
  },

  async logout() {
    if (isDevAdminSession()) {
      endDevAdminSession();
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    if (isDevAdminSession()) return devAdminUser;
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  async getSession() {
    const devSession = getDevAdminSession();
    if (devSession) return devSession;
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  async getProfile(userId) {
    if (isDevAdminSession() && userId === devAdminUser.id) return devAdminProfile;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

export default authService;
