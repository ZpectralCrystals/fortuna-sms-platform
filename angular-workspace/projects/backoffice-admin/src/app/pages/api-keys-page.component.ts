import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface ApiKeyUser {
  id: string;
  full_name: string;
  email: string;
  company: string | null;
}

interface ApiKeyRecord {
  id: string;
  user_id: string;
  key_name: string;
  api_key: string;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  users: {
    full_name: string;
    email: string;
    company: string | null;
  };
}

@Component({
  selector: 'bo-api-keys-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './api-keys-page.component.html',
  styleUrl: './api-keys-page.component.scss'
})
export class ApiKeysPageComponent implements OnInit {
  readonly blockedMessage = 'La gestión segura de API Keys se conectará cuando exista backend y base de datos definidos.';

  apiKeys: ApiKeyRecord[] = [];
  users: ApiKeyUser[] = [];
  loading = true;
  showModal = false;
  showKeyModal = false;
  newApiKey = '';
  visibleKeys = new Set<string>();
  message = '';
  modalMessage = '';
  newKeyForm = {
    user_id: '',
    key_name: '',
    expires_in_days: '0'
  };

  ngOnInit(): void {
    this.apiKeys = [];
    this.users = [];
    this.loading = false;
  }

  openCreateModal(): void {
    this.message = '';
    this.modalMessage = '';
    this.showModal = true;
  }

  closeCreateModal(): void {
    this.showModal = false;
    this.modalMessage = '';
    this.newKeyForm = {
      user_id: '',
      key_name: '',
      expires_in_days: '0'
    };
  }

  handleCreateApiKey(): void {
    this.modalMessage = this.blockedMessage;
    this.message = this.blockedMessage;
  }

  closeKeyModal(): void {
    this.showKeyModal = false;
    this.newApiKey = '';
  }

  showBlockedMessage(): void {
    this.message = this.blockedMessage;
  }

  maskApiKey(key: string): string {
    return `${key.substring(0, 8)}${'•'.repeat(32)}${key.substring(key.length - 8)}`;
  }

  formatDate(value: string | null): string {
    if (!value) {
      return 'Nunca';
    }

    return new Date(value).toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
}
