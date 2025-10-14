export type DialogMode = 'create' | 'edit';

export interface ProductArea { id_area: number; name: string; }
export interface ProductCategory { id_category: number; name: string; }

export interface Product {
  id_product?: number;
  name: string;
  price: number;
  category: ProductCategory;
  id_area: number;         // FK a área dinámica
  description?: string;
  image?: string;          
  is_active: boolean;
}

export type ProductDialogData = { mode: DialogMode; value?: Product; id_company?: number; id_branch?: number };
