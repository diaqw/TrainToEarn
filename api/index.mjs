import { timingSafeEqual } from 'node:crypto';
import worker from '../dist/server/index.js';
import { createBlobBucket } from '../server/vercel-storage.mjs';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const password = process.env.APP_PASSWORD;
  if (!password) { res.statusCode = 503; return res.end('Set APP_PASSWORD to enable this private pilot.'); }
  const expected = Buffer.from('Basic ' + Buffer.from('owner:' + password).toString('base64'));
  const supplied = Buffer.from(req.headers.authorization || '');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="Train to Earn", charset="UTF-8"');
    return res.end('Sign in with username owner and the pilot password.');
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    res.statusCode = 503; return res.end('Connect a private Vercel Blob store to this project.');
  }
  try {
    const host = req.headers.host;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined && !['authorization', 'connection', 'transfer-encoding'].includes(key)) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    }
    let body;
    if (!['GET', 'HEAD'].includes(req.method)) {
      if (req.body !== undefined) body = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body);
      else { const chunks=[]; let size=0; for await (const chunk of req) { size+=chunk.length; if(size>2000000){res.statusCode=413;return res.end('Request too large');} chunks.push(chunk); } body=Buffer.concat(chunks); }
      if (Buffer.byteLength(body)>2000000) { res.statusCode=413; return res.end('Request too large'); }
    }
    const request = new Request('https://' + host + req.url, { method: req.method, headers, body });
    const response = await worker.fetch(request, { BUCKET: createBlobBucket(), OPENAI_API_KEY: process.env.OPENAI_API_KEY, OPENAI_MODEL: process.env.OPENAI_MODEL });
    res.statusCode = response.status;
    for (const [key,value] of response.headers) res.setHeader(key,value);
    res.setHeader('Cache-Control','private, no-store');
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.statusCode=503;
    res.end('Service unavailable. Check storage configuration and retry.');
  }
}
