# 🚀 blkprxy - The Developer's CORS Proxy

> **Bypass CORS. Build Faster.**

blkprxy is a free, zero-config CORS proxy designed for developers who need to instantly access any API during development and testing, without cross-origin restrictions. Built on Vercel's global edge network for maximum performance and reliability.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/iambhvsh/blkprxy)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/website?url=https%3A%2F%2Fblkprxy.vercel.app&label=API%20Status)](https://blkprxy.vercel.app)

---

## ✨ Features

- **🔥 Zero Configuration** - No API keys, no sign-ups, no complex setup
- **⚡ Lightning Fast** - Powered by Vercel's Edge Network for global low latency
- **🛡️ Secure by Default** - Built-in SSRF protection and security headers
- **🔄 Auto-Retry** - Intelligent retry mechanism for transient network errors
- **📱 Universal Support** - Works with any HTTP method, headers, and request body
- **🌍 Global Scale** - Infinitely scalable, stateless architecture
- **🚫 No Rate Limits** - Unlimited requests for development and testing
- **🔒 Privacy Focused** - We don't log your request/response data

---

## 🚀 Quick Start

### Option 1: Use Our Public Instance 🌐

Simply prepend our URL to your target API endpoint:

```javascript
const targetUrl = 'https://api.example.com/data';
const proxyUrl = `https://blkproxy.vercel.app/api/proxy?url=${encodeURIComponent(targetUrl)}`;

fetch(proxyUrl)
  .then(response => response.json())
  .then(data => console.log('✅ Success:', data))
  .catch(error => console.error('❌ Error:', error));
```

### Option 2: Deploy Your Own Instance 🛠️

**1-Click Deploy to Vercel:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/iambhvsh/blkprxy)

**Or manually:**

```bash
# Clone the repository
git clone https://github.com/iambhvsh/blkprxy.git
cd blkprxy

# Deploy with Vercel CLI
npx vercel
```

That's it! Your personal CORS proxy is live in seconds. 🎉

---

## 📖 Usage Examples

### Basic GET Request
```javascript
const response = await fetch('https://blkproxy.vercel.app/api/proxy?url=https://jsonplaceholder.typicode.com/posts/1');
const data = await response.json();
console.log(data);
```

### POST Request with JSON Body
```javascript
const targetUrl = 'https://api.example.com/users';
const proxyUrl = `https://blkproxy.vercel.app/api/proxy?url=${encodeURIComponent(targetUrl)}`;

fetch(proxyUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com'
  })
})
.then(response => response.json())
.then(data => console.log('✅ User created:', data));
```

### Using with Axios
```javascript
import axios from 'axios';

const targetUrl = 'https://api.example.com/data';
const proxyUrl = `https://blkproxy.vercel.app/api/proxy?url=${encodeURIComponent(targetUrl)}`;

const response = await axios.get(proxyUrl);
console.log(response.data);
```

### React Hook Example
```javascript
import { useState, useEffect } from 'react';

function useProxyFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const proxyUrl = `https://blkproxy.vercel.app/api/proxy?url=${encodeURIComponent(url)}`;
    
    fetch(proxyUrl)
      .then(response => response.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [url]);

  return { data, loading, error };
}

// Usage in component
function MyComponent() {
  const { data, loading, error } = useProxyFetch('https://api.example.com/data');
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{JSON.stringify(data, null, 2)}</div>;
}
```

---

## 🔒 Security Features

### 🛡️ SSRF Protection

blkprxy includes robust protection against Server-Side Request Forgery attacks:

- ✅ Only `http://` and `https://` protocols allowed
- ✅ Blocks requests to `localhost` and private IP addresses
- ✅ Validates URL format before processing
- ✅ Optional hostname whitelist for production use

### 🔐 Production Whitelist

For enhanced security in production environments, you can restrict access to specific domains:

**Environment Variable:** `ALLOWED_HOSTS`  
**Format:** Comma-separated list of allowed hostnames

```bash
# Example in Vercel environment variables
ALLOWED_HOSTS=api.github.com,api.stripe.com,jsonplaceholder.typicode.com
```

When configured, only requests to whitelisted domains will be processed.

### 🏥 Security Headers

All responses include comprehensive security headers:

- `Content-Security-Policy: default-src 'none'; frame-ancestors 'none';`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Referrer-Policy: no-referrer`
- `Access-Control-Allow-Origin: *`

---

## 📊 API Reference

### Proxy Endpoint

**URL:** `GET/POST/PUT/PATCH/DELETE /api`

**Query Parameters:**
- `url` (required) - The target URL to proxy the request to

**Example:**
```
https://blkproxy.vercel.app/api/proxy?url=https://api.example.com/users
```

### Health Check

**URL:** `GET /api/health`

**Response:**
```json
{
  "status": "ok",
  "message": "blkprxy is working."
}
```

---

## 🎯 Use Cases

### 🧪 Development & Testing
- Bypass CORS during local development
- Test third-party APIs from browser applications
- Prototype with external services quickly

### 🔍 API Exploration
- Explore public APIs from browser dev tools
- Build interactive API documentation
- Create API testing interfaces

### 📱 Client-Side Applications
- Access APIs from static sites
- Build serverless frontend applications
- Create browser extensions that need API access

### 🎓 Learning & Education
- Educational projects and tutorials
- API integration workshops
- Demonstrate web technologies

---

## ⚖️ Fair Use Policy

blkprxy is built for the developer community with trust and transparency:

### ✅ Appropriate Use
- 🛠️ **Development & Testing** - Perfect for local development and testing
- 🎓 **Educational Projects** - Great for learning and tutorials  
- 🔍 **API Exploration** - Ideal for testing public APIs
- 📱 **Prototyping** - Excellent for quick prototypes and demos

### ❌ Prohibited Use
- 🚫 **Production Applications** - Not intended for production traffic
- 🚫 **High-Volume Scraping** - Respect rate limits of target APIs
- 🚫 **Illegal Activities** - No malicious or illegal usage
- 🚫 **Commercial Abuse** - Don't use for large-scale commercial operations

### 🔐 Privacy Commitment
- We **don't log** request or response bodies
- Your data simply **passes through** the proxy  
- No tracking, no analytics on your API calls
- Respect for your **privacy** is paramount

---

## 🌐 Browser Compatibility

blkprxy works seamlessly across all modern browsers:

- ✅ **Chrome** (Latest)
- ✅ **Firefox** (Latest) 
- ✅ **Safari** (Latest)
- ✅ **Edge** (Latest)
- ✅ **Opera** (Latest)
- ✅ **Mobile Browsers** (iOS Safari, Chrome Mobile)

### 📁 Local Development Notes

When testing locally, serve your HTML files from a local server instead of opening directly in the browser:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx serve

# Using PHP
php -S localhost:8000
```

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### 🐛 Bug Reports
Found a bug? [Open an issue](https://github.com/iambhvsh/blkprxy/issues) with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Browser and environment details

### 💡 Feature Requests  
Have an idea? [Start a discussion](https://github.com/iambhvsh/blkprxy/discussions) about:
- What problem it solves
- Proposed implementation
- Use cases and examples

### 🔧 Code Contributions
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 📈 Status & Monitoring

### 🔍 Real-time Status
Check the current status of blkprxy:
- 🌐 **Website**: [blkprxy.vercel.app](https://blkprxy.vercel.app)
- 🏥 **Health Check**: [blkprxy.vercel.app/api/health](https://blkprxy.vercel.app/api/health)

### 📊 Performance
- **Global Edge Network**: Sub-100ms response times worldwide
- **99.9% Uptime**: Backed by Vercel's infrastructure reliability
- **Auto-scaling**: Handles traffic spikes automatically

---

## 🛠️ Technical Details

### Architecture
- **Runtime**: Vercel Edge Runtime
- **Language**: JavaScript/TypeScript
- **Deployment**: Vercel Edge Functions
- **Network**: Global CDN distribution

### Configuration Options
```javascript
// Available in the source code
const RETRY_COUNT = 3;                    // Number of retry attempts
const RETRY_DELAY_MS = 200;               // Base retry delay
const ALLOWED_HOSTS_ENV = process.env.ALLOWED_HOSTS; // Whitelist configuration
```

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Made with ❤️ by [iambhvsh](https://github.com/iambhvsh)**

- 🌐 Website: [iambhvsh.vercel.app](https://iambhvsh.vercel.app)
- 📧 GitHub: [@iambhvsh](https://github.com/iambhvsh)
- 🐦 Issues: [Report here](https://github.com/iambhvsh/blkprxy/issues)

---

## ⭐ Support the Project

If blkprxy helps you in your development journey:

- ⭐ **Star this repository** to show your support
- 🐛 **Report bugs** to help us improve
- 💡 **Suggest features** for future enhancements
- 📢 **Share with fellow developers** who might find it useful

---

<div align="center">

### 🚀 Ready to bypass CORS and build faster?

[![Deploy Now](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/iambhvsh/blkprxy)

**[Visit blkprxy.vercel.app](https://blkprxy.vercel.app) to get started!**

---

*Built for developers, by developers. Happy coding! 🎉*

</div>
