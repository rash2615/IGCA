import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { pool } from './config/database';
import authRoutes from './routes/auth';
import adhesionRoutes from './routes/adhesions';
import carteRoutes from './routes/cartes';
import verificationRoutes from './routes/verification';
import transmissionRoutes from './routes/transmission';
import comptabiliteRoutes from './routes/comptabilite';
import donRoutes from './routes/dons';
import menuRoutes from './routes/menu';
import roleRoutes from './routes/roles';
import userRoutes from './routes/users';
import imageRoutes from './routes/images';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

dotenv.config();

// Vérifier les variables d'environnement critiques
if (!process.env.JWT_SECRET) {
  console.error('❌ ERREUR: JWT_SECRET non défini dans .env');
  console.error('   Le serveur ne peut pas fonctionner sans JWT_SECRET');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir les fichiers uploadés statiquement
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/adhesions', adhesionRoutes);
app.use('/api/cartes', carteRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/transmission', transmissionRoutes);
app.use('/api/comptabilite', comptabiliteRoutes);
app.use('/api/dons', donRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/images', imageRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'IGCA Paris API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      adhesions: '/api/adhesions',
      cartes: '/api/cartes',
      verification: '/api/verification',
      transmission: '/api/transmission',
      comptabilite: '/api/comptabilite',
      dons: '/api/dons',
      menu: '/api/menu',
      roles: '/api/roles',
      users: '/api/users',
    },
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;

