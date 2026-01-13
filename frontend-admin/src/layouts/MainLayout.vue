<template>
  <div class="layout">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="logo">
          <h1>IGCA Paris</h1>
        </div>
        <button @click="toggleSidebar" class="toggle-btn" :title="sidebarCollapsed ? 'Agrandir' : 'Réduire'">
          {{ sidebarCollapsed ? '→' : '←' }}
        </button>
      </div>

      <div class="user-info">
        <div class="user-avatar">
          {{ userInitials || 'A' }}
        </div>
        <div v-if="!sidebarCollapsed" class="user-details">
          <p class="user-name">{{ authStore.user?.prenom || 'Admin' }} {{ authStore.user?.nom || 'IGCA' }}</p>
          <p class="user-role">{{ formatRole(authStore.user?.role) || 'Super Admin' }}</p>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: $route.path === item.path }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span v-if="!sidebarCollapsed" class="nav-label">{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <button @click="handleLogout" class="logout-btn">
          <span class="nav-icon">🚪</span>
          <span v-if="!sidebarCollapsed">Déconnexion</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <header class="topbar">
        <div class="topbar-left">
          <h2 class="page-title">{{ currentPageTitle }}</h2>
        </div>
        <div class="topbar-right">
        <div class="user-menu">
          <span class="user-greeting">Bonjour, {{ authStore.user?.prenom || 'Admin' }}</span>
        </div>
        </div>
      </header>

      <div class="content-wrapper">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const sidebarCollapsed = ref(false);

const currentPageTitle = computed(() => {
  return route.meta.title as string || 'IGCA Paris';
});

const userInitials = computed(() => {
  const user = authStore.user;
  if (!user) return '?';
  const prenom = user.prenom || '';
  const nom = user.nom || '';
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || '?';
});

function formatRole(role?: string) {
  const roles: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrateur',
    benevole: 'Bénévole',
    membre: 'Membre',
  };
  return roles[role || ''] || role || 'Utilisateur';
}

  const menuItems = computed(() => {
    // AUTHENTIFICATION DÉSACTIVÉE - Afficher tous les menus
    const allItems = [
      { path: '/app/dashboard', label: 'Tableau de bord', icon: '📊', roles: ['admin', 'super_admin'] },
      { path: '/app/adhesions', label: 'Adhésions', icon: '👥', roles: ['admin', 'super_admin'] },
      { path: '/app/cartes', label: 'Cartes membres', icon: '🎴', roles: ['admin', 'super_admin'] },
      { path: '/app/verification', label: 'Vérification', icon: '✅', roles: ['admin', 'super_admin', 'benevole'] },
      { path: '/app/transmission', label: 'Transmission', icon: '📤', roles: ['admin', 'super_admin', 'benevole'] },
      { path: '/app/comptabilite', label: 'Comptabilité', icon: '💰', roles: ['admin', 'super_admin'] },
      { path: '/app/dons', label: 'Dons', icon: '💝', roles: ['admin', 'super_admin'] },
      { path: '/app/menu', label: 'Menu du jour', icon: '🍽️', roles: ['admin', 'super_admin', 'benevole', 'membre'] },
      { path: '/app/roles', label: 'Rôles', icon: '👤', roles: ['admin', 'super_admin'] },
      { path: '/app/users', label: 'Utilisateurs', icon: '👥', roles: ['admin', 'super_admin'] },
    ];

    // AUTHENTIFICATION DÉSACTIVÉE - Retourner tous les items
    return allItems;
    
    /* AUTHENTIFICATION ACTIVÉE
    const userRole = authStore.user?.role || '';
    return allItems.filter((item) => !item.roles || item.roles.includes(userRole));
    */
  });

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

function handleLogout() {
  // AUTHENTIFICATION DÉSACTIVÉE - Ne fait rien
  router.push('/');
}
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background-color: #f5f7fa;
}

/* Sidebar */
.sidebar {
  width: 280px;
  background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%);
  color: white;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  position: relative;
}

.sidebar.collapsed {
  width: 80px;
}

.sidebar-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
}

.toggle-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.toggle-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.user-info {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 600;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 12px;
  opacity: 0.8;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-nav {
  flex: 1;
  padding: 20px 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 14px 20px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-item.active {
  background: rgba(102, 126, 234, 0.2);
  color: white;
  border-left-color: #667eea;
}

.nav-icon {
  font-size: 20px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.nav-label {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 20px;
  background: rgba(231, 76, 60, 0.2);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: rgba(231, 76, 60, 0.3);
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  background: white;
  padding: 20px 30px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0;
}

.user-greeting {
  color: #7f8c8d;
  font-size: 14px;
}

.content-wrapper {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
  width: 100%;
  max-width: 100%;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 1000;
    transform: translateX(-100%);
  }

  .sidebar:not(.collapsed) {
    transform: translateX(0);
  }

  .main-content {
    margin-left: 0;
  }

  .content-wrapper {
    padding: 20px;
  }
}
</style>
