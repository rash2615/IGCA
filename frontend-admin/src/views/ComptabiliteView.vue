<template>
  <div class="comptabilite-modern">
    <!-- Header -->
    <div class="page-header">
      <h1>Comptabilité</h1>
      <div class="header-actions">
        <button @click="loadData" :disabled="loading" class="btn-icon" title="Actualiser">
          <span class="material-symbols-outlined">refresh</span>
        </button>
        <button @click="exportCsv" class="btn-icon" title="Exporter CSV">
          <span class="material-symbols-outlined">download</span>
        </button>
      </div>
    </div>

    <!-- Onglets -->
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="['tab', { active: activeTab === tab.id }]"
      >
        <span class="material-symbols-outlined">{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </div>

    <!-- Contenu des onglets -->
    <div class="tab-content">
      <!-- Vue d'ensemble -->
      <div v-if="activeTab === 'overview'" class="overview-tab">
        <!-- Sélecteur d'année -->
        <div class="year-selector">
          <label for="year-select">Année:</label>
          <select id="year-select" v-model="selectedYear" @change="loadData" class="year-select">
            <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
          </select>
          <span class="year-info">Totaux de l'année {{ selectedYear }}</span>
        </div>

        <div v-if="loading" class="loading">Chargement...</div>
        <div v-else-if="error" class="error">{{ error }}</div>
        <div v-else class="overview-grid">
          <!-- Cartes de statistiques -->
          <div class="stats-cards">
            <div class="stat-card revenue">
              <div class="stat-icon">
                <span class="material-symbols-outlined">trending_up</span>
              </div>
              <div class="stat-content">
                <div class="stat-label">Total Revenus</div>
                <div class="stat-value">{{ formatAmount(overviewComplete?.revenus?.total || 0) }} €</div>
                <div class="stat-details">
                  <span>Adhésions: {{ formatAmount(overviewComplete?.revenus?.adhesions || 0) }} €</span>
                  <span>Dons: {{ formatAmount(overviewComplete?.revenus?.dons || 0) }} €</span>
                  <span v-if="(overviewComplete?.revenus?.credits_manuels || 0) > 0">
                    Crédits: {{ formatAmount(overviewComplete?.revenus?.credits_manuels || 0) }} €
                  </span>
                </div>
              </div>
            </div>

            <div class="stat-card expense">
              <div class="stat-icon">
                <span class="material-symbols-outlined">trending_down</span>
              </div>
              <div class="stat-content">
                <div class="stat-label">Total Dépenses</div>
                <div class="stat-value">{{ formatAmount(overviewComplete?.depenses?.total || 0) }} €</div>
              </div>
            </div>

            <div class="stat-card balance" :class="{ negative: (overviewComplete?.solde || 0) < 0 }">
              <div class="stat-icon">
                <span class="material-symbols-outlined">account_balance</span>
              </div>
              <div class="stat-content">
                <div class="stat-label">Solde</div>
                <div class="stat-value">{{ formatAmount(overviewComplete?.solde || 0) }} €</div>
              </div>
            </div>
          </div>

          <!-- Détails supplémentaires -->
          <div class="details-section">
            <div class="detail-card">
              <h3>Crédits et Débits - {{ selectedYear }}</h3>
              
              <!-- Section CRÉDITS -->
              <div style="margin-bottom: 20px;">
                <h4 style="color: #059669; font-size: 14px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <span class="material-symbols-outlined" style="font-size: 18px;">trending_up</span>
                  CRÉDITS
                </h4>
                <div class="detail-item">
                  <span class="label">Adhésions:</span>
                  <span class="value revenue">{{ formatAmount(overviewComplete?.revenus?.adhesions || 0) }} €</span>
                </div>
                <div class="detail-item">
                  <span class="label">Dons:</span>
                  <span class="value revenue">{{ formatAmount(overviewComplete?.revenus?.dons || 0) }} €</span>
                </div>
                <div v-if="(overviewComplete?.revenus?.credits_manuels || 0) > 0" class="detail-item">
                  <span class="label">Crédits manuels:</span>
                  <span class="value revenue">{{ formatAmount(overviewComplete?.revenus?.credits_manuels || 0) }} €</span>
                </div>
                <div class="detail-item" style="border-top: 2px solid #d1fae5; margin-top: 8px; padding-top: 12px; background: #f0fdf4; border-radius: 6px; padding: 12px; margin-left: -12px; margin-right: -12px;">
                  <span class="label" style="font-weight: 600; color: #059669;">Total crédits:</span>
                  <span class="value revenue" style="font-weight: 700; font-size: 18px;">{{ formatAmount(overviewComplete?.revenus?.total || 0) }} €</span>
                </div>
              </div>

              <!-- Section DÉBITS -->
              <div>
                <h4 style="color: #dc2626; font-size: 14px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <span class="material-symbols-outlined" style="font-size: 18px;">trending_down</span>
                  DÉBITS
                </h4>
                <div class="detail-item">
                  <span class="label">Dépenses:</span>
                  <span class="value expense">{{ formatAmount(overviewComplete?.depenses?.total || 0) }} €</span>
                </div>
                <div class="detail-item" style="border-top: 2px solid #fee2e2; margin-top: 8px; padding-top: 12px; background: #fef2f2; border-radius: 6px; padding: 12px; margin-left: -12px; margin-right: -12px;">
                  <span class="label" style="font-weight: 600; color: #dc2626;">Total débits:</span>
                  <span class="value expense" style="font-weight: 700; font-size: 18px;">{{ formatAmount(overviewComplete?.depenses?.total || 0) }} €</span>
                </div>
              </div>
            </div>
            
            <div class="detail-card">
              <h3>Résumé - {{ selectedYear }}</h3>
              <div class="detail-item">
                <span class="label">Total crédits:</span>
                <span class="value revenue">{{ formatAmount(overviewComplete?.revenus?.total || 0) }} €</span>
              </div>
              <div class="detail-item">
                <span class="label">Total débits:</span>
                <span class="value expense">{{ formatAmount(overviewComplete?.depenses?.total || 0) }} €</span>
              </div>
              <div class="detail-item" style="border-top: 2px solid #e2e8f0; margin-top: 8px; padding-top: 12px;">
                <span class="label" style="font-weight: 600; font-size: 16px;">Solde:</span>
                <span class="value" :class="{ negative: (overviewComplete?.solde || 0) < 0 }" style="font-weight: 700; font-size: 18px;">
                  {{ formatAmount(overviewComplete?.solde || 0) }} €
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Gestion des crédits -->
      <div v-if="activeTab === 'credits'" class="credits-tab">
        <div class="section-header">
          <h2>Gestion des crédits</h2>
          <button @click="showCreditModal = true" class="btn-primary">
            <span class="material-symbols-outlined">add</span>
            Nouveau crédit
          </button>
        </div>

        <!-- Filtres -->
        <div class="filters-bar">
          <input
            v-model="creditFilters.search"
            type="text"
            placeholder="Rechercher..."
            class="search-input"
          />
          <select v-model="creditFilters.type_credit" class="filter-select">
            <option value="">Tous les types</option>
            <option value="virement">Virement</option>
            <option value="don">Don</option>
            <option value="aide">Aide</option>
            <option value="subvention">Subvention</option>
            <option value="autre">Autre</option>
          </select>
          <input
            v-model="creditFilters.date_debut"
            type="date"
            class="filter-input"
            placeholder="Date début"
          />
          <input
            v-model="creditFilters.date_fin"
            type="date"
            class="filter-input"
            placeholder="Date fin"
          />
          <button @click="loadCredits" class="btn-secondary">Filtrer</button>
        </div>

        <!-- Liste des crédits -->
        <div class="credits-list">
          <div v-if="loadingCredits" class="loading">Chargement...</div>
          <div v-else-if="credits.length === 0" class="empty-state">
            <span class="material-symbols-outlined">add_circle</span>
            <p>Aucun crédit trouvé</p>
          </div>
          <table v-else class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Libellé</th>
                <th>Type</th>
                <th>Montant</th>
                <th>Moyen de réception</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="credit in credits" :key="credit.id">
                <td>{{ formatDate(credit.date_credit) }}</td>
                <td>{{ credit.libelle }}</td>
                <td>
                  <span class="type-badge">{{ formatCreditType(credit.type_credit) }}</span>
                </td>
                <td class="amount revenue">{{ formatAmount(credit.montant) }} €</td>
                <td>{{ formatPaymentMethod(credit.moyen_reception) }}</td>
                <td>
                  <button @click="editCredit(credit)" class="btn-icon-small" title="Modifier">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button @click="deleteCredit(credit.id)" class="btn-icon-small btn-danger" title="Supprimer">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Gestion des dépenses -->
      <div v-if="activeTab === 'depenses'" class="depenses-tab">
        <div class="section-header">
          <h2>Gestion des dépenses</h2>
          <button @click="showDepenseModal = true" class="btn-primary">
            <span class="material-symbols-outlined">add</span>
            Nouvelle dépense
          </button>
        </div>

        <!-- Filtres -->
        <div class="filters-bar">
          <input
            v-model="depenseFilters.search"
            type="text"
            placeholder="Rechercher..."
            class="search-input"
          />
          <select v-model="depenseFilters.categorie_id" class="filter-select">
            <option value="">Toutes les catégories</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.nom }}</option>
          </select>
          <input
            v-model="depenseFilters.date_debut"
            type="date"
            class="filter-input"
            placeholder="Date début"
          />
          <input
            v-model="depenseFilters.date_fin"
            type="date"
            class="filter-input"
            placeholder="Date fin"
          />
          <button @click="loadDepenses" class="btn-secondary">Filtrer</button>
        </div>

        <!-- Liste des dépenses -->
        <div class="depenses-list">
          <div v-if="loadingDepenses" class="loading">Chargement...</div>
          <div v-else-if="depenses.length === 0" class="empty-state">
            <span class="material-symbols-outlined">receipt_long</span>
            <p>Aucune dépense trouvée</p>
          </div>
          <table v-else class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Libellé</th>
                <th>Catégorie</th>
                <th>Montant</th>
                <th>Moyen de paiement</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="depense in depenses" :key="depense.id">
                <td>{{ formatDate(depense.date_depense) }}</td>
                <td>{{ depense.libelle }}</td>
                <td>
                  <span
                    class="category-badge"
                    :style="{ backgroundColor: depense.categorie_couleur || '#667eea' }"
                  >
                    {{ depense.categorie_nom || 'Sans catégorie' }}
                  </span>
                </td>
                <td class="amount">{{ formatAmount(depense.montant) }} €</td>
                <td>{{ formatPaymentMethod(depense.moyen_paiement) }}</td>
                <td>
                  <button @click="editDepense(depense)" class="btn-icon-small" title="Modifier">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button @click="deleteDepense(depense.id)" class="btn-icon-small btn-danger" title="Supprimer">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Bilans -->
      <div v-if="activeTab === 'bilans'" class="bilans-tab">
        <div class="section-header">
          <h2>Bilans financiers</h2>
          <button @click="showBilanModal = true" class="btn-primary">
            <span class="material-symbols-outlined">add</span>
            Générer un bilan
          </button>
        </div>

        <!-- Liste des bilans -->
        <div class="bilans-list">
          <div v-if="loadingBilans" class="loading">Chargement...</div>
          <div v-else-if="bilans.length === 0" class="empty-state">
            <span class="material-symbols-outlined">description</span>
            <p>Aucun bilan généré</p>
          </div>
          <div v-else class="bilans-grid">
            <div v-for="bilan in bilans" :key="bilan.id" class="bilan-card">
              <div class="bilan-header">
                <h3>{{ bilan.titre }}</h3>
                <span class="bilan-type">{{ bilan.type_bilan }}</span>
              </div>
              <div class="bilan-period">
                {{ formatDate(bilan.date_debut) }} - {{ formatDate(bilan.date_fin) }}
              </div>
              <div class="bilan-stats">
                <div class="bilan-stat">
                  <span class="label">Revenus:</span>
                  <span class="value revenue">{{ formatAmount(bilan.total_revenus) }} €</span>
                </div>
                <div class="bilan-stat">
                  <span class="label">Dépenses:</span>
                  <span class="value expense">{{ formatAmount(bilan.total_depenses) }} €</span>
                </div>
                <div class="bilan-stat">
                  <span class="label">Solde:</span>
                  <span class="value" :class="{ negative: bilan.solde < 0 }">
                    {{ formatAmount(bilan.solde) }} €
                  </span>
                </div>
              </div>
              <div class="bilan-actions">
                <button @click="viewBilan(bilan.id)" class="btn-secondary">
                  <span class="material-symbols-outlined">visibility</span>
                  Voir
                </button>
                <button @click="downloadBilanPDF(bilan.id)" class="btn-secondary" :disabled="downloadingPDF === bilan.id">
                  <span v-if="downloadingPDF === bilan.id" class="material-symbols-outlined">hourglass_empty</span>
                  <span v-else class="material-symbols-outlined">picture_as_pdf</span>
                  {{ downloadingPDF === bilan.id ? 'Génération...' : 'PDF' }}
                </button>
                <button @click="downloadBilanExcel(bilan.id)" class="btn-secondary" :disabled="downloadingExcel === bilan.id">
                  <span v-if="downloadingExcel === bilan.id" class="material-symbols-outlined">hourglass_empty</span>
                  <span v-else class="material-symbols-outlined">table_chart</span>
                  {{ downloadingExcel === bilan.id ? 'Génération...' : 'Excel' }}
                </button>
                <button @click="deleteBilan(bilan.id)" class="btn-icon-small btn-danger" title="Supprimer">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal dépense -->
    <div v-if="showDepenseModal" class="modal-overlay" @click="showDepenseModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ editingDepense ? 'Modifier' : 'Nouvelle' }} dépense</h2>
          <button @click="closeDepenseModal" class="btn-icon-small">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <form @submit.prevent="saveDepense" class="modal-body">
          <div class="form-group">
            <label>Libellé *</label>
            <input v-model="depenseForm.libelle" type="text" required />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea v-model="depenseForm.description" rows="3"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Montant (€) *</label>
              <input v-model.number="depenseForm.montant" type="number" step="0.01" min="0" required />
            </div>
            <div class="form-group">
              <label>Date *</label>
              <input v-model="depenseForm.date_depense" type="date" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Catégorie</label>
              <select v-model.number="depenseForm.categorie_id">
                <option :value="null">Sans catégorie</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.nom }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Moyen de paiement</label>
              <select v-model="depenseForm.moyen_paiement">
                <option value="">Non spécifié</option>
                <option value="especes">Espèces</option>
                <option value="cheque">Chèque</option>
                <option value="cb">Carte bancaire</option>
                <option value="virement">Virement</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>URL facture (optionnel)</label>
            <input v-model="depenseForm.facture_url" type="url" />
          </div>
          <div class="modal-footer">
            <button type="button" @click="closeDepenseModal" class="btn-secondary">Annuler</button>
            <button type="submit" class="btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal crédit -->
    <div v-if="showCreditModal" class="modal-overlay" @click="showCreditModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ editingCredit ? 'Modifier' : 'Nouveau' }} crédit</h2>
          <button @click="closeCreditModal" class="btn-icon-small">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <form @submit.prevent="saveCredit" class="modal-body">
          <div class="form-group">
            <label>Libellé *</label>
            <input v-model="creditForm.libelle" type="text" required />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea v-model="creditForm.description" rows="3"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Montant (€) *</label>
              <input v-model.number="creditForm.montant" type="number" step="0.01" min="0" required />
            </div>
            <div class="form-group">
              <label>Date *</label>
              <input v-model="creditForm.date_credit" type="date" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Type de crédit</label>
              <select v-model="creditForm.type_credit">
                <option value="virement">Virement</option>
                <option value="don">Don</option>
                <option value="aide">Aide</option>
                <option value="subvention">Subvention</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div class="form-group">
              <label>Moyen de réception</label>
              <select v-model="creditForm.moyen_reception">
                <option value="">Non spécifié</option>
                <option value="virement">Virement</option>
                <option value="cheque">Chèque</option>
                <option value="especes">Espèces</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Référence (optionnel)</label>
            <input v-model="creditForm.reference" type="text" placeholder="Numéro de virement, chèque, etc." />
          </div>
          <div class="modal-footer">
            <button type="button" @click="closeCreditModal" class="btn-secondary">Annuler</button>
            <button type="submit" class="btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal bilan -->
    <div v-if="showBilanModal" class="modal-overlay" @click="showBilanModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Générer un bilan</h2>
          <button @click="showBilanModal = false" class="btn-icon-small">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <form @submit.prevent="generateBilan" class="modal-body">
          <div class="form-group">
            <label>Titre</label>
            <input v-model="bilanForm.titre" type="text" placeholder="Bilan mensuel janvier 2024" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Date de début *</label>
              <input v-model="bilanForm.date_debut" type="date" required />
            </div>
            <div class="form-group">
              <label>Date de fin *</label>
              <input v-model="bilanForm.date_fin" type="date" required />
            </div>
          </div>
          <div class="form-group">
            <label>Type de bilan</label>
            <select v-model="bilanForm.type_bilan">
              <option value="mensuel">Mensuel</option>
              <option value="trimestriel">Trimestriel</option>
              <option value="annuel">Annuel</option>
              <option value="personnalise">Personnalisé</option>
            </select>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="bilanForm.notes" rows="4" placeholder="Notes additionnelles..."></textarea>
          </div>
          <div class="modal-footer">
            <button type="button" @click="showBilanModal = false" class="btn-secondary">Annuler</button>
            <button type="submit" class="btn-primary" :disabled="generatingBilan">
              {{ generatingBilan ? 'Génération...' : 'Générer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { comptabiliteApi } from '@/services/api';

const activeTab = ref('overview');
const loading = ref(false);
const error = ref('');
const overviewComplete = ref<any>(null);
const selectedYear = ref(new Date().getFullYear());

// Générer la liste des années disponibles (année actuelle et 5 années précédentes)
const availableYears = ref<number[]>([]);
for (let i = 0; i < 6; i++) {
  availableYears.value.push(new Date().getFullYear() - i);
}

const tabs = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: 'dashboard' },
  { id: 'credits', label: 'Crédits', icon: 'add_circle' },
  { id: 'depenses', label: 'Dépenses', icon: 'receipt_long' },
  { id: 'bilans', label: 'Bilans', icon: 'description' },
];

// Crédits
const credits = ref<any[]>([]);
const loadingCredits = ref(false);
const creditFilters = ref({
  search: '',
  type_credit: '',
  date_debut: '',
  date_fin: '',
});
const showCreditModal = ref(false);
const editingCredit = ref<any>(null);
const creditForm = ref({
  libelle: '',
  description: '',
  montant: 0,
  type_credit: 'autre',
  date_credit: new Date().toISOString().split('T')[0],
  moyen_reception: '',
  reference: '',
});

// Dépenses
const depenses = ref<any[]>([]);
const categories = ref<any[]>([]);
const loadingDepenses = ref(false);
const depenseFilters = ref({
  search: '',
  categorie_id: '',
  date_debut: '',
  date_fin: '',
});
const showDepenseModal = ref(false);
const editingDepense = ref<any>(null);
const depenseForm = ref({
  libelle: '',
  description: '',
  montant: 0,
  categorie_id: null as number | null,
  date_depense: new Date().toISOString().split('T')[0],
  moyen_paiement: '',
  facture_url: '',
});

// Bilans
const bilans = ref<any[]>([]);
const loadingBilans = ref(false);
const showBilanModal = ref(false);
const generatingBilan = ref(false);
const downloadingPDF = ref<number | null>(null);
const downloadingExcel = ref<number | null>(null);
const bilanForm = ref({
  titre: '',
  date_debut: '',
  date_fin: '',
  type_bilan: 'personnalise',
  notes: '',
});


function formatAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '0.00';
  return parseFloat(amount.toString()).toFixed(2);
}

function formatDate(date: string): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR');
}

function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    especes: 'Espèces',
    cheque: 'Chèque',
    cb: 'Carte bancaire',
    virement: 'Virement',
    autre: 'Autre',
  };
  return methods[method] || method || 'Non spécifié';
}

function formatCreditType(type: string): string {
  const types: Record<string, string> = {
    virement: 'Virement',
    don: 'Don',
    aide: 'Aide',
    subvention: 'Subvention',
    autre: 'Autre',
  };
  return types[type] || type || 'Autre';
}

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    // Calculer les dates de début et fin de l'année sélectionnée
    const date_debut = `${selectedYear.value}-01-01`;
    const date_fin = `${selectedYear.value}-12-31`;
    
    const response = await comptabiliteApi.overviewComplete({ date_debut, date_fin });
    overviewComplete.value = response.data.data;
  } catch (err: any) {
    error.value = err.response?.data?.error || err.message || 'Erreur lors du chargement';
  } finally {
    loading.value = false;
  }
}

async function loadDepenses() {
  loadingDepenses.value = true;
  try {
    const params: any = {};
    if (depenseFilters.value.categorie_id) params.categorie_id = depenseFilters.value.categorie_id;
    if (depenseFilters.value.date_debut) params.date_debut = depenseFilters.value.date_debut;
    if (depenseFilters.value.date_fin) params.date_fin = depenseFilters.value.date_fin;
    
    const response = await comptabiliteApi.depenses.list(params);
    depenses.value = response.data.data || [];
  } catch (err: any) {
    alert(err.response?.data?.error || 'Erreur lors du chargement des dépenses');
  } finally {
    loadingDepenses.value = false;
  }
}

async function loadCategories() {
  try {
    const response = await comptabiliteApi.depensesCategories.list();
    categories.value = response.data.data || [];
  } catch (err: any) {
    console.error('Erreur lors du chargement des catégories:', err);
  }
}

async function loadCredits() {
  loadingCredits.value = true;
  try {
    const params: any = {};
    if (creditFilters.value.type_credit) params.type_credit = creditFilters.value.type_credit;
    if (creditFilters.value.date_debut) params.date_debut = creditFilters.value.date_debut;
    if (creditFilters.value.date_fin) params.date_fin = creditFilters.value.date_fin;
    
    const response = await comptabiliteApi.credits.list(params);
    credits.value = response.data.data || [];
  } catch (err: any) {
    alert(err.response?.data?.error || 'Erreur lors du chargement des crédits');
  } finally {
    loadingCredits.value = false;
  }
}

async function loadBilans() {
  loadingBilans.value = true;
  try {
    const response = await comptabiliteApi.bilans.list();
    bilans.value = response.data.data || [];
  } catch (err: any) {
    alert(err.response?.data?.error || 'Erreur lors du chargement des bilans');
  } finally {
    loadingBilans.value = false;
  }
}

function editDepense(depense: any) {
  editingDepense.value = depense;
  depenseForm.value = {
    libelle: depense.libelle,
    description: depense.description || '',
    montant: depense.montant,
    categorie_id: depense.categorie_id,
    date_depense: depense.date_depense,
    moyen_paiement: depense.moyen_paiement || '',
    facture_url: depense.facture_url || '',
  };
  showDepenseModal.value = true;
}

async function saveDepense() {
  try {
    if (editingDepense.value) {
      await comptabiliteApi.depenses.update(editingDepense.value.id, depenseForm.value);
    } else {
      await comptabiliteApi.depenses.create(depenseForm.value);
    }
    closeDepenseModal();
    await loadDepenses();
    await loadData();
  } catch (err: any) {
    alert(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
  }
}

function closeDepenseModal() {
  showDepenseModal.value = false;
  editingDepense.value = null;
  depenseForm.value = {
    libelle: '',
    description: '',
    montant: 0,
    categorie_id: null,
    date_depense: new Date().toISOString().split('T')[0],
    moyen_paiement: '',
    facture_url: '',
  };
}

async function deleteDepense(id: number) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) return;
  try {
    await comptabiliteApi.depenses.delete(id);
    await loadDepenses();
    await loadData();
  } catch (err: any) {
    alert(err.response?.data?.error || 'Erreur lors de la suppression');
  }
}

async function generateBilan() {
  generatingBilan.value = true;
  try {
    await comptabiliteApi.bilans.generate(bilanForm.value);
    showBilanModal.value = false;
    bilanForm.value = {
      titre: '',
      date_debut: '',
      date_fin: '',
      type_bilan: 'personnalise',
      notes: '',
    };
    await loadBilans();
    await loadData();
    alert('Bilan généré avec succès !');
  } catch (err: any) {
    alert(err.response?.data?.error || 'Erreur lors de la génération');
  } finally {
    generatingBilan.value = false;
  }
}

async function viewBilan(id: number) {
  try {
    const response = await comptabiliteApi.bilans.get(id);
    const bilan = response.data.data;
    alert(`Bilan: ${bilan.titre}\nRevenus: ${formatAmount(bilan.total_revenus)} €\nDépenses: ${formatAmount(bilan.total_depenses)} €\nSolde: ${formatAmount(bilan.solde)} €`);
  } catch (err: any) {
    alert(err.response?.data?.error || 'Erreur lors du chargement');
  }
}

async function downloadBilanPDF(id: number) {
  if (downloadingPDF.value === id) return;
  
  downloadingPDF.value = id;
  try {
    console.log('📥 Téléchargement PDF du bilan', id);
    const response = await comptabiliteApi.bilans.pdf(id);
    console.log('✅ Réponse reçue:', {
      status: response.status,
      headers: response.headers,
      dataType: typeof response.data,
      dataSize: response.data?.size || response.data?.length || 'unknown'
    });
    
    if (!response.data) {
      throw new Error('Aucune donnée reçue du serveur');
    }

    // Vérifier si c'est un blob ou un buffer
    let blob: Blob;
    if (response.data instanceof Blob) {
      blob = response.data;
    } else if (response.data instanceof ArrayBuffer) {
      blob = new Blob([response.data], { type: 'application/pdf' });
    } else {
      blob = new Blob([response.data], { type: 'application/pdf' });
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bilan_${id}.pdf`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
    console.log('✅ PDF téléchargé avec succès');
  } catch (err: any) {
    console.error('❌ Erreur lors du téléchargement PDF:', err);
    const errorMessage = err.response?.data?.error || err.message || 'Erreur lors du téléchargement du PDF';
    alert(`Erreur: ${errorMessage}\n\nDétails: ${err.response?.status || 'N/A'} - ${err.response?.statusText || err.toString()}`);
  } finally {
    downloadingPDF.value = null;
  }
}

async function downloadBilanExcel(id: number) {
  if (downloadingExcel.value === id) return;
  
  downloadingExcel.value = id;
  try {
    console.log('📥 Téléchargement Excel du bilan', id);
    const response = await comptabiliteApi.bilans.excel(id);
    console.log('✅ Réponse reçue:', {
      status: response.status,
      headers: response.headers,
      dataType: typeof response.data,
      dataSize: response.data?.size || response.data?.length || 'unknown'
    });
    
    if (!response.data) {
      throw new Error('Aucune donnée reçue du serveur');
    }

    // Vérifier si c'est un blob ou un buffer
    let blob: Blob;
    if (response.data instanceof Blob) {
      blob = response.data;
    } else if (response.data instanceof ArrayBuffer) {
      blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    } else {
      blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bilan_${id}.csv`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
    console.log('✅ Excel téléchargé avec succès');
  } catch (err: any) {
    console.error('❌ Erreur lors du téléchargement Excel:', err);
    
    // Si c'est une erreur blob, essayer de lire le message
    let errorMessage = 'Erreur lors du téléchargement Excel';
    if (err.response?.data) {
      if (err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          errorMessage = json.error || errorMessage;
        } catch (e) {
          errorMessage = err.message || errorMessage;
        }
      } else if (typeof err.response.data === 'object' && err.response.data.error) {
        errorMessage = err.response.data.error;
      } else if (typeof err.response.data === 'string') {
        errorMessage = err.response.data;
      }
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    alert(`Erreur: ${errorMessage}\n\nDétails: ${err.response?.status || 'N/A'} - ${err.response?.statusText || err.toString()}`);
  } finally {
    downloadingExcel.value = null;
  }
}

function editCredit(credit: any) {
  editingCredit.value = credit;
  creditForm.value = {
    libelle: credit.libelle,
    description: credit.description || '',
    montant: credit.montant,
    type_credit: credit.type_credit || 'autre',
    date_credit: credit.date_credit,
    moyen_reception: credit.moyen_reception || '',
    reference: credit.reference || '',
  };
  showCreditModal.value = true;
}

async function saveCredit() {
  try {
    if (editingCredit.value) {
      await comptabiliteApi.credits.update(editingCredit.value.id, creditForm.value);
    } else {
      await comptabiliteApi.credits.create(creditForm.value);
    }
    closeCreditModal();
    await loadCredits();
    await loadData();
  } catch (err: any) {
    alert(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
  }
}

function closeCreditModal() {
  showCreditModal.value = false;
  editingCredit.value = null;
  creditForm.value = {
    libelle: '',
    description: '',
    montant: 0,
    type_credit: 'autre',
    date_credit: new Date().toISOString().split('T')[0],
    moyen_reception: '',
    reference: '',
  };
}

async function deleteCredit(id: number) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce crédit ?')) return;
  try {
    await comptabiliteApi.credits.delete(id);
    await loadCredits();
    await loadData();
  } catch (err: any) {
    alert(err.response?.data?.error || 'Erreur lors de la suppression');
  }
}

async function deleteBilan(id: number) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce bilan ?')) return;
  try {
    await comptabiliteApi.bilans.delete(id);
    await loadBilans();
  } catch (err: any) {
    alert(err.response?.data?.error || 'Erreur lors de la suppression');
  }
}

async function exportCsv() {
  try {
    const response = await comptabiliteApi.export({ type: 'all' });
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comptabilite_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    alert(err.response?.data?.error || 'Erreur lors de l\'export');
  }
}

// Charger les données selon l'onglet actif
watch(activeTab, (newTab) => {
  if (newTab === 'credits') {
    loadCredits();
  } else if (newTab === 'depenses') {
    loadDepenses();
    loadCategories();
  } else if (newTab === 'bilans') {
    loadBilans();
  } else if (newTab === 'overview') {
    loadData();
  }
});

onMounted(() => {
  loadData();
  loadCategories();
});
</script>

<style scoped>
.comptabilite-modern {
  width: 100%;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
  color: #1e293b;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #5568d3;
}

.btn-secondary {
  padding: 8px 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #f8fafc;
}

.btn-icon-small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon-small:hover {
  background: #f8fafc;
}

.btn-icon-small.btn-danger {
  color: #dc2626;
  border-color: #fecaca;
}

.btn-icon-small.btn-danger:hover {
  background: #fee2e2;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid #e2e8f0;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  color: #64748b;
  font-weight: 500;
  transition: all 0.2s;
  margin-bottom: -2px;
}

.tab:hover {
  color: #475569;
}

.tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.tab-content {
  min-height: 400px;
}

/* Sélecteur d'année */
.year-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.year-selector label {
  font-weight: 600;
  color: #475569;
  font-size: 14px;
}

.year-select {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.year-select:focus {
  outline: none;
  border-color: #667eea;
}

.year-info {
  margin-left: auto;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

/* Vue d'ensemble */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  gap: 16px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card.revenue .stat-icon {
  background: #d1fae5;
  color: #059669;
}

.stat-card.expense .stat-icon {
  background: #fee2e2;
  color: #dc2626;
}

.stat-card.balance .stat-icon {
  background: #dbeafe;
  color: #2563eb;
}

.stat-card.balance.negative .stat-icon {
  background: #fee2e2;
  color: #dc2626;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}

.stat-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #94a3b8;
}

.details-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.detail-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.detail-card h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #1e293b;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #e2e8f0;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item .label {
  color: #64748b;
  font-size: 14px;
}

.detail-item .value {
  font-weight: 600;
  font-size: 16px;
  color: #1e293b;
}

.detail-item .value.revenue {
  color: #059669;
}

.detail-item .value.expense {
  color: #dc2626;
}

.detail-item .value.negative {
  color: #dc2626;
}

/* Dépenses */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  margin: 0;
  font-size: 22px;
  color: #1e293b;
}

.filters-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-input,
.filter-select,
.filter-input {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.data-table {
  width: 100%;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.data-table thead {
  background: #f8fafc;
}

.data-table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #475569;
  font-size: 14px;
}

.data-table td {
  padding: 12px 16px;
  border-top: 1px solid #e2e8f0;
  color: #1e293b;
}

.data-table td.amount {
  font-weight: 600;
  color: #dc2626;
}

.data-table td.amount.revenue {
  color: #059669;
}

.category-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.type-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  background: #dbeafe;
  color: #1e40af;
  font-size: 12px;
  font-weight: 500;
}

/* Bilans */
.bilans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.bilan-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.bilan-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
}

.bilan-header h3 {
  margin: 0;
  font-size: 18px;
  color: #1e293b;
}

.bilan-type {
  padding: 4px 12px;
  background: #f1f5f9;
  border-radius: 12px;
  font-size: 12px;
  color: #64748b;
  text-transform: capitalize;
}

.bilan-period {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 16px;
}

.bilan-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.bilan-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bilan-stat .label {
  color: #64748b;
  font-size: 14px;
}

.bilan-stat .value {
  font-weight: 600;
  font-size: 16px;
}

.bilan-stat .value.revenue {
  color: #059669;
}

.bilan-stat .value.expense {
  color: #dc2626;
}

.bilan-stat .value.negative {
  color: #dc2626;
}

.bilan-actions {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

/* Modal */
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
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  color: #1e293b;
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
  color: #475569;
  font-size: 14px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.loading,
.error {
  text-align: center;
  padding: 40px;
  color: #64748b;
}

.error {
  color: #dc2626;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #94a3b8;
}

.empty-state .material-symbols-outlined {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}
</style>
