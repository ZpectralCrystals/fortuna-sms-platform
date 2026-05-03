import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BackofficeClientDetail,
  BackofficeClientProfile,
  BackofficeService,
  UpdateClientBasicInfoPayload
} from '@sms-fortuna/shared';

type ClientStatusFilter = 'all' | 'active' | 'inactive';
type RechargeStatus = 'pending' | 'approved' | 'rejected';
type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed';

interface ClientEditForm {
  full_name: string;
  razon_social: string;
  ruc: string;
  phone: string;
  is_active: boolean;
}

@Component({
  selector: 'bo-accounts-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accounts-page.component.html',
  styleUrl: './accounts-page.component.scss'
})
export class AccountsPageComponent implements OnInit {
  private readonly backofficeService = inject(BackofficeService);

  clients: BackofficeClientProfile[] = [];
  loading = true;
  detailLoading = false;
  saving = false;
  errorMessage = '';
  detailError = '';
  successMessage = '';
  editError = '';
  searchTerm = '';
  statusFilter: ClientStatusFilter = 'all';
  selectedDetail: BackofficeClientDetail | null = null;
  editMode = false;
  editForm: ClientEditForm = this.emptyEditForm();

  get filteredClients(): BackofficeClientProfile[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.clients.filter((client) => {
      const matchesStatus = this.statusFilter === 'all'
        || (this.statusFilter === 'active' && client.is_active)
        || (this.statusFilter === 'inactive' && !client.is_active);

      if (!matchesStatus) {
        return false;
      }

      if (!search) {
        return true;
      }

      return this.clientName(client).toLowerCase().includes(search)
        || client.email.toLowerCase().includes(search)
        || (client.razon_social ?? '').toLowerCase().includes(search)
        || (client.ruc ?? '').toLowerCase().includes(search)
        || (client.phone ?? '').toLowerCase().includes(search);
    });
  }

  get totalClients(): number {
    return this.clients.length;
  }

  get activeClients(): number {
    return this.clients.filter((client) => client.is_active).length;
  }

  get inactiveClients(): number {
    return this.clients.filter((client) => !client.is_active).length;
  }

  get totalCredits(): number {
    return this.clients.reduce((sum, client) => sum + client.credits, 0);
  }

  get totalSpent(): number {
    return this.clients.reduce((sum, client) => sum + client.total_spent, 0);
  }

  get topCreditClient(): BackofficeClientProfile | null {
    return this.clients.reduce<BackofficeClientProfile | null>((top, client) => {
      if (!top || client.credits > top.credits) {
        return client;
      }

      return top;
    }, null);
  }

  async ngOnInit(): Promise<void> {
    await this.loadClients();
  }

  async loadClients(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      this.clients = await this.backofficeService.listClients();
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudieron cargar los clientes.';
      this.clients = [];
    } finally {
      this.loading = false;
    }
  }

  async openClient(client: BackofficeClientProfile): Promise<void> {
    this.selectedDetail = null;
    this.detailError = '';
    this.editError = '';
    this.successMessage = '';
    this.editMode = false;
    this.detailLoading = true;

    try {
      this.selectedDetail = await this.backofficeService.getClientDetail(client.id);
      this.editForm = this.toEditForm(this.selectedDetail.profile);
    } catch (error) {
      this.detailError = error instanceof Error
        ? error.message
        : 'No se pudo cargar el detalle del cliente.';
    } finally {
      this.detailLoading = false;
    }
  }

  closeClient(): void {
    this.selectedDetail = null;
    this.detailError = '';
    this.editError = '';
    this.successMessage = '';
    this.editMode = false;
  }

  startEdit(): void {
    if (!this.selectedDetail) {
      return;
    }

    this.editMode = true;
    this.editError = '';
    this.editForm = this.toEditForm(this.selectedDetail.profile);
  }

  cancelEdit(): void {
    this.editMode = false;
    this.editError = '';

    if (this.selectedDetail) {
      this.editForm = this.toEditForm(this.selectedDetail.profile);
    }
  }

  async saveClient(): Promise<void> {
    if (!this.selectedDetail) {
      return;
    }

    this.editError = '';
    this.successMessage = '';

    const validationError = this.validateEditForm();

    if (validationError) {
      this.editError = validationError;
      return;
    }

    const payload: UpdateClientBasicInfoPayload = {
      full_name: this.toNullable(this.editForm.full_name),
      razon_social: this.toNullable(this.editForm.razon_social),
      ruc: this.toNullable(this.editForm.ruc),
      phone: this.toNullablePhone(this.editForm.phone),
      is_active: this.editForm.is_active
    };

    this.saving = true;

    try {
      await this.backofficeService.updateClientBasicInfo(this.selectedDetail.profile.id, payload);
      this.successMessage = 'Cliente actualizado correctamente.';
      this.editMode = false;
      await this.refreshSelectedClient();
      await this.loadClients();
    } catch (error) {
      this.editError = error instanceof Error
        ? error.message
        : 'No se pudo actualizar el cliente.';
    } finally {
      this.saving = false;
    }
  }

  async toggleClientActive(client: BackofficeClientProfile): Promise<void> {
    const nextState = !client.is_active;
    const action = nextState ? 'activar' : 'desactivar';
    const warning = nextState
      ? 'El cliente podrá ingresar nuevamente al dashboard.'
      : 'El cliente inactivo no podrá entrar al dashboard cliente.';

    if (!window.confirm(`¿Deseas ${action} a ${this.clientName(client)}? ${warning}`)) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    try {
      await this.backofficeService.setClientActive(client.id, nextState);
      this.successMessage = `Cliente ${nextState ? 'activado' : 'desactivado'} correctamente.`;
      await this.loadClients();

      if (this.selectedDetail?.profile.id === client.id) {
        await this.refreshSelectedClient();
      }
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudo cambiar el estado del cliente.';
    }
  }

  async toggleSelectedClientActive(): Promise<void> {
    if (!this.selectedDetail) {
      return;
    }

    await this.toggleClientActive(this.selectedDetail.profile);
  }

  clientName(client: BackofficeClientProfile): string {
    return client.full_name || client.email || 'Cliente sin nombre';
  }

  clientCompany(client: BackofficeClientProfile): string | null {
    if (client.razon_social && client.ruc) {
      return `${client.razon_social} / ${client.ruc}`;
    }

    return client.razon_social || client.ruc || null;
  }

  rechargeStatusLabel(status: RechargeStatus): string {
    const labels: Record<RechargeStatus, string> = {
      approved: 'Aprobada',
      pending: 'Pendiente',
      rejected: 'Rechazada'
    };

    return labels[status];
  }

  messageStatusLabel(status: MessageStatus): string {
    const labels: Record<MessageStatus, string> = {
      delivered: 'Entregado',
      failed: 'Fallido',
      pending: 'Pendiente',
      sent: 'Enviado'
    };

    return labels[status];
  }

  auditActorName(log: { admin: { full_name: string | null; email: string | null } | null }): string {
    return log.admin?.full_name || log.admin?.email || 'Admin';
  }

  auditActionLabel(action: string): string {
    const labels: Record<string, string> = {
      admin_update_client_profile: 'Actualización de perfil',
      admin_set_client_active: 'Cambio de estado'
    };

    return labels[action] || action;
  }

  auditSummary(log: { old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null }): string {
    const oldData = log.old_data ?? {};
    const newData = log.new_data ?? {};
    const changes = Object.keys(newData)
      .filter((key) => oldData[key] !== newData[key])
      .map((key) => this.auditFieldLabel(key));

    return changes.length ? changes.join(', ') : 'Sin diferencias visibles';
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-PE');
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '-';
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

  private async refreshSelectedClient(): Promise<void> {
    if (!this.selectedDetail) {
      return;
    }

    const detail = await this.backofficeService.getClientDetail(this.selectedDetail.profile.id);
    this.selectedDetail = detail;
    this.editForm = this.toEditForm(detail.profile);
  }

  private validateEditForm(): string {
    const ruc = this.editForm.ruc.trim();
    const phone = this.normalizePhone(this.editForm.phone);

    if (ruc && !/^\d{11}$/.test(ruc)) {
      return 'El RUC debe tener 11 dígitos.';
    }

    if (phone && !/^\+51\d{9}$/.test(phone)) {
      return 'El teléfono debe tener formato peruano +51XXXXXXXXX o quedar vacío.';
    }

    return '';
  }

  private toEditForm(client: BackofficeClientProfile): ClientEditForm {
    return {
      full_name: client.full_name ?? '',
      razon_social: client.razon_social ?? '',
      ruc: client.ruc ?? '',
      phone: client.phone ?? '',
      is_active: client.is_active
    };
  }

  private emptyEditForm(): ClientEditForm {
    return {
      full_name: '',
      razon_social: '',
      ruc: '',
      phone: '',
      is_active: true
    };
  }

  private toNullable(value: string): string | null {
    const cleanValue = value.trim();
    return cleanValue ? cleanValue : null;
  }

  private toNullablePhone(value: string): string | null {
    const cleanValue = this.normalizePhone(value);
    return cleanValue ? cleanValue : null;
  }

  private normalizePhone(value: string): string {
    return value.trim().replace(/\s+/g, '');
  }

  private auditFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      full_name: 'nombre',
      razon_social: 'razón social',
      ruc: 'RUC',
      phone: 'teléfono',
      is_active: 'estado'
    };

    return labels[field] || field;
  }
}
