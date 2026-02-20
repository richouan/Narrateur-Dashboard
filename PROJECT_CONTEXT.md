# Loup-Garou Online - Project Context & Documentation

**Last Updated:** February 19, 2026  
**Status:** Active Development  
**Tech Stack:** Nuxt 3, Vue 3 Composition API, TypeScript, MongoDB, Socket.io, Discord Bot Integration

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Recent Changes & Fixes](#recent-changes--fixes)
4. [Key Features](#key-features)
5. [File Structure](#file-structure)
6. [Important Code Locations](#important-code-locations)
7. [Design System & Identity](#design-system--identity)
8. [State Management](#state-management)
9. [API Routes](#api-routes)
10. [Known Issues & Solutions](#known-issues--solutions)
11. [Development Patterns](#development-patterns)
12. [Next Steps & TODOs](#next-steps--todos)

---

## 🎮 Project Overview

**Loup-Garou Online** is a web-based narrator dashboard for managing Werewolf (Loup-Garou) games with Discord bot integration. The narrator uses this interface to manage players, assign roles, and control game phases while players interact via Discord.

### Core Concept
- **Narrator Dashboard:** Web interface for game management
- **Discord Integration:** Bot announces phases and manages player interactions
- **Real-time Updates:** WebSocket connections for live game state
- **Phase Management:** Complex game flow with multiple phases (SETUP → CONFIRMATION → CAPTAIN phases → NIGHT/DAY cycles → END)

---

## 🏗️ Architecture

### Frontend (Nuxt 3 App)
- **Framework:** Nuxt 3 with Vue 3 Composition API
- **Styling:** SCSS with custom variables, glassmorphism design
- **State:** Pinia stores (auth, game)
- **Real-time:** WebSocket composable for live updates
- **Notifications:** Custom toast system with confirmation modals

### Backend (Nuxt Server)
- **API:** Nuxt server routes (file-based routing)
- **Database:** MongoDB with Mongoose models
- **Auth:** JWT-based authentication
- **Discord:** Discord.js bot integration
- **WebSocket:** Socket.io for real-time game updates

### Database Models
- **User:** Narrator accounts (email, password hash, isOwner flag)
- **Game:** Game state, players, roles, logs, phase tracking
- **Role:** Role definitions (name, team, description, icon)

---

## 🔧 Recent Changes & Fixes

### Phase Transition Performance Fix (Latest)
**Problem:** 1-3 second delay when clicking "Commencer" (SETUP→CONFIRMATION) or "Edit" (CONFIRMATION→SETUP) with no visual feedback.

**Root Cause:**
1. Non-existent `saveRoleAssignments()` function was being called
2. Bot status check (`await checkBotStatus()`) was blocking UI on route changes
3. No loading states or feedback during transitions

**Solution Implemented:**
1. ✅ Added `isTransitioning` reactive ref to track phase changes
2. ✅ Removed broken `saveRoleAssignments()` call, replaced with proper auto-save logic
3. ✅ Made bot status check non-blocking (removed `await`)
4. ✅ Added rotating spinner animations during transitions (matching site identity)
5. ✅ Disabled buttons during transitions to prevent double-clicks
6. ✅ Added loading text: "Chargement..." / "Lancement..."
7. ✅ Enhanced button states with pulse-glow animation during loading
8. ✅ Changed `:hover` to `:hover:not(:disabled)` to prevent hover effects during loading
9. ✅ Set `cursor: wait` and `opacity: 1` for disabled state to show active loading
10. ✅ Added Vue `<Transition>` components around SETUP and CONFIRMATION phases
11. ✅ Implemented smooth fade & blur animations matching page transitions (0.3s cubic-bezier)

**Files Modified:**
- `app/pages/game/[id].vue` (lines 40-42, 377-380, 492-493, 700-703, 849-857, 1178-1210, 1928-1948, 270-318, 458-478, 2398-2444, 4650-4685)

### Avatar Size Resolution (Previous Sprint)
**Problem:** Multiple avatar components using same CSS class caused linking issues.

**Solution:**
- Dashboard avatars: `.player-avatar-dashboard` → 32px
- Lobby setup cards: `.player-avatar-mini` → 75px
- Game players panel: `.player-avatar` → 52px
- Confirmation phase: `.player-avatar-small` → 26px

### Bot State Persistence Fix
**Problem:** Bot appeared offline when navigating back to SETUP phase.

**Solution:** Added route watcher to refresh bot status on navigation:
```typescript
watch(() => route.params.id, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    await gameStore.fetchGame(newId as string)
    if (gameStore.currentPhase === 'SETUP') {
      checkBotStatus() // Non-blocking
    }
  }
})
```

### Copy Role Feature
**Feature:** Click on player in confirmation phase to copy their role name to clipboard.
**Location:** `app/pages/game/[id].vue` - `copyRoleToClipboard()` function

---

## ✨ Key Features

### Game Setup Phase (SETUP)
- **Discord Voice Channel Scanning:** Bot scans voice channels and imports players
- **Role Selection:** Grimoire-style role picker with team-based categorization
- **Player Management:** Add/remove players, assign numbers, assign roles
- **Avatar System:** Discord avatars or fallback initials
- **Random Assignment:** Two modes:
  - **Rest:** Randomize only unassigned roles (respects manual assignments)
  - **Full:** Completely re-randomize all roles
- **Deck Preview:** Visual display of selected roles with team counters
- **Validation:** Real-time validation of player count vs role count
- **Auto-save:** Debounced saves (2s for roles, 2.5s for player assignments)

### Confirmation Phase (CONFIRMATION)
- **3-Column Team Layout:** Wolves | Villagers | Neutral
- **Team Bubbles:** Color-coded with team icons
- **Player Details:** Number, avatar, name, role in each team
- **Actions:** Edit (back to SETUP) or Start (to FIRST_NIGHT)
- **Copy Role:** Click player to copy role name

### Active Game Phases
- **CAPTAIN_APPLICATION:** Players apply for captain
- **CAPTAIN_SPIN:** Wheel spin for captain selection
- **CAPTAIN_VOTE:** Vote for captain
- **FIRST_NIGHT:** Initial night phase
- **DAY/NIGHT Cycles:** Alternating phases with vote mechanics
- **END:** Game completion with story export

### Discord Bot Integration
- **Status Check:** Real-time bot online/offline indicator
- **Voice Scan:** Import players from voice channel
- **Phase Announcements:** Bot announces phase changes in Discord
- **Auto-refresh:** Bot status checks every 30 seconds during setup

### Real-time Features
- **WebSocket Connection:** Live game state updates
- **Connection Indicator:** Green dot when connected
- **Broadcast Updates:** Phase transitions broadcast to all connected clients

---

## 📁 File Structure

```
app/
├── assets/scss/
│   ├── variables.scss          # Color palette, spacing, mixins
│   └── main.scss               # Global styles, animations
├── components/
│   └── NotificationContainer.vue  # Toasts + confirmation modals
├── composables/
│   ├── useNotification.ts      # Toast & modal system
│   └── useWebSocket.ts         # Socket.io connection
├── layouts/
│   ├── default.vue             # Standard layout with header
│   └── game.vue                # Game-specific layout (no header)
├── pages/
│   ├── index.vue               # Loading splash screen
│   ├── login.vue               # Login page
│   ├── dashboard.vue           # Game list + create game
│   ├── game/[id].vue           # Main game interface (4666 lines!)
│   ├── profile.vue             # User profile management
│   └── settings.vue            # App settings
├── stores/
│   ├── auth.ts                 # Authentication state
│   └── game.ts                 # Game state management
└── app.vue                     # Root component with particles

server/
├── api/
│   ├── auth/                   # Login, register, me
│   ├── games/                  # CRUD operations
│   │   ├── index.get.ts        # List games
│   │   ├── index.post.ts       # Create game
│   │   ├── [id].get.ts         # Get game
│   │   ├── [id]/
│   │   │   ├── transition.post.ts    # Phase transitions
│   │   │   ├── players.put.ts        # Update players
│   │   │   ├── selected-roles.put.ts # Update role selection
│   │   │   └── ...
│   ├── roles/                  # Role management
│   ├── discord/                # Bot integration
│   │   ├── state.get.ts        # Bot status check
│   │   └── scan-voice.post.ts  # Voice channel scan
│   └── health.get.ts           # Health check endpoint
├── models/
│   ├── User.ts                 # User schema
│   ├── Game.ts                 # Game schema (2978+ lines)
│   └── Role.ts                 # Role schema
├── utils/
│   ├── auth.ts                 # JWT validation
│   ├── game.ts                 # Game helpers
│   ├── discord.ts              # Discord bot client
│   └── websocket.ts            # Socket.io setup
└── plugins/
    └── mongodb.ts              # Database connection
```

---

## 🎯 Important Code Locations

### Game State Management
**File:** `app/stores/game.ts`
- `currentGame`: Active game object
- `games`: List of all games
- `fetchGame(id)`: Fetch single game
- `fetchGames()`: Fetch all games
- `transitionPhase(target)`: Change game phase
- `updatePlayers(players)`: Update player list

### Phase Transitions
**File:** `server/api/games/[id]/transition.post.ts`
- Valid transition map: `VALID_TRANSITIONS`
- Logic prevents invalid phase jumps
- Broadcasts updates via WebSocket

**Valid Transitions:**
```typescript
SETUP: ['CONFIRMATION', 'END']
CONFIRMATION: ['SETUP', 'CAPTAIN_APPLICATION', 'FIRST_NIGHT']
CAPTAIN_APPLICATION: ['CAPTAIN_SPIN', 'CAPTAIN_VOTE', 'END']
CAPTAIN_SPIN: ['CAPTAIN_VOTE', 'END']
CAPTAIN_VOTE: ['FIRST_NIGHT', 'END']
FIRST_NIGHT: ['DAY', 'END']
DAY: ['VOTE', 'NIGHT', 'END']
VOTE: ['DAY', 'NIGHT', 'END']
NIGHT: ['DAY', 'END']
END: ['SETUP']
```

### Auto-save System
**File:** `app/pages/game/[id].vue` (lines 720-780)
- **Role Quantities:** 2s debounce
- **Player Role Assignments:** 2.5s debounce with conflict prevention
- **Manual Assignments Tracking:** 500ms debounce

### Discord Bot
**File:** `server/utils/discord.ts`
- `getDiscordClient()`: Get bot instance
- `checkBotStatus()`: Test bot connectivity
- `scanVoiceChannel()`: Import players from voice
- Phase announcements in game transitions

### WebSocket Broadcasting
**File:** `server/utils/websocket.ts`
- `broadcastGameUpdate(gameId, game)`: Notify all clients
- Used after phase transitions, player updates

---

## 🎨 Design System & Identity

### Visual Identity
- **Theme:** Dark fantasy werewolf aesthetic
- **Glassmorphism:** Frosted glass cards with backdrop blur
- **Gradients:** Violet → Pink color scheme
- **Animations:** Consistent rotating spinners across site
- **Particles:** Ambient floating particles in background

### Color Palette
```scss
// Primary Colors
$violet-600: #7c3aed;
$violet-500: #8b5cf6;
$violet-400: #a78bfa;
$violet-300: #c4b5fd;
$violet-200: #ddd6fe;
$pink-500: #ec4899;
$pink-400: #f472b6;
$pink-300: #f9a8d4;

// Game Colors
$wolf-red: #ef4444;
$village-green: #4ade80;
$lavender: #c4b5fd;

// Text Colors
$text-primary: #d4c6f5;
$text-secondary: #b197e3;
$text-muted: rgba(212, 198, 245, 0.5);

// Background
$bg-primary: #0f0720;
$bg-secondary: #160b2e;
```

### Key Animations
```scss
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 16px rgba($violet-500, 0.2); }
  50% { box-shadow: 0 0 24px rgba($violet-500, 0.3); }
}

@keyframes gentle-glow {
  0%, 100% { filter: drop-shadow(0 0 6px rgba($violet-400, 0.4)); }
  50% { filter: drop-shadow(0 0 12px rgba($pink-400, 0.6)); }
}

@keyframes float-orb {
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(-30px, 20px); }
  66% { transform: translate(20px, -15px); }
}
```

### Loading Spinner (Site-wide Standard)
```scss
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(white, 0.2);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
```

### Glass Card Mixin
```scss
@mixin glass-card {
  background: rgba(20, 20, 35, 0.55);
  border: 1px solid rgba($violet-400, 0.2);
  border-radius: $radius-lg;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

---

## 💾 State Management

### Auth Store (`app/stores/auth.ts`)
```typescript
{
  user: IUser | null,        // Current user object
  loading: boolean,          // Loading state
  
  // Actions
  fetchMe(),                 // Get current user
  login(email, password),    // Login with credentials
  loginWithKey(key),         // Login with narrator key
  logout(),                  // Clear session
  updateProfile(data)        // Update user profile
}
```

### Game Store (`app/stores/game.ts`)
```typescript
{
  games: IGame[],            // All games list
  currentGame: IGame | null, // Active game
  loading: boolean,          // Loading state
  
  // Computed
  currentPhase,              // Current game phase
  playerCount,               // Total players
  alivePlayers,              // Living players
  aliveCount,                // Living player count
  
  // Actions
  fetchGames(),                   // Get all games
  fetchGame(id),                  // Get one game
  createGame(),                   // Create new game
  transitionPhase(target),        // Change phase
  updatePlayers(players),         // Update player list
  submitVotes(day, votes),        // Submit vote results
  submitNightLog(night, actions), // Submit night actions
  addLog(phase, message, type),   // Add game log
  performAction(action, player),  // Perform game action
  getStory()                      // Generate game story
}
```

---

## 🌐 API Routes

### Authentication
- `POST /api/auth/register` - Create user account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/narrateur-key` - Login with shared key
- `GET /api/auth/me` - Get current user

### Games
- `GET /api/games` - List all narrator's games
- `POST /api/games` - Create new game
- `GET /api/games/:id` - Get game by ID
- `POST /api/games/:id/transition` - Change game phase
- `PUT /api/games/:id/players` - Update players
- `PUT /api/games/:id/selected-roles` - Update role selection
- `PUT /api/games/:id/manual-assignments` - Update manual assignment tracking
- `POST /api/games/:id/vote-log` - Submit vote results
- `POST /api/games/:id/night-log` - Submit night actions
- `POST /api/games/:id/action` - Perform game action
- `GET /api/games/:id/story` - Get formatted game story

### Roles
- `GET /api/roles` - Get all available roles
- `POST /api/roles` - Create new role (owner only)
- `PUT /api/roles/:id` - Update role (owner only)
- `DELETE /api/roles/:id` - Delete role (owner only)

### Discord
- `GET /api/discord/state` - Check bot online status
- `POST /api/discord/scan-voice` - Scan voice channel for players

### System
- `GET /api/health` - Health check endpoint

---

## 🐛 Known Issues & Solutions

### Issue: Bot Shows Offline After Edit
**Symptom:** When clicking "Edit" in confirmation phase, bot status shows offline.
**Cause:** Phase watcher didn't restart bot status checking when returning to SETUP phase.
**Solution:** Added `startBotStatusCheck()` call in phase watcher when entering SETUP, and cleanup when leaving SETUP.
**Status:** ✅ FIXED

### Issue: Bot Shows Offline After Navigation
**Symptom:** Navigate away from game → return to game → click "Edit" → bot shows offline even though it's online.
**Cause:** When leaving the page, `onUnmounted` clears bot check interval. When returning directly to CONFIRMATION phase, bot checking never restarts. When clicking "Edit" to go to SETUP, the phase watcher calls `loadSetupData()` but not `startBotStatusCheck()`.
**Solution:** Phase watcher now calls `startBotStatusCheck()` when transitioning into SETUP phase, and clears interval when leaving SETUP.
**Status:** ✅ FIXED

### Issue: Phase Transition Delay
**Symptom:** 1-3 second delay with no feedback when transitioning phases.
**Cause:** Non-existent function call + blocking bot check.
**Solution:** Added loading states with spinner animation.
**Status:** ✅ FIXED

### Issue: Avatar Size Conflicts
**Symptom:** Changing avatar size in one place affected other locations.
**Cause:** Multiple components sharing same CSS class.
**Solution:** Separated into distinct classes per location.
**Status:** ✅ FIXED

### Issue: Duplicate Player Numbers
**Symptom:** Auto-save allowed duplicate player numbers.
**Solution:** Validation computed property `hasDuplicateNumbers`.
**Status:** ✅ FIXED

### Issue: Role Assignment Conflicts (409 errors)
**Symptom:** Auto-save triggers overlapping updates.
**Solution:** Added `isSavingPlayerRoles` flag to prevent concurrent saves.
**Status:** ✅ FIXED

---

## 📐 Development Patterns

### Component Structure
- Use Composition API with `<script setup>`
- TypeScript for type safety
- Props with interfaces
- Emit events for parent communication
- Scoped styles with SCSS

### State Management
- Pinia stores for global state
- Local refs for component state
- Computed properties for derived state
- Watchers for side effects

### API Calls
- Use `$fetch` for API requests
- Error handling with try/catch
- Toast notifications for user feedback
- Loading states during async operations

### Auto-save Pattern
```typescript
watch(data, async (newValue) => {
  if (!gameStore.currentGame) return
  
  // Clear existing timeout
  if (saveTimeout) clearTimeout(saveTimeout)
  
  // Debounce save
  saveTimeout = setTimeout(async () => {
    try {
      await $fetch('/api/endpoint', {
        method: 'PUT',
        body: { data: newValue }
      })
    } catch (error) {
      console.error('Save failed:', error)
    }
  }, 2000) // 2s debounce
}, { deep: true })
```

### Loading States Pattern
```typescript
const isLoading = ref(false)

async function performAction() {
  if (isLoading.value) return // Prevent double-clicks
  
  isLoading.value = true
  try {
    await doSomething()
  } finally {
    isLoading.value = false
  }
}
```

### Notification Pattern
```typescript
import { success, error, warning, info, confirm } from '#imports'

// Toast notifications
success('✅ Action completed!')
error('❌ Something went wrong')
warning('⚠️ Please check this')
info('ℹ️ Here\'s some info')

// Confirmation dialog
const confirmed = await confirm(
  'Are you sure?',
  'Confirm Action'
)
if (confirmed) {
  // Do something
}
```

---

## 🚀 Next Steps & TODOs

### Performance Optimizations
- [ ] Add skeleton loaders during game fetches
- [ ] Implement optimistic UI updates for instant feedback
- [ ] Cache bot status to reduce API calls
- [ ] Lazy load role images

### Feature Enhancements
- [ ] Drag-and-drop role assignment
- [ ] Player search/filter in setup
- [ ] Role probability calculations
- [ ] Game templates (preset role configurations)
- [ ] Multi-language support
- [ ] Dark/light theme toggle
- [ ] Mobile responsive improvements

### Code Quality
- [ ] Extract large components from game/[id].vue (4666 lines!)
- [ ] Add unit tests for critical functions
- [ ] Document complex algorithms
- [ ] Add TypeScript strict mode
- [ ] Improve error boundaries

### Discord Integration
- [ ] Rich embeds for phase announcements
- [ ] Player commands in Discord
- [ ] Role reveal animations
- [ ] Vote collection via Discord reactions

### Future Features
- [ ] Game replay/spectator mode
- [ ] Statistics and analytics
- [ ] Player win/loss tracking
- [ ] Achievement system
- [ ] Tournament mode

---

## 🔑 Key Takeaways for New Context

### Critical Files to Understand
1. **`app/pages/game/[id].vue`** - Main game interface (massive, 4666 lines)
2. **`server/models/Game.ts`** - Game schema and validation
3. **`app/stores/game.ts`** - Game state management
4. **`server/api/games/[id]/transition.post.ts`** - Phase transition logic

### Important Concepts
1. **Phase Flow:** SETUP → CONFIRMATION → Game Phases → END
2. **Auto-save:** Debounced saves prevent API spam
3. **Manual Assignments:** Track which roles were manually assigned vs randomized
4. **Bot Integration:** Discord bot announces phases, scans voice
5. **Real-time:** WebSocket broadcasts keep all clients in sync

### Design Philosophy
1. **Consistent Animations:** Use rotating spinner everywhere
2. **Glassmorphism:** Frosted glass aesthetic throughout
3. **User Feedback:** Always show loading states and notifications
4. **Prevent Errors:** Validate before allowing actions
5. **Auto-save:** Save frequently but debounced

### Common Commands
```bash
# Development
npm run dev

# Build
npm run build

# Type checking
npm run typecheck

# Database
# MongoDB connection string in .env
```

### Environment Variables
```env
MONGODB_URI=mongodb://localhost:27017/loup-garou
JWT_SECRET=your-secret-key
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_BOT_CLIENT_ID=your-client-id
NUXT_PUBLIC_WS_URL=http://localhost:3000
```

---

## 📝 Notes for AI Assistant

### User Preferences
- User wants concise, direct communication
- User expects functional implementations, not just suggestions
- User values consistent visual identity across the site
- User prefers batch operations over sequential changes

### Code Style
- Use TypeScript interfaces
- Prefer Composition API over Options API
- Use SCSS with variables from `assets/scss/variables.scss`
- Follow existing animation patterns
- Always add loading states for async operations

### Common Patterns
- **Spinner:** Standard rotating spinner for all loading states
- **Toast:** Use `success()`, `error()`, `warning()`, `info()` from composables
- **Confirmation:** Use `confirm()` for destructive actions
- **Auto-save:** 2-2.5s debounce, prevent overlapping saves
- **WebSocket:** Broadcast updates after state changes

---

**END OF CONTEXT DOCUMENT**

*This document captures the state of the Loup-Garou Online project as of February 19, 2026. Use this as a reference for understanding the codebase, recent changes, and development patterns.*
