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
  timeout: 10000, // 10 secondes
});

// AUTHENTIFICATION DÉSACTIVÉE - Plus besoin de token
api.interceptors.request.use((config) => {
  // Pas de token nécessaire
  return config;
});

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => {
    console.log('✅ Réponse API reçue:', {
      url: response.config.url,
      status: response.status,
      method: response.config.method?.toUpperCase()
    });
    return response;
  },
  (error) => {
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
  tarifs: (params?: any) => api.get('/comptabilite/adhesions/tarifs', { params }),
  export: (params?: any) => api.get('/comptabilite/export/csv', { params, responseType: 'blob' }),
  paiementsAnnee: (annee?: string) => api.get('/comptabilite/paiements-annee', { params: { annee } }),
};

export const donsApi = {
  list: (params?: any) => api.get('/dons', { params }),
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
};

export const menuApi = {
  jour: () => api.get('/menu/jour'),
  create: (data: any) => api.post('/menu', data),
  duplicate: (menuId: number, dateMenu: string) =>
    api.post(`/menu/${menuId}/duplicate`, { date_menu: dateMenu }),
  historique: (limit?: number) => api.get('/menu/historique', { params: { limit } }),
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
  desactivate: (userId: number) => api.patch(`/users/${userId}/desactivate`),
  activate: (userId: number) => api.patch(`/users/${userId}/activate`),
  updateRole: (userId: number, role: string) => api.patch(`/users/${userId}/role`, { role }),
};

export default api;

