<template>
  <div class="page-container">
    <!-- Header avec actions principales -->
    <div class="page-header">
      <h1>Gestion des utilisateurs</h1>
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
          @click="showCreateModal = true" 
          class="action-btn-primary"
          title="Ajouter un nouvel utilisateur"
        >
          <span class="material-symbols-outlined">add</span>
          <span class="btn-text">Nouvel utilisateur</span>
        </button>
      </div>
    </div>

    <!-- Statistiques -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background: #dbeafe; color: #3b82f6;">
          <span class="material-symbols-outlined">groups</span>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.total || 0 }}</div>
          <div class="stat-label">Total utilisateurs</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: #d1fae5; color: #10b981;">
          <span class="material-symbols-outlined">check_circle</span>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.actifs || 0 }}</div>
          <div class="stat-label">Utilisateurs actifs</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: #fee2e2; color: #ef4444;">
          <span class="material-symbols-outlined">cancel</span>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.inactifs || 0 }}</div>
          <div class="stat-label">Utilisateurs inactifs</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: #fef3c7; color: #f59e0b;">
          <span class="material-symbols-outlined">admin_panel_settings</span>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.admins || 0 }}</div>
          <div class="stat-label">Administrateurs</div>
        </div>
      </div>
    </div>

    <!-- Filtres et recherche -->
    <div class="filters-section">
      <div class="search-box">
        <span class="material-symbols-outlined">search</span>
        <input 
          v-model="filters.search" 
          type="text" 
          placeholder="Rechercher par nom, prénom ou email..."
          @input="debounceSearch"
        />
      </div>
      <div class="filter-group">
        <select v-model="filters.role" @change="loadUsers">
          <option value="">Tous les rôles</option>
          <option value="membre">Membre</option>
          <option value="benevole">Bénévole</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
        <select v-model="filters.status" @change="loadUsers">
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
                  @click="editRole(user)"
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

    <!-- Modal création utilisateur -->
    <div v-if="showCreateModal" class="modal" @click.self="closeCreateModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Nouvel utilisateur</h2>
          <button @click="closeCreateModal" class="close-btn">
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
          <button @click="closeCreateModal" class="btn-secondary">Annuler</button>
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

    <!-- Modal modification rôle -->
    <div v-if="showRoleModal" class="modal" @click.self="showRoleModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Modifier le rôle</h2>
          <button @click="showRoleModal = false" class="close-btn">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Utilisateur</label>
            <input 
              :value="`${roleForm.nom || ''} ${roleForm.prenom || ''}`.trim() || roleForm.email"
              type="text"
              disabled
            />
          </div>
          <div class="form-group">
            <label>Rôle *</label>
            <select v-model="roleForm.role" required>
              <option value="membre">Membre</option>
              <option value="benevole">Bénévole</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showRoleModal = false" class="btn-secondary">Annuler</button>
          <button 
            @click="saveRole" 
            :disabled="saving || !roleForm.role" 
            class="btn-primary"
          >
            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { usersApi } from '@/services/api';

const users = ref<any[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);
const showRoleModal = ref(false);
const saving = ref(false);
const stats = ref<any>({});

const newUser = ref({
  nom: '',
  prenom: '',
  email: '',
  password: '',
  role: 'membre',
  is_active: true,
});

const filters = ref({
  search: '',
  role: '',
  status: '',
});

const roleForm = ref({
  userId: null as number | null,
  nom: '',
  prenom: '',
  email: '',
  role: '',
});

const hasActiveFilters = computed(() => {
  return !!(filters.value.search || filters.value.role || filters.value.status);
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
  if (filters.value.status === 'active') {
    filtered = filtered.filter(u => u.is_active);
  } else if (filters.value.status === 'inactive') {
    filtered = filtered.filter(u => !u.is_active);
  }

  // Filtre par recherche (déjà fait côté serveur, mais on peut aussi filtrer côté client)
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    filtered = filtered.filter(u => 
      (u.nom || '').toLowerCase().includes(search) ||
      (u.prenom || '').toLowerCase().includes(search) ||
      (u.email || '').toLowerCase().includes(search)
    );
  }

  return filtered;
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

function calculateStats() {
  stats.value = {
    total: users.value.length,
    actifs: users.value.filter(u => u.is_active).length,
    inactifs: users.value.filter(u => !u.is_active).length,
    admins: users.value.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
  };
}

async function loadUsers() {
  loading.value = true;
  try {
    const params: any = {};
    if (filters.value.role) params.role = filters.value.role;
    if (filters.value.search) params.search = filters.value.search;

    const response = await usersApi.list(params);
    users.value = response.data.data || response.data || [];
    calculateStats();
  } catch (error: any) {
    console.error('Erreur lors du chargement:', error);
    alert(error.response?.data?.error || 'Erreur lors du chargement');
  } finally {
    loading.value = false;
  }
}

async function refreshData() {
  await loadUsers();
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

function editRole(user: any) {
  roleForm.value = {
    userId: user.id,
    nom: user.nom || '',
    prenom: user.prenom || '',
    email: user.email || '',
    role: user.role,
  };
  showRoleModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
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
    closeCreateModal();
    await loadUsers();
    alert('Utilisateur créé avec succès !');
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erreur lors de la création');
  } finally {
    saving.value = false;
  }
}

async function saveRole() {
  if (!roleForm.value.userId) return;

  saving.value = true;
  try {
    await usersApi.updateRole(roleForm.value.userId, roleForm.value.role);
    showRoleModal.value = false;
    await loadUsers();
    alert('Rôle mis à jour avec succès !');
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erreur lors de la mise à jour');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadUsers();
});
</script>

<style scoped>
.page-container {
  padding: var(--spacing-xl);
  width: 100%;
  margin: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* Boutons styles maintenant dans buttons.css global */

.action-btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon .material-symbols-outlined {
  font-size: 28px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.filters-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f9fafb;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  flex: 1;
  min-width: 300px;
}

.search-box .material-symbols-outlined {
  color: #9ca3af;
  font-size: 20px;
}

.search-box input {
  flex: 1;
  border: none;
  background: none;
  outline: none;
  font-size: 14px;
  color: #1f2937;
}

.filter-group {
  display: flex;
  gap: 12px;
}

.filter-group select {
  padding: 10px 16px;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  color: #1f2937;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-group select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.table-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.loading-state .material-symbols-outlined,
.empty-state .material-symbols-outlined {
  font-size: 48px;
  color: #9ca3af;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.table-modern {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.table-modern thead {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
}

.table-modern thead th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table-modern tbody tr {
  border-bottom: 1px solid #f3f4f6;
  transition: all 0.2s;
}

.table-modern tbody tr:hover {
  background: #f9fafb;
}

.table-modern tbody td {
  padding: 12px 16px;
  color: #374151;
}

.role-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
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
  background: #f3f4f6;
  color: #374151;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

.no-role {
  color: #9ca3af;
  font-style: italic;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
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
  border-radius: 6px;
  border: 1.5px solid #e5e7eb;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: #6b7280;
}

/* Boutons styles maintenant dans buttons.css global */

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
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: #f3f4f6;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input:disabled {
  background: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
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
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

/* Boutons styles maintenant dans buttons.css global */

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
