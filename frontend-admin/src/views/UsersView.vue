<template>
  <div class="users">
    <h1>Gestion des utilisateurs</h1>
    
    <div class="filters">
      <input
        v-model="filters.search"
        type="text"
        placeholder="Rechercher..."
        @input="loadUsers"
      />
      <select v-model="filters.role" @change="loadUsers">
        <option value="">Tous les rôles</option>
        <option value="membre">Membre</option>
        <option value="benevole">Bénévole</option>
        <option value="admin">Admin</option>
        <option value="super_admin">Super Admin</option>
      </select>
    </div>

    <div v-if="loading" class="loading">Chargement...</div>
    <table v-else class="data-table">
      <thead>
        <tr>
          <th>Nom</th>
          <th>Prénom</th>
          <th>Email</th>
          <th>Rôle</th>
          <th>Statut</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.nom }}</td>
          <td>{{ user.prenom }}</td>
          <td>{{ user.email }}</td>
          <td>
            <span :class="['badge', `badge-${user.role}`]">{{ user.role }}</span>
          </td>
          <td>
            <span :class="['badge', user.is_active ? 'badge-active' : 'badge-inactive']">
              {{ user.is_active ? 'Actif' : 'Inactif' }}
            </span>
          </td>
          <td>
            <button
              v-if="user.is_active"
              @click="desactivateUser(user.id)"
              class="btn-small btn-warning"
            >
              Désactiver
            </button>
            <button
              v-else
              @click="activateUser(user.id)"
              class="btn-small btn-success"
            >
              Activer
            </button>
            <button
              v-if="authStore.user?.role === 'super_admin'"
              @click="editRole(user)"
              class="btn-small"
            >
              Modifier rôle
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Modal modification rôle -->
    <div v-if="showRoleModal" class="modal" @click.self="showRoleModal = false">
      <div class="modal-content">
        <h2>Modifier le rôle</h2>
        <div class="form-group">
          <label>Rôle</label>
          <select v-model="roleForm.role">
            <option value="membre">Membre</option>
            <option value="benevole">Bénévole</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
        <div class="modal-actions">
          <button @click="saveRole" :disabled="saving" class="btn-primary">
            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
          <button @click="showRoleModal = false" class="btn-cancel">Annuler</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usersApi } from '@/services/api';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const users = ref<any[]>([]);
const loading = ref(false);
const showRoleModal = ref(false);
const saving = ref(false);
const roleForm = ref({
  userId: null as number | null,
  role: '',
});
const filters = ref({
  search: '',
  role: '',
});

async function loadUsers() {
  loading.value = true;
  try {
    const response = await usersApi.list(filters.value);
    users.value = response.data.data || response.data || [];
  } catch (error: any) {
    console.error('Erreur lors du chargement:', error);
    if (error.response?.data?.error) {
      alert(error.response.data.error);
    }
  } finally {
    loading.value = false;
  }
}

async function desactivateUser(userId: number) {
  if (!confirm('Êtes-vous sûr de vouloir désactiver cet utilisateur ?')) return;
  
  try {
    await usersApi.desactivate(userId);
    await loadUsers();
  } catch (error) {
    alert('Erreur lors de la désactivation');
  }
}

async function activateUser(userId: number) {
  try {
    await usersApi.activate(userId);
    await loadUsers();
  } catch (error) {
    alert('Erreur lors de l\'activation');
  }
}

function editRole(user: any) {
  roleForm.value = {
    userId: user.id,
    role: user.role,
  };
  showRoleModal.value = true;
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
.users {
  width: 100%;
}

.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.filters input,
.filters select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.data-table {
  width: 100%;
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.data-table thead {
  background-color: #2c3e50;
  color: white;
}

.data-table th,
.data-table td {
  padding: 15px;
  text-align: left;
}

.data-table tbody tr {
  border-bottom: 1px solid #eee;
}

.badge {
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.badge-super_admin {
  background-color: #8e44ad;
  color: white;
}

.badge-admin {
  background-color: #3498db;
  color: white;
}

.badge-benevole {
  background-color: #f39c12;
  color: white;
}

.badge-membre {
  background-color: #95a5a6;
  color: white;
}

.badge-active {
  background-color: #d4edda;
  color: #155724;
}

.badge-inactive {
  background-color: #f8d7da;
  color: #721c24;
}

.btn-small {
  padding: 6px 12px;
  margin-right: 5px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
}

.btn-warning {
  background-color: #f39c12;
}

.btn-success {
  background-color: #27ae60;
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
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 10px;
  max-width: 500px;
  width: 90%;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn-primary {
  padding: 12px 24px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.btn-cancel {
  background-color: #95a5a6;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 5px;
  cursor: pointer;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}
</style>
