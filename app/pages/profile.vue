<template>
  <div class="profile-page">
    <div class="profile-header">
      <h1>Mon Profil</h1>
      <p class="subtitle">Gérez vos informations personnelles</p>
    </div>

    <div class="profile-content">
      <!-- Top grid: info + password side by side -->
      <div class="profile-grid">

        <!-- User Info Card -->
        <div class="info-card">
          <div class="user-banner"
            :style="userProfile?.banner
              ? `background-image:url('${userProfile.banner}');background-size:cover;background-position:center;`
              : ''"
          >
            <div class="user-banner-glow" v-if="!userProfile?.banner" />
            <div class="user-avatar-wrap">
              <div class="user-avatar">
                <img v-if="userProfile?.avatar" :src="userProfile.avatar" class="user-avatar-img" />
                <span v-else>{{ authStore.user?.username?.[0]?.toUpperCase() }}</span>
              </div>
            </div>
          </div>

          <div class="user-card-body">
            <h2>Informations</h2>
            <div class="info-list">
              <div class="info-item">
                <span class="info-label">Nom d'utilisateur</span>
                <span class="info-value">{{ userProfile?.displayName || authStore.user?.username }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Rôle</span>
                <span class="info-value">
                  <span v-if="authStore.isOwner" class="badge badge-owner">🌙 Propriétaire</span>
                  <span v-else-if="authStore.isAdmin" class="badge badge-admin">👑 Admin</span>
                  <span v-else class="badge badge-narrateur">🎭 Narrateur</span>
                </span>
              </div>
              <div class="info-item" v-if="authStore.user?.discordId">
                <span class="info-label">Discord</span>
                <span class="info-value discord-id">{{ authStore.user?.discordId ?? '—' }}</span>
              </div>
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
                  placeholder="Mot de passe actuel..."
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
                  placeholder="Nouveau mot de passe..."
                  required
                  minlength="6"
                />
              </div>
            </div>

            <div class="form-group">
              <label>Confirmer</label>
              <div class="input-wrapper">
                <span class="input-icon">🔑</span>
                <input
                  v-model="confirmPassword"
                  type="password"
                  class="input"
                  placeholder="Confirmer le mot de passe..."
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

      </div><!-- /profile-grid -->

      <!-- Selfbot Settings — only visible to the bot target -->
      <div v-if="authStore.user?.isBotTarget" class="bot-cols">
      <div class="bot-card">

        <!-- Discord-style header -->
        <div
          class="bot-banner"
          :style="botProfile?.banner ? `background-image: url('${botProfile.banner}'); background-size: cover; background-position: center;` : ''"
        >
          <div class="bot-banner-glow" v-if="!botProfile?.banner" />
          <div class="bot-avatar-wrap">
            <div class="bot-avatar">
              <img v-if="botProfile?.avatar" :src="botProfile.avatar" alt="bot avatar" class="bot-avatar-img" />
              <span v-else>🤖</span>
            </div>
            <div class="bot-status-dot" />
          </div>
        </div>

        <div class="bot-body">
          <div class="bot-identity">
            <div class="bot-name-row">
              <span class="bot-name">{{ botProfile?.displayName ?? 'Selfbot' }}</span>
              <span class="bot-badge">BOT</span>
              <span v-if="botSaving" class="bot-saving">
                <span class="spinner-sm" />
                Saving...
              </span>
            </div>
            <div class="bot-sub">{{ botProfile?.username ? '@' + botProfile.username : 'Loup-Garou Online' }} · selfbot privé</div>
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

          <!-- Defend Replies -->
          <div class="replies-section">
            <div class="replies-header">
              <span class="setting-label">Réponses Defend</span>
              <span class="replies-count">{{ botSettings.defendReplies?.length ?? 0 }}</span>
            </div>
            <ul class="replies-list">
              <li v-for="(reply, i) in botSettings.defendReplies" :key="i" class="reply-item">
                <span class="reply-text">{{ reply }}</span>
                <button class="reply-remove" @click="removeReply(i as number)" :disabled="botSaving || botSettings.defendReplies.length <= 1">✕</button>
              </li>
            </ul>
            <div class="reply-add-row">
              <input
                v-model="newReplyText"
                class="reply-input"
                placeholder="Ajouter une réponse..."
                @keydown.enter="addReply"
                maxlength="200"
              />
              <button class="reply-add-btn" @click="addReply" :disabled="botSaving || !newReplyText.trim()">+</button>
            </div>
          </div>

          </div><!-- /v-else-if botSettings -->
          <div v-else-if="!botLoading" class="bot-err">Impossible de charger les paramètres.</div>
        </div><!-- /bot-body -->
      </div><!-- /bot-card-1 -->

      <!-- Card 2: Rich Presence + Commands -->
      <div class="bot-card bot-card-rp">
        <div class="bot-body">
          <template v-if="botSettings">
          <!-- Rich Presence -->
          <div class="presence-section">
            <div class="replies-header">
              <span class="setting-label">Rich Presence</span>
              <div class="presence-header-right">
                <span class="presence-live-dot" :class="presenceStatusClass" />
                <button
                  class="presence-toggle-btn"
                  :class="{ enabled: botSettings.presenceEnabled !== false }"
                  @click="togglePresenceEnabled"
                  :disabled="botSaving"
                  :title="botSettings.presenceEnabled !== false ? 'Présence active — cliquer pour désactiver' : 'Présence désactivée — cliquer pour activer'"
                >
                  {{ botSettings.presenceEnabled !== false ? '● On' : '○ Off' }}
                </button>
              </div>
            </div>

            <!-- Saved profiles -->
            <div v-if="presenceProfiles.length > 0" class="rp-profiles">
              <div class="rp-profiles-label">Profils sauvegardés</div>
              <div class="rp-profile-list">
                <div
                  v-for="(profile, i) in presenceProfiles"
                  :key="i"
                  class="rp-profile-item"
                  :class="{ active: isActiveProfile(profile) }"
                >
                  <div class="rp-profile-info">
                    <span class="rp-profile-name">{{ profile.name }}</span>
                    <span class="rp-profile-sub">{{ profile.activityType?.toLowerCase() }} · {{ profile.activityName }}</span>
                  </div>
                  <div class="rp-profile-actions">
                    <button class="rp-apply-btn" @click="loadProfile(profile)" :disabled="botSaving" title="Charger dans l'éditeur">✎</button>
                    <button class="rp-use-btn" @click="applyProfile(profile)" :disabled="botSaving" title="Appliquer directement">▶</button>
                    <button class="rp-del-btn" @click="deleteProfile(i)" :disabled="botSaving" title="Supprimer">✕</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Status row -->
            <div class="presence-row">
              <span class="presence-field-label">Status</span>
              <div class="presence-status-group">
                <button
                  v-for="s in statusOptions" :key="s.value"
                  class="status-opt"
                  :class="[s.value, { active: presenceDraft.status === s.value }]"
                  @click="presenceDraft.status = s.value"
                >{{ s.emoji }} {{ s.label }}</button>
              </div>
            </div>

            <!-- Activity type -->
            <div class="presence-row">
              <span class="presence-field-label">Activité</span>
              <div class="presence-type-group">
                <button
                  v-for="t in activityTypeOptions" :key="t.value"
                  class="type-opt"
                  :class="{ active: presenceDraft.activityType === t.value }"
                  @click="presenceDraft.activityType = t.value"
                >{{ t.label }}</button>
              </div>
            </div>

            <!-- Activity fields -->
            <div class="presence-inputs">
              <input
                v-model="presenceDraft.activityName"
                class="reply-input"
                :placeholder="activityNamePlaceholder"
                maxlength="128"
              />
              <input
                v-model="presenceDraft.activityDetails"
                class="reply-input presence-sub"
                placeholder="Détails (optionnel)"
                maxlength="128"
              />
              <input
                v-model="presenceDraft.activityState"
                class="reply-input presence-sub"
                placeholder="État (optionnel)"
                maxlength="128"
              />
            </div>

            <!-- Image assets -->
            <div class="presence-images">
              <div class="presence-img-field">
                <div class="presence-img-preview" :class="{ 'has-img': presenceDraft.largeImage }">
                  <img v-if="presenceDraft.largeImage" :src="presenceDraft.largeImage" alt="" @error="imgError = true" @load="imgError = false" />
                  <span v-else class="pi-placeholder">🖼️</span>
                  <span class="pi-label">Grande image</span>
                </div>
                <div class="presence-img-inputs">
                  <input v-model="presenceDraft.largeImage" class="reply-input presence-sub" placeholder="URL image principale (https://...)" maxlength="256" />
                  <input v-model="presenceDraft.largeText"  class="reply-input presence-sub" placeholder="Texte au survol" maxlength="128" />
                </div>
              </div>
              <div class="presence-img-field">
                <div class="presence-img-preview small" :class="{ 'has-img': presenceDraft.smallImage }">
                  <img v-if="presenceDraft.smallImage" :src="presenceDraft.smallImage" alt="" />
                  <span v-else class="pi-placeholder">🔲</span>
                  <span class="pi-label">Petite image</span>
                </div>
                <div class="presence-img-inputs">
                  <input v-model="presenceDraft.smallImage" class="reply-input presence-sub" placeholder="URL image secondaire (https://...)" maxlength="256" />
                  <input v-model="presenceDraft.smallText"  class="reply-input presence-sub" placeholder="Texte au survol" maxlength="128" />
                </div>
              </div>
            </div>

            <!-- Live preview -->
            <div class="presence-preview" v-if="presenceDraft.activityName">
              <div class="pp-bar" :class="presenceDraft.status" />
              <div class="pp-img-wrap" v-if="presenceDraft.largeImage">
                <img class="pp-large-img" :src="presenceDraft.largeImage" alt="" />
                <img v-if="presenceDraft.smallImage" class="pp-small-img" :src="presenceDraft.smallImage" alt="" />
              </div>
              <div class="pp-body">
                <div class="pp-type">{{ activityTypeLabel }} <span class="pp-name">{{ presenceDraft.activityName }}</span></div>
                <div class="pp-detail" v-if="presenceDraft.activityDetails">{{ presenceDraft.activityDetails }}</div>
                <div class="pp-state"  v-if="presenceDraft.activityState">{{ presenceDraft.activityState }}</div>
              </div>
            </div>

            <!-- Actions -->
            <div class="presence-actions">
              <button class="reply-add-btn presence-save-btn" @click="savePresence" :disabled="botSaving">
                {{ botSaving ? '...' : 'Appliquer' }}
              </button>
              <button class="presence-clear-btn" @click="clearPresence" :disabled="botSaving">
                Effacer
              </button>
            </div>

            <!-- Save as profile -->
            <div class="rp-save-row">
              <input
                v-model="newProfileName"
                class="reply-input rp-name-input"
                placeholder="Nom du profil..."
                maxlength="64"
                @keyup.enter="saveAsProfile"
              />
              <button
                class="rp-save-profile-btn"
                @click="saveAsProfile"
                :disabled="botSaving || !newProfileName.trim()"
              >💾 Sauvegarder</button>
            </div>
          </div>

          </template><!-- /v-if botSettings -->
          <div v-else-if="botLoading" class="bot-loading">Chargement...</div>

          <!-- Commands Reference -->
          <div class="cmds-section">
            <button class="cmds-toggle" @click="showCommands = !showCommands">
              <span>📋 Commandes</span>
              <span class="cmds-chevron" :class="{ open: showCommands }">›</span>
            </button>
            <div v-if="showCommands" class="cmds-body">
              <div v-for="group in commandGroups" :key="group.title" class="cmd-group">
                <div class="cmd-group-title">{{ group.title }}</div>
                <div v-for="cmd in group.cmds" :key="cmd.name" class="cmd-row">
                  <code class="cmd-name">{{ cmd.name }}</code>
                  <span class="cmd-desc">{{ cmd.desc }}</span>
                </div>
              </div>
            </div>
          </div>
        </div><!-- /bot-body -->
      </div><!-- /bot-card-2 -->
      </div><!-- /bot-cols -->
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

// ─── Discord profile (banner + avatar for info-card) ────
interface DiscordProfile { id: string; username: string; displayName: string; avatar: string | null; banner: string | null }
const userProfile = ref<DiscordProfile | null>(null)

async function loadUserDiscordProfile() {
  if (!authStore.user?.discordId) return
  try {
    const res = await $fetch<{ success: boolean; data: DiscordProfile | null }>('/api/auth/discord-profile')
    userProfile.value = res.data
  } catch { /* silent */ }
}

// ─── Bot Settings (only for isBotTarget users) ───────────
const botSettings = ref<Record<string, any> | null>(null)
const botLoading = ref(false)
const botSaving = ref(false)

interface BotProfile { id: string; username: string; displayName: string; avatar: string; banner: string | null; bannerColor: string | null }
const botProfile = ref<BotProfile | null>(null)

async function loadBotProfile() {
  if (!authStore.user?.isBotTarget) return
  try {
    const res = await $fetch<{ success: boolean; data: BotProfile }>('/api/bot/discord-profile')
    botProfile.value = res.data
  } catch { /* silent — just show fallback */ }
}

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
    if (res.data) syncPresenceDraft(res.data)
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

const newReplyText = ref('')
const showCommands = ref(false)

// ─── Rich Presence ────────────────────────────────────────
const presenceDraft = reactive({
  status: 'online' as 'online' | 'idle' | 'dnd' | 'invisible',
  activityType: 'PLAYING' as 'PLAYING' | 'WATCHING' | 'LISTENING' | 'COMPETING' | 'CUSTOM',
  activityName: '',
  activityDetails: '',
  activityState: '',
  largeImage: '',
  largeText: '',
  smallImage: '',
  smallText: '',
})

const presenceProfiles = ref<Array<Record<string, any>>>([])
const newProfileName   = ref('')
const imgError = ref(false)

const statusOptions: { value: 'online' | 'idle' | 'dnd' | 'invisible'; label: string; emoji: string }[] = [
  { value: 'online',    label: 'Online',    emoji: '🟢' },
  { value: 'idle',      label: 'Idle',      emoji: '🌙' },
  { value: 'dnd',       label: 'Ne pas déranger', emoji: '🔴' },
  { value: 'invisible', label: 'Invisible', emoji: '⚫' },
]

const activityTypeOptions: { value: 'PLAYING' | 'WATCHING' | 'LISTENING' | 'COMPETING' | 'CUSTOM'; label: string }[] = [
  { value: 'PLAYING',   label: 'Joue à' },
  { value: 'WATCHING',  label: 'Regarde' },
  { value: 'LISTENING', label: 'Écoute' },
  { value: 'COMPETING', label: 'Participe à' },
  { value: 'CUSTOM',    label: 'Statut perso' },
]

const activityTypeLabel = computed(() =>
  activityTypeOptions.find(t => t.value === presenceDraft.activityType)?.label ?? ''
)

const activityNamePlaceholder = computed(() => {
  const map: Record<string, string> = {
    PLAYING: 'Nom du jeu ou activité...',
    WATCHING: 'Ce que tu regardes...',
    LISTENING: 'Ce que tu écoutes...',
    COMPETING: 'Tournoi ou compétition...',
    CUSTOM: 'Ton statut personnalisé...',
  }
  return map[presenceDraft.activityType] ?? 'Nom de l\'activité...'
})

const presenceStatusClass = computed(() => ({
  'dot-online':    presenceDraft.status === 'online',
  'dot-idle':      presenceDraft.status === 'idle',
  'dot-dnd':       presenceDraft.status === 'dnd',
  'dot-invisible': presenceDraft.status === 'invisible',
}))

function syncPresenceDraft(settings: Record<string, any>) {
  if (settings.presence && typeof settings.presence === 'object') {
    const p = settings.presence
    if (p.status)       presenceDraft.status       = p.status
    if (p.activityType) presenceDraft.activityType = p.activityType
    presenceDraft.activityName    = p.activityName    ?? ''
    presenceDraft.activityDetails = p.activityDetails ?? ''
    presenceDraft.activityState   = p.activityState   ?? ''
    presenceDraft.largeImage      = p.largeImage      ?? ''
    presenceDraft.largeText       = p.largeText       ?? ''
    presenceDraft.smallImage      = p.smallImage      ?? ''
    presenceDraft.smallText       = p.smallText       ?? ''
  }
  if (Array.isArray(settings.presenceProfiles)) {
    presenceProfiles.value = settings.presenceProfiles
  }
}

async function savePresence() {
  if (!botSettings.value) return
  const payload = { ...presenceDraft }
  botSettings.value.presence = payload
  botSaving.value = true
  try {
    await $fetch('/api/bot/settings', { method: 'PATCH', body: { presence: payload } })
  } catch {
    // keep local draft, don't revert UI
  } finally {
    botSaving.value = false
  }
}

async function clearPresence() {
  if (!botSettings.value) return
  Object.assign(presenceDraft, { status: 'online', activityType: 'PLAYING', activityName: '', activityDetails: '', activityState: '', largeImage: '', largeText: '', smallImage: '', smallText: '' })
  botSettings.value.presence = null
  botSaving.value = true
  try {
    await $fetch('/api/bot/settings', { method: 'PATCH', body: { presence: null } })
  } catch { /* silent */ } finally {
    botSaving.value = false
  }
}

function loadProfile(profile: Record<string, any>) {
  Object.assign(presenceDraft, {
    status:          profile.status        ?? 'online',
    activityType:    profile.activityType  ?? 'PLAYING',
    activityName:    profile.activityName  ?? '',
    activityDetails: profile.activityDetails ?? '',
    activityState:   profile.activityState ?? '',
    largeImage:      profile.largeImage    ?? '',
    largeText:       profile.largeText     ?? '',
    smallImage:      profile.smallImage    ?? '',
    smallText:       profile.smallText     ?? '',
  })
}

async function applyProfile(profile: Record<string, any>) {
  loadProfile(profile)
  await savePresence()
}

async function deleteProfile(index: number) {
  const updated = [...presenceProfiles.value]
  updated.splice(index, 1)
  presenceProfiles.value = updated
  if (botSettings.value) botSettings.value.presenceProfiles = updated
  botSaving.value = true
  try {
    await $fetch('/api/bot/settings', { method: 'PATCH', body: { presenceProfiles: updated } })
  } catch { /* silent */ } finally {
    botSaving.value = false
  }
}

async function saveAsProfile() {
  const name = newProfileName.value.trim()
  if (!name) return
  const entry = { name, ...presenceDraft }
  const updated = [...presenceProfiles.value]
  const existing = updated.findIndex(p => p.name.toLowerCase() === name.toLowerCase())
  if (existing >= 0) updated[existing] = entry
  else updated.push(entry)
  presenceProfiles.value = updated
  if (botSettings.value) botSettings.value.presenceProfiles = updated
  newProfileName.value = ''
  botSaving.value = true
  try {
    await $fetch('/api/bot/settings', { method: 'PATCH', body: { presenceProfiles: updated } })
  } catch { /* silent */ } finally {
    botSaving.value = false
  }
}

async function togglePresenceEnabled() {
  if (!botSettings.value) return
  const next = botSettings.value.presenceEnabled === false ? true : false
  botSettings.value.presenceEnabled = next
  botSaving.value = true
  try {
    await $fetch('/api/bot/settings', { method: 'PATCH', body: { presenceEnabled: next } })
  } catch {
    botSettings.value.presenceEnabled = !next
  } finally {
    botSaving.value = false
  }
}

function isActiveProfile(profile: Record<string, any>) {
  if (!botSettings.value?.presence) return false
  const p = botSettings.value.presence
  return p.activityName === profile.activityName && p.status === profile.status && p.activityType === profile.activityType
}

const commandGroups = [
  {
    title: '📡 Status',
    cmds: [
      { name: 'wech',      desc: 'Ping — vérifier si le bot répond' },
      { name: 'status',    desc: 'Uptime, mémoire, ping, VC actuel' },
      { name: 'settings',  desc: 'Voir tous les paramètres actifs' },
      { name: 'help',      desc: 'Liste des commandes (dans Discord)' },
    ],
  },
  {
    title: '🎙️ Vocal (VC)',
    cmds: [
      { name: 'follow on/off', desc: 'Activer / désactiver le suivi VC' },
      { name: 'aji',           desc: 'Rejoindre ton VC immédiatement' },
      { name: 'leave',         desc: 'Quitter le VC' },
      { name: 'where',         desc: 'Voir dans quel VC le bot est' },
      { name: 'sadreact on/off', desc: '🥺 quand expulsé du VC' },
      { name: 'crossguild on/off', desc: 'Quitter l\'ancien VC en cas de changement de serveur' },
      { name: 'stage on/off',  desc: 'Suivre dans les salons de présentation' },
    ],
  },
  {
    title: '🛡️ Défense',
    cmds: [
      { name: 'defend off',  desc: 'Désactiver la défense' },
      { name: 'defend 1',    desc: 'Défendre uniquement les mentions' },
      { name: 'defend 2',    desc: 'Défendre mentions + réponses' },
      { name: 'defend',      desc: 'Voir le mode actuel' },
      { name: 'replies',     desc: 'Lister les réponses enregistrées' },
      { name: 'reply add <texte>', desc: 'Ajouter une réponse' },
      { name: 'reply remove <n>',  desc: 'Supprimer une réponse (par numéro ou texte)' },
    ],
  },
  {
    title: '😄 Emojis',
    cmds: [
      { name: 'emojis',          desc: 'Voir le pool d\'emojis' },
      { name: 'emoji add <e>',   desc: 'Ajouter un emoji au pool' },
      { name: 'emoji remove <n>', desc: 'Retirer un emoji (numéro ou emoji)' },
      { name: 'emoji reset',     desc: 'Réinitialiser le pool par défaut' },
      { name: 'selfreact on/off', desc: 'Activer / désactiver les réactions auto' },
    ],
  },
  {
    title: '🎯 Snipe',
    cmds: [
      { name: 'snipe on/off',  desc: 'Activer / désactiver la capture de msgs supprimés' },
      { name: 'snipe',         desc: 'Voir le dernier message supprimé ici' },
      { name: 'snipe dm',      desc: 'Envoyer le dernier supprimé en DM' },
      { name: 'snipe add',     desc: 'Ajouter ce serveur à la whitelist' },
      { name: 'snipe remove',  desc: 'Retirer ce serveur de la whitelist' },
      { name: 'snipe guilds',  desc: 'Voir les serveurs whitelistés' },
      { name: 'snipe reset',   desc: 'Vider la whitelist' },
    ],
  },
  {
    title: '🎭 Rich Presence',
    cmds: [
      { name: 'rp list',           desc: 'Voir les profils de présence sauvegardés' },
      { name: 'rp apply <nom/n>',  desc: 'Appliquer un profil (par nom ou numéro)' },
      { name: 'rp save <nom>',     desc: 'Sauvegarder la présence actuelle comme profil' },
      { name: 'rp delete <nom/n>', desc: 'Supprimer un profil sauvegardé' },
      { name: 'rp on',             desc: 'Activer la rich presence' },
      { name: 'rp off',            desc: 'Désactiver la présence (passer en invisible)' },
      { name: 'rp clear',          desc: 'Juste Online, sans activité' },
    ],
  },
]

async function addReply() {
  const text = newReplyText.value.trim()
  if (!text || !botSettings.value) return
  if (botSettings.value.defendReplies?.includes(text)) return
  const updated = [...(botSettings.value.defendReplies || []), text]
  newReplyText.value = ''
  botSettings.value.defendReplies = updated
  botSaving.value = true
  try {
    await $fetch('/api/bot/settings', { method: 'PATCH', body: { defendReplies: updated } })
  } catch {
    botSettings.value.defendReplies = updated.slice(0, -1) // revert
  } finally {
    botSaving.value = false
  }
}

async function removeReply(index: number) {
  if (!botSettings.value) return
  if (botSettings.value.defendReplies.length <= 1) return
  const updated = botSettings.value.defendReplies.filter((_: any, i: number) => i !== index)
  const prev = [...botSettings.value.defendReplies]
  botSettings.value.defendReplies = updated
  botSaving.value = true
  try {
    await $fetch('/api/bot/settings', { method: 'PATCH', body: { defendReplies: updated } })
  } catch {
    botSettings.value.defendReplies = prev // revert
  } finally {
    botSaving.value = false
  }
}

onMounted(() => {
  loadUserDiscordProfile()
  loadBotSettings()
  loadBotProfile()
})
</script>

<style lang="scss" scoped>
@use '~/assets/scss/variables' as *;

.profile-page {
  padding: 2rem;
  max-width: 920px;
  margin: 0 auto;
}

.profile-header {
  margin-bottom: 1.75rem;

  h1 {
    font-size: 1.75rem;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: 0.35rem;
  }

  .subtitle {
    color: $text-secondary;
    font-size: 0.9rem;
  }
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

// ─── Two-col grid ────────────────────────────────────────
.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1.6fr;
  gap: 1.25rem;
  align-items: stretch;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
}

.info-card,
.password-card {
  background: rgba($bg-secondary, 0.9);
  border: 1px solid rgba($violet-500, 0.15);
  border-radius: 12px;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  padding: 0;

  h2 {
    font-size: 1.05rem;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: 1rem;
  }
}

.password-card {
  padding: 1.25rem 1.5rem;
}

// User banner inside info-card
.user-banner {
  height: 72px;
  background: linear-gradient(135deg, $violet-900 0%, $violet-700 60%, $pink-500 100%);
  position: relative;
  border-radius: 12px 12px 0 0;
  overflow: visible;
}

.user-banner-glow {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(ellipse at 70% 60%, rgba($pink-500, 0.2) 0%, transparent 65%),
              radial-gradient(ellipse at 20% 30%, rgba($violet-400, 0.18) 0%, transparent 55%);
}

.user-avatar-wrap {
  position: absolute;
  bottom: -28px;
  left: 1.25rem;
  z-index: 5;
}

.user-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, $violet-800, $violet-600);
  border: 3px solid $bg-secondary;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 700;
  color: $text-primary;
  box-shadow: 0 3px 12px rgba(0,0,0,0.5);
  overflow: hidden;
}

.user-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

.user-card-body {
  padding: 2.5rem 1.25rem 1.25rem; // top clears the avatar overhang
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.75rem;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
}

.info-value {
  font-size: 0.95rem;
  color: $text-primary;
  font-weight: 500;
}

.discord-id {
  font-size: 0.82rem;
  font-family: monospace;
  color: $text-secondary;
  opacity: 0.8;
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
  gap: 1rem;
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

// ─── Bot Card — Discord style ─────────────────────────────
.bot-cols {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  max-width: 1100px;
  margin: 0 auto;

  @media (max-width: 860px) {
    flex-direction: column;
  }
}

.bot-card {
  background: rgba($bg-secondary, 0.9);
  border: 1px solid rgba($violet-500, 0.15);
  border-radius: 12px;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.bot-card-rp {
  padding-top: 0.5rem;
  overflow: visible;
}

// Banner
.bot-banner {
  height: 110px;
  background: linear-gradient(135deg, $violet-950 0%, $violet-700 50%, $pink-500 100%);
  position: relative;
  overflow: visible; // allow avatar to hang below
  border-radius: 12px 12px 0 0;
}

.bot-banner-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 70% 60%, rgba($pink-500, 0.25) 0%, transparent 65%),
              radial-gradient(ellipse at 20% 30%, rgba($violet-400, 0.2) 0%, transparent 55%);
}

// Avatar
.bot-avatar-wrap {
  position: absolute;
  bottom: -48px;
  left: 1.5rem;
  z-index: 10;
}

.bot-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: linear-gradient(135deg, $violet-800, $violet-600);
  border: 5px solid $bg-secondary;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.bot-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

.bot-status-dot {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: $village-green;
  border: 3px solid $bg-secondary;
  box-shadow: 0 0 8px rgba($village-green, 0.7);
}

// Body (padded area below banner)
.bot-body {
  padding: 1.5rem 1.5rem 1.5rem;
  padding-top: 3.5rem; // 48px overlap + 8px breathing room
}

// Identity row
.bot-identity {
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba($violet-500, 0.12);
}

.bot-name-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.bot-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: $text-primary;
  letter-spacing: 0.01em;
}

.bot-badge {
  background: rgba($violet-500, 0.2);
  color: $violet-300;
  border: 1px solid rgba($violet-400, 0.35);
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.bot-sub {
  margin-top: 0.3rem;
  font-size: 0.78rem;
  color: $text-muted;
}

.bot-saving {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
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
  gap: 0;
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

// ─── Defend Replies ───────────────────────────────────────
.replies-section {
  padding-top: 0.85rem;
  border-top: 1px solid rgba($violet-500, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.replies-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.replies-count {
  background: rgba($violet-500, 0.15);
  color: $violet-300;
  border-radius: 10px;
  padding: 0.1rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.replies-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  max-height: 220px;
  overflow-y: auto;
}

.reply-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem 0.75rem;
  background: rgba($bg-primary, 0.4);
  border: 1px solid rgba($violet-500, 0.1);
  border-radius: 6px;
  font-size: 0.85rem;
  color: $text-primary;
}

.reply-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reply-remove {
  flex-shrink: 0;
  background: none;
  border: none;
  color: $text-muted;
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
  font-family: inherit;

  &:hover:not(:disabled) {
    color: $wolf-red;
    background: rgba($wolf-red, 0.1);
  }

  &:disabled { opacity: 0.3; cursor: not-allowed; }
}

.reply-add-row {
  display: flex;
  gap: 0.5rem;
}

.reply-input {
  flex: 1;
  padding: 0.55rem 0.85rem;
  background: rgba($bg-primary, 0.5);
  border: 1px solid rgba($violet-500, 0.2);
  border-radius: 7px;
  color: $text-primary;
  font-size: 0.88rem;
  font-family: inherit;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: $violet-400;
  }

  &::placeholder { color: $text-muted; }
}

.reply-add-btn {
  padding: 0.55rem 1rem;
  background: linear-gradient(135deg, $violet-600, $pink-500);
  color: white;
  border: none;
  border-radius: 7px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: opacity 0.15s;
  font-family: inherit;

  &:hover:not(:disabled) { opacity: 0.85; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.presence-images {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.presence-img-field {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
}

.presence-img-preview {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 8px;
  background: rgba($violet-600, 0.15);
  border: 1px solid rgba($violet-400, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 7px;
  }

  &.small {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    img { border-radius: 50%; }
  }

  &.has-img .pi-label { display: none; }
}

.pi-placeholder { font-size: 1.3rem; }
.pi-label {
  position: absolute;
  bottom: 2px;
  left: 0; right: 0;
  text-align: center;
  font-size: 0.55rem;
  color: $text-muted;
  display: none;
}

.presence-img-inputs {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

// Updated presence preview with image
.pp-img-wrap {
  position: relative;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  margin-left: 0.6rem;
}

.pp-large-img {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
}

.pp-small-img {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba($violet-600, 0.9);
}

// ─── Rich Presence ──────────────────────────────────────────────────────────
.presence-section {
  margin-top: 1.25rem;
  border-top: 1px solid rgba($violet-400, 0.12);
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.presence-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  &.dot-online    { background: #3ba55d; box-shadow: 0 0 6px #3ba55d88; }
  &.dot-idle      { background: #faa81a; box-shadow: 0 0 6px #faa81a88; }
  &.dot-dnd       { background: #ed4245; box-shadow: 0 0 6px #ed424588; }
  &.dot-invisible { background: #72767d; }
}

.presence-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.presence-field-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: $text-muted;
  padding-top: 0.35rem;
  min-width: 56px;
}

.presence-status-group,
.presence-type-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.status-opt,
.type-opt {
  padding: 0.3rem 0.65rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid rgba($violet-400, 0.2);
  background: rgba($violet-600, 0.12);
  color: $text-secondary;
  transition: all 0.15s;

  &:hover { background: rgba($violet-500, 0.2); color: $text-primary; }
  &.active {
    background: rgba($violet-500, 0.3);
    border-color: $violet-400;
    color: $text-primary;
  }
}

// Status-specific active colours
.status-opt.online.active  { border-color: #3ba55d; color: #3ba55d; background: rgba(59,165,93,0.12); }
.status-opt.idle.active    { border-color: #faa81a; color: #faa81a; background: rgba(250,168,26,0.12); }
.status-opt.dnd.active     { border-color: #ed4245; color: #ed4245; background: rgba(237,66,69,0.12); }
.status-opt.invisible.active { border-color: #72767d; color: $text-muted; }

.presence-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.presence-sub {
  font-size: 0.78rem !important;
  padding: 0.4rem 0.7rem !important;
  opacity: 0.85;
}

// Discord-style activity preview
.presence-preview {
  display: flex;
  align-items: center;
  gap: 0;
  background: rgba($violet-600, 0.1);
  border: 1px solid rgba($violet-400, 0.18);
  border-radius: 8px;
  overflow: hidden;
}

.pp-bar {
  width: 4px;
  flex-shrink: 0;
  &.online    { background: #3ba55d; }
  &.idle      { background: #faa81a; }
  &.dnd       { background: #ed4245; }
  &.invisible { background: #72767d; }
}

.pp-body {
  padding: 0.6rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.pp-type {
  font-size: 0.7rem;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.pp-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: $text-primary;
  text-transform: none;
  letter-spacing: 0;
}

.pp-detail, .pp-state {
  font-size: 0.75rem;
  color: $text-secondary;
}

.presence-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.presence-save-btn {
  flex: 1;
}

.presence-clear-btn {
  padding: 0.55rem 0.9rem;
  background: none;
  border: 1px solid rgba($violet-400, 0.25);
  color: $text-muted;
  border-radius: 7px;
  font-size: 0.8rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  &:hover:not(:disabled) { border-color: #ed4245; color: #ed4245; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

// Presence on/off header
.presence-header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.presence-toggle-btn {
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid rgba($violet-400, 0.3);
  background: rgba($violet-600, 0.12);
  color: $text-muted;

  &.enabled {
    border-color: #3ba55d44;
    background: rgba(#3ba55d, 0.12);
    color: #3ba55d;
  }
  &:hover:not(:disabled) { opacity: 0.8; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

// Saved profiles panel
.rp-profiles {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.rp-profiles-label {
  font-size: 0.7rem;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.rp-profile-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.rp-profile-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 0.65rem;
  background: rgba($violet-600, 0.1);
  border: 1px solid rgba($violet-400, 0.15);
  border-radius: 7px;
  gap: 0.5rem;
  transition: border-color 0.15s;

  &.active {
    border-color: rgba($violet-400, 0.4);
    background: rgba($violet-600, 0.18);
  }
}

.rp-profile-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.rp-profile-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rp-profile-sub {
  font-size: 0.68rem;
  color: $text-muted;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rp-profile-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.rp-apply-btn,
.rp-use-btn,
.rp-del-btn {
  width: 26px;
  height: 26px;
  border-radius: 5px;
  border: 1px solid rgba($violet-400, 0.2);
  background: rgba($violet-600, 0.15);
  color: $text-muted;
  font-size: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  font-family: inherit;

  &:hover:not(:disabled) { border-color: rgba($violet-400, 0.5); color: $text-primary; background: rgba($violet-500, 0.2); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.rp-use-btn:hover:not(:disabled) {
  border-color: #3ba55d55;
  color: #3ba55d;
  background: rgba(#3ba55d, 0.1);
}

.rp-del-btn:hover:not(:disabled) {
  border-color: #ed424555;
  color: #ed4245;
  background: rgba(#ed4245, 0.1);
}

// Save as profile row
.rp-save-row {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  margin-top: 0.3rem;
}

.rp-name-input {
  flex: 1;
}

.rp-save-profile-btn {
  flex-shrink: 0;
  padding: 0.55rem 0.8rem;
  background: rgba($violet-600, 0.2);
  border: 1px solid rgba($violet-400, 0.3);
  color: $text-secondary;
  border-radius: 7px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all 0.15s;

  &:hover:not(:disabled) { background: rgba($violet-500, 0.3); color: $text-primary; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

// ─── Commands Reference ───────────────────────────────────
.cmds-section {
  margin-top: 1.25rem;
  border-top: 1px solid rgba($violet-400, 0.12);
  padding-top: 0.75rem;
}

.cmds-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.3rem 0;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  color: $text-secondary;
  letter-spacing: 0.04em;
  text-transform: uppercase;

  &:hover { color: $text-primary; }
}

.cmds-chevron {
  font-size: 1.1rem;
  line-height: 1;
  transition: transform 0.2s;
  display: inline-block;
  transform: rotate(0deg);

  &.open { transform: rotate(90deg); }
}

.cmds-body {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cmd-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.cmd-group-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: $violet-400;
  margin-bottom: 0.2rem;
}

.cmd-row {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid rgba($violet-400, 0.06);

  &:last-child { border-bottom: none; }
}

.cmd-name {
  flex-shrink: 0;
  font-family: 'Courier New', monospace;
  font-size: 0.78rem;
  background: rgba($violet-600, 0.18);
  color: $violet-300;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  border: 1px solid rgba($violet-400, 0.2);
  min-width: 140px;
}

.cmd-desc {
  font-size: 0.8rem;
  color: $text-muted;
  line-height: 1.3;
}
</style>
