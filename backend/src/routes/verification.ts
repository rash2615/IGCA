import express from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

const router = express.Router();
// AUTHENTIFICATION DÉSACTIVÉE
// router.use(authenticate);

// Vérification d'adhésion
router.get('/check', async (req, res) => {
  try {
    const { nom, email, numero_carte } = req.query;

    if (!nom && !email && !numero_carte) {
      return res.status(400).json({ error: 'Au moins un critère de recherche requis' });
    }

    let query = `
      SELECT 
        a.id,
        a.nom,
        a.prenom,
        a.email,
        a.date_adhesion,
        a.statut,
        c.numero_carte,
        c.statut as carte_statut
      FROM adhesions a
      LEFT JOIN cartes c ON a.id = c.adhesion_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (nom) {
      query += ` AND (a.nom ILIKE $${paramIndex} OR a.prenom ILIKE $${paramIndex})`;
      params.push(`%${nom}%`);
      paramIndex++;
    }

    if (email) {
      query += ` AND a.email ILIKE $${paramIndex}`;
      params.push(`%${email}%`);
      paramIndex++;
    }

    if (numero_carte) {
      query += ` AND c.numero_carte = $${paramIndex}`;
      params.push(numero_carte);
      paramIndex++;
    }

    query += ' ORDER BY a.date_adhesion DESC LIMIT 10';

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        found: false,
        message: 'Aucun adhérent trouvé',
      });
    }

    // Vérifier le statut de l'adhésion
    const adhesion = result.rows[0];
    const isActive = adhesion.statut === 'actif';
    const dateAdhesion = new Date(adhesion.date_adhesion);
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    const isValid = isActive && dateAdhesion >= oneYearAgo;

    res.json({
      success: true,
      found: true,
      valid: isValid,
      data: {
        nom: adhesion.nom,
        prenom: adhesion.prenom,
        email: adhesion.email,
        date_adhesion: adhesion.date_adhesion,
        statut: adhesion.statut,
        carte: adhesion.numero_carte ? {
          numero: adhesion.numero_carte,
          statut: adhesion.carte_statut,
        } : null,
      },
    });
  } catch (error: any) {
    logger.error('Erreur lors de la vérification d\'adhésion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

