<template>
  <div class="layout-game" :class="isGamePage ? phaseClass : ''">

    <!-- ══════════════════════════════════════════════════════
         HEADER
         ══════════════════════════════════════════════════════ -->
    <header class="g-hdr">

      <!-- Logo — absolute left -->
      <NuxtLink to="/dashboard" class="g-hdr__logo">
        <span class="g-hdr__logo-icon">🌙</span>
        <span class="g-hdr__logo-text">Loup Garou</span>
      </NuxtLink>

      <!-- ── THE BUBBLE ── centered pill with all nav inside -->
      <div class="g-bubble">

        <!-- Left nav buttons -->
        <NuxtLink to="/dashboard" class="g-bubble__btn" activeClass="g-bubble__btn--active">
          <Icon name="mdi:home-outline" class="g-bubble__icon" />
          <span class="g-bubble__label">Accueil</span>
        </NuxtLink>

        <NuxtLink to="/grimoire" class="g-bubble__btn" activeClass="g-bubble__btn--active">
          <Icon name="game-icons:spell-book" class="g-bubble__icon" />
          <span class="g-bubble__label">Grimoire</span>
        </NuxtLink>

        <!-- Divider -->
        <div class="g-bubble__div" />

        <!-- Avatar — centerpiece (ring + initial/img only, no text) -->
        <NuxtLink to="/profile" class="g-bubble__avatar-wrap">
          <div class="g-bubble__avatar-ring" :class="wsConnected ? 'ring--on' : 'ring--off'">
            <div class="g-bubble__avatar-inner">
              <img
                v-if="discordAvatar || authStore.user?.avatar"
                :src="(discordAvatar || authStore.user?.avatar)!"
                :alt="authStore.displayName"
                class="g-bubble__avatar-img"
                @error="(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style') }"
              />
              <span class="g-bubble__avatar-initial" :style="(discordAvatar || authStore.user?.avatar) ? 'display:none' : ''">
                {{ authStore.displayName.charAt(0).toUpperCase() }}
              </span>
            </div>
          </div>
        </NuxtLink>

        <!-- Divider -->
        <div class="g-bubble__div" />

        <!-- Right nav buttons -->
        <NuxtLink to="/profile" class="g-bubble__btn" activeClass="g-bubble__btn--active">
          <Icon name="mdi:account-circle-outline" class="g-bubble__icon" />
          <span class="g-bubble__label">Profil</span>
        </NuxtLink>

        <NuxtLink v-if="authStore.isOwner" to="/settings" class="g-bubble__btn" activeClass="g-bubble__btn--active">
          <Icon name="mdi:cog-outline" class="g-bubble__icon" />
          <span class="g-bubble__label">Admin</span>
        </NuxtLink>

        <button class="g-bubble__logout" @click="authStore.logout()" title="Déconnexion">
          <Icon name="mdi:logout-variant" class="g-bubble__icon" />
          <span class="g-bubble__label">Exit</span>
        </button>

      </div><!-- /g-bubble -->

      <!-- Phase pill + WS dot — absolute right -->
      <div class="g-hdr__right">
        <NuxtLink
          v-if="gameStore.currentGame && gameStore.isActive"
          :to="`/game/${gameStore.currentGame._id}`"
          class="g-phase-pill"
          :class="phaseClass"
        >
          <span class="g-phase-dot" :class="phaseClass" />
          <span class="g-phase-label">{{ formatPhase(gameStore.currentPhase) }}</span>
          <span class="g-phase-num" v-if="gameStore.currentGame.nightNumber > 0">
            · {{ gameStore.currentPhase.includes('NIGHT') || gameStore.currentPhase === 'FIRST_NIGHT'
              ? `Nuit ${gameStore.currentGame.nightNumber}`
              : `Jour ${gameStore.currentGame.dayNumber}` }}
          </span>
        </NuxtLink>
        <div class="g-ws-dot" :class="{ on: wsConnected }" :title="wsConnected ? 'Connecté' : 'Déconnecté'" />
      </div>

    </header>

    <!-- Main content -->
    <main class="g-main">
      <slot />
    </main>

    <NotificationContainer />
    <ToolsPanel v-if="authStore.isAuthenticated" />
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore()
const gameStore = useGameStore()
const route = useRoute()
const { connected: wsConnected, connect } = useWebSocket()

const discordAvatar = ref<string | null>(null)

onMounted(async () => {
  connect()
  // Fetch per-user Discord profile (avatar stored on User doc by selfbot)
  if (authStore.user?.discordId) {
    try {
      const res = await $fetch<{ success: boolean; data: { avatar?: string | null } | null }>('/api/auth/discord-profile')
      if (res.success && res.data?.avatar) discordAvatar.value = res.data.avatar
    } catch {}
  }
})

// Only apply phase-specific backgrounds on the actual game page
const isGamePage = computed(() => {
  return route.path.startsWith('/game/')
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
    SETUP: 'Lobby',
    CONFIRMATION: 'Confirmation',
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

// ─────────────────────────────────────────────────────────────
// Layout shell
// ─────────────────────────────────────────────────────────────
.layout-game {
  min-height: 100vh;
  position: relative;
  z-index: 1;
  transition: background $transition-cinematic;
  background: linear-gradient(180deg, $bg-primary 0%, $bg-secondary 100%);

  &.phase-night { background: linear-gradient(180deg, #08021a 0%, #0e0628 40%, #150a38 100%); }
  &.phase-day   { background: linear-gradient(180deg, #180e2e 0%, #1c1040 40%, #221350 100%); }
  &.phase-setup { background: linear-gradient(180deg, $bg-primary 0%, $bg-secondary 100%); }
  &.phase-end   { background: linear-gradient(180deg, #0c0218 0%, #160830 100%); }
}

.g-main {
  padding: 28px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100vh - 72px);
  position: relative;
  z-index: 1;
}

// ─────────────────────────────────────────────────────────────
// Header strip — invisible positioning layer only
// ─────────────────────────────────────────────────────────────
.g-hdr {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  background: rgba(10, 4, 22, 0.72);
  border-bottom: 1px solid rgba($violet-500, 0.12);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
}

// Logo — absolute far left
.g-hdr__logo {
  position: absolute;
  left: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  transition: opacity 0.2s;

  &:hover { opacity: 0.7; }
}

.g-hdr__logo-icon {
  font-size: 1.2rem;
  filter: drop-shadow(0 0 6px rgba($violet-400, 0.5));
}

.g-hdr__logo-text {
  font-size: 0.88rem;
  font-weight: 700;
  font-style: italic;
  background: linear-gradient(135deg, $violet-200, $pink-300);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
}

// Phase pill + WS — absolute far right
.g-hdr__right {
  position: absolute;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.g-phase-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px 4px 9px;
  border-radius: 100px;
  background: rgba($violet-900, 0.6);
  border: 1px solid rgba($violet-400, 0.2);
  text-decoration: none;
  transition: all 0.18s;
  white-space: nowrap;

  &:hover { border-color: rgba($violet-400, 0.4); background: rgba($violet-800, 0.5); }
  &.phase-night { border-color: rgba($violet-400, 0.3); }
  &.phase-day   { border-color: rgba(160, 200, 255, 0.2); }
}

.g-phase-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  &.phase-night { background: $violet-400; box-shadow: 0 0 5px rgba($violet-400, 0.6); animation: pulseDot 2s ease-in-out infinite; }
  &.phase-day   { background: #a0c4ff; box-shadow: 0 0 5px rgba(160,196,255,0.5); animation: pulseDot 2s ease-in-out infinite; }
  &.phase-setup { background: $text-muted; }
  &.phase-end   { background: $rose-400; box-shadow: 0 0 5px rgba($rose-400, 0.5); }
}

.g-phase-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: $text-primary;
  font-style: italic;
}

.g-phase-num {
  font-size: 0.65rem;
  color: $text-muted;
}

.g-ws-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: rgba($rose-400, 0.6);
  transition: all 0.3s;
  flex-shrink: 0;
  cursor: default;

  &.on {
    background: $village-green;
    box-shadow: 0 0 6px rgba($village-green, 0.55);
  }
}

// ─────────────────────────────────────────────────────────────
// THE BUBBLE — same height as header, rounded pill ends
// ─────────────────────────────────────────────────────────────
.g-bubble {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 62px;
  padding: 0 8px;
  border-radius: 31px;       // half of height → perfect pill caps
  background: rgba(10, 4, 22, 0.72);
  border: 1px solid rgba($violet-400, 0.22);
  backdrop-filter: blur(16px) saturate(1.5);
  -webkit-backdrop-filter: blur(16px) saturate(1.5);
  box-shadow:
    0 0 0 1px rgba($violet-400, 0.06) inset,
    0 2px 16px rgba(0,0,0,0.25);

  max-width: 54vw;
  min-width: 0;
}

// Vertical divider inside bubble
.g-bubble__div {
  width: 1px;
  height: 26px;
  background: rgba($violet-400, 0.16);
  margin: 0 4px;
  flex-shrink: 0;
}

// Nav button — icon only by default, label slides in horizontally on hover
.g-bubble__btn,
.g-bubble__logout {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 0 12px;
  height: 100%;
  border-radius: 0;
  text-decoration: none;
  border: none;
  background: transparent;
  color: rgba($text-secondary, 0.65);
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.18s;
  position: relative;

  &:hover {
    .g-bubble__icon  { color: $violet-300; }
    .g-bubble__label { color: $text-primary; }
  }

  &.g-bubble__btn--active,
  &.router-link-active {
    .g-bubble__icon  { color: $violet-300; }
    .g-bubble__label {
      color: $violet-200;
      text-shadow: 0 0 8px rgba($violet-400, 0.7);
    }
  }
}

// Logout red tint override
.g-bubble__logout {
  color: rgba($rose-400, 0.6);

  &:hover {
    .g-bubble__icon  { color: $rose-400; }
    .g-bubble__label { color: $rose-300; }
  }
}

.g-bubble__icon {
  font-size: 1.35rem;          // bigger icons
  color: rgba($violet-300, 0.6);
  transition: color 0.18s;
  flex-shrink: 0;
  display: block;
}

// Label: always visible beside icon
.g-bubble__label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1;
  max-width: 80px;
  overflow: hidden;
  opacity: 1;
  margin-left: 7px;
  transition: opacity 0.18s ease;
}

// ─── Avatar block in the center of the bubble ───────────────
.g-bubble__avatar-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  height: 100%;
  text-decoration: none;
  flex-shrink: 0;
  cursor: pointer;
}

// Glowing ring around the avatar
.g-bubble__avatar-ring {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  padding: 2px;
  flex-shrink: 0;
  background: conic-gradient(
    rgba($violet-600, 0.6) 0deg,
    rgba($violet-300, 0.8) 90deg,
    rgba($pink-400, 0.6) 180deg,
    rgba($violet-600, 0.6) 360deg
  );
  box-shadow: 0 0 8px rgba($violet-500, 0.3);
  transition: transform 0.22s;

  &.ring--on {
    background: conic-gradient(
      $village-green 0deg,
      rgba($violet-300, 1) 90deg,
      $pink-400 180deg,
      $village-green 360deg
    );
    box-shadow: 0 0 12px rgba($violet-400, 0.5), 0 0 4px rgba($village-green, 0.4);
    animation: ringRotate 4s linear infinite;
  }

  &:hover { transform: scale(1.08); }
}

.g-bubble__avatar-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  background: $bg-secondary;
  display: flex;
  align-items: center;
  justify-content: center;
}

.g-bubble__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 50%;
}

.g-bubble__avatar-initial {
  font-size: 1.2rem;
  font-weight: 700;
  background: linear-gradient(135deg, $violet-300, $pink-300);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

// ─────────────────────────────────────────────────────────────
// Keyframes
// ─────────────────────────────────────────────────────────────
@keyframes ringRotate {
  from { filter: hue-rotate(0deg); }
  to   { filter: hue-rotate(360deg); }
}

@keyframes pulseDot {
  0%, 100% { opacity: 1;   transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.75); }
}
</style>
