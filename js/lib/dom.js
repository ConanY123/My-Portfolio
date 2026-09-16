// helpers for the html

// characters that need swapping so they dont break the HTML
const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// makes a value safe to put in HTML
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

// Checks if the thing is a placeholder still from site-config
export function isPlaceholder(value) {
  return typeof value === 'string' && /^\[[A-Z0-9_[\]]+\]$/.test(value.trim());
}

// Chekcs if the value is filled with something 
export function filled(value) {
  return (
    typeof value === 'string' && value.trim() !== '' && !isPlaceholder(value)
  );
}

// escape text
export function txt(value) {
  if (isPlaceholder(value)) return `<span class="ph">${esc(value)}</span>`;
  return esc(value);
}
