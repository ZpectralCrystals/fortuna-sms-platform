export type RechargeStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'yape' | 'plin' | 'transferencia' | 'tarjeta' | 'efectivo' | 'otro' | string;

export interface SmsPackage {
  id: string;
  name: string;
  sms_credits: number;
  base_price: number;
  tax_rate: number;
  total_price: number;
  price_per_sms: number;
  is_popular: boolean;
  is_active: boolean;
  created_at?: string | null;
}

export interface Recharge {
  id: string;
  user_id: string;
  package_id: string | null;
  sms_credits: number;
  amount: number;
  payment_method: PaymentMethod | null;
  operation_code: string | null;
  status: RechargeStatus;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  package: SmsPackage | null;
}

export interface RechargeProfile {
  full_name: string;
  email: string;
  razon_social: string | null;
  ruc: string | null;
}

export interface AdminRecharge extends Recharge {
  profile: RechargeProfile | null;
}

export interface CreateRechargeRequest {
  package_id: string;
  sms_credits: number;
  amount: number;
  payment_method: PaymentMethod;
  operation_code?: string | null;
}
