import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '@sms-fortuna/shared';

interface ApiKeyRecord {
  id: string;
  user_id: string;
  name: string;
  key: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

@Component({
  selector: 'sms-api-keys-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './api-keys-page.component.html',
  styleUrl: './api-keys-page.component.scss'
})
export class ApiKeysPageComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);

  readonly apiExample = `fetch('https://TU_SUPABASE_URL/functions/v1/send-sms', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer TU_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: '+51987654321',
    message: 'Tu mensaje aquí'
  })
})`;

  apiKeys: ApiKeyRecord[] = [];
  showModal = false;
  newKeyName = '';
  visibleKeys = new Set<string>();
  copiedKeyId: string | null = null;
  noticeMessage = '';
  modalMessage = '';

  ngOnInit(): void {
    void this.fetchApiKeys();
  }

  openModal(): void {
    this.showModal = true;
    this.newKeyName = '';
    this.modalMessage = '';
  }

  closeModal(): void {
    this.showModal = false;
    this.newKeyName = '';
    this.modalMessage = '';
  }

  showCreatePendingMessage(): void {
    this.modalMessage = 'La generación segura de API keys se conectará en la siguiente fase.';
  }

  requestDelete(_id: string): void {
    if (!window.confirm('¿Estás seguro de eliminar esta API key?')) {
      return;
    }

    this.noticeMessage = 'La revocación segura de API keys se conectará en la siguiente fase.';
  }

  toggleVisibility(id: string): void {
    const next = new Set(this.visibleKeys);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    this.visibleKeys = next;
  }

  isVisible(id: string): boolean {
    return this.visibleKeys.has(id);
  }

  async copyToClipboard(apiKey: ApiKeyRecord): Promise<void> {
    try {
      await navigator.clipboard.writeText(apiKey.key);
      this.copiedKeyId = apiKey.id;
      window.setTimeout(() => {
        this.copiedKeyId = null;
      }, 2000);
    } catch {
      this.noticeMessage = 'No se pudo copiar la API key.';
    }
  }

  maskKey(key: string): string {
    if (key.length <= 12) {
      return key;
    }

    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  }

  formatCreatedAt(value: string): string {
    return new Date(value).toLocaleString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatLastUsedAt(value: string): string {
    return new Date(value).toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private async fetchApiKeys(): Promise<void> {
    try {
      const { data: sessionData } = await this.supabase.instance.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) {
        this.apiKeys = [];
        return;
      }

      const { data, error } = await this.supabase.instance
        .from('api_keys')
        .select('id, user_id, name, key, is_active, created_at, last_used_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        this.apiKeys = [];
        return;
      }

      this.apiKeys = ((data as ApiKeyRecord[] | null) ?? []).map((apiKey) => ({
        ...apiKey,
        name: apiKey.name ?? '',
        key: apiKey.key ?? '',
        is_active: Boolean(apiKey.is_active),
        last_used_at: apiKey.last_used_at ?? null
      }));
    } catch {
      this.apiKeys = [];
    }
  }
}
