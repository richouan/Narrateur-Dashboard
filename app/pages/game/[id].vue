<template>
  <div class="game-page">
    <NuxtLayout name="game">
      <div v-if="loading" class="game-loading">
        <span class="spinner" />
        <p>Chargement de la partie...</p>
      </div>

      <template v-else-if="gameStore.currentGame">
        <!-- Game Ended Banner -->
        <div v-if="gameStore.currentPhase === 'END'" class="game-ended-banner">
          <div class="ended-content">
            <span class="ended-icon">🏁</span>
            <h2 class="ended-title">Partie Terminée</h2>
            <p class="ended-subtitle">Cette partie est terminée le {{ formatDateTime(gameStore.currentGame.endedAt) }}</p>
            <div class="ended-actions">
              <button class="btn-primary" @click="navigateTo('/dashboard')">
                Retour au Dashboard
              </button>
              <button class="btn-ghost" @click="exportStory">
                📖 Exporter l'Histoire
              </button>
            </div>
          </div>
        </div>

        <!-- Phase Banner -->
        <div v-if="gameStore.currentPhase !== 'SETUP'" class="phase-banner" :class="phaseClass">
          <Transition name="fade" mode="out-in">
            <div :key="gameStore.currentPhase" class="phase-content">
              <span class="phase-icon">{{ phaseIcon }}</span>
              <h1 class="phase-title">{{ formatPhase(gameStore.currentPhase) }}</h1>
              <span class="phase-info" v-if="gameStore.currentGame.nightNumber">
                {{ gameStore.currentPhase.includes('NIGHT') ? `Nuit ${gameStore.currentGame.nightNumber}` : `Jour ${gameStore.currentGame.dayNumber}` }}
              </span>
            </div>
          </Transition>
        </div>

        <!-- Setup Phase Interface -->
        <div v-if="gameStore.currentPhase === 'SETUP'" class="setup-interface">
          <div class="setup-grid">
            <!-- Left: Role Selection -->
            <div class="setup-panel glass-card">
              <div class="panel-header-setup">
                <div>
                  <h2 class="panel-title-setup">🎭 Sélection des Rôles</h2>
                  <p class="panel-subtitle">Choisissez les rôles pour cette partie</p>
                </div>
                <div class="bot-status">
                  <span class="status-dot" :class="{ online: botAlive }"></span>
                  <span class="status-label">Bot {{ botAlive ? 'En ligne' : 'Hors ligne' }}</span>
                </div>
              </div>

              <!-- Role Categories -->
              <div class="role-categories">
                <!-- Wolves -->
                <div class="role-category wolf-category">
                  <div class="category-header">
                    <span class="category-icon">🐺</span>
                    <h3 class="category-title">Loups-Garous</h3>
                    <span class="category-count">{{ selectedRolesByTeam('WOLF').length }}</span>
                  </div>
                  <div class="role-chips">
                    <button
                      v-for="role in getRolesByTeam('WOLF')"
                      :key="role._id"
                      class="role-chip"
                      :class="{ selected: selectedRoles.includes(role._id) }"
                      @click="toggleRole(role._id)"
                    >
                      {{ role.name }}
                    </button>
                  </div>
                </div>

                <!-- Villagers -->
                <div class="role-category village-category">
                  <div class="category-header">
                    <span class="category-icon">🏘️</span>
                    <h3 class="category-title">Villageois</h3>
                    <span class="category-count">{{ selectedRolesByTeam('VILLAGER').length }}</span>
                  </div>
                  <div class="role-chips">
                    <button
                      v-for="role in getRolesByTeam('VILLAGER')"
                      :key="role._id"
                      class="role-chip"
                      :class="{ selected: selectedRoles.includes(role._id) }"
                      @click="toggleRole(role._id)"
                    >
                      {{ role.name }}
                    </button>
                  </div>
                </div>

                <!-- Neutrals -->
                <div class="role-category neutral-category">
                  <div class="category-header">
                    <span class="category-icon">⚖️</span>
                    <h3 class="category-title">Neutres</h3>
                    <span class="category-count">{{ selectedRolesByTeam('NEUTRAL').length }}</span>
                  </div>
                  <div class="role-chips">
                    <button
                      v-for="role in getRolesByTeam('NEUTRAL')"
                      :key="role._id"
                      class="role-chip"
                      :class="{ selected: selectedRoles.includes(role._id) }"
                      @click="toggleRole(role._id)"
                    >
                      {{ role.name }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="deck-summary">
                <span class="summary-label">Deck sélectionné :</span>
                <span class="summary-count">{{ selectedRoles.length }} rôle(s)</span>
              </div>
            </div>

            <!-- Right: Player Management -->
            <div class="setup-panel glass-card">
              <div class="panel-header-setup">
                <div>
                  <h2 class="panel-title-setup">👥 Gestion des Joueurs</h2>
                  <p class="panel-subtitle">{{ gameStore.currentGame?.players.length || 0 }} joueur(s) ajouté(s)</p>
                </div>
              </div>

              <!-- Smart Player Addition -->
              <div class="player-addition">
                <div class="smart-input-container">
                  <label class="method-label">
                    <span class="label-icon">➕</span>
                    Ajouter des joueurs
                  </label>
                  <div class="input-hint">{{ inputHint }}</div>
                  <div class="input-row">
                    <input
                      v-model="smartInput"
                      class="input-modern"
                      :placeholder="inputPlaceholder"
                      :disabled="isProcessing"
                      @keyup.enter="handleSmartAdd"
                      @input="updateInputHint"
                    />
                    <button
                      class="btn-add"
                      :disabled="!smartInput.trim() || isProcessing"
                      @click="handleSmartAdd"
                    >
                      <span v-if="isProcessing">⏳</span>
                      <span v-else>{{ addButtonIcon }}</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Players List -->
              <div class="players-setup-list">
                <div
                  v-for="player in gameStore.currentGame?.players"
                  :key="player.id"
                  class="player-setup-card"
                >
                  <div class="player-left">
                    <div class="player-avatar-setup">
                      {{ player.name.charAt(0).toUpperCase() }}
                    </div>
                    <div class="player-details">
                      <span class="player-name-setup">{{ player.name }}</span>
                      <span v-if="player.discordId" class="player-badge discord-badge">🎮 Discord</span>
                    </div>
                  </div>
                  <div class="player-right">
                    <select
                      v-model="playerRoles[player.id]"
                      class="role-select-modern"
                      @change="assignRole(player.id, playerRoles[player.id] || '')"
                    >
                      <option value="">Aucun rôle</option>
                      <option
                        v-for="roleId in selectedRoles"
                        :key="roleId"
                        :value="roleId"
                      >
                        {{ getRoleName(roleId) }}
                      </option>
                    </select>
                    <button class="btn-remove" @click="removePlayer(player.id)" title="Retirer">
                      ✕
                    </button>
                  </div>
                </div>

                <div v-if="!gameStore.currentGame?.players.length" class="empty-state">
                  <span class="empty-icon">👥</span>
                  <p class="empty-text">Aucun joueur ajouté</p>
                  <p class="empty-hint">Utilisez les méthodes ci-dessus pour ajouter des joueurs</p>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="setup-actions">
                <button
                  class="btn-start-game"
                  :disabled="!gameStore.currentGame?.players.length"
                  @click="startGame"
                >
                  <span class="btn-icon">🎭</span>
                  <span>Commencer la Partie</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Game Grid (Hidden during SETUP) -->
        <div v-if="gameStore.currentPhase !== 'SETUP'" class="game-grid">
          <!-- Left: Players Panel -->
          <section class="players-panel glass-card">
            <div class="panel-header">
              <h2 class="panel-title">👥 Joueurs</h2>
              <span class="player-count">{{ gameStore.aliveCount }} / {{ gameStore.playerCount }} en vie</span>
            </div>

            <div class="players-list">
              <div
                v-for="player in gameStore.currentGame.players"
                :key="player.id"
                class="player-card"
                :class="{ dead: !player.isAlive, captain: player.isCaptain, infected: player.isInfected }"
              >
                <div class="player-avatar" :class="{ dead: !player.isAlive }">
                  {{ player.name.charAt(0).toUpperCase() }}
                </div>
                <div class="player-info">
                  <span class="player-name">{{ player.name }}</span>
                  <div class="player-tags">
                    <span v-if="player.roleName" class="badge-violet">{{ player.roleName }}</span>
                    <span v-if="player.isCaptain" class="badge-captain">👑 Capitaine</span>
                    <span v-if="player.isInfected" class="badge-wolf">Infecté</span>
                    <span v-if="!player.isAlive" class="badge-dead">💀 Mort</span>
                  </div>
                </div>
                <div class="player-actions">
                  <button v-if="player.isAlive" class="btn-action kill" title="Tuer" @click="doAction('kill', player.id)">💀</button>
                  <button v-if="!player.isAlive" class="btn-action revive" title="Ressusciter" @click="doAction('revive', player.id)">✨</button>
                  <button v-if="player.isAlive && !player.isInfected" class="btn-action infect" title="Infecter" @click="doAction('infect', player.id)">🐺</button>
                  <button v-if="player.isAlive && !player.isCaptain" class="btn-action captain" title="Capitaine" @click="doAction('set_captain', player.id)">👑</button>
                </div>
              </div>
            </div>
          </section>

          <!-- Center: Phase Controls -->
          <section class="controls-panel">
            <!-- Phase Transition Controls -->
            <div class="glass-card phase-controls">
              <h2 class="panel-title">🎭 Contrôle de Phase</h2>
              <div class="transition-buttons">
                <button
                  v-for="target in availableTransitions"
                  :key="target"
                  class="transition-btn"
                  :class="getTransitionClass(target)"
                  @click="transitionTo(target)"
                >
                  <span class="transition-icon">{{ getPhaseIcon(target) }}</span>
                  <span>{{ formatPhase(target) }}</span>
                </button>
              </div>
            </div>

            <!-- Vote Panel (during VOTE phase) -->
            <div v-if="gameStore.currentPhase === 'VOTE'" class="glass-card vote-panel">
              <h2 class="panel-title">🗳️ Vote du Village</h2>
              <div class="vote-grid">
                <div v-for="player in gameStore.alivePlayers" :key="player.id" class="vote-row">
                  <span class="voter-name">{{ player.name }}</span>
                  <span v-if="player.isCaptain" class="vote-weight">×2</span>
                  <select v-model="votes[player.id]" class="input vote-select">
                    <option value="">— Pas de vote —</option>
                    <option
                      v-for="target in gameStore.alivePlayers.filter(t => t.id !== player.id)"
                      :key="target.id"
                      :value="target.id"
                    >
                      {{ target.name }}
                    </option>
                  </select>
                </div>
              </div>
              <button class="btn-primary" @click="submitVoteResults" style="margin-top:16px; width:100%">
                Soumettre les Votes
              </button>
            </div>

            <!-- Night Panel (during NIGHT / FIRST_NIGHT) -->
            <div v-if="isNightPhase" class="glass-card night-panel">
              <h2 class="panel-title">🌙 Actions Nocturnes</h2>
              <p class="night-hint">Nuit {{ gameStore.currentGame.nightNumber }} — Exécuter les actions dans l'ordre</p>
              <div class="night-actions">
                <div v-for="(action, idx) in nightActions" :key="idx" class="night-action-row">
                  <input v-model="action.role" class="input" placeholder="Rôle" />
                  <input v-model="action.actor" class="input" placeholder="Acteur" />
                  <input v-model="action.target" class="input" placeholder="Cible" />
                  <input v-model="action.result" class="input" placeholder="Résultat" />
                  <button class="btn-ghost btn-sm" @click="nightActions.splice(idx, 1)">✕</button>
                </div>
                <button class="btn-ghost" @click="nightActions.push({ role: '', actor: '', target: '', result: '' })" style="width:100%">
                  + Ajouter une Action
                </button>
              </div>
              <button class="btn-primary" @click="submitNightActions" style="margin-top:16px; width:100%">
                Confirmer la Nuit
              </button>
            </div>

            <!-- Narrateur Override Panel -->
            <div class="glass-card override-panel">
              <h2 class="panel-title">⚡ Override Narrateur</h2>
              <div class="override-buttons">
                <button class="btn-danger" @click="forceEnd">Forcer la Fin</button>
                <button class="btn-ghost" @click="gameStore.fetchGame(gameStore.currentGame!._id)">Rafraîchir</button>
              </div>
            </div>
          </section>

          <!-- Right: Game Log -->
          <section class="log-panel glass-card">
            <div class="panel-header">
              <h2 class="panel-title">📜 Chronique</h2>
              <button class="btn-ghost btn-sm" @click="copyLogs">📋 Copier</button>
            </div>
            <div class="log-entries">
              <div
                v-for="(log, idx) in reversedLogs"
                :key="idx"
                class="log-entry"
                :class="log.type"
              >
                <span class="log-time">{{ formatTime(log.timestamp) }}</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
            </div>

            <!-- Story Export (when game ended) -->
            <button
              v-if="gameStore.currentPhase === 'END'"
              class="btn-primary"
              @click="exportStory"
              style="margin-top:16px; width:100%"
            >
              📜 Exporter l'Histoire
            </button>
          </section>
        </div>
      </template>

      <div v-else class="game-not-found">
        <span class="not-found-icon">🌙</span>
        <h2>Partie introuvable</h2>
        <NuxtLink to="/dashboard" class="btn-primary">Retour au Dashboard</NuxtLink>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import type { GameStatus } from '~/types'

const route = useRoute()
const gameStore = useGameStore()
const loading = ref(true)
const newPlayerName = ref('')
const votes = ref<Record<string, string>>({})
const nightActions = ref<{ role: string; actor: string; target: string; result: string }[]>([])

// Setup phase state - Smart Input
const smartInput = ref('')
const inputHint = ref('Entrez un nom, un ID utilisateur, ou un ID salon')
const inputType = ref<'name' | 'user' | 'channel'>('name')
const botAlive = ref(false)
const isProcessing = ref(false)
const playerRoles = ref<Record<string, string>>({}) // playerId -> roleId
const availableRoles = ref<any[]>([])
const selectedRoles = ref<string[]>([]) // Selected role IDs for this game's deck
let botCheckInterval: NodeJS.Timeout | null = null

// Valid transitions map
const VALID_TRANSITIONS: Record<string, string[]> = {
  SETUP: ['CAPTAIN_APPLICATION', 'FIRST_NIGHT', 'END'],
  CAPTAIN_APPLICATION: ['CAPTAIN_SPIN', 'CAPTAIN_VOTE'],
  CAPTAIN_SPIN: ['CAPTAIN_VOTE'],
  CAPTAIN_VOTE: ['FIRST_NIGHT'],
  FIRST_NIGHT: ['DAY'],
  DAY: ['VOTE', 'NIGHT', 'END'],
  VOTE: ['DAY', 'NIGHT', 'END'],
  NIGHT: ['DAY', 'END'],
  END: ['SETUP'],
}

onMounted(async () => {
  const id = route.params.id as string
  await gameStore.fetchGame(id)
  loading.value = false
  
  // Start bot status checking if in SETUP phase
  if (gameStore.currentPhase === 'SETUP') {
    startBotStatusCheck()
    await fetchAvailableRoles()
  }
})

onUnmounted(() => {
  if (botCheckInterval) {
    clearInterval(botCheckInterval)
  }
})

const phaseClass = computed(() => {
  const p = gameStore.currentPhase
  if (p.includes('NIGHT') || p === 'FIRST_NIGHT') return 'night'
  if (p === 'DAY' || p === 'VOTE') return 'day'
  if (p === 'END') return 'end'
  return 'setup'
})

const phaseIcon = computed(() => getPhaseIcon(gameStore.currentPhase))

const isNightPhase = computed(() =>
  gameStore.currentPhase === 'NIGHT' || gameStore.currentPhase === 'FIRST_NIGHT'
)

const inputPlaceholder = computed(() => {
  if (inputType.value === 'name') return 'Ex: Jean Dupont'
  if (inputType.value === 'user') return 'Ex: 123456789012345678'
  return 'Ex: 987654321098765432'
})

const addButtonIcon = computed(() => {
  if (inputType.value === 'name') return '+'
  if (inputType.value === 'user') return '🆔'
  return '🔍'
})

const availableTransitions = computed(() =>
  VALID_TRANSITIONS[gameStore.currentPhase] || []
)

const reversedLogs = computed(() =>
  [...(gameStore.currentGame?.logs || [])].reverse()
)

function getPhaseIcon(phase: string): string {
  const icons: Record<string, string> = {
    SETUP: '⚙️',
    CAPTAIN_APPLICATION: '🙋',
    CAPTAIN_SPIN: '🎡',
    CAPTAIN_VOTE: '🗳️',
    FIRST_NIGHT: '🌙',
    DAY: '☀️',
    VOTE: '🗳️',
    NIGHT: '🌙',
    END: '🏁',
  }
  return icons[phase] || '❓'
}

function getTransitionClass(target: string): string {
  if (target.includes('NIGHT') || target === 'FIRST_NIGHT') return 'btn-night'
  if (target === 'DAY') return 'btn-day'
  if (target === 'END') return 'btn-end'
  return 'btn-default'
}

function formatPhase(phase: string): string {
  const labels: Record<string, string> = {
    SETUP: 'Préparation',
    CAPTAIN_APPLICATION: 'Candidature Capitaine',
    CAPTAIN_SPIN: 'Tirage Capitaine',
    CAPTAIN_VOTE: 'Vote Capitaine',
    FIRST_NIGHT: 'Première Nuit',
    DAY: 'Jour',
    VOTE: 'Vote',
    NIGHT: 'Nuit',
    END: 'Fin',
  }
  return labels[phase] || phase.replace(/_/g, ' ')
}

function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(date: string | Date | undefined): string {
  if (!date) return ''
  return new Date(date).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function transitionTo(target: string) {
  await gameStore.transitionPhase(target as GameStatus)

  if (target === 'VOTE') {
    votes.value = {}
  }
  if (target === 'NIGHT' || target === 'FIRST_NIGHT') {
    nightActions.value = []
  }
}

async function doAction(action: string, playerId: string) {
  await gameStore.performAction(action, playerId)
}

// Legacy function - kept for compatibility
async function addPlayer() {
  if (!newPlayerName.value.trim() || !gameStore.currentGame) return
  const players = [
    ...gameStore.currentGame.players,
    { id: crypto.randomUUID(), name: newPlayerName.value.trim(), isAlive: true, isCaptain: false, isInfected: false },
  ]
  await gameStore.updatePlayers(players)
  newPlayerName.value = ''
}

async function submitVoteResults() {
  if (!gameStore.currentGame) return
  const voteList = Object.entries(votes.value)
    .filter(([_, target]) => target)
    .map(([voterId, target]) => {
      const player = gameStore.currentGame!.players.find(p => p.id === voterId)
      return {
        voter: player?.name || voterId,
        target: gameStore.currentGame!.players.find(p => p.id === target)?.name || target,
        weight: player?.isCaptain ? 2 : 1,
      }
    })

  await gameStore.submitVotes(gameStore.currentGame.dayNumber || 1, voteList)
}

async function submitNightActions() {
  if (!gameStore.currentGame) return
  const validActions = nightActions.value.filter(a => a.role && a.target)
  await gameStore.submitNightLog(gameStore.currentGame.nightNumber, validActions)
}

async function forceEnd() {
  if (confirm('Forcer la fin de cette partie ?')) {
    try {
      await gameStore.transitionPhase('END' as GameStatus)
      alert('✅ Partie terminée !')
      // Redirect to dashboard after ending
      navigateTo('/dashboard')
    } catch (error: any) {
      alert('❌ Erreur: ' + (error?.data?.statusMessage || 'Impossible de terminer la partie'))
    }
  }
}

async function copyLogs() {
  const logs = gameStore.currentGame?.logs
    .map(l => `[${formatTime(l.timestamp)}] ${l.message}`)
    .join('\n')
  if (logs) {
    await navigator.clipboard.writeText(logs)
  }
}

async function exportStory() {
  const result = await gameStore.getStory()
  if (result?.story) {
    await navigator.clipboard.writeText(result.story)
    alert('Histoire copiée !')
  }
}

// ─── Setup Phase Functions ─────────────────────────────────

async function fetchAvailableRoles() {
  try {
    const res = await $fetch<any>('/api/roles')
    if (res.success) {
      availableRoles.value = res.data
    }
  } catch (error) {
    console.error('Failed to fetch roles:', error)
  }
}

function startBotStatusCheck() {
  checkBotStatus() // Check immediately
  botCheckInterval = setInterval(checkBotStatus, 10000) // Check every 10s
}

async function checkBotStatus() {
  try {
    const data = await $fetch('/api/discord/state')
    const now = Date.now()
    botAlive.value = !!(data.bot.lastHeartbeat && (now - data.bot.lastHeartbeat) < 15000)
  } catch (error) {
    botAlive.value = false
  }
}

// Smart input detection
function updateInputHint() {
  const input = smartInput.value.trim()
  
  if (!input) {
    inputHint.value = 'Entrez un nom, un ID utilisateur, ou un ID salon'
    inputType.value = 'name'
    return
  }
  
  // Check if it's a Discord ID (18-19 digit number)
  if (/^\d{17,19}$/.test(input)) {
    // Could be user ID or channel ID - default to user
    inputType.value = 'user'
    inputHint.value = '🆔 ID Discord détecté → Recherche d\'utilisateur (ou salon si introuvable)'
  } else {
    // It's a name
    inputType.value = 'name'
    inputHint.value = '✍️ Nom détecté → Ajout manuel'
  }
}

async function handleSmartAdd() {
  const input = smartInput.value.trim()
  if (!input || isProcessing.value) return
  
  updateInputHint() // Ensure type is detected
  
  if (inputType.value === 'name') {
    await addPlayerByName(input)
  } else {
    // It's a Discord ID - try as user first, then channel if needed
    await addByDiscordId(input)
  }
}

async function addPlayerByName(name: string) {
  if (!gameStore.currentGame) return
  
  try {
    isProcessing.value = true
    const players = [
      ...gameStore.currentGame.players,
      { 
        id: crypto.randomUUID(), 
        name, 
        isAlive: true, 
        isCaptain: false, 
        isInfected: false 
      },
    ]
    await gameStore.updatePlayers(players)
    smartInput.value = ''
    inputHint.value = '✅ Joueur ajouté !'
    setTimeout(() => {
      inputHint.value = 'Entrez un nom, un ID utilisateur, ou un ID salon'
    }, 2000)
  } catch (error: any) {
    inputHint.value = '❌ Erreur lors de l\'ajout'
  } finally {
    isProcessing.value = false
  }
}

async function addByDiscordId(discordId: string) {
  if (!gameStore.currentGame) return
  
  if (!botAlive.value) {
    inputHint.value = '⚠️ Le bot Discord n\'est pas connecté'
    return
  }
  
  try {
    isProcessing.value = true
    
    // Try as user ID first
    try {
      await $fetch('/api/discord/request-fetch', {
        method: 'POST',
        body: { 
          discordId,
          gameId: gameStore.currentGame._id,
        },
      })
      
      inputHint.value = '⏳ Recherche de l\'utilisateur...'
      
      // Poll for result with timeout
      let attempts = 0
      const maxAttempts = 10
      const checkInterval = setInterval(async () => {
        attempts++
        await refreshGame()
        
        // Check if player was added
        const playerExists = gameStore.currentGame?.players.some(
          p => p.discordId === discordId
        )
        
        if (playerExists || attempts >= maxAttempts) {
          clearInterval(checkInterval)
          isProcessing.value = false
          
          if (playerExists) {
            smartInput.value = ''
            inputHint.value = '✅ Utilisateur Discord ajouté !'
            setTimeout(() => {
              inputHint.value = 'Entrez un nom, un ID utilisateur, ou un ID salon'
            }, 2000)
          } else {
            // Not found as user, try as channel
            inputHint.value = '👤 Utilisateur introuvable. Essai en tant que salon...'
            await scanChannelById(discordId)
          }
        }
      }, 500)
      
    } catch (error: any) {
      // If user fetch fails, try as channel
      inputHint.value = '🔍 Tentative de scan du salon...'
      await scanChannelById(discordId)
    }
    
  } catch (error: any) {
    inputHint.value = '❌ ' + (error?.data?.statusMessage || 'Erreur')
    isProcessing.value = false
  }
}

async function scanChannelById(channelId: string) {
  if (!gameStore.currentGame) return
  
  try {
    await $fetch('/api/discord/request-scan', {
      method: 'POST',
      body: {
        channelId,
        gameId: gameStore.currentGame._id,
      },
    })
    
    inputHint.value = '⏳ Scan du salon en cours...'
    
    // Poll for results
    let attempts = 0
    const maxAttempts = 10
    const initialPlayerCount = gameStore.currentGame.players.length
    
    const checkInterval = setInterval(async () => {
      attempts++
      await refreshGame()
      
      const newPlayerCount = gameStore.currentGame?.players.length || 0
      const playersAdded = newPlayerCount - initialPlayerCount
      
      if (playersAdded > 0 || attempts >= maxAttempts) {
        clearInterval(checkInterval)
        isProcessing.value = false
        
        if (playersAdded > 0) {
          smartInput.value = ''
          inputHint.value = `✅ ${playersAdded} joueur(s) ajouté(s) depuis le salon !`
          setTimeout(() => {
            inputHint.value = 'Entrez un nom, un ID utilisateur, ou un ID salon'
          }, 3000)
        } else {
          inputHint.value = '❌ Aucun joueur trouvé dans le salon'
          setTimeout(() => {
            inputHint.value = 'Entrez un nom, un ID utilisateur, ou un ID salon'
          }, 3000)
        }
      }
    }, 500)
    
  } catch (error: any) {
    inputHint.value = '❌ Impossible de scanner le salon'
    isProcessing.value = false
  }
}

async function assignRole(playerId: string, roleId: string) {
  if (!gameStore.currentGame) return
  
  // Update local state
  playerRoles.value[playerId] = roleId
  
  // Find the role name (you'll need to fetch from grimoire or store)
  // For now, just update the playerId -> roleId mapping
  // The actual role assignment will be handled when needed
}

async function saveRoleAssignments() {
  if (!gameStore.currentGame) return
  
  try {
    const players = gameStore.currentGame.players.map(player => ({
      ...player,
      roleId: playerRoles.value[player.id] || undefined,
    }))
    
    await gameStore.updatePlayers(players)
    alert('✅ Rôles assignés !')
  } catch (error: any) {
    alert('❌ Erreur: ' + (error?.data?.statusMessage || 'Impossible d\'assigner les rôles'))
  }
}

function getRolesByTeam(team: string) {
  return availableRoles.value.filter(role => role.team === team)
}

function toggleRole(roleId: string) {
  const index = selectedRoles.value.indexOf(roleId)
  if (index > -1) {
    selectedRoles.value.splice(index, 1)
  } else {
    selectedRoles.value.push(roleId)
  }
}

function selectedRolesByTeam(team: string) {
  return selectedRoles.value.filter(roleId => {
    const role = availableRoles.value.find(r => r._id === roleId)
    return role && role.team === team
  })
}

function getRoleName(roleId: string) {
  const role = availableRoles.value.find(r => r._id === roleId)
  return role ? role.name : 'Unknown'
}

async function removePlayer(playerId: string) {
  if (!gameStore.currentGame) return
  const players = gameStore.currentGame.players.filter(p => p.id !== playerId)
  await gameStore.updatePlayers(players)
  // Also remove role assignment
  delete playerRoles.value[playerId]
}

async function startGame() {
  if (!gameStore.currentGame?.players.length) {
    alert('⚠️ Ajoutez au moins un joueur')
    return
  }
  
  // Save role assignments first
  await saveRoleAssignments()
  
  // Transition to first night
  await transitionTo('FIRST_NIGHT')
}

async function refreshGame() {
  if (gameStore.currentGame) {
    await gameStore.fetchGame(gameStore.currentGame._id)
  }
}
</script>

<style lang="scss">
@use '~/assets/scss/variables' as *;

.game-page {
  background:
    radial-gradient(ellipse at 30% 20%, rgba($violet-600, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba($pink-400, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba($violet-800, 0.2) 0%, transparent 70%);
}

.game-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
  color: $text-muted;
}

// ─── Game Ended Banner ──────────────────────────────────────
.game-ended-banner {
  background: linear-gradient(135deg, rgba($violet-600, 0.15), rgba($pink-500, 0.1));
  border: 2px solid rgba($violet-400, 0.3);
  border-radius: $radius-lg;
  padding: 3rem 2rem;
  margin-bottom: 2rem;
  text-align: center;
  
  .ended-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  
  .ended-icon {
    font-size: 4rem;
    animation: gentle-glow 3s ease-in-out infinite;
  }
  
  .ended-title {
    @include elegant-text();
    font-size: 2rem;
    font-weight: 700;
    color: $text-primary;
  }
  
  .ended-subtitle {
    font-size: 1rem;
    color: $text-secondary;
    margin-bottom: 1rem;
  }
  
  .ended-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }
}

// ─── Setup Interface (Redesigned) ───────────────────────────
.setup-interface {
  padding: 0 1rem 2rem;
}

.setup-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
}

.setup-panel {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  height: fit-content;
}

.panel-header-setup {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba($violet-400, 0.2);
}

.panel-title-setup {
  @include elegant-text();
  font-size: 1.3rem;
  font-weight: 700;
  background: linear-gradient(135deg, $violet-300, $pink-400);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 4px;
}

.panel-subtitle {
  font-size: 0.82rem;
  color: $text-muted;
}

.bot-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: $radius-lg;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba($violet-400, 0.2);
}

.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: $wolf-red;
  box-shadow: 0 0 8px rgba($wolf-red, 0.6);
  animation: pulse-red 2s ease-in-out infinite;

  &.online {
    background: $village-green;
    box-shadow: 0 0 8px rgba($village-green, 0.6);
    animation: pulse-green 2s ease-in-out infinite;
  }
}

.status-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: $text-secondary;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

// Role Categories
.role-categories {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.role-category {
  border-radius: $radius-lg;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all $transition-base;

  &.wolf-category {
    border-left: 3px solid $wolf-red;
    &:hover { background: rgba($wolf-red, 0.05); }
  }

  &.village-category {
    border-left: 3px solid $village-green;
    &:hover { background: rgba($village-green, 0.05); }
  }

  &.neutral-category {
    border-left: 3px solid $violet-400;
    &:hover { background: rgba($violet-400, 0.05); }
  }
}

.category-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.category-icon {
  font-size: 1.3rem;
}

.category-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: $text-primary;
  flex: 1;
}

.category-count {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 100px;
  background: rgba($violet-500, 0.2);
  color: $violet-200;
}

.role-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.role-chip {
  padding: 7px 14px;
  border-radius: $radius-lg;
  border: 1px solid rgba($violet-400, 0.3);
  background: rgba(0, 0, 0, 0.2);
  color: $text-secondary;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    border-color: $violet-400;
    background: rgba($violet-500, 0.1);
    color: $text-primary;
    transform: translateY(-2px);
  }

  &.selected {
    border-color: $violet-400;
    background: linear-gradient(135deg, rgba($violet-500, 0.3), rgba($pink-500, 0.2));
    color: $violet-100;
    box-shadow: $glow-violet;
  }
}

.deck-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: $radius-lg;
  background: linear-gradient(135deg, rgba($violet-600, 0.15), rgba($pink-500, 0.1));
  border: 1px solid rgba($violet-400, 0.3);
}

.summary-label {
  font-size: 0.85rem;
  color: $text-secondary;
  font-weight: 600;
}

.summary-count {
  font-size: 0.9rem;
  font-weight: 700;
  color: $violet-200;
}

// Player Addition
.player-addition {
  margin-bottom: 1.5rem;
}

.smart-input-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.method-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  color: $text-secondary;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.label-icon {
  font-size: 1rem;
}

.input-hint {
  font-size: 0.75rem;
  color: $text-muted;
  min-height: 18px;
  transition: all $transition-fast;
  
  &:empty::before {
    content: '\u200b'; // Zero-width space to maintain height
  }
}

.input-row {
  display: flex;
  gap: 10px;
}

.input-modern {
  flex: 1;
  padding: 12px 16px;
  border-radius: $radius-lg;
  border: 1px solid rgba($violet-400, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: $text-primary;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all $transition-fast;

  &:focus {
    outline: none;
    border-color: $violet-400;
    box-shadow: $glow-violet;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::placeholder {
    color: $text-muted;
  }
}

.btn-add {
  width: 48px;
  height: 48px;
  border-radius: $radius-lg;
  border: 1px solid rgba($violet-400, 0.3);
  background: linear-gradient(135deg, rgba($violet-500, 0.2), rgba($pink-500, 0.1));
  color: $violet-200;
  font-size: 1.3rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    border-color: $violet-400;
    background: linear-gradient(135deg, rgba($violet-500, 0.3), rgba($pink-500, 0.2));
    box-shadow: $glow-violet;
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

// Players Setup List
.players-setup-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 1rem;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba($violet-400, 0.3);
    border-radius: 3px;

    &:hover {
      background: rgba($violet-400, 0.5);
    }
  }
}

.player-setup-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: $radius-lg;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba($violet-400, 0.2);
  margin-bottom: 10px;
  transition: all $transition-fast;

  &:hover {
    border-color: $violet-400;
    background: rgba($violet-500, 0.05);
    transform: translateX(4px);
  }
}

.player-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.player-avatar-setup {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba($violet-500, 0.3), rgba($pink-400, 0.2));
  border: 2px solid rgba($violet-400, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  color: $violet-100;
}

.player-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.player-name-setup {
  font-size: 0.9rem;
  font-weight: 700;
  color: $text-primary;
}

.player-badge {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: $radius-sm;
  font-weight: 700;
  width: fit-content;

  &.discord-badge {
    background: rgba($violet-500, 0.2);
    color: $violet-200;
    border: 1px solid rgba($violet-400, 0.3);
  }
}

.player-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.role-select-modern {
  min-width: 160px;
  padding: 8px 12px;
  border-radius: $radius-md;
  border: 1px solid rgba($violet-400, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: $text-primary;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;

  &:focus {
    outline: none;
    border-color: $violet-400;
    box-shadow: $glow-violet;
  }
}

.btn-remove {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba($wolf-red, 0.3);
  background: rgba($wolf-red, 0.1);
  color: $wolf-red;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: $wolf-red;
    background: rgba($wolf-red, 0.2);
    box-shadow: $glow-red;
    transform: scale(1.1);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  opacity: 0.3;
  margin-bottom: 1rem;
}

.empty-text {
  font-size: 1rem;
  font-weight: 700;
  color: $text-secondary;
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.85rem;
  color: $text-muted;
}

.setup-actions {
  padding-top: 1rem;
  border-top: 2px solid rgba($violet-400, 0.2);
}

.btn-start-game {
  width: 100%;
  padding: 14px 24px;
  border-radius: $radius-lg;
  border: 2px solid $violet-400;
  background: linear-gradient(135deg, rgba($violet-500, 0.3), rgba($pink-500, 0.2));
  color: $violet-100;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-base;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: $glow-violet;

  .btn-icon {
    font-size: 1.4rem;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba($violet-500, 0.4);
    background: linear-gradient(135deg, rgba($violet-500, 0.4), rgba($pink-500, 0.3));
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse-green {
  0%, 100% { box-shadow: 0 0 0 0 rgba($village-green, 0.7); }
  50% { box-shadow: 0 0 0 6px rgba($village-green, 0); }
}

@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba($wolf-red, 0.7); }
  50% { box-shadow: 0 0 0 6px rgba($wolf-red, 0); }
}

// ─── Phase Banner ───────────────────────────────────────────
.phase-banner {
  text-align: center;
  padding: 36px 0;
  margin-bottom: 28px;
  transition: all $transition-cinematic;

  .phase-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .phase-icon {
    font-size: 3rem;
    animation: gentle-glow 3s ease-in-out infinite;
  }

  .phase-title {
    @include elegant-text();
    font-size: 2rem;
    font-weight: 700;
    font-style: italic;
  }

  .phase-info {
    font-size: 0.85rem;
    color: $text-secondary;
  }

  &.night {
    .phase-title {
      background: linear-gradient(135deg, $violet-200, $violet-400);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }

  &.day {
    .phase-title {
      background: linear-gradient(135deg, $day-accent, #fde68a);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }

  &.end {
    .phase-title {
      background: linear-gradient(135deg, $rose-300, $rose-400);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }
}

// ─── Game Grid ──────────────────────────────────────────────
.game-grid {
  display: grid;
  grid-template-columns: 300px 1fr 300px;
  gap: 20px;
  align-items: start;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
}

// ─── Panel Common ───────────────────────────────────────────
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-title {
  @include elegant-text();
  font-size: 0.88rem;
  font-style: italic;
  color: $violet-300;
}

// ─── Players Panel ──────────────────────────────────────────
.player-count {
  font-size: 0.75rem;
  color: $text-muted;
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.player-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: $radius-md;
  @include glass(0.04);
  transition: all $transition-fast;

  &:hover {
    background: $bg-glass-hover;
  }

  &.dead {
    opacity: 0.4;
  }

  &.captain {
    border-left: 3px solid $day-accent;
  }

  &.infected {
    border-left: 3px solid $wolf-red;
  }
}

.player-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba($violet-500, 0.2), rgba($pink-400, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  color: $violet-200;
  flex-shrink: 0;
  border: 1px solid rgba($violet-400, 0.15);

  &.dead {
    background: rgba(100, 100, 100, 0.2);
    border-color: rgba(100, 100, 100, 0.15);
    color: rgba(150, 150, 150, 0.5);
  }
}

.player-info {
  flex: 1;
  min-width: 0;
}

.player-name {
  font-size: 0.85rem;
  font-weight: 700;
}

.player-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;

  span {
    font-size: 0.6rem;
    padding: 2px 6px;
    border-radius: 100px;
  }
}

.badge-captain {
  background: rgba($day-accent, 0.12);
  color: $day-accent;
  border: 1px solid rgba($day-accent, 0.2);
}

.badge-dead {
  background: rgba(150, 150, 150, 0.1);
  color: #999;
}

.player-actions {
  display: flex;
  gap: 4px;
}

.btn-action {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: $radius-sm;
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  font-size: 0.75rem;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    transform: scale(1.15);
  }

  &.kill:hover { background: rgba($wolf-red, 0.15); }
  &.revive:hover { background: rgba($village-green, 0.15); }
  &.infect:hover { background: rgba($wolf-red, 0.1); }
  &.captain:hover { background: rgba($day-accent, 0.15); }
}

.add-player {
  display: flex;
  gap: 8px;
  margin-top: 10px;

  .input { flex: 1; padding: 9px 14px; font-size: 0.82rem; }
  .add-btn { padding: 9px 16px; border-radius: $radius-md; }
}

// ─── Phase Controls ─────────────────────────────────────────
.transition-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.transition-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 20px;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  background: transparent;
  color: $text-primary;
  font-family: $font-body;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;

  .transition-icon { font-size: 1.2rem; }

  &:hover {
    transform: translateX(6px);
  }

  &.btn-night {
    border-color: rgba($violet-400, 0.2);
    &:hover { background: rgba($violet-500, 0.08); box-shadow: $glow-violet; }
  }

  &.btn-day {
    border-color: rgba($day-accent, 0.2);
    &:hover { background: rgba($day-accent, 0.08); }
  }

  &.btn-end {
    border-color: rgba($wolf-red, 0.2);
    &:hover { background: rgba($wolf-red, 0.08); box-shadow: $glow-red; }
  }

  &.btn-default {
    &:hover { background: $bg-glass-hover; }
  }
}

// ─── Vote Panel ─────────────────────────────────────────────
.vote-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.vote-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.voter-name {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 600;
}

.vote-weight {
  font-size: 0.72rem;
  color: $day-accent;
  font-weight: 700;
}

.vote-select {
  width: 140px;
  padding: 7px 12px;
  font-size: 0.8rem;
}

// ─── Night Panel ────────────────────────────────────────────
.night-hint {
  font-size: 0.82rem;
  color: $text-muted;
  margin-top: 6px;
}

.night-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.night-action-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr auto;
  gap: 6px;

  .input {
    padding: 7px 10px;
    font-size: 0.8rem;
  }

  .btn-ghost {
    padding: 7px 10px;
    font-size: 0.8rem;
  }
}

// ─── Override Panel ─────────────────────────────────────────
.override-panel {
  margin-top: 16px;
}

.override-buttons {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;

  .btn-danger, .btn-ghost {
    flex: 1;
    font-size: 0.82rem;
    padding: 11px;
  }
}

// ─── Log Panel ──────────────────────────────────────────────
.log-entries {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 500px;
  overflow-y: auto;
}

.log-entry {
  display: flex;
  gap: 8px;
  padding: 7px 12px;
  border-radius: $radius-sm;
  font-size: 0.78rem;
  @include glass(0.03);

  .log-time {
    color: $text-muted;
    font-size: 0.7rem;
    flex-shrink: 0;
  }

  .log-message {
    flex: 1;
    color: $text-secondary;
  }

  &.death {
    border-left: 2px solid $wolf-red;
    .log-message { color: $wolf-red; }
  }

  &.action {
    border-left: 2px solid $violet-400;
    .log-message { color: $violet-300; }
  }

  &.system {
    .log-message { color: $text-muted; font-style: italic; }
  }
}

// ─── Game Not Found ─────────────────────────────────────────
.game-not-found {
  text-align: center;
  padding: 60px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: $text-muted;

  .not-found-icon {
    font-size: 3rem;
    opacity: 0.4;
  }
}
</style>
