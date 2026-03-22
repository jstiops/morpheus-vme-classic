# HPE Morpheus VME Classic

> A familiar enterprise-style VM management frontend for **HPE Morpheus VM Essentials (VME) Manager**,
> built with React 18, TypeScript, Tailwind CSS, and the official Morpheus REST API.

![HPE Morpheus VME Classic](https://img.shields.io/badge/HPE-Morpheus%20VME%20Classic-00B388?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNCIgZmlsbD0iIzAwQjM4OCIvPjx0ZXh0IHg9IjE2IiB5PSIyMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSI+SDwvdGV4dD48L3N2Zz4=)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss)

---

## Overview

VME Classic gives VM administrators a **familiar enterprise HTML5 client experience**
for managing HPE Morpheus VM Essentials environments — without learning a new UI paradigm.

### Key Features

| Feature | Details |
|---------|---------|
| **Dark enterprise-style UI** | Navy topbar, collapsible 280px inventory tree, tabbed detail views |
| **HPE Design System** | HPE Green (`#00B388`) accents, HPE Graphik/Metric font stack, enterprise aesthetics |
| **Secure Authentication** | `POST /oauth/token` with `grant_type=password`; tokens in `localStorage`/`sessionStorage` |
| **Silent Token Refresh** | Automatic 401-triggered refresh without user interruption |
| **VM Management** | Full list, detail, power on/off/restart/suspend, create wizard, console link |
| **Snapshots** | Create, revert, delete with confirmation modals |
| **Monitor Tab** | CPU/Memory/Network area charts with live refresh |
| **Tasks & Events** | Per-VM process history with status icons and duration |
| **Bulk Actions** | Multi-select checkboxes + power action toolbar |
| **Right-click Menu** | Context menu on VM rows for quick actions |
| **Inventory Tree** | Hierarchical DCs → Hosts → VMs with live status dots |
| **Read-only views** | Hosts, Clusters, Networks, Datastores |
| **Dashboard** | Summary cards, power state breakdown, memory overview |

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **React 18** | Best ecosystem for complex enterprise UIs |
| Language | **TypeScript 5** | Type safety across API types and components |
| Build | **Vite 5** | Fast HMR, optimised chunking, simple config |
| Styling | **Tailwind CSS 3** + global CSS | Utility classes + fine-grained component styles |
| State | **Zustand** | Minimal, zero-boilerplate global state |
| API/Cache | **TanStack Query v5** | Server state, caching, background refresh |
| Tables | **TanStack Table v8** | Headless, fully customisable sortable tables |
| Charts | **Recharts** | React-native, composable area/line charts |
| Routing | **React Router v6** | Nested layouts, search-param tabs |
| Icons | **Lucide React** | Crisp, consistent, tree-shakeable |
| HTTP | **Axios** | Interceptors for auth + silent refresh |
| Notifications | **react-hot-toast** | Non-intrusive toast stack |
| Date | **date-fns** | Lightweight date formatting |

---

## Production Deployment on Ubuntu 24.04

```bash
git clone https://github.com/jstiops/morpheus-vme-classic.git
cd morpheus-vme-classic
sudo bash deploy.sh
```

**`deploy.sh` will:**

1. Install Node.js 20 LTS (via NodeSource) and Nginx if not already present
2. Prompt once for your VME Manager URL (e.g. `https://morpheus.example.com`)
3. Run `npm ci && npm run build` to produce the static bundle
4. Copy `dist/` to `/var/www/morpheus-vme-classic/dist/`
5. Write the Nginx site config — reverse proxies `/api/*` and `/oauth/*` to the VME Manager URL, serves the SPA with a fallback to `index.html`
6. Enable `ufw` firewall rules for HTTP and SSH
7. Reload Nginx

After ~2 minutes you'll see:

```
✅ HPE Morpheus VME Classic deployed successfully!

  Dashboard:   http://10.0.0.50/
  VME Proxy:   http://10.0.0.50/api/ → https://your-morpheus.example.com/api/
```

Open a browser, navigate to the server IP, and sign in with your Morpheus username and password.

---

## Nginx Reverse Proxy Details

`nginx/morpheus-vme.conf` is the template deployed by `deploy.sh`. Key rules:

```nginx
location /api/ {
    proxy_pass        https://your-vme-manager.example.com/api/;
    proxy_set_header  Authorization  $http_authorization;
    proxy_pass_header Authorization;
}

location /oauth/ {
    proxy_pass        https://your-vme-manager.example.com/oauth/;
}

location / {
    try_files $uri $uri/ /index.html;   # SPA fallback
}
```

The `Authorization: Bearer <token>` header is **transparently forwarded** — Nginx
never stores or logs credentials.

---

## Authentication Flow

```
Browser → POST /oauth/token (grant_type=password, username, password, client_id=morph-api)
       ← { access_token, refresh_token, expires_in }

Every request: Authorization: Bearer <access_token>

On 401 → POST /oauth/token (grant_type=refresh_token)
        → Retry original request with new token
        → If refresh fails → redirect to /login
```

Tokens are stored in `sessionStorage` by default, or `localStorage` when
**Remember me** is checked. The user's plaintext password is never stored.

---

## Generating the OpenAPI Client

The official Morpheus OpenAPI spec is at:
`https://raw.githubusercontent.com/HewlettPackard/morpheus-openapi/master/bundled.yaml`

```bash
bash scripts/generate-api.sh
# Generates TypeScript client in src/api/generated/
```

The hand-crafted functions in `src/api/` cover the MVP scope. The generated
client covers the full Morpheus API surface and can be used for additional
features.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VME_URL` | Prod only | VME Manager base URL — used by `deploy.sh` for Nginx proxy config |

---

## Browser Support

Chrome 90+, Firefox 88+, Edge 90+, Safari 14+. Desktop-first; minimum
viewport 1024 px recommended.

---

## License

MIT © 2025 — HPE Morpheus VME Classic Contributors

> This project is not affiliated with or endorsed by Hewlett Packard Enterprise.
> It uses the public Morpheus REST API to provide an alternative UI.
