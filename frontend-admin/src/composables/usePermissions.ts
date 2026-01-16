import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

/**
 * Composable pour gérer les permissions de manière centralisée
 * Toutes les vues doivent utiliser ce composable pour vérifier les permissions
 */
export function usePermissions() {
  const authStore = useAuthStore();

  // Rôles autorisés pour chaque action
  const roles = {
    // Lecture seule - tous les utilisateurs authentifiés
    canView: ['admin', 'super_admin', 'benevole', 'membre'],
    
    // Édition - admin, super_admin, benevole
    canEdit: ['admin', 'super_admin', 'benevole'],
    
    // Création - admin, super_admin, benevole
    canCreate: ['admin', 'super_admin', 'benevole'],
    
    // Suppression - admin, super_admin uniquement
    canDelete: ['admin', 'super_admin'],
    
    // Gestion des utilisateurs - super_admin uniquement
    canManageUsers: ['super_admin'],
    
    // Gestion des rôles - super_admin uniquement
    canManageRoles: ['super_admin'],
    
    // Gestion de la comptabilité - admin, super_admin
    canManageComptabilite: ['admin', 'super_admin'],
  };

  const userRole = computed(() => authStore.user?.role || '');

  // Permissions calculées
  const permissions = {
    canView: computed(() => roles.canView.includes(userRole.value)),
    canEdit: computed(() => roles.canEdit.includes(userRole.value)),
    canCreate: computed(() => roles.canCreate.includes(userRole.value)),
    canDelete: computed(() => roles.canDelete.includes(userRole.value)),
    canManageUsers: computed(() => roles.canManageUsers.includes(userRole.value)),
    canManageRoles: computed(() => roles.canManageRoles.includes(userRole.value)),
    canManageComptabilite: computed(() => roles.canManageComptabilite.includes(userRole.value)),
  };

  return {
    userRole,
    permissions,
  };
}

