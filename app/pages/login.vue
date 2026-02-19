<template>
  <div class="login-screen">
    <!-- Decorative moon -->
    <div class="login-moon" aria-hidden="true" />

    <div class="login-container">
      <!-- Moon Logo -->
      <div class="login-logo">
        <span class="moon-icon">🌙</span>
        <div class="sparkle sparkle-1">✦</div>
        <div class="sparkle sparkle-2">✧</div>
        <div class="sparkle sparkle-3">✦</div>
      </div>

      <h1 class="login-title">Loup Garou</h1>
      <p class="login-subtitle">Espace Narrateur</p>

      <!-- Divider -->
      <div class="login-divider">
        <span class="divider-star">✦</span>
      </div>

      <!-- Error message -->
      <Transition name="slide-up">
        <div v-if="error" class="login-error">
          <span class="error-icon">✕</span>
          {{ error }}
        </div>
      </Transition>

      <!-- Narrateur Key Form -->
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label>Mot de passe</label>
          <div class="input-wrapper">
            <span class="input-icon">🔑</span>
            <input
              v-model="password"
              type="password"
              class="input login-input"
              placeholder="Entrez votre mot de passe..."
              required
            />
          </div>
        </div>
        <button type="submit" class="btn-primary login-btn" :disabled="authStore.loading">
          <span v-if="authStore.loading" class="spinner" />
          <span v-else class="btn-icon">✨</span>
          {{ authStore.loading ? 'Vérification...' : 'Accéder au Dashboard' }}
        </button>
      </form>

      <div class="login-footer">
        <span>🌙 Accès privé uniquement</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const authStore = useAuthStore()

const password = ref('')
const error = ref('')

// If already logged in, redirect
onMounted(async () => {
  if (!authStore.initialized) {
    await authStore.fetchMe()
  }
  if (authStore.isAuthenticated) {
    navigateTo('/dashboard')
  }
})

async function handleLogin() {
  error.value = ''
  try {
    await authStore.loginWithPassword(password.value)
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Mot de passe invalide'
  }
}
</script>

<style lang="scss">
@use '~/assets/scss/variables' as *;

.login-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background:
    radial-gradient(ellipse at 30% 20%, rgba($violet-600, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba($pink-400, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba($violet-800, 0.2) 0%, $bg-primary 70%);
  position: relative;
  overflow: hidden;
}

// Decorative orb
.login-moon {
  position: absolute;
  top: -100px;
  right: -80px;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba($violet-400, 0.06) 0%, transparent 70%);
  filter: blur(30px);
  animation: float-orb 15s ease-in-out infinite;
}

@keyframes float-orb {
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(-30px, 20px); }
  66% { transform: translate(20px, -15px); }
}

.login-container {
  @include glass-card();
  width: min(420px, 88vw);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  animation: login-appear 1s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  z-index: 1;
  border: 1px solid rgba($violet-400, 0.12);
}

@keyframes login-appear {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.96);
    filter: blur(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

.login-logo {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba($violet-500, 0.15), rgba($pink-400, 0.1));
  border: 1px solid rgba($violet-400, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse-glow 4s ease-in-out infinite;
  position: relative;

  .moon-icon {
    font-size: 2.6rem;
    animation: gentle-glow 4s ease-in-out infinite;
  }
}

.sparkle {
  position: absolute;
  font-size: 0.65rem;
  color: $violet-300;
  animation: twinkle 2s ease-in-out infinite;
  opacity: 0.7;
}

.sparkle-1 { top: -4px; right: 2px; animation-delay: 0s; color: $pink-300; }
.sparkle-2 { bottom: 4px; left: -6px; animation-delay: 0.7s; }
.sparkle-3 { top: 10px; right: -8px; animation-delay: 1.4s; color: $lavender; }

@keyframes twinkle {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.3); }
}

.login-title {
  @include elegant-text();
  font-size: 2.8rem;
  font-weight: 700;
  font-style: italic;
  background: linear-gradient(135deg, $violet-200, $violet-400, $pink-300);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer 4s ease-in-out infinite;
}

.login-subtitle {
  font-size: 1rem;
  color: $text-muted;
  letter-spacing: 0.15em;
  font-weight: 600;
  margin-top: -4px;
}

.login-divider {
  width: 60%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba($violet-400, 0.25), transparent);
  position: relative;
  margin: 4px 0;

  .divider-star {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 0.55rem;
    color: $violet-400;
    background: rgba($bg-primary, 0.9);
    padding: 0 8px;
  }
}

.login-error {
  width: 100%;
  padding: 11px 16px;
  background: rgba($wolf-red, 0.08);
  border: 1px solid rgba($wolf-red, 0.2);
  border-radius: $radius-md;
  color: $wolf-red;
  font-size: 0.82rem;
  display: flex;
  align-items: center;
  gap: 8px;

  .error-icon {
    font-weight: 700;
  }
}

.login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-group {
  text-align: left;

  label {
    display: block;
    font-size: 0.88rem;
    font-weight: 700;
    color: $text-secondary;
    margin-bottom: 8px;
    letter-spacing: 0.04em;
  }
}

.input-wrapper {
  position: relative;

  .input-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.05rem;
    opacity: 0.6;
  }

  .login-input {
    padding-left: 44px;
    font-size: 0.95rem;
    font-weight: 600;
  }
}

.login-btn {
  width: 100%;
  margin-top: 4px;
  padding: 16px;
  font-size: 1rem;
  border-radius: $radius-xl;
  font-weight: 700;

  .btn-icon {
    font-size: 1.1rem;
  }
}

.login-footer {
  font-size: 0.72rem;
  color: $text-muted;
  margin-top: 4px;
  letter-spacing: 0.03em;
}
</style>
