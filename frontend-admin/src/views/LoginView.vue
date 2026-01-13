<template>
  <div class="login-container">
    <div class="login-box">
      <h1>IGCA Paris</h1>
      <h2>Connexion</h2>
      <form @submit.prevent="handleSubmit">
        <div v-if="error" class="error">{{ error }}</div>
        <div class="form-group">
          <label>Email</label>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            placeholder="admin@igca.paris"
          />
        </div>
        <div class="form-group">
          <label>Mot de passe</label>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            placeholder="••••••••"
          />
        </div>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Connexion...' : 'Se connecter' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleSubmit() {
  error.value = '';
  loading.value = true;

  try {
    console.group('🔐 CONNEXION');
    console.log('📧 Email:', email.value);
    console.log('⏳ Début de la connexion...');
    
    const success = await authStore.login(email.value, password.value);
    
    console.log('✅ Login réussi:', success);
    console.log('📊 État auth après login:', { 
      isAuthenticated: authStore.isAuthenticated, 
      hasToken: !!authStore.token,
      tokenLength: authStore.token?.length || 0,
      hasUser: !!authStore.user,
      userRole: authStore.user?.role
    });
    
    if (success) {
      // Attendre un peu pour que le store soit complètement mis à jour
      console.log('⏳ Attente de la mise à jour du store...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Vérifier que l'authentification est bien active
      if (authStore.isAuthenticated && authStore.token && authStore.user) {
        console.log('✅ Authentification complète, redirection...');
        console.log('🚀 Redirection vers /app/dashboard');
        
        // Utiliser replace pour éviter de garder /login dans l'historique
        router.replace('/app/dashboard').then(() => {
          console.log('✅ Redirection effectuée avec succès');
          console.groupEnd();
        }).catch((err) => {
          console.error('❌ Erreur lors de la redirection:', err);
          console.groupEnd();
        });
      } else {
        console.error('❌ Authentification incomplète:', {
          isAuthenticated: authStore.isAuthenticated,
          token: !!authStore.token,
          user: !!authStore.user
        });
        console.groupEnd();
        throw new Error('Authentification échouée - données manquantes');
      }
    } else {
      console.error('❌ La connexion a échoué');
      console.groupEnd();
      throw new Error('La connexion a échoué');
    }
  } catch (err: any) {
    console.error('❌ Erreur de connexion:', err);
    console.groupEnd();
    
    // Afficher un message d'erreur plus clair
    if (err.userMessage) {
      error.value = err.userMessage;
    } else if (err.response?.data?.error) {
      error.value = err.response.data.error;
    } else if (err.message) {
      error.value = err.message;
    } else if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
      error.value = 'Le serveur backend n\'est pas accessible. Vérifiez qu\'il est démarré sur le port 3001.';
    } else {
      error.value = 'Erreur de connexion. Vérifiez que le backend est démarré.';
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
}

.login-box h1 {
  text-align: center;
  margin-bottom: 10px;
  color: #2c3e50;
  font-size: 32px;
}

.login-box h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #7f8c8d;
  font-size: 18px;
  font-weight: normal;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #2c3e50;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

button {
  width: 100%;
  padding: 12px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background-color: #5568d3;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  background-color: #fee;
  color: #c33;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 20px;
  text-align: center;
}
</style>

