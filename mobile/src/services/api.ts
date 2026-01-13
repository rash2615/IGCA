import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://localhost:3001/api'; // À configurer selon l'environnement

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: (token?: string) => {
    if (token) {
      return api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    }
    return api.get('/auth/me');
  },
};

export const verificationApi = {
  check: (params: { nom?: string; email?: string; numero_carte?: string }) =>
    api.get('/verification/check', { params }),
};

export const cartesApi = {
  me: () => api.get('/cartes/me/carte'),
  download: (id: number) => api.get(`/cartes/${id}/download`, { responseType: 'blob' }),
};

export const menuApi = {
  jour: () => api.get('/menu/jour'),
};

export default api;

