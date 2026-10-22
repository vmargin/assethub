import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

// Dedicated local ports isolate browser verification from running applications.
const server = await createServer({
  root: fileURLToPath(new URL('..', import.meta.url)),
  server: {
    host: '127.0.0.1', port: 50582, strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:50581' },
  },
});
await server.listen();
