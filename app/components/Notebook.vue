<template>
  <!-- Floating trigger tab -->
  <div class="nb-trigger-wrap">
    <button
      class="nb-trigger"
      :class="{ 'is-open': isOpen }"
      @click="toggle"
      :title="`Carnet de bord (${isMac ? '⌘' : 'Ctrl'}+M)`"
      aria-label="Ouvrir le carnet de bord"
    >
      <svg class="nb-trigger-icon" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="2" width="14" height="20" rx="2" stroke="currentColor" stroke-width="1.5"/>
        <line x1="2" y1="6" x2="4" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="2" y1="10" x2="4" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="2" y1="14" x2="4" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="2" y1="18" x2="4" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="8" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="8" y1="11" x2="16" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="8" y1="15" x2="14" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span class="nb-trigger-label">Carnet</span>
    </button>
  </div>

  <!-- Backdrop overlay -->
  <Transition name="nb-backdrop">
    <div v-if="isOpen" class="nb-backdrop" @click="close" />
  </Transition>

  <!-- Panel -->
  <Transition name="nb-slide">
    <div v-if="isOpen" class="nb-panel" role="dialog" aria-label="Carnet de bord" @keydown.esc="close" @click="closeAllPopups">

      <!-- Header -->
      <div class="nb-header">
        <div class="nb-header-left">
          <svg class="nb-header-icon" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="2" width="14" height="20" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <line x1="2" y1="6" x2="4" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="2" y1="10" x2="4" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="2" y1="14" x2="4" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="2" y1="18" x2="4" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="8" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="8" y1="11" x2="16" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="8" y1="15" x2="14" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <div class="nb-header-text">
            <h2 class="nb-title">Carnet de bord</h2>
            <span class="nb-user-badge">{{ userName }}</span>
          </div>
        </div>
        <div class="nb-header-right">
          <span v-if="saveStatus === 'saved' || saveStatus === 'error'" class="nb-save-status" :class="`is-${saveStatus}`">
            <span class="nb-status-dot" />
            {{ saveStatusText }}
          </span>
          <button class="nb-close-btn" @click="close" title="Fermer (Echap)">
            <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Body: pages sidebar + main -->
      <div class="nb-body">

        <!-- Pages Sidebar -->
        <div class="nb-pages">
          <div class="nb-pages-header">
            <span class="nb-pages-label">Pages</span>
            <button class="nb-page-add" @click="addPage" title="Nouvelle page">
              <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="nb-pages-list">
            <div
              v-for="page in pages"
              :key="page.id"
              class="nb-page-item"
              :class="{ 'is-active': currentPageId === page.id }"
              @click="switchPage(page.id)"
            >
              <span
                v-if="renamingPageId !== page.id"
                class="nb-page-title"
                @dblclick.stop="startRename(page.id, page.title)"
              >
                {{ page.title || 'Sans titre' }}
              </span>
              <input
                v-else
                ref="renameInputRef"
                class="nb-page-rename"
                :value="page.title"
                @blur="commitRename(page.id, ($event.target as HTMLInputElement).value)"
                @keydown.enter="commitRename(page.id, ($event.target as HTMLInputElement).value)"
                @keydown.esc="renamingPageId = null"
                @click.stop
              />
              <button
                v-if="pages.length > 1 && renamingPageId !== page.id"
                class="nb-page-delete"
                @click.stop="deletePage(page.id)"
                title="Supprimer"
              >
                <svg viewBox="0 0 16 16" fill="none" width="10" height="10">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Main: toolbar + editor + footer -->
        <div class="nb-main">

          <!-- Toolbar -->
          <div class="nb-toolbar" @click.stop>
            <div class="nb-toolbar-group">
              <button class="nb-tool" @mousedown.prevent="format('bold')" :class="{ active: activeFormats.bold }" title="Gras">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M4 3h5a2.5 2.5 0 0 1 0 5H4V3zM4 8h5.5a2.5 2.5 0 0 1 0 5H4V8z" fill="currentColor"/></svg>
              </button>
              <button class="nb-tool" @mousedown.prevent="format('italic')" :class="{ active: activeFormats.italic }" title="Italique">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M6 3h6M4 13h6M10 3l-4 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
              </button>
              <button class="nb-tool" @mousedown.prevent="format('underline')" :class="{ active: activeFormats.underline }" title="Souligne">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M4 3v5a4 4 0 0 0 8 0V3M3 13h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
              </button>
              <button class="nb-tool" @mousedown.prevent="format('strikeThrough')" :class="{ active: activeFormats.strikeThrough }" title="Barre">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M3 8h10M5 5c0-1.1 1.3-2 3-2s3 .9 3 2M5 11c0 1.1 1.3 2 3 2s3-.9 3-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
              </button>
            </div>

            <div class="nb-toolbar-divider" />

            <div class="nb-toolbar-group">
              <button class="nb-tool nb-tool-text" @mousedown.prevent="formatBlock('h1')" title="Titre 1">H1</button>
              <button class="nb-tool nb-tool-text" @mousedown.prevent="formatBlock('h2')" title="Titre 2">H2</button>
              <button class="nb-tool nb-tool-text" @mousedown.prevent="formatBlock('h3')" title="Titre 3">H3</button>
              <button class="nb-tool nb-tool-text" @mousedown.prevent="formatBlock('p')"  title="Paragraphe">P</button>
            </div>

            <div class="nb-toolbar-divider" />

            <div class="nb-toolbar-group">
              <button class="nb-tool" @mousedown.prevent="format('insertUnorderedList')" title="Liste a puces">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                  <circle cx="3" cy="4.5" r="1.2" fill="currentColor"/>
                  <circle cx="3" cy="8.5" r="1.2" fill="currentColor"/>
                  <circle cx="3" cy="12.5" r="1.2" fill="currentColor"/>
                  <line x1="6" y1="4.5" x2="14" y2="4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <line x1="6" y1="8.5" x2="14" y2="8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <line x1="6" y1="12.5" x2="12" y2="12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
              <button class="nb-tool" @mousedown.prevent="format('insertOrderedList')" title="Liste numerotee">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                  <path d="M2 3h1.5v3.5M2 6.5h2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M2 9.5h2l-2 2h2M6 4.5h8M6 8.5h8M6 12.5h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
              </button>
              <button class="nb-tool" @mousedown.prevent="formatBlock('blockquote')" title="Citation">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                  <rect x="2" y="3" width="2.5" height="10" rx="1.2" fill="currentColor" opacity="0.7"/>
                  <line x1="6.5" y1="5.5" x2="14" y2="5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  <line x1="6.5" y1="8.5" x2="14" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  <line x1="6.5" y1="11.5" x2="11" y2="11.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
              </button>
              <button class="nb-tool" @mousedown.prevent="insertHr" title="Separateur">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                  <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  <circle cx="5" cy="8" r="1.2" fill="currentColor"/>
                  <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
                  <circle cx="11" cy="8" r="1.2" fill="currentColor"/>
                </svg>
              </button>
            </div>

            <div class="nb-toolbar-divider" />

            <!-- Color buttons -->
            <div class="nb-toolbar-group">
              <!-- Text Color -->
              <div class="nb-color-wrap" @click.stop>
                <button class="nb-tool nb-color-btn" @mousedown.prevent="togglePopup('text')" title="Couleur du texte">
                  <span class="nb-color-icon">
                    <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                      <path d="M8 2L11.5 11H10l-1-2.5H7L6 11H4.5L8 2z" fill="currentColor"/>
                    </svg>
                    <span class="nb-color-bar" :style="{ background: activeTextColor || 'rgba(255,255,255,0.20)' }" />
                  </span>
                </button>
                <Transition name="nb-popup">
                  <div v-if="openPopup === 'text'" class="nb-color-popup">
                    <div class="nb-color-popup-label">Couleur du texte</div>
                    <div class="nb-color-grid">
                      <button class="nb-swatch is-none" @mousedown.prevent="applyTextColor('')" title="Par defaut">
                        <svg viewBox="0 0 14 14" fill="none" width="11" height="11"><path d="M2 2l10 10M12 2L2 12" stroke="#ef4444" stroke-width="1.6" stroke-linecap="round"/></svg>
                      </button>
                      <button
                        v-for="c in TEXT_COLORS" :key="c.value"
                        class="nb-swatch"
                        :class="{ active: activeTextColor === c.value }"
                        :style="{ background: c.value }"
                        :title="c.label"
                        @mousedown.prevent="applyTextColor(c.value)"
                      />
                    </div>
                  </div>
                </Transition>
              </div>

              <!-- Highlight Color -->
              <div class="nb-color-wrap" @click.stop>
                <button class="nb-tool nb-color-btn" @mousedown.prevent="togglePopup('highlight')" title="Couleur de fond">
                  <span class="nb-color-icon">
                    <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                      <rect x="3" y="3" width="10" height="8" rx="1.5" fill="currentColor" opacity="0.30"/>
                      <rect x="3" y="3" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
                    </svg>
                    <span class="nb-color-bar" :style="{ background: activeHighlightColor || 'rgba(255,255,255,0.20)' }" />
                  </span>
                </button>
                <Transition name="nb-popup">
                  <div v-if="openPopup === 'highlight'" class="nb-color-popup">
                    <div class="nb-color-popup-label">Couleur de fond</div>
                    <div class="nb-color-grid">
                      <button class="nb-swatch is-none" @mousedown.prevent="applyHighlight('')" title="Aucun fond">
                        <svg viewBox="0 0 14 14" fill="none" width="11" height="11"><path d="M2 2l10 10M12 2L2 12" stroke="#ef4444" stroke-width="1.6" stroke-linecap="round"/></svg>
                      </button>
                      <button
                        v-for="c in HIGHLIGHT_COLORS" :key="c.value"
                        class="nb-swatch"
                        :class="{ active: activeHighlightColor === c.value }"
                        :style="{ background: c.value }"
                        :title="c.label"
                        @mousedown.prevent="applyHighlight(c.value)"
                      />
                    </div>
                  </div>
                </Transition>
              </div>
            </div>

            <div class="nb-toolbar-divider" />

            <div class="nb-toolbar-group">
              <button class="nb-tool" @mousedown.prevent="clearFormatting" title="Effacer la mise en forme">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                  <path d="M10 3l-7 7 3 3 7-7-3-3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
                  <line x1="3" y1="13" x2="11" y2="13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  <line x1="11" y1="5.5" x2="13.5" y2="3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Editor -->
          <div class="nb-editor-wrap">
            <div
              ref="editorRef"
              class="nb-editor"
              contenteditable="true"
              data-placeholder="Commencez a ecrire..."
              @input="onInput"
              @keydown="onKeydown"
              @mouseup="updateActiveFormats"
              @keyup="updateActiveFormats"
              @click="closeAllPopups"
            />
          </div>

          <!-- Footer -->
          <div class="nb-footer">
            <span class="nb-word-count">{{ wordCount }} mot{{ wordCount !== 1 ? 's' : '' }}</span>
            <span class="nb-shortcut-hint">{{ isMac ? 'Cmd' : 'Ctrl' }}+M pour fermer</span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface NotebookPage { id: string; title: string; content: string }

const authStore = useAuthStore()
const isOpen = ref(false)
const editorRef = ref<HTMLDivElement | null>(null)
const renameInputRef = ref<HTMLInputElement | null>(null)
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const wordCount = ref(0)
const isMac = ref(false)
const openPopup = ref<'text' | 'highlight' | null>(null)
const activeTextColor = ref('')
const activeHighlightColor = ref('')
const renamingPageId = ref<string | null>(null)

// Pages state
const pages = ref<NotebookPage[]>([{ id: '1', title: 'Page 1', content: '' }])
const currentPageId = ref('1')
let loaded = false

const currentPage = computed(() => pages.value.find(p => p.id === currentPageId.value) ?? pages.value[0])

// Color palettes
const TEXT_COLORS = [
  { label: 'Gris',       value: '#94a3b8' },
  { label: 'Brun',       value: '#b07d62' },
  { label: 'Orange',     value: '#f97316' },
  { label: 'Jaune',      value: '#eab308' },
  { label: 'Vert',       value: '#22c55e' },
  { label: 'Bleu',       value: '#60a5fa' },
  { label: 'Violet',     value: '#c084fc' },
  { label: 'Rose',       value: '#f472b6' },
  { label: 'Rouge clair',value: '#f87171' },
  { label: 'Rouge vif',  value: '#dc2626' },
  { label: 'Blanc',      value: '#f5f0ff' },
  { label: 'Noir',       value: '#0f0a1a' },
]

const HIGHLIGHT_COLORS = [
  { label: 'Gris',       value: 'rgba(148,163,184,0.28)' },
  { label: 'Brun',       value: 'rgba(176,125,98,0.30)'  },
  { label: 'Orange',     value: 'rgba(249,115,22,0.28)'  },
  { label: 'Jaune',      value: 'rgba(234,179,8,0.35)'   },
  { label: 'Vert',       value: 'rgba(34,197,94,0.28)'   },
  { label: 'Bleu',       value: 'rgba(96,165,250,0.28)'  },
  { label: 'Violet',     value: 'rgba(192,132,252,0.30)' },
  { label: 'Rose',       value: 'rgba(244,114,182,0.28)' },
  { label: 'Rouge clair',value: 'rgba(248,113,113,0.28)' },
  { label: 'Rouge vif',  value: 'rgba(220,38,38,0.35)'   },
  { label: 'Ambre',      value: 'rgba(251,191,36,0.32)'  },
  { label: 'Noir',       value: 'rgba(0,0,0,0.60)'       },
]

const activeFormats = reactive({ bold: false, italic: false, underline: false, strikeThrough: false })
const userName = computed(() => authStore.user?.username ?? 'Narrateur')

const saveStatusText = computed(() => {
  if (saveStatus.value === 'saved') return 'Sauvegarde v'
  if (saveStatus.value === 'error') return 'Erreur'
  return ''
})

// Load
async function loadContent() {
  if (!loaded) {
    loaded = true
    try {
      const data = await $fetch<{ pages: NotebookPage[] }>('/api/notebook')
      if (data.pages?.length) {
        pages.value = data.pages
        currentPageId.value = data.pages[0].id
      }
    } catch { /* silent */ }
  }
  await nextTick()
  if (editorRef.value) {
    editorRef.value.innerHTML = currentPage.value.content
    updateWordCount()
  }
}

// Save
let saveTimer: ReturnType<typeof setTimeout> | null = null

async function saveNow() {
  saveStatus.value = 'saving'
  try {
    await $fetch('/api/notebook', { method: 'PATCH', body: { pages: pages.value } })
    saveStatus.value = 'saved'
    setTimeout(() => { if (saveStatus.value === 'saved') saveStatus.value = 'idle' }, 2500)
  } catch {
    saveStatus.value = 'error'
    setTimeout(() => { if (saveStatus.value === 'error') saveStatus.value = 'idle' }, 4000)
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveNow, 600)
}

// Editor events
function onInput() {
  if (editorRef.value) {
    const page = pages.value.find(p => p.id === currentPageId.value)
    if (page) page.content = editorRef.value.innerHTML
  }
  updateWordCount()
  scheduleSave()
}

function updateWordCount() {
  const text = editorRef.value?.innerText ?? ''
  wordCount.value = text.trim().split(/\s+/).filter(w => w.length > 0).length
}

function updateActiveFormats() {
  activeFormats.bold = document.queryCommandState('bold')
  activeFormats.italic = document.queryCommandState('italic')
  activeFormats.underline = document.queryCommandState('underline')
  activeFormats.strikeThrough = document.queryCommandState('strikeThrough')
}

// Formatting
function format(cmd: string) {
  editorRef.value?.focus()
  document.execCommand(cmd, false)
  syncCurrentPage()
  scheduleSave()
  updateActiveFormats()
}

function formatBlock(tag: string) {
  editorRef.value?.focus()
  document.execCommand('formatBlock', false, `<${tag}>`)
  syncCurrentPage()
  scheduleSave()
}

function clearFormatting() {
  editorRef.value?.focus()
  document.execCommand('removeFormat', false)
  document.execCommand('formatBlock', false, '<p>')
  syncCurrentPage()
  scheduleSave()
}

function insertHr() {
  editorRef.value?.focus()
  document.execCommand('insertHTML', false, '<hr/><p><br></p>')
  syncCurrentPage()
  scheduleSave()
}

function syncCurrentPage() {
  if (!editorRef.value) return
  const page = pages.value.find(p => p.id === currentPageId.value)
  if (page) page.content = editorRef.value.innerHTML
}

// Color commands
function togglePopup(which: 'text' | 'highlight') {
  openPopup.value = openPopup.value === which ? null : which
}

function closeAllPopups() {
  openPopup.value = null
}

function applyTextColor(color: string) {
  activeTextColor.value = color
  editorRef.value?.focus()
  if (color) {
    document.execCommand('foreColor', false, color)
  } else {
    document.execCommand('removeFormat', false)
  }
  openPopup.value = null
  syncCurrentPage()
  scheduleSave()
}

function applyHighlight(color: string) {
  activeHighlightColor.value = color
  editorRef.value?.focus()
  if (color) {
    document.execCommand('hiliteColor', false, color)
  } else {
    document.execCommand('hiliteColor', false, 'transparent')
  }
  openPopup.value = null
  syncCurrentPage()
  scheduleSave()
}

// Keyboard shortcuts in editor
function onKeydown(e: KeyboardEvent) {
  updateActiveFormats()
  if (e.key === 'Tab') {
    e.preventDefault()
    document.execCommand(e.shiftKey ? 'outdent' : 'indent', false)
    syncCurrentPage(); scheduleSave()
    return
  }
  if (e.key === ' ') {
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)
    const node = range.startContainer
    if (node.nodeType !== Node.TEXT_NODE) return
    const before = (node.textContent ?? '').slice(0, range.startOffset)
    const block = (node as Text).parentElement?.closest('h1,h2,h3,h4,h5,h6,p,div')
    if (before === '#') {
      e.preventDefault()
      if (block) (block as HTMLElement).innerText = ''
      document.execCommand('formatBlock', false, '<h1>')
      syncCurrentPage(); scheduleSave()
    } else if (before === '##') {
      e.preventDefault()
      if (block) (block as HTMLElement).innerText = ''
      document.execCommand('formatBlock', false, '<h2>')
      syncCurrentPage(); scheduleSave()
    } else if (before === '###') {
      e.preventDefault()
      if (block) (block as HTMLElement).innerText = ''
      document.execCommand('formatBlock', false, '<h3>')
      syncCurrentPage(); scheduleSave()
    } else if (before === '-' || before === '*') {
      e.preventDefault()
      const li = (node as Text).parentElement?.closest('p,div,li')
      if (li) (li as HTMLElement).innerText = ''
      document.execCommand('insertUnorderedList', false)
      syncCurrentPage(); scheduleSave()
    }
  }
}

// Pages management
function addPage() {
  const id = Date.now().toString()
  pages.value.push({ id, title: `Page ${pages.value.length + 1}`, content: '' })
  switchPage(id)
  scheduleSave()
}

async function switchPage(id: string) {
  syncCurrentPage()
  currentPageId.value = id
  await nextTick()
  if (editorRef.value) {
    editorRef.value.innerHTML = currentPage.value.content
    editorRef.value.focus()
    updateWordCount()
  }
}

function deletePage(id: string) {
  if (pages.value.length <= 1) return
  const idx = pages.value.findIndex(p => p.id === id)
  pages.value.splice(idx, 1)
  if (currentPageId.value === id) {
    switchPage(pages.value[Math.max(0, idx - 1)].id)
  }
  scheduleSave()
}

function startRename(id: string, currentTitle: string) {
  renamingPageId.value = id
  nextTick(() => {
    const input = renameInputRef.value
    if (input) { input.value = currentTitle; input.focus(); input.select() }
  })
}

function commitRename(id: string, value: string) {
  const page = pages.value.find(p => p.id === id)
  if (page) page.title = value.trim() || 'Sans titre'
  renamingPageId.value = null
  scheduleSave()
}

// Open/close
async function open() {
  isOpen.value = true
  await loadContent()
  editorRef.value?.focus()
}

function close() {
  syncCurrentPage()
  isOpen.value = false
  openPopup.value = null
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; saveNow() }
}

function toggle() {
  if (isOpen.value) close(); else open()
}

// Global Ctrl+M shortcut
function onGlobalKeydown(e: KeyboardEvent) {
  const mod = isMac.value ? e.metaKey : e.ctrlKey
  if (mod && !e.shiftKey && e.key === 'm') { e.preventDefault(); toggle() }
}

onMounted(() => {
  isMac.value = navigator.platform.toUpperCase().includes('MAC')
  window.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  if (saveTimer) clearTimeout(saveTimer)
})
</script>

<style lang="scss" scoped>
@use '~/assets/scss/variables' as *;

// Trigger
.nb-trigger-wrap {
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1000;
  pointer-events: none;
}

.nb-trigger {
  pointer-events: all;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 14px 10px;
  background:
    radial-gradient(ellipse 100% 60% at 0% 50%, rgba($violet-600, 0.30) 0%, transparent 70%),
    rgba(20, 8, 44, 0.85);
  backdrop-filter: blur(14px);
  border: 1px solid rgba($violet-400, 0.32);
  border-left: none;
  border-radius: 0 12px 12px 0;
  color: rgba($violet-300, 0.75);
  cursor: pointer;
  transition: all 280ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 4px 0 24px rgba($violet-800, 0.4);

  &:hover, &.is-open {
    color: $violet-300;
    background:
      radial-gradient(ellipse 100% 60% at 0% 50%, rgba($violet-500, 0.42) 0%, transparent 70%),
      rgba(28, 10, 58, 0.92);
    border-color: rgba($violet-400, 0.55);
    transform: translateX(3px);
  }

  &.is-open {
    color: $neutral-amber;
    border-color: rgba($neutral-amber, 0.40);
  }
}

.nb-trigger-icon { width: 20px; height: 20px; }

.nb-trigger-label {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  writing-mode: vertical-rl;
  opacity: 0.7;
}

// Backdrop
.nb-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.40);
  backdrop-filter: blur(2px);
  z-index: 1001;
}
.nb-backdrop-enter-active { transition: opacity 240ms ease; }
.nb-backdrop-leave-active { transition: opacity 200ms ease; }
.nb-backdrop-enter-from, .nb-backdrop-leave-to { opacity: 0; }

// Panel
.nb-panel {
  position: fixed;
  left: 0; top: 0; bottom: 0;
  width: 680px;
  max-width: 98vw;
  z-index: 1002;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(ellipse 90% 40% at 50% -2%, rgba($violet-600, 0.24) 0%, transparent 60%),
    rgba(14, 5, 32, 0.97);
  backdrop-filter: blur(32px) saturate(1.5);
  border-right: 1px solid rgba($violet-400, 0.28);
  box-shadow: 12px 0 60px rgba(0, 0, 0, 0.55);

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, rgba($violet-400, 0.60), rgba($neutral-amber, 0.40), rgba($violet-400, 0.20));
    z-index: 1;
    pointer-events: none;
  }
}

.nb-slide-enter-active { transition: transform 300ms cubic-bezier(0.34, 1.1, 0.64, 1); }
.nb-slide-leave-active { transition: transform 220ms cubic-bezier(0.4, 0, 1, 1); }
.nb-slide-enter-from, .nb-slide-leave-to { transform: translateX(-100%); }

// Header
.nb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid rgba($violet-500, 0.15);
  flex-shrink: 0;
}
.nb-header-left  { display: flex; align-items: center; gap: 12px; }
.nb-header-icon  { width: 20px; height: 20px; color: $violet-300; opacity: 0.85; flex-shrink: 0; }
.nb-header-text  { display: flex; flex-direction: column; gap: 2px; }
.nb-title {
  font-family: $font-display;
  font-size: 1rem;
  font-weight: 600;
  color: $text-primary;
  margin: 0;
}
.nb-user-badge {
  font-size: 0.67rem;
  font-weight: 600;
  color: rgba($neutral-amber, 0.70);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.nb-header-right { display: flex; align-items: center; gap: 10px; }

.nb-save-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.70rem;
  font-weight: 600;
  &.is-saved { color: rgba($village-green, 0.85); }
  &.is-error  { color: $wolf-red; }
}
.nb-status-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
  .is-saved & { background: $village-green; }
  .is-error  & { background: $wolf-red; }
}

.nb-close-btn {
  width: 28px; height: 28px;
  border-radius: 7px;
  background: transparent;
  border: 1px solid rgba($violet-500, 0.20);
  color: $text-muted;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 180ms ease;
  &:hover { background: rgba($wolf-red, 0.15); border-color: rgba($wolf-red, 0.40); color: $wolf-red; }
}

// Body layout
.nb-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

// Pages sidebar
.nb-pages {
  width: 120px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba($violet-500, 0.14);
  background: rgba(10, 3, 24, 0.45);
  overflow: hidden;
  z-index: 0;
}

.nb-pages-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 8px;
  flex-shrink: 0;
}

.nb-pages-label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: rgba($text-muted, 0.65);
}

.nb-page-add {
  width: 20px; height: 20px;
  border-radius: 5px;
  background: transparent;
  border: 1px solid rgba($violet-500, 0.25);
  color: rgba($violet-300, 0.60);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 150ms ease;
  &:hover { background: rgba($violet-500, 0.20); color: $violet-300; border-color: rgba($violet-400, 0.45); }
}

.nb-pages-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 6px;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba($violet-500, 0.25); border-radius: 3px; }
}

.nb-page-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 8px;
  border-radius: 7px;
  cursor: pointer;
  transition: all 150ms ease;
  margin-bottom: 2px;
  min-height: 32px;
  border: 1px solid transparent;

  &:hover {
    background: rgba($violet-500, 0.14);
    .nb-page-delete { opacity: 1; }
  }

  &.is-active {
    background: rgba($violet-500, 0.22);
    border-color: rgba($violet-400, 0.28);
    .nb-page-title { color: $violet-200; font-weight: 600; }
  }
}

.nb-page-title {
  flex: 1;
  font-size: 0.76rem;
  color: rgba($text-secondary, 0.75);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
}

.nb-page-rename {
  flex: 1;
  font-size: 0.76rem;
  color: $text-primary;
  background: rgba($violet-800, 0.40);
  border: 1px solid rgba($violet-400, 0.50);
  border-radius: 4px;
  padding: 1px 5px;
  outline: none;
  min-width: 0;
  width: 0;
}

.nb-page-delete {
  opacity: 0;
  flex-shrink: 0;
  width: 18px; height: 18px;
  border-radius: 4px;
  background: transparent;
  border: none;
  color: rgba($wolf-red, 0.55);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 130ms ease;
  &:hover { color: $wolf-red; background: rgba($wolf-red, 0.12); opacity: 1; }
}

// Main area
.nb-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  position: relative;
  z-index: 1;
}

// Toolbar
.nb-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 7px 10px;
  border-bottom: 1px solid rgba($violet-500, 0.12);
  background: rgba($violet-900, 0.25);
  flex-shrink: 0;
  flex-wrap: wrap;
  row-gap: 4px;
}

.nb-toolbar-group { display: flex; align-items: center; gap: 2px; }

.nb-toolbar-divider {
  width: 1px; height: 16px;
  background: rgba($violet-500, 0.22);
  margin: 0 3px;
}

.nb-tool {
  width: 28px; height: 26px;
  border-radius: 5px;
  background: transparent;
  border: 1px solid transparent;
  color: rgba($text-secondary, 0.60);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 140ms ease;
  flex-shrink: 0;

  &:hover {
    background: rgba($violet-500, 0.18);
    border-color: rgba($violet-400, 0.28);
    color: $violet-300;
  }

  &.active {
    background: rgba($violet-500, 0.26);
    border-color: rgba($violet-400, 0.48);
    color: $violet-200;
  }
}

.nb-tool-text {
  font-size: 0.68rem;
  font-weight: 800;
  font-family: $font-display;
}

// Color buttons
.nb-color-wrap { position: relative; }
.nb-color-btn { width: 28px !important; }

.nb-color-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.nb-color-bar {
  display: block;
  width: 14px;
  height: 3px;
  border-radius: 2px;
}

.nb-color-popup {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 1100;
  background: rgba(18, 6, 38, 0.97);
  border: 1px solid rgba($violet-400, 0.30);
  border-radius: 10px;
  padding: 10px;
  min-width: 148px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.55);
}

.nb-color-popup-label {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba($text-muted, 0.55);
  margin-bottom: 8px;
}

.nb-color-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 5px;
}

.nb-swatch {
  width: 22px; height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 130ms ease;
  display: flex; align-items: center; justify-content: center;

  &:hover { transform: scale(1.18); border-color: rgba(255,255,255,0.35); }
  &.active { border-color: white; }

  &.is-none {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
  }
}

.nb-popup-enter-active { transition: opacity 120ms ease, transform 120ms ease; }
.nb-popup-leave-active { transition: opacity 100ms ease; }
.nb-popup-enter-from  { opacity: 0; transform: translateX(-50%) translateY(-4px); }
.nb-popup-leave-to    { opacity: 0; }

// Editor
.nb-editor-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 20px 22px 14px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba($violet-500, 0.25); border-radius: 3px; }
}

.nb-editor {
  min-height: 100%;
  outline: none;
  font-family: $font-body;
  font-size: 0.91rem;
  line-height: 1.75;
  color: $text-secondary;
  word-break: break-word;

  &:empty::before {
    content: attr(data-placeholder);
    color: rgba($text-muted, 0.35);
    font-style: italic;
    pointer-events: none;
    display: block;
  }

  :deep(h1) {
    font-family: $font-display;
    font-size: 1.60rem;
    font-weight: 700;
    color: $text-primary;
    margin: 0.6em 0 0.3em;
    line-height: 1.2;
    border-bottom: 1px solid rgba($violet-500, 0.20);
    padding-bottom: 0.3em;
  }
  :deep(h2) {
    font-family: $font-display;
    font-size: 1.22rem;
    font-weight: 700;
    color: rgba($text-primary, 0.92);
    margin: 0.7em 0 0.3em;
  }
  :deep(h3) {
    font-family: $font-display;
    font-size: 1.02rem;
    font-weight: 600;
    color: rgba($violet-300, 0.90);
    margin: 0.7em 0 0.25em;
  }
  :deep(p) { margin: 0.2em 0; &:first-child { margin-top: 0; } }
  :deep(strong), :deep(b) { color: $text-primary; font-weight: 700; }
  :deep(em), :deep(i) { color: rgba($violet-200, 0.85); }
  :deep(u) { text-decoration-color: rgba($neutral-amber, 0.50); }
  :deep(s) { color: $text-muted; opacity: 0.6; }
  :deep(ul) {
    margin: 0.3em 0 0.3em 1.2em; padding: 0;
    li {
      list-style-type: none; position: relative; margin: 0.15em 0;
      &::before { content: '◆'; position: absolute; left: -1.2em; font-size: 0.5em; top: 0.45em; color: rgba($violet-400, 0.65); }
    }
  }
  :deep(ol) { margin: 0.3em 0 0.3em 1.4em; padding: 0; li { margin: 0.15em 0; } }
  :deep(blockquote) {
    margin: 0.6em 0;
    padding: 0.5em 1em;
    border-left: 3px solid rgba($violet-400, 0.50);
    background: rgba($violet-900, 0.25);
    border-radius: 0 6px 6px 0;
    color: rgba($text-secondary, 0.80);
    font-style: italic;
  }
  :deep(hr) {
    border: none; height: 1px;
    background: linear-gradient(90deg, transparent, rgba($violet-400, 0.40), transparent);
    margin: 1.2em 0;
  }
}

// Footer
.nb-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 18px;
  border-top: 1px solid rgba($violet-500, 0.10);
  background: rgba($violet-900, 0.18);
  flex-shrink: 0;
}

.nb-word-count    { font-size: 0.68rem; color: $text-muted; }
.nb-shortcut-hint { font-size: 0.66rem; color: rgba($text-muted, 0.45); }
</style>
