export interface CompanySettings {
  id_company: number;
  name: string;
  legal_name: string;
  rfc: string;
  street: string;
  num_ext: string;
  cp: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  tax_percentage: number;
  ticket_header?: string ;
  ticket_footer?: string;
}

export interface UpdateCompanyResponse {
  message: string;
  company: CompanySettings;
}
