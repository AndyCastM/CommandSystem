export class CompanyResponseDto {
  id_company: number;
  name: string;
  legal_name: string;
  rfc: string;
  phone: string;
  email: string;
  created_at: Date;
  updated_at?: Date;
  admin_user?: {
    id_user: number;
    username: string;
    name: string;
    last_name: string;
    role: string;
  };
}
