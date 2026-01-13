import express from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { generateCarte } from '../services/carteService';
import { logger } from '../utils/logger';
import PDFDocument from 'pdfkit';

const router = express.Router();
// AUTHENTIFICATION DÉSACTIVÉE
// router.use(authenticate);

// Liste des cartes
router.get('/', async (req, res) => {
  try {
    const { statut, adhesion_id } = req.query;

    let query = `
      SELECT 
        c.*,
        a.nom, a.prenom, a.email, a.photo_url
      FROM cartes c
      JOIN adhesions a ON c.adhesion_id = a.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (statut) {
      query += ` AND c.statut = $${paramIndex}`;
      params.push(statut);
      paramIndex++;
    }

    if (adhesion_id) {
      query += ` AND c.adhesion_id = $${paramIndex}`;
      params.push(adhesion_id);
      paramIndex++;
    }

    query += ' ORDER BY c.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des cartes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Générer une carte
router.post(
  '/generate/:adhesionId',
  async (req, res) => {
    try {
      const { adhesionId } = req.params;

      // Vérifier que l'adhésion existe
      const adhesionResult = await pool.query(
        'SELECT * FROM adhesions WHERE id = $1',
        [adhesionId]
      );

      if (adhesionResult.rows.length === 0) {
        return res.status(404).json({ error: 'Adhérent introuvable' });
      }

      const adhesion = adhesionResult.rows[0];

      // Vérifier si une carte existe déjà
      const existingCarte = await pool.query(
        'SELECT id FROM cartes WHERE adhesion_id = $1 AND statut != $2',
        [adhesionId, 'remise']
      );

      if (existingCarte.rows.length > 0) {
        return res.status(400).json({
          error: 'Une carte existe déjà pour cet adhérent',
          carteId: existingCarte.rows[0].id,
        });
      }

      // Vérifier que l'adhésion est complète avant de générer la carte
      if (!adhesion.nom || !adhesion.prenom || !adhesion.photo_url || !adhesion.tarif || !adhesion.moyen_paiement || !adhesion.date_adhesion || !adhesion.statut) {
        return res.status(400).json({
          error: 'L\'adhésion n\'est pas complète. Tous les champs requis doivent être remplis (nom, prénom, photo, tarif, moyen de paiement, date d\'adhésion, statut).',
        });
      }

      // Générer la carte
      const carte = await generateCarte(adhesion);

      logger.info(`✅ Carte générée avec succès: ${carte.numero_carte} pour l'adhérent ${adhesion.id} (${adhesion.prenom} ${adhesion.nom})`);

      res.json({
        success: true,
        data: carte,
      });
    } catch (error: any) {
      logger.error('Erreur lors de la génération de la carte:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Prévisualisation de la carte
router.get('/:id/preview', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        c.*,
        a.nom, a.prenom, a.email, a.photo_url, a.date_adhesion
       FROM cartes c
       JOIN adhesions a ON c.adhesion_id = a.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Carte introuvable' });
    }

    const carte = result.rows[0];

    res.json({
      success: true,
      data: {
        id: carte.id,
        nom: carte.nom,
        prenom: carte.prenom,
        email: carte.email,
        photo_url: carte.photo_url,
        date_adhesion: carte.date_adhesion,
        statut: carte.statut,
        numero_carte: carte.numero_carte,
      },
    });
  } catch (error: any) {
    logger.error('Erreur lors de la prévisualisation de la carte:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Télécharger la carte (PDF ou image)
router.get('/:id/download', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { format = 'pdf' } = req.query;

    // Vérifier les permissions
    const carteResult = await pool.query(
      `SELECT c.*, a.email
       FROM cartes c
       JOIN adhesions a ON c.adhesion_id = a.id
       WHERE c.id = $1`,
      [id]
    );

    if (carteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Carte introuvable' });
    }

    const carte = carteResult.rows[0];

    // Vérifier que l'utilisateur a le droit de télécharger cette carte
    // AUTHENTIFICATION DÉSACTIVÉE - Plus de vérification de rôle
    if (false) { // Désactivé
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Générer le fichier selon le format demandé
    const fileBuffer = await generateCarteFile(carte, format as string);

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=carte-${carte.numero_carte}.pdf`);
    } else {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename=carte-${carte.numero_carte}.png`);
    }

    res.send(fileBuffer);
  } catch (error: any) {
    logger.error('Erreur lors du téléchargement de la carte:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Carte du membre connecté
router.get('/me/carte', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, a.nom, a.prenom, a.email, a.photo_url
       FROM cartes c
       JOIN adhesions a ON c.adhesion_id = a.id
       WHERE a.email = $1
       ORDER BY c.created_at DESC
       LIMIT 1`,
        [carte.email] // AUTHENTIFICATION DÉSACTIVÉE
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aucune carte trouvée' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération de la carte:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

async function generateCarteFile(carte: any, format: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [400, 250], // Format carte de membre (largeur x hauteur en points)
        margins: { top: 20, bottom: 20, left: 20, right: 20 },
      });

      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Couleur de fond (bleu IGCA)
      doc.rect(0, 0, 400, 250).fill('#1e3a8a');
      
      // Zone blanche pour le contenu
      doc.rect(10, 10, 380, 230)
        .fill('#ffffff');

      // Logo/En-tête IGCA Paris
      doc.fontSize(24)
        .fillColor('#1e3a8a')
        .text('IGCA PARIS', 20, 30, { align: 'center', width: 360 });

      doc.fontSize(12)
        .fillColor('#64748b')
        .text('Indian Gujarati Cultural Association', 20, 60, { align: 'center', width: 360 });

      // Ligne de séparation
      doc.moveTo(20, 85)
        .lineTo(380, 85)
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();

      // Photo (si disponible)
      if (carte.photo_url) {
        try {
          // Pour l'instant, on affiche juste un rectangle pour la photo
          // En production, il faudrait télécharger l'image depuis l'URL
          doc.rect(30, 100, 80, 100)
            .fillColor('#f1f5f9')
            .fill()
            .strokeColor('#cbd5e1')
            .stroke();
          
          doc.fontSize(10)
            .fillColor('#64748b')
            .text('Photo', 30, 150, { width: 80, align: 'center' });
        } catch (error) {
          logger.warn('Erreur lors de l\'ajout de la photo:', error);
        }
      }

      // Informations du membre
      const infoX = 130;
      const infoY = 100;

      doc.fontSize(16)
        .fillColor('#1e3a8a')
        .text(`${carte.prenom || ''} ${carte.nom || ''}`, infoX, infoY, { width: 250 });

      doc.fontSize(12)
        .fillColor('#475569')
        .text(`Carte N°: ${carte.numero_carte || 'N/A'}`, infoX, infoY + 30, { width: 250 });

      if (carte.email) {
        doc.fontSize(10)
          .fillColor('#64748b')
          .text(`Email: ${carte.email}`, infoX, infoY + 55, { width: 250 });
      }

      if (carte.date_adhesion) {
        const dateAdhesion = new Date(carte.date_adhesion).toLocaleDateString('fr-FR');
        doc.fontSize(10)
          .fillColor('#64748b')
          .text(`Adhésion: ${dateAdhesion}`, infoX, infoY + 75, { width: 250 });
      }

      // Statut
      const statutText = carte.statut === 'generee' ? 'Générée' : 
                         carte.statut === 'a_remettre' ? 'À remettre' : 
                         carte.statut === 'remise' ? 'Remise' : 'À générer';
      
      doc.fontSize(10)
        .fillColor('#059669')
        .text(`Statut: ${statutText}`, infoX, infoY + 95, { width: 250 });

      // Pied de page
      doc.fontSize(8)
        .fillColor('#94a3b8')
        .text('Cette carte est la propriété de IGCA Paris', 20, 220, { align: 'center', width: 360 });

      // Finaliser le document
      doc.end();
    } catch (error: any) {
      logger.error('Erreur lors de la génération du PDF:', error);
      reject(error);
    }
  });
}

export default router;

