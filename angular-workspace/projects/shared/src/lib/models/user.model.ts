export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  razonSocial?: string;
  ruc?: string;
  phone?: string;
  credits?: number;
  totalSpent?: number;
  isActive?: boolean;
}
