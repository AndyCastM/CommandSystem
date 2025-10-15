// Entidades que consumes
export interface Category {
  id_category: number;
  name: string;
  slug?: string;
}
export interface Area {
  id_area: number;
  name: string;
  code?: string;
}
export interface ProductImage {
  id_company_product: number;
  id_image: number;
  image_url: string;
  public_id: string;
  description_ai?: string;
  created_at?: string;
}

// products.models.ts
export interface CompanyProductApiResponse {
  statusCode: number;
  message: string;
  data: CompanyProduct[];
  timestamp: string;
}

export interface CompanyProduct {
  id_company_product: number;
  name: string;
  category: string;   // string, p.ej. "Pizzas"
  area: string;       // string, p.ej. "Cocina"
  base_price: number;
  preparation_time?: number; // minutos
  is_active: number;  // 0 | 1
}

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
  is_required?: number;   // 0/1
  multi_select?: number;  // 0/1
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
  preparation_time?: number; // minutos
  options?: CompanyProductOption[];
  is_active?: boolean;
}
export type UpdateCompanyProductDto = Partial<CreateCompanyProductDto> & { id_product?: number };

// Upload
export interface UploadResponse {
  url: string;
  public_id: string;
}

export interface ProductImagesResponse {
  message?: string;
  count?: number;
  images?: ProductImage[];
}
