# बाबा सैलून

Minimal saloon music room + live group chat.

## Local

```bash
npm install
npm run dev
```

- Web: http://localhost:5173
- Chat server: http://localhost:3001

## Message history

Server keeps the **last 100 messages in memory** and sends them to anyone who joins.  
History resets if the chat server restarts (unless you later add Redis).

## Why a separate prod socket server?

Chat needs an always-on WebSocket process so everyone shares the same room.  
Vercel is great for the static React site, but a classic Socket.io room is simpler and more reliable on a small always-on host (Railway / Render / Fly).

```
saloon.codvyn.in  →  Vercel (frontend)
saloon-api.codvyn.in  →  Railway/Render (Socket.io server)
```

Set `VITE_SOCKET_URL` on Vercel to the API URL.

## Deploy

### 1) Chat server (Railway / Render)

- Root start command: `node server/index.js`
- Expose port from `PORT` (Railway sets this automatically)
- Optional custom domain: `saloon-api.codvyn.in`

### 2) Frontend (Vercel)

- Import this repo
- Framework: Vite
- Env: `VITE_SOCKET_URL=https://saloon-api.codvyn.in`
- Custom domain: `saloon.codvyn.in`

### 3) DNS (codvyn.in)

At your domain DNS:

- `saloon` CNAME → Vercel (`cname.vercel-dns.com` or what Vercel shows)
- `saloon-api` CNAME → Railway/Render target

## Config

Edit `src/config.js` for playlist + Spotify / YT Music / Instagram links.
