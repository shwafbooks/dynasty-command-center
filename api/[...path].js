import { Readable } from 'node:stream';
import { route } from '../server.js';

// The Node.js runtime for Vercel Functions uses the Web Handler interface.
// This adapter preserves the existing router while giving Vercel the expected
// `fetch(Request)` export.
function toNodeRequest(request) {
  const url = new URL(request.url);
  const body = request.body ? Readable.fromWeb(request.body) : Readable.from([]);
  body.method = request.method;
  body.url = `${url.pathname}${url.search}`;
  body.headers = Object.fromEntries(request.headers);
  body.headers.host = url.host;
  return body;
}

function invokeRouter(request) {
  return new Promise((resolve, reject) => {
    let status = 200;
    const headers = new Headers();
    const chunks = [];
    const response = {
      writeHead(nextStatus, nextHeaders = {}) {
        status = nextStatus;
        for (const [name, value] of Object.entries(nextHeaders)) headers.set(name, String(value));
      },
      end(chunk = '') {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        resolve(new Response(Buffer.concat(chunks), { status, headers }));
      }
    };
    route(toNodeRequest(request), response, new URL(request.url)).catch(reject);
  });
}

export default {
  fetch(request) {
    return invokeRouter(request);
  }
};
