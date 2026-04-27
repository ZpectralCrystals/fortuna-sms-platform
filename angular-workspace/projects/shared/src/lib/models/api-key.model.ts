export interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  isActive: boolean;
  createdAt?: string;
  lastUsedAt?: string;
}
