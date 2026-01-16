import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

console.log('🔧 Configuration API:', {
  API_URL,
  env: import.meta.env.VITE_API_URL || 'non défini'
});

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 secondes
});

// Cache simple pour éviter les requêtes redondantes
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5000; // 5 secondes
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 seconde de base

// Système de throttling pour éviter trop de requêtes simultanées
let activeRequests = 0;

// Fonction pour générer une clé de cache
function getCacheKey(config: any): string {
  return `${config.method?.toUpperCase()}_${config.url}_${JSON.stringify(config.params || {})}`;
}

// Fonction pour afficher une notification de rate limit
function showRateLimitNotification(delayMs: number) {
  const delaySeconds = Math.ceil(delayMs / 1000);
  const message = `Trop de requêtes. Nouvelle tentative dans ${delaySeconds} seconde(s)...`;
  console.warn('⚠️', message);
  // Vous pouvez ajouter une notification toast ici si vous avez un système de notifications
}

// Fonction pour afficher une erreur de rate limit
function showRateLimitError(message: string) {
  console.error('❌', message);
  // Vous pouvez ajouter une alerte ou notification toast ici
  alert(message);
}

// AUTHENTIFICATION DÉSACTIVÉE - Plus besoin de token
api.interceptors.request.use((config) => {
  // Vérifier le cache pour les requêtes GET
  if (config.method === 'get' && !config.headers?.['X-No-Cache']) {
    const cacheKey = getCacheKey(config);
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('📦 Utilisation du cache pour:', config.url);
      // Retourner une promesse résolue avec les données en cache
      return Promise.reject({
        __cached: true,
        data: cached.data,
        config,
      });
    }
  }
  
  // Incrémenter le compteur de requêtes actives
  activeRequests++;
  
  return config;
});

// Fonction de retry avec backoff exponentiel
async function retryRequest(error: any, retryCount = 0): Promise<any> {
  const config = error.config || error;
  
  // Ne pas retry pour certaines erreurs
  if (!config || error.response?.status === 401 || error.response?.status === 403) {
    return Promise.reject(error);
  }

  // Gérer les erreurs 429 (Too Many Requests) - Limiter à 1 seul retry avec délai long
  if (error.response?.status === 429) {
    // Lire le header Retry-After si disponible
    const retryAfter = error.response?.headers?.['retry-after'] || 
                       error.response?.headers?.['Retry-After'];
    const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : null;
    
    // Pour les erreurs 429, on ne fait qu'UN SEUL retry avec un délai minimum de 5 secondes
    if (retryCount === 0) {
      // Utiliser Retry-After si disponible, sinon minimum 5 secondes
      const delay = retryAfterSeconds 
        ? Math.max(retryAfterSeconds * 1000, 5000)
        : Math.max(RETRY_DELAY * Math.pow(2, retryCount), 5000);
      
      console.warn(`⚠️ Erreur 429 - Retry unique dans ${Math.ceil(delay/1000)} seconde(s)${retryAfterSeconds ? ` (Retry-After: ${retryAfterSeconds}s)` : ''}`);
      
      // Afficher une notification à l'utilisateur
      showRateLimitNotification(delay);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Ajouter un header pour éviter le cache
      config.headers = config.headers || {};
      config.headers['X-Retry-Count'] = retryCount + 1;
      config.headers['X-No-Cache'] = 'true';
      
      return api.request(config).catch((err: any) => {
        // Si on reçoit encore une 429, on arrête immédiatement
        if (err.response?.status === 429) {
          console.error('❌ Erreur 429 persistante - Arrêt des retries');
          err.userMessage = retryAfterSeconds 
            ? `Trop de requêtes. Veuillez réessayer dans ${retryAfterSeconds} seconde(s).`
            : 'Trop de requêtes. Veuillez patienter quelques instants avant de réessayer.';
          showRateLimitError(err.userMessage);
          return Promise.reject(err);
        }
        return Promise.reject(err);
      });
    } else {
      // Déjà fait un retry, on arrête
      console.error('❌ Erreur 429 persistante - Arrêt des retries');
      error.userMessage = retryAfterSeconds 
        ? `Trop de requêtes. Veuillez réessayer dans ${retryAfterSeconds} seconde(s).`
        : 'Trop de requêtes. Veuillez patienter quelques instants avant de réessayer.';
      showRateLimitError(error.userMessage);
      return Promise.reject(error);
    }
  }

  return Promise.reject(error);
}

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => {
    // Décrémenter le compteur de requêtes actives
    activeRequests = Math.max(0, activeRequests - 1);
    
    // Mettre en cache les réponses GET réussies
    if (response.config.method === 'get' && !response.config.headers?.['X-No-Cache']) {
      const cacheKey = getCacheKey(response.config);
      requestCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });
      // Limiter la taille du cache (garder seulement les 50 dernières requêtes)
      if (requestCache.size > 50) {
        const firstKey = requestCache.keys().next().value;
        requestCache.delete(firstKey);
      }
    }

    // Ne pas logger pour les blobs (trop volumineux)
    if (response.config.responseType !== 'blob') {
      console.log('✅ Réponse API reçue:', {
        url: response.config.url,
        status: response.status,
        method: response.config.method?.toUpperCase()
      });
    } else {
      console.log('✅ Blob reçu:', {
        url: response.config.url,
        status: response.status,
        size: response.data?.size || 'unknown'
      });
    }
    return response;
  },
  async (error) => {
    // Gérer les réponses en cache
    if (error.__cached) {
      return Promise.resolve({
        data: error.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
      });
    }

    // Gérer les erreurs réseau (pas de réponse du serveur)
    if (!error.response) {
      console.error('❌ Erreur réseau - Backend inaccessible:', {
        url: error.config?.url,
        message: error.message,
        code: error.code
      });
      
      // Message d'erreur plus clair pour l'utilisateur
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        error.userMessage = 'Le serveur backend n\'est pas accessible. Vérifiez qu\'il est démarré sur le port 3001.';
      } else if (error.code === 'ETIMEDOUT') {
        error.userMessage = 'Le serveur met trop de temps à répondre.';
      } else {
        error.userMessage = 'Erreur de connexion au serveur.';
      }
    } else {
      // Si c'est une réponse blob mais avec une erreur, essayer de lire le message d'erreur
      if (error.config?.responseType === 'blob' && error.response.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          error.response.data = json;
          error.userMessage = json.error || 'Erreur lors du téléchargement';
        } catch (e) {
          // Si ce n'est pas du JSON, garder le blob tel quel
        }
      }
      
      console.error('❌ Erreur API:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.response?.data?.error || error.message,
        method: error.config?.method?.toUpperCase()
      });
      
      // AUTHENTIFICATION DÉSACTIVÉE - Plus de redirection sur 401
      if (error.response?.status === 401) {
        console.warn('⚠️ Erreur 401 - Mais authentification désactivée');
      }

      // Gérer les erreurs 429 avec retry
      if (error.response?.status === 429) {
        return retryRequest(error);
      }
      
      // Ajouter un message utilisateur pour les autres erreurs
      if (!error.userMessage) {
        const statusMessages: Record<number, string> = {
          400: 'Requête invalide',
          404: 'Ressource introuvable',
          500: 'Erreur serveur',
          502: 'Serveur temporairement indisponible',
          503: 'Service temporairement indisponible',
        };
        error.userMessage = statusMessages[error.response?.status] || 
          error.response?.data?.error || 
          'Une erreur est survenue';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
};

export const adhesionsApi = {
  list: (params?: any) => api.get('/adhesions', { params }),
  get: (id: number) => api.get(`/adhesions/${id}`),
  stats: (annee?: string) => api.get('/adhesions/stats', { params: { annee } }),
  create: (data: any, photoFile?: File) => {
    if (photoFile) {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
          formData.append(key, data[key]);
        }
      });
      formData.append('photo', photoFile);
      return api.post('/adhesions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post('/adhesions', data);
  },
  update: (id: number, data: any, photoFile?: File) => {
    if (photoFile) {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        // Ne pas envoyer photo_url si on upload un fichier (le backend le gérera)
        if (key === 'photo_url') {
          return;
        }
        if (data[key] !== null && data[key] !== undefined) {
          formData.append(key, data[key]);
        }
      });
      formData.append('photo', photoFile);
      return api.put(`/adhesions/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.put(`/adhesions/${id}`, data);
  },
  updateStatut: (id: number, statut: string) =>
    api.patch(`/adhesions/${id}/statut`, { statut }),
  delete: (id: number) => api.delete(`/adhesions/${id}`),
  needCartes: () => api.get('/adhesions/need-cartes'),
  generateAttestation: (id: number) =>
    api.get(`/adhesions/${id}/attestation`, { responseType: 'blob' }),
  syncHelloAsso: (data: any) => api.post('/adhesions/sync-helloasso', data),
  testHelloAssoConnection: (data: any) => api.post('/adhesions/helloasso/test-connection', data),
  import: (file: File) => {
    const formData = new FormData();
    formData.append('csv', file);
    return api.post('/adhesions/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importCsv: (formData: FormData) => {
    return api.post('/adhesions/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  validateImport: (importId: number, data: any) =>
    api.post(`/adhesions/import/${importId}/validate`, data),
  export: (params?: any) => api.get('/adhesions/export/csv', { params, responseType: 'blob' }),
  exportCsv: (params?: any) => api.get('/adhesions/export/csv', { params, responseType: 'blob' }),
};

export const cartesApi = {
  list: (params?: any) => api.get('/cartes', { params }),
  generate: (adhesionId: number) => api.post(`/cartes/generate/${adhesionId}`),
  preview: (id: number) => api.get(`/cartes/${id}/preview`),
  download: (id: number, format: string = 'pdf') =>
    api.get(`/cartes/${id}/download?format=${format}`, { responseType: 'blob' }),
  me: () => api.get('/cartes/me/carte'),
  markAsDelivered: (id: number) => api.post(`/transmission/${id}/remise`),
  delete: (id: number) => api.delete(`/cartes/${id}`),
};

export const verificationApi = {
  check: (params: { nom?: string; email?: string; numero_carte?: string }) =>
    api.get('/verification/check', { params }),
};

export const transmissionApi = {
  list: (params?: any) => api.get('/transmission', { params }),
  markRemise: (carteId: number, dateRemise?: string) =>
    api.post(`/transmission/${carteId}/remise`, { date_remise: dateRemise }),
  history: (adhesionId: number) => api.get(`/transmission/adherent/${adhesionId}`),
  export: (params?: any) => api.get('/transmission/export/event', { params, responseType: 'blob' }),
};

export const comptabiliteApi = {
  overview: (params?: any) => api.get('/comptabilite/overview', { params }),
  overviewComplete: (params?: any) => api.get('/comptabilite/overview-complete', { params }),
  tarifs: (params?: any) => api.get('/comptabilite/adhesions/tarifs', { params }),
  export: (params?: any) => api.get('/comptabilite/export/csv', { params, responseType: 'blob' }),
  paiementsAnnee: (annee?: string) => api.get('/comptabilite/paiements-annee', { params: { annee } }),
  evolutionCAAnnee: () => api.get('/comptabilite/evolution-ca-annee'),
  // Dépenses
  depenses: {
    list: (params?: any) => api.get('/comptabilite/depenses', { params }),
    create: (data: any) => api.post('/comptabilite/depenses', data),
    update: (id: number, data: any) => api.put(`/comptabilite/depenses/${id}`, data),
    delete: (id: number) => api.delete(`/comptabilite/depenses/${id}`),
    stats: (params?: any) => api.get('/comptabilite/depenses/stats', { params }),
  },
  depensesCategories: {
    list: () => api.get('/comptabilite/depenses/categories'),
    create: (data: any) => api.post('/comptabilite/depenses/categories', data),
  },
  // Crédits
  credits: {
    list: (params?: any) => api.get('/comptabilite/credits', { params }),
    create: (data: any) => api.post('/comptabilite/credits', data),
    update: (id: number, data: any) => api.put(`/comptabilite/credits/${id}`, data),
    delete: (id: number) => api.delete(`/comptabilite/credits/${id}`),
  },
  // Bilans
  bilans: {
    list: (params?: any) => api.get('/comptabilite/bilans', { params }),
    get: (id: number) => api.get(`/comptabilite/bilans/${id}`),
    generate: (data: any) => api.post('/comptabilite/bilans/generate', data),
    delete: (id: number) => api.delete(`/comptabilite/bilans/${id}`),
    pdf: (id: number) => api.get(`/comptabilite/bilans/${id}/pdf`, { responseType: 'blob' }),
    excel: (id: number) => api.get(`/comptabilite/bilans/${id}/excel`, { responseType: 'blob' }),
  },
};

export const donsApi = {
  list: (params?: any) => api.get('/dons', { params }),
  get: (id: number) => api.get(`/dons/${id}`),
  create: (data: any) => api.post('/dons', data),
  update: (id: number, data: any) => api.put(`/dons/${id}`, data),
  delete: (id: number) => api.delete(`/dons/${id}`),
  stats: (params?: any) => api.get('/dons/stats', { params }),
  recent: (limit?: number) => api.get('/dons/recent', { params: { limit } }),
  import: (file: File) => {
    const formData = new FormData();
    formData.append('csv', file);
    return api.post('/dons/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  validateImport: (importId: number, data: any) =>
    api.post(`/dons/import/${importId}/validate`, data),
  exportCsv: (params?: any) => api.get('/dons/export/csv', { params, responseType: 'blob' }),
};

export const menuApi = {
  jour: () => api.get('/menu/jour'),
  getByDate: (date: string) => api.get(`/menu/date/${date}`),
  create: (data: any) => api.post('/menu', data),
  duplicate: (menuId: number, dateMenu: string) =>
    api.post(`/menu/${menuId}/duplicate`, { date_menu: dateMenu }),
  historique: (limit?: number) => api.get('/menu/historique', { params: { limit } }),
  // Plats
  plats: {
    list: () => api.get('/menu/plats'),
    get: (id: number) => api.get(`/menu/plats/${id}`),
    create: (data: FormData) => api.post('/menu/plats', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    update: (id: number, data: FormData) => api.put(`/menu/plats/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    delete: (id: number) => api.delete(`/menu/plats/${id}`),
  },
};

export const rolesApi = {
  fonctionnels: () => api.get('/roles/fonctionnels'),
  createFonctionnel: (data: any) => api.post('/roles/fonctionnels', data),
  desactivateFonctionnel: (id: number) => api.patch(`/roles/fonctionnels/${id}/desactivate`),
  benevoles: () => api.get('/roles/benevoles'),
  benevolesStats: () => api.get('/roles/benevoles/stats'),
  assignRole: (userId: number, data: any) => api.post(`/roles/benevoles/${userId}/role`, data),
};

export const usersApi = {
  list: (params?: any) => api.get('/users', { params }),
  create: (data: any) => api.post('/users', data),
  desactivate: (userId: number) => api.patch(`/users/${userId}/desactivate`),
  activate: (userId: number) => api.patch(`/users/${userId}/activate`),
  updateRole: (userId: number, role: string) => api.patch(`/users/${userId}/role`, { role }),
};

export default api;

