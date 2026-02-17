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

        <button
          class="action-card active-game"
          v-if="gameStore.currentGame && gameStore.isActive"
          @click="navigateTo(`/game/${gameStore.currentGame._id}`)"
        >
          <div class="action-icon-wrap live">
            <Icon name="game-icons:stars-stack" class="action-icon" />
            <span class="live-dot" />
          </div>
          <div class="action-text">
            <div class="action-label">Partie en Cours</div>
            <div class="action-desc">Reprendre la session active</div>
          </div>
        </button>
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
            @click="navigateTo(`/game/${game._id}`)"
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
        const goToGame = confirm(`${errorMsg}\n\nVoulez-vous ouvrir cette partie ?`)
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
    border: 1px solid rgba($pink-400, 0.2);

    &:hover {
      box-shadow: $glow-pink;
    }
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

.live-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: $pink-400;
  box-shadow: 0 0 8px rgba($pink-400, 0.6);
  animation: pulse-glow 2s ease-in-out infinite;
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
