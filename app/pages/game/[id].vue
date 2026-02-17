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
        <div class="phase-banner" :class="phaseClass">
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

        <!-- Main Game Grid -->
        <div class="game-grid">
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

              <!-- Add Player -->
              <div class="add-player" v-if="gameStore.currentPhase === 'SETUP'">
                <input v-model="newPlayerName" class="input" placeholder="Nom du joueur..." @keyup.enter="addPlayer" />
                <button class="btn-primary add-btn" @click="addPlayer">+</button>
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
