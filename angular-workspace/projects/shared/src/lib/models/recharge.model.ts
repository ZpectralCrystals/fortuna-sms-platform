export interface Recharge {
  id: string;
  userId: string;
  amount: number;
  credits: number;
  status: 'pending' | 'approved' | 'rejected' | 'failed';
  createdAt?: string;
}
