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

## Screenshots

```
┌─────────────────────────────────────────────────────────────────────┐
│ H VME Classic │   🔍 Search inventory…   │ [+ New VM] [🔔] [User ▾] │ ← Dark navy topbar
├──────────┬──────────────────────────────────────────────────────────┤
│ ≡ Nav    │ Virtual Machines                    [▶ On][■ Off][↺][⏸] │
│  Dashboard│ ┌───────────────────────────────────────────────────────┐│
│  VMs ●  │ │ ☑ │ Name         │ Status   │ Cloud  │ IP   │ CPU │Mem ││
│  Hosts  │ │───┼──────────────┼──────────┼────────┼──────┼─────┼────││
│  Clusters│ │ ☐ │ web-prod-01  │ ● Running│ DC-Prod│10.0.1│▓▓░░│2.1G││
│  Networks│ │ ☑ │ db-server-02 │ ● Running│ DC-Prod│10.0.2│▓░░░│8.3G││
│  Storage│ │ ☐ │ test-vm-99   │ ○ Stopped│ DC-Dev │ —    │ — │ — ││
│─────────│ └───────────────────────────────────────────────────────────┘│
│▼ DCs    │                                                              │
│  ▶ prod │                                                              │
│    ▶ web│                                                              │
│    ▼ vms│                                                              │
│      ●01│                                                              │
└──────────┴──────────────────────────────────────────────────────────┘
```

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
| Forms | Native React state (wizard) | No overhead for simple 4-step wizard |
| Routing | **React Router v6** | Nested layouts, search-param tabs |
| Icons | **Lucide React** | Crisp, consistent, tree-shakeable |
| HTTP | **Axios** | Interceptors for auth + silent refresh |
| Notifications | **react-hot-toast** | Non-intrusive toast stack |
| Date | **date-fns** | Lightweight date formatting |

---

## Quick Start (Development)

```bash
# 1. Clone
git clone https://github.com/YOUR_ORG/morpheus-vme-classic.git
cd morpheus-vme-classic

# 2. Install dependencies
npm install

# 3. Configure proxy (optional — defaults to localhost:8080)
cp .env.example .env
# Edit .env and set VME_URL=https://your-morpheus-manager.example.com

# 4. Start dev server (with API proxy)
npm run dev
# → http://localhost:3000
```

The Vite dev server proxies `/api/*` and `/oauth/*` to your VME Manager so you
never need CORS headers in development.

---

## Production Deployment on Ubuntu 24.04

### One-shot deploy

```bash
# On your Ubuntu 24.04 VM
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/morpheus-vme-classic/main/deploy.sh)"
```

Or clone manually first:

```bash
git clone https://github.com/YOUR_ORG/morpheus-vme-classic.git
cd morpheus-vme-classic
sudo bash deploy.sh
```

**The script will:**

1. Install Node.js 20 LTS (via NodeSource) and Nginx
2. Prompt once for your VME Manager URL
3. Run `npm ci && npm run build`
4. Copy `dist/` → `/var/www/morpheus-vme-classic/dist/`
5. Write the Nginx site config (reverse proxy `/api/*` → VME)
6. Configure `ufw` (HTTP + SSH)
7. Reload Nginx

After ~2 minutes you'll see:

```
✅ HPE Morpheus VME Classic deployed successfully!

  Dashboard:   http://10.0.0.50/
  VME Proxy:   http://10.0.0.50/api/ → https://your-morpheus.example.com/api/
```

### Manual Build

```bash
npm ci
npm run build        # Output: dist/
```

Place the `dist/` contents behind any static web server that can proxy
`/api/*` and `/oauth/*` to your VME Manager URL.

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

## Project Structure

```
morpheus-vme-classic/
├── src/
│   ├── api/                # Axios client + per-resource fetch functions
│   │   ├── client.ts       # Axios instance, interceptors, token storage
│   │   ├── auth.ts         # login(), fetchCurrentUser()
│   │   ├── instances.ts    # VMs: list, get, power, snapshots, history
│   │   ├── servers.ts      # Hosts
│   │   └── clouds.ts       # Zones, networks, storage, plans, layouts
│   ├── types/
│   │   └── morpheus.ts     # Full TypeScript types for Morpheus entities
│   ├── store/
│   │   ├── authStore.ts    # Zustand: user + auth state
│   │   ├── treeStore.ts    # Zustand: sidebar tree expand/select state
│   │   └── uiStore.ts      # Zustand: global search, modals, context menu
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx    # Root layout: topbar + sidebar + outlet
│   │   │   ├── TopBar.tsx       # Dark nav bar with search + user menu
│   │   │   └── Sidebar.tsx      # Collapsible inventory tree
│   │   └── common/
│   │       ├── LoadingSpinner   # Animated SVG spinner + PageLoader
│   │       ├── StatusDot        # Status indicator dot + badge
│   │       ├── Modal            # Reusable modal with header/body/footer
│   │       ├── ContextMenu      # Right-click context menu for VMs
│   │       └── Sparkline        # Mini Recharts sparkline chart
│   ├── features/
│   │   ├── auth/           # LoginPage, ProtectedRoute
│   │   ├── dashboard/      # DashboardPage — summary cards + tables
│   │   ├── vms/
│   │   │   ├── VMListPage.tsx    # Full VM table with bulk actions
│   │   │   ├── VMDetailPage.tsx  # Tabbed VM detail view
│   │   │   ├── VMCreateWizard.tsx# 4-step create wizard
│   │   │   └── tabs/
│   │   │       ├── SummaryTab    # Info cards + resource gauges
│   │   │       ├── MonitorTab    # CPU/Mem/Net area charts
│   │   │       ├── SnapshotsTab  # Snapshot list + create/revert/delete
│   │   │       └── TasksTab      # Process history table
│   │   ├── hosts/          # HostsPage — read-only hypervisor list
│   │   ├── clusters/       # ClustersPage — read-only cluster list
│   │   ├── networks/       # NetworksPage — read-only network list
│   │   └── storage/        # StoragePage — read-only datastore list
│   └── utils/
│       └── format.ts       # formatBytes, formatPercent, formatDuration
├── nginx/
│   └── morpheus-vme.conf   # Nginx site template
├── scripts/
│   └── generate-api.sh     # Auto-generate client from Morpheus OpenAPI spec
├── deploy.sh               # Ubuntu 24.04 one-shot deploy script
├── vite.config.ts
├── tailwind.config.ts
└── .env.example
```

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

## Customisation

### Change accent colour
Edit `tailwind.config.ts` → `theme.extend.colors.hpe.green` and update
`--hpe-green` in `src/index.css`.

### Add a new page
1. Create `src/features/my-feature/MyPage.tsx`
2. Add a `<Route>` in `src/App.tsx`
3. Add a nav item in `src/components/layout/Sidebar.tsx`

### Add API endpoint
Add a function to the appropriate file in `src/api/` using `apiClient` from
`src/api/client.ts`. The bearer token is automatically attached.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VME_URL` | Prod only | VME Manager base URL — used by `deploy.sh` for Nginx proxy config |
| `VITE_API_BASE_URL` | Dev only | Override the Vite proxy target (defaults to `http://localhost:8080`) |

---

## Browser Support

Chrome 90+, Firefox 88+, Edge 90+, Safari 14+. Desktop-first; minimum
viewport 1024 px recommended.

---

## License

MIT © 2025 — HPE Morpheus VME Classic Contributors

> This project is not affiliated with or endorsed by Hewlett Packard Enterprise.
> It uses the public Morpheus REST API to provide an alternative UI.
