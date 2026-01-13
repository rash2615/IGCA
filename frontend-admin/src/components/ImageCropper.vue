<template>
  <Teleport to="body">
    <div class="image-cropper-modal" v-if="show" @click.self="close">
    <div class="cropper-container">
      <div class="cropper-header">
        <h3>Rogner la photo</h3>
        <button @click="close" class="btn-close"><span class="material-symbols-outlined">close</span></button>
      </div>
      
      <div class="cropper-content">
        <div v-if="isLoadingImage" class="loading-indicator">
          <p>Chargement de l'image...</p>
        </div>
        <div v-else-if="detecting" class="loading-indicator">
          <p>Détection du visage...</p>
        </div>
        <div v-else-if="proxiedImageSrc && proxiedImageSrc.trim() !== ''" class="image-preview">
          <img 
            ref="imageRef" 
            :src="proxiedImageSrc" 
            alt="Photo à rogner"
            @load="onImageLoad"
            @error="onImageError"
            style="max-width: 100%; max-height: 400px; display: block; margin: 0 auto; border-radius: 8px;"
          />
          <div v-if="cropApplied" class="crop-info">
            <p><span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 5px;">check_circle</span> Zone de rognage détectée automatiquement (Ratio 7:9 portrait)</p>
          </div>
        </div>
        <div v-else class="no-image">
          <p v-if="props.imageSrc">Chargement de l'image en cours...</p>
          <p v-else>Aucune image fournie</p>
        </div>
      </div>
      
      <div class="cropper-footer">
        <button @click="close" class="btn-cancel">Annuler</button>
        <button @click="applyCrop" :disabled="!cropApplied" class="btn-apply" type="button">
          <span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 5px;">check</span> Appliquer le rognage
        </button>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{
  show: boolean;
  imageSrc: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'cropped', dataUrl: string): void;
}>();

// Charger l'image via le proxy et la convertir en blob pour éviter les problèmes CORS
const proxiedImageSrc = ref<string>('');
const isLoadingImage = ref(false);
const detecting = ref(false);
const cropApplied = ref(false);
const imageRef = ref<HTMLImageElement | null>(null);

// Ratio fixe pour les photos (7:9 portrait)
const CROP_RATIO_WIDTH = 7;
const CROP_RATIO_HEIGHT = 9;
const CROP_RATIO = CROP_RATIO_WIDTH / CROP_RATIO_HEIGHT; // ≈ 0.778 (portrait)

// Nettoyer les blobs précédents
let currentBlobUrl: string | null = null;

async function loadImageViaProxy(url: string): Promise<string> {
  if (!url || url.trim() === '') {
    return '';
  }
  
  // Si c'est déjà un data URL ou blob, retourner tel quel
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  
  // Si c'est une URL locale (uploads), construire l'URL complète
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const fullUrl = url.startsWith('/uploads/') ? `${apiUrl}${url}` : `${apiUrl}/${url}`;
    return fullUrl;
  }
  
  // Si c'est déjà une URL complète avec localhost, retourner tel quel
  if (url.includes('localhost:3001') || url.includes('127.0.0.1:3001')) {
    return url;
  }
  
  // Si c'est une URL externe, utiliser le proxy backend
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname !== 'localhost' && urlObj.hostname !== '127.0.0.1') {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const proxyUrl = `${apiUrl}/api/images/proxy?url=${encodeURIComponent(url)}`;
      
      isLoadingImage.value = true;
      try {
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          // Si le proxy échoue (401, etc.), retourner l'URL originale pour l'affichage
          isLoadingImage.value = false;
          return url;
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        isLoadingImage.value = false;
        return blobUrl;
      } catch (fetchError: any) {
        // Erreur réseau ou autre, retourner l'URL originale
        isLoadingImage.value = false;
        return url;
      }
    }
  } catch (e: any) {
    isLoadingImage.value = false;
    return url;
  }
  
  return url;
}

// Charger l'image quand imageSrc change
watch(() => props.imageSrc, async (newUrl) => {
  cropApplied.value = false;
  
  // Nettoyer le blob précédent
  if (currentBlobUrl && currentBlobUrl.startsWith('blob:')) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
  
  if (newUrl && newUrl.trim() !== '') {
    try {
      const loadedUrl = await loadImageViaProxy(newUrl);
      proxiedImageSrc.value = loadedUrl;
      if (loadedUrl.startsWith('blob:')) {
        currentBlobUrl = loadedUrl;
      }
    } catch (error: any) {
      proxiedImageSrc.value = newUrl;
    }
  } else {
    proxiedImageSrc.value = '';
  }
}, { immediate: true });

function close() {
  if (currentBlobUrl && currentBlobUrl.startsWith('blob:')) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
  cropApplied.value = false;
  emit('close');
}

function onImageLoad() {
  // Détecter automatiquement le visage et appliquer le crop
  nextTick(() => {
    if (imageRef.value) {
      detectAndApplyCrop();
    }
  });
}

function onImageError(e: Event) {
  console.error('❌ Erreur de chargement de l\'image:', e);
  if (props.imageSrc && !props.imageSrc.startsWith('data:') && !props.imageSrc.startsWith('blob:')) {
    proxiedImageSrc.value = props.imageSrc;
  }
}

async function detectAndApplyCrop() {
  if (!imageRef.value) return;
  
  detecting.value = true;
  
  try {
    const img = imageRef.value;
    await new Promise((resolve) => {
      if (img.complete) {
        resolve(null);
      } else {
        img.onload = () => resolve(null);
      }
    });
    
    // Détection simple : centrer le crop sur l'image avec ratio 7:9
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    
    // Créer une zone avec ratio 7:9 (portrait) centrée
    const maxWidth = imgWidth * 0.8;
    const maxHeight = imgHeight * 0.8;
    
    // Calculer les dimensions en respectant le ratio 7:9 (portrait)
    let cropHeight = Math.min(maxHeight, maxWidth / CROP_RATIO);
    let cropWidth = cropHeight * CROP_RATIO;
    
    if (cropWidth > maxWidth) {
      cropWidth = maxWidth;
      cropHeight = cropWidth / CROP_RATIO;
    }
    
    const sourceX = (imgWidth - cropWidth) / 2;
    const sourceY = (imgHeight - cropHeight) / 2;
    
    // Stocker les coordonnées pour le crop
    (img as any).cropData = {
      x: sourceX,
      y: sourceY,
      width: cropWidth,
      height: cropHeight,
    };
    
    cropApplied.value = true;
  } catch (error) {
    console.error('Erreur lors de la détection:', error);
  } finally {
    detecting.value = false;
  }
}

async function applyCrop() {
  if (!imageRef.value || !cropApplied.value) {
    return;
  }
  
  const img = imageRef.value;
  const cropData = (img as any).cropData;
  
  if (!cropData) {
    alert('Aucune zone de rognage détectée');
    return;
  }
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    alert('Erreur lors de la création du canvas');
    return;
  }
  
  canvas.width = Math.round(cropData.width);
  canvas.height = Math.round(cropData.height);
  
  // Fond blanc
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  try {
    // Essayer de dessiner directement
    ctx.drawImage(
      img,
      Math.round(cropData.x),
      Math.round(cropData.y),
      Math.round(cropData.width),
      Math.round(cropData.height),
      0,
      0,
      canvas.width,
      canvas.height
    );
    
    // Exporter le canvas
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    emit('cropped', dataUrl);
    close();
  } catch (corsError: any) {
    // Si erreur CORS, charger via proxy
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const proxyUrl = `${apiUrl}/api/images/proxy?url=${encodeURIComponent(props.imageSrc)}`;
    
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      tempImg.onload = () => {
        try {
          ctx.drawImage(
            tempImg,
            Math.round(cropData.x),
            Math.round(cropData.y),
            Math.round(cropData.width),
            Math.round(cropData.height),
            0,
            0,
            canvas.width,
            canvas.height
          );
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          emit('cropped', dataUrl);
          close();
          resolve(null);
        } catch (drawError) {
          reject(drawError);
        }
      };
      tempImg.onerror = () => reject(new Error('Erreur de chargement via proxy'));
      tempImg.src = proxyUrl;
    });
  }
}
</script>

<style scoped>
.image-cropper-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.cropper-container {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cropper-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.cropper-header h3 {
  margin: 0;
  color: #2c3e50;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  color: #000;
}

.cropper-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #666;
}

.loading-indicator p {
  margin: 0;
  font-size: 16px;
}

.image-preview {
  width: 100%;
  text-align: center;
}

.crop-info {
  margin-top: 15px;
  color: #10b981;
  font-size: 14px;
}

.crop-info p {
  margin: 0;
}

.no-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #999;
  padding: 20px;
}

.no-image p {
  margin: 5px 0;
  font-size: 14px;
}

.cropper-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #eee;
}

.btn-cancel,
.btn-apply {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-apply {
  background: #10b981;
  color: white;
}

.btn-apply:hover:not(:disabled) {
  background: #059669;
}

.btn-apply:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}
</style>
