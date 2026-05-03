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

export interface BackofficeClientProfile {
  id: string;
  email: string;
  full_name: string | null;
  razon_social: string | null;
  ruc: string | null;
  phone: string | null;
  credits: number;
  total_spent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface BackofficeClientRecharge {
  id: string;
  sms_credits: number;
  amount: number;
  payment_method: string | null;
  operation_code: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface BackofficeClientMessage {
  id: string;
  recipient: string;
  message: string;
  segments: number;
  cost: number;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  created_at: string;
  sent_at: string | null;
  error_message: string | null;
}

export interface BackofficeClientDetail {
  profile: BackofficeClientProfile;
  recentRecharges: BackofficeClientRecharge[];
  recentMessages: BackofficeClientMessage[];
  auditLogs: BackofficeProfileAuditLog[];
  counts: {
    pendingRecharges: number;
    approvedRecharges: number;
    sentMessages: number;
    failedMessages: number;
  };
}

export interface UpdateClientBasicInfoPayload {
  full_name: string | null;
  razon_social: string | null;
  ruc: string | null;
  phone: string | null;
  is_active: boolean;
}

export interface BackofficeProfileAuditLog {
  id: string;
  profile_id: string;
  changed_by: string | null;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  admin: {
    full_name: string | null;
    email: string | null;
  } | null;
}
