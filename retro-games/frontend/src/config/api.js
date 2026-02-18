// In dev: use backend directly (avoids proxy issues with DELETE etc.)
// In prod: use '' for same-origin or set VITE_API_URL
export const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3002' : '')
