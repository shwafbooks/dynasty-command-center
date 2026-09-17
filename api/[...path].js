import { route } from '../server.js';

// Keep the existing Node router as the single source of API behavior while
// exposing it through Vercel's file-system function routing.
export default function handler(req, res) {
  const forwardedProtocol = req.headers['x-forwarded-proto'];
  const protocol = typeof forwardedProtocol === 'string' ? forwardedProtocol.split(',')[0] : 'https';
  const host = req.headers.host || 'localhost';
  return route(req, res, new URL(req.url || '/', `${protocol}://${host}`));
}
