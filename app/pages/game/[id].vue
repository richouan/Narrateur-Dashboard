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

        <!-- Setup Phase Interface (3-Column Layout) -->
        <div v-if="gameStore.currentPhase === 'SETUP'" class="setup-interface">
          <div class="setup-grid-three">
            <!-- Left Panel: Role Grimoire -->
            <div class="setup-panel-left glass-card">
              <div class="panel-header-setup">
                <h2 class="panel-title-setup">📖 Grimoire des Rôles</h2>
              </div>

              <!-- Role Search -->
              <div class="role-search-container">
                <input
                  v-model="roleSearchQuery"
                  type="text"
                  class="role-search-input"
                  placeholder="🔍 Rechercher un rôle..."
                />
                <button
                  class="btn-clear-roles"
                  @click="clearAllRoles"
                  title="Désélectionner tous les rôles"
                  :disabled="totalRoleCount === 0"
                >
                  🗑️
                </button>
              </div>

              <div class="grimoire-scroll">
                <!-- Wolves -->
                <div class="grimoire-section">
                  <div class="grimoire-header wolf-header">
                    <span class="grimoire-icon">🐺</span>
                    <h3 class="grimoire-title">Loups-Garous</h3>
                  </div>
                  <div class="grimoire-roles">
                    <button
                      v-for="role in getRolesByTeam('WOLF')"
                      :key="role._id"
                      class="role-card-grimoire"
                      :class="{ selected: (roleQuantities[role._id] || 0) > 0, 'non-unique': !role.isUnique }"
                      @click="role.isUnique ? toggleRole(role._id) : incrementRole(role._id)"
                    >
                      <div class="role-card-header">
                        <span class="role-card-name">{{ role.name }}</span>
                        <div v-if="role.isUnique" class="role-check-unique">
                          <span v-if="(roleQuantities[role._id] || 0) > 0" class="role-check">✓</span>
                        </div>
                        <div v-else class="role-quantity-controls">
                          <button class="btn-qty" @click.stop="decrementRole(role._id)" :disabled="!(roleQuantities[role._id] || 0)">−</button>
                          <span class="qty-display">{{ roleQuantities[role._id] || 0 }}</span>
                          <button class="btn-qty" @click.stop="incrementRole(role._id)">+</button>
                        </div>
                      </div>
                      <p class="role-card-desc">{{ role.description || 'Rôle des loups-garous' }}</p>
                    </button>
                  </div>
                </div>

                <!-- Villagers -->
                <div class="grimoire-section">
                  <div class="grimoire-header village-header">
                    <span class="grimoire-icon">🏘️</span>
                    <h3 class="grimoire-title">Villageois</h3>
                  </div>
                  <div class="grimoire-roles">
                    <button
                      v-for="role in getRolesByTeam('VILLAGER')"
                      :key="role._id"
                      class="role-card-grimoire"
                      :class="{ selected: (roleQuantities[role._id] || 0) > 0, 'non-unique': !role.isUnique }"
                      @click="role.isUnique ? toggleRole(role._id) : incrementRole(role._id)"
                    >
                      <div class="role-card-header">
                        <span class="role-card-name">{{ role.name }}</span>
                        <div v-if="role.isUnique" class="role-check-unique">
                          <span v-if="(roleQuantities[role._id] || 0) > 0" class="role-check">✓</span>
                        </div>
                        <div v-else class="role-quantity-controls">
                          <button class="btn-qty" @click.stop="decrementRole(role._id)" :disabled="!(roleQuantities[role._id] || 0)">−</button>
                          <span class="qty-display">{{ roleQuantities[role._id] || 0 }}</span>
                          <button class="btn-qty" @click.stop="incrementRole(role._id)">+</button>
                        </div>
                      </div>
                      <p class="role-card-desc">{{ role.description || 'Rôle du village' }}</p>
                    </button>
                  </div>
                </div>

                <!-- Neutrals -->
                <div class="grimoire-section">
                  <div class="grimoire-header neutral-header">
                    <span class="grimoire-icon">⚖️</span>
                    <h3 class="grimoire-title">Neutres</h3>
                  </div>
                  <div class="grimoire-roles">
                    <button
                      v-for="role in getRolesByTeam('NEUTRAL')"
                      :key="role._id"
                      class="role-card-grimoire"
                      :class="{ selected: (roleQuantities[role._id] || 0) > 0, 'non-unique': !role.isUnique }"
                      @click="role.isUnique ? toggleRole(role._id) : incrementRole(role._id)"
                    >
                      <div class="role-card-header">
                        <span class="role-card-name">{{ role.name }}</span>
                        <div v-if="role.isUnique" class="role-check-unique">
                          <span v-if="(roleQuantities[role._id] || 0) > 0" class="role-check">✓</span>
                        </div>
                        <div v-else class="role-quantity-controls">
                          <button class="btn-qty" @click.stop="decrementRole(role._id)" :disabled="!(roleQuantities[role._id] || 0)">−</button>
                          <span class="qty-display">{{ roleQuantities[role._id] || 0 }}</span>
                          <button class="btn-qty" @click.stop="incrementRole(role._id)">+</button>
                        </div>
                      </div>
                      <p class="role-card-desc">{{ role.description || 'Rôle neutre' }}</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Center Panel: Player Management -->
            <div class="setup-panel-center glass-card">
              <div class="panel-header-with-input">
                <div class="header-left">
                  <h2 class="panel-title-setup">👥 Joueurs</h2>
                  <div class="count-badge player-badge">
                    <span class="badge-value">{{ gameStore.currentGame?.players.length || 0 }}</span>
                  </div>
                </div>
                
                <!-- Smart Player Addition (Inline) -->
                <div class="player-addition-inline">
                  <input
                    ref="smartInputRef"
                    v-model="smartInput"
                    class="input-modern-inline"
                    :placeholder="inputPlaceholder"
                    :disabled="isProcessing"
                    @keyup.enter="handleSmartAdd"
                    @input="updateInputHint"
                  />
                  <button
                    class="btn-add-inline"
                    :disabled="!smartInput.trim() || isProcessing"
                    @click="handleSmartAdd"
                  >
                    <span v-if="isProcessing">⏳</span>
                    <span v-else>+</span>
                  </button>
                </div>
                
                <div class="bot-status-mini">
                  <span class="status-dot-mini" :class="{ online: botAlive }"></span>
                </div>
              </div>
              <div v-if="inputHint" class="input-hint-compact">{{ inputHint }}</div>

              <!-- Players List with Role Assignment -->
              <div class="players-setup-list-compact">
                <div
                  v-for="player in sortedPlayers"
                  :key="player.id"
                  class="player-card-compact"
                >
                  <div class="player-number-wrapper">
                    <button 
                      class="player-number-select"
                      :class="{ 'has-duplicate': player.number && duplicateNumbers.has(player.number) }"
                      @click="openNumberPicker = openNumberPicker === player.id ? null : player.id"
                    >
                      {{ player.number || '#' }}
                    </button>
                    <div v-if="openNumberPicker === player.id" class="number-picker-dropdown">
                      <button 
                        v-for="n in playerCount" 
                        :key="n" 
                        class="number-option"
                        @click="selectPlayerNumber(player.id, n)"
                      >
                        {{ n }}
                      </button>
                    </div>
                  </div>
                  <div class="player-info-compact">
                    <div class="player-avatar-mini" :class="{ 'has-image': player.avatar }">
                      <img v-if="player.avatar" :src="player.avatar" :alt="player.name" class="avatar-image" />
                      <span v-else>{{ player.name.charAt(0).toUpperCase() }}</span>
                    </div>
                    <div class="player-name-compact">
                      {{ player.name }}
                      <span v-if="player.discordId" class="discord-tag">🎮</span>
                    </div>
                  </div>
                  <select
                    v-model="playerRoles[player.id]"
                    class="role-select-compact"
                    :class="{ 'no-role': !playerRoles[player.id] }"
                    @focus="previousPlayerRoles[player.id] = playerRoles[player.id] || ''"
                    @change="assignRole(player.id, playerRoles[player.id] || '')"
                  >
                    <option value="">--</option>
                    <option
                      v-for="entry in expandedDeckRoles"
                      :key="`${entry.roleId}-${entry.index}`"
                      :value="entry.roleId"
                    >
                      {{ entry.name }}
                    </option>
                  </select>
                  <button class="btn-remove-mini" @click="removePlayer(player.id)">✕</button>
                </div>

                <div v-if="!gameStore.currentGame?.players.length" class="empty-state-compact">
                  <span class="empty-icon-compact">👥</span>
                  <p class="empty-text-compact">Ajoutez des joueurs</p>
                </div>
              </div>

              <!-- Start Game Section -->
              <div class="start-game-section">
                <div class="validation-display-inline" :class="validationState.class">
                  <span class="validation-icon">{{ validationState.icon }}</span>
                  <div class="validation-counts-inline">
                    <span class="count-item">{{ playerCount }} joueurs</span>
                    <span class="count-separator">×</span>
                    <span class="count-item">{{ totalRoleCount }} rôles</span>
                  </div>
                  <div class="validation-message">{{ validationState.message }}</div>
                </div>
                <div class="game-action-buttons">
                  <!-- Reset button -->
                  <button
                    class="btn-reset-assignments"
                    @click="clearPlayerAssignments"
                    title="Réinitialiser toutes les assignations"
                  >
                    🔄
                  </button>
                  
                  <!-- Single button that expands to two halves -->
                  <button
                    v-if="!showRandomModes"
                    class="btn-random-single"
                    @click="showRandomModes = true"
                    :disabled="!canRandomAssign"
                    title="Afficher les options d'assignation aléatoire"
                  >
                    🎲 Aléatoire
                  </button>
                  
                  <!-- Split button with two modes -->
                  <div v-else class="btn-split-random">
                    <button
                      class="btn-random-left"
                      @click="randomAssignRoles('rest')"
                      :disabled="!canRandomAssign"
                      title="Assigner aléatoirement les rôles non-assignés manuellement"
                    >
                      📋 Rest
                    </button>
                    <button
                      class="btn-random-right"
                      @click="randomAssignRoles('full')"
                      :disabled="!canRandomAssign"
                      title="Réassigner tous les rôles aléatoirement"
                    >
                      🎲 Full
                    </button>
                  </div>
                  
                  <button
                    class="btn-start-game-inline"
                    :disabled="!canStartGame"
                    @click="startGame"
                  >
                    🎭 Commencer
                  </button>
                </div>
              </div>
            </div>

            <!-- Right Panel: Selected Deck -->
            <div class="setup-panel-right glass-card">
              <div class="panel-header-setup">
                <div class="header-left">
                  <h2 class="panel-title-setup">🃏 Deck</h2>
                  <div class="count-badge role-badge">
                    <span class="badge-value">{{ totalRoleCount }}</span>
                  </div>
                </div>
                <button class="btn-copy-deck" @click="copyDeck" title="Copier le deck">
                  📋
                </button>
              </div>

              <!-- Deck Summary Stats -->
              <div class="deck-stats">
                <div class="deck-stat wolf-stat">
                  <img class="stat-icon-img" src="https://img.icons8.com/plasticine/100/werewolf.png" alt="werewolf" />
                  <span class="stat-value">{{ getRoleCountByTeam('WOLF') }}</span>
                </div>
                <div class="deck-stat village-stat">
                  <img class="stat-icon-img" src="https://img.icons8.com/emoji/48/hut-emoji.png" alt="hut-emoji" />
                  <span class="stat-value">{{ getRoleCountByTeam('VILLAGER') }}</span>
                </div>
                <div class="deck-stat neutral-stat">
                  <img class="stat-icon-img" src="https://img.icons8.com/color/48/alien.png" alt="alien" />
                  <span class="stat-value">{{ getRoleCountByTeam('NEUTRAL') }}</span>
                </div>
              </div>

              <!-- Selected Roles Log -->
              <div class="deck-log-container">
                <div v-if="totalRoleCount > 0" class="deck-log">
                  <div
                    v-for="(entry, idx) in expandedDeckRoles"
                    :key="`${entry.roleId}-${idx}`"
                    class="deck-log-entry"
                  >
                    <span class="log-number">{{ idx + 1 }}.</span>
                    <span class="log-role-name" :class="getRoleTeamClass(entry.roleId)">{{ entry.name }}</span>
                    <button class="btn-remove-role" @click="decrementRole(entry.roleId)">✕</button>
                  </div>
                </div>

                <div v-else class="empty-deck">
                  <span class="empty-deck-icon">🃏</span>
                  <p class="empty-deck-text">Aucun rôle sélectionné</p>
                  <p class="empty-deck-hint">Cliquez sur les rôles du grimoire</p>
                </div>
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
                v-for="player in sortedPlayers"
                :key="player.id"
                class="player-card"
                :class="{ dead: !player.isAlive, captain: player.isCaptain, infected: player.isInfected }"
              >
                <div class="player-number-badge-game">{{ player.number || '?' }}</div>
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

      <!-- Scan Selection Modal -->
      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="showScanModal" class="modal-overlay" @click="closeScanModal">
            <div class="modal-content scan-modal" @click.stop>
              <div class="modal-header">
                <h2 class="modal-title">👥 Sélectionner les Joueurs</h2>
                <button class="btn-close-modal" @click="closeScanModal">✕</button>
              </div>
              
              <div class="modal-body">
                <div class="modal-info">
                  <p>{{ scannedPlayers.length }} joueur(s) trouvé(s) dans le salon Discord</p>
                  <div class="modal-actions-top">
                    <button class="btn-secondary-sm" @click="selectAllPlayers">Tout sélectionner</button>
                    <button class="btn-secondary-sm" @click="deselectAllPlayers">Tout désélectionner</button>
                  </div>
                </div>

                <div class="scanned-players-list">
                  <div
                    v-for="player in scannedPlayers"
                    :key="player.discordId"
                    class="scanned-player-item"
                    :class="{ selected: selectedPlayerIds.has(player.discordId) }"
                    @click="togglePlayerSelection(player.discordId)"
                  >
                    <input
                      type="checkbox"
                      :checked="selectedPlayerIds.has(player.discordId)"
                      class="player-checkbox"
                      @click.stop="togglePlayerSelection(player.discordId)"
                    />
                    <div class="player-avatar-scan" :class="{ 'has-image': player.avatar }">
                      <img v-if="player.avatar" :src="player.avatar" :alt="player.displayName || player.username" />
                      <span v-else>{{ (player.displayName || player.username).charAt(0).toUpperCase() }}</span>
                    </div>
                    <div class="player-info-scan">
                      <div class="player-name-scan">{{ player.displayName || player.username }}</div>
                      <div class="player-username-scan">@{{ player.username }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="modal-footer">
                <button class="btn-ghost" @click="closeScanModal">Annuler</button>
                <button
                  class="btn-primary"
                  :disabled="selectedPlayerIds.size === 0"
                  @click="addSelectedPlayers"
                >
                  Ajouter {{ selectedPlayerIds.size }} joueur(s)
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import type { GameStatus } from '~/types'

const route = useRoute()
const gameStore = useGameStore()
const { success, error, warning, info, confirm } = useNotification()
const loading = ref(true)
const newPlayerName = ref('')
const votes = ref<Record<string, string>>({})
const nightActions = ref<{ role: string; actor: string; target: string; result: string }[]>([])

// Setup phase state - Smart Input
const smartInput = ref('')
const smartInputRef = ref<HTMLInputElement | null>(null)
const inputHint = ref('Entrez un nom, un ID utilisateur, ou un ID salon')
const inputType = ref<'name' | 'user' | 'channel'>('name')
const botAlive = ref(false)
const isProcessing = ref(false)
const playerRoles = ref<Record<string, string>>({}) // playerId -> roleId
const previousPlayerRoles = ref<Record<string, string>>({}) // Track previous state for swapping
const manualRoleAssignments = ref<Record<string, boolean>>({}) // Track which assignments are manual
const showRandomModes = ref(false) // Track if split button is expanded
const availableRoles = ref<any[]>([])
const roleQuantities = ref<Record<string, number>>({}) // roleId -> quantity
const roleSearchQuery = ref('')
let botCheckInterval: NodeJS.Timeout | null = null
let saveRolesTimeout: NodeJS.Timeout | null = null
let savePlayerRolesTimeout: NodeJS.Timeout | null = null
let saveManualAssignmentsTimeout: NodeJS.Timeout | null = null
let isSavingPlayerRoles = false // Prevent overlapping saves

// Scan selection modal
const showScanModal = ref(false)
const scannedPlayers = ref<Array<{ discordId: string; username: string; displayName?: string; avatar: string }>>([])
const selectedPlayerIds = ref<Set<string>>(new Set())
const openNumberPicker = ref<string | null>(null) // Track which player's number picker is open

// Auto-save role selections
watch(roleQuantities, async (newQuantities) => {
  if (!gameStore.currentGame || gameStore.currentPhase !== 'SETUP') return
  
  const gameId = gameStore.currentGame._id
  
  // Debounce saves
  if (saveRolesTimeout) clearTimeout(saveRolesTimeout)
  
  saveRolesTimeout = setTimeout(async () => {
    try {
      await $fetch(`/api/games/${gameId}/selected-roles`, {
        method: 'PUT',
        body: { selectedRoles: newQuantities },
      })
    } catch (error) {
      console.error('Failed to save role selections:', error)
    }
  }, 2000)
}, { deep: true })

// Auto-save player role assignments
watch(playerRoles, async (newAssignments) => {
  if (!gameStore.currentGame || gameStore.currentPhase !== 'SETUP') return
  
  // Debounce saves
  if (savePlayerRolesTimeout) clearTimeout(savePlayerRolesTimeout)
  
  savePlayerRolesTimeout = setTimeout(async () => {
    // Skip if already saving to prevent conflicts
    if (isSavingPlayerRoles) {
      console.log('[Auto-save] Skipping overlapping save')
      return
    }
    
    try {
      isSavingPlayerRoles = true
      
      const players = gameStore.currentGame!.players.map(player => ({
        ...player,
        roleId: newAssignments[player.id] || undefined,
      }))
      
      await gameStore.updatePlayers(players)
    } catch (error: any) {
      console.error('Failed to save player role assignments:', error)
      // If it's a 409 conflict, the server will retry automatically
      if (error?.statusCode !== 409) {
        console.error('Non-conflict error:', error)
      }
    } finally {
      isSavingPlayerRoles = false
    }
  }, 2500) // Increased debounce to reduce save frequency
}, { deep: true })

// Auto-save manual role assignments tracking
watch(manualRoleAssignments, async (newAssignments) => {
  if (!gameStore.currentGame || gameStore.currentPhase !== 'SETUP') return
  
  const gameId = gameStore.currentGame._id
  
  // Debounce saves
  if (saveManualAssignmentsTimeout) clearTimeout(saveManualAssignmentsTimeout)
  
  saveManualAssignmentsTimeout = setTimeout(async () => {
    try {
      await $fetch(`/api/games/${gameId}/manual-assignments`, {
        method: 'PUT',
        body: { manualRoleAssignments: newAssignments },
      })
    } catch (error) {
      console.error('Failed to save manual role assignments:', error)
    }
  }, 500)
}, { deep: true })

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
    
    // Load saved role selections
    if (gameStore.currentGame?.selectedRoles) {
      roleQuantities.value = { ...gameStore.currentGame.selectedRoles }
    }
    
    // Load saved player role assignments
    if (gameStore.currentGame?.players) {
      const assignments: Record<string, string> = {}
      for (const player of gameStore.currentGame.players) {
        if (player.roleId) {
          assignments[player.id] = player.roleId
        }
      }
      playerRoles.value = assignments
      previousPlayerRoles.value = { ...assignments }
    }
    
    // Load saved manual role assignments tracking
    if (gameStore.currentGame?.manualRoleAssignments) {
      manualRoleAssignments.value = { ...gameStore.currentGame.manualRoleAssignments }
    }
  }
})

onUnmounted(() => {
  if (botCheckInterval) {
    clearInterval(botCheckInterval)
  }
  if (saveRolesTimeout) {
    clearTimeout(saveRolesTimeout)
  }
  if (savePlayerRolesTimeout) {
    clearTimeout(savePlayerRolesTimeout)
  }
  if (saveManualAssignmentsTimeout) {
    clearTimeout(saveManualAssignmentsTimeout)
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

// Player and role counts
const playerCount = computed(() => gameStore.currentGame?.players.length || 0)

const totalRoleCount = computed(() => {
  return Object.values(roleQuantities.value).reduce((sum, qty) => sum + qty, 0)
})

// Expand roles with quantities into a flat array for deck display
const expandedDeckRoles = computed(() => {
  const expanded: Array<{ roleId: string; name: string; index: number }> = []
  
  // Get all role IDs with quantities
  const quantities = roleQuantities.value
  const roleIds = Object.keys(quantities).filter(id => (quantities[id] || 0) > 0)
  
  // Sort by team hierarchy
  const sortedIds = roleIds.sort((a, b) => {
    const roleA = availableRoles.value.find(r => r._id === a)
    const roleB = availableRoles.value.find(r => r._id === b)
    
    const teamOrder = { WOLF: 0, VILLAGER: 1, NEUTRAL: 2 }
    const orderA = teamOrder[roleA?.team as keyof typeof teamOrder] ?? 3
    const orderB = teamOrder[roleB?.team as keyof typeof teamOrder] ?? 3
    
    if (orderA !== orderB) return orderA - orderB
    return (roleA?.name || '').localeCompare(roleB?.name || '')
  })
  
  // Expand each role based on its quantity
  for (const roleId of sortedIds) {
    const role = availableRoles.value.find(r => r._id === roleId)
    const quantity = quantities[roleId] || 0
    
    for (let i = 0; i < quantity; i++) {
      expanded.push({
        roleId,
        name: role?.name || 'Unknown',
        index: i
      })
    }
  }
  
  return expanded
})

// Check if all players have roles assigned
const allPlayersHaveRoles = computed(() => {
  if (!gameStore.currentGame?.players.length) return false
  return gameStore.currentGame.players.every(player => {
    return playerRoles.value[player.id] && playerRoles.value[player.id] !== ''
  })
})

// Check if any role has more players assigned than available quantity
const roleAssignmentsValid = computed(() => {
  const roleUsage: Record<string, number> = {}
  
  // Count how many players are assigned to each role
  for (const roleId of Object.values(playerRoles.value)) {
    if (roleId) {
      roleUsage[roleId] = (roleUsage[roleId] || 0) + 1
    }
  }
  
  // Check if any role has more players than its quantity
  for (const [roleId, count] of Object.entries(roleUsage)) {
    const availableQuantity = roleQuantities.value[roleId] || 0
    if (count > availableQuantity) {
      return false
    }
  }
  
  return true
})

// Validation state for starting game
const canStartGame = computed(() => {
  return playerCount.value > 0 && totalRoleCount.value > 0 && playerCount.value === totalRoleCount.value && allPlayersHaveRoles.value && roleAssignmentsValid.value && !hasDuplicateNumbers.value
})

// Check if random assignment is possible
const canRandomAssign = computed(() => {
  if (!gameStore.currentGame?.players.length) return false
  if (totalRoleCount.value === 0) return false
  if (playerCount.value !== totalRoleCount.value) return false
  
  // Allow randomization as long as basic requirements are met
  // The randomAssignRoles function will handle mode-specific validation
  return true
})

// Sort players by number
const sortedPlayers = computed(() => {
  if (!gameStore.currentGame?.players) return []
  return [...gameStore.currentGame.players].sort((a, b) => {
    const numA = a.number || 999
    const numB = b.number || 999
    return numA - numB
  })
})

// Detect duplicate player numbers
const duplicateNumbers = computed(() => {
  if (!gameStore.currentGame?.players) return new Set<number>()
  const numbers: number[] = []
  const duplicates = new Set<number>()
  
  gameStore.currentGame.players.forEach(player => {
    if (player.number) {
      if (numbers.includes(player.number)) {
        duplicates.add(player.number)
      } else {
        numbers.push(player.number)
      }
    }
  })
  
  return duplicates
})

const hasDuplicateNumbers = computed(() => {
  return duplicateNumbers.value.size > 0
})

const validationState = computed(() => {
  if (playerCount.value === 0) {
    return { icon: '⚠️', message: 'Ajoutez des joueurs', class: 'validation-warning' }
  }
  if (totalRoleCount.value === 0) {
    return { icon: '⚠️', message: 'Sélectionnez des rôles', class: 'validation-warning' }
  }
  if (playerCount.value < totalRoleCount.value) {
    return { icon: '❌', message: 'Pas assez de joueurs', class: 'validation-error' }
  }
  if (playerCount.value > totalRoleCount.value) {
    return { icon: '❌', message: 'Pas assez de rôles', class: 'validation-error' }
  }
  if (!allPlayersHaveRoles.value) {
    return { icon: '❌', message: 'Tous les joueurs doivent avoir un rôle', class: 'validation-error' }
  }
  if (!roleAssignmentsValid.value) {
    return { icon: '❌', message: 'Trop de joueurs assignés à un rôle', class: 'validation-error' }
  }
  if (hasDuplicateNumbers.value) {
    return { icon: '❌', message: 'Deux joueurs ont le même numéro', class: 'validation-error' }
  }
  return { icon: '✅', message: 'Prêt à démarrer !', class: 'validation-success' }
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
    SETUP: 'Lobby',
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
  const confirmed = await confirm(
    'Forcer la fin de cette partie ?',
    'Confirmer la fin de partie'
  )
  
  if (confirmed) {
    try {
      await gameStore.transitionPhase('END' as GameStatus)
      success('✅ Partie terminée !')
      // Redirect to dashboard after ending
      navigateTo('/dashboard')
    } catch (error: any) {
      error('❌ Erreur: ' + (error?.data?.statusMessage || 'Impossible de terminer la partie'))
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
    success('📖 Histoire copiée !')
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
  botCheckInterval = setInterval(checkBotStatus, 60000) // Check every 60s (reduced from 30s)
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
    
    // Keep focus for quick successive additions
    nextTick(() => {
      smartInputRef.value?.focus()
    })
    
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
    
    // Poll for pending results
    let attempts = 0
    const maxAttempts = 15
    
    const checkInterval = setInterval(async () => {
      attempts++
      
      try {
        const result = await $fetch<any>('/api/discord/pending-scan')
        
        if (result.players && result.players.length > 0) {
          // Results ready - show modal
          clearInterval(checkInterval)
          isProcessing.value = false
          scannedPlayers.value = result.players
          selectedPlayerIds.value = new Set(result.players.map((p: any) => p.discordId))
          showScanModal.value = true
          smartInput.value = ''
          inputHint.value = 'Entrez un nom, un ID utilisateur, ou un ID salon'
          return
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(checkInterval)
          isProcessing.value = false
          inputHint.value = '⏱️ Délai d\'attente dépassé'
          setTimeout(() => {
            inputHint.value = 'Entrez un nom, un ID utilisateur, ou un ID salon'
          }, 3000)
        }
      } catch (error) {
        // Keep polling
      }
    }, 500)
    
  } catch (error: any) {
    inputHint.value = '❌ Impossible de scanner le salon'
    isProcessing.value = false
  }
}

// Scan modal functions
function togglePlayerSelection(discordId: string) {
  if (selectedPlayerIds.value.has(discordId)) {
    selectedPlayerIds.value.delete(discordId)
  } else {
    selectedPlayerIds.value.add(discordId)
  }
}

function selectAllPlayers() {
  selectedPlayerIds.value = new Set(scannedPlayers.value.map(p => p.discordId))
}

function deselectAllPlayers() {
  selectedPlayerIds.value.clear()
}

async function addSelectedPlayers() {
  if (!gameStore.currentGame || selectedPlayerIds.value.size === 0) return
  
  try {
    const selected = scannedPlayers.value.filter(p => selectedPlayerIds.value.has(p.discordId))
    
    const result = await $fetch('/api/discord/add-selected', {
      method: 'POST',
      body: {
        gameId: gameStore.currentGame._id,
        selectedPlayers: selected,
      },
    })
    
    if (result.success) {
      await gameStore.fetchGame(gameStore.currentGame._id)
      showScanModal.value = false
      scannedPlayers.value = []
      selectedPlayerIds.value.clear()
    }
  } catch (error) {
    console.error('Failed to add selected players:', error)
    alert('❌ Erreur lors de l\'ajout des joueurs')
  }
}

function closeScanModal() {
  showScanModal.value = false
  scannedPlayers.value = []
  selectedPlayerIds.value.clear()
}

async function assignRole(playerId: string, roleId: string) {
  if (!gameStore.currentGame) return
  
  // Get the OLD role from the tracked previous state (before v-model updated)
  const currentPlayerOldRole = previousPlayerRoles.value[playerId] || ''
  
  // If assigning an empty role ("--"), just clear it
  if (!roleId) {
    playerRoles.value[playerId] = ''
    previousPlayerRoles.value[playerId] = ''
    manualRoleAssignments.value[playerId] = false
    return
  }
  
  // Find the role to check if it's unique
  const role = availableRoles.value.find(r => r._id === roleId)
  if (!role) return
  
  // Only apply swap logic for UNIQUE roles
  if (role.isUnique) {
    // Check if another player already has this unique role assigned
    for (const [otherPlayerId, assignedRoleId] of Object.entries(playerRoles.value)) {
      if (otherPlayerId !== playerId && assignedRoleId === roleId) {
        // Found another player with this unique role - SWAP roles
        if (currentPlayerOldRole) {
          // Current player has a role, give it to the other player
          playerRoles.value[otherPlayerId] = currentPlayerOldRole
          previousPlayerRoles.value[otherPlayerId] = currentPlayerOldRole
          // Mark the other player's new assignment as manual too
          manualRoleAssignments.value[otherPlayerId] = true
        } else {
          // Current player has no role, just unassign from other player
          playerRoles.value[otherPlayerId] = ''
          previousPlayerRoles.value[otherPlayerId] = ''
          manualRoleAssignments.value[otherPlayerId] = false
        }
        break
      }
    }
  } else {
    // For non-unique roles, check if we've exceeded the available quantity
    const availableQuantity = roleQuantities.value[roleId] || 0
    
    // Count how many OTHER players have this role (not including current player)
    const othersWithRole = Object.entries(playerRoles.value)
      .filter(([pid, rid]) => pid !== playerId && rid === roleId)
      .length
    
    // If other players already fill all available slots, can't assign to current player
    if (othersWithRole >= availableQuantity) {
      // Revert the selection
      playerRoles.value[playerId] = currentPlayerOldRole
      previousPlayerRoles.value[playerId] = currentPlayerOldRole
      warning(`⚠️ Impossible d'assigner ${role.name} : tous les exemplaires sont déjà attribués (${availableQuantity} disponibles)`)
      return
    }
  }
  
  // Update tracking
  previousPlayerRoles.value[playerId] = roleId
  // Mark this assignment as manual
  manualRoleAssignments.value[playerId] = true
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
  const query = roleSearchQuery.value.toLowerCase().trim()
  let filtered = availableRoles.value.filter(role => role.team === team)
  
  if (query) {
    filtered = filtered.filter(role => 
      role.name.toLowerCase().includes(query) || 
      (role.description && role.description.toLowerCase().includes(query))
    )
  }
  
  return filtered
}

// For unique roles: simple toggle
function toggleRole(roleId: string) {
  if (roleQuantities.value[roleId]) {
    // Removing the role - unassign from all players
    roleQuantities.value[roleId] = 0
    unassignRoleFromPlayers(roleId)
  } else {
    roleQuantities.value[roleId] = 1
  }
}

// For non-unique roles: increment/decrement quantity
function incrementRole(roleId: string) {
  if (!roleQuantities.value[roleId]) {
    roleQuantities.value[roleId] = 1
  } else {
    roleQuantities.value[roleId]++
  }
}

function decrementRole(roleId: string) {
  if (roleQuantities.value[roleId] && roleQuantities.value[roleId] > 0) {
    roleQuantities.value[roleId]--
    
    // If quantity reaches 0, unassign from all players
    if (roleQuantities.value[roleId] === 0) {
      unassignRoleFromPlayers(roleId)
    } else {
      // If quantity decreased but still > 0, check if too many players have it
      const playersWithRole = Object.entries(playerRoles.value)
        .filter(([_, assignedRoleId]) => assignedRoleId === roleId)
      
      const newQuantity = roleQuantities.value[roleId]
      
      // If more players have the role than available quantity, unassign excess
      if (playersWithRole.length > newQuantity) {
        // Unassign from the last player(s) assigned
        const excessCount = playersWithRole.length - newQuantity
        for (let i = 0; i < excessCount; i++) {
          const entry = playersWithRole[playersWithRole.length - 1 - i]
          if (entry) {
            const [playerId] = entry
            playerRoles.value[playerId] = ''
          }
        }
      }
    }
  }
}

// Helper function to unassign a role from all players
function unassignRoleFromPlayers(roleId: string) {
  for (const [playerId, assignedRoleId] of Object.entries(playerRoles.value)) {
    if (assignedRoleId === roleId) {
      playerRoles.value[playerId] = ''
    }
  }
}

// Clear all selected roles
async function clearAllRoles() {
  if (totalRoleCount.value === 0) return
  
  const confirmed = await confirm(
    'Cela supprimera également les assignations aux joueurs.',
    '🗑️ Désélectionner tous les rôles ?'
  )
  
  if (confirmed) {
    // Clear all quantities
    roleQuantities.value = {}
    // Clear all player role assignments
    playerRoles.value = {}
    previousPlayerRoles.value = {}
    success('✅ Tous les rôles ont été désélectionnés')
  }
}

// Random assignment of roles to players
// mode: 'rest' = only assign to non-manually assigned players, 'full' = reassign all
function randomAssignRoles(mode: 'rest' | 'full' = 'rest') {
  if (!gameStore.currentGame?.players) return
  
  let playersToAssign: any[]
  
  if (mode === 'full') {
    // Full random: assign to all players
    playersToAssign = gameStore.currentGame.players
  } else {
    // Rest mode: only assign to players without manual assignments
    playersToAssign = gameStore.currentGame.players.filter(player => {
      return !manualRoleAssignments.value[player.id]
    })
  }
  
  if (playersToAssign.length === 0) {
    if (mode === 'rest') {
      info('ℹ️ Tous les joueurs ont été assignés manuellement')
    }
    return
  }
  
  // Get all deck roles
  const allDeckRoles: string[] = []
  for (const entry of expandedDeckRoles.value) {
    allDeckRoles.push(entry.roleId)
  }
  
  // Determine which roles are available for random assignment
  let rolePool: string[] = []
  
  if (mode === 'full') {
    // Full random: use all roles from deck
    rolePool = [...allDeckRoles]
  } else {
    // Rest mode: exclude roles that are manually assigned
    const manuallyAssignedRoleIds: string[] = []
    
    for (const [playerId, isManual] of Object.entries(manualRoleAssignments.value)) {
      if (isManual && playerRoles.value[playerId]) {
        manuallyAssignedRoleIds.push(playerRoles.value[playerId])
      }
    }
    
    // Build pool from remaining roles
    const roleCount: Record<string, number> = {}
    
    // Count total available for each role
    for (const roleId in roleQuantities.value) {
      roleCount[roleId] = roleQuantities.value[roleId] || 0
    }
    
    // Subtract manually assigned roles
    for (const roleId of manuallyAssignedRoleIds) {
      if (roleCount[roleId] !== undefined) {
        roleCount[roleId] = Math.max(0, roleCount[roleId] - 1)
      }
    }
    
    // Build the pool
    for (const [roleId, count] of Object.entries(roleCount)) {
      for (let i = 0; i < count; i++) {
        rolePool.push(roleId)
      }
    }
  }
  
  if (rolePool.length < playersToAssign.length) {
    warning(`⚠️ Pas assez de rôles disponibles (${rolePool.length} rôles pour ${playersToAssign.length} joueurs)`)
    return
  }
  
  // Shuffle the role pool using Fisher-Yates algorithm
  for (let i = rolePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = rolePool[i]
    if (temp && rolePool[j]) {
      rolePool[i] = rolePool[j]!
      rolePool[j] = temp
    }
  }
  
  // Assign roles to players
  for (let i = 0; i < playersToAssign.length; i++) {
    const player = playersToAssign[i]
    const roleId = rolePool[i]
    if (player && roleId) {
      playerRoles.value[player.id] = roleId
      previousPlayerRoles.value[player.id] = roleId
      // Mark as NOT manual (randomized)
      manualRoleAssignments.value[player.id] = false
    }
  }
  
  const modeText = mode === 'full' ? 'Tous les rôles' : `${playersToAssign.length} rôle(s)`
  success(`✅ ${modeText} assigné(s) aléatoirement !`)
}

// Clear all player role assignments
async function clearPlayerAssignments() {
  // Check if there are any assignments to clear
  const hasAssignments = Object.values(playerRoles.value).some(roleId => roleId && roleId !== '')
  
  if (!hasAssignments) {
    info('ℹ️ Aucune assignation de rôle à réinitialiser')
    return
  }
  
  const confirmed = await confirm(
    'Toutes les assignations de rôles des joueurs seront supprimées.',
    '🔄 Réinitialiser les assignations ?'
  )
  
  if (confirmed) {
    playerRoles.value = {}
    previousPlayerRoles.value = {}
    manualRoleAssignments.value = {}
    success('✅ Assignations réinitialisées !')
  }
}

function getRoleCountByTeam(team: string) {
  let count = 0
  for (const roleId in roleQuantities.value) {
    const role = availableRoles.value.find(r => r._id === roleId)
    if (role && role.team === team) {
      count += roleQuantities.value[roleId] || 0
    }
  }
  return count
}

function getRoleName(roleId: string) {
  const role = availableRoles.value.find(r => r._id === roleId)
  return role ? role.name : 'Unknown'
}

function getRoleTeamClass(roleId: string) {
  const role = availableRoles.value.find(r => r._id === roleId)
  if (!role) return ''
  if (role.team === 'WOLF') return 'wolf-role'
  if (role.team === 'VILLAGER') return 'village-role'
  return 'neutral-role'
}

async function copyDeck() {
  if (expandedDeckRoles.value.length === 0) {
    warning('⚠️ Aucun rôle sélectionné')
    return
  }

  // Get all role names
  const roleNames = expandedDeckRoles.value.map(entry => entry.name)

  // Build Discord-formatted text
  const deckText = `# log\n${roleNames.join('\n')}`
  
  await navigator.clipboard.writeText(deckText)
  success('✅ Deck copié dans le presse-papiers !')
}

async function selectPlayerNumber(playerId: string, num: number | null) {
  if (!gameStore.currentGame) return
  
  const players = gameStore.currentGame.players.map(p => 
    p.id === playerId ? { ...p, number: num || undefined } : p
  )
  await gameStore.updatePlayers(players)
  openNumberPicker.value = null
}

async function removePlayer(playerId: string) {
  if (!gameStore.currentGame) return
  const players = gameStore.currentGame.players.filter(p => p.id !== playerId)
  await gameStore.updatePlayers(players)
  // Also remove role assignments from both current and shadow state
  delete playerRoles.value[playerId]
  delete previousPlayerRoles.value[playerId]
}

async function startGame() {
  if (!canStartGame.value) {
    warning(validationState.value.message)
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
@use "sass:color";
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
    filter: drop-shadow(0 0 10px rgba($violet-400, 0.5));
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

// ─── Setup Interface (3-Column Layout) ──────────────────────
.setup-interface {
  padding: 0 1rem 2rem;
}

.setup-grid-three {
  display: grid;
  grid-template-columns: 300px 1fr 280px;
  gap: 1.2rem;
  
  @media (max-width: 1400px) {
    grid-template-columns: 260px 1fr 240px;
  }
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
}

.setup-panel-left,
.setup-panel-center,
.setup-panel-right {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 200px);
  overflow: hidden;
}

.setup-panel-right {
  gap: 0;
}

.setup-panel-center {
  max-height: calc(100vh - 200px);
  overflow: hidden;
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
  margin-bottom: 0;
}

.panel-subtitle {
  font-size: 0.82rem;
  color: $text-muted;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.count-badge {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border-radius: $radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid;
  font-weight: 700;
  font-size: 1.1rem;
  transition: all $transition-fast;

  &.player-badge {
    background: rgba($village-green, 0.12);
    border-color: rgba($village-green, 0.3);
    color: $village-green;
    box-shadow: 0 2px 8px rgba($village-green, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  &.role-badge {
    background: rgba($violet-500, 0.12);
    border-color: rgba($violet-400, 0.3);
    color: $violet-200;
    box-shadow: 0 2px 8px rgba($violet-500, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba($violet-500, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }

  .badge-value {
    font-size: 1.1rem;
    font-variant-numeric: tabular-nums;
  }
}

// ─── Left Panel: Players ────────────────────────────────────
.bot-status-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba($violet-400, 0.2);
}

.status-dot-mini {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: $wolf-red;
  box-shadow: 0 0 6px rgba($wolf-red, 0.5);

  &.online {
    background: $village-green;
    box-shadow: 0 0 6px rgba($village-green, 0.5);
  }
}

.panel-header-with-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.player-addition-inline {
  display: flex;
  gap: 8px;
  flex: 1;
  max-width: 400px;
  min-width: 200px;
}

.input-modern-inline {
  flex: 1;
  padding: 8px 12px;
  border-radius: $radius-md;
  border: 1px solid rgba($violet-400, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: $text-primary;
  font-size: 0.85rem;
  transition: all $transition-fast;

  &:focus {
    outline: none;
    border-color: $violet-400;
    box-shadow: 0 0 0 2px rgba($violet-400, 0.2);
  }

  &::placeholder {
    color: $text-muted;
  }
}

.btn-add-inline {
  width: 36px;
  height: 36px;
  border-radius: $radius-md;
  border: 1px solid $violet-400;
  background: rgba($violet-500, 0.2);
  color: $violet-100;
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-fast;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: rgba($violet-500, 0.3);
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.input-hint-compact {
  font-size: 0.7rem;
  color: $text-muted;
  margin-bottom: 8px;
  padding-left: 2px;
}

.players-setup-list-compact {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
  max-height: 540px;
  overflow-y: auto;
  margin-bottom: 1rem;
  padding-right: 4px;

  @media (max-width: 1400px) {
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  }

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba($violet-400, 0.3);
    border-radius: 2px;

    &:hover {
      background: rgba($violet-400, 0.5);
    }
  }
}

.player-card-compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 12px 10px;
  border-radius: $radius-lg;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba($violet-400, 0.15);
  transition: all $transition-fast;
  position: relative;
  min-height: 180px;

  &:hover {
    border-color: rgba($violet-400, 0.35);
    background: rgba($violet-500, 0.05);
    
    .btn-remove-mini {
      opacity: 1;
      pointer-events: auto;
    }
  }
}

.player-number-wrapper {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 10;
}

.player-number-select {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba($violet-500, 0.7), rgba($violet-600, 0.6));
  border: 2px solid rgba($violet-300, 0.4);
  font-size: 0.95rem;
  font-weight: 700;
  color: $text-primary;
  box-shadow: 0 1px 4px rgba($violet-500, 0.15);
  transition: all $transition-fast;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    border-color: rgba($violet-300, 0.6);
    background: linear-gradient(135deg, rgba($violet-400, 0.8), rgba($violet-500, 0.7));
    transform: scale(1.05);
  }
  
  &.has-duplicate {
    background: linear-gradient(135deg, rgba($wolf-red, 0.7), rgba($wolf-red, 0.8));
    border-color: $wolf-red;
    animation: pulse-error 1.5s ease-in-out infinite;
    
    &:hover {
      background: linear-gradient(135deg, rgba($wolf-red, 0.8), rgba($wolf-red, 0.9));
      border-color: $wolf-red;
    }
  }
}

@keyframes pulse-error {
  0%, 100% {
    box-shadow: 0 1px 4px rgba($wolf-red, 0.3);
  }
  50% {
    box-shadow: 0 0 12px rgba($wolf-red, 0.6);
  }
}

.number-picker-dropdown {
  position: absolute;
  top: 40px;
  left: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 8px;
  background: rgba($bg-secondary, 0.98);
  border: 2px solid rgba($violet-400, 0.6);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 100;
  max-width: 160px;
  
  .number-option {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: rgba($violet-500, 0.2);
    border: 1px solid rgba($violet-400, 0.4);
    color: $text-primary;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      background: rgba($violet-500, 0.4);
      border-color: $violet-400;
      transform: scale(1.08);
    }
  }
}

.player-info-compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.player-avatar-mini {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba($violet-500, 0.4), rgba($pink-400, 0.3));
  border: 2px solid rgba($violet-400, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.3rem;
  color: $violet-100;
  flex-shrink: 0;
  overflow: hidden;
  position: relative;

  &.has-image {
    background: transparent;
    padding: 0;
  }

  .avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
}

.player-name-compact {
  font-size: 0.82rem;
  font-weight: 600;
  color: $text-primary;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.discord-tag {
  font-size: 0.7rem;
  opacity: 0.7;
}

.role-select-compact {
  width: 100%;
  padding: 6px;
  border-radius: $radius-md;
  border: 1px solid rgba($violet-400, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: $text-primary;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;
  text-align: center;

  option {
    background: $bg-secondary;
    color: $text-primary;
    padding: 8px 12px;
    border-radius: $radius-sm;
    font-weight: 500;
    
    &:hover {
      background: rgba($violet-500, 0.2);
      color: $violet-100;
    }
    
    &:checked {
      background: rgba($violet-500, 0.3);
      color: $violet-100;
    }
  }

  &:focus {
    outline: none;
    border-color: $violet-400;
    background: rgba(0, 0, 0, 0.4);
  }

  &:hover {
    border-color: rgba($violet-400, 0.5);
    background: rgba(0, 0, 0, 0.35);
  }

  &.no-role {
    border-color: rgba($violet-400, 0.4);
    background: rgba(0, 0, 0, 0.3);
    opacity: 0.7;
  }
}

.btn-remove-mini {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
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
  z-index: 20;
  opacity: 0;
  pointer-events: none;

  &:hover {
    opacity: 1;
    border-color: $wolf-red;
    background: rgba($wolf-red, 0.25);
    transform: scale(1.15);
  }
}

.empty-state-compact {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1rem;
  text-align: center;
}

.empty-icon-compact {
  font-size: 2.5rem;
  opacity: 0.3;
  margin-bottom: 0.5rem;
}

.empty-text-compact {
  font-size: 0.85rem;
  color: $text-secondary;
}

.start-game-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 1rem;
  border-top: 2px solid rgba($violet-400, 0.2);
  margin-top: auto;
}

.game-action-buttons {
  display: flex;
  gap: 10px;
  width: 100%;
}

.btn-reset-assignments {
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: $radius-lg;
  border: 1px solid rgba($violet-400, 0.4);
  background: rgba(0, 0, 0, 0.3);
  color: $text-secondary;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all $transition-base;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    transform: translateY(-2px) rotate(180deg);
    background: rgba($violet-500, 0.2);
    border-color: rgba($violet-400, 0.6);
    color: $text-primary;
  }

  &:active {
    transform: translateY(0) rotate(360deg);
  }
}

.validation-display-inline {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: $radius-md;
  border: 1px solid;
  transition: all $transition-fast;
  width: 100%;

  &.validation-success {
    background: rgba(0, 0, 0, 0.2);
    border-color: rgba($violet-400, 0.4);
    
    .validation-icon {
      color: rgba($village-green, 0.8);
    }
  }

  &.validation-warning {
    background: rgba(0, 0, 0, 0.2);
    border-color: rgba($violet-400, 0.3);
    
    .validation-icon {
      color: rgba($text-secondary, 0.8);
    }
  }

  &.validation-error {
    background: rgba(0, 0, 0, 0.2);
    border-color: rgba($violet-400, 0.3);
    
    .validation-icon {
      color: rgba($text-secondary, 0.8);
    }
  }
}

.validation-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
}

.validation-counts-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  color: $text-primary;
  flex-wrap: nowrap;
}

.count-item {
  padding: 2px 8px;
  border-radius: $radius-sm;
  background: rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}

.count-separator {
  opacity: 0.5;
}

.validation-message {
  font-size: 0.72rem;
  color: $text-muted;
  font-weight: 600;
  white-space: nowrap;
}

.btn-start-game-inline {
  flex: 1;
  padding: 10px 20px;
  border-radius: $radius-lg;
  border: 2px solid $violet-400;
  background: linear-gradient(135deg, rgba($violet-500, 0.3), rgba($pink-500, 0.2));
  color: $violet-100;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-base;
  box-shadow: $glow-violet;
  white-space: nowrap;

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

.btn-random-assign {
  flex: 1;
  padding: 10px 20px;
  border-radius: $radius-lg;
  border: 2px solid rgba($day-accent, 0.5);
  background: linear-gradient(135deg, rgba($day-accent, 0.2), rgba($day-accent, 0.1));
  color: $day-accent;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-base;
  box-shadow: 0 4px 12px rgba($day-accent, 0.2);
  white-space: nowrap;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba($day-accent, 0.3);
    background: linear-gradient(135deg, rgba($day-accent, 0.3), rgba($day-accent, 0.15));
    border-color: $day-accent;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }
}

// Single Random Button (before expansion)
.btn-random-single {
  flex: 1;
  padding: 10px 20px;
  border-radius: $radius-lg;
  border: 2px solid rgba($day-accent, 0.5);
  background: linear-gradient(135deg, rgba($day-accent, 0.2), rgba($day-accent, 0.1));
  color: $day-accent;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-base;
  box-shadow: 0 4px 12px rgba($day-accent, 0.2);
  white-space: nowrap;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba($day-accent, 0.3);
    background: linear-gradient(135deg, rgba($day-accent, 0.3), rgba($day-accent, 0.15));
    border-color: $day-accent;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }
}

// Split Random Button (after expansion)
.btn-split-random {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
  border-radius: $radius-lg;
}

.btn-random-left,
.btn-random-right {
  flex: 1;
  padding: 10px 16px;
  border: 2px solid rgba($day-accent, 0.5);
  background: linear-gradient(135deg, rgba($day-accent, 0.2), rgba($day-accent, 0.1));
  color: $day-accent;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-base;
  box-shadow: 0 4px 12px rgba($day-accent, 0.2);
  white-space: nowrap;
  position: relative;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba($day-accent, 0.3);
    background: linear-gradient(135deg, rgba($day-accent, 0.3), rgba($day-accent, 0.15));
    border-color: $day-accent;
    z-index: 1;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }
}

.btn-random-left {
  border-top-left-radius: $radius-lg;
  border-bottom-left-radius: $radius-lg;
  border-right: 1px solid rgba($day-accent, 0.3);
}

.btn-random-right {
  border-top-right-radius: $radius-lg;
  border-bottom-right-radius: $radius-lg;
  border-left: 1px solid rgba($day-accent, 0.3);
}

// ─── Role Search ─────────────────────────────────────────────
.role-search-container {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 1rem;
}

.role-search-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: $radius-md;
  border: 1px solid rgba($violet-400, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: $text-primary;
  font-size: 0.85rem;
  transition: all $transition-fast;

  &:focus {
    outline: none;
    border-color: $violet-400;
    box-shadow: 0 0 0 2px rgba($violet-400, 0.2);
    background: rgba(0, 0, 0, 0.4);
  }

  &::placeholder {
    color: $text-muted;
  }
}

.btn-clear-roles {
  width: 40px;
  height: 40px;
  border-radius: $radius-md;
  border: 1px solid rgba($wolf-red, 0.3);
  background: rgba($wolf-red, 0.1);
  color: $wolf-red;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    border-color: $wolf-red;
    background: rgba($wolf-red, 0.2);
    box-shadow: 0 0 12px rgba($wolf-red, 0.4);
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

// ─── Center Panel: Grimoire ─────────────────────────────────
.grimoire-scroll {
  overflow-y: auto;
  max-height: calc(100vh - 280px);
  padding-right: 8px;

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

.grimoire-section {
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
}

.grimoire-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid rgba($violet-400, 0.2);
}

.grimoire-icon {
  font-size: 1.5rem;
}

.grimoire-title {
  font-size: 1rem;
  font-weight: 700;
  color: $text-primary;
}

.wolf-header {
  border-bottom-color: rgba($wolf-red, 0.3);
  .grimoire-icon { filter: drop-shadow(0 0 8px rgba($wolf-red, 0.6)); }
}

.village-header {
  border-bottom-color: rgba($village-green, 0.3);
  .grimoire-icon { filter: drop-shadow(0 0 8px rgba($village-green, 0.6)); }
}

.neutral-header {
  border-bottom-color: rgba($violet-400, 0.3);
  .grimoire-icon { filter: drop-shadow(0 0 8px rgba($violet-400, 0.6)); }
}

.grimoire-roles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.role-card-grimoire {
  padding: 12px;
  border-radius: $radius-md;
  border: 2px solid rgba($violet-400, 0.2);
  background: rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: all $transition-fast;
  text-align: left;

  &:hover {
    border-color: $violet-400;
    background: rgba($violet-500, 0.1);
    transform: translateY(-2px);
    box-shadow: $glow-violet;
  }

  &.selected {
    border-color: $violet-400;
    background: linear-gradient(135deg, rgba($violet-500, 0.3), rgba($pink-500, 0.2));
    box-shadow: $glow-violet;
  }
}

.role-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.role-card-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: $text-primary;
}

.role-check-unique {
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.role-check {
  font-size: 1rem;
  color: $village-green;
  font-weight: 700;
}

.role-quantity-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px;
  border-radius: $radius-sm;
  border: 1px solid rgba($violet-400, 0.3);
}

.btn-qty {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba($violet-400, 0.4);
  background: rgba($violet-500, 0.2);
  color: $violet-200;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    border-color: $violet-400;
    background: rgba($violet-500, 0.3);
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.qty-display {
  min-width: 20px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: $violet-100;
}

.role-card-grimoire.non-unique {
  cursor: default;
  
  &:hover {
    transform: none;
  }
}

.role-card-desc {
  font-size: 0.75rem;
  color: $text-muted;
  line-height: 1.4;
  margin: 0;
}

// ─── Right Panel: Deck ──────────────────────────────────────
.btn-copy-deck {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba($violet-400, 0.3);
  background: rgba($violet-500, 0.2);
  color: $violet-200;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: $violet-400;
    background: rgba($violet-500, 0.3);
    box-shadow: $glow-violet;
    transform: scale(1.1);
  }
}

.deck-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 0;
}

.deck-stat {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.stat-icon-img {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: $text-primary;
  min-width: 20px;
  text-align: center;
}

.deck-log-container {
  border-radius: $radius-lg;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba($violet-400, 0.2);
  padding: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

.deck-log {
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  flex: 1;
  min-height: 0;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba($violet-400, 0.3);
    border-radius: 2px;

    &:hover {
      background: rgba($violet-400, 0.5);
    }
  }
}

.deck-log-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
  transition: all $transition-fast;
  border-bottom: 1px solid rgba($violet-400, 0.1);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba($violet-500, 0.05);
    
    .btn-remove-role {
      opacity: 1;
    }
  }
}

.log-number {
  font-size: 0.8rem;
  font-weight: 700;
  color: $text-muted;
  min-width: 24px;
}

.log-role-name {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 600;
  color: $text-primary;
  
  &.wolf-role {
    color: $wolf-red;
  }
  
  &.village-role {
    color: color.adjust($village-green, $lightness: -5%);
  }
  
  &.neutral-role {
    color: $violet-400;
  }
}

.btn-remove-role {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba($wolf-red, 0.3);
  background: rgba($wolf-red, 0.1);
  color: $wolf-red;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.5;

  &:hover {
    opacity: 1;
    border-color: $wolf-red;
    background: rgba($wolf-red, 0.2);
    transform: scale(1.15);
  }
}

.empty-deck {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 1rem;
  text-align: center;
}

.empty-deck-icon {
  font-size: 3rem;
  opacity: 0.3;
  margin-bottom: 1rem;
}

.empty-deck-text {
  font-size: 0.9rem;
  font-weight: 700;
  color: $text-secondary;
  margin-bottom: 0.5rem;
}

.empty-deck-hint {
  font-size: 0.75rem;
  color: $text-muted;
}

// Role Categories (Legacy - Remove if not used)

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
    filter: drop-shadow(0 0 10px rgba($violet-400, 0.5));
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
  position: relative;

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

.player-number-badge-game {
  position: absolute;
  top: -6px;
  left: -6px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba($violet-500, 0.9), rgba($violet-600, 0.8));
  border: 2px solid rgba($violet-300, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: $text-primary;
  z-index: 10;
  box-shadow: 0 2px 6px rgba($violet-500, 0.3);
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

// ─── Scan Selection Modal ───────────────────────────────────
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-content {
  background: linear-gradient(135deg, rgba($violet-900, 0.95), rgba($violet-950, 0.9));
  border-radius: $radius-xl;
  border: 2px solid rgba($violet-400, 0.3);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 2px solid rgba($violet-400, 0.2);
}

.modal-title {
  @include elegant-text();
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, $violet-300, $pink-400);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.btn-close-modal {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba($wolf-red, 0.3);
  background: rgba($wolf-red, 0.1);
  color: $wolf-red;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba($wolf-red, 0.2);
    transform: scale(1.1);
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.modal-info {
  margin-bottom: 1.5rem;
  
  p {
    font-size: 0.95rem;
    color: $text-secondary;
    margin-bottom: 1rem;
  }
}

.modal-actions-top {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-secondary-sm {
  padding: 6px 12px;
  border-radius: $radius-md;
  border: 1px solid rgba($violet-400, 0.4);
  background: rgba($violet-500, 0.2);
  color: $violet-200;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: rgba($violet-500, 0.3);
    border-color: $violet-400;
  }
}

.scanned-players-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.scanned-player-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: $radius-md;
  background: rgba(0, 0, 0, 0.2);
  border: 2px solid rgba($violet-400, 0.2);
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: rgba($violet-500, 0.1);
    border-color: rgba($violet-400, 0.4);
  }

  &.selected {
    background: rgba($violet-500, 0.2);
    border-color: $violet-400;
    box-shadow: 0 0 12px rgba($violet-400, 0.3);
  }
}

.player-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: $violet-400;
}

.player-avatar-scan {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba($violet-500, 0.3), rgba($pink-400, 0.2));
  border: 2px solid rgba($violet-400, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 700;
  color: $violet-200;
  flex-shrink: 0;
  overflow: hidden;

  &.has-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.player-info-scan {
  flex: 1;
  min-width: 0;
}

.player-name-scan {
  font-size: 1rem;
  font-weight: 600;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-username-scan {
  font-size: 0.85rem;
  color: $text-muted;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 2px solid rgba($violet-400, 0.2);
}

// Modal transitions
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
  
  .modal-content {
    transition: transform 0.3s ease;
  }
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  
  .modal-content {
    transform: scale(0.9);
  }
}
</style>
