<template>
  <div class="app-layout">
    <!-- Top Header -->
    <header class="app-header">
      <div class="header-left">
        <div class="logo-section">
          <img 
            v-if="!logoError"
            src="/Miniature-site-1.svg" 
            alt="IGCA Paris" 
            class="logo-img"
            @error="handleLogoError"
          />
          <div v-else class="logo-placeholder">IGCA</div>
          <h1 class="app-title">IGCA Paris</h1>
        </div>
      </div>
      <div class="header-right">
        <div class="header-actions">
          <button class="header-icon-btn" title="Notifications">
            <span class="material-symbols-outlined">notifications</span>
            <span v-if="notificationCount > 0" class="notification-badge">{{ notificationCount }}</span>
          </button>
          <button class="header-icon-btn" title="Paramètres">
            <span class="material-symbols-outlined">settings</span>
          </button>
        </div>
        <div class="user-profile">
          <div class="profile-avatar">
            {{ userInitials }}
          </div>
          <div class="profile-info">
            <span class="profile-name">{{ authStore.user?.prenom || 'Admin' }} {{ authStore.user?.nom || 'IGCA' }}</span>
            <span class="profile-role">{{ formatRole(authStore.user?.role) || 'Super Admin' }}</span>
          </div>
          <button class="profile-dropdown">
            <span class="material-symbols-outlined">arrow_drop_down</span>
          </button>
        </div>
      </div>
    </header>

    <div class="layout-body">
      <!-- Sidebar -->
      <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
        <div class="sidebar-content">
          <nav class="sidebar-nav">
            <router-link
              v-for="item in menuItems"
              :key="item.path"
              :to="item.path"
              class="nav-item"
              :class="{ active: isActiveRoute(item.path) }"
            >
              <span class="nav-icon">
                <span class="material-symbols-outlined">{{ item.icon }}</span>
              </span>
              <span v-if="!sidebarCollapsed" class="nav-label">{{ item.label }}</span>
            </router-link>
          </nav>
        </div>
        <div class="sidebar-footer">
          <button @click="toggleSidebar" class="collapse-btn" :title="sidebarCollapsed ? 'Agrandir' : 'Réduire'">
            <span class="material-symbols-outlined">{{ sidebarCollapsed ? 'chevron_right' : 'chevron_left' }}</span>
          </button>
          <button @click="handleLogout" class="logout-btn">
            <span class="material-symbols-outlined">logout</span>
            <span v-if="!sidebarCollapsed">Déconnexion</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <div class="content-wrapper">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </main>
    </div>
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
const notificationCount = ref(0);
const logoError = ref(false);

function handleLogoError() {
  logoError.value = true;
}

const userInitials = computed(() => {
  const user = authStore.user;
  if (!user) return 'A';
  const prenom = user.prenom || '';
  const nom = user.nom || '';
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || 'A';
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

function isActiveRoute(path: string) {
  return route.path === path || route.path.startsWith(path + '/');
}

const menuItems = computed(() => {
  const allItems = [
    { path: '/app/dashboard', label: 'Accueil', icon: 'home', roles: ['admin', 'super_admin'] },
    { path: '/app/adhesions', label: 'Adhésions', icon: 'groups', roles: ['admin', 'super_admin'] },
    { path: '/app/cartes', label: 'Cartes membres', icon: 'badge', roles: ['admin', 'super_admin', 'benevole'] },
    { path: '/app/comptabilite', label: 'Comptabilité', icon: 'account_balance_wallet', roles: ['admin', 'super_admin'] },
    { path: '/app/dons', label: 'Dons', icon: 'favorite', roles: ['admin', 'super_admin'] },
    { path: '/app/menu', label: 'Menu du jour', icon: 'restaurant_menu', roles: ['admin', 'super_admin', 'benevole', 'membre'] },
    { path: '/app/roles', label: 'Rôles', icon: 'admin_panel_settings', roles: ['admin', 'super_admin'] },
    { path: '/app/users', label: 'Utilisateurs', icon: 'people', roles: ['admin', 'super_admin'] },
  ];
  return allItems;
});

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

function handleLogout() {
  router.push('/');
}
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f5f7fa;
}

/* Top Header */
.app-header {
  height: 64px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-img {
  width: 40px;
  height: 40px;
  object-fit: contain;
  border-radius: 4px;
  display: block;
  flex-shrink: 0;
}

.logo-placeholder {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 1px;
  flex-shrink: 0;
}

.app-title {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon-btn {
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.header-icon-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.notification-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: #dc2626;
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.user-profile:hover {
  background: #f1f5f9;
}

.profile-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.profile-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.2;
}

.profile-role {
  font-size: 12px;
  color: #64748b;
  line-height: 1.2;
}

.profile-dropdown {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
}

/* Layout Body */
.layout-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 260px;
  background: white;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 72px;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #64748b;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s;
  position: relative;
  font-size: 14px;
  font-weight: 500;
}

.nav-item:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.nav-item.active {
  background: #fef2f2;
  color: #dc2626;
  font-weight: 600;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 24px;
  background: #dc2626;
  border-radius: 0 2px 2px 0;
}

.nav-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-icon .material-symbols-outlined {
  font-size: 22px;
}

.nav-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.collapse-btn {
  width: 100%;
  height: 36px;
  background: #f1f5f9;
  border: none;
  border-radius: 6px;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.collapse-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.logout-btn {
  width: 100%;
  height: 36px;
  background: #fee2e2;
  border: none;
  border-radius: 6px;
  color: #dc2626;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #fecaca;
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f7fa;
}

.content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* Scrollbar */
.sidebar-content::-webkit-scrollbar,
.content-wrapper::-webkit-scrollbar {
  width: 6px;
}

.sidebar-content::-webkit-scrollbar-track,
.content-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb,
.content-wrapper::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover,
.content-wrapper::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 1024px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 64px;
    bottom: 0;
    z-index: 999;
    transform: translateX(-100%);
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  }

  .sidebar:not(.collapsed) {
    transform: translateX(0);
  }

  .main-content {
    margin-left: 0;
  }

  .app-title {
    display: none;
  }
}

@media (max-width: 768px) {
  .app-header {
    padding: 0 16px;
  }

  .header-right {
    gap: 8px;
  }

  .profile-info {
    display: none;
  }

  .content-wrapper {
    padding: 16px;
  }
}
</style>
