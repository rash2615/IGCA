<template>
  <div class="adhesion-detail-glass">
    <!-- Background avec gradient -->
    <div class="background-gradient"></div>
    
    <div class="detail-container">
      <!-- Header avec navigation -->
      <div class="page-header-glass">
        <button @click="goBack" class="btn-back-glass">
          <span class="material-symbols-outlined">arrow_back</span>
          Retour
        </button>
        <div class="header-title">
          <h1>Détails de l'adhésion</h1>
          <p class="breadcrumb">Adhésions >> Détails</p>
        </div>
        <div class="header-actions-glass">
          <button @click="generateAttestation" class="btn-action-glass" title="Générer attestation de paiement">
            <span class="material-symbols-outlined">description</span>
          </button>
          <button v-if="permissions.canEdit" @click="editAdhesion" class="btn-action-glass btn-primary-glass" title="Modifier">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button v-if="permissions.canDelete" @click="confirmDelete" class="btn-action-glass btn-danger-glass" title="Supprimer">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading-container-glass">
        <div class="spinner-glass"></div>
        <p>Chargement...</p>
      </div>
      <div v-else-if="error" class="error-glass">{{ error }}</div>
      <div v-else-if="adhesion" class="content-wrapper-glass">
        <!-- Carte principale - Carte d'identité -->
        <div class="glass-card identity-card-glass">
          <div class="card-header-glass">
            <div class="logo-section">
              <div class="logo-circle-glass">
                <span class="material-symbols-outlined">groups</span>
              </div>
              <div class="logo-text-glass">
                <h2>IGCA PARIS</h2>
                <p>Indian Gujarati Cultural Association</p>
              </div>
            </div>
            <div class="badges-header">
              <span :class="['badge-glass', `badge-${adhesion.statut}`]">
                <span class="material-symbols-outlined">{{ getStatutIcon(adhesion.statut) }}</span>
                {{ formatStatut(adhesion.statut) }}
              </span>
              <span v-if="adhesion.source === 'offline'" class="badge-glass badge-offline">
                <span class="material-symbols-outlined">store</span>
                Hors ligne
              </span>
              <span v-else-if="adhesion.source === 'online'" class="badge-glass badge-online">
                <span class="material-symbols-outlined">language</span>
                En ligne
              </span>
            </div>
          </div>
          
          <div class="card-body-glass">
            <div class="photo-section-glass">
              <div class="photo-frame-glass">
                <img
                  v-if="adhesion.photo_url"
                  :src="getImageUrl(adhesion.photo_url)"
                  :alt="`${adhesion.nom} ${adhesion.prenom}`"
                  @error="handleImageError"
                />
                <div v-else class="photo-placeholder-glass">
                  <span class="material-symbols-outlined">person</span>
                </div>
              </div>
              <div class="photo-badge-glass" v-if="adhesion.photo_url">
                <span class="material-symbols-outlined">check_circle</span>
                Photo disponible
              </div>
            </div>
            
            <div class="info-section-glass">
              <div class="name-section">
                <h1 class="name-glass">{{ adhesion.prenom }} {{ adhesion.nom }}</h1>
                <div class="id-badge-glass">
                  <span class="material-symbols-outlined">fingerprint</span>
                  <span>ID: #{{ adhesion.id }}</span>
                </div>
              </div>
              
              <div class="details-grid-glass">
                <div class="detail-item-glass">
                  <div class="detail-icon-glass">
                    <span class="material-symbols-outlined">email</span>
                  </div>
                  <div class="detail-content-glass">
                    <span class="detail-label">Email</span>
                    <a :href="`mailto:${adhesion.email}`" class="detail-value">{{ adhesion.email || 'Non renseigné' }}</a>
                  </div>
                </div>
                
                <div class="detail-item-glass" v-if="adhesion.telephone">
                  <div class="detail-icon-glass">
                    <span class="material-symbols-outlined">phone</span>
                  </div>
                  <div class="detail-content-glass">
                    <span class="detail-label">Téléphone</span>
                    <a :href="`tel:${adhesion.telephone}`" class="detail-value">{{ adhesion.telephone }}</a>
                  </div>
                </div>
                
                <div class="detail-item-glass">
                  <div class="detail-icon-glass">
                    <span class="material-symbols-outlined">calendar_today</span>
                  </div>
                  <div class="detail-content-glass">
                    <span class="detail-label">Date d'adhésion</span>
                    <span class="detail-value">{{ formatDate(adhesion.date_adhesion) }}</span>
                  </div>
                </div>
                
                <div class="detail-item-glass">
                  <div class="detail-icon-glass">
                    <span class="material-symbols-outlined">payments</span>
                  </div>
                  <div class="detail-content-glass">
                    <span class="detail-label">Tarif</span>
                    <span class="detail-value price-glass">{{ adhesion.tarif }} €</span>
                  </div>
                </div>
                
                <div class="detail-item-glass">
                  <div class="detail-icon-glass">
                    <span class="material-symbols-outlined">{{ getPaymentIcon(adhesion.moyen_paiement) }}</span>
                  </div>
                  <div class="detail-content-glass">
                    <span class="detail-label">Moyen de paiement</span>
                    <span class="detail-value">{{ formatMoyenPaiement(adhesion.moyen_paiement) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="card-footer-glass">
            <div class="footer-item-glass" v-if="adhesion.helloasso_id">
              <span class="material-symbols-outlined">link</span>
              <span>HelloAsso ID: {{ adhesion.helloasso_id }}</span>
            </div>
            <div class="footer-item-glass">
              <span class="material-symbols-outlined">schedule</span>
              <span>Créée le {{ formatDateTime(adhesion.created_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Section Documents -->
        <div class="section-title-glass">
          <h2>
            <span class="material-symbols-outlined">folder</span>
            Documents
          </h2>
        </div>

        <div class="documents-grid-glass">
          <!-- Carte membre -->
          <div v-if="adhesion.cartes && adhesion.cartes.length > 0" class="glass-card document-card-glass">
            <div class="document-icon-wrapper">
              <span class="material-symbols-outlined document-icon-gradient">badge</span>
            </div>
            <h3>Carte membre</h3>
            <div class="document-info-glass">
              <div class="info-line-glass">
                <span class="info-label">Numéro</span>
                <span class="info-value">{{ adhesion.cartes[0].numero_carte }}</span>
              </div>
              <div class="info-line-glass">
                <span class="info-label">Statut</span>
                <span :class="['badge-glass', `badge-${adhesion.cartes[0].statut}`]">
                  {{ formatCarteStatut(adhesion.cartes[0].statut) }}
                </span>
              </div>
              <div class="info-line-glass" v-if="adhesion.cartes[0].date_generation">
                <span class="info-label">Générée le</span>
                <span class="info-value">{{ formatDateTime(adhesion.cartes[0].date_generation) }}</span>
              </div>
            </div>
            <div class="document-actions-glass">
              <button @click="downloadCarte('pdf')" class="btn-download-glass">
                <span class="material-symbols-outlined">picture_as_pdf</span>
                PDF
              </button>
              <button @click="downloadCarte('png')" class="btn-download-glass">
                <span class="material-symbols-outlined">image</span>
                Image
              </button>
            </div>
          </div>
          
          <!-- Attestation de paiement -->
          <div class="glass-card document-card-glass">
            <div class="document-icon-wrapper">
              <span class="material-symbols-outlined document-icon-gradient">description</span>
            </div>
            <h3>Attestation de paiement</h3>
            <div class="document-info-glass">
              <div class="info-line-glass">
                <span class="info-label">Date</span>
                <span class="info-value">{{ formatDate(adhesion.date_adhesion) }}</span>
              </div>
              <div class="info-line-glass">
                <span class="info-label">Montant</span>
                <span class="info-value price-glass">{{ adhesion.tarif }} €</span>
              </div>
              <div class="info-line-glass">
                <span class="info-label">Paiement</span>
                <span class="info-value">{{ formatMoyenPaiement(adhesion.moyen_paiement) }}</span>
              </div>
              <div class="info-line-glass">
                <span class="info-label">Statut</span>
                <span :class="['badge-glass', `badge-${adhesion.statut}`]">
                  {{ formatStatut(adhesion.statut) }}
                </span>
              </div>
            </div>
            <div class="document-actions-glass">
              <button @click="generateAttestation" class="btn-download-glass btn-primary-gradient">
                <span class="material-symbols-outlined">download</span>
                Télécharger
              </button>
            </div>
          </div>
        </div>

        <!-- Informations complémentaires -->
        <div class="section-title-glass">
          <h2>
            <span class="material-symbols-outlined">info</span>
            Informations complémentaires
          </h2>
        </div>

        <div class="info-grid-glass">
          <div class="glass-card info-card-glass">
            <div class="info-card-header">
              <span class="material-symbols-outlined info-icon-gradient">link</span>
              <h3>HelloAsso</h3>
            </div>
            <div class="info-content-glass" v-if="adhesion.helloasso_id || adhesion.helloasso_campaign_id">
              <div class="info-item-glass" v-if="adhesion.helloasso_id">
                <span class="info-label">ID Adhésion</span>
                <code class="info-code">{{ adhesion.helloasso_id }}</code>
              </div>
              <div class="info-item-glass" v-if="adhesion.helloasso_campaign_id">
                <span class="info-label">ID Campagne</span>
                <code class="info-code">{{ adhesion.helloasso_campaign_id }}</code>
              </div>
            </div>
            <div v-else class="info-content-glass">
              <p class="no-data-glass">Aucune information HelloAsso</p>
            </div>
          </div>
          
          <div class="glass-card info-card-glass">
            <div class="info-card-header">
              <span class="material-symbols-outlined info-icon-gradient">history</span>
              <h3>Historique</h3>
            </div>
            <div class="info-content-glass">
              <div class="info-item-glass">
                <span class="info-label">Créée le</span>
                <span class="info-value">{{ formatDateTime(adhesion.created_at) }}</span>
              </div>
              <div class="info-item-glass" v-if="adhesion.updated_at">
                <span class="info-label">Modifiée le</span>
                <span class="info-value">{{ formatDateTime(adhesion.updated_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal d'édition -->
    <div v-if="showEditModal" class="modal-glass" @click.self="showEditModal = false">
      <div class="modal-content-glass modal-large">
        <div class="modal-header-glass">
          <h2>Modifier l'adhésion</h2>
          <button @click="closeEditModal" class="btn-close-glass">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <form @submit.prevent="saveAdhesion" class="modal-body-glass">
          <div class="form-group-glass">
            <label>Nom *</label>
            <input v-model="editForm.nom" type="text" required class="form-input-glass" />
          </div>
          <div class="form-group-glass">
            <label>Prénom *</label>
            <input v-model="editForm.prenom" type="text" required class="form-input-glass" />
          </div>
          <div class="form-group-glass">
            <label>Email</label>
            <input v-model="editForm.email" type="email" class="form-input-glass" />
          </div>
          <div class="form-group-glass">
            <label>Téléphone</label>
            <input v-model="editForm.telephone" type="tel" class="form-input-glass" />
          </div>
          <div class="form-group-glass">
            <label>Date d'adhésion *</label>
            <input v-model="editForm.date_adhesion" type="date" required class="form-input-glass" />
          </div>
          <div class="form-group-glass">
            <label>Tarif (€) *</label>
            <input v-model.number="editForm.tarif" type="number" step="0.01" min="0" required class="form-input-glass" />
          </div>
          <div class="form-group-glass">
            <label>Moyen de paiement</label>
            <select v-model="editForm.moyen_paiement" class="form-input-glass">
              <option value="helloasso">HelloAsso</option>
              <option value="especes">Espèces</option>
              <option value="cheque">Chèque</option>
              <option value="cb">Carte bancaire</option>
              <option value="virement">Virement</option>
            </select>
          </div>
          <div class="form-group-glass">
            <label>Statut</label>
            <select v-model="editForm.statut" class="form-input-glass">
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
              <option value="suspendu">Suspendu</option>
              <option value="banni">Banni</option>
              <option value="expire">Expiré</option>
              <option value="renouvele">Renouvelé</option>
              <option value="a_generer">À générer</option>
            </select>
          </div>
          
          <!-- Upload d'image -->
          <div class="form-group-glass">
            <label>Photo</label>
            <div class="photo-upload-section-glass">
              <div class="photo-preview-glass" v-if="photoPreview || (editForm.photo_url && !selectedPhotoFile)">
                <img
                  :src="photoPreview || getImageUrl(editForm.photo_url)"
                  alt="Preview"
                  @error="photoPreview = null"
                />
                <button type="button" @click="removePhoto" class="btn-remove-photo-glass">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
              <div class="photo-upload-controls-glass">
                <input
                  ref="photoInputRef"
                  type="file"
                  accept="image/*"
                  @change="handlePhotoFileSelect"
                  style="display: none"
                />
                <button type="button" @click="triggerPhotoUpload" class="btn-upload-photo-glass">
                  <span class="material-symbols-outlined">upload</span>
                  {{ photoPreview || editForm.photo_url ? 'Changer la photo' : 'Ajouter une photo' }}
                </button>
                <div class="photo-url-input-glass">
                  <input
                    v-model="photoUrlInput"
                    type="text"
                    placeholder="Ou coller une URL d'image"
                    @blur="handlePhotoUrlChange"
                    class="form-input-glass"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="modal-actions-glass">
            <button type="button" @click="closeEditModal" class="btn-cancel-glass">Annuler</button>
            <button type="submit" :disabled="saving" class="btn-submit-glass">
              {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <div v-if="showDeleteModal" class="modal-glass" @click.self="showDeleteModal = false">
      <div class="modal-content-glass">
        <h2>Confirmer la suppression</h2>
        <p>Êtes-vous sûr de vouloir supprimer l'adhésion de <strong>{{ adhesion?.nom }} {{ adhesion?.prenom }}</strong> ?</p>
        <p class="warning-glass">Cette action est irréversible et supprimera également toutes les cartes associées.</p>
        <div class="modal-actions-glass">
          <button @click="deleteAdhesion" :disabled="deleting" class="btn-danger-glass">
            {{ deleting ? 'Suppression...' : 'Supprimer' }}
          </button>
          <button @click="showDeleteModal = false" class="btn-cancel-glass">Annuler</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { adhesionsApi, cartesApi } from '@/services/api';
import { usePermissions } from '@/composables/usePermissions';
import { eventBus, EVENTS } from '@/utils/eventBus';

const { permissions } = usePermissions();

const router = useRouter();
const route = useRoute();
const adhesion = ref<any>(null);
const loading = ref(true);
const error = ref('');
const showDeleteModal = ref(false);
const deleting = ref(false);
const showEditModal = ref(false);
const saving = ref(false);
const photoInputRef = ref<HTMLInputElement | null>(null);
const photoPreview = ref<string | null>(null);
const selectedPhotoFile = ref<File | null>(null);
const photoUrlInput = ref('');

const editForm = ref({
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  date_adhesion: '',
  tarif: 0,
  moyen_paiement: 'helloasso',
  statut: 'actif',
  photo_url: '',
});

function formatDate(date: string) {
  if (!date) return 'Date invalide';
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return 'Date invalide';
  }
}

function formatDateTime(date: string) {
  if (!date) return 'Date invalide';
  try {
    return new Date(date).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Date invalide';
  }
}

function getImageUrl(photoUrl: string | null | undefined): string {
  if (!photoUrl) return '';
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  if (photoUrl.startsWith('/uploads/') || photoUrl.startsWith('uploads/')) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return photoUrl.startsWith('/uploads/') ? `${apiUrl}${photoUrl}` : `${apiUrl}/${photoUrl}`;
  }
  if (photoUrl.startsWith('data:') || photoUrl.startsWith('blob:')) {
    return photoUrl;
  }
  return photoUrl;
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}

function formatMoyenPaiement(moyen: string) {
  const moyens: Record<string, string> = {
    helloasso: 'HelloAsso',
    especes: 'Espèces',
    cheque: 'Chèque',
    cb: 'Carte bancaire',
    virement: 'Virement'
  };
  return moyens[moyen] || moyen;
}

function getPaymentIcon(moyen: string): string {
  const icons: Record<string, string> = {
    helloasso: 'language',
    especes: 'monetization_on',
    cheque: 'description',
    cb: 'credit_card',
    virement: 'account_balance',
  };
  return icons[moyen] || 'payments';
}

function formatStatut(statut: string) {
  const statuts: Record<string, string> = {
    actif: 'Actif',
    expire: 'Expiré',
    renouvele: 'Renouvelé',
    a_generer: 'À générer',
  };
  return statuts[statut] || statut;
}

function getStatutIcon(statut: string): string {
  const icons: Record<string, string> = {
    actif: 'check_circle',
    expire: 'cancel',
    renouvele: 'refresh',
    a_generer: 'pending',
  };
  return icons[statut] || 'help';
}

function formatCarteStatut(statut: string) {
  const statuts: Record<string, string> = {
    a_generer: 'À générer',
    generee: 'Générée',
    a_remettre: 'À remettre',
    remise: 'Remise',
  };
  return statuts[statut] || statut;
}

function goBack() {
  router.push('/app/adhesions');
}

function editAdhesion() {
  if (!adhesion.value) return;
  
  // Initialiser le formulaire avec les données actuelles
  editForm.value = {
    nom: adhesion.value.nom || '',
    prenom: adhesion.value.prenom || '',
    email: adhesion.value.email || '',
    telephone: adhesion.value.telephone || '',
    date_adhesion: adhesion.value.date_adhesion ? new Date(adhesion.value.date_adhesion).toISOString().split('T')[0] : '',
    tarif: adhesion.value.tarif || 0,
    moyen_paiement: adhesion.value.moyen_paiement || 'helloasso',
    statut: adhesion.value.statut || 'actif',
    photo_url: adhesion.value.photo_url || '',
  };
  
  photoUrlInput.value = adhesion.value.photo_url || '';
  photoPreview.value = adhesion.value.photo_url ? getImageUrl(adhesion.value.photo_url) : null;
  selectedPhotoFile.value = null;
  
  showEditModal.value = true;
}

function closeEditModal() {
  showEditModal.value = false;
  photoPreview.value = null;
  selectedPhotoFile.value = null;
  photoUrlInput.value = '';
}

function triggerPhotoUpload() {
  photoInputRef.value?.click();
}

function handlePhotoFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  
  selectedPhotoFile.value = file;
  photoUrlInput.value = '';
  
  const reader = new FileReader();
  reader.onload = (e) => {
    photoPreview.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}

function handlePhotoUrlChange() {
  if (photoUrlInput.value && photoUrlInput.value.trim() !== '') {
    selectedPhotoFile.value = null;
    editForm.value.photo_url = photoUrlInput.value.trim();
    photoPreview.value = photoUrlInput.value.trim();
  } else if (!selectedPhotoFile.value) {
    photoPreview.value = null;
    editForm.value.photo_url = '';
  }
}

function removePhoto() {
  photoPreview.value = null;
  selectedPhotoFile.value = null;
  photoUrlInput.value = '';
  editForm.value.photo_url = '';
  if (photoInputRef.value) {
    photoInputRef.value.value = '';
  }
}

async function saveAdhesion() {
  if (!adhesion.value) return;
  
  saving.value = true;
  try {
    const formDataToSend = new FormData();
    
    // Ajouter tous les champs sauf photo_url si on a un fichier
    Object.keys(editForm.value).forEach(key => {
      const value = (editForm.value as any)[key];
      // Ne pas envoyer photo_url si on upload un fichier
      if (key === 'photo_url' && selectedPhotoFile.value) {
        return;
      }
      // Envoyer photo_url seulement si c'est une URL (pas de fichier)
      if (key === 'photo_url' && !selectedPhotoFile.value && value) {
        formDataToSend.append(key, value);
        return;
      }
      // Envoyer tous les autres champs
      if (key !== 'photo_url') {
        if (value !== null && value !== undefined) {
          formDataToSend.append(key, value.toString());
        }
      }
    });
    
    // Ajouter le fichier photo si présent
    if (selectedPhotoFile.value) {
      formDataToSend.append('photo', selectedPhotoFile.value);
    } else if (photoUrlInput.value && !selectedPhotoFile.value) {
      // Si on a une URL mais pas de fichier, envoyer l'URL
      formDataToSend.append('photo_url', photoUrlInput.value);
    }
    
    await adhesionsApi.update(adhesion.value.id, formDataToSend);
    alert('Adhésion modifiée avec succès !');
    closeEditModal();
    await loadAdhesion(); // Recharger les données
    
    // Notifier les autres vues de la mise à jour
    eventBus.emit(EVENTS.ADHESION_UPDATED, {
      id: adhesion.value.id,
      photo_url: selectedPhotoFile.value ? 'updated' : editForm.value.photo_url
    });
  } catch (error: any) {
    console.error('Erreur lors de la sauvegarde:', error);
    alert(error.response?.data?.error || 'Erreur lors de la modification');
  } finally {
    saving.value = false;
  }
}

function confirmDelete() {
  showDeleteModal.value = true;
}

async function deleteAdhesion() {
  if (!adhesion.value) return;
  
  deleting.value = true;
  try {
    const adhesionId = adhesion.value.id;
    await adhesionsApi.delete(adhesionId);
    
    // Notifier les autres vues de la suppression
    eventBus.emit(EVENTS.ADHESION_DELETED, { id: adhesionId });
    
    router.push('/app/adhesions');
  } catch (error: any) {
    console.error('Erreur lors de la suppression:', error);
    alert(error.response?.data?.error || 'Erreur lors de la suppression');
  } finally {
    deleting.value = false;
    showDeleteModal.value = false;
  }
}

async function generateAttestation() {
  if (!adhesion.value) return;
  
  try {
    const response = await adhesionsApi.generateAttestation(adhesion.value.id);
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attestation_paiement_${adhesion.value.id}_${adhesion.value.nom}_${adhesion.value.prenom}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error('Erreur lors de la génération de l\'attestation:', error);
    alert(error.response?.data?.error || 'Erreur lors de la génération de l\'attestation de paiement');
  }
}

async function downloadCarte(format: 'pdf' | 'png') {
  if (!adhesion.value || !adhesion.value.cartes || adhesion.value.cartes.length === 0) return;
  
  try {
    const carteId = adhesion.value.cartes[0].id;
    const response = await cartesApi.download(carteId, format);
    const blob = new Blob([response.data], { 
      type: format === 'pdf' ? 'application/pdf' : 'image/png' 
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carte_${adhesion.value.cartes[0].numero_carte}.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error('Erreur lors du téléchargement de la carte:', error);
    alert(error.response?.data?.error || 'Erreur lors du téléchargement de la carte');
  }
}

async function loadAdhesion() {
  loading.value = true;
  error.value = '';
  try {
    const id = parseInt(route.params.id as string);
    const response = await adhesionsApi.get(id);
    adhesion.value = response.data.data || response.data;
  } catch (err: any) {
    console.error('Erreur lors du chargement:', err);
    error.value = err.response?.data?.error || 'Erreur lors du chargement de l\'adhésion';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadAdhesion();
});
</script>

<style scoped>
.adhesion-detail-glass {
  min-height: 100vh;
  position: relative;
  padding: 30px;
}

/* Background gradient - Minimaliste */
.background-gradient {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-page);
  z-index: 0;
}

.detail-container {
  position: relative;
  z-index: 1;
  width: 100%;
  margin: 0;
}

/* Cartes minimalistes */
.glass-card {
  background: var(--bg-primary);
  border-radius: 0;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-xl);
  transition: all var(--transition-base);
  margin-bottom: var(--spacing-xl);
}

.glass-card:hover {
  background: var(--bg-secondary);
}

/* Header */
.page-header-glass {
  background: var(--bg-primary);
  border-radius: 0;
  border: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  box-shadow: none;
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
}

.btn-back-glass {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-base);
  font-family: var(--font-body);
  font-weight: var(--font-weight-medium);
}

.btn-back-glass:hover {
  background: var(--bg-secondary);
  border-color: var(--color-black);
}

.header-title h1 {
  margin: 0;
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  font-family: var(--font-display);
}

.breadcrumb {
  margin: var(--spacing-xs) 0 0 0;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.header-actions-glass {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-action-glass {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-action-glass:hover {
  background: var(--bg-secondary);
  border-color: var(--color-black);
  color: var(--color-black);
}

.btn-action-glass.btn-primary-glass {
  background: var(--color-black);
  color: var(--text-inverse);
  border: none;
}

.btn-action-glass.btn-primary-glass:hover {
  background: var(--color-black-light);
  box-shadow: var(--shadow-md);
}

.btn-action-glass.btn-danger-glass {
  color: var(--color-red);
  border-color: var(--color-red);
}

.btn-action-glass.btn-danger-glass:hover {
  background: var(--color-red-pastel);
  border-color: var(--color-red);
  color: var(--color-red);
}

/* Loading */
.loading-container-glass {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
  gap: 20px;
}

.spinner-glass {
  width: 50px;
  height: 50px;
  border: 4px solid var(--border);
  border-top: 4px solid var(--color-black);
  border-radius: var(--radius-full);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-glass {
  text-align: center;
  padding: var(--spacing-4xl);
  background: var(--color-red-pastel);
  color: var(--color-red);
  border-radius: 0;
  border: 1px solid var(--color-red);
}

/* Carte d'identité */
.identity-card-glass {
  margin-bottom: 30px;
  padding: 40px;
}

.card-header-glass {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
  gap: var(--spacing-lg);
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.logo-circle-glass {
  width: 70px;
  height: 70px;
  border-radius: 0;
  background: var(--color-black);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: none;
}

.logo-circle-glass .material-symbols-outlined {
  font-size: 36px;
  color: var(--text-inverse);
}

.logo-text-glass h2 {
  margin: 0;
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  font-family: var(--font-display);
}

.logo-text-glass p {
  margin: var(--spacing-xs) 0 0 0;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.badges-header {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.badge-glass {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-glass .material-symbols-outlined {
  font-size: 16px;
}

.badge-glass.badge-actif {
  background: var(--color-green);
  color: var(--text-inverse);
  border-color: var(--color-green);
}

.badge-glass.badge-expire {
  background: var(--color-red);
  color: var(--text-inverse);
  border-color: var(--color-red);
}

.badge-glass.badge-renouvele {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-color: var(--border);
}

.badge-glass.badge-online {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-color: var(--border);
}

.badge-glass.badge-offline {
  background: var(--color-yellow);
  color: var(--text-primary);
  border-color: var(--color-yellow);
}

.card-body-glass {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 40px;
  align-items: start;
}

.photo-section-glass {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.photo-frame-glass {
  width: 180px;
  height: 240px;
  border-radius: 0;
  overflow: hidden;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-frame-glass img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder-glass {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.photo-placeholder-glass .material-symbols-outlined {
  font-size: 64px;
}

.photo-badge-glass {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-green-pastel);
  border-radius: 0;
  font-size: var(--font-size-xs);
  color: var(--color-green);
  border: 1px solid var(--color-green);
  font-weight: var(--font-weight-medium);
}

.info-section-glass {
  flex: 1;
}

.name-section {
  margin-bottom: 30px;
}

.name-glass {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-primary);
  font-family: var(--font-display);
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.id-badge-glass {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: 0;
  border: 1px solid var(--border);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.details-grid-glass {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-item-glass {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-primary);
  border-radius: 0;
  border: 1px solid var(--border);
  transition: all var(--transition-base);
}

.detail-item-glass:hover {
  background: var(--bg-secondary);
}

.detail-icon-glass {
  width: 40px;
  height: 40px;
  border-radius: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.detail-icon-glass .material-symbols-outlined {
  font-size: 22px;
  color: var(--text-primary);
}

.detail-content-glass {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  color: var(--text-secondary);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.05em;
}

.detail-value {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.detail-value.price-glass {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-green);
}

.detail-value a {
  color: var(--color-black);
  text-decoration: none;
  transition: all var(--transition-base);
}

.detail-value a:hover {
  color: var(--text-secondary);
  text-decoration: underline;
}

.card-footer-glass {
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.footer-item-glass {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.footer-item-glass .material-symbols-outlined {
  font-size: 18px;
}

/* Section Documents */
.section-title-glass {
  margin: 40px 0 20px 0;
}

.section-title-glass h2 {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin: 0;
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  font-family: var(--font-display);
}

.section-title-glass .material-symbols-outlined {
  color: var(--text-primary);
}

.documents-grid-glass {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 25px;
  margin-bottom: 40px;
}

.document-card-glass {
  text-align: center;
  padding: 30px;
}

.document-icon-wrapper {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--spacing-lg);
  border-radius: 0;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
}

.document-icon-gradient {
  font-size: 40px;
  color: var(--text-primary);
}

.document-card-glass h3 {
  margin: 0 0 var(--spacing-lg) 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  font-family: var(--font-display);
}

.document-info-glass {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 25px;
  text-align: left;
}

.info-line-glass {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.info-line-glass:last-child {
  border-bottom: none;
}

.info-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}

.info-value {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  font-weight: var(--font-weight-semibold);
}

.info-value.price-glass {
  color: var(--color-green);
  font-size: var(--font-size-base);
}

.document-actions-glass {
  display: flex;
  gap: 10px;
}

.btn-download-glass {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  transition: all var(--transition-base);
}

.btn-download-glass:hover {
  background: var(--bg-secondary);
  border-color: var(--color-black);
  color: var(--color-black);
}

.btn-download-glass.btn-primary-gradient {
  background: var(--color-black);
  color: var(--text-inverse);
  border: none;
}

.btn-download-glass.btn-primary-gradient:hover {
  background: var(--color-black-light);
  box-shadow: var(--shadow-md);
}

.btn-download-glass .material-symbols-outlined {
  font-size: 18px;
}

/* Informations complémentaires */
.info-grid-glass {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 25px;
}

.info-card-glass {
  padding: 25px;
}

.info-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border);
}

.info-icon-gradient {
  font-size: 28px;
  color: var(--text-primary);
}

.info-card-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  font-family: var(--font-display);
}

.info-content-glass {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.info-item-glass {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) 0;
  border-bottom: 1px solid var(--border);
}

.info-item-glass:last-child {
  border-bottom: none;
}

.info-item-glass .info-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}

.info-item-glass .info-value {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  font-weight: var(--font-weight-semibold);
}

.info-code {
  background: var(--bg-secondary);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: 0;
  font-family: 'Courier New', monospace;
  font-size: var(--font-size-xs);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.no-data-glass {
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
  text-align: center;
  padding: var(--spacing-xl);
}

/* Modal */
.modal-glass {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: var(--z-modal-backdrop);
  padding: var(--spacing-xl);
}

.modal-content-glass {
  background: var(--bg-primary);
  border-radius: 0;
  padding: var(--spacing-xl);
  max-width: 500px;
  width: 100%;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  position: relative;
  z-index: var(--z-modal);
}

.modal-content-glass h2 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-primary);
  font-size: var(--font-size-2xl);
  font-family: var(--font-display);
  font-weight: var(--font-weight-bold);
}

.modal-content-glass .warning-glass {
  color: var(--color-red);
  font-weight: var(--font-weight-medium);
  margin: var(--spacing-md) 0;
}

.modal-actions-glass {
  display: flex;
  gap: 12px;
  margin-top: 25px;
  justify-content: flex-end;
}

.btn-cancel-glass {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-base);
}

.btn-cancel-glass:hover {
  background: var(--bg-secondary);
  border-color: var(--color-black);
}

.btn-danger-glass {
  background: var(--color-red);
  color: var(--text-inverse);
  border: none;
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-base);
}

.btn-danger-glass:hover {
  background: var(--color-red-light);
  box-shadow: var(--shadow-md);
}

/* Modal d'édition */
.modal-large {
  max-width: 700px;
  width: 90%;
}

.modal-header-glass {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--border);
}

.modal-header-glass h2 {
  margin: 0;
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  font-family: var(--font-display);
}

.btn-close-glass {
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
}

.btn-close-glass:hover {
  background: var(--bg-secondary);
  border-color: var(--color-black);
  color: var(--color-black);
}

.modal-body-glass {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form-group-glass {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-group-glass label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.form-input-glass {
  padding: var(--spacing-md);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-family: var(--font-body);
  color: var(--text-primary);
  background: var(--bg-primary);
  transition: all var(--transition-base);
}

.form-input-glass:focus {
  outline: none;
  border-color: var(--color-black);
  box-shadow: 0 0 0 3px var(--color-black-pastel);
}

/* Upload photo */
.photo-upload-section-glass {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.photo-preview-glass {
  position: relative;
  width: 200px;
  height: 250px;
  border: 1px solid var(--border);
  border-radius: 0;
  overflow: hidden;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-preview-glass img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.btn-remove-photo-glass {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  width: 32px;
  height: 32px;
  background: var(--color-black);
  border: none;
  border-radius: var(--radius-full);
  color: var(--text-inverse);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
}

.btn-remove-photo-glass:hover {
  background: var(--color-red);
}

.photo-upload-controls-glass {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.btn-upload-photo-glass {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-base);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.btn-upload-photo-glass:hover {
  background: var(--bg-secondary);
  border-color: var(--color-black);
}

.photo-url-input-glass {
  width: 100%;
}

.btn-submit-glass {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-black);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-base);
  font-family: var(--font-display);
}

.btn-submit-glass:hover:not(:disabled) {
  background: var(--color-black-light);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-submit-glass:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .adhesion-detail-glass {
    padding: 15px;
  }
  
  .card-body-glass {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  
  .photo-frame-glass {
    width: 150px;
    height: 200px;
  }
  
  .name-glass {
    font-size: 28px;
  }
  
  .documents-grid-glass {
    grid-template-columns: 1fr;
  }
  
  .info-grid-glass {
    grid-template-columns: 1fr;
  }
  
  .page-header-glass {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-actions-glass {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
