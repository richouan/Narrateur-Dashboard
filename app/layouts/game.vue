<template>
  <div class="layout-game" :class="phaseClass">
    <!-- Top Nav Bar -->
    <header class="game-header">
      <div class="header-left">
        <NuxtLink to="/dashboard" class="logo-mark">
          <span class="logo-icon">🌙</span>
          <span class="logo-text">Loup Garou</span>
        </NuxtLink>
        
        <!-- Navigation Menu -->
        <nav class="nav-menu">
          <NuxtLink to="/dashboard" class="nav-link" activeClass="active">
            🏠 Accueil
          </NuxtLink>
          <NuxtLink to="/grimoire" class="nav-link" activeClass="active">
            ✦ Grimoire
          </NuxtLink>
          <NuxtLink to="/profile" class="nav-link" activeClass="active">
            👤 Profil
          </NuxtLink>
          <NuxtLink v-if="authStore.isOwner" to="/settings" class="nav-link" activeClass="active">
            ⚙️ Admin
          </NuxtLink>
        </nav>
      </div>

      <div class="header-center" v-if="gameStore.currentGame">
        <NuxtLink 
          :to="`/game/${gameStore.currentGame._id}`" 
          class="phase-indicator"
        >
          <div class="phase-dot" :class="phaseClass" />
          <span class="phase-label">{{ formatPhase(gameStore.currentPhase) }}</span>
          <span class="phase-number" v-if="gameStore.currentGame.nightNumber > 0">
            {{ gameStore.currentPhase.includes('NIGHT') ? `Nuit ${gameStore.currentGame.nightNumber}` : `Jour ${gameStore.currentGame.dayNumber}` }}
          </span>
        </NuxtLink>
      </div>

      <div class="header-right">
        <div class="connection-dot" :class="{ connected: wsConnected }" />
        <span class="user-name">{{ authStore.displayName }}</span>
        <span class="user-role badge-violet">{{ authStore.user?.role }}</span>
        <button class="btn-ghost btn-sm" @click="authStore.logout()">
          Déconnexion
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="game-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore()
const gameStore = useGameStore()
const { connected: wsConnected, connect } = useWebSocket()

onMounted(() => {
  connect()
})

const phaseClass = computed(() => {
  const phase = gameStore.currentPhase
  if (phase.includes('NIGHT') || phase === 'FIRST_NIGHT') return 'phase-night'
  if (phase === 'DAY' || phase === 'VOTE') return 'phase-day'
  if (phase === 'END') return 'phase-end'
  return 'phase-setup'
})

function formatPhase(phase: string): string {
  const labels: Record<string, string> = {
    SETUP: 'Préparation',
    CAPTAIN_APPLICATION: 'Candidature',
    CAPTAIN_SPIN: 'Tirage',
    CAPTAIN_VOTE: 'Vote Capitaine',
    FIRST_NIGHT: 'Première Nuit',
    DAY: 'Jour',
    VOTE: 'Vote',
    NIGHT: 'Nuit',
    END: 'Fin',
  }
  return labels[phase] || phase.replace(/_/g, ' ')
}
</script>

<style lang="scss">
@use '~/assets/scss/variables' as *;

.layout-game {
  min-height: 100vh;
  position: relative;
  z-index: 1;
  transition: background $transition-cinematic;
  background: linear-gradient(180deg, $bg-primary 0%, $bg-secondary 100%);

  &.phase-night {
    background: linear-gradient(180deg, #08021a 0%, #0e0628 40%, #150a38 100%);
  }

  &.phase-day {
    background: linear-gradient(180deg, #180e2e 0%, #1c1040 40%, #221350 100%);
  }

  &.phase-setup {
    background: linear-gradient(180deg, $bg-primary 0%, $bg-secondary 100%);
  }

  &.phase-end {
    background: linear-gradient(180deg, #0c0218 0%, #160830 100%);
  }
}

.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 28px;
  @include glass(0.05);
  border-bottom: 1px solid $border-subtle;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(20px) saturate(1.2);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-mark {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;

  .logo-icon {
    font-size: 1.4rem;
    animation: gentle-glow 3s ease-in-out infinite;
  }

  .logo-text {
    @include elegant-text();
    font-size: 0.95rem;
    font-style: italic;
    background: linear-gradient(135deg, $violet-200, $pink-300);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 700;
  }
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 16px;
  padding-left: 16px;
  border-left: 1px solid rgba($violet-400, 0.1);
}

.nav-link {
  padding: 8px 14px;
  border-radius: $radius-sm;
  font-size: 0.88rem;
  font-weight: 500;
  color: $text-secondary;
  text-decoration: none;
  transition: all $transition-fast;
  
  &:hover {
    background: rgba($violet-500, 0.08);
    color: $text-primary;
  }
  
  &.active {
    background: rgba($violet-500, 0.12);
    color: $violet-300;
    font-weight: 600;
  }
}

.header-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.phase-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 22px;
  @include glass(0.08);
  border-radius: 100px;
  border: 1px solid rgba($violet-400, 0.1);
  text-decoration: none;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    border-color: rgba($violet-400, 0.3);
    background: rgba($violet-500, 0.08);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba($violet-500, 0.2);
  }

  &:active {
    transform: translateY(0);
  }
}

.phase-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse-glow 2s ease-in-out infinite;

  &.phase-night { background: $violet-400; box-shadow: 0 0 8px rgba($violet-400, 0.4); }
  &.phase-day { background: $day-accent; box-shadow: 0 0 8px rgba($day-accent, 0.3); }
  &.phase-setup { background: $text-muted; }
  &.phase-end { background: $rose-400; box-shadow: 0 0 8px rgba($rose-400, 0.3); }
}

.phase-label {
  @include elegant-text();
  font-size: 0.78rem;
  font-style: italic;
  color: $text-primary;
}

.phase-number {
  font-size: 0.7rem;
  color: $text-secondary;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  white-space: nowrap;
}

.connection-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: $rose-400;
  transition: background $transition-fast;

  &.connected {
    background: $village-green;
    box-shadow: $glow-green;
  }
}

.user-name {
  font-size: 0.75rem;
  color: $text-secondary;
}

.user-role {
  font-size: 0.65rem !important;
  padding: 2px 8px !important;
  font-weight: 600;
}

.btn-sm {
  padding: 7px 14px;
  font-size: 0.75rem;
}

.game-main {
  padding: 28px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100vh - 80px);
}
</style>
