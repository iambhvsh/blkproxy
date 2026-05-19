# blkproxy

A lightweight, zero-config CORS proxy designed for developers to bypass cross-origin restrictions during local development and testing.

Built on Vercel's edge network for low latency and reliability.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/iambhvsh/blkproxy)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fblkproxy.iambhvsh.in%2Fapi%2Fhealth&query=%24.message&label=status&color=green)](https://blkproxy.iambhvsh.in/api/health)

---

## Features

* **Zero Configuration:** No API keys or setup required.
* **Global Edge:** Powered by Vercel for low latency.
* **Security:** Built-in SSRF protection and security headers.
* **Reliability:** Intelligent retry mechanism for transient network errors.
* **Privacy:** Request and response bodies are never logged.

## Usage

Simply prepend the proxy URL to your target API endpoint.

```javascript
const targetUrl = 'https://api.example.com/data';
const proxyUrl = `https://blkproxy.iambhvsh.in/api/proxy?url=${encodeURIComponent(targetUrl)}`;

fetch(proxyUrl)
  .then(response => response.json())
  .then(console.log)
  .catch(console.error);
```

## Self-Hosting

1-Click Deploy to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/iambhvsh/blkproxy)

Or deploy manually:

```bash
git clone https://github.com/iambhvsh/blkproxy.git
cd blkproxy
npx vercel
```

## Protections and Limits

To ensure the reliability and sustainability of the public instance, the following fair-use limits are enforced:

* **Rate Limiting:** 30 requests per minute per IP.
* **Payload Size:** Maximum 5MB response payload.
* **Media Disabled:** Media streaming is not supported to prevent abuse. Video and audio content types, range requests, and media extensions (.mp4, .mp3, etc.) are blocked.
* **SSRF Protection:** Requests to localhost, private IP ranges (IPv4/IPv6), and invalid protocols are automatically blocked.

If you are self-hosting, these values can be adjusted in the `CONFIG` object within `api/proxy.js`.

## API Reference

### Proxy Endpoint
`GET/POST/PUT/PATCH/DELETE /api/proxy?url=<target>`

*(Note: Public instance is limited to 30 req/min/IP, 5MB response payload, and media streaming disabled.)*

### Health Check
`GET /api/health`

## License

MIT License. See [LICENSE](LICENSE) for details.
