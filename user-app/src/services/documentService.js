import { supabase } from "./supabase";
import { invoke } from "./securityService";
export const documentService = {
  async list(orderId) {
    let query = supabase
      .from("billing_documents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (orderId) query = query.eq("order_id", orderId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  async get(id) {
    const { data, error } = await supabase
      .from("billing_documents")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },
  async emails() {
    const { data, error } = await supabase
      .from("document_email_queue")
      .select("document_id,status,last_error,accepted_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data;
  },
  send: (id) => invoke("send-documents", { document_id: id }),
};
