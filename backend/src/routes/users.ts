import express from 'express';
import bcrypt from 'bcryptjs';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

const router = express.Router();
// AUTHENTIFICATION DÉSACTIVÉE
// router.use(authenticate);

// Liste des utilisateurs
router.get('/', async (req, res) => {
  try {
    const { role, search } = req.query;

    let query = `
      SELECT 
        u.id,
        u.email,
        u.nom,
        u.prenom,
        u.role,
        u.is_active,
        u.created_at,
        b.fonctionnel_role,
        b.date_debut,
        b.date_fin
      FROM users u
      LEFT JOIN benevoles b ON u.id = b.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (role) {
      query += ` AND u.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (search) {
      query += ` AND (
        u.nom ILIKE $${paramIndex} OR
        u.prenom ILIKE $${paramIndex} OR
        u.email ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ' ORDER BY u.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Désactiver un utilisateur
router.patch('/:userId/desactivate', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      'UPDATE users SET is_active = false WHERE id = $1 RETURNING *',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    logger.info(`Utilisateur ${userId} désactivé`);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Erreur lors de la désactivation de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Réactiver un utilisateur
router.patch('/:userId/activate', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      'UPDATE users SET is_active = true WHERE id = $1 RETURNING *',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    logger.info(`Utilisateur ${userId} réactivé`);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Erreur lors de la réactivation de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier le rôle d'un utilisateur (super admin uniquement)
router.patch('/:userId/role', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const validRoles = ['membre', 'benevole', 'admin', 'super_admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING *',
      [role, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    logger.info(`Rôle de l'utilisateur ${userId} modifié en ${role}`);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Erreur lors de la modification du rôle:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un nouvel utilisateur
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { email, password, nom, prenom, role, is_active } = req.body;

    // Validation
    if (!email || !password || !nom || !prenom) {
      return res.status(400).json({ error: 'Email, mot de passe, nom et prénom sont requis' });
    }

    // Vérifier que l'email est valide
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email invalide' });
    }

    // Vérifier que le mot de passe fait au moins 8 caractères
    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    // Vérifier que le rôle est valide
    const validRoles = ['membre', 'benevole', 'admin', 'super_admin'];
    const userRole = role || 'membre';
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }

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
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, nom, prenom, role, is_active, created_at`,
      [email, hashedPassword, nom, prenom, userRole, is_active !== undefined ? is_active : true]
    );

    logger.info(`Nouvel utilisateur créé: ${email} (rôle: ${userRole})`);

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email déjà utilisé' });
    }
    logger.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

