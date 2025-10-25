
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
  branch?: string;
  role_name: string;
  id_role?: number;
  name: string;
  last_name: string;
  last_name2?: string;
  username: string;
  is_active: boolean;
  created_at: string;
}

export type UpdateUser = Partial<Omit<User, 'id_company'  | 'role_name' | 'created_at'>>;
