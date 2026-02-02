## 2025-05-15 - Missing Production Security Headers
**Vulnerability:** Absence of `public/_headers` configuration for Cloudflare Pages deployment, leaving the application without critical security headers (HSTS, X-Frame-Options) at the edge, relying solely on `index.html` meta tags which are insufficient for all security aspects.
**Learning:** Static site deployments often require platform-specific configuration files (like `_headers` or `netlify.toml`) to enforce security headers that cannot be fully handled by HTML meta tags.
**Prevention:** Always verify the existence of deployment configuration files in static site repositories and ensure they include strict CSP, HSTS, and anti-clickjacking headers.
