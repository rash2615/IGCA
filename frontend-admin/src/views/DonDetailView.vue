<template>
  <div class="don-detail">
    <div class="detail-container">
      <!-- Header avec navigation -->
      <div class="page-header">
        <button @click="goBack" class="btn-back">
          <span class="material-symbols-outlined">arrow_back</span>
          Retour
        </button>
        <div class="header-title">
          <h1>Détails du don</h1>
          <p class="breadcrumb">Dons >> Détails</p>
        </div>
        <div class="header-actions">
          <button @click="editDon" class="btn-action btn-primary" title="Modifier">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button @click="confirmDelete" class="btn-action btn-danger" title="Supprimer">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading-container">
        <span class="material-symbols-outlined spin">sync</span>
        <p>Chargement...</p>
      </div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="don" class="content-wrapper">
        <!-- Carte principale -->
        <div class="main-card">
          <div class="card-header-main">
            <div class="don-amount-large">
              <span class="amount-value-large">{{ formatAmount(don.montant) }} €</span>
              <span class="amount-label-large">Don</span>
            </div>
            <div class="don-date-large">
              <span class="material-symbols-outlined">calendar_today</span>
              <span>{{ formatDate(don.date_don) }}</span>
            </div>
          </div>

          <div class="card-body-main">
            <div class="donor-info">
              <h2 class="donor-name">
                {{ don.prenom || '' }} {{ don.nom || '' }}
                <span v-if="!don.nom && !don.prenom" class="anonymous">Anonyme</span>
              </h2>
              <div class="donor-details">
                <div class="detail-item" v-if="don.email">
                  <span class="material-symbols-outlined">email</span>
                  <a :href="`mailto:${don.email}`">{{ don.email }}</a>
                </div>
                <div class="detail-item" v-if="don.moyen_paiement">
                  <span class="material-symbols-outlined">payment</span>
                  <span>{{ formatMoyenPaiement(don.moyen_paiement) }}</span>
                </div>
                <div class="detail-item" v-if="don.helloasso_id">
                  <span class="material-symbols-outlined">link</span>
                  <span>HelloAsso ID: {{ don.helloasso_id }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Informations détaillées -->
        <div class="info-sections">
          <div class="info-card">
            <div class="card-header-info">
              <span class="material-symbols-outlined">info</span>
              <h3>Informations personnelles</h3>
            </div>
            <div class="card-body-info">
              <div class="info-row">
                <span class="info-label">Nom</span>
                <span class="info-value">{{ don.nom || 'Non renseigné' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Prénom</span>
                <span class="info-value">{{ don.prenom || 'Non renseigné' }}</span>
              </div>
              <div class="info-row" v-if="don.email">
                <span class="info-label">Email</span>
                <span class="info-value">
                  <a :href="`mailto:${don.email}`">{{ don.email }}</a>
                </span>
              </div>
            </div>
          </div>

          <div class="info-card">
            <div class="card-header-info">
              <span class="material-symbols-outlined">euro</span>
              <h3>Informations du don</h3>
            </div>
            <div class="card-body-info">
              <div class="info-row">
                <span class="info-label">Montant</span>
                <span class="info-value highlight">{{ formatAmount(don.montant) }} €</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date du don</span>
                <span class="info-value">{{ formatDate(don.date_don) }}</span>
              </div>
              <div class="info-row" v-if="don.moyen_paiement">
                <span class="info-label">Moyen de paiement</span>
                <span class="info-value">{{ formatMoyenPaiement(don.moyen_paiement) }}</span>
              </div>
            </div>
          </div>

          <div class="info-card" v-if="don.helloasso_id">
            <div class="card-header-info">
              <span class="material-symbols-outlined">link</span>
              <h3>HelloAsso</h3>
            </div>
            <div class="card-body-info">
              <div class="info-row">
                <span class="info-label">ID HelloAsso</span>
                <span class="info-value">{{ don.helloasso_id }}</span>
              </div>
            </div>
          </div>

          <div class="info-card">
            <div class="card-header-info">
              <span class="material-symbols-outlined">history</span>
              <h3>Métadonnées</h3>
            </div>
            <div class="card-body-info">
              <div class="info-row">
                <span class="info-label">Date de création</span>
                <span class="info-value">{{ formatDateTime(don.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal édition -->
    <Teleport to="body">
      <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
        <div class="modal-content large">
          <div class="modal-header">
            <h2>Modifier le don</h2>
            <button @click="closeEditModal" class="btn-icon-small">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveDon">
              <div class="form-grid">
                <div class="form-group">
                  <label>Nom *</label>
                  <input v-model="donForm.nom" type="text" placeholder="Nom du donateur" />
                </div>
                <div class="form-group">
                  <label>Prénom</label>
                  <input v-model="donForm.prenom" type="text" placeholder="Prénom du donateur" />
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input v-model="donForm.email" type="email" placeholder="email@example.com" />
                </div>
                <div class="form-group">
                  <label>Date du don *</label>
                  <input v-model="donForm.date_don" type="date" required />
                </div>
                <div class="form-group">
                  <label>Montant (€) *</label>
                  <input v-model.number="donForm.montant" type="number" step="0.01" min="0" required />
                </div>
                <div class="form-group">
                  <label>Moyen de paiement</label>
                  <select v-model="donForm.moyen_paiement">
                    <option value="">Sélectionner...</option>
                    <option value="especes">Espèces</option>
                    <option value="cheque">Chèque</option>
                    <option value="cb">Carte bancaire</option>
                    <option value="virement">Virement</option>
                    <option value="helloasso">HelloAsso</option>
                  </select>
                </div>
                <div class="form-group full-width">
                  <label>ID HelloAsso</label>
                  <input v-model="donForm.helloasso_id" type="text" placeholder="ID HelloAsso (optionnel)" />
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" @click="closeEditModal" class="btn-secondary">Annuler</button>
                <button type="submit" :disabled="saving" class="btn-primary">
                  <span v-if="saving" class="material-symbols-outlined spin">sync</span>
                  {{ saving ? 'Enregistrement...' : 'Modifier' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Teleport } from 'vue';
import { donsApi } from '@/services/api';

const route = useRoute();
const router = useRouter();

const don = ref<any>(null);
const loading = ref(true);
const error = ref('');
const showEditModal = ref(false);
const saving = ref(false);

const donForm = ref({
  nom: '',
  prenom: '',
  email: '',
  date_don: '',
  montant: 0,
  moyen_paiement: '',
  helloasso_id: '',
});

const moyensPaiement = [
  { value: 'especes', label: 'Espèces' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'cb', label: 'Carte bancaire' },
  { value: 'virement', label: 'Virement' },
  { value: 'helloasso', label: 'HelloAsso' },
];

async function loadDon() {
  loading.value = true;
  error.value = '';
  try {
    const id = parseInt(route.params.id as string);
    const response = await donsApi.get(id);
    don.value = response.data.data;
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Erreur lors du chargement du don';
    console.error('Erreur:', err);
  } finally {
    loading.value = false;
  }
}

function formatDate(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR');
}

function formatDateTime(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleString('fr-FR');
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function formatMoyenPaiement(moyen: string) {
  const moyenObj = moyensPaiement.find(m => m.value === moyen);
  return moyenObj ? moyenObj.label : moyen;
}

function goBack() {
  router.push('/app/dons');
}

function editDon() {
  if (!don.value) return;
  donForm.value = {
    nom: don.value.nom || '',
    prenom: don.value.prenom || '',
    email: don.value.email || '',
    date_don: don.value.date_don ? don.value.date_don.split('T')[0] : '',
    montant: don.value.montant || 0,
    moyen_paiement: don.value.moyen_paiement || '',
    helloasso_id: don.value.helloasso_id || '',
  };
  showEditModal.value = true;
}

function closeEditModal() {
  showEditModal.value = false;
}

async function saveDon() {
  if (!don.value) return;
  if (!donForm.value.date_don || !donForm.value.montant) {
    alert('La date et le montant sont requis');
    return;
  }

  saving.value = true;
  try {
    await donsApi.update(don.value.id, donForm.value);
    alert('Don modifié avec succès !');
    closeEditModal();
    await loadDon();
  } catch (err: any) {
    alert(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
  } finally {
    saving.value = false;
  }
}

function confirmDelete() {
  if (!don.value) return;
  if (!confirm(`Êtes-vous sûr de vouloir supprimer ce don de ${formatAmount(don.value.montant)} € ?`)) {
    return;
  }

  donsApi.delete(don.value.id)
    .then(() => {
      alert('Don supprimé avec succès !');
      router.push('/app/dons');
    })
    .catch((err: any) => {
      alert(err.response?.data?.error || 'Erreur lors de la suppression');
    });
}

onMounted(() => {
  loadDon();
});
</script>

<style scoped>
.don-detail {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
}

.detail-container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.3);
}

.header-title {
  flex: 1;
}

.header-title h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  color: white;
}

.breadcrumb {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  cursor: pointer;
  color: white;
  transition: all 0.2s;
}

.btn-action:hover {
  background: rgba(255, 255, 255, 0.3);
}

.btn-action.btn-danger:hover {
  background: rgba(220, 38, 38, 0.3);
  border-color: rgba(220, 38, 38, 0.5);
}

.loading-container,
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  color: #64748b;
}

.error {
  color: #dc2626;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.main-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.card-header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #f1f5f9;
}

.don-amount-large {
  display: flex;
  flex-direction: column;
}

.amount-value-large {
  font-size: 48px;
  font-weight: 700;
  color: #667eea;
  line-height: 1;
}

.amount-label-large {
  font-size: 14px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 8px;
}

.don-date-large {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #475569;
}

.don-date-large .material-symbols-outlined {
  color: #94a3b8;
}

.card-body-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.donor-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.donor-name {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.anonymous {
  color: #94a3b8;
  font-style: italic;
  font-weight: 400;
}

.donor-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  color: #64748b;
}

.detail-item .material-symbols-outlined {
  color: #94a3b8;
}

.detail-item a {
  color: #667eea;
  text-decoration: none;
}

.detail-item a:hover {
  text-decoration: underline;
}

.info-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.info-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.card-header-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.card-header-info .material-symbols-outlined {
  color: #667eea;
  font-size: 24px;
}

.card-header-info h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.card-body-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f8fafc;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
}

.info-value {
  font-size: 14px;
  color: #1e293b;
  text-align: right;
}

.info-value.highlight {
  font-size: 18px;
  font-weight: 700;
  color: #667eea;
}

.info-value a {
  color: #667eea;
  text-decoration: none;
}

.info-value a:hover {
  text-decoration: underline;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.large {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

.btn-icon-small {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.btn-icon-small:hover {
  background: #f1f5f9;
  color: #475569;
}

.modal-body {
  padding: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.form-group input,
.form-group select {
  padding: 10px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #f1f5f9;
  color: #475569;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
</style>

