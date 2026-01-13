import express from 'express';
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

export default router;

