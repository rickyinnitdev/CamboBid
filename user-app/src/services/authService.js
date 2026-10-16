import { supabase } from "./supabase";

export const authService = {
  async register({ email, password, displayName, termsAcceptedVersion }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/account/security`,
        data: {
          display_name: displayName,
          full_name: displayName,
          terms_accepted_version: termsAcceptedVersion,
        },
      },
    });

    if (error) throw error;
    return data;
  },

  async login({ email, password }) {
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
        redirectTo: `${window.location.origin}/account/security`,
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

  async enrollTotpMfa() {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });
    if (error) throw error;
    return data;
  },

  async verifyTotpMfa({ factorId, challengeId, code }) {
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });
    if (error) throw error;
    return data;
  },

  async challengeMfa(factorId) {
    const { data, error } = await supabase.auth.mfa.challenge({ factorId });
    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  async getSession() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  async getProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async uploadAvatar(userId, file) {
    const types={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
    if(!types[file.type] || file.size>5*1024*1024) throw new Error("Use a JPG, PNG or WebP profile image up to 5 MB");
    const fileName = `${userId}/avatar-${crypto.randomUUID()}.${types[file.type]}`;

    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("listing-images").getPublicUrl(fileName);

    await this.updateProfile(userId, { avatar_url: publicUrl });
    return publicUrl;
  },

  async uploadIdentityDocument(userId, file) {
    if (
      !["image/jpeg", "image/png", "application/pdf"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    )
      throw new Error("Use a JPG, PNG or PDF up to 5 MB");
    const ext = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "application/pdf": "pdf",
    }[file.type];
    const path = userId + "/" + crypto.randomUUID() + "." + ext;
    const { error } = await supabase.storage
      .from("identity-documents")
      .upload(path, file);
    if (error) throw error;
    const { error: submitError } = await supabase.rpc("submit_identity", {
      p_path: path,
    });
    if (submitError) throw submitError;
    return path;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

export default authService;
