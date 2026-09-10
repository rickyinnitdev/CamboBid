import { supabase } from "./supabase";

export const roleService = {
  async getRoles() {
    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .order("name");
    if (error) throw error;
    return data;
  },

  async getRoleById(id) {
    const { data, error } = await supabase
      .from("roles")
      .select("*, role_permissions(*, permissions(*))")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async createRole({ name, description }) {
    const { data, error } = await supabase
      .from("roles")
      .insert({ name, description, is_system: false })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateRole(id, { name, description }) {
    const { data, error } = await supabase
      .from("roles")
      .update({ name, description })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteRole(id) {
    const { data: role } = await supabase
      .from("roles")
      .select("is_system")
      .eq("id", id)
      .single();

    if (role?.is_system) {
      throw new Error("Cannot delete system roles");
    }

    const { error } = await supabase.from("roles").delete().eq("id", id);
    if (error) throw error;
  },

  async assignPermission(roleId, permissionId) {
    const { data, error } = await supabase
      .from("role_permissions")
      .insert({ role_id: roleId, permission_id: permissionId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async revokePermission(roleId, permissionId) {
    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .eq("permission_id", permissionId);
    if (error) throw error;
  },

  async getPermissions() {
    const { data, error } = await supabase
      .from("permissions")
      .select("*")
      .order("resource");
    if (error) throw error;
    return data;
  },
};

export default roleService;
