import express from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

const router = express.Router();
// AUTHENTIFICATION DÉSACTIVÉE
// router.use(authenticate);
// router.use(requireRole('admin', 'super_admin'));

// Liste des rôles fonctionnels disponibles
router.get('/fonctionnels', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM roles_fonctionnels WHERE is_active = true ORDER BY nom'
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des rôles fonctionnels:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un nouveau rôle fonctionnel
router.post('/fonctionnels', async (req: AuthRequest, res) => {
  try {
    const { nom, description } = req.body;

    const result = await pool.query(
      'INSERT INTO roles_fonctionnels (nom, description) VALUES ($1, $2) RETURNING *',
      [nom, description || null]
    );

    logger.info(`Nouveau rôle fonctionnel créé: ${nom}`);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Erreur lors de la création du rôle fonctionnel:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Désactiver un rôle fonctionnel
router.patch('/fonctionnels/:id/desactivate', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE roles_fonctionnels SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rôle fonctionnel introuvable' });
    }

    logger.info(`Rôle fonctionnel ${id} désactivé`);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Erreur lors de la désactivation du rôle fonctionnel:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Liste des bénévoles avec leurs rôles
router.get('/benevoles', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        u.id,
        u.nom,
        u.prenom,
        u.email,
        u.is_active,
        b.fonctionnel_role,
        b.date_debut,
        b.date_fin,
        rf.nom as role_fonctionnel_nom,
        rf.description as role_fonctionnel_description
       FROM users u
       JOIN benevoles b ON u.id = b.user_id
       LEFT JOIN roles_fonctionnels rf ON b.fonctionnel_role = rf.nom
       WHERE u.role = 'benevole'
       ORDER BY u.nom, u.prenom`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des bénévoles:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Attribuer/modifier un rôle fonctionnel à un bénévole
router.post('/benevoles/:userId/role', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { fonctionnel_role, date_debut, date_fin } = req.body;

    // Vérifier que l'utilisateur est un bénévole
    const userResult = await pool.query(
      'SELECT id, role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    if (userResult.rows[0].role !== 'benevole') {
      return res.status(400).json({ error: 'L\'utilisateur n\'est pas un bénévole' });
    }

    // Vérifier que le rôle fonctionnel existe
    const roleResult = await pool.query(
      'SELECT id FROM roles_fonctionnels WHERE nom = $1 AND is_active = true',
      [fonctionnel_role]
    );

    if (roleResult.rows.length === 0) {
      return res.status(400).json({ error: 'Rôle fonctionnel invalide' });
    }

    // Mettre à jour ou créer le bénévole
    const benevoleResult = await pool.query(
      `INSERT INTO benevoles (user_id, fonctionnel_role, date_debut, date_fin)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         fonctionnel_role = EXCLUDED.fonctionnel_role,
         date_debut = EXCLUDED.date_debut,
         date_fin = EXCLUDED.date_fin
       RETURNING *`,
      [userId, fonctionnel_role, date_debut || new Date(), date_fin]
    );

    logger.info(`Rôle fonctionnel ${fonctionnel_role} attribué à l'utilisateur ${userId}`);

    res.json({
      success: true,
      data: benevoleResult.rows[0],
    });
  } catch (error: any) {
    logger.error('Erreur lors de l\'attribution du rôle fonctionnel:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Statistiques des bénévoles (pour le dashboard)
router.get('/benevoles/stats', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(DISTINCT u.id) as total_benevoles,
        COUNT(DISTINCT b.fonctionnel_role) as total_roles,
        json_agg(
          DISTINCT jsonb_build_object(
            'role', b.fonctionnel_role,
            'count', (
              SELECT COUNT(*) 
              FROM benevoles b2 
              WHERE b2.fonctionnel_role = b.fonctionnel_role
            )
          )
        ) FILTER (WHERE b.fonctionnel_role IS NOT NULL) as roles_distribution
       FROM users u
       JOIN benevoles b ON u.id = b.user_id
       WHERE u.role = 'benevole' 
         AND u.is_active = true
         AND (b.date_fin IS NULL OR b.date_fin >= CURRENT_DATE)`
    );

    const stats = result.rows[0] || {};

    res.json({
      success: true,
      data: {
        total_benevoles: parseInt(stats.total_benevoles) || 0,
        total_roles: parseInt(stats.total_roles) || 0,
        roles_distribution: stats.roles_distribution || [],
      },
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des stats bénévoles:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

