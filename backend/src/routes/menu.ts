import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

const router = express.Router();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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
            'disponible', p.disponible,
            'quantite', p.quantite,
            'image_url', p.image_url
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
            'UPDATE plats SET description = $1, prix = $2, disponible = $3, quantite = $4, image_url = $5 WHERE id = $6',
            [
              plat.description || null,
              plat.prix,
              plat.disponible !== false,
              plat.quantite || 0, // Quantité non utilisée, toujours 0
              plat.image_url || null,
              platId
            ]
          );
        } else {
          // Créer un nouveau plat
          const newPlatResult = await pool.query(
            'INSERT INTO plats (nom, description, prix, disponible, quantite, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [
              plat.nom,
              plat.description || null,
              plat.prix,
              plat.disponible !== false,
              plat.quantite || 0, // Quantité non utilisée, toujours 0
              plat.image_url || null
            ]
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

// Liste tous les plats
router.get('/plats', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM plats ORDER BY nom ASC'
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des plats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Détails d'un plat
router.get('/plats/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM plats WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plat introuvable' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération du plat:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un plat
router.post('/plats', upload.single('image'), async (req: AuthRequest, res) => {
  try {
    const { nom, description, prix, disponible, quantite, image_url } = req.body;

    if (!nom || !prix) {
      return res.status(400).json({ error: 'Nom et prix requis' });
    }

    let imageUrl = null;
    // Priorité à l'URL fournie, sinon utiliser le fichier uploadé
    if (image_url && image_url.trim() !== '') {
      imageUrl = image_url.trim();
    } else if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const result = await pool.query(
      `INSERT INTO plats (nom, description, prix, disponible, quantite, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        nom,
        description || null,
        parseFloat(prix),
        disponible !== 'false' && disponible !== false,
        parseInt(quantite || '0'),
        imageUrl
      ]
    );

    logger.info(`Plat créé: ${result.rows[0].id}`);
    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Erreur lors de la création du plat:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier un plat
router.put('/plats/:id', upload.single('image'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { nom, description, prix, disponible, quantite, image_url } = req.body;

    let imageUrl = image_url || null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const result = await pool.query(
      `UPDATE plats 
       SET nom = $1, description = $2, prix = $3, disponible = $4, quantite = $5, image_url = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        nom,
        description || null,
        parseFloat(prix),
        disponible !== 'false' && disponible !== false,
        parseInt(quantite || '0'), // Quantité non utilisée, toujours 0
        imageUrl,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plat introuvable' });
    }

    logger.info(`Plat modifié: ${id}`);
    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Erreur lors de la modification du plat:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un plat
router.delete('/plats/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM plats WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plat introuvable' });
    }

    // Supprimer l'image si elle existe
    if (result.rows[0].image_url) {
      const imagePath = path.join(uploadsDir, result.rows[0].image_url.replace('/uploads/', ''));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    logger.info(`Plat supprimé: ${id}`);
    res.json({
      success: true,
      message: 'Plat supprimé avec succès',
    });
  } catch (error: any) {
    logger.error('Erreur lors de la suppression du plat:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer un menu par date
router.get('/date/:date', async (req, res) => {
  try {
    const { date } = req.params;

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
            'disponible', p.disponible,
            'quantite', p.quantite,
            'image_url', p.image_url
          )
        ) FILTER (WHERE p.id IS NOT NULL) as plats
       FROM menus m
       LEFT JOIN menu_plats mp ON m.id = mp.menu_id
       LEFT JOIN plats p ON mp.plat_id = p.id
       WHERE m.date_menu = $1
       GROUP BY m.id, m.date_menu, m.created_at
       ORDER BY m.created_at DESC
       LIMIT 1`,
      [date]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'Aucun menu disponible pour cette date',
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

export default router;

