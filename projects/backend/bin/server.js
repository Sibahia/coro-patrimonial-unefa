import express from 'express';
import http from 'http';
import os from 'os';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import fileUpload from 'express-fileupload';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { connectDatabase } from '../databases/mongodb.js';
import { apiLimiter } from '../middlewares/rateLimit.js';
import { notFound, errorHandler } from '../middlewares/errorHandler.js';
import authRoutes from '../api/auth/routes.js';
import userRoutes from '../api/users/routes.js';
import memberRoutes from '../api/members/routes.js';
import workRoutes from '../api/works/routes.js';
import eventRoutes from '../api/events/routes.js';
import heritageRoutes from '../api/heritage/routes.js';
import monumentRoutes from '../api/monuments/monument.routes.js';
import uploadRoutes from '../api/uploads/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class WebServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: { origin: true, credentials: true },
      path: '/socket.io'
    });

    this.app.set('io', this.io);
    this.app.set('trust proxy', 1);

    this.io.on('connection', (socket) => {
      console.log('[socket] cliente conectado:', socket.id);
    });

    this.dbReady = this.database();
    this.middlewares();
    this.routes();
    this.publics();
    this.errors();
  }

  database() {
    return connectDatabase();
  }

  middlewares() {
    const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:4200')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    this.app.use(helmet({ contentSecurityPolicy: false }));
    this.app.use(cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true
    }));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(cookieParser());
    this.app.use(fileUpload({
      useTempFiles: true,
      tempFileDir: path.join(os.tmpdir(), 'coro-patrimonial-uploads'),
      createParentPath: true,
      limits: { fileSize: (Number(process.env.UPLOAD_MAX_SIZE_MB) || 10) * 1024 * 1024 }
    }));
    this.app.use('/api', apiLimiter);
  }

  routes() {
    this.app.get('/api/health', (req, res) => {
      res.json({
        ok: true,
        data: {
          status: 'ok',
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        }
      });
    });

    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/members', memberRoutes);
    this.app.use('/api/works', workRoutes);
    this.app.use('/api/events', eventRoutes);
    this.app.use('/api/heritage', heritageRoutes);
    this.app.use('/api/monuments', monumentRoutes);
    this.app.use('/api/uploads', uploadRoutes);
  }

  publics() {
    const publicPath = path.join(__dirname, '../public');
    const uploadsPath = path.join(__dirname, '../uploads');

    this.app.use('/uploads', express.static(uploadsPath));
    this.app.use('/api', notFound);
    this.app.use(express.static(publicPath));

    this.app.get('/*path', (req, res) => {
      res.sendFile(path.resolve(publicPath, 'index.html'), (err) => {
        if (err) return notFound(req, res);
      });
    });
  }

  errors() {
    this.app.use(errorHandler);
  }

  async listen() {
    await this.dbReady;
    const port = process.env.PORT === undefined ? 3500 : Number(process.env.PORT);

    await new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(port, resolve);
    });

    const activePort = this.server.address().port;
    console.log(`[server] Servidor ejecutándose en el puerto ${activePort}`);
    return activePort;
  }
}

export default WebServer;
