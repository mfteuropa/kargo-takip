export function toUpperCaseTR(text: string | null | undefined): string {
  if (!text) return '';
  return text.toLocaleUpperCase('tr-TR');
}
