import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface SyncConfig {
  is_active: boolean;
  corporate_api_url: string;
  sync_packages_enabled: boolean;
  sync_recharges_enabled: boolean;
  last_sync_at: string | null;
}

interface SyncLog {
  sync_type: string;
  status: string;
  records_processed: number;
  records_failed: number;
  error_message: string | null;
  created_at: string;
}

interface SyncStats {
  total_syncs_today: number;
  failed_syncs_today: number;
  packages_synced: number;
  recharges_synced: number;
  users_auto_created?: number;
}

interface AutoCreatedUser {
  id: string;
  email: string;
  full_name: string;
  company: string | null;
  sms_balance: number;
  created_at: string;
}

@Component({
  selector: 'bo-sync-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sync-page.component.html',
  styleUrl: './sync-page.component.scss'
})
export class SyncPageComponent implements OnInit {
  loading = true;
  syncing = false;
  syncingUsers = false;
  showConfig = false;
  showAutoCreatedUsers = false;
  noticeMessage = '';
  logs: SyncLog[] = [];
  autoCreatedUsers: AutoCreatedUser[] = [];
  stats: SyncStats = {
    total_syncs_today: 0,
    failed_syncs_today: 0,
    packages_synced: 0,
    recharges_synced: 0,
    users_auto_created: 0,
  };
  config: SyncConfig = {
    is_active: true,
    corporate_api_url: '',
    sync_packages_enabled: true,
    sync_recharges_enabled: false,
    last_sync_at: null,
  };
  editedConfig = {
    corporate_api_url: '',
    sync_packages_enabled: true,
    sync_recharges_enabled: false,
  };

  ngOnInit(): void {
    this.logs = [];
    this.autoCreatedUsers = [];
    this.editedConfig = {
      corporate_api_url: this.config.corporate_api_url,
      sync_packages_enabled: this.config.sync_packages_enabled,
      sync_recharges_enabled: this.config.sync_recharges_enabled,
    };
    this.loading = false;
  }

  handleSaveConfig(): void {
    this.config = {
      ...this.config,
      corporate_api_url: this.editedConfig.corporate_api_url,
      sync_packages_enabled: this.editedConfig.sync_packages_enabled,
      sync_recharges_enabled: this.editedConfig.sync_recharges_enabled,
    };
    this.noticeMessage = 'La configuración segura de sincronización se conectará cuando exista backend y base de datos definidos.';
    this.showConfig = false;
  }

  cancelConfig(): void {
    this.editedConfig = {
      corporate_api_url: this.config.corporate_api_url,
      sync_packages_enabled: this.config.sync_packages_enabled,
      sync_recharges_enabled: this.config.sync_recharges_enabled,
    };
    this.showConfig = false;
  }

  handleSyncPackages(): void {
    this.syncing = true;
    this.noticeMessage = 'La sincronización segura de paquetes se conectará cuando exista backend y Edge Function definidos.';
    this.syncing = false;
  }

  handleSyncUsers(): void {
    this.syncingUsers = true;
    this.noticeMessage = 'La sincronización segura de usuarios se conectará cuando exista backend y Edge Function definidos.';
    this.syncingUsers = false;
  }

  getStatusLabel(status: string): string {
    if (status === 'success') {
      return 'Exitoso';
    }

    if (status === 'failed') {
      return 'Fallido';
    }

    return 'Parcial';
  }

  getSyncTypeName(type: string): string {
    const names: Record<string, string> = {
      packages: 'Paquetes',
      recharges: 'Recargas',
      users: 'Usuarios',
      inventory: 'Inventario',
    };
    return names[type] || type;
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
}
