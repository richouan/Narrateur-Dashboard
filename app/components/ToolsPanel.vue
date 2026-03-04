<template>
  <!-- Trigger tab -->
  <div class="tp-trigger-wrap">
    <button
      class="tp-trigger"
      :class="{ 'is-open': isOpen }"
      @click="toggle"
      title="Outils de jeu"
      aria-label="Ouvrir les outils"
    >
      <svg class="tp-trigger-icon" viewBox="0 0 24 24" fill="none">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="tp-trigger-label">Outils</span>
    </button>
  </div>

  <!-- Backdrop -->
  <Transition name="tp-backdrop">
    <div v-if="isOpen" class="tp-backdrop" @click="close" />
  </Transition>

  <!-- Panel -->
  <Transition name="tp-slide">
    <div v-if="isOpen" class="tp-panel" role="dialog" aria-label="Outils" @keydown.esc="close">

      <!-- Header -->
      <div class="tp-header">
        <div class="tp-header-left">
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18" class="tp-header-icon">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h2 class="tp-title">Outils</h2>
        </div>
        <button class="tp-close-btn" @click="close" title="Fermer (Echap)">
          <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="tp-tabs">
        <button class="tp-tab" :class="{ active: activeTab === 'timer' }" @click="activeTab = 'timer'">
          ⏱ Timer
        </button>
        <button
          class="tp-tab"
          :class="{ active: activeTab === 'players', disabled: !hasGame }"
          @click="hasGame && (activeTab = 'players')"
          :title="!hasGame ? 'Aucune partie active' : ''"
        >
          👥 Joueurs
          <span v-if="hasGame" class="tp-tab-badge">{{ allPlayers.length }}</span>
        </button>
      </div>

      <!-- Body -->
      <div class="tp-body">

        <!-- ── TIMER TAB ── -->
        <div v-if="activeTab === 'timer'" class="tp-section">

          <!-- Presets -->
          <div class="tp-row tp-presets">
            <button
              v-for="p in presets"
              :key="p.label"
              class="tp-preset-btn"
              :class="{ active: timerDuration === p.seconds && !timerRunning && timerRemaining === timerDuration }"
              @click="setPreset(p.seconds)"
            >{{ p.label }}</button>
          </div>

          <!-- Premium hub (same style as speak phase) -->
          <div class="tp-timer-card" :class="{ 'is-running': timerRunning, 'is-urgent': isUrgent, 'is-done': isDone }">
            <svg class="tp-ring-svg" viewBox="0 0 200 200">
              <defs>
                <linearGradient id="tp-ring-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#c084fc" />
                  <stop offset="100%" stop-color="#fbbf24" />
                </linearGradient>
              </defs>
              <circle class="tp-ring-track" cx="100" cy="100" r="88" />
              <circle
                class="tp-ring-fill"
                cx="100" cy="100" r="88"
                :stroke-dasharray="552.92"
                :stroke-dashoffset="ringOffset"
              />
            </svg>
            <div class="tp-timer-inner">
              <div class="tp-timer-time" :class="{ running: timerRunning, urgent: isUrgent, done: isDone }">
                {{ formattedTime }}
              </div>
            </div>
          </div>

          <!-- Duration ±15s strip -->
          <div class="tp-dur-row">
            <button class="tp-dur-btn" @click="adjustDuration(-15)" :disabled="timerDuration <= 15">−15s</button>
            <span class="tp-dur-label">durée</span>
            <span class="tp-dur-val">{{ formattedDuration }}</span>
            <button class="tp-dur-btn" @click="adjustDuration(15)">+15s</button>
          </div>

          <!-- Controls: reset / play-stop / sound -->
          <div class="tp-timer-controls">
            <button class="tp-dtc-btn tp-dtc-reset" @click="resetTimer" title="Réinitialiser">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
            </button>
            <button class="tp-dtc-btn tp-dtc-stop" v-if="timerRunning" @click="pauseTimer" title="Arrêter">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            </button>
            <button class="tp-dtc-btn tp-dtc-play" v-else @click="startTimer" :disabled="timerDuration === 0">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <button
              class="tp-dtc-btn"
              :class="{ active: soundEnabled }"
              @click="soundEnabled = !soundEnabled"
              :title="soundEnabled ? 'Son activé' : 'Son désactivé'"
            >
              <svg v-if="soundEnabled" viewBox="0 0 16 16" fill="none" width="14" height="14">
                <path d="M2 5.5h2.5l4-3v11l-4-3H2z" fill="currentColor"/>
                <path d="M11 6.5a2.5 2.5 0 0 1 0 3M12.5 4.5a5 5 0 0 1 0 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <svg v-else viewBox="0 0 16 16" fill="none" width="14" height="14">
                <path d="M2 5.5h2.5l4-3v11l-4-3H2z" fill="currentColor"/>
                <path d="M11 5.5l3 5M14 5.5l-3 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

        </div>

        <!-- ── PLAYERS TAB ── -->
        <div v-else-if="activeTab === 'players' && hasGame" class="tp-section">

          <div class="tp-players-filter">
            <button
              class="tp-filter-btn"
              :class="{ active: playerFilter === 'all' }"
              @click="playerFilter = 'all'"
            >Tous ({{ allPlayers.length }})</button>
            <button
              class="tp-filter-btn"
              :class="{ active: playerFilter === 'alive' }"
              @click="playerFilter = 'alive'"
            >Vivants ({{ alivePlayers.length }})</button>
            <button
              class="tp-filter-btn"
              :class="{ active: playerFilter === 'dead' }"
              @click="playerFilter = 'dead'"
            >Morts ({{ deadPlayers.length }})</button>
          </div>

          <div class="tp-players-list">
            <div
              v-for="player in filteredPlayers"
              :key="player.id"
              class="tp-player-row"
              :class="{ dead: !player.isAlive, editing: editingId === player.id }"
            >
              <!-- Avatar / initial -->
              <div class="tp-player-avatar">
                <img v-if="player.avatar" :src="player.avatar" :alt="player.name" class="tp-player-avatar-img" @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" />
                <span v-else class="tp-player-initial">{{ player.name[0]?.toUpperCase() }}</span>
                <span v-if="player.isCaptain" class="tp-captain-badge" title="Maire">👑</span>
              </div>

              <!-- Name / edit -->
              <div class="tp-player-info">
                <template v-if="editingId === player.id">
                  <input
                    ref="editInputRef"
                    v-model="editName"
                    class="tp-edit-input"
                    @keydown.enter="saveName(player.id)"
                    @keydown.esc="cancelEdit"
                    maxlength="30"
                    autofocus
                  />
                  <div class="tp-edit-actions">
                    <button class="tp-edit-save" @click="saveName(player.id)">✓</button>
                    <button class="tp-edit-cancel" @click="cancelEdit">✕</button>
                  </div>
                </template>
                <template v-else>
                  <span class="tp-player-name">{{ player.name }}</span>
                  <span v-if="player.number" class="tp-player-num">#{{ player.number }}</span>
                </template>
              </div>

              <!-- Actions -->
              <div class="tp-player-actions" v-if="editingId !== player.id">
                <!-- Rename -->
                <button class="tp-act-btn" @click="startEdit(player)" title="Renommer">
                  <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
                    <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
                  </svg>
                </button>
                <!-- Kill / Revive -->
                <button
                  class="tp-act-btn"
                  :class="player.isAlive ? 'kill' : 'revive'"
                  @click="toggleAlive(player)"
                  :title="player.isAlive ? 'Éliminer' : 'Ressusciter'"
                >
                  <svg v-if="player.isAlive" viewBox="0 0 16 16" fill="none" width="12" height="12">
                    <path d="M8 3v5l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/>
                    <path d="M5 5l6 6M11 5l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  </svg>
                  <svg v-else viewBox="0 0 16 16" fill="none" width="12" height="12">
                    <path d="M8 13V8m0 0V3m0 5H3m5 0h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
                <!-- Captain -->
                <button
                  class="tp-act-btn"
                  :class="{ active: player.isCaptain }"
                  @click="setCaptain(player)"
                  :title="player.isCaptain ? 'Retirer le titre de Maire' : 'Nommer Maire'"
                >👑</button>
              </div>
            </div>

            <div v-if="filteredPlayers.length === 0" class="tp-empty">Aucun joueur</div>
          </div>

          <!-- Saving indicator -->
          <div class="tp-save-status" :class="saveStatus">
            <span v-if="saveStatus === 'saving'">Sauvegarde...</span>
            <span v-else-if="saveStatus === 'saved'">✓ Sauvegardé</span>
            <span v-else-if="saveStatus === 'error'">✕ Erreur</span>
          </div>

        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch, nextTick } from 'vue'
import type { IGamePlayer } from '~/types'

const gameStore = useGameStore()

// ── Panel ──────────────────────────────────────────────────────
const isOpen = ref(false)
const activeTab = ref<'timer' | 'players'>('timer')

function toggle() { isOpen.value = !isOpen.value }
function close()  { isOpen.value = false }

// ── Game context ───────────────────────────────────────────────
const hasGame = computed(() => !!gameStore.currentGame)
const allPlayers  = computed<IGamePlayer[]>(() => gameStore.currentGame?.players ?? [])
const alivePlayers = computed(() => allPlayers.value.filter(p => p.isAlive))
const deadPlayers  = computed(() => allPlayers.value.filter(p => !p.isAlive))

const playerFilter = ref<'all' | 'alive' | 'dead'>('all')
const filteredPlayers = computed(() => {
  const base = [...allPlayers.value].sort((a, b) => (a.number ?? 999) - (b.number ?? 999))
  if (playerFilter.value === 'alive') return base.filter(p => p.isAlive)
  if (playerFilter.value === 'dead')  return base.filter(p => !p.isAlive)
  return base
})

// ── Player editing ─────────────────────────────────────────────
const editingId   = ref<string | null>(null)
const editName    = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)
const saveStatus  = ref<'' | 'saving' | 'saved' | 'error'>('')
let saveStatusTimeout: ReturnType<typeof setTimeout> | null = null

function startEdit(player: IGamePlayer) {
  editingId.value = player.id
  editName.value  = player.name
  nextTick(() => editInputRef.value?.focus())
}

function cancelEdit() { editingId.value = null }

async function saveName(id: string) {
  const name = editName.value.trim()
  if (!name) return
  const player = allPlayers.value.find(p => p.id === id)
  if (!player || name === player.name) { cancelEdit(); return }
  editingId.value = null
  await patchPlayer({ id, name })
}

async function toggleAlive(player: IGamePlayer) {
  await patchPlayer({ id: player.id, isAlive: !player.isAlive })
}

async function setCaptain(player: IGamePlayer) {
  // Update all players: remove captain from everyone, set on target (toggle off if already captain)
  const newCaptainId = player.isCaptain ? null : player.id
  const updates = allPlayers.value.map(p => ({
    ...p,
    isCaptain: p.id === newCaptainId,
  }))
  await saveAll(updates)
}

async function patchPlayer(patch: Partial<IGamePlayer> & { id: string }) {
  const updates = allPlayers.value.map(p => p.id === patch.id ? { ...p, ...patch } : p)
  await saveAll(updates)
}

async function saveAll(players: Partial<IGamePlayer>[]) {
  saveStatus.value = 'saving'
  if (saveStatusTimeout) clearTimeout(saveStatusTimeout)
  try {
    await gameStore.updatePlayers(players)
    saveStatus.value = 'saved'
  } catch {
    saveStatus.value = 'error'
  } finally {
    saveStatusTimeout = setTimeout(() => { saveStatus.value = '' }, 2500)
  }
}

// ── Timer ──────────────────────────────────────────────────────
const presets = [
  { label: '30s', seconds: 30 },
  { label: '1m',  seconds: 60 },
  { label: '2m',  seconds: 120 },
  { label: '5m',  seconds: 300 },
  { label: '10m', seconds: 600 },
]

const timerDuration  = ref(60)
const timerRemaining = ref(60)
const timerRunning   = ref(false)
const soundEnabled   = ref(true)
let timerInterval: ReturnType<typeof setInterval> | null = null

function setPreset(seconds: number) {
  resetTimer()
  timerDuration.value  = seconds
  timerRemaining.value = seconds
}

function startTimer() {
  if (timerRemaining.value <= 0) return
  timerRunning.value = true
  timerInterval = setInterval(() => {
    timerRemaining.value--
    if (timerRemaining.value <= 0) {
      timerRunning.value = false
      clearInterval(timerInterval!)
      timerInterval = null
      if (soundEnabled.value) playDoneSound()
    }
  }, 1000)
}

function pauseTimer() {
  timerRunning.value = false
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
}

function resetTimer() {
  pauseTimer()
  timerRemaining.value = timerDuration.value
}

function playDoneSound() {
  try {
    const ctx = new AudioContext()
    const times = [0, 0.15, 0.30]
    times.forEach(t => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.35, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.12)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + 0.14)
    })
  } catch {}
}

const formattedTime = computed(() => {
  const s = Math.max(0, timerRemaining.value)
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
})

const ringOffset = computed(() => {
  if (timerDuration.value === 0) return 0
  const progress = Math.max(0, timerRemaining.value / timerDuration.value)
  return 552.92 * (1 - progress)
})

const isUrgent = computed(() => timerRunning.value && timerRemaining.value > 0 && timerRemaining.value <= 10)
const isDone   = computed(() => timerDuration.value > 0 && timerRemaining.value <= 0)

const formattedDuration = computed(() => {
  const s = timerDuration.value
  const m = Math.floor(s / 60)
  const ss = s % 60
  return m > 0 ? (ss > 0 ? `${m}m${ss}s` : `${m}m`) : `${ss}s`
})

function adjustDuration(delta: number) {
  const newDur = Math.max(15, timerDuration.value + delta)
  timerDuration.value  = newDur
  timerRemaining.value = newDur
  pauseTimer()
}

// ── Keyboard shortcut ──────────────────────────────────────────
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) close()
}
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', onKeyDown)
}

onBeforeUnmount(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (saveStatusTimeout) clearTimeout(saveStatusTimeout)
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeyDown)
})
</script>

<style lang="scss">
@use '~/assets/scss/variables' as *;

.tp-trigger-wrap {
  position: fixed;
  left: 0;
  top: calc(50% - 186px);
  transform: translateY(-50%);
  z-index: 1000;
  pointer-events: none;
}

.tp-trigger {
  pointer-events: all;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 14px 10px;
  background:
    radial-gradient(ellipse 100% 60% at 0% 50%, rgba($rose-500, 0.22) 0%, transparent 70%),
    rgba(20, 8, 44, 0.85);
  backdrop-filter: blur(14px);
  border: 1px solid rgba($rose-400, 0.28);
  border-left: none;
  border-radius: 0 12px 12px 0;
  color: rgba($rose-300, 0.70);
  cursor: pointer;
  transition: all 280ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 4px 0 24px rgba(120, 20, 40, 0.35);

  &:hover, &.is-open {
    color: $rose-300;
    background:
      radial-gradient(ellipse 100% 60% at 0% 50%, rgba($rose-500, 0.38) 0%, transparent 70%),
      rgba(28, 10, 40, 0.92);
    border-color: rgba($rose-400, 0.50);
    transform: translateX(3px);
  }

  &.is-open {
    color: $rose-300;
    border-color: rgba($rose-400, 0.50);
  }
}

.tp-trigger-icon { width: 20px; height: 20px; }

.tp-trigger-label {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  writing-mode: vertical-rl;
  opacity: 0.7;
}

// Backdrop
.tp-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
  z-index: 1001;
}
.tp-backdrop-enter-active { transition: opacity 240ms ease; }
.tp-backdrop-leave-active { transition: opacity 200ms ease; }
.tp-backdrop-enter-from, .tp-backdrop-leave-to { opacity: 0; }

// Panel
.tp-panel {
  position: fixed;
  left: 0; top: 0; bottom: 0;
  width: 400px;
  max-width: 96vw;
  z-index: 1002;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(ellipse 90% 35% at 50% -2%, rgba($rose-500, 0.18) 0%, transparent 60%),
    rgba(14, 5, 32, 0.97);
  backdrop-filter: blur(32px) saturate(1.5);
  border-right: 1px solid rgba($rose-400, 0.22);
  box-shadow: 12px 0 60px rgba(0, 0, 0, 0.55);

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, rgba($rose-400, 0.50), rgba($violet-400, 0.30), rgba($rose-400, 0.15));
    z-index: 1;
    pointer-events: none;
  }
}

.tp-slide-enter-active { transition: transform 300ms cubic-bezier(0.34, 1.1, 0.64, 1); }
.tp-slide-leave-active { transition: transform 220ms cubic-bezier(0.4, 0, 1, 1); }
.tp-slide-enter-from, .tp-slide-leave-to { transform: translateX(-100%); }

// Header
.tp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid rgba($rose-500, 0.12);
  flex-shrink: 0;
}
.tp-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tp-header-icon { color: $rose-300; opacity: 0.85; flex-shrink: 0; }
.tp-title {
  font-size: 1rem;
  font-weight: 700;
  color: $text-primary;
  margin: 0;
}
.tp-close-btn {
  background: none;
  border: none;
  color: rgba($text-muted, 0.6);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  transition: color 0.15s;
  &:hover { color: $text-primary; }
}

// Tabs
.tp-tabs {
  display: flex;
  border-bottom: 1px solid rgba($violet-500, 0.12);
  flex-shrink: 0;
  padding: 0 12px;
  gap: 4px;
}
.tp-tab {
  flex: 1;
  padding: 10px 8px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: rgba($text-muted, 0.7);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: color 0.15s, border-color 0.15s;
  margin-bottom: -1px;

  &.active {
    color: $rose-300;
    border-bottom-color: $rose-400;
  }
  &.disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  &:not(.disabled):hover { color: $text-primary; }
}
.tp-tab-badge {
  background: rgba($rose-500, 0.2);
  color: $rose-300;
  border-radius: 99px;
  padding: 1px 6px;
  font-size: 0.65rem;
  font-weight: 700;
}

// Body
.tp-body {
  flex: 1;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba($violet-500, 0.3); border-radius: 4px; }
}

.tp-section { padding: 16px; }

.tp-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

// Presets
.tp-presets { flex-wrap: wrap; gap: 6px; }
.tp-preset-btn {
  padding: 5px 12px;
  background: rgba($violet-900, 0.5);
  border: 1px solid rgba($violet-400, 0.18);
  border-radius: 20px;
  color: rgba($text-secondary, 0.8);
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  transition: all 0.15s;
  &:hover { border-color: rgba($violet-400, 0.4); color: $text-primary; }
  &.active {
    background: rgba($rose-500, 0.18);
    border-color: rgba($rose-400, 0.4);
    color: $rose-300;
  }
}

// Custom input row
.tp-custom-input { gap: 10px; }
.tp-time-inputs {
  display: flex;
  align-items: center;
  gap: 6px;
}
.tp-time-field {
  display: flex;
  align-items: center;
  gap: 3px;
}
.tp-num-input {
  width: 52px;
  padding: 6px 8px;
  background: rgba($violet-900, 0.5);
  border: 1px solid rgba($violet-400, 0.2);
  border-radius: 8px;
  color: $text-primary;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  outline: none;
  -moz-appearance: textfield;
  appearance: textfield;
  &::-webkit-inner-spin-button, &::-webkit-outer-spin-button { -webkit-appearance: none; }
  &:focus { border-color: rgba($rose-400, 0.5); }
}
.tp-time-sep {
  font-size: 0.75rem;
  color: $text-muted;
  font-weight: 600;
}
.tp-set-btn {
  padding: 6px 14px;
  background: rgba($rose-500, 0.2);
  border: 1px solid rgba($rose-400, 0.3);
  border-radius: 8px;
  color: $rose-300;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { background: rgba($rose-500, 0.35); }
}

// Timer card — premium hub matching speak phase
.tp-timer-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto 6px;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  flex-shrink: 0;

  &::before {
    content: '';
    position: absolute;
    inset: -16px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba($violet-600, 0.14) 0%, transparent 70%);
    pointer-events: none;
    transition: background 0.5s ease;
  }

  &.is-running::before {
    background: radial-gradient(circle, rgba(251, 191, 36, 0.10) 0%, rgba($violet-600, 0.06) 50%, transparent 70%);
  }
  &.is-urgent::before {
    background: radial-gradient(circle, rgba(239, 68, 68, 0.12) 0%, transparent 65%);
  }
}

.tp-ring-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  filter: drop-shadow(0 0 8px rgba($violet-400, 0.18));
  transition: filter 0.5s ease;

  .is-running & { filter: drop-shadow(0 0 14px rgba(251, 191, 36, 0.28)); }
  .is-urgent  & { filter: drop-shadow(0 0 14px rgba(239, 68, 68, 0.40)); }
}

.tp-ring-track {
  fill: none;
  stroke: rgba($violet-500, 0.12);
  stroke-width: 7;
}

.tp-ring-fill {
  fill: none;
  stroke: $violet-400;
  stroke-width: 7;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear, stroke 0.5s ease;

  .is-running & { stroke: url(#tp-ring-grad); }
  .is-urgent  & { stroke: #ef4444; }
  .is-done    & { stroke: rgba(#ef4444, 0.2); }
}

.tp-timer-inner {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.tp-timer-time {
  font-family: $font-display;
  font-size: 2.9rem;
  font-weight: 700;
  color: $text-primary;
  letter-spacing: 0.04em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  transition: color 0.4s ease, text-shadow 0.4s ease;

  &.running {
    color: #fbbf24;
    text-shadow: 0 0 22px rgba(251, 191, 36, 0.45);
  }
  &.urgent {
    color: #ef4444;
    text-shadow: 0 0 18px rgba(239, 68, 68, 0.55);
    animation: tp-urgent-pulse 0.75s ease-in-out infinite;
  }
  &.done { color: rgba(#ef4444, 0.38); }
}

@keyframes tp-urgent-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.42; }
}

// Duration strip
.tp-dur-row {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  padding: 6px 12px;
  border-radius: $radius-md;
  background: rgba($violet-500, 0.05);
  border: 1px solid $border-subtle;
  margin-bottom: 2px;
}
.tp-dur-label {
  font-size: 0.64rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: $text-muted;
  padding-right: 2px;
}
.tp-dur-btn {
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid $border-subtle;
  background: transparent;
  color: $violet-300;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  &:hover:not(:disabled) { background: rgba($violet-500, 0.15); border-color: rgba($violet-400, 0.4); }
  &:disabled { opacity: 0.25; cursor: not-allowed; }
}
.tp-dur-val {
  font-family: $font-display;
  font-size: 0.88rem;
  font-weight: 700;
  color: #fbbf24;
  min-width: 36px;
  text-align: center;
}

// Controls
.tp-timer-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.tp-dtc-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.18s;
  &:disabled { opacity: 0.25; cursor: not-allowed; }
}

.tp-dtc-reset, .tp-dtc-btn:not(.tp-dtc-play):not(.tp-dtc-stop) {
  width: 38px;
  height: 38px;
  background: rgba($violet-800, 0.4);
  border: 1px solid $border-subtle;
  color: $text-muted;
  &:hover:not(:disabled) { background: rgba($violet-700, 0.5); border-color: rgba($violet-400, 0.35); color: $text-secondary; }
  &.active { color: $rose-300; border-color: rgba($rose-400, 0.4); }
}

.tp-dtc-play {
  width: 52px;
  height: 52px;
  background: rgba(251, 191, 36, 0.10);
  border: 1.5px solid rgba(251, 191, 36, 0.40);
  color: #fbbf24;
  box-shadow: 0 0 22px rgba(251, 191, 36, 0.22);
  &:hover:not(:disabled) { background: rgba(251, 191, 36, 0.18); box-shadow: 0 0 32px rgba(251, 191, 36, 0.4); transform: scale(1.07); }
}

.tp-dtc-stop {
  width: 52px;
  height: 52px;
  background: rgba($violet-500, 0.10);
  border: 1.5px solid rgba($violet-400, 0.40);
  color: $violet-300;
  box-shadow: 0 0 22px rgba($violet-400, 0.15);
  &:hover:not(:disabled) { background: rgba($violet-500, 0.18); transform: scale(1.07); }
}

// Players
.tp-players-filter {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
}
.tp-filter-btn {
  flex: 1;
  padding: 5px 8px;
  background: rgba($violet-900, 0.4);
  border: 1px solid rgba($violet-400, 0.15);
  border-radius: 8px;
  color: rgba($text-muted, 0.8);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: rgba($violet-400, 0.3); color: $text-secondary; }
  &.active {
    background: rgba($rose-500, 0.15);
    border-color: rgba($rose-400, 0.35);
    color: $rose-300;
  }
}

.tp-players-list { display: flex; flex-direction: column; gap: 6px; }

.tp-player-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: rgba($violet-900, 0.35);
  border: 1px solid rgba($violet-400, 0.1);
  border-radius: 10px;
  transition: all 0.15s;

  &.dead {
    opacity: 0.5;
    .tp-player-name { text-decoration: line-through; }
  }
  &.editing { border-color: rgba($rose-400, 0.35); }
}

.tp-player-avatar {
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba($violet-700, 0.5);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}
.tp-player-avatar-img {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
}
.tp-player-initial {
  font-size: 0.95rem;
  font-weight: 700;
  color: $violet-300;
}
.tp-captain-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  font-size: 0.7rem;
  line-height: 1;
}

.tp-player-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tp-player-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tp-player-num {
  font-size: 0.65rem;
  color: $text-muted;
}
.tp-edit-input {
  width: 100%;
  padding: 3px 7px;
  background: rgba($violet-900, 0.7);
  border: 1px solid rgba($rose-400, 0.4);
  border-radius: 6px;
  color: $text-primary;
  font-size: 0.85rem;
  outline: none;
}
.tp-edit-actions {
  display: flex;
  gap: 4px;
  margin-top: 3px;
}
.tp-edit-save, .tp-edit-cancel {
  padding: 2px 8px;
  border-radius: 4px;
  border: none;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}
.tp-edit-save   { background: rgba($village-green, 0.25); color: $village-green; }
.tp-edit-cancel { background: rgba($rose-500, 0.2); color: $rose-300; }

.tp-player-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.tp-act-btn {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: rgba($violet-800, 0.4);
  border: 1px solid rgba($violet-400, 0.14);
  color: rgba($text-muted, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  transition: all 0.15s;
  &:hover { background: rgba($violet-700, 0.5); color: $text-primary; border-color: rgba($violet-400, 0.3); }
  &.kill:hover  { background: rgba($rose-500, 0.25); color: $rose-300; border-color: rgba($rose-400, 0.35); }
  &.revive:hover { background: rgba($village-green, 0.2); color: $village-green; border-color: rgba($village-green, 0.35); }
  &.active { background: rgba(255, 200, 50, 0.15); border-color: rgba(255, 200, 50, 0.35); }
}

.tp-empty {
  text-align: center;
  color: $text-muted;
  font-size: 0.82rem;
  padding: 20px;
}

.tp-save-status {
  margin-top: 12px;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  min-height: 18px;
  &.saving { color: rgba($text-muted, 0.7); }
  &.saved  { color: $village-green; }
  &.error  { color: $rose-400; }
}
</style>
