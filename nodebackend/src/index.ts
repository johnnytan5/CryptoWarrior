import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

// Routes
import battlesRouter from './routes/battles';
import usersRouter from './routes/users';
import coinsRouter from './routes/coins';

const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoints
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    network: config.onechainNetwork,
    package_id: config.packageId,
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    network: config.onechainNetwork,
    package_id: config.packageId,
  });
});

// API Routes
app.use('/api/battles', battlesRouter);
app.use('/api/users', usersRouter);
app.use('/api/coins', coinsRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = config.apiPort;
const HOST = config.apiHost;

app.listen(PORT, HOST, () => {
  console.log(`🚀 Crypto Warrior Backend running on http://${HOST}:${PORT}`);
  console.log(`📦 Package ID: ${config.packageId}`);
  console.log(`🌐 Network: ${config.onechainNetwork}`);
  console.log(`🔧 Debug mode: ${config.debug ? 'ON' : 'OFF'}`);
});

export default app;

