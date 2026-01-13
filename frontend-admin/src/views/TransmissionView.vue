<template>
  <div class="transmission">
    <h1>Transmission des cartes</h1>
    <div v-if="loading" class="loading">Chargement...</div>
    <table v-else class="data-table">
      <thead>
        <tr>
          <th>Numéro carte</th>
          <th>Nom</th>
          <th>Prénom</th>
          <th>Email</th>
          <th>Statut</th>
          <th>Date génération</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="carte in cartes" :key="carte.id">
          <td>{{ carte.numero_carte }}</td>
          <td>{{ carte.nom }}</td>
          <td>{{ carte.prenom }}</td>
          <td>{{ carte.email }}</td>
          <td>
            <span :class="['badge', `badge-${carte.statut}`]">{{ carte.statut }}</span>
          </td>
          <td>{{ formatDate(carte.date_generation) }}</td>
          <td>
            <button
              v-if="carte.statut !== 'remise'"
              @click="markRemise(carte.id)"
              class="btn-remise"
            >
              Marquer comme remise
            </button>
            <span v-else class="remise-info">
              Remise le {{ formatDate(carte.date_remise) }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { transmissionApi } from '@/services/api';

const cartes = ref<any[]>([]);
const loading = ref(false);

function formatDate(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR');
}

async function loadCartes() {
  loading.value = true;
  try {
    const response = await transmissionApi.list();
    cartes.value = response.data.data || response.data || [];
  } catch (error: any) {
    console.error('Erreur lors du chargement:', error);
    if (error.response?.data?.error) {
      alert(error.response.data.error);
    }
  } finally {
    loading.value = false;
  }
}

async function markRemise(carteId: number) {
  try {
    await transmissionApi.markRemise(carteId);
    await loadCartes();
  } catch (error) {
    console.error('Erreur lors de la remise:', error);
    alert('Erreur lors de la mise à jour');
  }
}

onMounted(() => {
  loadCartes();
});
</script>

<style scoped>
.transmission {
  width: 100%;
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

.data-table tbody tr:hover {
  background-color: #f9f9f9;
}

.badge {
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.badge-generee {
  background-color: #d1ecf1;
  color: #0c5460;
}

.badge-remise {
  background-color: #d4edda;
  color: #155724;
}

.btn-remise {
  padding: 8px 16px;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
}

.btn-remise:hover {
  background-color: #229954;
}

.remise-info {
  color: #27ae60;
  font-size: 14px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}
</style>
