/**
 * blkprxy - Universal CORS Proxy
 *
 * This is a Vercel Edge Function that acts as a universal CORS proxy.
 * It's designed to be a simple, secure, and reliable solution for developers
 * who need to bypass CORS restrictions during local development or testing.
 *
 * How it works:
 * 1. It receives a request with a `?url=<target_url>` query parameter.
 * 2. It handles OPTIONS pre-flight requests required by browsers for CORS.
 * 3. It validates the <target_url> to prevent Server-Side Request Forgery (SSRF).
 * 4. It forwards the original request (method, headers, body) to the target URL.
 * 5. It includes a retry mechanism for transient network errors.
 * 6. It pipes the response from the target URL back to the client, but with
 *    `Access-Control-Allow-Origin: *` and other security headers to ensure
 *    the browser allows the request.
 *
 * This function runs on Vercel's Edge Network for low latency globally.
 */

// Opt-in to the Vercel Edge Runtime for maximum performance.
export const config = {
  runtime: 'edge',
};

// --- CONFIGURATION ---
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 200; // Exponential backoff will be used.
const ALLOWED_HOSTS_ENV = process.env.ALLOWED_HOSTS || ''; // Comma-separated list of allowed hostnames for production.
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute per IP

// --- RATE LIMITING ---
const ipRateLimits = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // Clean up old entries to prevent memory leaks
  for (const [key, { timestamp }] of ipRateLimits.entries()) {
    if (timestamp < windowStart) {
      ipRateLimits.delete(key);
    }
  }

  const record = ipRateLimits.get(ip);
  if (!record) {
    ipRateLimits.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (now - record.timestamp > RATE_LIMIT_WINDOW_MS) {
    record.count = 1;
    record.timestamp = now;
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count += 1;
  return true;
}

// --- BASE SECURITY HEADERS ---
// These are static headers added to every response to enhance security.
// CORS headers are generated dynamically.
const BASE_SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Referrer-Policy': 'no-referrer',
};

// --- WHITELIST ---
// If ALLOWED_HOSTS is configured, we only allow requests to those hosts.
const allowedHostnames = ALLOWED_HOSTS_ENV ? new Set(ALLOWED_HOSTS_ENV.split(',')) : null;

/**
 * Validates if a URL is safe to proxy.
 * Prevents SSRF attacks by checking for valid protocols and rejecting IP addresses.
 * @param {string} urlString - The URL to validate.
 * @returns {URL|null} A URL object if valid, otherwise null.
 */
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

    // 2. Hostname check: Disallow requests to 'localhost' or raw IP addresses.
    // This is a crucial SSRF prevention step.
    if (url.hostname === 'localhost' || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) {
      return null;
    }

    // 3. (Optional) Whitelist check for production environments.
    if (allowedHostnames && !allowedHostnames.has(url.hostname)) {
        return null;
    }

    return url;
  } catch (error) {
    // Invalid URL format.
    return null;
  }
}

/**
 * The main handler for the proxy request.
 * @param {Request} request - The incoming HTTP request.
 */
export default async function handler(request) {
  // --- Handle OPTIONS pre-flight request ---
  if (request.method === 'OPTIONS') {
    // Dynamically set allowed headers based on what the client is requesting.
    const requestedHeaders = request.headers.get('access-control-request-headers');

    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      ...BASE_SECURITY_HEADERS
    });

    // If the client requests specific headers, allow them.
    if (requestedHeaders) {
      headers.set('Access-Control-Allow-Headers', requestedHeaders);
    } else {
      // Fallback to a generous default set.
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }

    return new Response(null, {
      status: 204, // No Content
      headers: headers,
    });
  }

  const errorHeaders = { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*', ...BASE_SECURITY_HEADERS };

  // --- Rate Limiting ---
  let clientIp = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
  if (clientIp.includes(',')) {
    clientIp = clientIp.split(',')[0].trim();
  }

  if (!checkRateLimit(clientIp)) {
    return new Response('Rate limit exceeded. Maximum 30 requests per minute.', {
      status: 429,
      headers: errorHeaders,
    });
  }

  // --- Reject Range requests ---
  if (request.headers.has('range') || request.headers.has('Range')) {
    return new Response('Range requests are not supported.', {
      status: 416, // Range Not Satisfiable
      headers: errorHeaders,
    });
  }

  // --- Extract and Validate Target URL ---
  const requestUrl = new URL(request.url);
  const targetUrlString = requestUrl.searchParams.get('url');
  const targetUrl = getValidatedUrl(targetUrlString);

  if (!targetUrl) {
    return new Response('Invalid or forbidden URL provided.', {
      status: 400,
      headers: errorHeaders,
    });
  }

  // --- Reject Media Extensions ---
  const forbiddenExtensions = ['.mp4', '.mp3', '.m3u8', '.mkv'];
  if (forbiddenExtensions.some(ext => targetUrl.pathname.toLowerCase().endsWith(ext))) {
    return new Response('Media files are not supported.', {
      status: 403,
      headers: errorHeaders,
    });
  }

  // --- Prepare the fetch request to the target ---
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.delete('host');
  forwardedHeaders.delete('referer');
  forwardedHeaders.set('Origin', new URL(targetUrl).origin);

  const fetchOptions = {
    method: request.method,
    headers: forwardedHeaders,
    body: request.body,
    redirect: 'follow',
  };

  // --- Fetch with Retry Logic ---
  let response;
  for (let i = 0; i < RETRY_COUNT; i++) {
    try {
      response = await fetch(targetUrl.toString(), fetchOptions);
      if (response.status < 500) {
        break;
      }
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error.message);
      if (i === RETRY_COUNT - 1) {
        return new Response('Proxy failed to connect to the target server.', {
          status: 502, // Bad Gateway
          headers: errorHeaders,
        });
      }
    }
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, i)));
  }

  if (!response) {
      return new Response('The proxy encountered an unexpected error after all retries.', {
          status: 500,
          headers: errorHeaders,
      });
  }

  // --- Content-Length Check ---
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_SIZE_BYTES) {
    return new Response('Response size exceeds the 5MB limit.', {
      status: 413, // Payload Too Large
      headers: errorHeaders,
    });
  }

  // --- Content-Type Check ---
  const contentType = response.headers.get('content-type') || '';
  if (contentType.toLowerCase().startsWith('video/') || contentType.toLowerCase().startsWith('audio/')) {
    return new Response('Media streaming is not supported.', {
      status: 415, // Unsupported Media Type
      headers: errorHeaders,
    });
  }

  // --- Stream the Response Back to the Client with Size Limiting ---
  const responseHeaders = new Headers(response.headers);

  // Set base security headers
  Object.entries(BASE_SECURITY_HEADERS).forEach(([key, value]) => {
    responseHeaders.set(key, value);
  });

  // Set dynamic CORS headers
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

  // Expose all headers from the target response to the client.
  const exposedHeaders = [...response.headers.keys()].join(', ');
  responseHeaders.set('Access-Control-Expose-Headers', exposedHeaders);

  let bodyStream = response.body;

  if (bodyStream) {
    let bytesLoaded = 0;
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        bytesLoaded += chunk.byteLength;
        if (bytesLoaded > MAX_SIZE_BYTES) {
          controller.error(new Error('Response size exceeds the 5MB limit.'));
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
