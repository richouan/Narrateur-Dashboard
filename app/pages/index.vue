<template>
  <div class="loading-screen">
    <!-- Decorative orbs -->
    <div class="orb orb-1" aria-hidden="true" />
    <div class="orb orb-2" aria-hidden="true" />

    <!-- Moon Animation -->
    <div class="loading-moon">
      <div class="moon-circle">
        <span class="moon-emoji">🌙</span>
      </div>
      <div class="moon-sparkles">
        <span v-for="i in 6" :key="i" class="star" :style="starStyle(i)">✦</span>
      </div>
    </div>

    <!-- Title -->
    <h1 class="loading-title">Loup Garou</h1>
    <p class="loading-subtitle">Narrateur Dashboard</p>

    <!-- Progress Bar -->
    <div class="loading-bar-container">
      <div class="loading-bar">
        <div class="loading-bar-fill" :style="{ width: progress + '%' }" />
      </div>
    </div>

    <!-- Status Message -->
    <p class="loading-status">{{ statusMessage }}</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const progress = ref(0)
const statusMessage = ref('Initialisation...')

function starStyle(i: number) {
  const angle = (i - 1) * 60
  const rad = angle * (Math.PI / 180)
  const r = 56
  return {
    left: `${50 + Math.cos(rad) * r}px`,
    top: `${50 + Math.sin(rad) * r}px`,
    animationDelay: `${i * 0.3}s`,
  }
}

onMounted(async () => {
  const steps = [
    { target: 30, delay: 500, message: 'Connexion au village...' },
    { target: 55, delay: 600, message: 'Synchronisation des esprits...' },
    { target: 80, delay: 500, message: 'Préparation du grimoire...' },
    { target: 95, delay: 400, message: 'Éveil des loups...' },
  ]

  for (const step of steps) {
    statusMessage.value = step.message
    await animateProgress(step.target, step.delay)
  }

  // Final check
  try {
    await $fetch('/api/health')
    statusMessage.value = 'Prête à commencer ✨'
    await animateProgress(100, 300)
  } catch {
    statusMessage.value = 'Mode hors-ligne...'
    await animateProgress(100, 300)
  }

  await new Promise(r => setTimeout(r, 600))
  navigateTo('/login')
})

async function animateProgress(target: number, duration: number) {
  const start = progress.value
  const diff = target - start
  const steps = 20
  const stepDelay = duration / steps

  for (let i = 1; i <= steps; i++) {
    progress.value = start + (diff * (i / steps))
    await new Promise(r => setTimeout(r, stepDelay))
  }
}
</script>

<style lang="scss">
@use '~/assets/scss/variables' as *;

.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background:
    radial-gradient(ellipse at 40% 30%, rgba($violet-600, 0.1) 0%, transparent 50%),
    radial-gradient(ellipse at 60% 70%, rgba($pink-400, 0.06) 0%, transparent 50%),
    linear-gradient(180deg, #0f0720 0%, #160b2e 100%);
  gap: 20px;
  position: relative;
  overflow: hidden;
}

// Decorative orbs
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  pointer-events: none;
}

.orb-1 {
  width: 300px;
  height: 300px;
  background: rgba($violet-500, 0.07);
  top: 10%;
  left: 15%;
  animation: float-orb 18s ease-in-out infinite;
}

.orb-2 {
  width: 200px;
  height: 200px;
  background: rgba($pink-400, 0.06);
  bottom: 15%;
  right: 20%;
  animation: float-orb 15s ease-in-out infinite 3s;
}

@keyframes float-orb {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-20px, 15px) scale(1.05); }
  66% { transform: translate(15px, -10px) scale(0.95); }
}

// ─── Moon Animation ─────────────────────────────────────────
.loading-moon {
  position: relative;
  width: 100px;
  height: 100px;
  margin-bottom: 8px;
}

.moon-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba($violet-400, 0.12), rgba($pink-300, 0.08));
  border: 1px solid rgba($violet-400, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse-glow 4s ease-in-out infinite;

  .moon-emoji {
    font-size: 3rem;
    animation: gentle-glow 4s ease-in-out infinite;
  }
}

.moon-sparkles {
  position: absolute;
  inset: 0;

  .star {
    position: absolute;
    font-size: 0.6rem;
    color: $violet-300;
    animation: twinkle 2.5s ease-in-out infinite;
    transform: translate(-50%, -50%);

    &:nth-child(2n) { color: $pink-300; }
    &:nth-child(3n) { color: $lavender; }
  }
}

@keyframes twinkle {
  0%, 100% { opacity: 0.2; transform: translate(-50%, -50%) scale(0.6); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.4); }
}

// ─── Title ──────────────────────────────────────────────────
.loading-title {
  @include elegant-text();
  font-size: 2.8rem;
  font-weight: 700;
  font-style: italic;
  background: linear-gradient(135deg, $violet-200, $violet-400, $pink-300, $violet-200);
  background-size: 300% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer 4s ease-in-out infinite;
}

.loading-subtitle {
  font-size: 0.88rem;
  color: $text-muted;
  letter-spacing: 0.18em;
  font-weight: 600;
  margin-top: -8px;
}

// ─── Progress Bar ───────────────────────────────────────────
.loading-bar-container {
  width: min(320px, 70vw);
}

.loading-bar {
  height: 3px;
  background: rgba($violet-500, 0.12);
  border-radius: 10px;
  overflow: hidden;
}

.loading-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, $violet-500, $pink-400, $violet-400);
  border-radius: 10px;
  transition: width 150ms ease;
  box-shadow: 0 0 12px rgba($pink-400, 0.4);
}

// ─── Status ─────────────────────────────────────────────────
.loading-status {
  font-size: 1rem;
  color: $text-secondary;
  animation: fade-pulse 2.5s ease-in-out infinite;
  font-weight: 500;
}
</style>
