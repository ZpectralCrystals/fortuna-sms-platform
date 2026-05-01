type FormatValue = number | string | null | undefined;
type DateValue = string | number | Date | null | undefined;

const DEFAULT_LOCALE = 'es-PE';
const DEFAULT_CURRENCY = 'PEN';

function toFiniteNumber(value: FormatValue): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function toValidDate(value: DateValue): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatNumber(
  value: FormatValue,
  locale = DEFAULT_LOCALE,
  options: Intl.NumberFormatOptions = {}
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(toFiniteNumber(value));
  } catch {
    return new Intl.NumberFormat(DEFAULT_LOCALE).format(toFiniteNumber(value));
  }
}

export function formatCurrency(
  value: FormatValue,
  locale = DEFAULT_LOCALE,
  currency = DEFAULT_CURRENCY
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(toFiniteNumber(value));
  } catch {
    return new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: 'currency',
      currency: DEFAULT_CURRENCY,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(toFiniteNumber(value));
  }
}

export function formatDate(value: DateValue, locale = DEFAULT_LOCALE): string {
  const date = toValidDate(value);
  if (!date) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }
}

export function formatDateTime(value: DateValue, locale = DEFAULT_LOCALE): string {
  const date = toValidDate(value);
  if (!date) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }
}

export function formatPercent(
  value: FormatValue,
  locale = DEFAULT_LOCALE,
  fractionDigits = 1
): string {
  const safeFractionDigits = Math.max(0, Math.min(20, Math.trunc(toFiniteNumber(fractionDigits))));

  try {
    return `${new Intl.NumberFormat(locale, {
      minimumFractionDigits: safeFractionDigits,
      maximumFractionDigits: safeFractionDigits
    }).format(toFiniteNumber(value))}%`;
  } catch {
    return `${new Intl.NumberFormat(DEFAULT_LOCALE, {
      minimumFractionDigits: safeFractionDigits,
      maximumFractionDigits: safeFractionDigits
    }).format(toFiniteNumber(value))}%`;
  }
}

export function formatCredits(value?: number | null): string {
  return formatNumber(value);
}

export function maskApiKey(value: string | null | undefined): string {
  const safeValue = value ?? '';
  if (safeValue.length <= 8) return safeValue;
  return `${safeValue.slice(0, 4)}...${safeValue.slice(-4)}`;
}
