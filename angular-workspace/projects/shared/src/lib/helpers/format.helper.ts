export function formatCredits(value?: number): string {
  return new Intl.NumberFormat('es-PE').format(value ?? 0);
}

export function maskApiKey(value: string): string {
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
