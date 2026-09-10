import { supabase } from "./supabase";

export const uploadService = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  ALLOWED_DOC_TYPES: ["image/jpeg", "image/png", "application/pdf"],

  validateFile(file, type = "image") {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const allowedTypes = type === "document" ? this.ALLOWED_DOC_TYPES : this.ALLOWED_IMAGE_TYPES;
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(", ")}`);
    }

    return true;
  },

  async uploadListingImage(listingId, file) {
    this.validateFile(file, "image");

    const fileExt = file.name.split(".").pop();
    const fileName = `${listingId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("listing-images")
      .getPublicUrl(fileName);

    return {
      url: publicUrl,
      name: file.name,
      path: fileName,
    };
  },

  async uploadListingImages(listingId, files) {
    if (files.length > 10) {
      throw new Error("Maximum 10 images allowed");
    }

    const results = [];
    for (const file of files) {
      const result = await this.uploadListingImage(listingId, file);
      results.push(result);
    }
    return results;
  },

  async removeListingImage(path) {
    const { error } = await supabase.storage
      .from("listing-images")
      .remove([path]);

    if (error) throw error;
  },

  async uploadIdentityDocument(userId, file) {
    this.validateFile(file, "document");

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

    return {
      url: signedUrl,
      name: file.name,
      path: fileName,
    };
  },

  async uploadDisputeEvidence(userId, files) {
    const results = [];

    for (const file of files) {
      this.validateFile(file, "document");

      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("dispute-evidence")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { signedUrl }, error: signedError } = await supabase.storage
        .from("dispute-evidence")
        .createSignedUrl(fileName, 86400);

      if (signedError) throw signedError;

      results.push({
        url: signedUrl,
        name: file.name,
        path: fileName,
      });
    }

    return results;
  },

  async uploadAvatar(userId, file) {
    this.validateFile(file, "image");

    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("listing-images")
      .getPublicUrl(fileName);

    return publicUrl;
  },

  getPublicUrl(path, bucket = "listing-images") {
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return publicUrl;
  },

  async getSignedUrl(path, bucket = "identity-documents", expiresIn = 3600) {
    const { data: { signedUrl }, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return signedUrl;
  },
};

export default uploadService;
