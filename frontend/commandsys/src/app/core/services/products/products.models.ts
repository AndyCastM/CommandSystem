// === Entidades base ===
export interface Category {
  id_category: number;
  name: string;
}

export interface Area {
  id_area?: number;
  name: string;
}

export interface ProductImage {
  id_company_product: number;
  id_image: number;
  image_url: string;
  public_id: string;
  description_ai?: string;
  created_at?: string;
}

// === API Response ===
export interface CompanyProductApiResponse {
  statusCode: number;
  message: string;
  data: CompanyProduct[];
  timestamp: string;
}

// === Product principal ===
export interface CompanyProduct {
  id_company_product: number;
  name: string;
  category: string;   // Ej: "Pizzas"
  area: string;       // Ej: "Cocina"
  id_category?: number;
  id_area?: number;
  base_price: number;
  description?: string;
  image_url?: string;
  preparation_time?: number; // minutos
  is_active: number;         // 0 | 1
  options?: CompanyProductOption[];
}

export interface BranchProduct {
  id_company_product: number;
  id_branch_product: number;
  name: string;
  category: string;   // Ej: "Pizzas"
  area: string;       // Ej: "Cocina"
  id_category?: number;
  id_area?: number;
  base_price: number;
  description?: string;
  image_url?: string;
  preparation_time?: number; // minutos
  is_active: boolean;         // 0 | 1
  options?: CompanyProductOption[];
}
// === Opciones personalizables ===
export interface CompanyProductOptionTier {
  selection_count: number;
  extra_price: number;
}

export interface CompanyProductOptionValue {
  name: string;
  extra_price?: number;
}

export interface CompanyProductOption {
  name: string;
  is_required?: number;    // 0 | 1
  multi_select?: number;   // 0 | 1
  max_selection?: number;
  tiers?: CompanyProductOptionTier[];
  values?: CompanyProductOptionValue[];
}

// === DTO EXACTO QUE ESPERA EL BACKEND ===
export interface CreateCompanyProductDto {
  id_area: number;
  id_category: number;
  name: string;
  description?: string;
  base_price: number;
  image_url?: string;
  preparation_time?: number; // minutos
  options?: CompanyProductOption[];
  is_active?: number | boolean;
}

export type UpdateCompanyProductDto = Partial<CreateCompanyProductDto> & {
  id_company_product?: number;
};

// === Uploads ===
export interface UploadResponse {
  url: string;
  public_id: string;
}

export interface ProductImagesResponse {
  message?: string;
  count?: number;
  images?: ProductImage[];
}

// Obtener detalle de un producto 
export interface ProductDetail {
  id_company_product: number;
  id_category: number;
  id_area: number;

  name: string;
  description?: string;
  base_price: number;
  preparation_time: number;

  image_url?: string | null;
  is_active: number | boolean; // el back manda 1

  category_name?: string;
  area_name?: string;

  options: ProductDetailOption[];
}

export interface ProductDetailOption {
  id_option: number;
  name: string;
  is_required: boolean;    // 👈 en el JSON viene true/false
  multi_select: boolean;   // 👈 igual
  max_selection: number;

  values: ProductDetailOptionValue[];
  tiers: ProductDetailOptionTier[];
}

export interface ProductDetailOptionValue {
  id_value: number;
  name: string;
  extra_price: number;
  is_active: boolean;
}

export interface ProductDetailOptionTier {
  id_tier: number;
  selection_count: number;
  extra_price: number;
}
