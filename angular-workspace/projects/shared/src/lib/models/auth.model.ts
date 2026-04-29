export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName?: string;
  companyName?: string;
  ruc?: string;
  phone?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}
