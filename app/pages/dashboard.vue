<template>
  <div class="dashboard-screen">
    <NuxtLayout name="game">
      <!-- Welcome Section -->
      <section class="welcome-section">
        <div class="welcome-greeting">
          <span class="welcome-star">✦</span>
          <h1 class="welcome-title">
            Bienvenue, <span class="text-gradient">{{ authStore.displayName }}</span>
          </h1>
          <p class="welcome-sub">Prête à orchestrer le village ? 🌙</p>
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="quick-actions">
        <button class="action-card" @click="handleNewGame">
          <div class="action-icon-wrap">
            <Icon name="game-icons:wolf-howl" class="action-icon" />
          </div>
          <div class="action-text">
            <div class="action-label">Nouvelle Partie</div>
            <div class="action-desc">Créer une session de jeu</div>
          </div>
        </button>

        <NuxtLink to="/grimoire" class="action-card">
          <div class="action-icon-wrap">
            <Icon name="game-icons:spell-book" class="action-icon" />
          </div>
          <div class="action-text">
            <div class="action-label">Grimoire</div>
            <div class="action-desc">Gérer les rôles & pouvoirs</div>
          </div>
        </NuxtLink>

        <div
          class="action-card active-game"
          v-if="gameStore.currentGame && gameStore.isActive"
        >
          <!-- Background floating particles -->
          <div class="card-bg-particles">
            <span v-for="i in 12" :key="i" class="bg-star" :style="{ animationDelay: `${i * 0.4}s` }">✦</span>
          </div>

          <div class="active-game-clickable" @click="navigateTo(`/game/${gameStore.currentGame._id}`)">
            <div class="active-game-split">
              <!-- Left Half: Fairytale Style -->
              <div class="active-game-left">
                <div class="active-game-icon-wrap">
                  <Icon name="game-icons:stars-stack" class="active-game-icon" />
                  <span class="live-dot-corner" />
                </div>
                <div class="active-game-text">
                  <div class="active-game-title">Partie en Cours</div>
                  <div class="active-game-subtitle">{{ formatPhase(gameStore.currentGame.status) }}</div>
                </div>
              </div>

              <!-- Diagonal Divider -->
              <div class="active-game-divider" />

              <!-- Right Half: Players -->
              <div class="active-game-right">
                <div class="players-preview-compact">
                  <div 
                    v-for="(player, idx) in gameStore.currentGame.players.slice(0, 5)" 
                    :key="player.id"
                    class="player-avatar-dashboard"
                    :style="{ zIndex: 5 - idx }"
                    :title="`${player.name}${player.roleName ? ' - ' + player.roleName : ''}`"
                  >
                    <img 
                      v-if="player.avatar" 
                      :src="player.avatar" 
                      :alt="player.name"
                      class="avatar-img"
                    />
                    <span v-else class="avatar-initial">
                      {{ player.name.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                  <div v-if="gameStore.currentGame.players.length > 5" class="player-avatar-dashboard more">
                    +{{ gameStore.currentGame.players.length - 5 }}
                  </div>
                </div>
                <div class="players-count-compact">
                  <span class="count-num">{{ gameStore.currentGame.players.length }}</span>
                  <span class="count-txt">joueurs</span>
                </div>
                <div class="enter-arrow">
                  <Icon name="game-icons:wolf-howl" class="arrow-icon" />
                </div>
              </div>
            </div>
          </div>

          <!-- End Game Button -->
          <div class="active-game-footer">
            <button 
              class="btn-end-game" 
              :disabled="isEndingGame"
              @click.stop="handleEndGame"
            >
              <span v-if="!isEndingGame" class="end-game-content">
                <Icon name="mdi:skull-crossbones" class="end-icon" />
                <span>Terminer la partie</span>
              </span>
              <span v-else class="loading-with-spinner">
                <span class="spinner"></span>
                <span>Fin en cours...</span>
              </span>
            </button>
          </div>
        </div>
      </section>

      <!-- Recent Games -->
      <section class="recent-games" v-if="gameStore.games.length">
        <div class="section-header">
          <h2 class="section-title">Parties Récentes</h2>
          <span class="section-count">{{ gameStore.games.length }} parties</span>
        </div>
        <div class="games-grid">
          <div
            v-for="game in gameStore.games"
            :key="game._id"
            class="game-card glass-card"
            :class="{ 'is-ended': game.status === 'END' }"
            @click="game.status !== 'END' && navigateTo(`/game/${game._id}`)"
          >
            <div class="game-card-header">
              <span class="game-status" :class="game.status === 'END' ? 'ended' : 'active'">
                {{ game.status === 'END' ? '🌙 Terminée' : '✨ Active' }}
              </span>
              <span class="game-date">{{ formatDate(game.createdAt) }}</span>
            </div>
            <div class="game-card-body">
              <div class="game-stat">
                <span class="stat-value">{{ game.players?.length || 0 }}</span>
                <span class="stat-label">Joueurs</span>
              </div>
              <div class="game-stat">
                <span class="stat-value">{{ game.nightNumber || 0 }}</span>
                <span class="stat-label">Nuits</span>
              </div>
              <div class="game-stat">
                <span class="stat-value">{{ formatPhase(game.status) }}</span>
                <span class="stat-label">Phase</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Empty state -->
      <section v-else class="empty-state">
        <div class="empty-illustration">
          <span class="empty-moon">🌙</span>
          <div class="empty-stars">
            <span v-for="i in 5" :key="i" class="empty-star" :style="{ animationDelay: i * 0.4 + 's' }">✦</span>
          </div>
        </div>
        <h3>Aucune partie encore</h3>
        <p>Créez votre première partie pour commencer la chasse.</p>
        <button class="btn-primary" @click="handleNewGame">✨ Créer une partie</button>
      </section>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore()
const gameStore = useGameStore()
const { confirm, success, warning, error: showError } = useNotification()
const isEndingGame = ref(false)

onMounted(async () => {
  await gameStore.fetchGames()
  // Also fetch current game if there's one active
  if (gameStore.games.length > 0) {
    const activeGame = gameStore.games.find(g => g.status !== 'END')
    if (activeGame) {
      await gameStore.fetchGame(activeGame._id)
    }
  }
})

async function handleNewGame() {
  try {
    const res = await gameStore.createGame()
    if (res?.success && gameStore.currentGame) {
      navigateTo(`/game/${gameStore.currentGame._id}`)
    }
  } catch (error: any) {
    // Show error if narrator already has an active game (409)
    const errorMsg = error?.data?.statusMessage || error?.message || 'Failed to create game'
    
    if (error?.statusCode === 409) {
      // There's an active game - refresh the list and show which game
      await gameStore.fetchGames()
      const activeGame = gameStore.games.find(g => g.status !== 'END')
      if (activeGame) {
        const goToGame = await confirm(`${errorMsg}\n\nVoulez-vous ouvrir cette partie ?`, 'Partie active', 'Ouvrir', 'Annuler')
        if (goToGame) {
          navigateTo(`/game/${activeGame._id}`)
        }
      }
    } else {
      alert(`❌ ${errorMsg}`)
    }
  }
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function handleEndGame() {
  if (!gameStore.currentGame || isEndingGame.value) return

  const confirmed = await confirm(
    'Cette action est irréversible. La partie sera définitivement terminée.',
    '⚠️ Terminer la partie ?',
    'Oui, terminer',
    'Annuler',
    { doubleConfirm: true, doubleConfirmText: '🔥 Confirmer la fin' }
  )

  if (!confirmed) return

  isEndingGame.value = true
  try {
    await gameStore.transitionPhase('END' as any)
    success('🌙 La partie est terminée')
    await gameStore.fetchGames()
  } catch (err: any) {
    const msg = err?.data?.statusMessage || err?.message || 'Échec de la terminaison'
    showError(`❌ ${msg}`)
  } finally {
    isEndingGame.value = false
  }
}

function formatPhase(phase: string): string {
  return phase.replace(/_/g, ' ')
}
</script>

<style lang="scss">
@use '~/assets/scss/variables' as *;

.dashboard-screen {
  background:
    radial-gradient(ellipse at 30% 20%, rgba($violet-600, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba($pink-400, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba($violet-800, 0.2) 0%, transparent 70%);
  
  .welcome-section {
    text-align: center;
    padding: 48px 0 36px;
  }

  .welcome-greeting {
    position: relative;
    display: inline-block;
  }

  .welcome-star {
    position: absolute;
    top: -8px;
    right: -20px;
    font-size: 0.7rem;
    color: $pink-300;
    animation: twinkle 2s ease-in-out infinite;
  }

  .welcome-title {
    font-size: 1.9rem;
    font-weight: 700;

    .text-gradient {
      @include elegant-text();
      font-style: italic;
      background: linear-gradient(135deg, $violet-300, $pink-300);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }

  .welcome-sub {
    color: $text-muted;
    margin-top: 8px;
    font-size: 1.05rem;
    font-weight: 500;
  }
}

@keyframes twinkle {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

@keyframes pulse-glow {
  0%, 100% { 
    opacity: 1; 
    box-shadow: 0 0 8px rgba($violet-400, 0.6);
  }
  50% { 
    opacity: 0.6; 
    box-shadow: 0 0 16px rgba($violet-400, 0.9);
  }
}

@keyframes pulse-glow-red {
  0%, 100% { 
    opacity: 1; 
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
  }
  50% { 
    opacity: 0.6; 
    box-shadow: 0 0 16px rgba(239, 68, 68, 0.9);
  }
}

// ─── Quick Actions ──────────────────────────────────────────
.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-bottom: 40px;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  .active-game {
    grid-column: 1 / -1;
  }
}

.action-card {
  @include glass(0.05);
  border-radius: $radius-lg;
  padding: 18px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
  cursor: pointer;
  transition: all $transition-base;
  text-decoration: none;
  color: inherit;
  border: 1px solid transparent;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba($violet-400, 0.3);
    background: rgba($violet-500, 0.08);
    box-shadow: 0 8px 24px rgba($violet-500, 0.15);

    .action-icon-wrap {
      transform: scale(1.05);
    }
  }

  &.active-game {
    border: 1px solid $border-subtle;
    padding: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    background: rgba($violet-500, 0.05);
    cursor: default;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;

    // Background floating particles always running
    .card-bg-particles {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }

    .bg-star {
      position: absolute;
      font-size: 0.5rem;
      opacity: 0;
      animation: none;
      filter: drop-shadow(0 0 3px rgba($violet-400, 0.6));
      transition: color 0.4s ease, filter 0.4s ease;

      &:nth-child(1)  { left: 5%;  top: 15%; color: $pink-300; font-size: 0.55rem; }
      &:nth-child(2)  { left: 15%; top: 70%; color: $violet-200; font-size: 0.4rem; }
      &:nth-child(3)  { left: 25%; top: 30%; color: $violet-300; font-size: 0.5rem; }
      &:nth-child(4)  { left: 38%; top: 80%; color: $pink-300; font-size: 0.35rem; }
      &:nth-child(5)  { left: 50%; top: 20%; color: $violet-200; font-size: 0.45rem; }
      &:nth-child(6)  { left: 60%; top: 60%; color: $pink-300; font-size: 0.5rem; }
      &:nth-child(7)  { left: 70%; top: 10%; color: $violet-300; font-size: 0.4rem; }
      &:nth-child(8)  { left: 78%; top: 75%; color: $violet-200; font-size: 0.55rem; }
      &:nth-child(9)  { left: 88%; top: 35%; color: $pink-300; font-size: 0.4rem; }
      &:nth-child(10) { left: 92%; top: 65%; color: $violet-300; font-size: 0.45rem; }
      &:nth-child(11) { left: 42%; top: 45%; color: $violet-200; font-size: 0.35rem; }
      &:nth-child(12) { left: 8%;  top: 50%; color: $pink-300; font-size: 0.5rem; }
    }

    &:hover {
      .active-game-footer {
        max-height: 50px;
        opacity: 1;
        padding: 8px 24px 12px;
      }

      .bg-star {
        animation: bg-float 2.5s ease-in-out infinite;
      }

      .enter-arrow {
        opacity: 1;
        transform: translateX(0);

        .arrow-icon {
          animation: arrow-float 0.8s ease-in-out infinite;
        }
      }
    }

    // Red danger state when hovering the footer
    &:has(.active-game-footer:hover) {
      border-color: rgba(239, 68, 68, 0.4);
      background: rgba(239, 68, 68, 0.04);
      box-shadow: 0 0 30px rgba(239, 68, 68, 0.08), inset 0 0 40px rgba(239, 68, 68, 0.02);

      .bg-star {
        color: #fca5a5 !important;
        filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.8)) !important;
        animation: bg-float-danger 1.5s ease-in-out infinite !important;
      }

      .enter-arrow {
        opacity: 1;
        transform: translateX(0);

        .arrow-icon {
          color: #ef4444 !important;
          filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.7)) !important;
          animation: arrow-danger-shake 0.3s ease-in-out infinite !important;
        }
      }

      .active-game-divider {
        background: linear-gradient(
          to bottom,
          transparent 0%,
          rgba(239, 68, 68, 0.25) 20%,
          rgba(239, 68, 68, 0.25) 80%,
          transparent 100%
        );

        &::before {
          background: #ef4444;
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.6);
        }
      }

      .active-game-title {
        background: linear-gradient(135deg, #fca5a5, #ef4444);
        -webkit-background-clip: text;
        background-clip: text;
      }

      .active-game-subtitle {
        color: rgba(239, 68, 68, 0.5);
      }

      .live-dot-corner {
        background: #ef4444;
        box-shadow: 0 0 12px rgba(239, 68, 68, 0.8);
        animation: pulse-glow-red 2s ease-in-out infinite;
      }

      .active-game-icon {
        color: #fca5a5;
      }

      .active-game-icon-wrap {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.08));
        border-color: rgba(239, 68, 68, 0.2);
      }

      .count-num {
        background: linear-gradient(135deg, #fca5a5, #ef4444);
        -webkit-background-clip: text;
        background-clip: text;
      }

      .player-avatar-dashboard {
        border-color: rgba(239, 68, 68, 0.3);
      }
    }
  }
}

// Active Game Card Split Design with Diagonal Divider
.active-game-clickable {
  display: flex;
  align-items: center;
  padding: 24px;
  cursor: pointer;
  transition: background $transition-base;
  border-radius: $radius-lg;

  &:hover {
    background: rgba($violet-500, 0.04);
  }
}

.active-game-split {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 32px;
  position: relative;
}

.active-game-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  z-index: 2;
}

.active-game-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: $radius-md;
  background: linear-gradient(135deg, rgba($violet-500, 0.2), rgba($pink-400, 0.1));
  border: 1px solid $border-subtle;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  transition: transform $transition-base;

  .active-game-icon {
    font-size: 28px;
    color: $violet-300;
  }

  .action-card:hover & {
    transform: scale(1.08);
  }
}

.live-dot-corner {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: $violet-400;
  border: 2px solid $bg-primary;
  box-shadow: 0 0 12px rgba($violet-400, 0.8);
  animation: pulse-glow 2s ease-in-out infinite;
}

.active-game-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.active-game-title {
  font-family: $font-display;
  font-size: 1.1rem;
  font-weight: 700;
  font-style: italic;
  background: linear-gradient(135deg, $violet-300, $pink-300);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
  transition: all 0.4s ease;
}

.active-game-subtitle {
  font-size: 0.78rem;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 600;
  transition: color 0.4s ease;
}

.active-game-divider {
  position: absolute;
  left: 50%;
  top: -24px;
  bottom: -24px;
  width: 1px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba($violet-400, 0.3) 20%,
    rgba($violet-400, 0.3) 80%,
    transparent 100%
  );
  transform: translateX(-50%) skewX(-15deg);
  pointer-events: none;
  transition: background 0.4s ease;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: $violet-400;
    box-shadow: 0 0 12px rgba($violet-400, 0.6);
    transition: all 0.4s ease;
  }
}

.active-game-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  justify-content: flex-end;
  z-index: 2;
}

.players-preview-compact {
  display: flex;
  align-items: center;
}

.player-avatar-dashboard {
  width: 32px !important;
  height: 32px !important;
  border-radius: 50%;
  border: 2px solid $bg-primary;
  background: linear-gradient(135deg, rgba($violet-500, 0.3), rgba($pink-400, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-left: -8px;
  transition: all $transition-fast;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);

  &:first-child {
    margin-left: 0;
  }

  &:hover {
    transform: translateY(-3px) scale(1.08);
    z-index: 100 !important;
  }

  &.more {
    font-size: 0.65rem;
    font-weight: 700;
    color: $violet-200;
    background: rgba($violet-600, 0.3);
    border-color: rgba($violet-400, 0.3);
  }

  .avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-initial {
    font-size: 0.75rem;
    font-weight: 700;
    color: $violet-100;
  }
}

.players-count-compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;

  .count-num {
    font-size: 1.6rem;
    font-weight: 700;
    background: linear-gradient(135deg, $violet-300, $pink-300);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1;
    transition: all 0.4s ease;
  }

  .count-txt {
    font-size: 0.65rem;
    color: $text-muted;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
    transition: color 0.4s ease;
  }
}

// Enter arrow
.enter-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  z-index: 2;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);

  .arrow-icon {
    font-size: 30px;
    color: $violet-300;
    filter: drop-shadow(0 0 8px rgba($violet-400, 0.6));
    transition: all 0.35s ease;
  }
}

// Background particles keyframes
@keyframes bg-float {
  0% { opacity: 0; transform: translateY(0) scale(0.5); }
  15% { opacity: 0.7; }
  50% { opacity: 0.4; transform: translateY(-12px) scale(1); }
  85% { opacity: 0.7; }
  100% { opacity: 0; transform: translateY(0) scale(0.5); }
}

@keyframes bg-float-danger {
  0% { opacity: 0; transform: translateY(0) scale(0.5); }
  15% { opacity: 0.9; }
  30% { transform: translateY(-8px) translateX(3px) scale(1.2); }
  50% { opacity: 0.5; transform: translateY(-14px) translateX(-2px) scale(0.9); }
  70% { transform: translateY(-6px) translateX(2px) scale(1.1); }
  85% { opacity: 0.8; }
  100% { opacity: 0; transform: translateY(0) scale(0.5); }
}

@keyframes arrow-float {
  0%, 100% { transform: translateX(0); filter: drop-shadow(0 0 6px rgba($violet-400, 0.5)); }
  50% { transform: translateX(5px); filter: drop-shadow(0 0 14px rgba($pink-400, 0.8)); }
}

@keyframes arrow-danger-shake {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  20% { transform: translateX(2px) rotate(3deg); }
  40% { transform: translateX(-2px) rotate(-3deg); }
  60% { transform: translateX(1.5px) rotate(2deg); }
  80% { transform: translateX(-1px) rotate(-1deg); }
}

// ─── End Game Button ────────────────────────────────────────
.active-game-footer {
  width: 100%;
  display: flex;
  justify-content: center;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  padding: 0 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-end-game {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: $radius-md;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;
  background: rgba(239, 68, 68, 0.08);
  color: rgba(239, 68, 68, 0.7);
  border: 1px solid rgba(239, 68, 68, 0.15);

  .end-game-content {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .end-icon {
    font-size: 14px;
  }

  &:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.35);
    box-shadow: 0 0 16px rgba(239, 68, 68, 0.12);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }

  .loading-with-spinner {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(239, 68, 68, 0.2);
    border-top-color: #ef4444;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
}
.action-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: $radius-md;
  background: linear-gradient(135deg, rgba($violet-500, 0.15), rgba($pink-400, 0.08));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  transition: transform $transition-base;

  .action-icon {
    font-size: 26px;
    color: $violet-300;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &.live {
    background: linear-gradient(135deg, rgba($pink-400, 0.15), rgba($violet-500, 0.1));
    
    .action-icon {
      color: $pink-300;
    }
  }
}

.action-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
}

.action-label {
  font-weight: 700;
  font-size: 0.95rem;
  color: $text-primary;
  line-height: 1.2;
}

.action-desc {
  font-size: 0.78rem;
  color: $text-muted;
  font-weight: 500;
  line-height: 1.3;
}

// ─── Section Header ─────────────────────────────────────────
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  @include elegant-text();
  font-size: 1.1rem;
  color: $violet-300;
  font-style: italic;
}

.section-count {
  font-size: 0.75rem;
  color: $text-muted;
}

// ─── Games Grid ─────────────────────────────────────────────
.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.game-card {
  cursor: pointer;
  transition: all $transition-base;

  &:hover {
    transform: translateY(-4px);
    border-color: $border-active;
    box-shadow: $glow-violet;
  }

  &.is-ended {
    cursor: default;
    opacity: 0.55;
    pointer-events: none;
  }
}

.game-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.game-status {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 100px;

  &.active {
    background: rgba($violet-500, 0.12);
    color: $violet-300;
    border: 1px solid rgba($violet-400, 0.2);
  }

  &.ended {
    background: rgba($text-muted, 0.08);
    color: $text-muted;
    border: 1px solid rgba($text-muted, 0.15);
  }
}

.game-date {
  font-size: 0.75rem;
  color: $text-muted;
}

.game-card-body {
  display: flex;
  justify-content: space-around;
}

.game-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  .stat-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: $violet-300;
  }

  .stat-label {
    font-size: 0.65rem;
    color: $text-muted;
  }
}

// ─── Empty State ────────────────────────────────────────────
.empty-state {
  text-align: center;
  padding: 60px 0;
  color: $text-muted;

  .empty-illustration {
    position: relative;
    display: inline-block;
    margin-bottom: 20px;
  }

  .empty-moon {
    font-size: 3.5rem;
    opacity: 0.5;
    animation: gentle-glow 4s ease-in-out infinite;
  }

  .empty-stars {
    position: absolute;
    inset: -20px;
  }

  .empty-star {
    position: absolute;
    font-size: 0.5rem;
    color: $violet-300;
    animation: twinkle 2s ease-in-out infinite;
    &:nth-child(1) { top: 0; left: 0; }
    &:nth-child(2) { top: -10px; right: 5px; color: $pink-300; }
    &:nth-child(3) { bottom: 5px; left: -5px; }
    &:nth-child(4) { bottom: -5px; right: 0; color: $lavender; }
    &:nth-child(5) { top: 50%; right: -15px; }
  }

  h3 {
    color: $text-secondary;
    margin-bottom: 8px;
    font-weight: 600;
  }

  p {
    margin-bottom: 20px;
    font-size: 0.88rem;
  }
}
</style>
