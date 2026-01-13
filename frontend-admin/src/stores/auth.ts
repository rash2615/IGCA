import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/services/api';
import type { User } from '@/types/auth';

export const useAuthStore = defineStore('auth', () => {
  // AUTHENTIFICATION DÉSACTIVÉE - Utilisateur par défaut
  const user = ref<User>({
    id: 1,
    email: 'admin@igca.paris',
    nom: 'Administrateur',
    prenom: 'Super',
    role: 'super_admin',
  });
  const token = ref<string | null>(null);
  const isLoading = ref(false);

  const isAuthenticated = computed(() => true); // Toujours authentifié

  // AUTHENTIFICATION DÉSACTIVÉE - Fonctions simplifiées
  async function checkAuth() {
    // Rien à faire, toujours authentifié
    isLoading.value = false;
  }

  async function login(email: string, password: string) {
    // AUTHENTIFICATION DÉSACTIVÉE - Toujours réussir
    return true;
  }

  function logout() {
    // AUTHENTIFICATION DÉSACTIVÉE - Ne fait rien
  }

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAuth,
  };
});

