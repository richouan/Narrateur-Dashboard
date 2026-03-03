<template>
  <!-- Hidden YouTube iframe — lives outside panel so music never stops -->
  <div style="position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;opacity:0">
    <div id="mp-yt-player" />
  </div>

  <!-- Mini bar (panel closed, music playing, not dismissed) -->
  <Transition name="mp-mini-slide">
    <div v-if="currentTrack && !isOpen && miniBarVisible" class="mp-mini-bar" @click="open">
      <img :src="currentTrack.thumbnail" class="mp-mini-thumb" loading="lazy" />
      <div class="mp-mini-info">
        <span class="mp-mini-title">{{ currentTrack.title }}</span>
        <span class="mp-mini-channel">{{ currentTrack.channel }}</span>
      </div>
      <div class="mp-mini-progress-bar">
        <div class="mp-mini-fill" :style="{ width: progress + '%' }" />
      </div>
      <!-- Volume control -->
      <div class="mp-mini-vol" @click.stop>
        <button class="mp-mini-btn mp-mini-vol-btn" @click.stop="toggleMute" :title="isMuted ? 'Activer le son' : 'Muet'">
          <svg v-if="isMuted || volume === 0" viewBox="0 0 16 16" fill="none" width="12" height="12">
            <path d="M2 5.5h2.5l4-3v11l-4-3H2z" fill="currentColor"/>
            <path d="M11 5.5l3 5M14 5.5l-3 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <svg v-else viewBox="0 0 16 16" fill="none" width="12" height="12">
            <path d="M2 5.5h2.5l4-3v11l-4-3H2z" fill="currentColor"/>
            <path d="M11 6.5a2.5 2.5 0 0 1 0 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
        <input
          type="range"
          class="mp-mini-vol-slider"
          min="0" max="100"
          :value="isMuted ? 0 : volume"
          @input="onVolumeInput"
          title="Volume"
        />
      </div>
      <div class="mp-mini-ctrl">
        <button class="mp-mini-btn" @click.stop="playPrev">
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
            <rect x="2" y="3" width="2.5" height="10" rx="1" fill="currentColor"/>
            <path d="M14 3L6.5 8l7.5 5V3z" fill="currentColor"/>
          </svg>
        </button>
        <button class="mp-mini-btn is-play" @click.stop="togglePlay">
          <svg v-if="isPlaying" viewBox="0 0 16 16" fill="none" width="14" height="14">
            <rect x="3" y="2" width="3.5" height="12" rx="1.5" fill="currentColor"/>
            <rect x="9.5" y="2" width="3.5" height="12" rx="1.5" fill="currentColor"/>
          </svg>
          <svg v-else viewBox="0 0 16 16" fill="none" width="14" height="14">
            <path d="M3 2l11 6-11 6V2z" fill="currentColor"/>
          </svg>
        </button>
        <button class="mp-mini-btn" @click.stop="playNext">
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
            <rect x="11.5" y="3" width="2.5" height="10" rx="1" fill="currentColor"/>
            <path d="M2 3l7.5 5L2 13V3z" fill="currentColor"/>
          </svg>
        </button>
        <button class="mp-mini-btn mp-mini-dismiss" @click.stop="miniBarVisible = false" title="Masquer la barre">
          <svg viewBox="0 0 16 16" fill="none" width="10" height="10">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  </Transition>

  <!-- Restore pill (mini bar dismissed, track still playing) -->
  <Transition name="mp-mini-slide">
    <button
      v-if="currentTrack && !isOpen && !miniBarVisible"
      class="mp-mini-restore"
      @click="miniBarVisible = true"
      title="Afficher le lecteur"
    >
      <svg viewBox="0 0 24 24" fill="none" width="13" height="13">
        <path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="2"/>
        <circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="2"/>
      </svg>
      <span v-if="isPlaying" class="mp-restore-dot" />
    </button>
  </Transition>

  <!-- Trigger tab -->
  <div class="mp-trigger-wrap">
    <button
      class="mp-trigger"
      :class="{ 'is-open': isOpen, 'is-playing': isPlaying }"
      @click="toggle"
      :title="`Lecteur musical (${isMac ? '⌘' : 'Ctrl'}+M)`"
    >
      <svg viewBox="0 0 24 24" fill="none" class="mp-trigger-icon" width="18" height="18">
        <path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="1.8"/>
        <circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="1.8"/>
      </svg>
      <span class="mp-trigger-label">Musique</span>
      <span v-if="isPlaying && !isOpen" class="mp-playing-dot" />
    </button>
  </div>

  <!-- Backdrop -->
  <Transition name="mp-backdrop">
    <div v-if="isOpen" class="mp-backdrop" @click="close" />
  </Transition>

  <!-- Panel -->
  <Transition name="mp-slide">
    <div v-if="isOpen" class="mp-panel" @click="closePlMenu">

      <!-- Header -->
      <div class="mp-header">
        <div class="mp-header-left">
          <svg viewBox="0 0 24 24" fill="none" width="17" height="17">
            <path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="1.8"/>
            <circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="1.8"/>
          </svg>
          <h2 class="mp-title">Lecteur musical</h2>
        </div>
        <button class="mp-close-btn" @click="close" title="Fermer">
          <svg viewBox="0 0 16 16" fill="none" width="15" height="15">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <!-- Now playing card -->
      <div class="mp-now-playing">
        <template v-if="currentTrack">
          <img :src="currentTrack.thumbnail" class="mp-np-thumb" loading="lazy" />
          <div class="mp-np-info">
            <p class="mp-np-title">{{ currentTrack.title }}</p>
            <p class="mp-np-channel">{{ currentTrack.channel }}</p>
          </div>
        </template>
        <div v-else class="mp-np-empty">
          <svg viewBox="0 0 24 24" fill="none" width="30" height="30">
            <path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="1.5" opacity="0.3" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
            <circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
          </svg>
          <span>Aucune musique en cours</span>
        </div>
      </div>

      <!-- Progress -->
      <div class="mp-progress-section">
        <div
          class="mp-progress-track"
          @click="seekTo"
          :class="{ 'is-disabled': !currentTrack }"
        >
          <div class="mp-progress-fill" :style="{ width: progress + '%' }" />
          <div v-if="currentTrack" class="mp-progress-thumb" :style="{ left: progress + '%' }" />
        </div>
        <div class="mp-time-row">
          <span class="mp-time">{{ currentTrack ? currentTime : '0:00' }}</span>
          <span class="mp-time">{{ currentTrack ? totalTime : '0:00' }}</span>
        </div>
      </div>

      <!-- Controls -->
      <div class="mp-controls">
        <button class="mp-ctrl" @click="playPrev" title="Précédent" :disabled="!currentTrack">
          <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
            <rect x="2" y="3" width="2.5" height="10" rx="1" fill="currentColor"/>
            <path d="M14 3L6.5 8l7.5 5V3z" fill="currentColor"/>
          </svg>
        </button>
        <button class="mp-ctrl is-play" @click="togglePlay" :disabled="!currentTrack">
          <svg v-if="isPlaying" viewBox="0 0 16 16" fill="none" width="20" height="20">
            <rect x="3" y="2" width="4" height="12" rx="1.5" fill="currentColor"/>
            <rect x="9" y="2" width="4" height="12" rx="1.5" fill="currentColor"/>
          </svg>
          <svg v-else viewBox="0 0 16 16" fill="none" width="20" height="20">
            <path d="M3 2l11 6-11 6V2z" fill="currentColor"/>
          </svg>
        </button>
        <button class="mp-ctrl" @click="playNext" title="Suivant" :disabled="!currentTrack">
          <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
            <rect x="11.5" y="3" width="2.5" height="10" rx="1" fill="currentColor"/>
            <path d="M2 3l7.5 5L2 13V3z" fill="currentColor"/>
          </svg>
        </button>

        <div class="mp-volume">
          <button class="mp-ctrl is-small" @click="toggleMute" :title="isMuted ? 'Activer le son' : 'Sourdine'">
            <svg v-if="isMuted || volume === 0" viewBox="0 0 16 16" fill="none" width="15" height="15">
              <path d="M3 6h2l4-3v10l-4-3H3V6z" fill="currentColor"/>
              <path d="M11 6l3 3M14 6l-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <svg v-else-if="volume < 50" viewBox="0 0 16 16" fill="none" width="15" height="15">
              <path d="M3 6h2l4-3v10l-4-3H3V6z" fill="currentColor"/>
              <path d="M10.5 6.5a3 3 0 0 1 0 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <svg v-else viewBox="0 0 16 16" fill="none" width="15" height="15">
              <path d="M3 6h2l4-3v10l-4-3H3V6z" fill="currentColor"/>
              <path d="M10.5 5.5a4 4 0 0 1 0 5M12 3.5a6.5 6.5 0 0 1 0 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </button>
          <input
            type="range"
            class="mp-volume-slider"
            min="0" max="100" step="1"
            :value="isMuted ? 0 : volume"
            @input="onVolumeInput"
          />
        </div>
      </div>

      <!-- Tabs -->
      <div class="mp-tabs-row">
        <button
          v-for="t in TABS" :key="t.id"
          class="mp-tab"
          :class="{ 'is-active': activeTab === t.id }"
          @click="activeTab = t.id"
        >
          {{ t.label }}
          <span v-if="t.id === 'queue' && queue.length" class="mp-tab-badge">{{ queue.length }}</span>
        </button>
      </div>

      <!-- ─── Tab: Search ─────────────────────────────────────── -->
      <div v-if="activeTab === 'search'" class="mp-tab-pane">
        <form class="mp-search-form" @submit.prevent="search">
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            class="mp-search-input"
            placeholder="Rechercher une chanson..."
          />
          <button type="submit" class="mp-search-btn" :disabled="isSearching || !searchQuery.trim()">
            <span v-if="isSearching" class="mp-spinner" />
            <svg v-else viewBox="0 0 16 16" fill="none" width="14" height="14">
              <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" stroke-width="1.6"/>
              <line x1="9.8" y1="9.8" x2="13" y2="13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
          </button>
        </form>

        <div class="mp-results">
          <div v-if="!searchResults.length && !isSearching" class="mp-empty-hint">
            {{ searchQuery.trim() ? 'Aucun résultat' : 'Recherchez une chanson…' }}
          </div>

          <div
            v-for="track in searchResults"
            :key="track.id"
            class="mp-track-row"
          >
            <img :src="track.thumbnail" class="mp-track-thumb" loading="lazy" />
            <div class="mp-track-info">
              <p class="mp-track-title">{{ track.title }}</p>
              <p class="mp-track-sub">{{ track.channel }} · {{ track.duration }}</p>
            </div>
            <div class="mp-track-actions">
              <button class="mp-action-btn" @click="playNow(track)" title="Jouer maintenant">
                <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><path d="M3 2l11 6-11 6V2z" fill="currentColor"/></svg>
              </button>
              <button class="mp-action-btn" @click="addToQueue(track)" title="Ajouter à la file">
                <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
                  <line x1="2" y1="4" x2="12" y2="4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  <line x1="2" y1="8" x2="9" y2="8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  <line x1="2" y1="12" x2="6" y2="12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  <path d="M12 9v5M9.5 11.5l2.5-2.5 2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <!-- Add to playlist -->
              <div class="mp-pl-add-wrap" @click.stop>
                <button class="mp-action-btn" @click="togglePlMenu(track.id)" title="Ajouter à une playlist">
                  <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
                    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/>
                    <path d="M8 5v6M5 8h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
                <Transition name="mp-pop">
                  <div v-if="plMenuTrackId === track.id && playlists.length" class="mp-pl-dropdown">
                    <button
                      v-for="pl in playlists"
                      :key="pl.id"
                      class="mp-pl-option"
                      @click="addTrackToPlaylist(pl.id, track)"
                    >
                      {{ pl.name }}
                    </button>
                  </div>
                  <div v-else-if="plMenuTrackId === track.id" class="mp-pl-dropdown">
                    <span class="mp-pl-hint">Créez une playlist d'abord</span>
                  </div>
                </Transition>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Tab: Queue ──────────────────────────────────────── -->
      <div v-if="activeTab === 'queue'" class="mp-tab-pane">
        <div v-if="!queue.length" class="mp-empty-hint">La file est vide</div>
        <template v-else>
          <div class="mp-queue-header">
            <span>{{ queue.length }} morceau{{ queue.length !== 1 ? 'x' : '' }}</span>
            <button class="mp-link-btn" @click="clearQueue">Vider la file</button>
          </div>
          <div
            v-for="(track, idx) in queue"
            :key="track.id + idx"
            class="mp-track-row"
            :class="{ 'is-current': idx === currentIndex }"
            @click="playFromQueue(idx)"
          >
            <span class="mp-queue-num" :class="{ 'is-current': idx === currentIndex }">
              <svg v-if="idx === currentIndex && isPlaying" viewBox="0 0 10 14" fill="none" width="10" height="14">
                <rect x="0" y="2" width="2.5" height="10" rx="1" fill="currentColor"><animate attributeName="height" values="10;4;10" dur="0.8s" repeatCount="indefinite"/><animate attributeName="y" values="2;5;2" dur="0.8s" repeatCount="indefinite"/></rect>
                <rect x="3.75" y="0" width="2.5" height="14" rx="1" fill="currentColor" opacity="0.7"><animate attributeName="height" values="14;6;14" dur="1.1s" repeatCount="indefinite"/><animate attributeName="y" values="0;4;0" dur="1.1s" repeatCount="indefinite"/></rect>
                <rect x="7.5" y="3" width="2.5" height="8" rx="1" fill="currentColor" opacity="0.5"><animate attributeName="height" values="8;3;8" dur="0.9s" repeatCount="indefinite"/><animate attributeName="y" values="3;6;3" dur="0.9s" repeatCount="indefinite"/></rect>
              </svg>
              <span v-else>{{ idx + 1 }}</span>
            </span>
            <img :src="track.thumbnail" class="mp-track-thumb" loading="lazy" />
            <div class="mp-track-info">
              <p class="mp-track-title">{{ track.title }}</p>
              <p class="mp-track-sub">{{ track.duration }}</p>
            </div>
            <button class="mp-action-btn" @click.stop="removeFromQueue(idx)" title="Retirer">
              <svg viewBox="0 0 16 16" fill="none" width="11" height="11">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </template>
      </div>

      <!-- ─── Tab: Playlists ─────────────────────────────────── -->
      <div v-if="activeTab === 'playlists'" class="mp-tab-pane">
        <form class="mp-search-form" @submit.prevent="createPlaylist">
          <input
            v-model="newPlaylistName"
            class="mp-search-input"
            placeholder="Nom de la nouvelle playlist..."
          />
          <button type="submit" class="mp-search-btn" :disabled="!newPlaylistName.trim()">
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
              <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </form>

        <div v-if="!playlists.length" class="mp-empty-hint">
          Créez votre première playlist
        </div>

        <div v-for="pl in playlists" :key="pl.id" class="mp-pl-item">
          <div class="mp-pl-item-header" @click="toggleExpandPlaylist(pl.id)">
            <div class="mp-pl-item-left">
              <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                <path d="M2 4h12M2 8h8M2 12h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="13" cy="10" r="2.5" stroke="currentColor" stroke-width="1.3"/>
                <path d="M13 5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
              <span class="mp-pl-name">{{ pl.name }}</span>
              <span class="mp-pl-count">{{ pl.tracks.length }}</span>
            </div>
            <div class="mp-pl-item-actions">
              <button class="mp-action-btn" @click.stop="playPlaylist(pl)" title="Jouer tout" :disabled="!pl.tracks.length">
                <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><path d="M3 2l11 6-11 6V2z" fill="currentColor"/></svg>
              </button>
              <button
                class="mp-action-btn mp-pl-del-btn"
                :class="deletePending[pl.id] === 1 ? 'is-warn' : deletePending[pl.id] === 2 ? 'is-danger' : ''"
                @click.stop="confirmDeletePlaylist(pl.id)"
                :title="deletePending[pl.id] === 1 ? 'Cliquez encore...' : deletePending[pl.id] === 2 ? 'Dernière chance — supprimer ?' : 'Supprimer'"
              >
                <!-- Step 0: trash icon -->
                <svg v-if="!deletePending[pl.id]" viewBox="0 0 16 16" fill="none" width="11" height="11">
                  <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <!-- Step 1: question mark -->
                <svg v-else-if="deletePending[pl.id] === 1" viewBox="0 0 16 16" fill="none" width="11" height="11">
                  <path d="M6 6c0-1.1.9-2 2-2s2 .9 2 2c0 1-1 1.5-1.5 2S8 9.5 8 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <circle cx="8" cy="12.5" r="0.75" fill="currentColor"/>
                </svg>
                <!-- Step 2: warning X -->
                <svg v-else viewBox="0 0 16 16" fill="none" width="11" height="11">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          <Transition name="mp-expand">
            <div v-if="expandedPlaylistId === pl.id" class="mp-pl-tracks">
              <div v-if="!pl.tracks.length" class="mp-empty-hint" style="padding:10px 12px">
                Ajoutez des morceaux depuis la recherche
              </div>
              <div
                v-for="(t, ti) in pl.tracks"
                :key="t.id"
                class="mp-track-row is-dense"
                @click="playNow(t)"
              >
                <img :src="t.thumbnail" class="mp-track-thumb" loading="lazy" />
                <div class="mp-track-info">
                  <p class="mp-track-title is-small">{{ t.title }}</p>
                  <p class="mp-track-sub">{{ t.duration }}</p>
                </div>
                <button class="mp-action-btn" @click.stop="removeTrackFromPlaylist(pl.id, ti)" title="Retirer">
                  <svg viewBox="0 0 16 16" fill="none" width="10" height="10">
                    <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>

    </div>
  </Transition>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady?: () => void
  }
}

interface MusicTrack {
  id: string
  title: string
  channel: string
  thumbnail: string
  duration: string
}
interface MusicPlaylist {
  id: string
  name: string
  tracks: MusicTrack[]
}

const TABS = [
  { id: 'search',    label: 'Recherche' },
  { id: 'queue',     label: 'File' },
  { id: 'playlists', label: 'Playlists' },
] as const
type TabId = typeof TABS[number]['id']

const authStore = useAuthStore()

// ─── Panel state
const isOpen        = ref(false)
const miniBarVisible = ref(true)
const activeTab     = ref<TabId>('search')

// ─── Search
const searchQuery    = ref('')
const searchResults  = ref<MusicTrack[]>([])
const isSearching    = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)

// ─── Player
let ytPlayer: any = null
const playerReady = ref(false)
const isPlaying   = ref(false)
const isMuted     = ref(false)
const volume      = ref(80)
const progress    = ref(0)
const currentTime = ref('0:00')
const totalTime   = ref('0:00')
let progressTimer: ReturnType<typeof setInterval> | null = null

// ─── Queue
const queue        = ref<MusicTrack[]>([])
const currentIndex = ref(-1)
const currentTrack = computed(() => queue.value[currentIndex.value] ?? null)

// ─── Playlists
const playlists         = ref<MusicPlaylist[]>([])
const newPlaylistName   = ref('')
const expandedPlaylistId = ref<string | null>(null)
const plMenuTrackId     = ref<string | null>(null)
let playlistsLoaded = false

// ────────────────────────────────────────────────────────────────
// YouTube IFrame API bootstrap
// ────────────────────────────────────────────────────────────────
function loadYouTubeAPI() {
  // Script already injected by nuxt.config head — just wait for or use the ready signal
  if (window.YT?.Player) { initPlayer(); return }
  const prev = window.onYouTubeIframeAPIReady
  window.onYouTubeIframeAPIReady = () => {
    initPlayer()
    if (prev) prev()
  }
  // Only add the script tag if Nuxt somehow didn't inject it (dev fallback)
  if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  }
}

function initPlayer() {
  ytPlayer = new window.YT.Player('mp-yt-player', {
    height: '1',
    width: '1',
    playerVars: { autoplay: 0, controls: 0, rel: 0, modestbranding: 1 },
    events: {
      onReady: () => {
        playerReady.value = true
        ytPlayer.setVolume(volume.value)
        // Re-cue the restored track so play button works immediately after refresh
        const track = currentTrack.value
        if (track) {
          // Pass startSeconds so YouTube buffers from the right position
          const startSec = pendingSeekPct > 0
            ? Math.round((pendingSeekPct / 100) * 1800) // rough estimate; refined on PLAYING
            : 0
          ytPlayer.cueVideoById({ videoId: track.id, startSeconds: startSec })
        }
      },
      onStateChange: (e: any) => {
        const S = window.YT.PlayerState
        if (e.data === S.PLAYING) {
          isPlaying.value = true
          startProgressPoll()
          // Seek to saved position on first play after restore
          if (pendingSeekPct > 0) {
            try {
              const dur = ytPlayer.getDuration() as number
              if (dur > 0) ytPlayer.seekTo((pendingSeekPct / 100) * dur, true)
            } catch {}
            pendingSeekPct = 0
          }
        } else if (e.data === S.PAUSED || e.data === S.BUFFERING) {
          isPlaying.value = false
        } else if (e.data === S.ENDED) {
          isPlaying.value = false
          playNext()
        }
      },
    },
  })
}

// ────────────────────────────────────────────────────────────────
// Progress polling
// ────────────────────────────────────────────────────────────────
function startProgressPoll() {
  stopProgressPoll()
  progressTimer = setInterval(() => {
    if (!ytPlayer || !isPlaying.value) return
    try {
      const cur = ytPlayer.getCurrentTime() as number
      const dur = ytPlayer.getDuration() as number
      if (dur > 0) {
        progress.value = Math.round((cur / dur) * 1000) / 10
        currentTime.value = formatTime(cur)
        totalTime.value   = formatTime(dur)
      }
    } catch {}
  }, 500)
}

function stopProgressPoll() {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null }
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

// ────────────────────────────────────────────────────────────────
// Playback controls
// ────────────────────────────────────────────────────────────────
function playTrack(track: MusicTrack) {
  if (!playerReady.value) return
  ytPlayer.loadVideoById(track.id)
  ytPlayer.playVideo()
  progress.value = 0
  currentTime.value = '0:00'
  totalTime.value = '0:00'
  miniBarVisible.value = true  // always show bar when new track starts
}

function playNow(track: MusicTrack) {
  const idx = currentIndex.value + 1
  queue.value.splice(idx, 0, track)
  currentIndex.value = idx
  playTrack(track)
}

function addToQueue(track: MusicTrack) {
  queue.value.push(track)
  if (currentIndex.value === -1) {
    currentIndex.value = queue.value.length - 1
    playTrack(track)
  }
}

function playFromQueue(idx: number) {
  currentIndex.value = idx
  const t = queue.value[idx]
  if (t) playTrack(t)
}

function playNext() {
  const next = currentIndex.value + 1
  if (next < queue.value.length) {
    currentIndex.value = next
    const t = queue.value[next]
    if (t) playTrack(t)
  } else {
    isPlaying.value = false
    stopProgressPoll()
  }
}

function playPrev() {
  if (progress.value > 5) {
    ytPlayer?.seekTo(0, true)
    progress.value = 0
    return
  }
  const prev = currentIndex.value - 1
  if (prev >= 0) {
    currentIndex.value = prev
    const t = queue.value[prev]
    if (t) playTrack(t)
  }
}

function togglePlay() {
  if (!ytPlayer || !playerReady.value || !currentTrack.value) return
  if (isPlaying.value) { ytPlayer.pauseVideo() } else { ytPlayer.playVideo() }
}

function seekTo(e: MouseEvent) {
  if (!ytPlayer || !currentTrack.value) return
  const bar = (e.currentTarget as HTMLElement)
  const rect = bar.getBoundingClientRect()
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const dur = ytPlayer.getDuration() as number
  ytPlayer.seekTo(pct * dur, true)
  progress.value = pct * 100
}

function toggleMute() {
  if (!ytPlayer) return
  isMuted.value = !isMuted.value
  if (isMuted.value) { ytPlayer.mute() } else { ytPlayer.unMute() }
}

function onVolumeInput(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value)
  volume.value = v
  isMuted.value = false
  if (ytPlayer && playerReady.value) {
    ytPlayer.unMute()
    ytPlayer.setVolume(v)
  }
}

function removeFromQueue(idx: number) {
  queue.value.splice(idx, 1)
  if (idx < currentIndex.value) {
    currentIndex.value--
  } else if (idx === currentIndex.value) {
    if (queue.value.length === 0) {
      currentIndex.value = -1
      ytPlayer?.stopVideo()
      isPlaying.value = false
    } else {
      currentIndex.value = Math.min(idx, queue.value.length - 1)
      const t = queue.value[currentIndex.value]
      if (t) playTrack(t)
    }
  }
}

function clearQueue() {
  queue.value = []
  currentIndex.value = -1
  ytPlayer?.stopVideo()
  isPlaying.value = false
  stopProgressPoll()
}

// ────────────────────────────────────────────────────────────────
// Search
// ────────────────────────────────────────────────────────────────
async function search() {
  if (!searchQuery.value.trim()) return
  isSearching.value = true
  try {
    const data = await $fetch<{ items: MusicTrack[] }>(`/api/music/search?q=${encodeURIComponent(searchQuery.value)}`)
    searchResults.value = data.items
  } catch {
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

// ────────────────────────────────────────────────────────────────
// Playlists
// ────────────────────────────────────────────────────────────────
async function loadPlaylists() {
  if (playlistsLoaded) return
  playlistsLoaded = true
  try {
    const data = await $fetch<{ playlists: MusicPlaylist[] }>('/api/music/playlists')
    playlists.value = data.playlists ?? []
  } catch {}
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleSavePlaylists() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try { await $fetch('/api/music/playlists', { method: 'PATCH', body: { playlists: playlists.value } }) } catch {}
  }, 800)
}

function createPlaylist() {
  const name = newPlaylistName.value.trim()
  if (!name) return
  playlists.value.push({ id: Date.now().toString(), name, tracks: [] })
  newPlaylistName.value = ''
  scheduleSavePlaylists()
}

function deletePlaylist(id: string) {
  playlists.value = playlists.value.filter(p => p.id !== id)
  if (expandedPlaylistId.value === id) expandedPlaylistId.value = null
  scheduleSavePlaylists()
}

// ─── Triple-confirm delete ───────────────────────────────────────
const deletePending = ref<Record<string, number>>({})
const deleteTimers  = new Map<string, ReturnType<typeof setTimeout>>()

function confirmDeletePlaylist(id: string) {
  const step = deletePending.value[id] ?? 0
  // Clear any existing reset timer
  const prev = deleteTimers.get(id)
  if (prev) clearTimeout(prev)

  if (step < 2) {
    // Advance one step and auto-reset after 3 s of inactivity
    deletePending.value = { ...deletePending.value, [id]: step + 1 }
    deleteTimers.set(id, setTimeout(() => {
      const { [id]: _, ...rest } = deletePending.value
      deletePending.value = rest
      deleteTimers.delete(id)
    }, 3000))
  } else {
    // Step 3 — actually delete
    deleteTimers.delete(id)
    const { [id]: _, ...rest } = deletePending.value
    deletePending.value = rest
    deletePlaylist(id)
  }
}

function addTrackToPlaylist(playlistId: string, track: MusicTrack) {
  const pl = playlists.value.find(p => p.id === playlistId)
  if (!pl) return
  if (!pl.tracks.find(t => t.id === track.id)) {
    pl.tracks.push({ ...track })
    scheduleSavePlaylists()
  }
  plMenuTrackId.value = null
}

function removeTrackFromPlaylist(playlistId: string, trackIdx: number) {
  const pl = playlists.value.find(p => p.id === playlistId)
  if (!pl) return
  pl.tracks.splice(trackIdx, 1)
  scheduleSavePlaylists()
}

function playPlaylist(pl: MusicPlaylist) {
  if (!pl.tracks.length) return
  queue.value = [...pl.tracks]
  currentIndex.value = 0
  const t = queue.value[0]
  if (t) playTrack(t)
  activeTab.value = 'queue'
}

function toggleExpandPlaylist(id: string) {
  expandedPlaylistId.value = expandedPlaylistId.value === id ? null : id
}

function togglePlMenu(trackId: string) {
  plMenuTrackId.value = plMenuTrackId.value === trackId ? null : trackId
}

function closePlMenu() {
  plMenuTrackId.value = null
}

// ────────────────────────────────────────────────────────────────
// Panel open / close
// ────────────────────────────────────────────────────────────────
async function open() {
  isOpen.value = true
  if (authStore.isAuthenticated) await loadPlaylists()
  await nextTick()
  if (activeTab.value === 'search') searchInputRef.value?.focus()
}

function close() {
  isOpen.value = false
}

function toggle() {
  if (isOpen.value) { close() } else { open() }
}

// ─── State persistence ──────────────────────────────────────────────────────
// · volume    → MongoDB (per user, survives all browsers)
// · playlists → MongoDB (handled by scheduleSavePlaylists)
// · queue     → localStorage, 3 h TTL, compact (per user)
// · search    → localStorage, 2 h TTL, compact (per user)

const uid = () => authStore.user?.id ?? 'guest'
const LS_Q = () => `mpq_${uid()}`   // queue + index
const LS_S = () => `mps_${uid()}`   // search results

interface LSQueue  { d: MusicTrack[]; i: number; p: number; e: number }
interface LSSearch { d: MusicTrack[];             e: number }

function lsGet<T>(key: string): T | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const o = JSON.parse(raw) as { e: number }
    if (Date.now() > o.e) { localStorage.removeItem(key); return null }
    return o as T
  } catch { return null }
}

// Progress to seek to on first play after restore (0 = no pending seek)
let pendingSeekPct = 0

function restoreFromLocal() {
  const q = lsGet<LSQueue>(LS_Q())
  if (q) {
    queue.value        = q.d
    currentIndex.value = q.i
    pendingSeekPct     = q.p ?? 0
  }
  const s = lsGet<LSSearch>(LS_S())
  if (s) searchResults.value = s.d
}

// Load volume from DB (authoritative, tiny payload)
async function loadVolumeFromDB() {
  if (!authStore.isAuthenticated) return
  try {
    const data = await $fetch<{ volume: number }>('/api/music/state')
    if (typeof data.volume === 'number') {
      volume.value = data.volume
      if (ytPlayer && playerReady.value) ytPlayer.setVolume(data.volume)
    }
  } catch {}
}

// Debounced localStorage saves (fast, no network)
let lsQTimer: ReturnType<typeof setTimeout> | null = null
let lsSTimer: ReturnType<typeof setTimeout> | null = null
const Q_TTL = 3 * 60 * 60 * 1000   // 3 hours
const S_TTL = 2 * 60 * 60 * 1000   // 2 hours

watch([queue, currentIndex], () => {
  if (lsQTimer) clearTimeout(lsQTimer)
  lsQTimer = setTimeout(() => {
    if (!import.meta.client) return
    try {
      localStorage.setItem(LS_Q(), JSON.stringify({
        d: queue.value,
        i: currentIndex.value,
        p: progress.value,
        e: Date.now() + Q_TTL,
      } as LSQueue))
    } catch {}
  }, 800)
}, { deep: true })

// Save progress on page unload (refresh/close) — exact position captured
function saveProgressOnUnload() {
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(LS_Q())
    if (!raw) return
    const o = JSON.parse(raw) as LSQueue
    o.p = progress.value
    localStorage.setItem(LS_Q(), JSON.stringify(o))
  } catch {}
}

watch(searchResults, () => {
  if (lsSTimer) clearTimeout(lsSTimer)
  lsSTimer = setTimeout(() => {
    if (!import.meta.client) return
    try {
      localStorage.setItem(LS_S(), JSON.stringify({
        d: searchResults.value,
        e: Date.now() + S_TTL,
      } as LSSearch))
    } catch {}
  }, 800)
}, { deep: true })

// Debounced volume save to DB (only on volume change)
let volTimer: ReturnType<typeof setTimeout> | null = null
watch(volume, (v) => {
  if (volTimer) clearTimeout(volTimer)
  volTimer = setTimeout(async () => {
    if (!authStore.isAuthenticated) return
    try { await $fetch('/api/music/state', { method: 'PATCH', body: { volume: v } }) } catch {}
  }, 1500)
})

// ─── Global keyboard shortcut Ctrl+M ────────────────────────────────────────
const isMac = ref(false)

function onGlobalKeydown(e: KeyboardEvent) {
  const mod = isMac.value ? e.metaKey : e.ctrlKey
  if (mod && !e.shiftKey && (e.key === 'm' || e.key === 'M')) {
    e.preventDefault()
    toggle()
  }
}

onMounted(() => {
  isMac.value = navigator.platform.toUpperCase().includes('MAC')
  restoreFromLocal()   // instant — queue + search from localStorage
  loadVolumeFromDB()   // tiny DB call — just the volume number
  loadYouTubeAPI()
  window.addEventListener('keydown', onGlobalKeydown)
  window.addEventListener('beforeunload', saveProgressOnUnload)
})

onUnmounted(() => {
  stopProgressPoll()
  if (saveTimer)  clearTimeout(saveTimer)
  if (lsQTimer)   clearTimeout(lsQTimer)
  if (lsSTimer)   clearTimeout(lsSTimer)
  if (volTimer)   clearTimeout(volTimer)
  window.removeEventListener('keydown', onGlobalKeydown)
  window.removeEventListener('beforeunload', saveProgressOnUnload)
})
</script>

<style lang="scss" scoped>
@use '~/assets/scss/variables' as *;

// ─── Trigger ────────────────────────────────────────────────────
.mp-trigger-wrap {
  position: fixed;
  left: 0;
  top: calc(50% + 62px);
  transform: translateY(-50%);
  z-index: 1000;
  pointer-events: none;
}

.mp-trigger {
  pointer-events: all;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 14px 10px;
  background:
    radial-gradient(ellipse 100% 60% at 0% 50%, rgba($neutral-amber, 0.18) 0%, transparent 70%),
    rgba(20, 8, 44, 0.85);
  backdrop-filter: blur(14px);
  border: 1px solid rgba($neutral-amber, 0.24);
  border-left: none;
  border-radius: 0 12px 12px 0;
  color: rgba($neutral-amber, 0.65);
  cursor: pointer;
  transition: all 280ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 4px 0 24px rgba($neutral-amber, 0.08);

  &:hover, &.is-open {
    color: $neutral-amber;
    background:
      radial-gradient(ellipse 100% 60% at 0% 50%, rgba($neutral-amber, 0.30) 0%, transparent 70%),
      rgba(28, 10, 58, 0.92);
    border-color: rgba($neutral-amber, 0.50);
    transform: translateX(3px);
  }

  &.is-playing {
    border-color: rgba($neutral-amber, 0.60);
    color: $neutral-amber;
  }
}

.mp-trigger-label {
  font-size: 0.60rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  writing-mode: vertical-lr;
  transform: rotate(180deg);
  font-family: $font-body;
}

.mp-playing-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: $neutral-amber;
  box-shadow: 0 0 6px $neutral-amber;
  animation: mp-pulse 1.4s ease-in-out infinite;
}

@keyframes mp-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}

// ─── Backdrop ───────────────────────────────────────────────────
.mp-backdrop {
  position: fixed; inset: 0; z-index: 1050;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(2px);
}
.mp-backdrop-enter-active, .mp-backdrop-leave-active { transition: opacity 240ms ease; }
.mp-backdrop-enter-from, .mp-backdrop-leave-to { opacity: 0; }

// ─── Panel ──────────────────────────────────────────────────────
.mp-panel {
  position: fixed;
  top: 20px;
  left: 20px;
  bottom: 20px;
  width: 380px;
  z-index: 1060;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse 60% 40% at 20% 10%, rgba($neutral-amber, 0.06) 0%, transparent 60%),
    radial-gradient(ellipse 80% 50% at 80% 80%, rgba($violet-700, 0.20) 0%, transparent 60%),
    rgba(14, 6, 30, 0.97);
  backdrop-filter: blur(28px);
  border: 1px solid rgba($neutral-amber, 0.18);
  border-radius: 18px;
  box-shadow:
    8px 0 48px rgba($neutral-amber, 0.06),
    0 16px 48px rgba(0,0,0,0.55),
    inset 0 1px 0 rgba($neutral-amber, 0.12);
  overflow: hidden;
}

.mp-slide-enter-active, .mp-slide-leave-active {
  transition: all 320ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mp-slide-enter-from, .mp-slide-leave-to {
  opacity: 0;
  transform: translateX(-32px) scale(0.97);
}

// ─── Header ─────────────────────────────────────────────────────
.mp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 12px;
  border-bottom: 1px solid rgba($neutral-amber, 0.10);
  flex-shrink: 0;
}

.mp-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  color: $neutral-amber;
}

.mp-title {
  font-family: $font-display;
  font-size: 1.0rem;
  font-weight: 700;
  color: $neutral-amber;
  margin: 0;
}

.mp-close-btn {
  width: 28px; height: 28px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid rgba($neutral-amber, 0.15);
  color: rgba($text-muted, 0.60);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 140ms ease;
  &:hover { background: rgba($neutral-amber, 0.12); color: $text-primary; border-color: rgba($neutral-amber, 0.35); }
}

// ─── Now Playing ────────────────────────────────────────────────
.mp-now-playing {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba($neutral-amber, 0.08);
  flex-shrink: 0;
  min-height: 76px;
}

.mp-np-thumb {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid rgba($neutral-amber, 0.20);
  flex-shrink: 0;
}

.mp-np-info {
  flex: 1;
  overflow: hidden;
}

.mp-np-title {
  font-size: 0.84rem;
  font-weight: 700;
  color: $text-primary;
  font-family: $font-body;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 0 3px;
}

.mp-np-channel {
  font-size: 0.70rem;
  color: $text-muted;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mp-np-empty {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  color: rgba($text-muted, 0.50);
  font-size: 0.78rem;
  font-style: italic;
}

// ─── Progress ───────────────────────────────────────────────────
.mp-progress-section {
  padding: 10px 18px 0;
  flex-shrink: 0;
}

.mp-progress-track {
  position: relative;
  height: 4px;
  background: rgba($violet-600, 0.25);
  border-radius: 2px;
  cursor: pointer;
  &.is-disabled { cursor: default; pointer-events: none; }
}

.mp-progress-fill {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  background: linear-gradient(90deg, $violet-400, $neutral-amber);
  border-radius: 2px;
  transition: width 0.5s linear;
}

.mp-progress-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px; height: 12px;
  border-radius: 50%;
  background: $neutral-amber;
  box-shadow: 0 0 6px rgba($neutral-amber, 0.60);
  transition: left 0.5s linear;
  pointer-events: none;
}

.mp-time-row {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
}

.mp-time {
  font-size: 0.62rem;
  color: rgba($text-muted, 0.55);
  font-variant-numeric: tabular-nums;
}

// ─── Controls ───────────────────────────────────────────────────
.mp-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 18px 14px;
  flex-shrink: 0;
}

.mp-ctrl {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px;
  border-radius: 50%;
  background: rgba($violet-600, 0.18);
  border: 1px solid rgba($violet-400, 0.20);
  color: rgba($text-primary, 0.75);
  cursor: pointer;
  transition: all 150ms ease;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: rgba($violet-500, 0.30);
    border-color: rgba($violet-400, 0.45);
    color: $text-primary;
  }
  &:disabled { opacity: 0.35; cursor: not-allowed; }

  &.is-play {
    width: 48px; height: 48px;
    background: rgba($neutral-amber, 0.18);
    border-color: rgba($neutral-amber, 0.35);
    color: $neutral-amber;
    &:hover:not(:disabled) {
      background: rgba($neutral-amber, 0.28);
      border-color: rgba($neutral-amber, 0.60);
      box-shadow: 0 0 16px rgba($neutral-amber, 0.25);
    }
  }
  &.is-small { width: 30px; height: 30px; }
}

.mp-volume {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
}

.mp-volume-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 80px;
  height: 3px;
  border-radius: 2px;
  background: rgba($violet-500, 0.35);
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px; height: 12px;
    border-radius: 50%;
    background: $neutral-amber;
    box-shadow: 0 0 4px rgba($neutral-amber, 0.50);
    cursor: pointer;
  }
}

// ─── Tabs ───────────────────────────────────────────────────────
.mp-tabs-row {
  display: flex;
  border-bottom: 1px solid rgba($neutral-amber, 0.10);
  flex-shrink: 0;
  padding: 0 10px;
}

.mp-tab {
  flex: 1;
  padding: 8px 6px;
  background: transparent;
  border: none;
  font-family: $font-body;
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba($text-muted, 0.55);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 150ms ease;
  display: flex; align-items: center; justify-content: center; gap: 5px;
  margin-bottom: -1px;

  &:hover { color: $text-primary; }
  &.is-active {
    color: $neutral-amber;
    border-bottom-color: $neutral-amber;
  }
}

.mp-tab-badge {
  background: $neutral-amber;
  color: rgba(10, 4, 20, 0.90);
  font-size: 0.58rem;
  font-weight: 800;
  border-radius: 10px;
  padding: 1px 5px;
  min-width: 16px;
  text-align: center;
}

// ─── Tab pane ───────────────────────────────────────────────────
.mp-tab-pane {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0 0;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba($neutral-amber, 0.20); border-radius: 3px; }
}

// ─── Search form ────────────────────────────────────────────────
.mp-search-form {
  display: flex;
  gap: 8px;
  padding: 0 12px 10px;
}

.mp-search-input {
  flex: 1;
  background: rgba($violet-800, 0.38);
  border: 1px solid rgba($neutral-amber, 0.18);
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 0.80rem;
  color: $text-primary;
  font-family: $font-body;
  outline: none;
  transition: border-color 150ms ease;
  &::placeholder { color: rgba($text-muted, 0.45); }
  &:focus { border-color: rgba($neutral-amber, 0.45); background: rgba($violet-700, 0.28); }
}

.mp-search-btn {
  width: 36px; height: 36px;
  flex-shrink: 0;
  border-radius: 8px;
  background: rgba($neutral-amber, 0.15);
  border: 1px solid rgba($neutral-amber, 0.30);
  color: $neutral-amber;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 140ms ease;
  &:hover:not(:disabled) { background: rgba($neutral-amber, 0.28); box-shadow: 0 0 10px rgba($neutral-amber, 0.18); }
  &:disabled { opacity: 0.40; cursor: not-allowed; }
}

.mp-spinner {
  display: block;
  width: 14px; height: 14px;
  border: 2px solid rgba($neutral-amber, 0.25);
  border-top-color: $neutral-amber;
  border-radius: 50%;
  animation: mp-spin 0.7s linear infinite;
}
@keyframes mp-spin { to { transform: rotate(360deg); } }

// ─── Track row ──────────────────────────────────────────────────
.mp-results {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.mp-track-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px;
  cursor: pointer;
  transition: background 120ms ease;
  border-radius: 0;

  &:hover { background: rgba($neutral-amber, 0.06); }
  &.is-current { background: rgba($neutral-amber, 0.10); }
  &.is-dense { padding: 5px 16px; }
}

.mp-track-thumb {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgba($neutral-amber, 0.12);
}

.mp-track-info {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.mp-track-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 0 2px;
  &.is-small { font-size: 0.72rem; }
}

.mp-track-sub {
  font-size: 0.64rem;
  color: $text-muted;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mp-track-actions {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.mp-action-btn {
  width: 26px; height: 26px;
  border-radius: 7px;
  background: transparent;
  border: 1px solid rgba($neutral-amber, 0.14);
  color: rgba($text-muted, 0.65);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 120ms ease;
  flex-shrink: 0;
  &:hover { background: rgba($neutral-amber, 0.15); border-color: rgba($neutral-amber, 0.38); color: $neutral-amber; }
  &:disabled { opacity: 0.35; pointer-events: none; }
}

// ─── Playlist add dropdown ───────────────────────────────────────
.mp-pl-add-wrap {
  position: relative;
}

.mp-pop-enter-active, .mp-pop-leave-active { transition: all 120ms ease; }
.mp-pop-enter-from, .mp-pop-leave-to { opacity: 0; transform: scale(0.92) translateY(-4px); }

.mp-pl-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  min-width: 160px;
  background: rgba(14, 6, 30, 0.98);
  backdrop-filter: blur(16px);
  border: 1px solid rgba($neutral-amber, 0.28);
  border-radius: 10px;
  padding: 4px;
  z-index: 9999;
  box-shadow: 0 8px 28px rgba(0,0,0,0.50);
}

.mp-pl-option {
  display: block;
  width: 100%;
  padding: 7px 10px;
  font-size: 0.76rem;
  font-weight: 600;
  color: $text-primary;
  background: transparent;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  text-align: left;
  transition: background 100ms ease;
  font-family: $font-body;
  &:hover { background: rgba($neutral-amber, 0.18); color: $neutral-amber; }
}

.mp-pl-hint {
  display: block;
  padding: 8px 10px;
  font-size: 0.70rem;
  color: $text-muted;
  font-style: italic;
}

// ─── Queue ──────────────────────────────────────────────────────
.mp-queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 12px 8px;
  font-size: 0.70rem;
  color: $text-muted;
}

.mp-queue-num {
  width: 20px;
  font-size: 0.65rem;
  color: rgba($text-muted, 0.50);
  text-align: center;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  &.is-current { color: $neutral-amber; }
}

.mp-link-btn {
  background: transparent;
  border: none;
  font-size: 0.68rem;
  color: rgba($wolf-red, 0.65);
  cursor: pointer;
  font-family: $font-body;
  padding: 0;
  &:hover { color: $wolf-red; }
}

// ─── Playlists tab ──────────────────────────────────────────────
.mp-pl-item {
  border-bottom: 1px solid rgba($neutral-amber, 0.07);
}

.mp-pl-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  cursor: pointer;
  transition: background 120ms ease;
  &:hover { background: rgba($neutral-amber, 0.05); }
}

.mp-pl-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba($neutral-amber, 0.75);
}

.mp-pl-name {
  font-size: 0.80rem;
  font-weight: 700;
  color: $text-primary;
  font-family: $font-body;
}

.mp-pl-count {
  font-size: 0.62rem;
  color: $text-muted;
  background: rgba($violet-600, 0.25);
  border-radius: 10px;
  padding: 1px 6px;
}

.mp-pl-item-actions {
  display: flex; gap: 4px;
}

.mp-pl-del-btn {
  transition: all 160ms ease;
  &.is-warn {
    background: rgba(251, 191, 36, 0.18) !important;
    border-color: rgba(251, 191, 36, 0.50) !important;
    color: #fbbf24 !important;
    transform: scale(1.08);
  }
  &.is-danger {
    background: rgba($wolf-red, 0.22) !important;
    border-color: rgba($wolf-red, 0.60) !important;
    color: $wolf-red !important;
    transform: scale(1.12);
    animation: mp-pulse-danger 0.6s ease-in-out infinite;
  }
}

@keyframes mp-pulse-danger {
  0%, 100% { box-shadow: 0 0 0 0 rgba($wolf-red, 0); }
  50%       { box-shadow: 0 0 0 4px rgba($wolf-red, 0.30); }
}

.mp-expand-enter-active, .mp-expand-leave-active {
  transition: all 180ms ease;
  overflow: hidden;
}
.mp-expand-enter-from, .mp-expand-leave-to { max-height: 0; opacity: 0; }
.mp-expand-enter-to, .mp-expand-leave-from { max-height: 400px; opacity: 1; }

.mp-pl-tracks {
  background: rgba($violet-950, 0.35);
}

// ─── Empty hint ─────────────────────────────────────────────────
.mp-empty-hint {
  text-align: center;
  color: rgba($text-muted, 0.50);
  font-size: 0.76rem;
  font-style: italic;
  padding: 28px 16px;
}

// ─── Mini bar ───────────────────────────────────────────────────
.mp-mini-bar {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999;
  width: min(440px, calc(100vw - 40px));
  background: rgba(14, 6, 30, 0.96);
  backdrop-filter: blur(20px);
  border: 1px solid rgba($neutral-amber, 0.25);
  border-radius: 14px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba($neutral-amber, 0.06);
  overflow: hidden;

  &:hover { border-color: rgba($neutral-amber, 0.45); }
}

.mp-mini-progress-bar {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 2px;
  background: rgba($violet-600, 0.25);
}

.mp-mini-fill {
  height: 100%;
  background: linear-gradient(90deg, $violet-400, $neutral-amber);
  transition: width 0.5s linear;
}

.mp-mini-thumb {
  width: 38px; height: 38px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgba($neutral-amber, 0.18);
}

.mp-mini-info {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.mp-mini-title {
  display: block;
  font-size: 0.78rem;
  font-weight: 700;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mp-mini-channel {
  display: block;
  font-size: 0.62rem;
  color: $text-muted;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mp-mini-ctrl {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.mp-mini-btn {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: rgba($neutral-amber, 0.10);
  border: 1px solid rgba($neutral-amber, 0.20);
  color: rgba($neutral-amber, 0.80);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 130ms ease;
  &:hover { background: rgba($neutral-amber, 0.22); color: $neutral-amber; }
  &.is-play { background: rgba($neutral-amber, 0.18); border-color: rgba($neutral-amber, 0.40); }
}

.mp-mini-slide-enter-active, .mp-mini-slide-leave-active {
  transition: all 280ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mp-mini-slide-enter-from, .mp-mini-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(16px);
}

.mp-mini-dismiss {
  opacity: 0.45;
  border-color: transparent !important;
  background: transparent !important;
  transition: opacity 140ms ease;
  &:hover { opacity: 1 !important; background: rgba($wolf-red, 0.18) !important; }
}

.mp-mini-vol {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;

  .mp-mini-vol-btn {
    width: 24px; height: 24px;
    background: transparent;
    border-color: transparent;
    opacity: 0.65;
    &:hover { opacity: 1; background: rgba($neutral-amber, 0.12); border-color: rgba($neutral-amber, 0.20); }
  }
}

.mp-mini-vol-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 54px;
  height: 3px;
  border-radius: 2px;
  background: rgba($violet-500, 0.40);
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 10px; height: 10px;
    border-radius: 50%;
    background: $neutral-amber;
    box-shadow: 0 0 3px rgba($neutral-amber, 0.50);
    cursor: pointer;
  }
}

// Restore pill
.mp-mini-restore {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  background: rgba(14, 6, 30, 0.92);
  backdrop-filter: blur(14px);
  border: 1px solid rgba($neutral-amber, 0.28);
  border-radius: 20px;
  color: rgba($neutral-amber, 0.75);
  font-family: $font-body;
  font-size: 0.70rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,0.40);
  transition: all 180ms ease;
  &:hover {
    background: rgba(20, 8, 44, 0.97);
    border-color: rgba($neutral-amber, 0.55);
    color: $neutral-amber;
  }
}

.mp-restore-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: $neutral-amber;
  box-shadow: 0 0 5px $neutral-amber;
  animation: mp-pulse 1.4s ease-in-out infinite;
  flex-shrink: 0;
}
</style>
