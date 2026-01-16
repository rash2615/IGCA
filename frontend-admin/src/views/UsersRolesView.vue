<template>
  <div class="page-container">
    <!-- Header avec actions principales -->
    <div class="page-header">
      <h1>Gestion des utilisateurs et rôles</h1>
      <div class="header-actions">
        <button 
          @click="refreshData" 
          class="action-btn-icon" 
          title="Actualiser"
          :disabled="loading"
        >
          <span class="material-symbols-outlined" :class="{ 'spinning': loading }">refresh</span>
        </button>
        <button 
          v-if="activeTab === 'users'"
          @click="showCreateUserModal = true" 
          class="action-btn-primary"
          title="Ajouter un nouvel utilisateur"
        >
          <span class="material-symbols-outlined">add</span>
          <span class="btn-text">Nouvel utilisateur</span>
        </button>
        <button 
          v-if="activeTab === 'roles'"
          @click="showCreateRoleModal = true" 
          class="action-btn-primary"
          title="Créer un nouveau rôle fonctionnel"
        >
          <span class="material-symbols-outlined">add</span>
          <span class="btn-text">Nouveau rôle</span>
        </button>
      </div>
    </div>

    <!-- Statistiques -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--primary-pastel); color: var(--primary);">
          <span class="material-symbols-outlined">groups</span>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ userStats.total || 0 }}</div>
          <div class="stat-label">Total utilisateurs</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--color-green-pastel); border-color: var(--color-green);">
          <span class="material-symbols-outlined" style="color: var(--color-green);">check_circle</span>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ userStats.actifs || 0 }}</div>
          <div class="stat-label">Utilisateurs actifs</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--bg-secondary); border-color: var(--color-black);">
          <span class="material-symbols-outlined" style="color: var(--color-black);">badge</span>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ rolesFonctionnels.length }}</div>
          <div class="stat-label">Rôles fonctionnels</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--color-yellow-pastel); border-color: var(--color-yellow);">
          <span class="material-symbols-outlined">admin_panel_settings</span>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ userStats.admins || 0 }}</div>
          <div class="stat-label">Administrateurs</div>
        </div>
      </div>
    </div>

    <!-- Onglets -->
    <div class="tabs-container">
      <button 
        @click="activeTab = 'users'"
        :class="['tab-btn', { active: activeTab === 'users' }]"
      >
        <span class="material-symbols-outlined">groups</span>
        Utilisateurs
      </button>
      <button 
        @click="activeTab = 'roles'"
        :class="['tab-btn', { active: activeTab === 'roles' }]"
      >
        <span class="material-symbols-outlined">admin_panel_settings</span>
        Rôles fonctionnels
      </button>
    </div>

    <!-- Contenu des onglets -->
    <div class="tab-content">
      <!-- Onglet Utilisateurs -->
      <div v-if="activeTab === 'users'" class="tab-panel">
        <!-- Filtres et recherche -->
        <div class="filters-section">
          <div class="search-box">
            <span class="material-symbols-outlined">search</span>
            <input 
              v-model="userFilters.search" 
              type="text" 
              placeholder="Rechercher par nom, prénom ou email..."
              @input="debounceSearch"
            />
          </div>
          <div class="filter-group">
            <select v-model="userFilters.role" @change="loadUsers">
              <option value="">Tous les rôles</option>
              <option value="membre">Membre</option>
              <option value="benevole">Bénévole</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <select v-model="userFilters.status" @change="loadUsers">
              <option value="">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>
        </div>

        <!-- Tableau des utilisateurs -->
        <div class="table-container">
          <div v-if="loading" class="loading-state">
            <span class="material-symbols-outlined spinning">refresh</span>
            <p>Chargement...</p>
          </div>

          <div v-else-if="filteredUsers.length === 0" class="empty-state">
            <span class="material-symbols-outlined">inbox</span>
            <h3>Aucun utilisateur trouvé</h3>
            <p>{{ hasActiveFilters ? 'Aucun résultat pour vos filtres' : 'Aucun utilisateur enregistré' }}</p>
          </div>

          <table v-else class="table-modern">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Rôle fonctionnel</th>
                <th>Date de création</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user.id">
                <td>{{ user.nom || '-' }}</td>
                <td>{{ user.prenom || '-' }}</td>
                <td>{{ user.email || '-' }}</td>
                <td>
                  <span :class="['role-badge', `role-${user.role}`]">
                    {{ formatRole(user.role) }}
                  </span>
                </td>
                <td>
                  <span v-if="user.fonctionnel_role" class="role-fonctionnel-badge">
                    {{ user.fonctionnel_role }}
                  </span>
                  <span v-else class="no-role">-</span>
                </td>
                <td>{{ formatDate(user.created_at) }}</td>
                <td>
                  <span :class="['status-badge', user.is_active ? 'active' : 'inactive']">
                    {{ user.is_active ? 'Actif' : 'Inactif' }}
                  </span>
                </td>
                <td>
                  <div class="actions-cell">
                    <button
                      v-if="user.is_active"
                      @click="toggleUserStatus(user)"
                      class="action-btn-small warning"
                      title="Désactiver"
                    >
                      <span class="material-symbols-outlined">block</span>
                    </button>
                    <button
                      v-else
                      @click="toggleUserStatus(user)"
                      class="action-btn-small success"
                      title="Activer"
                    >
                      <span class="material-symbols-outlined">check_circle</span>
                    </button>
                    <button
                      @click="editUserRole(user)"
                      class="action-btn-small"
                      title="Modifier le rôle"
                    >
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Onglet Rôles fonctionnels -->
      <div v-if="activeTab === 'roles'" class="tab-panel">
        <div class="section-header">
          <h2>Rôles fonctionnels</h2>
          <div class="search-box">
            <span class="material-symbols-outlined">search</span>
            <input 
              v-model="searchRole" 
              type="text" 
              placeholder="Rechercher un rôle..."
            />
          </div>
        </div>

        <div v-if="loadingRoles" class="loading-state">
          <span class="material-symbols-outlined spinning">refresh</span>
          <p>Chargement...</p>
        </div>

        <div v-else-if="filteredRoles.length === 0" class="empty-state">
          <span class="material-symbols-outlined">admin_panel_settings</span>
          <h3>Aucun rôle fonctionnel</h3>
          <p>{{ searchRole ? 'Aucun résultat pour votre recherche' : 'Créez votre premier rôle fonctionnel pour commencer' }}</p>
        </div>

        <div v-else class="roles-grid">
          <div 
            v-for="role in filteredRoles" 
            :key="role.id"
            class="role-card"
          >
            <div class="role-card-header">
              <h3>{{ role.nom }}</h3>
              <button 
                @click="deleteRole(role.id)" 
                class="delete-btn"
                title="Désactiver le rôle"
              >
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
            <p v-if="role.description" class="role-description">{{ role.description }}</p>
            <div class="role-stats">
              <span class="material-symbols-outlined">person</span>
              <span>{{ getUsersCountForRole(role.nom) }} utilisateur(s)</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal création utilisateur -->
    <div v-if="showCreateUserModal" class="modal" @click.self="closeCreateUserModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Nouvel utilisateur</h2>
          <button @click="closeCreateUserModal" class="close-btn">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nom *</label>
            <input 
              v-model="newUser.nom" 
              type="text" 
              placeholder="Nom de l'utilisateur"
              required
            />
          </div>
          <div class="form-group">
            <label>Prénom *</label>
            <input 
              v-model="newUser.prenom" 
              type="text" 
              placeholder="Prénom de l'utilisateur"
              required
            />
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input 
              v-model="newUser.email" 
              type="email" 
              placeholder="email@example.com"
              required
            />
          </div>
          <div class="form-group">
            <label>Mot de passe *</label>
            <input 
              v-model="newUser.password" 
              type="password" 
              placeholder="Minimum 8 caractères"
              required
              minlength="8"
            />
            <small class="form-hint">Le mot de passe doit contenir au moins 8 caractères</small>
          </div>
          <div class="form-group">
            <label>Rôle *</label>
            <select v-model="newUser.role" required>
              <option value="membre">Membre</option>
              <option value="benevole">Bénévole</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                v-model="newUser.is_active" 
                type="checkbox"
              />
              <span>Activer l'utilisateur immédiatement</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeCreateUserModal" class="btn-secondary">Annuler</button>
          <button 
            @click="createUser" 
            :disabled="saving || !isFormValid" 
            class="btn-primary"
          >
            {{ saving ? 'Création...' : 'Créer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal modification rôle utilisateur -->
    <div v-if="showEditUserRoleModal" class="modal" @click.self="showEditUserRoleModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Modifier le rôle</h2>
          <button @click="showEditUserRoleModal = false" class="close-btn">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Utilisateur</label>
            <input 
              :value="`${userRoleForm.nom || ''} ${userRoleForm.prenom || ''}`.trim() || userRoleForm.email"
              type="text"
              disabled
            />
          </div>
          <div class="form-group">
            <label>Rôle *</label>
            <select v-model="userRoleForm.role" required>
              <option value="membre">Membre</option>
              <option value="benevole">Bénévole</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showEditUserRoleModal = false" class="btn-secondary">Annuler</button>
          <button 
            @click="saveUserRole" 
            :disabled="saving || !userRoleForm.role" 
            class="btn-primary"
          >
            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal création rôle fonctionnel -->
    <div v-if="showCreateRoleModal" class="modal" @click.self="closeRoleModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Nouveau rôle fonctionnel</h2>
          <button @click="closeRoleModal" class="close-btn">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nom du rôle *</label>
            <input 
              v-model="newRole.nom" 
              type="text" 
              placeholder="Ex: Trésorier, Secrétaire..."
              required
            />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea 
              v-model="newRole.description" 
              placeholder="Description du rôle..."
              rows="3"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeRoleModal" class="btn-secondary">Annuler</button>
          <button @click="createRole" :disabled="saving || !newRole.nom" class="btn-primary">
            {{ saving ? 'Création...' : 'Créer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { usersApi, rolesApi } from '@/services/api';

const activeTab = ref<'users' | 'roles'>('users');
const users = ref<any[]>([]);
const rolesFonctionnels = ref<any[]>([]);
const loading = ref(false);
const loadingRoles = ref(false);
const showCreateUserModal = ref(false);
const showEditUserRoleModal = ref(false);
const showCreateRoleModal = ref(false);
const saving = ref(false);
const searchRole = ref('');
const userStats = ref<any>({});

const newUser = ref({
  nom: '',
  prenom: '',
  email: '',
  password: '',
  role: 'membre',
  is_active: true,
});

const userFilters = ref({
  search: '',
  role: '',
  status: '',
});

const userRoleForm = ref({
  userId: null as number | null,
  nom: '',
  prenom: '',
  email: '',
  role: '',
});

const newRole = ref({
  nom: '',
  description: '',
});

const hasActiveFilters = computed(() => {
  return !!(userFilters.value.search || userFilters.value.role || userFilters.value.status);
});

const isFormValid = computed(() => {
  return !!(
    newUser.value.nom &&
    newUser.value.prenom &&
    newUser.value.email &&
    newUser.value.password &&
    newUser.value.password.length >= 8 &&
    newUser.value.role
  );
});

const filteredUsers = computed(() => {
  let filtered = users.value;

  // Filtre par statut
  if (userFilters.value.status === 'active') {
    filtered = filtered.filter(u => u.is_active);
  } else if (userFilters.value.status === 'inactive') {
    filtered = filtered.filter(u => !u.is_active);
  }

  // Filtre par recherche
  if (userFilters.value.search) {
    const search = userFilters.value.search.toLowerCase();
    filtered = filtered.filter(u => 
      (u.nom || '').toLowerCase().includes(search) ||
      (u.prenom || '').toLowerCase().includes(search) ||
      (u.email || '').toLowerCase().includes(search)
    );
  }

  return filtered;
});

const filteredRoles = computed(() => {
  if (!searchRole.value.trim()) {
    return rolesFonctionnels.value;
  }
  const search = searchRole.value.toLowerCase();
  return rolesFonctionnels.value.filter(r => 
    (r.nom || '').toLowerCase().includes(search) ||
    (r.description || '').toLowerCase().includes(search)
  );
});

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

function debounceSearch() {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadUsers();
  }, 300);
}

function formatRole(role: string): string {
  const roles: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    benevole: 'Bénévole',
    membre: 'Membre',
  };
  return roles[role] || role;
}

function formatDate(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function calculateUserStats() {
  userStats.value = {
    total: users.value.length,
    actifs: users.value.filter(u => u.is_active).length,
    inactifs: users.value.filter(u => !u.is_active).length,
    admins: users.value.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
  };
}

function getUsersCountForRole(roleNom: string): number {
  return users.value.filter(u => u.fonctionnel_role === roleNom).length;
}

async function loadUsers() {
  loading.value = true;
  try {
    const params: any = {};
    if (userFilters.value.role) params.role = userFilters.value.role;
    if (userFilters.value.search) params.search = userFilters.value.search;

    const response = await usersApi.list(params);
    users.value = response.data.data || response.data || [];
    calculateUserStats();
  } catch (error: any) {
    console.error('Erreur lors du chargement:', error);
    alert(error.response?.data?.error || 'Erreur lors du chargement');
  } finally {
    loading.value = false;
  }
}

async function loadRolesFonctionnels() {
  loadingRoles.value = true;
  try {
    const response = await rolesApi.fonctionnels();
    rolesFonctionnels.value = response.data.data || response.data || [];
  } catch (error: any) {
    console.error('Erreur lors du chargement des rôles:', error);
    alert(error.response?.data?.error || 'Erreur lors du chargement');
  } finally {
    loadingRoles.value = false;
  }
}

async function refreshData() {
  await Promise.all([
    loadUsers(),
    loadRolesFonctionnels()
  ]);
}

async function toggleUserStatus(user: any) {
  const action = user.is_active ? 'désactiver' : 'activer';
  if (!confirm(`Êtes-vous sûr de vouloir ${action} cet utilisateur ?`)) return;
  
  try {
    if (user.is_active) {
      await usersApi.desactivate(user.id);
    } else {
      await usersApi.activate(user.id);
    }
    await loadUsers();
    alert(`Utilisateur ${action} avec succès !`);
  } catch (error: any) {
    alert(error.response?.data?.error || `Erreur lors de la ${action}`);
  }
}

function editUserRole(user: any) {
  userRoleForm.value = {
    userId: user.id,
    nom: user.nom || '',
    prenom: user.prenom || '',
    email: user.email || '',
    role: user.role,
  };
  showEditUserRoleModal.value = true;
}

function closeCreateUserModal() {
  showCreateUserModal.value = false;
  newUser.value = {
    nom: '',
    prenom: '',
    email: '',
    password: '',
    role: 'membre',
    is_active: true,
  };
}

async function createUser() {
  if (!isFormValid.value) return;

  saving.value = true;
  try {
    await usersApi.create(newUser.value);
    closeCreateUserModal();
    await loadUsers();
    alert('Utilisateur créé avec succès !');
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erreur lors de la création');
  } finally {
    saving.value = false;
  }
}

async function saveUserRole() {
  if (!userRoleForm.value.userId) return;

  saving.value = true;
  try {
    await usersApi.updateRole(userRoleForm.value.userId, userRoleForm.value.role);
    showEditUserRoleModal.value = false;
    await loadUsers();
    alert('Rôle mis à jour avec succès !');
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erreur lors de la mise à jour');
  } finally {
    saving.value = false;
  }
}

function closeRoleModal() {
  showCreateRoleModal.value = false;
  newRole.value = { nom: '', description: '' };
}

async function createRole() {
  if (!newRole.value.nom.trim()) return;

  saving.value = true;
  try {
    await rolesApi.createFonctionnel(newRole.value);
    await loadRolesFonctionnels();
    closeRoleModal();
    alert('Rôle créé avec succès !');
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erreur lors de la création');
  } finally {
    saving.value = false;
  }
}

async function deleteRole(roleId: number) {
  if (!confirm('Êtes-vous sûr de vouloir désactiver ce rôle ?')) return;

  try {
    await rolesApi.desactivateFonctionnel(roleId);
    await loadRolesFonctionnels();
    await loadUsers();
    alert('Rôle désactivé avec succès !');
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erreur lors de la désactivation');
  }
}

onMounted(() => {
  refreshData();
});
</script>

<style scoped>
.page-container {
  padding: var(--spacing-xl);
  width: 100%;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.action-btn-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--border);
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-base);
  color: var(--text-secondary);
}

.action-btn-icon:hover:not(:disabled) {
  background: var(--bg-secondary);
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.action-btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.stat-card {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
  border: 1px solid var(--border);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon .material-symbols-outlined {
  font-size: var(--font-size-2xl);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.tabs-container {
  display: flex;
  gap: 8px;
  margin-bottom: var(--spacing-xl);
  border-bottom: 2px solid var(--border);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: var(--spacing-md) var(--spacing-lg);
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-base);
  margin-bottom: -2px;
  font-size: var(--font-size-base);
}

.tab-btn:hover {
  color: var(--primary);
}

.tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.tab-content {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.section-header h2 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.filters-section {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
  flex-wrap: wrap;
  border: 1px solid var(--border);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--bg-primary);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  flex: 1;
  min-width: 300px;
}

.search-box .material-symbols-outlined {
  color: var(--text-secondary);
  font-size: var(--font-size-xl);
}

.search-box input {
  flex: 1;
  border: none;
  background: none;
  outline: none;
  font-size: var(--font-size-base);
  color: var(--text-primary);
  font-family: var(--font-body);
}

.filter-group {
  display: flex;
  gap: var(--spacing-md);
}

.filter-group select {
  padding: var(--spacing-md) var(--spacing-lg);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  font-size: var(--font-size-base);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-base);
  font-family: var(--font-body);
}

.filter-group select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-pastel);
}

.table-container {
  overflow-x: auto;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.loading-state .material-symbols-outlined,
.empty-state .material-symbols-outlined {
  font-size: 48px;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
}

.empty-state h3 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
}

.table-modern {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-base);
}

.table-modern thead {
  background: var(--color-black);
  color: var(--text-inverse);
}

.table-modern thead th {
  padding: var(--spacing-md) var(--spacing-lg);
  text-align: left;
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table-modern tbody tr {
  border-bottom: 1px solid var(--border);
  transition: all var(--transition-base);
}

.table-modern tbody tr:hover {
  background: var(--bg-secondary);
}

.table-modern tbody td {
  padding: var(--spacing-md) var(--spacing-lg);
  color: var(--text-primary);
}

.role-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.role-super_admin {
  background: #ede9fe;
  color: #8b5cf6;
}

.role-admin {
  background: #dbeafe;
  color: #3b82f6;
}

.role-benevole {
  background: #fef3c7;
  color: #f59e0b;
}

.role-membre {
  background: #e5e7eb;
  color: #6b7280;
}

.role-fonctionnel-badge {
  display: inline-block;
  padding: 4px 12px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.no-role {
  color: var(--text-secondary);
  font-style: italic;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.status-badge.active {
  background: #d1fae5;
  color: #10b981;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #ef4444;
}

.actions-cell {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-btn-small {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--border);
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-base);
  color: var(--text-secondary);
}

.action-btn-small:hover {
  background: var(--bg-secondary);
  border-color: var(--primary);
  color: var(--primary);
}

.action-btn-small.warning {
  color: #ef4444;
}

.action-btn-small.warning:hover {
  background: #fee2e2;
  border-color: #ef4444;
}

.action-btn-small.success {
  color: #10b981;
}

.action-btn-small.success:hover {
  background: #d1fae5;
  border-color: #10b981;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.role-card {
  background: var(--bg-secondary);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  transition: all var(--transition-base);
}

.role-card:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow-md);
}

.role-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.role-card-header h3 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.delete-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: none;
  background: #fee2e2;
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-base);
}

.delete-btn:hover {
  background: #fecaca;
}

.role-description {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  margin: 0 0 var(--spacing-md) 0;
  line-height: 1.5;
}

.role-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.role-stats .material-symbols-outlined {
  font-size: var(--font-size-lg);
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg) var(--spacing-xl);
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: none;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-base);
}

.close-btn:hover {
  background: var(--border);
  color: var(--text-primary);
}

.modal-body {
  padding: var(--spacing-xl);
}

.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-lg);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--text-primary);
  transition: all var(--transition-base);
  box-sizing: border-box;
  font-family: var(--font-body);
  background: var(--bg-primary);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-pastel);
}

.form-group input:disabled {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: not-allowed;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-hint {
  display: block;
  margin-top: 4px;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding: var(--spacing-lg) var(--spacing-xl);
  border-top: 1px solid var(--border);
}

.btn-primary,
.btn-secondary {
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all var(--transition-base);
  border: none;
  font-family: var(--font-body);
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: var(--text-inverse);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-orange);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1.5px solid var(--border);
}

.btn-secondary:hover {
  background: var(--border);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

