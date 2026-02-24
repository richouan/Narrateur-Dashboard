<template>
  <div class="profile-page">
    <div class="profile-header">
      <h1>Mon Profil</h1>
      <p class="subtitle">Gérez vos informations personnelles</p>
    </div>

    <div class="profile-content">
      <!-- User Info Card -->
      <div class="info-card">
        <h2>Informations</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Nom d'utilisateur</span>
            <span class="info-value">{{ authStore.user?.username }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Rôle</span>
            <span class="info-value">
              <span v-if="authStore.isOwner" class="badge badge-owner">🌙 Propriétaire</span>
              <span v-else-if="authStore.isAdmin" class="badge badge-admin">👑 Admin</span>
              <span v-else class="badge badge-narrateur">🎭 Narrateur</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Change Password Card -->
      <div class="password-card">
        <h2>Changer le mot de passe</h2>
        
        <Transition name="slide-up">
          <div v-if="successMessage" class="success-message">
            <span class="success-icon">✓</span>
            {{ successMessage }}
          </div>
        </Transition>

        <Transition name="slide-up">
          <div v-if="errorMessage" class="error-message">
            <span class="error-icon">✕</span>
            {{ errorMessage }}
          </div>
        </Transition>

        <form @submit.prevent="changePassword" class="password-form">
          <div class="form-group">
            <label>Mot de passe actuel</label>
            <div class="input-wrapper">
              <span class="input-icon">🔒</span>
              <input
                v-model="currentPassword"
                type="password"
                class="input"
                placeholder="Entrez votre mot de passe actuel..."
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label>Nouveau mot de passe</label>
            <div class="input-wrapper">
              <span class="input-icon">🔑</span>
              <input
                v-model="newPassword"
                type="password"
                class="input"
                placeholder="Entrez votre nouveau mot de passe..."
                required
                minlength="6"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Confirmer le nouveau mot de passe</label>
            <div class="input-wrapper">
              <span class="input-icon">🔑</span>
              <input
                v-model="confirmPassword"
                type="password"
                class="input"
                placeholder="Confirmez votre nouveau mot de passe..."
                required
                minlength="6"
              />
            </div>
          </div>

          <button type="submit" class="btn-primary" :disabled="loading">
            <span v-if="loading" class="spinner" />
            {{ loading ? 'Modification...' : 'Changer le mot de passe' }}
          </button>
        </form>
      </div>

      <!-- Selfbot Settings — only visible to the bot target -->
      <div v-if="authStore.user?.isBotTarget" class="bot-card">
        <div class="bot-card-header">
          <h2>🤖 Selfbot</h2>
          <span v-if="botSaving" class="bot-saving">
            <span class="spinner-sm" />
            Saving...
          </span>
        </div>

        <div v-if="botLoading" class="bot-loading">Chargement...</div>
        <div v-else-if="botSettings" class="bot-settings">
          <div v-for="t in toggleSettings" :key="t.key" class="setting-row">
            <div class="setting-info">
              <span class="setting-label">{{ t.label }}</span>
              <span class="setting-desc">{{ t.desc }}</span>
            </div>
            <button
              class="toggle"
              :class="{ on: botSettings[t.key] }"
              @click="updateBotSetting(t.key, !botSettings[t.key])"
              :disabled="botSaving"
            ><span class="knob" /></button>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Defend Mode</span>
              <span class="setting-desc">Répondre quand quelqu'un mentionne la cible</span>
            </div>
            <div class="defend-group">
              <button
                v-for="o in defendOptions" :key="o.value"
                class="defend-opt"
                :class="{ active: botSettings.defendMode === o.value }"
                @click="updateBotSetting('defendMode', o.value)"
                :disabled="botSaving"
              >{{ o.label }}</button>
            </div>
          </div>
        </div>
        <div v-else class="bot-err">Impossible de charger les paramètres.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'game' })

const authStore = useAuthStore()

// ─── Change Password ─────────────────────────────────────
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

async function changePassword() {
  errorMessage.value = ''
  successMessage.value = ''

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Les mots de passe ne correspondent pas'
    return
  }
  if (newPassword.value.length < 6) {
    errorMessage.value = 'Le mot de passe doit contenir au moins 6 caractères'
    return
  }

  loading.value = true
  try {
    await $fetch('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword: currentPassword.value, newPassword: newPassword.value },
    })
    successMessage.value = 'Mot de passe modifié avec succès !'
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    setTimeout(() => { successMessage.value = '' }, 5000)
  } catch (error: any) {
    errorMessage.value = error.data?.statusMessage || 'Erreur lors de la modification du mot de passe'
  } finally {
    loading.value = false
  }
}

// ─── Bot Settings (only for isBotTarget users) ───────────
const botSettings = ref<Record<string, any> | null>(null)
const botLoading = ref(false)
const botSaving = ref(false)

const toggleSettings = [
  { key: 'selfReactEnabled', label: 'Auto React',      desc: 'Réagir automatiquement aux messages de la cible' },
  { key: 'vcFollow',         label: 'VC Follow',        desc: 'Suivre la cible dans les salons vocaux' },
  { key: 'vcSadReact',       label: 'Sad React 🥺',    desc: 'Envoyer 🥺 quand expulsé du VC' },
  { key: 'crossGuildLeave',  label: 'Cross-Guild Leave', desc: 'Quitter le VC quand la cible change de serveur' },
  { key: 'followStage',      label: 'Follow Stage',      desc: 'Suivre la cible dans les salons de présentation' },
  { key: 'snipeEnabled',     label: 'Snipe',             desc: 'Capturer les messages supprimés' },
]

const defendOptions = [
  { value: 0, label: 'Off' },
  { value: 1, label: 'Mentions' },
  { value: 2, label: 'Tout' },
]

async function loadBotSettings() {
  if (!authStore.user?.isBotTarget) return
  botLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: any }>('/api/bot/settings')
    botSettings.value = res.data
  } catch {
    botSettings.value = null
  } finally {
    botLoading.value = false
  }
}

async function updateBotSetting(key: string, value: any) {
  if (!botSettings.value) return
  const prev = botSettings.value[key]
  botSettings.value[key] = value // optimistic update
  botSaving.value = true
  try {
    await $fetch('/api/bot/settings', { method: 'PATCH', body: { [key]: value } })
  } catch {
    botSettings.value[key] = prev // revert on error
  } finally {
    botSaving.value = false
  }
}

onMounted(() => { loadBotSettings() })
</script>

<style lang="scss" scoped>
@use '~/assets/scss/variables' as *;

.profile-page {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.profile-header {
  margin-bottom: 2rem;

  h1 {
    font-size: 2rem;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: $text-secondary;
    font-size: 0.95rem;
  }
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-card,
.password-card {
  background: rgba($bg-secondary, 0.9);
  border: 1px solid rgba($violet-500, 0.15);
  border-radius: 12px;
  padding: 1.5rem;

  h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: 1.25rem;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-label {
  font-size: 0.85rem;
  color: $text-secondary;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.info-value {
  font-size: 1rem;
  color: $text-primary;
  font-weight: 500;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  width: fit-content;

  &.badge-owner {
    background: linear-gradient(135deg, rgba($violet-500, 0.15), rgba($pink-500, 0.1));
    color: $violet-300;
    border: 1px solid rgba($violet-400, 0.3);
  }

  &.badge-admin {
    background: rgba($pink-500, 0.12);
    color: $pink-300;
    border: 1px solid rgba($pink-400, 0.25);
  }

  &.badge-narrateur {
    background: rgba($violet-500, 0.12);
    color: $violet-300;
    border: 1px solid rgba($violet-400, 0.25);
  }
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  label {
    font-size: 0.9rem;
    font-weight: 500;
    color: $text-primary;
  }
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1rem;
  font-size: 1.1rem;
  opacity: 0.6;
  pointer-events: none;
}

.input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 3rem;
  background: rgba($bg-primary, 0.5);
  border: 1px solid rgba($violet-500, 0.2);
  border-radius: 8px;
  color: $text-primary;
  font-size: 0.95rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: $violet-400;
    background: rgba($bg-primary, 0.7);
    box-shadow: 0 0 0 3px rgba($violet-500, 0.1);
  }

  &::placeholder {
    color: $text-muted;
  }
}

.success-message,
.error-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.success-message {
  background: rgba($village-green, 0.15);
  border: 1px solid rgba($village-green, 0.3);
  color: $village-green;

  .success-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba($village-green, 0.2);
    font-weight: bold;
  }
}

.error-message {
  background: rgba($wolf-red, 0.15);
  border: 1px solid rgba($wolf-red, 0.3);
  color: $wolf-red;

  .error-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba($wolf-red, 0.2);
    font-weight: bold;
  }
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.85rem 1.5rem;
  background: linear-gradient(135deg, $violet-600, $pink-500);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba($violet-500, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

// ─── Bot Settings Card ────────────────────────────────────
.bot-card {
  background: rgba($bg-secondary, 0.9);
  border: 1px solid rgba($violet-500, 0.15);
  border-radius: 12px;
  padding: 1.5rem;
}

.bot-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;

  h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: $text-primary;
    margin: 0;
  }
}

.bot-saving {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: $text-secondary;
}

.spinner-sm {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba($violet-400, 0.3);
  border-top-color: $violet-400;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.bot-settings {
  display: flex;
  flex-direction: column;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid rgba($violet-500, 0.08);

  &:last-child { border-bottom: none; }
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.setting-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: $text-primary;
}

.setting-desc {
  font-size: 0.78rem;
  color: $text-muted;
}

.toggle {
  flex-shrink: 0;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  cursor: pointer;
  padding: 0;
  position: relative;
  transition: background 0.2s;

  &.on { background: linear-gradient(135deg, $violet-600, $pink-500); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  transition: transform 0.2s;

  .toggle.on & { transform: translateX(20px); }
}

.defend-group {
  display: flex;
  gap: 0.3rem;
  flex-shrink: 0;
}

.defend-opt {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
  border-radius: 6px;
  border: 1px solid rgba($violet-500, 0.2);
  background: transparent;
  color: $text-secondary;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;

  &.active {
    background: rgba($violet-500, 0.15);
    border-color: rgba($violet-400, 0.4);
    color: $violet-300;
    font-weight: 500;
  }

  &:hover:not(:disabled):not(.active) { background: rgba($violet-500, 0.08); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.bot-loading,
.bot-err {
  color: $text-muted;
  font-size: 0.88rem;
  text-align: center;
  padding: 1.5rem;
}
</style>
