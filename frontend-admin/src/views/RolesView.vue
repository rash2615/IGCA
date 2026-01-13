<template>
  <div class="roles">
    <h1>Gestion des rôles bénévoles</h1>
    
    <div class="section">
      <h2>Bénévoles</h2>
      <div v-if="loading" class="loading">Chargement...</div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prénom</th>
            <th>Email</th>
            <th>Rôle fonctionnel</th>
            <th>Période</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="benevole in benevoles" :key="benevole.id">
            <td>{{ benevole.nom }}</td>
            <td>{{ benevole.prenom }}</td>
            <td>{{ benevole.email }}</td>
            <td>{{ benevole.role_fonctionnel_nom || '-' }}</td>
            <td>
              {{ formatDate(benevole.date_debut) }} - {{ formatDate(benevole.date_fin) }}
            </td>
            <td>
              <button @click="editBenevole(benevole)" class="btn-small">Modifier</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal édition -->
    <div v-if="showEditModal" class="modal" @click.self="showEditModal = false">
      <div class="modal-content">
        <h2>Modifier le bénévole</h2>
        <div class="form-group">
          <label>Rôle fonctionnel</label>
          <select v-model="editForm.fonctionnel_role">
            <option value="">Sélectionner un rôle</option>
            <option v-for="role in rolesFonctionnels" :key="role.id" :value="role.nom">
              {{ role.nom }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Date début</label>
          <input v-model="editForm.date_debut" type="date" />
        </div>
        <div class="form-group">
          <label>Date fin</label>
          <input v-model="editForm.date_fin" type="date" />
        </div>
        <div class="modal-actions">
          <button @click="saveBenevole" :disabled="saving" class="btn-primary">
            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
          <button @click="showEditModal = false" class="btn-cancel">Annuler</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { rolesApi } from '@/services/api';

const benevoles = ref<any[]>([]);
const rolesFonctionnels = ref<any[]>([]);
const loading = ref(false);
const showEditModal = ref(false);
const saving = ref(false);
const editForm = ref({
  userId: null as number | null,
  fonctionnel_role: '',
  date_debut: '',
  date_fin: '',
});

function formatDate(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR');
}

async function loadBenevoles() {
  loading.value = true;
  try {
    const response = await rolesApi.benevoles();
    benevoles.value = response.data.data || response.data || [];
  } catch (error: any) {
    console.error('Erreur lors du chargement:', error);
    if (error.response?.data?.error) {
      alert(error.response.data.error);
    }
  } finally {
    loading.value = false;
  }
}

async function loadRolesFonctionnels() {
  try {
    const response = await rolesApi.fonctionnels();
    rolesFonctionnels.value = response.data.data || response.data || [];
  } catch (error: any) {
    console.error('Erreur lors du chargement des rôles:', error);
    if (error.response?.data?.error) {
      alert(error.response.data.error);
    }
  }
}

function editBenevole(benevole: any) {
  editForm.value = {
    userId: benevole.id,
    fonctionnel_role: benevole.fonctionnel_role || '',
    date_debut: benevole.date_debut || '',
    date_fin: benevole.date_fin || '',
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
    alert('Rôle mis à jour avec succès !');
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erreur lors de la mise à jour');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadBenevoles();
  loadRolesFonctionnels();
});
</script>

<style scoped>
.roles {
  width: 100%;
}

.section {
  background: white;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.data-table {
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
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

.btn-small {
  padding: 6px 12px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
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

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  box-sizing: border-box;
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
