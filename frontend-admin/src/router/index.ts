import { createRouter, createWebHistory } from 'vue-router';
// AUTHENTIFICATION DÉSACTIVÉE - Plus besoin du store auth

// Routes publiques
const publicRoutes = [
  {
    path: '/',
    name: 'landing',
    redirect: '/app/dashboard', // Redirection directe vers le dashboard
    meta: { 
      title: 'IGCA Paris - Accueil',
      requiresAuth: false 
    },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { 
      title: 'Connexion - IGCA Paris',
      requiresAuth: false 
    },
  },
];

// Routes protégées (application) - AUTHENTIFICATION DÉSACTIVÉE
const appRoutes = [
  {
    path: '/app',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: false }, // Désactivé temporairement
    redirect: '/app/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { 
          title: 'Tableau de bord',
          icon: 'dashboard',
          roles: ['admin', 'super_admin']
        },
      },
      {
        path: 'adhesions',
        name: 'adhesions',
        component: () => import('@/views/AdhesionsView.vue'),
        meta: { 
          title: 'Adhésions',
          icon: 'groups',
          roles: ['admin', 'super_admin']
        },
      },
      {
        path: 'adhesions/:id',
        name: 'adhesion-detail',
        component: () => import('@/views/AdhesionDetailView.vue'),
        meta: { 
          title: 'Détails adhésion',
          icon: 'groups',
          roles: ['admin', 'super_admin']
        },
      },
      {
        path: 'cartes',
        name: 'cartes',
        component: () => import('@/views/CartesView.vue'),
        meta: { 
          title: 'Cartes membres & Vérification',
          icon: 'badge',
          roles: ['admin', 'super_admin', 'benevole']
        },
      },
      {
        path: 'comptabilite',
        name: 'comptabilite',
        component: () => import('@/views/ComptabiliteView.vue'),
        meta: { 
          title: 'Comptabilité',
          icon: 'account_balance_wallet',
          roles: ['admin', 'super_admin']
        },
      },
      {
        path: 'dons',
        name: 'dons',
        component: () => import('@/views/DonsView.vue'),
        meta: { 
          title: 'Dons',
          icon: 'favorite',
          roles: ['admin', 'super_admin']
        },
      },
      {
        path: 'dons/:id',
        name: 'don-detail',
        component: () => import('@/views/DonDetailView.vue'),
        meta: { 
          title: 'Détails don',
          icon: 'favorite',
          roles: ['admin', 'super_admin']
        },
      },
      {
        path: 'menu',
        name: 'menu',
        component: () => import('@/views/MenuView.vue'),
        meta: { 
          title: 'Menu du jour',
          icon: 'restaurant_menu',
          roles: ['admin', 'super_admin', 'benevole', 'membre']
        },
      },
      {
        path: 'roles',
        name: 'roles',
        component: () => import('@/views/RolesView.vue'),
        meta: { 
          title: 'Rôles',
          icon: 'admin_panel_settings',
          roles: ['admin', 'super_admin']
        },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/views/UsersView.vue'),
        meta: { 
          title: 'Utilisateurs',
          icon: 'groups',
          roles: ['admin', 'super_admin']
        },
      },
    ],
  },
];

// Route 404
const notFoundRoute = {
  path: '/:pathMatch(.*)*',
  name: 'not-found',
  component: () => import('@/views/NotFoundView.vue'),
  meta: { 
    title: 'Page non trouvée',
    requiresAuth: false 
  },
};

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...publicRoutes, ...appRoutes, notFoundRoute],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

// Navigation guard - SIMPLIFIÉ SANS AUTHENTIFICATION
router.beforeEach((to, from, next) => {
  // Mettre à jour le titre de la page
  document.title = to.meta.title 
    ? `${to.meta.title} - IGCA Paris` 
    : 'IGCA Paris';

  // Toutes les routes sont accessibles - pas d'authentification
  next();
});

export default router;
