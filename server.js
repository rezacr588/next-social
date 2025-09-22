import { createServer } from 'http';
import next from 'next';
import { initRealtime } from './lib/realtime.js';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  // Initialize realtime socket.io
  const io = initRealtime(server);

  // Attach io to req for use in API routes
  server.on('request', (req, res) => {
    req.io = io;
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
