export function isValidPeruRucFormat(value: string): boolean {
  return /^(10|15|17|20)\d{9}$/.test(value.trim());
}
