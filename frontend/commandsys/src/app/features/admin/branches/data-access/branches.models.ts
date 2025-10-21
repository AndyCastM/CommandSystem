export interface Branch {
  id_branch: number;
  id_company: number;
  name: string;
  street: string;
  num_ext?: string;
  colony?: string;       
  cp: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  users: {
    name: string;
    last_name: string;
    username: string;
    id_role: number;
    is_active: number;
  }[]
}

export type CreateBranchDto = Omit<Branch, 'id_branch' | 'is_active' | 'created_at' | 'updated_at'> & {
  is_active?: boolean;
};

export type UpdateBranchDto = Partial<Omit<Branch, 'id_branch' | 'id_company'>>;
