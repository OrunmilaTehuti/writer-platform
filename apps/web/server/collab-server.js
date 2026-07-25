/**
 * Minimal Yjs collaboration server. Run this separately from the Next.js
 * app (`pnpm collab:server`) - it's a persistent WebSocket process, which
 * doesn't fit Next's request/response model or most serverless hosts.
 *
 * In production, deploy this as its own long-running service (a small
 * VM, Fly.io, Render, Railway, etc.) - not on Vercel/Netlify, which don't
 * support long-lived WebSocket connections.
 *
 * TODO before going to production:
 *  - persist Yjs updates to Document.yjsState (packages/db) on a timer /
 *    on disconnect, instead of relying on in-memory state
 *  - authenticate the connection (check the user has access to this
 *    document before allowing the join)
 */
const http = require("http");
const WebSocket = require("ws");
const { setupWSConnection } = require("y-websocket/bin/utils");

const PORT = process.env.PORT || process.env.COLLAB_PORT || 1234;

const server = http.createServer((_req, res) => {
  res.writeHead(200);
  res.end("collab server ok");
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (conn, req) => {
  setupWSConnection(conn, req);
});

server.listen(PORT, () => {
  console.log(`Yjs collab server listening on ws://localhost:${PORT}`);
});
