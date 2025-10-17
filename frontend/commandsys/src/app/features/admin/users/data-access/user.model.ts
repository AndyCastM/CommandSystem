
export interface CreateUser {
  id_company?: number;
  id_branch?: number;
  id_role: number;
  name: string;
  last_name: string;
  last_name2?: string;
  username: string;
  password: string;
  is_active?: boolean;
  created_at?: string;
}

export interface User {
  id_user: number;
  id_company?: number;
  id_branch?: number;
  role_name: string;
  name: string;
  last_name: string;
  last_name2?: string;
  username: string;
  is_active: boolean;
  created_at: string;
}
