export function formatDate(value?: string | Date): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}
