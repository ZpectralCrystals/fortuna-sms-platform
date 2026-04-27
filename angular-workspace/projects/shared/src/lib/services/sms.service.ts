import { Injectable } from '@angular/core';
import { SmsSendRequest, SmsSendResult } from '../models/sms.model';

@Injectable({ providedIn: 'root' })
export class SmsService {
  async sendSingle(_request: SmsSendRequest): Promise<SmsSendResult> {
    // TODO: call backend endpoint or Supabase Edge Function.
    return { success: false, error: 'Not implemented' };
  }

  async sendBulk(_request: SmsSendRequest): Promise<SmsSendResult> {
    // TODO: implement bulk SMS flow.
    return { success: false, error: 'Not implemented' };
  }

  async uploadCampaign(_file: File): Promise<void> {
    // TODO: implement file upload flow.
  }
}
