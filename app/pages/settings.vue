<template>
  <div class="settings-page">
    <NuxtLayout name="game">
      <!-- Settings Header -->
      <div class="settings-header">
        <div>
          <h1 class="settings-title">⚙️ Administration</h1>
          <p class="settings-subtitle">Gérer les narrateurs et les permissions</p>
        </div>
        <button class="btn-primary" @click="showCreateModal = true">✨ Ajouter un Narrateur</button>
      </div>

      <!-- Users List -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement...</p>
      </div>

      <div v-else class="users-grid">
        <div
          v-for="user in users"
          :key="user.id"
          class="user-card"
          :class="user.role.toLowerCase()"
        >
          <div class="user-card-accent" />
          
          <!-- Card Menu -->
          <button 
            v-if="user.id !== authStore.user?.id && !user.isOwner"
            class="card-menu-btn" 
            @click.stop="toggleMenu(user.id)"
            :aria-label="'Menu pour ' + user.username"
          >
            <span class="menu-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
          
          <div 
            v-if="openMenuId === user.id" 
            class="card-dropdown"
            @click.stop
          >
            <button class="dropdown-item" @click="openEditModal(user); closeMenu()">
              <span class="item-icon">✏️</span>
              <span>Modifier</span>
            </button>
            <button class="dropdown-item" @click="toggleUserRole(user); closeMenu()">
              <span class="item-icon">🔄</span>
              <span>{{ user.role === 'ADMIN' ? 'Retirer Admin' : 'Promouvoir Admin' }}</span>
            </button>
            <button class="dropdown-item dropdown-item-impersonate" @click="impersonate(user); closeMenu()">
              <span class="item-icon">👁️</span>
              <span>Se connecter en tant que</span>
            </button>
            <button class="dropdown-item dropdown-item-danger" @click="deleteUser(user.id); closeMenu()">
              <span class="item-icon">🗑️</span>
              <span>Supprimer</span>
            </button>
          </div>
          
          <div class="user-header">
            <div class="user-avatar">
              {{ user.username.charAt(0).toUpperCase() }}
            </div>
            <div class="user-meta">
              <h3 class="user-name">{{ user.username }}</h3>
              <span class="user-email">{{ user.email }}</span>
            </div>
          </div>

          <div class="user-info">
            <div class="info-item">
              <span class="info-label">Rôle</span>
              <span :class="['role-badge', user.role.toLowerCase()]">
                <template v-if="user.isOwner">🌙 Propriétaire</template>
                <template v-else-if="user.role === 'ADMIN'">👑 Admin</template>
                <template v-else>🎭 Narrateur</template>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Créé le</span>
              <span class="info-value">{{ formatDate(user.createdAt) }}</span>
            </div>
          </div>

          <div v-if="user.id === authStore.user?.id" class="current-user-badge">
            C'est vous
          </div>
          <button
            v-else-if="!user.isOwner"
            class="impersonate-btn"
            @click="impersonate(user)"
          >
            👁️ Se connecter en tant que {{ user.username }}
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="users.length === 0 && !loading" class="empty-state">
        <div class="empty-illustration">👥</div>
        <p class="empty-text">Aucun utilisateur trouvé</p>
      </div>

      <!-- Create User Modal -->
      <Transition name="modal">
        <div v-if="showCreateModal" class="modal-overlay" @click="closeModal">
          <div class="modal-card" @click.stop>
            <div class="modal-header">
              <h2 class="modal-title">✨ Ajouter un Narrateur</h2>
              <button class="modal-close" @click="closeModal">✕</button>
            </div>

            <form @submit.prevent="createUser" class="modal-form">
              <div class="form-grid">
                <div class="form-group">
                  <label>Nom d'utilisateur (clé de connexion)</label>
                  <input
                    v-model="form.username"
                    type="text"
                    class="input"
                    placeholder="Ex: narrateur1"
                    required
                  />
                  <span class="input-hint">Ce sera la clé de connexion du narrateur</span>
                </div>

                <div class="form-group">
                  <label>Mot de passe</label>
                  <input
                    v-model="form.password"
                    type="password"
                    class="input"
                    placeholder="Minimum 6 caractères"
                    required
                    minlength="6"
                  />
                </div>

                <div class="form-group">
                  <label>Rôle</label>
                  <select v-model="form.role" class="input" required>
                    <option value="NARRATEUR">🎭 Narrateur (Standard)</option>
                    <option value="ADMIN">👑 Admin (Peut gérer les rôles)</option>
                  </select>
                </div>
              </div>

              <div class="role-description">
                <span v-if="form.role === 'ADMIN'" class="desc-admin">
                  ⚠️ Les admins peuvent créer/modifier/supprimer les rôles dans le grimoire
                </span>
                <span v-else class="desc-narrateur">
                  ℹ️ Les narrateurs peuvent seulement créer et gérer leurs parties
                </span>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-ghost" @click="closeModal">Annuler</button>
                <button type="submit" class="btn-primary" :disabled="submitting">
                  {{ submitting ? 'Création...' : 'Créer' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>

      <!-- Edit User Modal -->
      <Transition name="modal">
        <div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
          <div class="modal-card" @click.stop>
            <div class="modal-header">
              <h2 class="modal-title">✏️ Modifier {{ editForm.username }}</h2>
              <button class="modal-close" @click="closeEditModal">✕</button>
            </div>

            <form @submit.prevent="updateUser" class="modal-form">
              <div class="form-grid">
                <div class="form-group">
                  <label>Rôle</label>
                  <select v-model="editForm.role" class="input" required>
                    <option value="NARRATEUR">🎭 Narrateur (Standard)</option>
                    <option value="ADMIN">👑 Admin (Peut gérer les rôles)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Nouveau mot de passe (optionnel)</label>
                  <input
                    v-model="editForm.password"
                    type="password"
                    class="input"
                    placeholder="Laisser vide pour ne pas changer"
                    minlength="6"
                  />
                  <span class="input-hint">Minimum 6 caractères si vous voulez le changer</span>
                </div>
              </div>

              <div class="role-description">
                <span v-if="editForm.role === 'ADMIN'" class="desc-admin">
                  ⚠️ Les admins peuvent créer/modifier/supprimer les rôles dans le grimoire
                </span>
                <span v-else class="desc-narrateur">
                  ℹ️ Les narrateurs peuvent seulement créer et gérer leurs parties
                </span>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-ghost" @click="closeEditModal">Annuler</button>
                <button type="submit" class="btn-primary" :disabled="submitting">
                  {{ submitting ? 'Enregistrement...' : 'Enregistrer' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

interface User {
  id: string
  username: string
  email?: string
  role: 'ADMIN' | 'NARRATEUR'
  createdAt: Date
  isOwner?: boolean
}

const users = ref<User[]>([])
const loading = ref(true)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const openMenuId = ref<string | null>(null)
const submitting = ref(false)

const form = ref({
  username: '',
  password: '',
  role: 'NARRATEUR' as 'ADMIN' | 'NARRATEUR',
})

const editForm = ref({
  id: '',
  username: '',
  password: '',
  role: 'NARRATEUR' as 'ADMIN' | 'NARRATEUR',
})

// Redirect non-owners
onMounted(async () => {
  if (!authStore.isOwner) {
    navigateTo('/dashboard')
    return
  }
  await fetchUsers()
  document.addEventListener('click', closeMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})

async function fetchUsers() {
  loading.value = true
  try {
    const res = await $fetch<any>('/api/admin/users')
    if (res.success) {
      users.value = res.data
    }
  } catch (error) {
    console.error('Failed to fetch users:', error)
  } finally {
    loading.value = false
  }
}

async function createUser() {
  submitting.value = true
  try {
    const res = await $fetch<any>('/api/admin/users', {
      method: 'POST',
      body: form.value,
    })
    if (res.success) {
      users.value.unshift(res.data)
      closeModal()
      alert(`✅ ${form.value.username} a été créé avec succès!`)
    }
  } catch (error: any) {
    const msg = error?.data?.statusMessage || 'Erreur lors de la création'
    alert(`❌ ${msg}`)
  } finally {
    submitting.value = false
  }
}

async function toggleUserRole(user: User) {
  const newRole = user.role === 'ADMIN' ? 'NARRATEUR' : 'ADMIN'
  const confirmMsg = user.role === 'ADMIN'
    ? `Retirer les droits admin de ${user.username}?`
    : `Promouvoir ${user.username} en admin?\n\nIls pourront gérer les rôles du grimoire.`
  
  if (!confirm(confirmMsg)) return

  try {
    const res = await $fetch<any>(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      body: { role: newRole },
    })
    if (res.success) {
      user.role = newRole
      alert(`✅ ${user.username} est maintenant ${newRole === 'ADMIN' ? 'Admin' : 'Narrateur'}`)
    }
  } catch (error: any) {
    const msg = error?.data?.statusMessage || 'Erreur lors de la mise à jour'
    alert(`❌ ${msg}`)
  }
}

async function impersonate(user: User) {
  if (!confirm(`👁️ Se connecter en tant que ${user.username} ?\n\nVous pourrez retourner à votre compte via la barre qui apparaîtra en haut.`)) return
  try {
    await $fetch('/api/admin/impersonate', { method: 'POST', body: { userId: user.id } })
    await authStore.fetchMe()
    navigateTo('/dashboard')
  } catch (error: any) {
    alert(`❌ ${error?.data?.statusMessage || 'Erreur lors de la connexion'}`)
  }
}

async function deleteUser(userId: string) {
  const user = users.value.find(u => u.id === userId)
  if (!user) return

  if (!confirm(`⚠️ Supprimer ${user.username}?\n\nCette action est irréversible.`)) return

  try {
    await $fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    users.value = users.value.filter(u => u.id !== userId)
    alert(`✅ ${user.username} a été supprimé`)
  } catch (error: any) {
    const msg = error?.data?.statusMessage || 'Erreur lors de la suppression'
    alert(`❌ ${msg}`)
  }
}

function toggleMenu(userId: string) {
  openMenuId.value = openMenuId.value === userId ? null : userId
}

function closeMenu() {
  openMenuId.value = null
}

function closeModal() {
  showCreateModal.value = false
  form.value = {
    username: '',
    password: '',
    role: 'NARRATEUR',
  }
}

function openEditModal(user: User) {
  editForm.value = {
    id: user.id,
    username: user.username,
    password: '',
    role: user.role,
  }
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editForm.value = {
    id: '',
    username: '',
    password: '',
    role: 'NARRATEUR',
  }
}

async function updateUser() {
  submitting.value = true
  try {
    const body: any = { role: editForm.value.role }
    if (editForm.value.password) {
      body.password = editForm.value.password
    }

    const res = await $fetch<any>(`/api/admin/users/${editForm.value.id}`, {
      method: 'PATCH',
      body,
    })
    
    if (res.success) {
      // Update the user in the list
      const userIndex = users.value.findIndex(u => u.id === editForm.value.id)
      if (userIndex !== -1) {
        users.value[userIndex] = { ...users.value[userIndex], ...res.data }
      }
      closeEditModal()
      alert(`✅ ${editForm.value.username} a été modifié avec succès!`)
    }
  } catch (error: any) {
    const msg = error?.data?.statusMessage || 'Erreur lors de la mise à jour'
    alert(`❌ ${msg}`)
  } finally {
    submitting.value = false
  }
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
</script>

<style lang="scss">
@use '~/assets/scss/variables' as *;

.settings-page {
  min-height: 100vh;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 36px;
  flex-wrap: wrap;
  gap: 16px;
}

.settings-title {
  font-size: 2rem;
  font-weight: 800;
  color: $text-primary;
  font-family: $font-display;
  margin-bottom: 4px;
}

.settings-subtitle {
  color: $text-secondary;
  font-size: 0.95rem;
}

// ─── Users Grid ─────────────────────────────────────────────
.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px;
}

.user-card {
  @include glass(0.05);
  border-radius: $radius-lg;
  padding: 24px;
  position: relative;
  overflow: hidden;
  transition: all $transition-base;
  border: 1px solid transparent;

  &:hover {
    transform: translateY(-3px);
    border-color: rgba($violet-400, 0.2);
    box-shadow: $glow-violet;
    
    .card-menu-btn {
      opacity: 1;
      pointer-events: auto;
    }
  }

  .user-card-accent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    border-radius: $radius-lg $radius-lg 0 0;
  }

  &.admin .user-card-accent {
    background: linear-gradient(90deg, $violet-400, rgba($violet-400, 0.3));
  }
  &.narrateur .user-card-accent {
    background: linear-gradient(90deg, $pink-400, rgba($pink-400, 0.3));
  }
}

.user-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.user-avatar {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba($violet-500, 0.12);
  border: 2px solid rgba($violet-400, 0.2);
  font-size: 1.4rem;
  font-weight: 700;
  color: $violet-300;
  flex-shrink: 0;
}

.user-meta {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: 2px;
}

.user-email {
  font-size: 0.82rem;
  color: $text-muted;
  display: block;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid rgba($violet-400, 0.1);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 0.8rem;
  color: $text-muted;
  font-weight: 500;
}

.info-value {
  font-size: 0.85rem;
  color: $text-secondary;
}

.role-badge {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 100px;

  &.admin {
    background: rgba($violet-500, 0.15);
    color: $violet-300;
    border: 1px solid rgba($violet-400, 0.2);
  }
  &.narrateur {
    background: rgba($pink-400, 0.1);
    color: $pink-300;
    border: 1px solid rgba($pink-400, 0.15);
  }
}

// Owner badge (for users marked as owner)
.user-card:has([data-owner]) .user-card-accent {
  background: linear-gradient(90deg, #f59e0b, rgba(#f59e0b, 0.3));
}

.impersonate-btn {
  width: 100%;
  margin-top: 8px;
  padding: 9px 14px;
  background: rgba(167, 139, 250, 0.10);
  border: 1px solid rgba(167, 139, 250, 0.30);
  border-radius: $radius-md;
  color: #a78bfa;
  font-size: 0.83rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 160ms ease;
  text-align: center;

  &:hover {
    background: rgba(167, 139, 250, 0.22);
    border-color: rgba(167, 139, 250, 0.55);
    color: #c4b5fd;
    transform: translateY(-1px);
  }

  &:active { transform: translateY(0); }
}

.current-user-badge {
  margin-top: 12px;
  padding: 8px;
  text-align: center;
  background: rgba($village-green, 0.08);
  border: 1px solid rgba($village-green, 0.15);
  border-radius: $radius-sm;
  font-size: 0.8rem;
  font-weight: 600;
  color: $village-green;
}

// ─── Card Menu (Reuse from grimoire) ─────────────────────────
.card-menu-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($bg-card, 0.95);
  border: 1px solid rgba($violet-400, 0.15);
  border-radius: $radius-sm;
  cursor: pointer;
  transition: all $transition-fast;
  color: $text-secondary;
  opacity: 0.55;
  pointer-events: auto;
  z-index: 10;

  &:hover {
    background: rgba($violet-500, 0.15);
    border-color: rgba($violet-400, 0.3);
    color: $violet-300;
    transform: scale(1.08);
  }

  &:active {
    transform: scale(0.95);
  }
}

.menu-dots {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: center;

  span {
    width: 4px;
    height: 4px;
    background: currentColor;
    border-radius: 50%;
    transition: all $transition-fast;
  }
}

.card-dropdown {
  position: absolute;
  top: 48px;
  right: 10px;
  min-width: 180px;
  background: rgba($bg-card, 0.98);
  border: 1px solid rgba($violet-400, 0.2);
  border-radius: $radius-md;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 
              0 0 0 1px rgba($violet-400, 0.1);
  z-index: 100;
  overflow: hidden;
  animation: dropdownSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: $text-primary;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: all $transition-fast;
  text-align: left;

  &:hover {
    background: rgba($violet-500, 0.1);
  }

  &:active {
    transform: scale(0.98);
  }

  .item-icon {
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
  }

  &-danger {
    color: $wolf-red;

    &:hover {
      background: rgba($wolf-red, 0.1);
    }
  }

  &-impersonate {
    color: #a78bfa;

    &:hover {
      background: rgba(167, 139, 250, 0.12);
    }
  }
}

@keyframes dropdownSlideIn {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

// ─── Modal Styles ─────────────────────────────────────────────
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  width: min(540px, 92vw);
  max-height: 90vh;
  overflow-y: auto;
  @include glass-card();
  animation: modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba($violet-400, 0.1);
}

.modal-title {
  @include elegant-text();
  font-size: 1.3rem;
  font-style: italic;
  color: $violet-300;
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid rgba($violet-400, 0.2);
  border-radius: 50%;
  color: $text-secondary;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: rgba($rose-400, 0.1);
    border-color: $rose-400;
    color: $rose-400;
    transform: rotate(90deg);
  }
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-grid {
  display: grid;
  gap: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.88rem;
    font-weight: 600;
    color: $text-secondary;
  }
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
  padding-top: 20px;
  border-top: 1px solid rgba($violet-400, 0.1);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.role-description {
  padding: 12px;
  border-radius: $radius-sm;
  margin-bottom: 16px;
  font-size: 0.85rem;
  line-height: 1.5;

  .desc-admin {
    color: $violet-300;
    background: rgba($violet-500, 0.08);
    border: 1px solid rgba($violet-400, 0.15);
    padding: 12px;
    border-radius: $radius-sm;
    display: block;
  }

  .desc-narrateur {
    color: $text-secondary;
    background: rgba($violet-500, 0.05);
    border: 1px solid rgba($violet-400, 0.1);
    padding: 12px;
    border-radius: $radius-sm;
    display: block;
  }
}

.input-hint {
  display: block;
  margin-top: 4px;
  font-size: 0.75rem;
  color: $text-muted;
  font-style: italic;
}

// ─── Loading & Empty States ─────────────────────────────────────
.loading-state {
  text-align: center;
  padding: 48px;
  color: $text-secondary;

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba($violet-400, 0.2);
    border-top-color: $violet-400;
    border-radius: 50%;
    margin: 0 auto 16px;
    animation: spin 0.8s linear infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 64px 24px;
  color: $text-muted;

  .empty-illustration {
    font-size: 4rem;
    margin-bottom: 16px;
    opacity: 0.3;
  }

  .empty-text {
    font-size: 1rem;
  }
}
</style>
