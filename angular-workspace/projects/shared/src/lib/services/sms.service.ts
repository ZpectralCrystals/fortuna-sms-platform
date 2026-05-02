import { Injectable, inject } from '@angular/core';
import { SmsSendRequest, SmsSendResult } from '../models/sms.model';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class SmsService {
  private readonly supabase = inject(SupabaseService);

  async sendSingle(request: SmsSendRequest): Promise<SmsSendResult> {
    const recipient = request.recipient ?? request.recipients?.[0] ?? '';

    const { data, error } = await this.supabase.instance.functions.invoke<SmsSendResult>('send-sms', {
      body: {
        recipient,
        message: request.message
      }
    });

    if (error) {
      throw new Error(await this.getFunctionErrorMessage(error));
    }

    if (!data?.success) {
      throw new Error(data?.error || 'No se pudo enviar el SMS.');
    }

    return data;
  }

  async sendBulk(_request: SmsSendRequest): Promise<SmsSendResult> {
    return {
      success: false,
      error: 'Envío múltiple se implementará en siguiente fase'
    };
  }

  async uploadCampaign(_file: File): Promise<void> {
    // TODO: implement file upload flow.
  }

  private async getFunctionErrorMessage(error: unknown): Promise<string> {
    const context = (error as { context?: unknown }).context;

    if (context instanceof Response) {
      try {
        const payload = await context.clone().json() as { error?: string; message?: string };
        return payload.error || payload.message || 'No se pudo enviar el SMS.';
      } catch {
        return 'No se pudo enviar el SMS.';
      }
    }

    return error instanceof Error
      ? error.message
      : 'No se pudo enviar el SMS.';
  }
}
