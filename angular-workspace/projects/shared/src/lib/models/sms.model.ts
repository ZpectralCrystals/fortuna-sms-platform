export interface SmsMessage {
  id?: string;
  to: string;
  message: string;
  status?: 'pending' | 'sent' | 'failed' | 'delivered';
  creditsUsed?: number;
  createdAt?: string;
}

export interface SmsSendRequest {
  recipients: string[];
  message: string;
  templateId?: string;
}

export interface SmsSendResult {
  success: boolean;
  batchId?: string;
  sentCount?: number;
  failedCount?: number;
  error?: string;
}
