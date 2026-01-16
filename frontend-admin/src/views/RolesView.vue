<template>
  <div class="page-container">
    <!-- Header avec actions principales -->
    <div class="page-header">
      <h1>Gestion des rôles</h1>
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
        <div class="stat-icon" style="background: #dbeafe; color: #3b82f6;">
          <span class="material-symbols-outlined">groups</span>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.total_benevoles || 0 }}</div>
          <div class="stat-label">Bénévoles actifs</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: #ede9fe; color: #8b5cf6;">
          <span class="material-symbols-outlined">badge</span>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ rolesFonctionnels.length }}</div>
          <div class="stat-label">Rôles fonctionnels</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: #d1fae5; color: #10b981;">
          <span class="material-symbols-outlined">check_circle</span>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ activeBenevolesCount }}</div>
          <div class="stat-label">Bénévoles avec rôle</div>
        </div>
      </div>
    </div>

    <!-- Onglets -->
    <div class="tabs-container">
      <button 
        @click="activeTab = 'benevoles'"
        :class="['tab-btn', { active: activeTab === 'benevoles' }]"
      >
        <span class="material-symbols-outlined">groups</span>
        Bénévoles
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
      <!-- Onglet Bénévoles -->
      <div v-if="activeTab === 'benevoles'" class="tab-panel">
        <div class="section-header">
          <h2>Liste des bénévoles</h2>
          <div class="search-box">
            <span class="material-symbols-outlined">search</span>
            <input 
              v-model="searchBenevole" 
              type="text" 
              placeholder="Rechercher un bénévole..."
              @input="debounceSearch"
            />
          </div>
        </div>

        <div v-if="loading" class="loading-state">
          <span class="material-symbols-outlined spinning">refresh</span>
          <p>Chargement...</p>
        </div>

        <div v-else-if="filteredBenevoles.length === 0" class="empty-state">
          <span class="material-symbols-outlined">inbox</span>
          <h3>Aucun bénévole trouvé</h3>
          <p>{{ searchBenevole ? 'Aucun résultat pour votre recherche' : 'Aucun bénévole enregistré' }}</p>
        </div>

        <div v-else class="table-container">
          <table class="table-modern">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Email</th>
                <th>Rôle fonctionnel</th>
                <th>Période</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="benevole in filteredBenevoles" :key="benevole.id">
                <td>{{ benevole.nom || '-' }}</td>
                <td>{{ benevole.prenom || '-' }}</td>
                <td>{{ benevole.email || '-' }}</td>
                <td>
                  <span v-if="benevole.role_fonctionnel_nom" class="role-badge">
                    {{ benevole.role_fonctionnel_nom }}
                  </span>
                  <span v-else class="no-role">Aucun rôle</span>
                </td>
                <td>
                  <span v-if="benevole.date_debut && benevole.date_fin">
                    {{ formatDate(benevole.date_debut) }} - {{ formatDate(benevole.date_fin) }}
                  </span>
                  <span v-else>-</span>
                </td>
                <td>
                  <span :class="['status-badge', benevole.is_active ? 'active' : 'inactive']">
                    {{ benevole.is_active ? 'Actif' : 'Inactif' }}
                  </span>
                </td>
                <td>
                  <button 
                    @click="editBenevole(benevole)" 
                    class="action-btn-small"
                    title="Modifier le rôle"
                  >
                    <span class="material-symbols-outlined">edit</span>
                  </button>
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
        </div>

        <div v-if="loadingRoles" class="loading-state">
          <span class="material-symbols-outlined spinning">refresh</span>
          <p>Chargement...</p>
        </div>

        <div v-else-if="rolesFonctionnels.length === 0" class="empty-state">
          <span class="material-symbols-outlined">admin_panel_settings</span>
          <h3>Aucun rôle fonctionnel</h3>
          <p>Créez votre premier rôle fonctionnel pour commencer</p>
        </div>

        <div v-else class="roles-grid">
          <div 
            v-for="role in rolesFonctionnels" 
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
              <span>{{ getBenevolesCountForRole(role.nom) }} bénévole(s)</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal création/édition rôle fonctionnel -->
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

    <!-- Modal édition bénévole -->
    <div v-if="showEditModal" class="modal" @click.self="showEditModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Modifier le rôle du bénévole</h2>
          <button @click="showEditModal = false" class="close-btn">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Bénévole</label>
            <input 
              :value="`${editForm.nom || ''} ${editForm.prenom || ''}`.trim() || editForm.email"
              type="text"
              disabled
            />
          </div>
          <div class="form-group">
            <label>Rôle fonctionnel *</label>
            <select v-model="editForm.fonctionnel_role" required>
              <option value="">Sélectionner un rôle</option>
              <option v-for="role in rolesFonctionnels" :key="role.id" :value="role.nom">
                {{ role.nom }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Date début *</label>
            <input v-model="editForm.date_debut" type="date" required />
          </div>
          <div class="form-group">
            <label>Date fin *</label>
            <input v-model="editForm.date_fin" type="date" required />
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showEditModal = false" class="btn-secondary">Annuler</button>
          <button 
            @click="saveBenevole" 
            :disabled="saving || !editForm.fonctionnel_role || !editForm.date_debut || !editForm.date_fin" 
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
import { rolesApi } from '@/services/api';

const activeTab = ref<'benevoles' | 'roles'>('benevoles');
const benevoles = ref<any[]>([]);
const rolesFonctionnels = ref<any[]>([]);
const loading = ref(false);
const loadingRoles = ref(false);
const searchBenevole = ref('');
const showCreateRoleModal = ref(false);
const showEditModal = ref(false);
const saving = ref(false);
const stats = ref<any>({});

const newRole = ref({
  nom: '',
  description: '',
});

const editForm = ref({
  userId: null as number | null,
  nom: '',
  prenom: '',
  email: '',
  fonctionnel_role: '',
  date_debut: '',
  date_fin: '',
});

const activeBenevolesCount = computed(() => {
  return benevoles.value.filter(b => b.role_fonctionnel_nom).length;
});

const filteredBenevoles = computed(() => {
  if (!searchBenevole.value.trim()) {
    return benevoles.value;
  }
  const search = searchBenevole.value.toLowerCase();
  return benevoles.value.filter(b => 
    (b.nom || '').toLowerCase().includes(search) ||
    (b.prenom || '').toLowerCase().includes(search) ||
    (b.email || '').toLowerCase().includes(search) ||
    (b.role_fonctionnel_nom || '').toLowerCase().includes(search)
  );
});

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

function debounceSearch() {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    // La recherche est réactive via computed
  }, 300);
}

function formatDate(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function getBenevolesCountForRole(roleNom: string): number {
  return benevoles.value.filter(b => b.role_fonctionnel_nom === roleNom).length;
}

async function loadBenevoles() {
  loading.value = true;
  try {
    const response = await rolesApi.benevoles();
    benevoles.value = response.data.data || response.data || [];
  } catch (error: any) {
    console.error('Erreur lors du chargement des bénévoles:', error);
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

async function loadStats() {
  try {
    const response = await rolesApi.benevolesStats();
    stats.value = response.data.data || {};
  } catch (error: any) {
    console.error('Erreur lors du chargement des stats:', error);
  }
}

async function refreshData() {
  await Promise.all([
    loadBenevoles(),
    loadRolesFonctionnels(),
    loadStats()
  ]);
}

function editBenevole(benevole: any) {
  editForm.value = {
    userId: benevole.id,
    nom: benevole.nom || '',
    prenom: benevole.prenom || '',
    email: benevole.email || '',
    fonctionnel_role: benevole.fonctionnel_role || '',
    date_debut: benevole.date_debut ? new Date(benevole.date_debut).toISOString().split('T')[0] : '',
    date_fin: benevole.date_fin ? new Date(benevole.date_fin).toISOString().split('T')[0] : '',
  };
  showEditModal.value = true;
}

async function saveBenevole() {
  if (!editForm.value.userId) return;

  saving.value = true;
  try {
    await rolesApi.assignRole(editForm.value.userId, {
      fonctionnel_role: editForm.value.fonctionnel_role,
      date_debut: editForm.value.date_debut,
      date_fin: editForm.value.date_fin,
    });
    showEditModal.value = false;
    await loadBenevoles();
    await loadStats();
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
    await loadBenevoles();
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

.action-btn-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1.5px solid #e5e7eb;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: #6b7280;
}

.action-btn-icon:hover:not(:disabled) {
  background: #f9fafb;
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.15);
}

.action-btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Boutons styles maintenant dans buttons.css global */

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

.tabs-container {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid #e5e7eb;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  color: #6b7280;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -2px;
}

.tab-btn:hover {
  color: var(--primary);
}

.tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.tab-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f9fafb;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  width: 300px;
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

.table-container {
  overflow-x: auto;
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
  background: #ede9fe;
  color: #8b5cf6;
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

.action-btn-small:hover {
  background: #f9fafb;
  border-color: var(--primary);
  color: var(--primary);
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.role-card {
  background: #f9fafb;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
}

.role-card:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
}

.role-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.role-card-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.delete-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: #fee2e2;
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-btn:hover {
  background: #fecaca;
}

.role-description {
  color: #6b7280;
  font-size: 14px;
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.role-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 14px;
}

.role-stats .material-symbols-outlined {
  font-size: 18px;
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
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
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
.form-group select,
.form-group textarea {
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
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input:disabled {
  background: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
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

.btn-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
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
