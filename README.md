# बाबा सैलून

Minimal saloon music room + live group chat.

## Local

```bash
npm install
npm run dev
```

- Web: http://localhost:5173
- Chat server: http://localhost:3001

## Admin panel (local only — not on Vercel)

Moderates live chat via a secret. Never deploy `admin/` to Vercel.

1. Set `ADMIN_SECRET` on Railway (and optionally in a root `.env` for local server).
2. Copy `admin/.env.example` → `admin/.env` and set:

```bash
VITE_SOCKET_URL=https://saloon-production-9871.up.railway.app
```

(For local server use `http://localhost:3001`.)

3. Run:

```bash
npm run admin
```

4. Open http://localhost:5174 and paste `ADMIN_SECRET`.

Admin can: list live users, rename, delete messages, ban IPs (2h/12h/24h), and chat as **codvyn** (yellow bubbles on the public site).

## Message history

Server keeps the **last 100 messages in memory** and sends them to anyone who joins.  
History/bans reset if the chat server restarts.

## Deploy

### Chat server (Railway)

- Start: `node server/index.js` (Dockerfile included)
- Env: `ADMIN_SECRET=...`
- Public URL example: `https://saloon-production-9871.up.railway.app`

### Frontend (Vercel)

- Framework: Vite
- Env: `VITE_SOCKET_URL=<railway-url>`
- Domain: `saloon.codvyn.in`
- Do **not** deploy the `admin/` folder as a site

## Config

Edit `src/config.js` for the YouTube track / YT Music / Instagram links.
