export interface SmsMessage {
  id?: string;
  recipient: string;
  message: string;
  status?: 'pending' | 'sent' | 'failed' | 'delivered';
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
