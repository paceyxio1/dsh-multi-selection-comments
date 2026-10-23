/**
 * DSH points `<html lang>` at the active locale and maps the built-in Chinese
 * locale to `zh-CN`, so a prefix test is enough to pick the label set.
 */
export function isChinese(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.lang.toLowerCase().startsWith('zh')
}
