import express from 'express';
import axios from 'axios';
import { logger } from '../utils/logger';

const router = express.Router();

// Proxy pour récupérer les images HelloAsso et autres sources externes
router.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL manquante' });
    }

    // Vérifier que l'URL est valide
    let imageUrl: URL;
    try {
      imageUrl = new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'URL invalide' });
    }

    // Récupérer l'image depuis l'URL externe
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IGCA-Backend/1.0)',
      },
      timeout: 10000, // 10 secondes
    });

    // Déterminer le type de contenu
    const contentType = response.headers['content-type'] || 'image/jpeg';
    
    // Définir les en-têtes CORS pour permettre l'accès depuis le frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 24h

    // Envoyer l'image
    res.send(Buffer.from(response.data));
  } catch (error: any) {
    logger.error('Erreur lors de la récupération de l\'image:', error);
    
    if (error.response) {
      // Erreur HTTP (401, 403, 404, etc.)
      return res.status(error.response.status).json({ 
        error: `Erreur ${error.response.status}: ${error.response.statusText}` 
      });
    } else if (error.request) {
      // Pas de réponse du serveur
      return res.status(504).json({ error: 'Timeout ou serveur inaccessible' });
    } else {
      // Erreur de configuration
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }
});

export default router;

