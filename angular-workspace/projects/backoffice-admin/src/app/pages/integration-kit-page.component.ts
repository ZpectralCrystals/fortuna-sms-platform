import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

interface IntegrationFile {
  name: string;
  createdAt: string;
  size: number;
  publicUrl: string;
}

@Component({
  selector: 'bo-integration-kit-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './integration-kit-page.component.html',
  styleUrl: './integration-kit-page.component.scss'
})
export class IntegrationKitPageComponent implements OnInit {
  files: IntegrationFile[] = [];
  loadingFiles = true;
  uploading = false;
  uploadStatus: { type: 'success' | 'error'; message: string } | null = null;

  ngOnInit(): void {
    this.files = [];
    this.loadingFiles = false;
  }

  handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.name.endsWith('.zip')) {
      this.uploadStatus = { type: 'error', message: 'Solo se permiten archivos ZIP' };
      input.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.uploadStatus = { type: 'error', message: 'Solo archivos ZIP, máximo 10MB' };
      input.value = '';
      return;
    }

    this.uploading = true;
    this.uploadStatus = {
      type: 'success',
      message: 'La carga segura del kit de integración se conectará cuando exista backend y storage definidos.',
    };
    this.uploading = false;
    input.value = '';
  }

  showBlockedAction(): void {
    this.uploadStatus = {
      type: 'error',
      message: 'La gestión segura de archivos se conectará cuando exista backend y URLs públicas definidas.',
    };
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
