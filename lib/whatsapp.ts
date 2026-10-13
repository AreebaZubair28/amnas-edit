/** Normalize WhatsApp numbers to international digits without a leading +. */
export function normalizeWhatsAppNumber(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (!/^\+?[\d\s().-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  let normalized = digits;
  if (/^03\d{9}$/.test(digits)) normalized = `92${digits.slice(1)}`;
  else if (/^00923\d{9}$/.test(digits)) normalized = digits.slice(2);
  else if (/^3\d{9}$/.test(digits)) normalized = `92${digits}`;
  else if (digits.startsWith("0")) return null;
  if (!/^[1-9]\d{7,14}$/.test(normalized)) return null;
  if (normalized.startsWith("92") && !/^923\d{9}$/.test(normalized)) return null;
  return normalized;
}

export function whatsAppChatUrl(value: string): string | null {
  const number = normalizeWhatsAppNumber(value);
  return number ? `https://wa.me/${number}` : null;
}
