import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Inscription (pour les membres uniquement)
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('nom').notEmpty().trim(),
    body('prenom').notEmpty().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, nom, prenom } = req.body;

      // Vérifier si l'email existe déjà
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email déjà utilisé' });
      }

      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);

      // Créer l'utilisateur
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, nom, prenom, role, is_active)
         VALUES ($1, $2, $3, $4, 'membre', true)
         RETURNING id, email, nom, prenom, role`,
        [email, hashedPassword, nom, prenom]
      );

      const user = result.rows[0];

      // Générer le token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      logger.info(`Nouvel utilisateur créé: ${email}`);

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          role: user.role,
        },
      });
    } catch (error: any) {
      logger.error('Erreur lors de l\'inscription:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Connexion
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Trouver l'utilisateur
      const result = await pool.query(
        `SELECT u.id, u.email, u.password_hash, u.nom, u.prenom, u.role, u.is_active,
                b.fonctionnel_role, b.date_fin
         FROM users u
         LEFT JOIN benevoles b ON u.id = b.user_id
         WHERE u.email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(401).json({ error: 'Compte désactivé' });
      }

      // Vérifier le mot de passe
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      // Vérifier l'expiration pour les bénévoles
      if (user.role === 'benevole' && user.date_fin) {
        const dateFin = new Date(user.date_fin);
        if (dateFin < new Date()) {
          return res.status(403).json({ error: 'Période d\'accès expirée' });
        }
      }

      // Générer le token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          fonctionnelRole: user.fonctionnel_role,
        },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      logger.info(`Connexion réussie: ${email}`);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          role: user.role,
          fonctionnelRole: user.fonctionnel_role,
        },
      });
    } catch (error: any) {
      logger.error('Erreur lors de la connexion:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Mot de passe oublié
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;

      // Vérifier si l'utilisateur existe
      const result = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      // Pour la sécurité, on ne révèle pas si l'email existe ou non
      if (result.rows.length > 0) {
        // TODO: Envoyer un email avec un lien de réinitialisation
        logger.info(`Demande de réinitialisation de mot de passe pour: ${email}`);
      }

      res.json({
        success: true,
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
      });
    } catch (error: any) {
      logger.error('Erreur lors de la demande de mot de passe oublié:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// AUTHENTIFICATION DÉSACTIVÉE - Retourne un utilisateur par défaut
router.get('/me', async (req: AuthRequest, res) => {
  try {
    // AUTHENTIFICATION DÉSACTIVÉE - Retourner un utilisateur par défaut
    res.json({
      success: true,
      user: {
        id: 1,
        email: 'admin@igca.paris',
        nom: 'Administrateur',
        prenom: 'Super',
        role: 'super_admin',
        fonctionnelRole: null,
      },
    });
  } catch (error: any) {
    logger.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

