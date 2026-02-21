<template>
  <div class="grimoire-page">
    <NuxtLayout name="game">
      <!-- Grimoire Header -->
      <div class="grimoire-header">
        <div>
          <h1 class="grimoire-title">✦ Grimoire</h1>
          <p class="grimoire-subtitle">Gérer les rôles, pouvoirs et hiérarchie nocturne</p>
        </div>
        <div class="header-actions">
          <button v-if="authStore.isAdmin" class="btn-primary" @click="showCreateModal = true">✨ Ajouter un Rôle</button>
        </div>
      </div>

      <!-- Filters + Search row -->
      <div class="team-filters">
        <button
          :class="['filter-pill', { active: activeFilter === null }]"
          @click="activeFilter = null"
        >
          🌟 Tous
        </button>
        <button
          :class="['filter-pill wolf', { active: activeFilter === 'WOLF' }]"
          @click="activeFilter = 'WOLF'"
        >
          🐺 Loups
        </button>
        <button
          :class="['filter-pill village', { active: activeFilter === 'VILLAGER' }]"
          @click="activeFilter = 'VILLAGER'"
        >
          🏘️ Villageois
        </button>
        <button
          :class="['filter-pill neutral', { active: activeFilter === 'NEUTRAL' }]"
          @click="activeFilter = 'NEUTRAL'"
        >
          ⚖️ Neutres
        </button>

        <!-- Search input -->
        <div class="filter-search-wrap">
          <span class="filter-search-icon">🔍</span>
          <input
            v-model="searchQuery"
            class="filter-search"
            placeholder="Rechercher..."
            @click.stop
          />
          <button v-if="searchQuery" class="filter-search-clear" @click.stop="searchQuery = ''">✕</button>
        </div>

        <!-- Select mode toggle (admin only) -->
        <button
          v-if="authStore.isAdmin"
          :class="['filter-pill filter-pill-select', { active: selectMode }]"
          @click="toggleSelectMode"
        >
          {{ selectMode ? '✕ Annuler' : '☑️ Sélectionner' }}
        </button>

        <template v-if="selectMode">
          <div class="filter-divider" />
          <button class="filter-pill select-all" @click="selectAllVisible">
            ✓ Tout ({{ filteredRoles.length }})
          </button>
          <button v-if="selectedIds.size > 0" class="filter-pill select-none" @click="selectedIds.clear(); selectedIds = new Set(selectedIds)">
            ✕ Désélectionner
          </button>
        </template>
      </div>

      <!-- Roles Grid -->
      <div class="roles-grid">
        <div
          v-for="role in filteredRoles"
          :key="role._id"
          class="role-card"
          :class="[role.team.toLowerCase(), { 'is-selected': selectedIds.has(role._id), 'select-mode': selectMode }]"
          @click="selectMode && toggleSelect(role._id)"
        >
          <div class="role-card-accent" />
          <!-- Select checkbox -->
          <div v-if="selectMode" class="card-select-check" :class="{ checked: selectedIds.has(role._id) }">
            <span v-if="selectedIds.has(role._id)">✓</span>
          </div>
          
          <!-- Card Menu (Admin Only) -->
          <button 
            v-if="authStore.isAdmin"
            class="card-menu-btn" 
            @click.stop="toggleMenu(role._id)"
            :aria-label="'Menu pour ' + role.name"
          >
            <span class="menu-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
          
          <div 
            v-if="openMenuId === role._id" 
            class="card-dropdown"
            @click.stop
          >
            <button class="dropdown-item" @click="editRole(role); closeMenu()">
              <span class="item-icon">✏️</span>
              <span>Modifier</span>
            </button>
            <button class="dropdown-item dropdown-item-danger" @click="deleteRole(role._id); closeMenu()">
              <span class="item-icon">🗑️</span>
              <span>Supprimer</span>
            </button>
          </div>
          
          <div class="role-header">
            <div class="role-icon-wrap" :class="role.team.toLowerCase()">
              <span class="role-icon-emoji">{{ getRoleIcon(role) }}</span>
            </div>
            <div class="role-meta">
              <h3 class="role-name">{{ role.name }}</h3>
              <span :class="['team-badge', role.team.toLowerCase()]">{{ teamLabel(role.team) }}</span>
            </div>
            <div class="role-order-badge">
              <span class="order-num">{{ role.nightOrder }}</span>
              <span class="order-txt">ordre</span>
            </div>
          </div>

          <p class="role-description">{{ role.description }}</p>

          <div class="role-tags">
            <span v-if="role.hasNightAction" class="tag night-tag" title="Action Nocturne">🌙</span>
            <span v-if="role.isUnique" class="tag unique-tag" title="Unique">✦</span>
          </div>
        </div>
      </div>

      <!-- Floating bulk-action bar -->
      <Transition name="slide-up-bar">
        <div v-if="selectMode && selectedIds.size > 0" class="bulk-action-bar">
          <span class="bulk-count">{{ selectedIds.size }} rôle{{ selectedIds.size > 1 ? 's' : '' }} sélectionné{{ selectedIds.size > 1 ? 's' : '' }}</span>
          <div class="bulk-actions">
            <span class="bulk-label">Déplacer vers :</span>
            <button class="bulk-btn wolf" @click="bulkMoveTeam('WOLF')" :disabled="bulkMoving">🐺 Loups</button>
            <button class="bulk-btn village" @click="bulkMoveTeam('VILLAGER')" :disabled="bulkMoving">🏘️ Village</button>
            <button class="bulk-btn neutral" @click="bulkMoveTeam('NEUTRAL')" :disabled="bulkMoving">⚖️ Neutres</button>
          </div>
          <span v-if="bulkMoving" class="bulk-spinner">⏳</span>
        </div>
      </Transition>

      <!-- Empty state -->
      <div v-if="filteredRoles.length === 0 && !loading" class="empty-state">
        <div class="empty-illustration">
          <span class="empty-moon">📖</span>
        </div>
        <h3>Aucun rôle trouvé</h3>
        <p>Ajoutez votre premier rôle au grimoire.</p>
      </div>

      <!-- Create/Edit Modal -->
      <Transition name="fade">
        <div v-if="showCreateModal || editingRole" class="modal-overlay" @click.self="closeModal">
          <div class="modal glass-card">
            <h2 class="modal-title">{{ editingRole ? '✏️ Modifier le Rôle' : '✨ Nouveau Rôle' }}</h2>

            <form @submit.prevent="saveRole" class="modal-form">
              <div class="form-group">
                <label>Nom du Rôle</label>
                <input v-model="form.name" class="input" placeholder="ex. Loup-Garou" required />
              </div>

              <div class="form-group">
                <label>Équipe</label>
                <select v-model="form.team" class="input" required>
                  <option value="WOLF">🐺 Loup</option>
                  <option value="VILLAGER">🏘️ Villageois</option>
                  <option value="NEUTRAL">⚖️ Neutre</option>
                </select>
              </div>

              <div class="form-group">
                <label>Description</label>
                <textarea v-model="form.description" class="input" rows="3" placeholder="Décrivez les pouvoirs de ce rôle..." required />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Ordre Nocturne</label>
                  <input v-model.number="form.nightOrder" type="number" class="input" min="0" />
                </div>
                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" v-model="form.hasNightAction" />
                    Action Nocturne
                  </label>
                </div>
                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" v-model="form.isUnique" />
                    Unique
                  </label>
                </div>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-ghost" @click="closeModal">Annuler</button>
                <button type="submit" class="btn-primary">{{ editingRole ? 'Sauvegarder' : 'Créer' }}</button>
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

interface RoleForm {
  name: string
  team: 'WOLF' | 'VILLAGER' | 'NEUTRAL'
  description: string
  nightOrder: number
  hasNightAction: boolean
  isUnique: boolean
}

const authStore = useAuthStore()
const roles = ref<any[]>([])
const loading = ref(true)
const activeFilter = ref<string | null>(null)
const showCreateModal = ref(false)
const editingRole = ref<any>(null)
const openMenuId = ref<string | null>(null)
const selectMode = ref(false)
const selectedIds = ref(new Set<string>())
const bulkMoving = ref(false)
const searchQuery = ref('')

const defaultForm: RoleForm = {
  name: '',
  team: 'VILLAGER',
  description: '',
  nightOrder: 99,
  hasNightAction: false,
  isUnique: true,
}

const form = ref<RoleForm>({ ...defaultForm })

const filteredRoles = computed(() => {
  let list = roles.value
  if (activeFilter.value) list = list.filter((r: any) => r.team === activeFilter.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter((r: any) => r.name.toLowerCase().includes(q))
  }
  return list
})

onMounted(async () => {
  await fetchRoles()
  // Close menu on click outside
  document.addEventListener('click', closeMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})

function toggleSelectMode() {
  selectMode.value = !selectMode.value
  selectedIds.value = new Set()
}

function toggleSelect(id: string) {
  const s = new Set(selectedIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selectedIds.value = s
}

function selectAllVisible() {
  selectedIds.value = new Set(filteredRoles.value.map((r: any) => r._id))
}

async function bulkMoveTeam(team: 'WOLF' | 'VILLAGER' | 'NEUTRAL') {
  if (!selectedIds.value.size) return
  bulkMoving.value = true
  try {
    await Promise.all(
      [...selectedIds.value].map(id =>
        $fetch(`/api/roles/${id}`, { method: 'PUT', body: { team } })
      )
    )
    await fetchRoles()
    selectedIds.value = new Set()
  } catch (e: any) {
    alert(e.data?.statusMessage || 'Erreur lors du déplacement')
  } finally {
    bulkMoving.value = false
  }
}

function toggleMenu(roleId: string) {
  openMenuId.value = openMenuId.value === roleId ? null : roleId
}

function closeMenu() {
  openMenuId.value = null
}

async function fetchRoles() {
  loading.value = true
  try {
    const res = await $fetch<any>('/api/roles')
    if (res.success) roles.value = res.data
  } finally {
    loading.value = false
  }
}

function getRoleIcon(role: any): string {
  const icons: Record<string, string> = {
    WOLF: '🐺',
    VILLAGER: '🏘️',
    NEUTRAL: '⚖️',
  }
  return role.icon || icons[role.team] || '❓'
}

function teamLabel(team: string): string {
  const labels: Record<string, string> = { WOLF: 'Loup', VILLAGER: 'Villageois', NEUTRAL: 'Neutre' }
  return labels[team] || team
}

function editRole(role: any) {
  editingRole.value = role
  form.value = {
    name: role.name,
    team: role.team,
    description: role.description,
    nightOrder: role.nightOrder,
    hasNightAction: role.hasNightAction,
    isUnique: role.isUnique,
  }
}

function closeModal() {
  showCreateModal.value = false
  editingRole.value = null
  form.value = { ...defaultForm }
}

async function saveRole() {
  try {
    if (editingRole.value) {
      await $fetch(`/api/roles/${editingRole.value._id}`, {
        method: 'PUT',
        body: form.value,
      })
    } else {
      await $fetch('/api/roles', {
        method: 'POST',
        body: form.value,
      })
    }
    closeModal()
    await fetchRoles()
  } catch (e: any) {
    alert(e.data?.statusMessage || 'Échec de la sauvegarde')
  }
}

async function deleteRole(id: string) {
  if (!confirm('Supprimer ce rôle ?')) return
  await $fetch(`/api/roles/${id}`, { method: 'DELETE' })
  await fetchRoles()
}
</script>

<style lang="scss">
@use '~/assets/scss/variables' as *;

.grimoire-page {
  background:
    radial-gradient(ellipse at 30% 20%, rgba($violet-600, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba($pink-400, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba($violet-800, 0.2) 0%, transparent 70%);
}

.grimoire-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  padding: 28px 0 0;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.btn-select-mode,
.filter-pill-select {
  padding: 9px 18px;
  border: 1px solid $border-subtle;
  border-radius: 100px;
  background: transparent;
  color: $text-secondary;
  font-family: $font-body;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;

  &:hover {
    background: rgba($violet-500, 0.08);
    border-color: rgba($violet-400, 0.3);
    color: $violet-300;
    transform: translateY(-1px);
  }

  &.active {
    background: rgba($rose-500, 0.08);
    border-color: rgba($rose-400, 0.3);
    color: $rose-300;
  }
}

// ─── Search ────────────────────────────────────────────────
.filter-search-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid $border-subtle;
  border-radius: 100px;
  background: transparent;
  transition: all $transition-base;
  min-width: 160px;

  &:focus-within {
    border-color: rgba($violet-400, 0.4);
    background: rgba($violet-500, 0.05);
    box-shadow: 0 0 0 3px rgba($violet-400, 0.08);
  }
}

.filter-search-icon {
  font-size: 0.78rem;
  opacity: 0.5;
  flex-shrink: 0;
}

.filter-search {
  background: transparent;
  border: none;
  outline: none;
  color: $text-primary;
  font-family: $font-body;
  font-size: 0.82rem;
  font-weight: 500;
  width: 100%;

  &::placeholder {
    color: $text-muted;
    font-style: italic;
  }
}

.filter-search-clear {
  background: transparent;
  border: none;
  color: $text-muted;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
  transition: color $transition-fast;

  &:hover { color: $text-primary; }
}

.grimoire-title {
  @include elegant-text();
  font-size: 1.5rem;
  font-style: italic;
  background: linear-gradient(135deg, $violet-200, $violet-400);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.grimoire-subtitle {
  color: $text-muted;
  font-size: 0.85rem;
  margin-top: 4px;
}

// ─── Filters ────────────────────────────────────────────────
.filter-divider {
  width: 1px;
  height: 22px;
  background: $border-subtle;
  margin: 0 4px;
  align-self: center;
}

.team-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}

.filter-pill {
  padding: 9px 20px;
  border: 1px solid $border-subtle;
  border-radius: 100px;
  background: transparent;
  color: $text-secondary;
  font-family: $font-body;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;

  &.active {
    background: rgba($violet-500, 0.12);
    border-color: rgba($violet-400, 0.3);
    color: $violet-300;
    box-shadow: 0 0 16px rgba($violet-500, 0.1);
  }

  &.wolf.active {
    background: rgba($wolf-red, 0.08);
    border-color: rgba($wolf-red, 0.25);
    color: $wolf-red;
  }

  &.village.active {
    background: rgba($village-green, 0.08);
    border-color: rgba($village-green, 0.25);
    color: $village-green;
  }

  &.neutral.active {
    background: rgba($neutral-amber, 0.08);
    border-color: rgba($neutral-amber, 0.25);
    color: $neutral-amber;
  }

  &:hover:not(.active) {
    background: $bg-glass;
    color: $text-primary;
    transform: translateY(-1px);
  }

  &.select-all {
    background: rgba($violet-500, 0.07);
    border-color: rgba($violet-400, 0.25);
    color: $violet-300;
    &:hover { background: rgba($violet-500, 0.15); }
  }

  &.select-none {
    background: rgba($rose-500, 0.07);
    border-color: rgba($rose-400, 0.25);
    color: $rose-300;
    &:hover { background: rgba($rose-500, 0.15); }
  }
}

// ─── Roles Grid ─────────────────────────────────────────────
.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.role-card {
  @include glass(0.05);
  border-radius: $radius-lg;
  padding: 24px;
  position: relative;
  overflow: hidden;
  transition: all $transition-base;
  border: 1px solid transparent;

  &.select-mode {
    cursor: pointer;
    user-select: none;
  }

  &.is-selected {
    border-color: rgba($violet-400, 0.6) !important;
    box-shadow: 0 0 0 2px rgba($violet-400, 0.25), $glow-violet;
    @include glass(0.1);
  }

  &:hover {
    transform: translateY(-3px);
    border-color: rgba($violet-400, 0.2);
    box-shadow: $glow-violet;
    
    // Show menu button on card hover
    .card-menu-btn {
      opacity: 1;
      pointer-events: auto;
    }
  }

  .role-card-accent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    border-radius: $radius-lg $radius-lg 0 0;
  }

  &.wolf .role-card-accent {
    background: linear-gradient(90deg, $wolf-red, rgba($wolf-red, 0.3));
  }
  &.villager .role-card-accent {
    background: linear-gradient(90deg, $village-green, rgba($village-green, 0.3));
  }
  &.neutral .role-card-accent {
    background: linear-gradient(90deg, $neutral-amber, rgba($neutral-amber, 0.3));
  }
}

// ─── Select checkbox ────────────────────────────────────────
.card-select-check {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid rgba($violet-400, 0.4);
  background: rgba($bg-card, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: $violet-300;
  transition: all $transition-fast;
  z-index: 10;

  &.checked {
    background: rgba($violet-500, 0.3);
    border-color: $violet-400;
    color: $violet-200;
    font-weight: 700;
  }
}

// ─── Bulk action bar ─────────────────────────────────────────
.bulk-action-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-radius: $radius-lg;
  background: rgba($bg-secondary, 0.97);
  border: 1px solid rgba($violet-400, 0.3);
  box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba($violet-400, 0.1);
  backdrop-filter: blur(16px);
  z-index: 500;
  white-space: nowrap;
}

.bulk-count {
  font-size: 0.85rem;
  font-weight: 700;
  color: $violet-300;
  min-width: 120px;
}

.bulk-label {
  font-size: 0.78rem;
  color: $text-muted;
  font-weight: 600;
}

.bulk-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bulk-btn {
  padding: 7px 16px;
  border-radius: $radius-md;
  border: 1px solid $border-subtle;
  background: transparent;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-base;
  font-family: $font-body;

  &:disabled { opacity: 0.5; cursor: not-allowed; }

  &.wolf {
    color: $wolf-red;
    border-color: rgba($wolf-red, 0.3);
    &:hover:not(:disabled) { background: rgba($wolf-red, 0.12); }
  }
  &.village {
    color: $village-green;
    border-color: rgba($village-green, 0.3);
    &:hover:not(:disabled) { background: rgba($village-green, 0.12); }
  }
  &.neutral {
    color: $neutral-amber;
    border-color: rgba($neutral-amber, 0.3);
    &:hover:not(:disabled) { background: rgba($neutral-amber, 0.12); }
  }
}

.bulk-spinner {
  font-size: 1rem;
  animation: spin 1s linear infinite;
}

.slide-up-bar-enter-active,
.slide-up-bar-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-bar-enter-from,
.slide-up-bar-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(16px);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.role-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.role-icon-wrap {
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-md;
  flex-shrink: 0;

  .role-icon-emoji {
    font-size: 1.6rem;
  }

  &.wolf {
    background: rgba($wolf-red, 0.1);
    border: 1px solid rgba($wolf-red, 0.15);
  }
  &.villager {
    background: rgba($village-green, 0.1);
    border: 1px solid rgba($village-green, 0.15);
  }
  &.neutral {
    background: rgba($neutral-amber, 0.1);
    border: 1px solid rgba($neutral-amber, 0.15);
  }
}

.role-meta {
  flex: 1;
}

.role-name {
  font-size: 1rem;
  font-weight: 700;
}

.team-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 100px;
  margin-top: 2px;

  &.wolf { background: rgba($wolf-red, 0.1); color: $wolf-red; }
  &.villager { background: rgba($village-green, 0.1); color: $village-green; }
  &.neutral { background: rgba($neutral-amber, 0.1); color: $neutral-amber; }
}

.role-order-badge {
  text-align: center;
  padding: 6px 10px;
  border-radius: $radius-sm;
  background: rgba($violet-500, 0.08);

  .order-num {
    display: block;
    font-size: 1.1rem;
    font-weight: 700;
    color: $violet-300;
    font-family: $font-display;
  }

  .order-txt {
    font-size: 0.55rem;
    color: $text-muted;
    text-transform: uppercase;
  }
}

.role-description {
  font-size: 0.84rem;
  color: $text-secondary;
  line-height: 1.6;
  margin-bottom: 12px;
}

.role-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  flex-wrap: wrap;

  .tag {
    font-size: 0.85rem;
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-weight: 600;
    cursor: help;
    transition: all $transition-fast;

    &:hover {
      transform: scale(1.15);
    }
  }

  .night-tag {
    color: $violet-300;
    background: rgba($violet-500, 0.1);
    border: 1px solid rgba($violet-400, 0.15);
  }

  .unique-tag {
    color: $pink-300;
    background: rgba($pink-400, 0.08);
    border: 1px solid rgba($pink-400, 0.12);
  }
}

// ─── Card Menu (Top-Right) ─────────────────────────────────
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
  opacity: 0;
  pointer-events: none;
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
  right: 12px;
  min-width: 150px;
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

// ─── Modal ──────────────────────────────────────────────────
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  width: min(500px, 90vw);
  max-height: 90vh;
  overflow-y: auto;
  animation: login-appear 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-title {
  @include elegant-text();
  font-size: 1.1rem;
  font-style: italic;
  color: $violet-300;
  margin-bottom: 22px;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;

  textarea.input {
    resize: vertical;
    min-height: 80px;
  }
}

.form-row {
  display: flex;
  gap: 16px;
  align-items: end;
  flex-wrap: wrap;
}

.checkbox-group {
  label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 0.82rem;
    color: $text-secondary;
    font-weight: 600;
  }

  input[type="checkbox"] {
    accent-color: $violet-500;
    width: 16px;
    height: 16px;
    border-radius: 4px;
  }
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}
</style>
