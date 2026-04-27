export type UserRole = 'client' | 'admin' | 'super_admin';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  companyName?: string;
  ruc?: string;
  credits?: number;
  isActive?: boolean;
}
