export type SmsMessageStatus = 'pending' | 'sent' | 'failed' | 'delivered';

export interface SmsMessage {
  id?: string;
  recipient: string;
  message: string;
  status?: SmsMessageStatus;
  segments?: number;
  cost?: number;
  creditsUsed?: number;
  createdAt?: string;
}

export interface SmsSendRequest {
  recipient?: string;
  recipients?: string[];
  message: string;
  templateId?: string;
}

export interface SmsSendResult {
  success: boolean;
  message_id?: string;
  recipient?: string;
  segments?: number;
  cost?: number;
  status?: string;
  test_mode?: boolean;
  batchId?: string;
  sentCount?: number;
  failedCount?: number;
  error?: string;
}

export interface AdminSmsMessageProfile {
  full_name: string | null;
  email: string | null;
  razon_social: string | null;
  ruc: string | null;
}

export interface SmsProviderResponse {
  test_mode?: boolean;
  provider?: string;
  provider_name?: string;
  [key: string]: unknown;
}

export interface AdminSmsMessage {
  id: string;
  user_id: string;
  recipient: string;
  message: string;
  segments: number;
  cost: number;
  status: SmsMessageStatus;
  provider_message_id: string | null;
  provider_response: SmsProviderResponse | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  profile: AdminSmsMessageProfile | null;
}

export interface AdminSmsMessageFilters {
  status?: SmsMessageStatus | 'all';
}

export type SmsTemplateCategory =
  | 'general'
  | 'marketing'
  | 'cobranza'
  | 'recordatorio'
  | 'soporte'
  | 'otro';

export interface SmsTemplate {
  id: string;
  user_id: string;
  name: string;
  content: string;
  category: SmsTemplateCategory;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSmsTemplateRequest {
  name: string;
  content: string;
  category: SmsTemplateCategory;
  variables?: string[];
}

export interface UpdateSmsTemplateRequest {
  name?: string;
  content?: string;
  category?: SmsTemplateCategory;
  variables?: string[];
  is_active?: boolean;
}
