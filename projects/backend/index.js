import 'dotenv/config';
import WebServer from './bin/server.js';

const server = new WebServer();
server.listen().catch((error) => {
  console.error('[startup] No se pudo iniciar el servidor:', error.message);
  process.exit(1);
});
