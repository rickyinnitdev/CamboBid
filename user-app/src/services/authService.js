import { supabase } from "./supabase";

export const authService = {
  async register({ email, password, displayName }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          full_name: displayName,
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

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
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
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("listing-images")
      .getPublicUrl(fileName);

    await this.updateProfile(userId, { avatar_url: publicUrl });
    return publicUrl;
  },

  async uploadIdentityDocument(userId, file) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/identity.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("identity-documents")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { signedUrl }, error: signedError } = await supabase.storage
      .from("identity-documents")
      .createSignedUrl(fileName, 3600);

    if (signedError) throw signedError;

    await this.updateProfile(userId, {
      identity_document_url: signedUrl,
    });

    return signedUrl;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

export default authService;
