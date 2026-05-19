/**
 * blkproxy
 * A lightweight, zero-config CORS proxy for local development and testing.
 */

export const config = { runtime: 'edge' };

const CONFIG = {
  RETRY_COUNT: 3,
  RETRY_DELAY_MS: 200,
  MAX_SIZE_BYTES: 5 * 1024 * 1024,
  RATE_LIMIT_WINDOW_MS: 60000,
  MAX_REQUESTS_PER_WINDOW: 30,
  FETCH_TIMEOUT_MS: 15000,
  ENABLE_WHITELIST: false,
  ALLOWED_HOSTS: []
};

const BASE_SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Referrer-Policy': 'no-referrer',
};

const SAFE_FORWARD_HEADERS = new Set([
  'accept',
  'content-type',
  'authorization',
  'user-agent',
  'accept-language',
  'cache-control',
  'pragma'
]);

const allowedHostnames = CONFIG.ENABLE_WHITELIST ? new Set(CONFIG.ALLOWED_HOSTS) : null;
const ipRateLimits = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - CONFIG.RATE_LIMIT_WINDOW_MS;

  for (const [key, { timestamp }] of ipRateLimits.entries()) {
    if (timestamp < windowStart) ipRateLimits.delete(key);
  }

  const record = ipRateLimits.get(ip);
  if (!record) {
    ipRateLimits.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (now - record.timestamp > CONFIG.RATE_LIMIT_WINDOW_MS) {
    record.count = 1;
    record.timestamp = now;
    return true;
  }

  if (record.count >= CONFIG.MAX_REQUESTS_PER_WINDOW) return false;

  record.count += 1;
  return true;
}

function getValidatedUrl(urlString) {
  if (!urlString) {
    return null;
  }
  try {
    const url = new URL(urlString);

    // 1. Protocol check: Only allow HTTP and HTTPS.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    const hostname = url.hostname.toLowerCase();

    const isLocalHost = hostname === 'localhost';
    const isIPv4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname);
    const isPrivateIPv4 = isIPv4 && (
      hostname.startsWith('127.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    );

    const isIPv6 = hostname.startsWith('[') && hostname.endsWith(']');
    const isPrivateIPv6 = isIPv6 && (
      hostname === '[::1]' ||
      hostname.startsWith('[fc') ||
      hostname.startsWith('[fd') ||
      hostname.startsWith('[fe80')
    );

    if (isLocalHost || isPrivateIPv4 || isPrivateIPv6) return null;
    if (allowedHostnames && !allowedHostnames.has(hostname)) return null;

    return url;
  } catch {
    return null;
  }
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      ...BASE_SECURITY_HEADERS
    });

    return new Response(null, { status: 204, headers });
  }

  const errorHeaders = { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*', ...BASE_SECURITY_HEADERS };

  let clientIp = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
  if (clientIp.includes(',')) clientIp = clientIp.split(',')[0].trim();

  if (!checkRateLimit(clientIp)) {
    return new Response('Rate limit exceeded.', { status: 429, headers: errorHeaders });
  }

  if (request.headers.has('range')) {
    return new Response('Range requests are not supported.', { status: 416, headers: errorHeaders });
  }

  const requestUrl = new URL(request.url);
  const targetUrlString = requestUrl.searchParams.get('url');
  const targetUrl = getValidatedUrl(targetUrlString);

  if (!targetUrl) {
    return new Response('Invalid or forbidden URL.', { status: 400, headers: errorHeaders });
  }

  const forbiddenExtensions = ['.mp4', '.mp3', '.m3u8', '.mkv'];
  if (forbiddenExtensions.some(ext => targetUrl.pathname.toLowerCase().endsWith(ext))) {
    return new Response('Media files are not supported.', { status: 403, headers: errorHeaders });
  }

  const forwardedHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (SAFE_FORWARD_HEADERS.has(key.toLowerCase())) {
      forwardedHeaders.set(key, value);
    }
  }

  let response;

  for (let i = 0; i < CONFIG.RETRY_COUNT; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.FETCH_TIMEOUT_MS);

    try {
      response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: forwardedHeaders,
        body: request.body,
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (response.status < 500) break;
    } catch (error) {
      clearTimeout(timeout);
      if (i === CONFIG.RETRY_COUNT - 1) {
        const isTimeout = error.name === 'AbortError';
        return new Response(isTimeout ? 'Upstream timeout.' : 'Failed to connect to upstream.', {
          status: isTimeout ? 504 : 502,
          headers: errorHeaders,
        });
      }
    }
    await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY_MS * Math.pow(2, i)));
  }

  if (!response) {
      return new Response('Unexpected error.', { status: 500, headers: errorHeaders });
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > CONFIG.MAX_SIZE_BYTES) {
    return new Response('Response size limit exceeded.', { status: 413, headers: errorHeaders });
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.toLowerCase().startsWith('video/') || contentType.toLowerCase().startsWith('audio/')) {
    return new Response('Media streaming is not supported.', { status: 415, headers: errorHeaders });
  }

  const responseHeaders = new Headers(response.headers);

  Object.entries(BASE_SECURITY_HEADERS).forEach(([key, value]) => {
    responseHeaders.set(key, value);
  });

  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

  const safeExposeHeaders = ['content-type', 'content-length', 'content-disposition', 'cache-control'];
  const exposed = safeExposeHeaders.filter(h => responseHeaders.has(h)).join(', ');
  if (exposed) {
    responseHeaders.set('Access-Control-Expose-Headers', exposed);
  }

  let bodyStream = response.body;

  if (bodyStream) {
    let bytesLoaded = 0;
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        bytesLoaded += chunk.byteLength;
        if (bytesLoaded > CONFIG.MAX_SIZE_BYTES) {
          controller.error(new Error('Response size limit exceeded.'));
        } else {
          controller.enqueue(chunk);
        }
      }
    });
    bodyStream = bodyStream.pipeThrough(transformStream);
  }

  return new Response(bodyStream, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
