# बाबा सैलून

Minimal saloon music room + live group chat.

## Local

```bash
npm install
npm run dev
```

- Web: http://localhost:5173
- Chat server: http://localhost:3001

## Admin panel

Moderates live chat via `ADMIN_SECRET`. Hosted as a **separate** Vercel project (not on the public site).

- Production: https://saloon-admin-gray.vercel.app
- Set `ADMIN_SECRET` on Railway.
- Admin env: `VITE_SOCKET_URL=<railway-url>`

### Local

1. Copy `admin/.env.example` → `admin/.env` and set `VITE_SOCKET_URL`.
2. From repo root: `npm run admin` → http://localhost:5174  
   Or from `admin/`: `npm install && npm run dev`

Admin can: list live users, rename, delete messages, ban IPs (2h/12h/24h), and chat as **codvyn**.

## Message history

Server keeps the **last 100 messages in memory** and sends them to anyone who joins.  
History/bans reset if the chat server restarts.

## Deploy

### Chat server (Railway)

- Start: `node server/index.js` (Dockerfile included)
- Env: `ADMIN_SECRET=...`
- Public URL example: `https://saloon-production-9871.up.railway.app`

### Public frontend (Vercel project `saloon`)

- Framework: Vite
- Env: `VITE_SOCKET_URL=<railway-url>`
- Domain: `saloon.codvyn.in`

### Admin frontend (Vercel project `saloon-admin`)

- Root directory: `admin`
- Env: `VITE_SOCKET_URL=<railway-url>`
- URL: https://saloon-admin-gray.vercel.app
- Redeploy from `admin/`: `npx vercel deploy --prod`

## Config

Edit `src/config.js` for the YouTube track / YT Music / Instagram links.
