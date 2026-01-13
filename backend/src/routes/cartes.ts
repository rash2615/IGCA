import express from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { generateCarte } from '../services/carteService';
import { logger } from '../utils/logger';
import PDFDocument from 'pdfkit';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

// Import conditionnel de canvas (nécessite une compilation native)
// Note: Canvas est optionnel - nous utilisons uniquement PDF par défaut
let createCanvas: any;
let loadImage: any;
try {
  const canvas = require('canvas');
  createCanvas = canvas.createCanvas;
  loadImage = canvas.loadImage;
  logger.info('✅ Module canvas disponible (génération PNG possible)');
} catch (error) {
  // Canvas non disponible - utilisation de PDF uniquement (par défaut)
  createCanvas = null;
  loadImage = null;
}

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

// Télécharger la carte (PDF uniquement)
router.get('/:id/download', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    let { format = 'pdf' } = req.query;

    // Forcer PDF si canvas n'est pas disponible
    if (format === 'png' && !createCanvas) {
      logger.info('⚠️  Format PNG demandé mais canvas non disponible, conversion en PDF');
      format = 'pdf';
    }

    // Vérifier les permissions
    const carteResult = await pool.query(
      `SELECT 
        c.*,
        a.nom, a.prenom, a.email, a.telephone, a.photo_url, 
        a.date_adhesion, a.tarif, a.moyen_paiement, a.statut, a.source
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

    // Générer le fichier (toujours en PDF maintenant)
    const fileBuffer = await generateCarteFile(carte, format as string);

    // Toujours retourner en PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=carte-${carte.numero_carte}.pdf`);

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

// Fonction pour charger une image depuis une URL (locale ou distante)
async function loadImageFromUrl(imageUrl: string | null): Promise<any> {
  if (!imageUrl || !loadImage) return null;
  
  try {
    // Si c'est une URL locale (uploads) - peut être /uploads/ ou uploads/ ou URL complète avec localhost
    if (imageUrl.includes('/uploads/')) {
      const uploadsDir = path.join(__dirname, '../../uploads');
      // Extraire le nom du fichier de l'URL
      const urlParts = imageUrl.split('/uploads/');
      const filename = urlParts[urlParts.length - 1];
      const imagePath = path.join(uploadsDir, filename);
      
      if (fs.existsSync(imagePath)) {
        return await loadImage(imagePath);
      }
    }
    
    // Si c'est une URL HTTP/HTTPS (externe ou localhost)
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; IGCA-Backend/1.0)',
        },
      });
      return await loadImage(Buffer.from(response.data));
    }
    
    // Si c'est un chemin absolu
    if (fs.existsSync(imageUrl)) {
      return await loadImage(imageUrl);
    }
    
    return null;
  } catch (error: any) {
    logger.warn('Erreur lors du chargement de l\'image:', error.message);
    return null;
  }
}

// Fonction de génération PDF simple (sans canvas)
function generateCartePDF(carte: any, resolve: (value: Buffer) => void, reject: (reason?: any) => void) {
  try {
    const doc = new PDFDocument({
      size: [400, 250], // Format carte de membre
      margins: { top: 20, bottom: 20, left: 20, right: 20 },
    });

    const buffers: Buffer[] = [];
    
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
    doc.on('error', reject);

    // Fond
    doc.rect(0, 0, 400, 250).fill('#f8fafc');
    
    // Zone blanche pour le contenu
    doc.rect(10, 10, 380, 230).fill('#ffffff');

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

    // Informations du membre
    const infoX = 30;
    const infoY = 100;

    doc.fontSize(16)
      .fillColor('#1e3a8a')
      .text(`${carte.prenom || ''} ${carte.nom || ''}`, infoX, infoY, { width: 340 });

    doc.fontSize(12)
      .fillColor('#475569')
      .text(`Carte N°: ${carte.numero_carte || 'N/A'}`, infoX, infoY + 30, { width: 340 });

    if (carte.email) {
      doc.fontSize(10)
        .fillColor('#64748b')
        .text(`Email: ${carte.email}`, infoX, infoY + 55, { width: 340 });
    }

    if (carte.date_adhesion) {
      const dateAdhesion = new Date(carte.date_adhesion).toLocaleDateString('fr-FR');
      doc.fontSize(10)
        .fillColor('#64748b')
        .text(`Adhésion: ${dateAdhesion}`, infoX, infoY + 75, { width: 340 });
    }

    // Statut
    const statutText = carte.statut === 'generee' ? 'Générée' : 
                       carte.statut === 'a_remettre' ? 'À remettre' : 
                       carte.statut === 'remise' ? 'Remise' : 'À générer';
    
    doc.fontSize(10)
      .fillColor('#059669')
      .text(`Statut: ${statutText}`, infoX, infoY + 95, { width: 340 });

    // Pied de page
    doc.fontSize(8)
      .fillColor('#94a3b8')
      .text('Cette carte est la propriété de IGCA Paris', 20, 220, { align: 'center', width: 360 });

    doc.end();
  } catch (error: any) {
    logger.error('Erreur lors de la génération du PDF:', error);
    reject(error);
  }
}

// Fonction pour créer le motif de sécurité en arrière-plan
function drawSecurityPattern(ctx: any, width: number, height: number) {
  ctx.strokeStyle = 'rgba(102, 126, 234, 0.1)';
  ctx.lineWidth = 0.5;
  
  // Lignes diagonales
  for (let i = -height; i < width + height; i += 15) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }
  
  // Cercles
  for (let x = 0; x < width; x += 40) {
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(102, 126, 234, 0.05)';
      ctx.fill();
    }
  }
}

async function generateCarteFile(carte: any, format: string): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      // Utiliser uniquement PDF (canvas optionnel pour PNG, mais non utilisé par défaut)
      // Si format PNG est demandé mais canvas non disponible, utiliser PDF
      if (format === 'png' && (!createCanvas || !loadImage)) {
        logger.info('⚠️  Format PNG demandé mais canvas non disponible, utilisation de PDF');
        format = 'pdf';
      }
      
      // Si canvas n'est pas disponible OU si format est PDF, utiliser PDF uniquement
      if (!createCanvas || !loadImage || format === 'pdf') {
        return generateCartePDF(carte, resolve, reject);
      }
      
      // Dimensions de la carte (format carte d'identité standard)
      const cardWidth = 1056; // 3.5 pouces à 300 DPI
      const cardHeight = 672; // 2.125 pouces à 300 DPI
      const margin = 20;
      
      // Créer le canvas pour le recto
      const frontCanvas = createCanvas(cardWidth, cardHeight);
      const frontCtx = frontCanvas.getContext('2d');
      
      // Fond blanc avec motif de sécurité subtil
      frontCtx.fillStyle = '#f8fafc';
      frontCtx.fillRect(0, 0, cardWidth, cardHeight);
      
      // Motif de sécurité en arrière-plan
      drawSecurityPattern(frontCtx, cardWidth, cardHeight);
      
      // Bordure
      frontCtx.strokeStyle = '#cbd5e1';
      frontCtx.lineWidth = 2;
      frontCtx.strokeRect(margin, margin, cardWidth - margin * 2, cardHeight - margin * 2);
      
      // En-tête
      frontCtx.fillStyle = '#1e3a8a';
      frontCtx.font = 'bold 18px Arial';
      frontCtx.textAlign = 'left';
      frontCtx.fillText('Gouvernement de France', margin + 10, margin + 25);
      
      frontCtx.fillStyle = '#64748b';
      frontCtx.font = '12px Arial';
      frontCtx.fillText('Association Loi 1901', margin + 10, margin + 42);
      
      // Logo IGCA (cercle avec initiales)
      const logoX = cardWidth - margin - 80;
      const logoY = margin + 10;
      const logoRadius = 30;
      
      frontCtx.beginPath();
      frontCtx.arc(logoX + logoRadius, logoY + logoRadius, logoRadius, 0, Math.PI * 2);
      const gradient = frontCtx.createLinearGradient(logoX, logoY, logoX + logoRadius * 2, logoY + logoRadius * 2);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      frontCtx.fillStyle = gradient;
      frontCtx.fill();
      
      frontCtx.fillStyle = '#ffffff';
      frontCtx.font = 'bold 20px Arial';
      frontCtx.textAlign = 'center';
      frontCtx.fillText('IGCA', logoX + logoRadius, logoY + logoRadius + 7);
      
      // Ligne de séparation
      frontCtx.strokeStyle = '#e2e8f0';
      frontCtx.lineWidth = 1;
      frontCtx.beginPath();
      frontCtx.moveTo(margin + 10, margin + 60);
      frontCtx.lineTo(cardWidth - margin - 10, margin + 60);
      frontCtx.stroke();
      
      // Photo (120x150 pixels, style photo d'identité)
      const photoX = margin + 30;
      const photoY = margin + 80;
      const photoWidth = 120;
      const photoHeight = 150;
      
      const photo = await loadImageFromUrl(carte.photo_url);
      if (photo) {
        // Dessiner un cadre pour la photo
        frontCtx.fillStyle = '#ffffff';
        frontCtx.fillRect(photoX, photoY, photoWidth, photoHeight);
        frontCtx.strokeStyle = '#cbd5e1';
        frontCtx.lineWidth = 2;
        frontCtx.strokeRect(photoX, photoY, photoWidth, photoHeight);
        
        // Dessiner la photo (redimensionnée et recadrée)
        const scale = Math.max(photoWidth / photo.width, photoHeight / photo.height);
        const scaledWidth = photo.width * scale;
        const scaledHeight = photo.height * scale;
        const offsetX = (photoWidth - scaledWidth) / 2;
        const offsetY = (photoHeight - scaledHeight) / 2;
        
        frontCtx.drawImage(photo, photoX + offsetX, photoY + offsetY, scaledWidth, scaledHeight);
      } else {
        // Placeholder si pas de photo
        frontCtx.fillStyle = '#f1f5f9';
        frontCtx.fillRect(photoX, photoY, photoWidth, photoHeight);
        frontCtx.strokeStyle = '#cbd5e1';
        frontCtx.lineWidth = 2;
        frontCtx.strokeRect(photoX, photoY, photoWidth, photoHeight);
        
        frontCtx.fillStyle = '#94a3b8';
        frontCtx.font = '14px Arial';
        frontCtx.textAlign = 'center';
        frontCtx.fillText('Photo', photoX + photoWidth / 2, photoY + photoHeight / 2);
      }
      
      // Date d'émission à gauche de la photo (verticale)
      const issueDate = carte.date_generation 
        ? new Date(carte.date_generation).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      
      frontCtx.save();
      frontCtx.translate(photoX - 15, photoY + photoHeight / 2);
      frontCtx.rotate(-Math.PI / 2);
      frontCtx.fillStyle = '#64748b';
      frontCtx.font = '10px Arial';
      frontCtx.textAlign = 'center';
      frontCtx.fillText(`Émis le: ${issueDate}`, 0, 0);
      frontCtx.restore();
      
      // Informations du membre à droite de la photo
      const infoX = photoX + photoWidth + 30;
      const infoY = margin + 90;
      let currentY = infoY;
      
      // Nom complet
      frontCtx.fillStyle = '#1e3a8a';
      frontCtx.font = 'bold 24px Arial';
      frontCtx.textAlign = 'left';
      const fullName = `${carte.prenom || ''} ${carte.nom || ''}`.trim();
      frontCtx.fillText(fullName, infoX, currentY);
      currentY += 35;
      
      // Date d'adhésion
      if (carte.date_adhesion) {
        const dob = new Date(carte.date_adhesion).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        frontCtx.fillStyle = '#475569';
        frontCtx.font = '14px Arial';
        frontCtx.fillText(`Adhésion: ${dob}`, infoX, currentY);
        currentY += 25;
      }
      
      // Email
      if (carte.email) {
        frontCtx.fillStyle = '#64748b';
        frontCtx.font = '12px Arial';
        frontCtx.fillText(`Email: ${carte.email}`, infoX, currentY);
        currentY += 25;
      }
      
      // Téléphone
      if (carte.telephone) {
        frontCtx.fillStyle = '#64748b';
        frontCtx.font = '12px Arial';
        frontCtx.fillText(`Tél: ${carte.telephone}`, infoX, currentY);
        currentY += 25;
      }
      
      // Numéro de carte (grand et central en bas)
      const cardNumberY = cardHeight - margin - 50;
      frontCtx.fillStyle = '#1e3a8a';
      frontCtx.font = 'bold 32px Arial';
      frontCtx.textAlign = 'center';
      frontCtx.fillText(carte.numero_carte || 'N/A', cardWidth / 2, cardNumberY);
      
      // Slogan en bas
      frontCtx.fillStyle = '#64748b';
      frontCtx.font = 'italic 12px Arial';
      frontCtx.fillText('Ma carte, mon identité', cardWidth / 2, cardNumberY + 25);
      
      // Créer le canvas pour le verso
      const backCanvas = createCanvas(cardWidth, cardHeight);
      const backCtx = backCanvas.getContext('2d');
      
      // Fond blanc avec motif
      backCtx.fillStyle = '#f8fafc';
      backCtx.fillRect(0, 0, cardWidth, cardHeight);
      drawSecurityPattern(backCtx, cardWidth, cardHeight);
      
      // Bordure
      backCtx.strokeStyle = '#cbd5e1';
      backCtx.lineWidth = 2;
      backCtx.strokeRect(margin, margin, cardWidth - margin * 2, cardHeight - margin * 2);
      
      // En-tête verso
      backCtx.fillStyle = '#1e3a8a';
      backCtx.font = 'bold 18px Arial';
      backCtx.textAlign = 'center';
      backCtx.fillText('IGCA PARIS', cardWidth / 2, margin + 30);
      
      backCtx.fillStyle = '#64748b';
      backCtx.font = '14px Arial';
      backCtx.fillText('Indian Gujarati Cultural Association', cardWidth / 2, margin + 50);
      
      // Ligne de séparation
      backCtx.strokeStyle = '#e2e8f0';
      backCtx.lineWidth = 1;
      backCtx.beginPath();
      backCtx.moveTo(margin + 20, margin + 70);
      backCtx.lineTo(cardWidth - margin - 20, margin + 70);
      backCtx.stroke();
      
      // Informations de contact à gauche
      const contactX = margin + 30;
      let contactY = margin + 100;
      
      backCtx.fillStyle = '#1e3a8a';
      backCtx.font = 'bold 14px Arial';
      backCtx.textAlign = 'left';
      backCtx.fillText('Contact:', contactX, contactY);
      contactY += 25;
      
      backCtx.fillStyle = '#475569';
      backCtx.font = '12px Arial';
      backCtx.fillText('Email: contact@igcaparis.fr', contactX, contactY);
      contactY += 20;
      backCtx.fillText('Site: www.igcaparis.fr', contactX, contactY);
      contactY += 20;
      backCtx.fillText('Paris, France', contactX, contactY);
      
      // QR Code à droite
      const qrSize = 150;
      const qrX = cardWidth - margin - 30 - qrSize;
      const qrY = margin + 100;
      
      try {
        // Générer le QR code avec les informations de la carte
        const qrData = JSON.stringify({
          id: carte.id,
          numero: carte.numero_carte,
          nom: `${carte.prenom} ${carte.nom}`,
          date: carte.date_generation
        });
        
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
          width: qrSize,
          margin: 1,
          color: {
            dark: '#1e3a8a',
            light: '#ffffff'
          }
        });
        
        const qrImage = await loadImage(qrCodeDataUrl);
        backCtx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
        
        // Texte sous le QR code
        backCtx.fillStyle = '#64748b';
        backCtx.font = '10px Arial';
        backCtx.textAlign = 'center';
        backCtx.fillText('Scanner pour vérifier', qrX + qrSize / 2, qrY + qrSize + 15);
      } catch (error) {
        logger.warn('Erreur lors de la génération du QR code:', error);
      }
      
      // Informations supplémentaires en bas
      const bottomY = cardHeight - margin - 60;
      backCtx.fillStyle = '#94a3b8';
      backCtx.font = '10px Arial';
      backCtx.textAlign = 'center';
      backCtx.fillText('Cette carte est la propriété de IGCA Paris', cardWidth / 2, bottomY);
      backCtx.fillText('Association Loi 1901 - Paris, France', cardWidth / 2, bottomY + 15);
      
      // Convertir en PDF ou PNG selon le format
      if (format === 'pdf') {
        // Créer un PDF avec recto et verso
        const doc = new PDFDocument({
          size: [cardWidth, cardHeight],
          margins: { top: 0, bottom: 0, left: 0, right: 0 }
        });
        
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });
        doc.on('error', reject);
        
        // Ajouter le recto
        doc.image(frontCanvas.toBuffer('image/png'), 0, 0, { width: cardWidth, height: cardHeight });
        
        // Ajouter une nouvelle page pour le verso
        doc.addPage();
        doc.image(backCanvas.toBuffer('image/png'), 0, 0, { width: cardWidth, height: cardHeight });
        
        doc.end();
      } else {
        // Retourner le recto en PNG
        resolve(frontCanvas.toBuffer('image/png'));
      }
    } catch (error: any) {
      logger.error('Erreur lors de la génération de la carte:', error);
      reject(error);
    }
  });
}

export default router;

