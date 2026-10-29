/**
 * Bulletproof clipboard copy helper.
 * Works across HTTPS, HTTP, IP addresses, localhost, and strict browser environments.
 */
export async function copyToClipboard(text) {
  if (text === null || text === undefined) return false;
  const str = typeof text === 'string' ? text : JSON.stringify(text, null, 2);

  // 1. Try modern Navigator Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(str);
      return true;
    } catch (e) {
      // Fall through to legacy fallback
    }
  }

  // 2. Fallback using invisible textarea and document.execCommand('copy')
  try {
    const textArea = document.createElement('textarea');
    textArea.value = str;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.warn('Clipboard copy failed:', err);
    return false;
  }
}

