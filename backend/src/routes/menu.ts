import express from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

const router = express.Router();

// Menu du jour
router.get('/jour', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT 
        m.id,
        m.date_menu,
        m.created_at,
        json_agg(
          json_build_object(
            'id', p.id,
            'nom', p.nom,
            'description', p.description,
            'prix', p.prix,
            'disponible', p.disponible
          )
        ) as plats
       FROM menus m
       LEFT JOIN menu_plats mp ON m.id = mp.menu_id
       LEFT JOIN plats p ON mp.plat_id = p.id
       WHERE m.date_menu = $1
       GROUP BY m.id, m.date_menu, m.created_at
       ORDER BY m.created_at DESC
       LIMIT 1`,
      [today]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'Aucun menu disponible pour aujourd\'hui',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération du menu:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Gestion du menu (admin uniquement)
router.post(
  '/',
  async (req: AuthRequest, res) => {
    try {
      const { date_menu, plats } = req.body;

      // Vérifier si un menu existe déjà pour cette date
      const existingMenu = await pool.query(
        'SELECT id FROM menus WHERE date_menu = $1',
        [date_menu]
      );

      let menuId: number;

      if (existingMenu.rows.length > 0) {
        // Mettre à jour le menu existant
        menuId = existingMenu.rows[0].id;

        // Supprimer les anciens plats
        await pool.query('DELETE FROM menu_plats WHERE menu_id = $1', [menuId]);
      } else {
        // Créer un nouveau menu
        const menuResult = await pool.query(
          'INSERT INTO menus (date_menu, created_by) VALUES ($1, $2) RETURNING id',
          [date_menu, 1] // AUTHENTIFICATION DÉSACTIVÉE - user ID par défaut
        );
        menuId = menuResult.rows[0].id;
      }

      // Ajouter les plats
      for (const plat of plats) {
        let platId: number;

        // Vérifier si le plat existe
        const platResult = await pool.query(
          'SELECT id FROM plats WHERE nom = $1',
          [plat.nom]
        );

        if (platResult.rows.length > 0) {
          platId = platResult.rows[0].id;
          // Mettre à jour le plat
          await pool.query(
            'UPDATE plats SET description = $1, prix = $2, disponible = $3 WHERE id = $4',
            [plat.description || null, plat.prix, plat.disponible !== false, platId]
          );
        } else {
          // Créer un nouveau plat
          const newPlatResult = await pool.query(
            'INSERT INTO plats (nom, description, prix, disponible) VALUES ($1, $2, $3, $4) RETURNING id',
            [plat.nom, plat.description || null, plat.prix, plat.disponible !== false]
          );
          platId = newPlatResult.rows[0].id;
        }

        // Lier le plat au menu
        await pool.query(
          'INSERT INTO menu_plats (menu_id, plat_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [menuId, platId]
        );
      }

      logger.info(`Menu créé/mis à jour pour le ${date_menu}`);

      res.json({
        success: true,
        data: { id: menuId, date_menu, plats },
      });
    } catch (error: any) {
      logger.error('Erreur lors de la création du menu:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Dupliquer un menu existant
router.post(
  '/:menuId/duplicate',
  async (req: AuthRequest, res) => {
    try {
      const { menuId } = req.params;
      const { date_menu } = req.body;

      // Récupérer le menu à dupliquer
      const menuResult = await pool.query(
        `SELECT m.date_menu, p.id as plat_id
         FROM menus m
         JOIN menu_plats mp ON m.id = mp.menu_id
         JOIN plats p ON mp.plat_id = p.id
         WHERE m.id = $1`,
        [menuId]
      );

      if (menuResult.rows.length === 0) {
        return res.status(404).json({ error: 'Menu introuvable' });
      }

      // Créer le nouveau menu
      const newMenuResult = await pool.query(
        'INSERT INTO menus (date_menu, created_by) VALUES ($1, $2) RETURNING id',
        [date_menu, 1] // AUTHENTIFICATION DÉSACTIVÉE - user ID par défaut
      );

      const newMenuId = newMenuResult.rows[0].id;

      // Dupliquer les plats
      for (const row of menuResult.rows) {
        await pool.query(
          'INSERT INTO menu_plats (menu_id, plat_id) VALUES ($1, $2)',
          [newMenuId, row.plat_id]
        );
      }

      logger.info(`Menu ${menuId} dupliqué vers ${date_menu}`);

      res.json({
        success: true,
        data: { id: newMenuId, date_menu },
      });
    } catch (error: any) {
      logger.error('Erreur lors de la duplication du menu:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Historique des menus
router.get(
  '/historique',
  async (req, res) => {
    try {
      const { limit = '10' } = req.query;

      const result = await pool.query(
        `SELECT 
          m.id,
          m.date_menu,
          m.created_at,
          u.nom as created_by_nom,
          u.prenom as created_by_prenom,
          COUNT(mp.plat_id) as nombre_plats
         FROM menus m
         LEFT JOIN menu_plats mp ON m.id = mp.menu_id
         LEFT JOIN users u ON m.created_by = u.id
         GROUP BY m.id, m.date_menu, m.created_at, u.nom, u.prenom
         ORDER BY m.date_menu DESC
         LIMIT $1`,
        [limit]
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error: any) {
      logger.error('Erreur lors de la récupération de l\'historique:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

export default router;

