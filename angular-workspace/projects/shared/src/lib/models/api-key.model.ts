export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  description: string | null;
}

export interface CreatedApiKey extends ApiKey {
  value: string;
}

export interface BackofficeApiKey extends ApiKey {
  userId: string;
  clientEmail: string;
  clientName: string | null;
  clientCompany: string | null;
}
