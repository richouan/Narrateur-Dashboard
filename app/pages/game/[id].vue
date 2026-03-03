<template>
  <div class="game-page">
    <NuxtLayout name="game">
      <!-- Night stars (only on the game page, during night phases) -->
      <Transition name="stars-fade">
        <div v-if="isNightPhase" class="night-stars-bg" aria-hidden="true">
          <div class="stars-layer stars-small" />
          <div class="stars-layer stars-medium" />
          <div class="stars-layer stars-large" />
          <div class="night-moon-ambient" />
        </div>
      </Transition>
      <div v-if="loading" class="game-loading">
        <span class="spinner" />
        <p>Chargement de la partie...</p>
      </div>

      <template v-else-if="gameStore.currentGame">
        <!-- Game Ended Banner -->
        <div v-if="gameStore.currentPhase === 'END'" class="game-ended-banner">
          <div class="ended-content">
            <span class="ended-icon">🏁</span>
            <h2 class="ended-title">Partie Terminée</h2>
            <p class="ended-subtitle">Cette partie est terminée le {{ formatDateTime(gameStore.currentGame.endedAt) }}</p>
            <div class="ended-actions">
              <button class="btn-primary" @click="navigateTo('/dashboard')">
                Retour au Dashboard
              </button>
              <button class="btn-ghost" @click="exportStory">
                📖 Exporter l'Histoire
              </button>
            </div>
          </div>
        </div>

        <!-- Phase Banner -->
        <div v-if="!['SETUP', 'CONFIRMATION', 'CAPTAIN_APPLICATION', 'CAPTAIN_VOTE', 'CAPTAIN_SPIN', 'NIGHT', 'FIRST_NIGHT', 'DAY', 'VOTE'].includes(gameStore.currentPhase)" class="phase-banner" :class="phaseClass">
          <Transition name="fade" mode="out-in">
            <div :key="gameStore.currentPhase" class="phase-content">
              <span class="phase-icon">{{ phaseIcon }}</span>
              <h1 class="phase-title">{{ formatPhase(gameStore.currentPhase) }}</h1>
              <span class="phase-info" v-if="gameStore.currentGame.nightNumber">
                {{ gameStore.currentPhase.includes('NIGHT') ? `Nuit ${gameStore.currentGame.nightNumber}` : `Jour ${gameStore.currentGame.dayNumber}` }}
              </span>
            </div>
          </Transition>
        </div>

        <!-- Setup Phase Interface (3-Column Layout) -->
        <Transition :name="phaseTransitionName" mode="out-in">
          <div v-if="gameStore.currentPhase === 'SETUP'" key="setup" class="setup-interface">
            <div class="setup-grid-three">
            <!-- Left Panel: Role Grimoire -->
            <div class="setup-panel-left glass-card">
              <div class="panel-header-setup">
                <h2 class="panel-title-setup">📖 Grimoire des Rôles</h2>
              </div>

              <!-- Role Search -->
              <div class="role-search-container">
                <input
                  v-model="roleSearchQuery"
                  type="text"
                  class="role-search-input"
                  placeholder="🔍 Rechercher un rôle..."
                />
                <button
                  class="btn-clear-roles"
                  @click="clearAllRoles"
                  title="Désélectionner tous les rôles"
                  :disabled="totalRoleCount === 0"
                >
                  🗑️
                </button>
              </div>

              <div class="grimoire-scroll">
                <!-- Wolves -->
                <div class="grimoire-section">
                  <div class="grimoire-header wolf-header">
                    <span class="grimoire-icon">🐺</span>
                    <h3 class="grimoire-title">Loups-Garous</h3>
                  </div>
                  <div class="grimoire-roles">
                    <button
                      v-for="role in getRolesByTeam('WOLF')"
                      :key="role._id"
                      class="role-card-grimoire"
                      :class="{ selected: (roleQuantities[role._id] || 0) > 0, 'non-unique': !role.isUnique }"
                      @click="role.isUnique ? toggleRole(role._id) : incrementRole(role._id)"
                    >
                      <div class="role-card-header">
                        <span class="role-card-name">{{ role.name }}</span>
                        <div v-if="role.isUnique" class="role-check-unique">
                          <span v-if="(roleQuantities[role._id] || 0) > 0" class="role-check">✓</span>
                        </div>
                        <div v-else class="role-quantity-controls">
                          <button class="btn-qty" @click.stop="decrementRole(role._id)" :disabled="!(roleQuantities[role._id] || 0)">−</button>
                          <span class="qty-display">{{ roleQuantities[role._id] || 0 }}</span>
                          <button class="btn-qty" @click.stop="incrementRole(role._id)">+</button>
                        </div>
                      </div>
                      <p class="role-card-desc">{{ role.description || 'Rôle des loups-garous' }}</p>
                    </button>
                  </div>
                </div>

                <!-- Villagers -->
                <div class="grimoire-section">
                  <div class="grimoire-header village-header">
                    <span class="grimoire-icon">🏘️</span>
                    <h3 class="grimoire-title">Villageois</h3>
                  </div>
                  <div class="grimoire-roles">
                    <button
                      v-for="role in getRolesByTeam('VILLAGER')"
                      :key="role._id"
                      class="role-card-grimoire"
                      :class="{ selected: (roleQuantities[role._id] || 0) > 0, 'non-unique': !role.isUnique }"
                      @click="role.isUnique ? toggleRole(role._id) : incrementRole(role._id)"
                    >
                      <div class="role-card-header">
                        <span class="role-card-name">{{ role.name }}</span>
                        <div v-if="role.isUnique" class="role-check-unique">
                          <span v-if="(roleQuantities[role._id] || 0) > 0" class="role-check">✓</span>
                        </div>
                        <div v-else class="role-quantity-controls">
                          <button class="btn-qty" @click.stop="decrementRole(role._id)" :disabled="!(roleQuantities[role._id] || 0)">−</button>
                          <span class="qty-display">{{ roleQuantities[role._id] || 0 }}</span>
                          <button class="btn-qty" @click.stop="incrementRole(role._id)">+</button>
                        </div>
                      </div>
                      <p class="role-card-desc">{{ role.description || 'Rôle du village' }}</p>
                    </button>
                  </div>
                </div>

                <!-- Neutrals -->
                <div class="grimoire-section">
                  <div class="grimoire-header neutral-header">
                    <span class="grimoire-icon">⚖️</span>
                    <h3 class="grimoire-title">Neutres</h3>
                  </div>
                  <div class="grimoire-roles">
                    <button
                      v-for="role in getRolesByTeam('NEUTRAL')"
                      :key="role._id"
                      class="role-card-grimoire"
                      :class="{ selected: (roleQuantities[role._id] || 0) > 0, 'non-unique': !role.isUnique }"
                      @click="role.isUnique ? toggleRole(role._id) : incrementRole(role._id)"
                    >
                      <div class="role-card-header">
                        <span class="role-card-name">{{ role.name }}</span>
                        <div v-if="role.isUnique" class="role-check-unique">
                          <span v-if="(roleQuantities[role._id] || 0) > 0" class="role-check">✓</span>
                        </div>
                        <div v-else class="role-quantity-controls">
                          <button class="btn-qty" @click.stop="decrementRole(role._id)" :disabled="!(roleQuantities[role._id] || 0)">−</button>
                          <span class="qty-display">{{ roleQuantities[role._id] || 0 }}</span>
                          <button class="btn-qty" @click.stop="incrementRole(role._id)">+</button>
                        </div>
                      </div>
                      <p class="role-card-desc">{{ role.description || 'Rôle neutre' }}</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Center Panel: Player Management -->
            <div class="setup-panel-center glass-card">
              <div class="panel-header-with-input">
                <div class="header-left">
                  <h2 class="panel-title-setup">👥 Joueurs</h2>
                  <div class="count-badge player-badge">
                    <span class="badge-value">{{ gameStore.currentGame?.players.length || 0 }}</span>
                  </div>
                </div>
                
                <!-- Smart Player Addition (Inline) -->
                <div class="player-addition-inline">
                  <input
                    ref="smartInputRef"
                    v-model="smartInput"
                    class="input-modern-inline"
                    :placeholder="inputPlaceholder"
                    :disabled="isProcessing"
                    @keyup.enter="handleSmartAdd"
                    @input="updateInputHint"
                  />
                  <button
                    class="btn-add-inline"
                    :disabled="!smartInput.trim() || isProcessing"
                    @click="handleSmartAdd"
                  >
                    <span v-if="isProcessing">⏳</span>
                    <span v-else>+</span>
                  </button>
                </div>
                
                <div class="bot-status-mini">
                  <span class="status-dot-mini" :class="{ online: botAlive }"></span>
                </div>
              </div>
              <div v-if="inputHint" class="input-hint-compact">{{ inputHint }}</div>

              <!-- Players List with Role Assignment -->
              <div class="players-setup-list-compact">
                <div
                  v-for="player in sortedPlayers"
                  :key="player.id"
                  class="player-card-compact"
                >
                  <div class="player-number-wrapper">
                    <button 
                      class="player-number-select"
                      :class="{ 'has-duplicate': player.number && duplicateNumbers.has(player.number) }"
                      @click="openNumberPicker = openNumberPicker === player.id ? null : player.id"
                    >
                      {{ player.number || '#' }}
                    </button>
                    <div v-if="openNumberPicker === player.id" class="number-picker-dropdown">
                      <button 
                        v-for="n in playerCount" 
                        :key="n" 
                        class="number-option"
                        @click="selectPlayerNumber(player.id, n)"
                      >
                        {{ n }}
                      </button>
                    </div>
                  </div>
                  <div class="player-info-compact">
                    <div class="player-avatar-mini" :class="{ 'has-image': player.avatar }">
                      <img v-if="player.avatar" :src="player.avatar" :alt="player.name" class="avatar-image" />
                      <span v-else>{{ player.name.charAt(0).toUpperCase() }}</span>
                    </div>
                    <div class="player-name-compact">
                      {{ player.name }}
                      <span v-if="player.discordId" class="discord-tag">🎮</span>
                    </div>
                  </div>
                  <select
                    v-model="playerRoles[player.id]"
                    class="role-select-compact"
                    :class="{ 'no-role': !playerRoles[player.id] }"
                    @focus="previousPlayerRoles[player.id] = playerRoles[player.id] || ''"
                    @change="assignRole(player.id, playerRoles[player.id] || '')"
                  >
                    <option value="">--</option>
                    <option
                      v-for="entry in expandedDeckRoles"
                      :key="`${entry.roleId}-${entry.index}`"
                      :value="entry.roleId"
                    >
                      {{ entry.name }}
                    </option>
                  </select>
                  <button class="btn-remove-mini" @click="removePlayer(player.id)">✕</button>
                </div>

                <div v-if="!gameStore.currentGame?.players.length" class="empty-state-compact">
                  <span class="empty-icon-compact">👥</span>
                  <p class="empty-text-compact">Ajoutez des joueurs</p>
                </div>
              </div>

              <!-- Start Game Section -->
              <div class="start-game-section">
                <div class="validation-display-inline" :class="validationState.class">
                  <span class="validation-icon">{{ validationState.icon }}</span>
                  <div class="validation-counts-inline">
                    <span class="count-item">{{ playerCount }} joueurs</span>
                    <span class="count-separator">×</span>
                    <span class="count-item">{{ totalRoleCount }} rôles</span>
                  </div>
                  <div class="validation-message">{{ validationState.message }}</div>
                </div>
                <div class="game-action-buttons">
                  <!-- Reset button -->
                  <button
                    class="btn-reset-assignments"
                    @click="clearPlayerAssignments"
                    :disabled="isTransitioning"
                    title="Réinitialiser toutes les assignations"
                  >
                    🔄
                  </button>
                  
                  <!-- Single button that expands to two halves -->
                  <button
                    v-if="!showRandomModes"
                    class="btn-random-single"
                    @click="showRandomModes = true"
                    :disabled="!canRandomAssign || isTransitioning"
                    title="Afficher les options d'assignation aléatoire"
                  >
                    🎲 Aléatoire
                  </button>
                  
                  <!-- Split button with two modes -->
                  <div v-else class="btn-split-random">
                    <button
                      class="btn-random-left"
                      @click="randomAssignRoles('rest')"
                      :disabled="!canRandomAssign || isTransitioning"
                      title="Assigner aléatoirement les rôles non-assignés manuellement"
                    >
                      📋 Rest
                    </button>
                    <button
                      class="btn-random-right"
                      @click="randomAssignRoles('full')"
                      :disabled="!canRandomAssign || isTransitioning"
                      title="Réassigner tous les rôles aléatoirement"
                    >
                      🎲 Full
                    </button>
                  </div>
                  
                  <button
                    class="btn-start-game-inline"
                    :disabled="!canStartGame || isTransitioning"
                    @click="startGame"
                  >
                    <span v-if="!isTransitioning">🎭 Commencer</span>
                    <span v-else class="loading-with-spinner">
                      <span class="spinner"></span>
                      <span>Chargement...</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Right Panel: Selected Deck -->
            <div class="setup-panel-right glass-card">
              <div class="panel-header-setup">
                <div class="header-left">
                  <h2 class="panel-title-setup">🃏 Deck</h2>
                  <div class="count-badge role-badge">
                    <span class="badge-value">{{ totalRoleCount }}</span>
                  </div>
                </div>
                <button class="btn-copy-deck" @click="copyDeck" title="Copier le deck">
                  📋
                </button>
              </div>

              <!-- Selected Roles Log -->
              <div class="deck-log-container">
                <div v-if="totalRoleCount > 0" class="deck-log">
                  <div
                    v-for="(entry, idx) in expandedDeckRoles"
                    :key="`${entry.roleId}-${idx}`"
                    class="deck-log-entry"
                  >
                    <span class="log-number">{{ idx + 1 }}.</span>
                    <div v-if="deckEntryPlayers[idx]" class="log-player-avatar">
                      <img 
                        v-if="deckEntryPlayers[idx].avatar" 
                        :src="deckEntryPlayers[idx].avatar" 
                        :alt="deckEntryPlayers[idx].name"
                        :title="deckEntryPlayers[idx].name"
                        class="log-avatar-image"
                      />
                      <span v-else class="log-avatar-initial" :title="deckEntryPlayers[idx].name">
                        {{ deckEntryPlayers[idx].name.charAt(0).toUpperCase() }}
                      </span>
                    </div>
                    <span class="log-role-name" :class="getRoleTeamClass(entry.roleId)">{{ entry.name }}</span>
                    <button class="btn-remove-role" @click="decrementRole(entry.roleId)">✕</button>
                  </div>
                </div>

                <div v-else class="empty-deck">
                  <span class="empty-deck-icon">🃏</span>
                  <p class="empty-deck-text">Aucun rôle sélectionné</p>
                  <p class="empty-deck-hint">Cliquez sur les rôles du grimoire</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </Transition>

        <!-- Confirmation Phase Interface -->
        <Transition :name="phaseTransitionName" mode="out-in">
          <div v-if="gameStore.currentPhase === 'CONFIRMATION'" key="confirmation" class="confirmation-interface">
          <div class="confirmation-container">
            <!-- Header with Fairytale Style -->
            <div class="confirmation-header">
              <div class="confirmation-icon-wrap">
                <Icon name="game-icons:spell-book" class="confirmation-icon" />
              </div>
              <div class="confirmation-header-text">
                <h1 class="confirmation-title">Confirmation des Rôles</h1>
                <p class="confirmation-subtitle">Vérifiez les équipes avant de commencer</p>
              </div>
            </div>

            <!-- Three Column Team Layout -->
            <div class="confirmation-teams">
              <!-- Wolves Team -->
              <div class="team-bubble glass-card team-wolf">
                <div class="team-header">
                  <img class="team-icon" src="https://img.icons8.com/plasticine/100/werewolf.png" alt="werewolf" />
                  <h3 class="team-title">Loups-Garous</h3>
                  <span class="team-count">{{ playersByTeam.WOLF.length }}</span>
                </div>
                <div class="team-players">
                  <div v-for="player in playersByTeam.WOLF" :key="player.id" class="team-player" @click="copyRoleToClipboard(player)">
                    <span class="player-number-small">{{ player.number || '?' }}</span>
                    <div class="player-avatar-small" :class="{ 'has-image': player.avatar }">
                      <img v-if="player.avatar" :src="player.avatar" :alt="player.name" class="avatar-image" />
                      <span v-else>{{ player.name.charAt(0).toUpperCase() }}</span>
                    </div>
                    <span class="player-name-small">{{ player.name }}</span>
                    <span class="player-role-small">{{ player.roleName || '--' }}</span>
                  </div>
                  <div v-if="playersByTeam.WOLF.length === 0" class="team-empty">
                    Aucun loup
                  </div>
                </div>
              </div>

              <!-- Villagers Team -->
              <div class="team-bubble glass-card team-villager">
                <div class="team-header">
                  <img class="team-icon" src="https://img.icons8.com/emoji/48/hut-emoji.png" alt="hut-emoji" />
                  <h3 class="team-title">Villageois</h3>
                  <span class="team-count">{{ playersByTeam.VILLAGER.length }}</span>
                </div>
                <div class="team-players">
                  <div v-for="player in playersByTeam.VILLAGER" :key="player.id" class="team-player" @click="copyRoleToClipboard(player)">
                    <span class="player-number-small">{{ player.number || '?' }}</span>
                    <div class="player-avatar-small" :class="{ 'has-image': player.avatar }">
                      <img v-if="player.avatar" :src="player.avatar" :alt="player.name" class="avatar-image" />
                      <span v-else>{{ player.name.charAt(0).toUpperCase() }}</span>
                    </div>
                    <span class="player-name-small">{{ player.name }}</span>
                    <span class="player-role-small">{{ player.roleName || '--' }}</span>
                  </div>
                  <div v-if="playersByTeam.VILLAGER.length === 0" class="team-empty">
                    Aucun villageois
                  </div>
                </div>
              </div>

              <!-- Neutrals Team -->
              <div class="team-bubble glass-card team-neutral">
                <div class="team-header">
                  <img class="team-icon" src="https://img.icons8.com/color/48/alien.png" alt="alien" />
                  <h3 class="team-title">Neutres</h3>
                  <span class="team-count">{{ playersByTeam.NEUTRAL.length }}</span>
                </div>
                <div class="team-players">
                  <div v-for="player in playersByTeam.NEUTRAL" :key="player.id" class="team-player" @click="copyRoleToClipboard(player)">
                    <span class="player-number-small">{{ player.number || '?' }}</span>
                    <div class="player-avatar-small" :class="{ 'has-image': player.avatar }">
                      <img v-if="player.avatar" :src="player.avatar" :alt="player.name" class="avatar-image" />
                      <span v-else>{{ player.name.charAt(0).toUpperCase() }}</span>
                    </div>
                    <span class="player-name-small">{{ player.name }}</span>
                    <span class="player-role-small">{{ player.roleName || '--' }}</span>
                  </div>
                  <div v-if="playersByTeam.NEUTRAL.length === 0" class="team-empty">
                    Aucun neutre
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="confirmation-actions">
              <p v-if="!allPlayersHaveNumbers || hasDuplicateNumbers" class="confirmation-warning">
                ⚠️ {{ !allPlayersHaveNumbers ? 'Chaque joueur doit avoir un numéro' : 'Deux joueurs ont le même numéro' }} — retournez modifier la partie
              </p>
              <button
                class="btn-normalize-names"
                @click="normalizeNames"
                :disabled="isNormalizingNames || isTransitioning"
                title="Nettoyer les noms avec l'IA"
              >
                <span v-if="isNormalizingNames" class="loading-with-spinner">
                  <span class="spinner"></span>
                  <span>Noms...</span>
                </span>
                <span v-else>✨ Noms</span>
              </button>
              <button 
                class="btn-confirmation-edit" 
                @click="transitionTo('SETUP')"
                :disabled="isTransitioning"
              >
                <Icon v-if="!isTransitioning" name="mdi:pencil" />
                <span v-if="!isTransitioning">Modifier</span>
                <span v-else class="loading-with-spinner">
                  <span class="spinner"></span>
                  <span>Chargement...</span>
                </span>
              </button>
              <button 
                class="btn-confirmation-start" 
                @click="transitionTo('CAPTAIN_APPLICATION')"
                :disabled="isTransitioning || !allPlayersHaveNumbers || hasDuplicateNumbers"
              >
                <Icon v-if="!isTransitioning" name="mdi:play" />
                <span v-if="!isTransitioning">Commencer</span>
                <span v-else class="loading-with-spinner">
                  <span class="spinner"></span>
                  <span>Lancement...</span>
                </span>
              </button>
            </div>
          </div>
        </div>
        </Transition>

        <!-- ═══ Captain Application Phase ═══ -->
        <Transition :name="phaseTransitionName" mode="out-in">
          <div v-if="gameStore.currentPhase === 'CAPTAIN_APPLICATION'" key="captain-app" class="captain-interface">
            <div class="captain-container">

              <!-- Body: Arena + optional Spin sidebar -->
              <div class="captain-body">
                <!-- Player Circle -->
                <div class="captain-arena">
                  <!-- Center: changes during spin -->
                  <div class="arena-center">
                    <template v-if="isSpinning">
                      <div class="spin-center-anim"><span class="spin-dice">🎲</span></div>
                    </template>
                    <template v-else-if="spinResult.size > 0">
                      <div class="spin-center-done">
                        <span class="spin-done-icon">✨</span>
                        <span class="spin-done-label">{{ spinResult.size }} choisi{{ spinResult.size !== 1 ? 's' : '' }}</span>
                      </div>
                    </template>
                    <template v-else>
                      <div class="arena-center-icon">👑</div>
                      <div class="arena-center-label">
                        {{ captainCandidates.size }} candidat{{ captainCandidates.size !== 1 ? 's' : '' }}
                      </div>
                    </template>
                  </div>

                  <!-- Players: normal selection OR spin mode -->
                  <template v-if="spinCandidatesList.length > 0">
                    <!-- Spin mode: show only candidates -->
                    <div
                      v-for="(candidateId, idx) in spinCandidatesList"
                      :key="'spin-' + candidateId"
                      class="circle-player spin-player"
                      :class="{
                        'spin-highlight': isSpinning && spinHighlightIndex === idx,
                        'spin-selected': spinResult.has(candidateId),
                        'spin-eliminated': !isSpinning && spinResult.size > 0 && !spinResult.has(candidateId),
                      }"
                      :style="{
                        '--angle': `${(360 / spinCandidatesList.length) * idx - 90}deg`,
                        '--delay': `${idx * 0.05}s`
                      }"
                    >
                      <div class="circle-player-avatar">
                        <img v-if="getPlayerById(candidateId)?.avatar" :src="getPlayerById(candidateId)!.avatar" :alt="getPlayerById(candidateId)?.name" class="circle-avatar-img" />
                        <span v-else class="circle-avatar-letter">{{ getPlayerById(candidateId)?.name.charAt(0).toUpperCase() }}</span>
                        <span class="circle-player-number">{{ getPlayerById(candidateId)?.number || '?' }}</span>
                        <Transition name="pop">
                          <span v-if="spinResult.has(candidateId)" class="candidate-badge">✅</span>
                        </Transition>
                        <Transition name="pop">
                          <span v-if="!isSpinning && spinResult.size > 0 && !spinResult.has(candidateId)" class="eliminated-badge">❌</span>
                        </Transition>
                      </div>
                      <span class="circle-player-name">{{ getPlayerById(candidateId)?.number }}. {{ getPlayerById(candidateId)?.name }}</span>
                    </div>
                  </template>
                  <template v-else>
                    <!-- Normal mode: all players clickable -->
                    <div 
                      v-for="(player, idx) in sortedPlayers" 
                      :key="player.id"
                      class="circle-player"
                      :class="{ 
                        candidate: captainCandidates.has(player.id),
                        'not-candidate': captainCandidates.size > 0 && !captainCandidates.has(player.id)
                      }"
                      :style="{
                        '--angle': `${(360 / sortedPlayers.length) * idx - 90}deg`,
                        '--delay': `${idx * 0.05}s`
                      }"
                      @click="toggleCandidate(player.id)"
                    >
                      <div class="circle-player-avatar">
                        <img v-if="player.avatar" :src="player.avatar" :alt="player.name" class="circle-avatar-img" />
                        <span v-else class="circle-avatar-letter">{{ player.name.charAt(0).toUpperCase() }}</span>
                        <span class="circle-player-number">{{ player.number || '?' }}</span>
                        <Transition name="pop">
                          <span v-if="captainCandidates.has(player.id)" class="candidate-badge">🙋</span>
                        </Transition>
                      </div>
                      <span class="circle-player-name">{{ player.number }}. {{ player.name }}</span>
                    </div>
                  </template>
                </div>

                <!-- Spin sidebar: appears when 4+ candidates and not currently spinning -->
                <Transition name="slide-right">
                  <div v-if="captainCandidates.size > 3 && spinCandidatesList.length === 0" class="spin-sidebar">
                    <div class="spin-sidebar-title">🎰 Tirage</div>
                    <p class="spin-sidebar-desc">Trop de candidats ? Lancez un tirage au sort.</p>
                    <div class="spin-count-picker">
                      <span class="spin-count-label">Garder</span>
                      <div class="spin-count-btns">
                        <button
                          v-for="n in (captainCandidates.size - 2)"
                          :key="n + 1"
                          class="spin-count-btn"
                          :class="{ active: spinTargetCount === n + 1 }"
                          @click="spinTargetCount = n + 1"
                        >
                          {{ n + 1 }}
                        </button>
                      </div>
                    </div>
                    <button
                      class="btn-captain-spin"
                      @click="startSpin"
                    >
                      🎡 Lancer le tirage
                    </button>
                    <button
                      class="btn-captain-copy-vote"
                      @click="copyCaptainVotes"
                      title="Copier le tableau des votes"
                    >
                      📋 Copier les Votes
                    </button>
                  </div>
                </Transition>
              </div>

              <!-- Actions -->
              <div class="captain-actions">
                <div class="captain-actions-row">
                  <!-- During/after spin: back + apply -->
                  <template v-if="isSpinning || spinResult.size > 0">
                    <button 
                      class="btn-captain-back-lobby"
                      @click="backFromSpin"
                      :disabled="isSpinning"
                    >
                      <Icon name="mdi:arrow-left" /> Retour
                    </button>
                    <button
                      v-if="spinResult.size > 0 && !isSpinning"
                      class="btn-captain-proceed"
                      @click="applySpinResult"
                      :disabled="isTransitioning"
                    >
                      <span v-if="!isTransitioning">
                        🗳️ Passer au Vote ({{ spinResult.size }})
                      </span>
                      <span v-else class="loading-with-spinner">
                        <span class="spinner"></span>
                        <span>Chargement...</span>
                      </span>
                    </button>
                  </template>
                  <!-- Normal mode -->
                  <template v-else>
                    <button 
                      class="btn-captain-back-lobby"
                      @click="transitionTo('CONFIRMATION')"
                      :disabled="isTransitioning"
                    >
                      <Icon name="mdi:arrow-left" /> Lobby
                    </button>

                    <button 
                      class="btn-captain-proceed"
                      @click="transitionTo('CAPTAIN_VOTE')"
                      :disabled="isTransitioning || captainCandidates.size < 2"
                    >
                      <span v-if="!isTransitioning">
                        🗳️ Passer au Vote ({{ captainCandidates.size }})
                      </span>
                      <span v-else class="loading-with-spinner">
                        <span class="spinner"></span>
                        <span>Chargement...</span>
                      </span>
                    </button>

                  </template>
                </div>
              </div>
            </div>
          </div>
        </Transition>

        <!-- ═══ Captain Vote Phase ═══ -->
        <Transition :name="phaseTransitionName" mode="out-in">
          <div v-if="gameStore.currentPhase === 'CAPTAIN_VOTE'" key="captain-vote" class="captain-interface captain-vote-phase">
                    <!-- Floating Copy Vote Button -->
            <div class="vote-layout-container">
              <!-- Header with view toggle -->
              <div class="vote-header">
                <span class="vote-header-icon">🗳️</span>
                <h2 class="vote-header-title">Vote du Capitaine</h2>
                <span class="vote-header-count">{{ Object.keys(captainVotes).length }}/{{ activeVoters.length }} votés</span>
                <div class="vote-view-toggle">
                  <button
                    class="view-toggle-btn"
                    :class="{ active: voteViewMode === 'circle' }"
                    @click="voteViewMode = 'circle'; selectedVoter = null"
                    title="Vue cercle"
                  >
                    <Icon name="mdi:chart-donut" />
                  </button>
                  <button
                    class="view-toggle-btn"
                    :class="{ active: voteViewMode === 'table' }"
                    @click="voteViewMode = 'table'; selectedVoter = null"
                    title="Vue tableau"
                  >
                    <Icon name="mdi:table" />
                  </button>
                </div>
              </div>

              <!-- ━━━ CIRCLE VIEW ━━━ -->
              <Transition name="view-switch" mode="out-in">
                <div v-if="voteViewMode === 'circle'" key="circle-view" class="vote-circle-view">
                  <div class="captain-arena vote-arena">
                    <!-- Center: tally OR candidate picker -->
                    <div class="arena-center vote-center">
                      <Transition name="fade" mode="out-in">
                        <!-- ── Candidate picker (when a voter is selected) ── -->
                        <div v-if="selectedVoter" key="picker" class="vote-picker">
                          <div class="picker-header">
                            <span class="picker-voter-name">{{ getPlayerById(selectedVoter)?.number }}. {{ getPlayerById(selectedVoter)?.name }}</span>
                            <span class="picker-label">vote pour…</span>
                            <button class="picker-close" @click="selectedVoter = null">✕</button>
                          </div>
                          <div class="picker-candidates">
                            <button
                              v-for="candidateId in captainCandidates"
                              :key="candidateId"
                              class="picker-candidate"
                              :class="{ 'is-selected': captainVotes[selectedVoter] === candidateId }"
                              :style="{ '--pick-color': candidateColors[candidateId] }"
                              @click="assignVote(candidateId)"
                            >
                              <div class="picker-avatar" :style="{ borderColor: candidateColors[candidateId] }">
                                <img v-if="getPlayerById(candidateId)?.avatar" :src="getPlayerById(candidateId)!.avatar" />
                                <span v-else>{{ getPlayerById(candidateId)?.name.charAt(0) }}</span>
                              </div>
                              <span class="picker-name">{{ getPlayerById(candidateId)?.number }}. {{ getPlayerById(candidateId)?.name }}</span>
                              <span v-if="captainVotes[selectedVoter!] === candidateId" class="picker-check">✓</span>
                            </button>
                          </div>
                          <button
                            v-if="getVotedCandidateId(selectedVoter!)"
                            class="picker-clear"
                            @click="clearVoterVote()"
                          >
                            Retirer le vote
                          </button>
                        </div>

                        <!-- ── Normal tally (default center) ── -->
                        <div v-else key="tally" class="vote-tally-view">
                          <div class="arena-center-icon">👑</div>
                          <div class="vote-tally-center">
                            <div
                              v-for="candidateId in captainCandidates"
                              :key="candidateId"
                              class="tally-row"
                              :class="{ 'is-leader': captainWinner === candidateId }"
                            >
                              <span class="tally-color" :style="{ background: candidateColors[candidateId] }" />
                              <span class="tally-name">{{ getPlayerById(candidateId)?.number }}. {{ getPlayerById(candidateId)?.name }}</span>
                              <span class="tally-count">{{ captainVoteTally[candidateId] || 0 }}</span>
                            </div>
                          </div>
                          <div v-if="captainWinner" class="vote-center-winner">
                            👑 {{ getPlayerById(captainWinner)?.name }}
                          </div>
                          <div v-else-if="Object.keys(captainVotes).length > 0" class="vote-center-tie">⚔️ Égalité</div>
                          <div v-else class="vote-center-waiting">Cliquer pour voter</div>
                        </div>
                      </Transition>
                    </div>

                    <!-- Players in circle -->
                    <div
                      v-for="(player, idx) in sortedPlayers"
                      :key="player.id"
                      class="circle-player vote-player"
                      :class="{
                        'is-candidate': captainCandidates.has(player.id),
                        'is-voter': !captainCandidates.has(player.id),
                        'has-voted': !!captainVotes[player.id],
                        'is-elected': captainElected === player.id,
                        'is-leading': captainWinner === player.id,
                        'is-selecting': selectedVoter === player.id,
                      }"
                      :style="{
                        '--angle': `${(360 / sortedPlayers.length) * idx - 90}deg`,
                        '--delay': `${idx * 0.04}s`,
                        '--candidate-color': captainCandidates.has(player.id) ? (candidateColors[player.id] || 'transparent') : getVoteColor(player.id),
                      }"
                      @click="captainCandidates.has(player.id) ? null : openVotePicker(player.id)"
                    >
                      <div class="circle-player-avatar" :style="getVotedCandidateId(player.id) ? { borderColor: getVoteColor(player.id) } : {}">
                        <img v-if="player.avatar" :src="player.avatar" :alt="player.name" class="circle-avatar-img" />
                        <span v-else class="circle-avatar-letter">{{ player.name.charAt(0).toUpperCase() }}</span>
                        <span class="circle-player-number">{{ player.number || '?' }}</span>

                        <!-- Candidate badge -->
                        <span v-if="captainCandidates.has(player.id)" class="candidate-badge">🙋</span>

                        <!-- Elected crown -->
                        <Transition name="pop">
                          <span v-if="captainElected === player.id" class="vote-crown-badge">👑</span>
                        </Transition>

                        <!-- Vote indicator: mini avatar of chosen candidate -->
                        <div
                          v-if="!captainCandidates.has(player.id) && getVotedCandidateId(player.id)"
                          class="vote-indicator"
                          :style="{ borderColor: getVoteColor(player.id), background: getVoteColor(player.id) + '33' }"
                        >
                          <img
                            v-if="getPlayerById(getVotedCandidateId(player.id)!)?.avatar"
                            :src="getPlayerById(getVotedCandidateId(player.id)!)!.avatar"
                            class="vote-indicator-img"
                          />
                          <span v-else class="vote-indicator-letter">
                            {{ getPlayerById(getVotedCandidateId(player.id)!)?.name.charAt(0) }}
                          </span>
                        </div>
                      </div>

                      <span class="circle-player-name">{{ player.number }}. {{ player.name }}</span>

                      <!-- Vote count for candidates -->
                      <span v-if="captainCandidates.has(player.id)" class="circle-vote-count" :style="{ color: candidateColors[player.id] }">
                        {{ captainVoteTally[player.id] || 0 }} vote{{ (captainVoteTally[player.id] || 0) !== 1 ? 's' : '' }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- ━━━ TABLE VIEW ━━━ -->
                <div v-else key="table-view" class="vote-table-view">
                  <!-- Candidate summary cards + Copy Vote Button -->
                  <div class="table-candidates-bar" style="position: relative;">
                    <button
                      class="btn-table-copy-vote"
                      @click="copyCaptainVotes"
                      title="Copier le tableau des votes"
                    >
                      <Icon name="mdi:content-copy" size="22" />
                    </button>
                    <div
                      v-for="candidateId in captainCandidates"
                      :key="candidateId"
                      class="table-candidate-card"
                      :class="{ 'is-leading': captainWinner === candidateId, 'is-elected': captainElected === candidateId }"
                      :style="{ '--cand-color': candidateColors[candidateId] }"
                    >
                      <div class="table-cand-avatar" :style="{ borderColor: candidateColors[candidateId] }">
                        <img v-if="getPlayerById(candidateId)?.avatar" :src="getPlayerById(candidateId)!.avatar" />
                        <span v-else>{{ getPlayerById(candidateId)?.name.charAt(0) }}</span>
                      </div>
                      <span class="table-cand-name">{{ getPlayerById(candidateId)?.number }}. {{ getPlayerById(candidateId)?.name }}</span>
                      <span class="table-cand-votes" :style="{ color: candidateColors[candidateId] }">
                        {{ captainVoteTally[candidateId] || 0 }} vote{{ (captainVoteTally[candidateId] || 0) !== 1 ? 's' : '' }}
                      </span>
                      <Transition name="pop">
                        <span v-if="captainElected === candidateId" class="table-cand-crown">👑</span>
                      </Transition>
                    </div>
                  </div>

                  <!-- Voters table -->
                  <div class="vote-table-grid">
                    <div class="vote-table-header">
                      <span class="vtable-col vtable-col-num">#</span>
                      <span class="vtable-col vtable-col-player">Joueur</span>
                      <span class="vtable-col vtable-col-vote">Vote</span>
                    </div>
                    <div class="vote-table-body">
                      <div
                        v-for="player in activeVoters"
                        :key="player.id"
                        class="vote-table-row"
                        :class="{
                          'has-voted': !!captainVotes[player.id],
                          'is-selecting': selectedVoter === player.id,
                        }"
                      >
                        <span class="vtable-col vtable-col-num">{{ player.number || '?' }}</span>
                        <div class="vtable-col vtable-col-player">
                          <div class="vtable-player-avatar" :style="getVotedCandidateId(player.id) ? { borderColor: getVoteColor(player.id) } : {}">
                            <img v-if="player.avatar" :src="player.avatar" />
                            <span v-else>{{ player.name.charAt(0) }}</span>
                          </div>
                          <span class="vtable-player-name">{{ player.number }}. {{ player.name }}</span>
                        </div>
                        <div class="vtable-col vtable-col-vote">
                          <div class="vtable-vote-buttons">
                            <button
                              v-for="candidateId in captainCandidates"
                              :key="candidateId"
                              class="vtable-vote-btn"
                              :class="{ 'is-active': captainVotes[player.id] === candidateId }"
                              :style="{ '--btn-color': candidateColors[candidateId] }"
                              @click="tableAssignVote(player.id, candidateId)"
                              :title="getPlayerById(candidateId)?.name"
                            >
                              <div class="vtable-btn-avatar" :style="{ borderColor: candidateColors[candidateId] }">
                                <img v-if="getPlayerById(candidateId)?.avatar" :src="getPlayerById(candidateId)!.avatar" />
                                <span v-else>{{ getPlayerById(candidateId)?.name.charAt(0) }}</span>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </Transition>

              <!-- Bottom Bar: Actions -->
              <div class="vote-bottom-bar">
                <button
                  class="btn-captain-back"
                  @click="transitionTo('CAPTAIN_APPLICATION')"
                  :disabled="isTransitioning"
                >
                  <Icon name="mdi:arrow-left" /> Candidats
                </button>
                <!-- Cancel captains-vote mode -->
                <button
                  v-if="captainVoterFilter !== null && !captainElected"
                  class="btn-captain-undo"
                  @click="cancelCaptainsVote"
                  :disabled="isTransitioning"
                >
                  ↩️ Annuler
                </button>
                <!-- Annuler captain election — always visible when a captain is elected -->
                <button
                  v-if="captainElected"
                  class="btn-captain-undo"
                  @click="undoCaptainElection"
                  :disabled="isTransitioning"
                >
                  ↩️ Annuler
                </button>
                <div class="vote-status">
                  <span v-if="captainElected" class="vote-leader">✨ {{ getPlayerById(captainElected)?.name }} est Capitaine !</span>
                  <span v-else-if="captainWinner" class="vote-leader">👑 {{ getPlayerById(captainWinner)?.name }} en tête</span>
                  <span v-else-if="tiedCandidates.length > 0" class="vote-tie">
                    ⚔️ Égalité ({{ tiedCandidates.length }})
                  </span>
                  <span v-else-if="Object.keys(captainVotes).length > 0" class="vote-tie">⚔️ Égalité</span>
                  <span v-else class="vote-waiting">En attente des votes...</span>
                </div>

                <!-- Normal: elect winner -->
                <button
                  v-if="captainWinner && !captainElected"
                  class="btn-captain-confirm"
                  @click="confirmCaptain"
                  :disabled="isTransitioning"
                >
                  <span v-if="!isTransitioning">
                    👑 Élire {{ getPlayerById(captainWinner)?.name }}
                  </span>
                  <span v-else class="loading-with-spinner">
                    <span class="spinner"></span>
                    <span>Élection...</span>
                  </span>
                </button>

                <!-- Captain elected: show proceed button -->
                <div v-else-if="captainElected" class="elected-actions">
                  <button
                    class="btn-captain-next"
                    @click="startNightFall"
                    :disabled="isTransitioning"
                  >
                    🌙 Tomber la Nuit
                  </button>
                </div>

                <!-- Tie: show tie-break button -->
                <button
                  v-else-if="tiedCandidates.length > 0"
                  class="btn-captain-tiebreak"
                  @click="showTieBreakPanel = !showTieBreakPanel; tieBreakMode = 'menu'"
                  :disabled="isTransitioning"
                >
                  ⚔️ Départager
                </button>

                <!-- No votes yet -->
                <button
                  v-else
                  class="btn-captain-confirm"
                  disabled
                >
                  👑 Élire ...
                </button>
              </div>

              <!-- Tie-break panel overlay -->
              <Transition name="slide-up">
                <div v-if="showTieBreakPanel && tiedCandidates.length > 0" class="tiebreak-panel">
                  <div class="tiebreak-header">
                    <h3>⚔️ Égalité — {{ tiedCandidates.length }} candidats à {{ captainVoteTally[tiedCandidates[0]!] || 0 }} votes</h3>
                    <div class="tiebreak-tied-players">
                      <span v-for="id in tiedCandidates" :key="id" class="tiebreak-player-chip" :style="{ borderColor: candidateColors[id] }">
                        {{ getPlayerById(id)?.number }}. {{ getPlayerById(id)?.name }}
                      </span>
                    </div>
                  </div>

                  <!-- Menu mode: show options -->
                  <div v-if="tieBreakMode === 'menu'" class="tiebreak-options">
                    <button class="tiebreak-option tiebreak-random" @click="tieBreakRandom" :disabled="isTransitioning">
                      <span class="tiebreak-icon">🎲</span>
                      <span class="tiebreak-label">Tirage aléatoire</span>
                      <span class="tiebreak-desc">Choisir au hasard parmi les ex æquo</span>
                    </button>
                    <button class="tiebreak-option tiebreak-pick" @click="tieBreakMode = 'pick'" :disabled="isTransitioning">
                      <span class="tiebreak-icon">👆</span>
                      <span class="tiebreak-label">Choisir manuellement</span>
                      <span class="tiebreak-desc">Le narrateur désigne le capitaine</span>
                    </button>
                    <button class="tiebreak-option tiebreak-revote-normal" @click="tieBreakRevoteNormal" :disabled="isTransitioning">
                      <span class="tiebreak-icon">🔄</span>
                      <span class="tiebreak-label">Revote (normal)</span>
                      <span class="tiebreak-desc">Réinitialiser tous les votes — historique conservé dans le log</span>
                    </button>
                    <button class="tiebreak-option tiebreak-captains-vote" @click="tieBreakCaptainsVote" :disabled="isTransitioning">
                      <span class="tiebreak-icon">⚔️</span>
                      <span class="tiebreak-label">Vote des capitaines</span>
                      <span class="tiebreak-desc">Les capitaines non ex æquo votent pour ceux à égalité</span>
                    </button>
                  </div>

                  <!-- Pick mode: show tied candidates to click -->
                  <div v-else-if="tieBreakMode === 'pick'" class="tiebreak-pick-grid">
                    <p class="tiebreak-pick-prompt">Cliquez sur le candidat à élire :</p>
                    <div class="tiebreak-pick-candidates">
                      <button
                        v-for="id in tiedCandidates"
                        :key="id"
                        class="tiebreak-pick-card"
                        :style="{ borderColor: candidateColors[id] }"
                        @click="tieBreakPick(id)"
                        :disabled="isTransitioning"
                      >
                        <div class="tiebreak-pick-avatar" :style="{ borderColor: candidateColors[id] }">
                          <img v-if="getPlayerById(id)?.avatar" :src="getPlayerById(id)!.avatar" />
                          <span v-else>{{ getPlayerById(id)?.name.charAt(0) }}</span>
                        </div>
                        <span class="tiebreak-pick-name">{{ getPlayerById(id)?.number }}. {{ getPlayerById(id)?.name }}</span>
                        <span class="tiebreak-pick-votes">{{ captainVoteTally[id] || 0 }} votes</span>
                      </button>
                    </div>
                    <button class="tiebreak-back-btn" @click="tieBreakMode = 'menu'">← Retour</button>
                  </div>

                  <button class="tiebreak-close" @click="showTieBreakPanel = false">✕</button>
                </div>
              </Transition>
            </div>
          </div>
        </Transition>



        <!-- ═══ First Night Phase ═══ -->
        <Transition :name="phaseTransitionName" mode="out-in">
          <div v-if="gameStore.currentPhase === 'FIRST_NIGHT'" key="first-night" class="first-night-interface">
            <div class="fn-layout">
              <!-- Left: Role Action List -->
              <div class="fn-roles-panel">
                <div class="fn-header">
                  <div class="fn-header-icon">🌙</div>
                  <div>
                    <h2 class="fn-title">Première Nuit</h2>
                    <p class="fn-subtitle">Réveillez les rôles dans l’ordre nocturne</p>
                  </div>
                  <div class="fn-progress">
                    <span class="fn-progress-num">{{ Object.values(firstNightDone).filter(Boolean).length }}</span>
                    <span class="fn-progress-sep">/</span>
                    <span class="fn-progress-total">{{ nightRoles.length }}</span>
                    <span class="fn-progress-label">actions</span>
                  </div>
                </div>

                <div class="fn-roles-list">
                  <div
                    v-for="role in nightRoles"
                    :key="role._id"
                    class="fn-role-row"
                    :class="{ done: firstNightDone[role._id] }"
                  >
                    <div class="fn-role-info">
                      <div class="fn-player-avatar" :class="{ 'has-image': getPlayerByRoleId(role._id)?.avatar }">
                        <img v-if="getPlayerByRoleId(role._id)?.avatar" :src="getPlayerByRoleId(role._id)!.avatar" :alt="getPlayerByRoleId(role._id)?.name" class="fn-avatar-img" />
                        <span v-else class="fn-avatar-initial">{{ (getPlayerByRoleId(role._id)?.name || '?').charAt(0).toUpperCase() }}</span>
                      </div>
                      <div class="fn-role-name-wrap">
                        <span class="fn-role-name">{{ role.name }}</span>
                        <span class="fn-role-player">{{ getPlayerByRoleId(role._id)?.name || '—' }}</span>
                      </div>
                    </div>
                    <select
                      v-model="firstNightActions[role._id]"
                      class="fn-target-select"
                      :disabled="firstNightDone[role._id]"
                    >
                      <option value="">— Pas de cible —</option>
                      <option
                        v-for="p in gameStore.alivePlayers"
                        :key="p.id"
                        :value="p.id"
                      >{{ p.number }}. {{ p.name }}</option>
                    </select>
                    <button
                      class="fn-done-btn"
                      :class="{ checked: firstNightDone[role._id] }"
                      @click="firstNightDone[role._id] = !firstNightDone[role._id]"
                    >
                      <span v-if="firstNightDone[role._id]">✓</span>
                      <span v-else>○</span>
                    </button>
                  </div>

                  <div v-if="nightRoles.length === 0" class="fn-empty">
                    <span>🌙</span>
                    <p>Aucun rôle nocturne assigné</p>
                  </div>
                </div>

                <div class="fn-footer">
                  <button
                    class="fn-btn-back"
                    @click="transitionTo('CAPTAIN_VOTE')"
                    :disabled="isTransitioning"
                  >
                    ← Retour
                  </button>
                  <button
                    class="fn-btn-day"
                    @click="finishFirstNight"
                    :disabled="isTransitioning"
                  >
                    <span v-if="!isTransitioning">☀️ Passer au Jour</span>
                    <span v-else class="loading-with-spinner"><span class="spinner"></span> Transition...</span>
                  </button>
                </div>
              </div>

              <!-- Right: Night Log -->
              <div class="fn-log-panel">
                <div class="fn-log-header">
                  <span>📓 Journal de Nuit</span>
                </div>
                <div class="fn-log-entries">
                  <div v-for="(entry, i) in firstNightLog" :key="i" class="fn-log-entry">
                    <span class="fn-log-icon">{{ entry.icon }}</span>
                    <div class="fn-log-text">
                      <span class="fn-log-role">{{ entry.roleName }}</span>
                      <span class="fn-log-arrow">→</span>
                      <span class="fn-log-target">{{ entry.targetName }}</span>
                    </div>
                  </div>
                  <div v-if="firstNightLog.length === 0" class="fn-log-empty">Aucune action enregistrée</div>
                </div>
              </div>
            </div>
          </div>
        </Transition>

        <!-- ═══ Day Phase ═══ -->
        <Transition :name="phaseTransitionName" mode="out-in">
          <div v-if="gameStore.currentPhase === 'DAY' || gameStore.currentPhase === 'VOTE'" key="day-interface" class="day-interface" :style="{ '--day-progress': dayProgress }">

            <!-- Dawn atmosphere (fixed, pointer-events none) -->
            <div class="dawn-atmosphere" :style="dayAtmosphereStyle" />
            <div class="dawn-rays" :style="dayRaysStyle" />
            <div class="dawn-horizon" :style="dayHorizonStyle" />
            
            <!-- Defense alert (single text, above header) -->
            <Transition name="defense-pop" mode="out-in">
              <div v-if="dayOrderPhase === 'vote' && defenseAlertData" :key="defenseAlertData.key" class="day-defense-alert">
                🛡️ <strong>{{ defenseAlertData.name }}</strong> — {{ defenseAlertData.count }} votes — débat défense
              </div>
            </Transition>

            <!-- Header row -->
            <div class="day-header" :class="{ 'is-tie-state': dayOrderPhase === 'vote' && showTieResolution }">
              <div class="day-header-progress" v-if="dayOrderPhase !== 'vote'">
                <div class="day-prog-track">
                  <div class="day-prog-fill" :style="{ width: (daySpokenSet.size / Math.max(dayOrderPhase === 'second-debate' ? gameStore.aliveCount : dayFirstRoundTotal, 1) * 100) + '%' }" />
                </div>
                <span class="day-prog-text">{{ daySpokenSet.size }}/{{ dayOrderPhase === 'second-debate' ? gameStore.aliveCount : dayFirstRoundTotal }} ont parlé</span>
              </div>
              <div class="day-header-progress" v-if="dayOrderPhase === 'vote'">
                <div class="day-prog-track">
                  <div class="day-prog-fill" :style="{ width: (dayVoteFilledCount / Math.max(gameStore.aliveCount, 1) * 100) + '%' }" />
                </div>
                <span class="day-prog-text">{{ dayVoteFilledCount }}/{{ gameStore.aliveCount }} ont voté</span>
              </div>
              <div class="day-header-controls" v-if="dayOrderPhase !== 'setup' && dayOrderPhase !== 'vote'">
                <!-- Direction toggle: single click, no confirm -->
                <button class="dir-toggle-btn" @click="daySetDirection(dayDirection === 'up' ? 'down' : 'up')" :title="dayDirection === 'up' ? 'Ordre descendant' : 'Ordre ascendant'">
                  <svg viewBox="0 0 16 16" fill="none" width="18" height="18">
                    <path v-if="dayDirection === 'up'" d="M3 10l5-5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path v-else d="M3 6l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>

                <!-- Reset round: double-confirm -->
                <button
                  class="dir-toggle-btn reset"
                  :class="{ 'is-confirming': resetRoundConfirmPending }"
                  :title="resetRoundConfirmPending ? 'Confirmer la réinitialisation ?' : 'Annuler et recommencer'"
                  @click="handleResetRoundClick"
                >
                  <Transition name="dvha-swap" mode="out-in">
                    <svg v-if="!resetRoundConfirmPending" key="icon" viewBox="0 0 16 16" fill="none" width="18" height="18">
                      <path d="M2.5 8a5.5 5.5 0 1 1 1.1 3.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                      <path d="M2.5 4.5V8h3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span v-else key="confirm" class="ctrl-confirm-label">Oui ?</span>
                  </Transition>
                </button>

                <!-- Second debate: double-confirm -->
                <button
                  class="dir-toggle-btn debate"
                  :class="{ 'is-confirming': debateConfirmPending }"
                  :title="debateConfirmPending ? 'Confirmer le 2ème tour ?' : 'Passer au 2ème tour de parole'"
                  @click="handleDebateClick"
                >
                  <Transition name="dvha-swap" mode="out-in">
                    <svg v-if="!debateConfirmPending" key="icon" viewBox="0 0 16 16" fill="none" width="18" height="18">
                      <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h7A1.5 1.5 0 0 1 12 3.5v4A1.5 1.5 0 0 1 10.5 9H9l-2 2.5V9H3.5A1.5 1.5 0 0 1 2 7.5v-4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                      <text x="5.5" y="7.2" font-size="4.5" font-weight="800" fill="currentColor" font-family="sans-serif">2</text>
                    </svg>
                    <span v-else key="confirm" class="ctrl-confirm-label">Oui ?</span>
                  </Transition>
                </button>
              </div>
              <!-- Tie controls — absolute left, never displaces cards or header content -->
              <Transition name="dvha-swap">
                <div v-if="dayOrderPhase === 'vote' && showTieResolution" class="day-vote-tie-controls">
                  <div class="dvha-tie-badge">
                    <span class="dvha-tie-icon">⚖️</span>
                    <div class="dvha-tie-info">
                      <span class="dvha-tie-label">Égalité</span>
                      <span class="dvha-tie-sub">{{ topVotePlayerIds.size }} à égalité · Tour {{ dayVoteRound }}</span>
                    </div>
                  </div>
                  <button class="dvha-tie-btn" @click="repeatVote">
                    🔁 Rejouer · Tour {{ dayVoteRound + 1 }}
                  </button>
                  <button class="dvha-tie-btn" :class="{ active: isManualPickMode }" @click="isManualPickMode = !isManualPickMode">
                    ✋ Désigner
                  </button>
                </div>
              </Transition>

              <div v-if="dayOrderPhase === 'vote'" class="day-vote-header-actions">
                <button class="day-vote-action-btn" @click="copyDayVotes" title="Copier le tableau des votes">
                  <Icon name="mdi:content-copy" size="18" />
                </button>
                <button v-if="dayVoteRound > 1" 
                  class="day-vote-action-btn is-danger"
                  :class="{ 'is-confirming': resetConfirmPending }"
                  :title="resetConfirmPending ? 'Confirmer la réinitialisation ?' : 'Revenir au vote initial (Tour 1)'"
                  @click="handleResetClick"
                >
                  <Transition name="dvha-swap" mode="out-in">
                    <Icon v-if="!resetConfirmPending" key="icon" name="mdi:restore" size="18" />
                    <span v-else key="confirm" class="reset-confirm-label">Oui ?</span>
                  </Transition>
                </button>
                <button class="day-vote-action-btn" :class="{ active: showExecutePanel }" @click="showExecutePanel = !showExecutePanel" title="Panneau abandons">
                  💀
                </button>
              </div>
            </div>

            <!-- Main area -->
            <div class="day-main">

              <!-- ── Speaking sub-phases ── -->
              <template v-if="dayOrderPhase !== 'vote'">
              <!-- Left: Timer column -->
              <div class="day-timer-col">
                <div class="day-timer-card">
                  <div class="day-timer-hub" :class="{ 'is-urgent': dayTimerRemaining <= 15 && dayTimerRemaining > 0, 'is-done': dayTimerRemaining === 0, 'is-running': dayTimerRunning }">
                    <svg class="day-ring-svg" viewBox="0 0 200 200">
                      <defs>
                        <linearGradient id="dawn-ring-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stop-color="#c084fc" />
                          <stop offset="100%" stop-color="#fbbf24" />
                        </linearGradient>
                      </defs>
                      <circle class="ring-track" cx="100" cy="100" r="88" />
                      <circle class="ring-fill" cx="100" cy="100" r="88"
                        :stroke-dasharray="552.92"
                        :stroke-dashoffset="552.92 * (1 - Math.max(0, dayTimerFraction))"
                      />
                    </svg>
                    <span v-if="daySpeakerPlayer?.isCaptain" class="timer-crown">
                      <svg viewBox="0 0 28 18" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 16 L2 8.5 L8.5 14 L14 1 L19.5 14 L26 8.5 L26 16 Z" fill="#fde68a" stroke="rgba(180,90,0,0.35)" stroke-width="0.6" stroke-linejoin="round"/>
                        <rect x="2" y="13.5" width="24" height="3.8" rx="1.2" fill="#f59e0b"/>
                        <rect x="2" y="13.5" width="24" height="1.4" rx="0.7" fill="#fef3c7" opacity="0.55"/>
                        <circle cx="8.5" cy="15.3" r="1.15" fill="#c084fc"/>
                        <circle cx="14" cy="15.3" r="1.45" fill="#f87171"/>
                        <circle cx="19.5" cy="15.3" r="1.15" fill="#c084fc"/>
                      </svg>
                    </span>
                    <!-- Speaker avatar fills the ring interior -->
                    <Transition name="timer-avatar" mode="out-in">
                      <div
                        v-if="daySpeakerPlayer"
                        :key="daySpeakerPlayer.id"
                        class="day-timer-avatar"
                      >
                        <img v-if="daySpeakerPlayer.avatar" :src="daySpeakerPlayer.avatar" :alt="daySpeakerPlayer.name" />
                        <div v-else class="day-timer-avatar-initials">{{ daySpeakerPlayer.name[0]?.toUpperCase() }}</div>
                      </div>
                    </Transition>
                    <div class="day-timer-inner">
                      <div class="day-timer-time" :class="{ running: dayTimerRunning, urgent: dayTimerRemaining <= 15 && dayTimerRemaining > 0, done: dayTimerRemaining <= 0 }">
                        {{ formatTimer(dayTimerRemaining) }}
                      </div>
                      <div class="day-speaker-name" v-if="daySpeakerPlayer">{{ daySpeakerPlayer.name }}</div>
                      <div class="day-speaker-hint" v-else>— choisir —</div>
                    </div>
                  </div>

                  <div class="day-timer-controls">
                    <button class="dtc-btn reset" @click="dayTimerReset" title="Reset">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
                    </button>
                    <button class="dtc-btn stop" v-if="dayTimerRunning" @click="dayTimerPause" title="Arrêter le timer">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    </button>
                    <button class="dtc-btn play" v-else @click="dayTimerStart" :disabled="!daySpeakerPlayer">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                    <button class="dtc-btn skip" @click="dayTimerSkip" :disabled="!daySpeakerPlayer" title="Joueur suivant">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/></svg>
                    </button>
                  </div>

                  <!-- Duration control inside timer card -->
                  <div class="day-dur-control">
                    <button class="day-dur-btn" @click="setTimerDuration(dayTimerDuration - 15)" :disabled="dayTimerDuration <= 15">−</button>
                    <span class="day-dur-label">durée</span>
                    <span class="day-dur-val">{{ formatTimer(dayTimerDuration) }}</span>
                    <button class="day-dur-btn" @click="setTimerDuration(dayTimerDuration + 15)">+</button>
                  </div>
                </div>
              </div>

              <!-- Right: Players grid -->
              <div class="day-players-col">
                <div class="day-players-header">
                  <span class="day-players-title">
                    <span v-if="dayOrderPhase === 'setup'">Choisir le premier orateur</span>
                    <span v-else-if="dayOrderPhase === 'first-round'">Premier tour · depuis <strong>{{ dayStartSpeakerPlayer?.name }}</strong></span>
                    <span v-else class="title-second-debate">✶ Deuxième tour de parole</span>
                  </span>
                  <span class="day-players-count">
                    <template v-if="dayOrderPhase === 'second-debate'">{{ daySecondDebateSpokenSet.size }}/{{ daySecondDebateList.length }}</template>
                    <template v-else>{{ daySpokenSet.size }}/{{ dayFirstRoundTotal }}</template>
                  </span>
                </div>

                <!-- Direction picker (shown after start player selected) -->
                <Transition name="slide-up">
                  <div v-if="dayStartSpeakerId && !dayDirection" class="day-direction-picker">
                    <button class="ddir-cancel" @click="dayCancelStart" title="Changer de joueur">✕</button>
                    <span class="ddir-start-name">{{ dayStartSpeakerPlayer?.name }}</span>
                    <span class="ddir-sep">—</span>
                    <button class="day-dir-btn" @click="daySetDirection('down')" title="Décroissant">
                      <span class="ddir-arrow">↓</span> Décroissant
                    </button>
                    <button class="day-dir-btn" @click="daySetDirection('up')" title="Croissant">
                      <span class="ddir-arrow">↑</span> Croissant
                    </button>
                  </div>
                </Transition>

                <div class="day-players-grid" :class="'cols-' + dayGridCols">
                  <button
                    v-for="player in gameStore.alivePlayers"
                    :key="player.id"
                    class="day-player-chip"
                    :class="{
                      'is-speaking':        daySpeakerId === player.id,
                      'has-spoken':         dayOrderPhase === 'second-debate' ? daySecondDebateSpokenSet.has(player.id) : daySpokenSet.has(player.id),
                      'is-pending-start':   dayOrderPhase === 'setup' && player.id !== dayStartSpeakerId,
                      'is-start-selected':  dayOrderPhase === 'setup' && player.id === dayStartSpeakerId,
                      'is-second-debate':   dayOrderPhase !== 'setup' && daySecondDebateIds.has(player.id),
                      'is-captain-skipped': dayOrderPhase === 'first-round' && player.isCaptain && !daySpokenSet.has(player.id) && daySpeakerId !== player.id,
                      'has-avatar':         player.avatar,
                      'is-maire':           player.isCaptain
                    }"
                    @click="dayChipClick(player.id)"
                  >
                    <!-- Avatar background -->
                    <img v-if="player.avatar" :src="player.avatar" class="chip-avatar-bg" />
                    
                    <span class="chip-num">{{ player.number }}</span>
                    <span class="chip-name">{{ player.name }}</span>
                    <span v-if="player.isCaptain" class="card-crown">
                      <svg viewBox="0 0 28 18" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 16 L2 8.5 L8.5 14 L14 1 L19.5 14 L26 8.5 L26 16 Z" fill="#fde68a" stroke="rgba(180,90,0,0.35)" stroke-width="0.6" stroke-linejoin="round"/>
                        <rect x="2" y="13.5" width="24" height="3.8" rx="1.2" fill="#f59e0b"/>
                        <rect x="2" y="13.5" width="24" height="1.4" rx="0.7" fill="#fef3c7" opacity="0.55"/>
                        <circle cx="8.5" cy="15.3" r="1.15" fill="#c084fc"/>
                        <circle cx="14" cy="15.3" r="1.45" fill="#f87171"/>
                        <circle cx="19.5" cy="15.3" r="1.15" fill="#c084fc"/>
                      </svg>
                    </span>
                    <!-- 2nd debate toggle (shown during speaking phases) -->
                    <button
                      v-if="dayStartSpeakerId"
                      class="chip-2nd-toggle"
                      :class="{
                        'is-active': daySecondDebateIds.has(player.id),
                        'is-locked': player.id === dayStartSpeakerId
                      }"
                      @click.stop="dayToggleSecondDebate(player.id)"
                      title="Deuxième tour de parole"
                    >2</button>
                    <span class="chip-state">
                      <span v-if="daySpeakerId === player.id" class="chip-live-dot" />
                      <svg v-else-if="dayOrderPhase === 'second-debate' ? daySecondDebateSpokenSet.has(player.id) : daySpokenSet.has(player.id)" class="chip-check" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </span>
                  </button>
                </div>
              </div>
              </template>

              <!-- ── Vote sub-phase ── -->
              <div v-if="dayOrderPhase === 'vote'" class="day-vote-area" style="position: relative;">

                <!-- Manual pick mode hint -->
                <Transition name="slide-up">
                  <div v-if="isManualPickMode && !dayManualPick" class="day-manual-pick-hint">
                    ☏ Cliquez sur un joueur pour le désigner comme condamné
                    <button @click="isManualPickMode = false; dayManualPick = null">Annuler</button>
                  </div>
                </Transition>
                <Transition name="slide-up">
                  <div v-if="dayManualPick" class="day-manual-pick-hint is-active">
                    ✋ <strong>{{ getPlayerById(dayManualPick)?.name }}</strong> désigné comme condamné
                    <button @click="dayManualPick = null; isManualPickMode = false">Annuler</button>
                  </div>
                </Transition>
                <!-- Narrator Abandon Panel -->
                <div v-if="showExecutePanel" class="narrator-exec-panel">
                  <div class="exec-panel-header">
                    <span class="exec-panel-title">⛔ Abandons</span>
                    <button class="btn-close" @click="showExecutePanel = false">✕</button>
                  </div>
                  
                  <div class="exec-panel-content">
                    <!-- Active players: click to mark as abandoned -->
                    <div class="exec-option">
                      <div class="exec-label">👤 Marquer un abandon</div>
                      <div class="exec-player-list">
                        <div
                          v-for="player in gameStore.alivePlayers.filter(p => !dayVoteDeaths.has(p.id) && !daySuicides.has(p.id))"
                          :key="player.id"
                          class="exec-player-row"
                        >
                          <span class="exec-row-name">{{ player.name }}</span>
                          <button
                            class="exec-suicide-btn"
                            @click="suicidePlayer(player.id)"
                            title="Marquer comme ayant abandonné"
                          >⛔</button>
                        </div>
                      </div>
                    </div>

                    <!-- Abandoned players: click to undo -->
                    <div v-if="daySuicides.size > 0" class="exec-option">
                      <div class="exec-label">↩ Annuler un abandon</div>
                      <div class="exec-player-list">
                        <div
                          v-for="pid in [...daySuicides]"
                          :key="pid"
                          class="exec-player-row is-abandoned-row"
                        >
                          <span class="exec-row-name">{{ gameStore.currentGame?.players.find(p => p.id === pid)?.name }}</span>
                          <button
                            class="exec-revive-btn"
                            @click="reviveSuicide(pid)"
                            title="Annuler l'abandon"
                          >↩</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="day-vote-grid">
                  <div 
                    v-for="player in gameStore.alivePlayers" 
                    :key="player.id" 
                    class="day-vote-card" 
                    :class="{ 
                      'has-avatar': player.avatar,
                      'is-condemned': dayManualPick ? dayManualPick === player.id : topVotePlayerIds.has(player.id),
                      'is-abandoned': daySuicides.has(player.id),
                      'is-dead': dayVoteDeaths.has(player.id),
                      'is-maire': player.isCaptain,
                      'is-candidate': dayRevoteCandidates.size > 0 && dayRevoteCandidates.has(player.id),
                      'is-non-voter': dayRevoteCandidates.size > 0 && !dayRevoteCandidates.has(player.id) && !dayVoteDeaths.has(player.id) && !daySuicides.has(player.id),
                      'is-pickable': isManualPickMode && !dayVoteDeaths.has(player.id) && !daySuicides.has(player.id) && !dayManualPick
                    }"
                    @click="isManualPickMode && !dayVoteDeaths.has(player.id) && !daySuicides.has(player.id) && !dayManualPick ? (dayManualPick = player.id, isManualPickMode = false) : null"
                  >
                    <img v-if="player.avatar" :src="player.avatar" class="day-vote-avatar-bg" />
                    <span v-if="voteTally[player.id]" class="day-vote-against" :class="{ 'is-defense': (voteTally[player.id] || 0) >= 2 }">{{ voteTally[player.id] }}</span>
                    
                    <!-- Condemned mark: manual pick > revote candidate > normal tally -->
                    <div v-if="dayManualPick === player.id" class="condemned-bar is-manual">
                      <span class="condemned-label">DÉSIGNÉ</span>
                    </div>
                    <div v-else-if="dayRevoteCandidates.size > 0 && dayRevoteCandidates.has(player.id)" class="condemned-bar is-candidate-bar" :class="{ 'is-tie': isVoteTie && topVotePlayerIds.has(player.id), 'is-condemned-now': topVotePlayerIds.has(player.id) }">
                      <span class="condemned-label">{{ topVotePlayerIds.has(player.id) ? (isVoteTie ? 'ÉGALITÉ' : 'CONDAMNÉ') : 'CANDIDAT' }}</span>
                    </div>
                    <div v-else-if="topVotePlayerIds.has(player.id)" class="condemned-bar" :class="{ 'is-tie': isVoteTie }">
                      <span class="condemned-label">{{ isVoteTie ? 'ÉGALITÉ' : 'CONDAMNÉ' }}</span>
                    </div>
                    <div v-if="daySuicides.has(player.id)" class="abandoned-overlay" @click="reviveSuicide(player.id)" title="Cliquer pour annuler l'abandon">
                      <span>🚪</span>
                    </div>
                    <div v-if="dayVoteDeaths.has(player.id)" class="dead-overlay">
                      <span>💈</span>
                    </div>
                    
                    <span v-if="player.isCaptain" class="card-crown">
                      <svg viewBox="0 0 28 18" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 16 L2 8.5 L8.5 14 L14 1 L19.5 14 L26 8.5 L26 16 Z" fill="#fde68a" stroke="rgba(180,90,0,0.35)" stroke-width="0.6" stroke-linejoin="round"/>
                        <rect x="2" y="13.5" width="24" height="3.8" rx="1.2" fill="#f59e0b"/>
                        <rect x="2" y="13.5" width="24" height="1.4" rx="0.7" fill="#fef3c7" opacity="0.55"/>
                        <circle cx="8.5" cy="15.3" r="1.15" fill="#c084fc"/>
                        <circle cx="14" cy="15.3" r="1.45" fill="#f87171"/>
                        <circle cx="19.5" cy="15.3" r="1.15" fill="#c084fc"/>
                      </svg>
                    </span>
                    <div class="day-vote-player">
                      <span class="day-vote-num">{{ player.number }}</span>
                      <span class="day-vote-name">{{ player.name }}</span>
                      <span v-if="player.isCaptain && dayVoteRound === 1" class="day-vote-x2">×2</span>
                    </div>
                    <select v-model="votes[player.id]" class="day-vote-select" :disabled="dayVoteDeaths.has(player.id) || daySuicides.has(player.id) || (dayRevoteCandidates.size > 0 && dayRevoteCandidates.has(player.id))">
                      <option value="">— Vote —</option>
                      <option value="blanc">🤍 Vote blanc</option>
                      <option
                        v-for="target in gameStore.alivePlayers.filter(t =>
                          dayRevoteCandidates.size > 0
                            ? (dayRevoteCandidates.has(t.id) && !dayVoteDeaths.has(t.id) && !daySuicides.has(t.id))
                            : (t.id !== player.id && !dayVoteDeaths.has(t.id) && !daySuicides.has(t.id))
                        )"
                        :key="target.id"
                        :value="target.id"
                      >
                        {{ target.number }}. {{ target.name }}
                      </option>
                    </select>
                  </div>
                </div>
                
              </div>

            </div>

            <!-- Footer -->
            <div class="day-footer">
              <button v-if="dayOrderPhase !== 'vote'" class="day-nav-btn back" @click="backToPreviousNight" :disabled="isTransitioning">← Nuit précédente</button>
              <button v-if="dayOrderPhase === 'vote'" class="day-nav-btn back" @click="backToSpeaking" :disabled="isTransitioning">← Retour parole</button>
              <button class="day-nav-btn night" :class="{ 'night-confirm': nightConfirmPending }" @click="handleNightTransition" :disabled="isTransitioning">{{ nightConfirmPending ? '⚠️ Confirmer ?' : '🌙 Nuit suivante' }}</button>
              <button v-if="dayOrderPhase !== 'vote'" class="day-nav-btn vote" @click="enterVoteSubPhase" :disabled="isTransitioning">🗳️ Passage au vote</button>
            </div>

          </div>
        </Transition>

        <!-- ═══ Night Phase ═══ -->
        <Transition :name="phaseTransitionName" mode="out-in">
          <div v-if="gameStore.currentPhase === 'NIGHT'" key="night-interface" class="first-night-interface">
            <div class="fn-layout">
              <!-- Left: Role Action List -->
              <div class="fn-roles-panel">
                <div class="fn-header">
                  <div class="fn-header-icon">🐺</div>
                  <div>
                    <h2 class="fn-title">Nuit {{ gameStore.currentGame?.nightNumber }}</h2>
                    <p class="fn-subtitle">Réveillez les rôles dans l'ordre nocturne</p>
                  </div>
                  <div class="fn-progress">
                    <span class="fn-progress-num">{{ Object.values(nightPhaseDone).filter(Boolean).length }}</span>
                    <span class="fn-progress-sep">/</span>
                    <span class="fn-progress-total">{{ nightRoles.length }}</span>
                    <span class="fn-progress-label">actions</span>
                  </div>
                </div>

                <div class="fn-roles-list">
                  <div
                    v-for="role in nightRoles"
                    :key="role._id"
                    class="fn-role-row"
                    :class="{ done: nightPhaseDone[role._id] }"
                  >
                    <div class="fn-role-info">
                      <div class="fn-player-avatar" :class="{ 'has-image': getPlayerByRoleId(role._id)?.avatar }">
                        <img v-if="getPlayerByRoleId(role._id)?.avatar" :src="getPlayerByRoleId(role._id)!.avatar" :alt="getPlayerByRoleId(role._id)?.name" class="fn-avatar-img" />
                        <span v-else class="fn-avatar-initial">{{ (getPlayerByRoleId(role._id)?.name || '?').charAt(0).toUpperCase() }}</span>
                      </div>
                      <div class="fn-role-name-wrap">
                        <span class="fn-role-name">{{ role.name }}</span>
                        <span class="fn-role-player">{{ getPlayerByRoleId(role._id)?.name || '—' }}</span>
                      </div>
                    </div>
                    <select
                      v-model="nightPhaseActions[role._id]"
                      class="fn-target-select"
                      :disabled="nightPhaseDone[role._id]"
                    >
                      <option value="">— Pas de cible —</option>
                      <option
                        v-for="p in gameStore.alivePlayers"
                        :key="p.id"
                        :value="p.id"
                      >{{ p.number }}. {{ p.name }}</option>
                    </select>
                    <button
                      class="fn-done-btn"
                      :class="{ checked: nightPhaseDone[role._id] }"
                      @click="nightPhaseDone[role._id] = !nightPhaseDone[role._id]"
                    >
                      <span v-if="nightPhaseDone[role._id]">✓</span>
                      <span v-else>○</span>
                    </button>
                  </div>

                  <div v-if="nightRoles.length === 0" class="fn-empty">
                    <span>🌙</span>
                    <p>Aucun rôle nocturne assigné</p>
                  </div>
                </div>

                <div class="fn-footer">
                  <button
                    class="fn-btn-back"
                    @click="backToVoteSubPhase"
                    :disabled="isTransitioning"
                  >
                    ← Retour au Vote
                  </button>
                  <button
                    class="fn-btn-day"
                    @click="finishNight"
                    :disabled="isTransitioning"
                  >
                    <span v-if="!isTransitioning">☀️ Fin de la Nuit</span>
                    <span v-else class="loading-with-spinner"><span class="spinner"></span> Transition...</span>
                  </button>
                </div>
              </div>

              <!-- Right: Night Log -->
              <div class="fn-log-panel">
                <div class="fn-log-header">
                  <span>📓 Journal de Nuit</span>
                </div>
                <div class="fn-log-entries">
                  <div v-for="(entry, i) in nightPhaseLog" :key="i" class="fn-log-entry">
                    <span class="fn-log-icon">{{ entry.icon }}</span>
                    <div class="fn-log-text">
                      <span class="fn-log-role">{{ entry.roleName }}</span>
                      <span class="fn-log-arrow">→</span>
                      <span class="fn-log-target">{{ entry.targetName }}</span>
                    </div>
                  </div>
                  <div v-if="nightPhaseLog.length === 0" class="fn-log-empty">Aucune action enregistrée</div>
                </div>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Main Game Grid (Hidden during SETUP, CONFIRMATION, Captain, FIRST_NIGHT, DAY and NIGHT phases) -->
        <div v-if="!['SETUP', 'CONFIRMATION', 'CAPTAIN_APPLICATION', 'CAPTAIN_SPIN', 'CAPTAIN_VOTE', 'FIRST_NIGHT', 'DAY', 'VOTE', 'NIGHT'].includes(gameStore.currentPhase)" class="game-grid">
          <!-- Left: Players Panel -->
          <section class="players-panel glass-card">
            <div class="panel-header">
              <h2 class="panel-title">👥 Joueurs</h2>
              <span class="player-count">{{ gameStore.aliveCount }} / {{ gameStore.playerCount }} en vie</span>
            </div>

            <div class="players-list">
              <div
                v-for="player in sortedPlayers"
                :key="player.id"
                class="player-card"
                :class="{ dead: !player.isAlive, captain: player.isCaptain, infected: player.isInfected }"
              >
                <div class="player-avatar" :class="{ dead: !player.isAlive }">
                  {{ player.name.charAt(0).toUpperCase() }}
                </div>
                <div class="player-info">
                  <span class="player-name">{{ player.name }}</span>
                  <div class="player-tags">
                    <span v-if="player.roleName" class="badge-violet">{{ player.roleName }}</span>
                    <span v-if="player.isCaptain" class="badge-captain">👑 Capitaine</span>
                    <span v-if="player.isInfected" class="badge-wolf">Infecté</span>
                    <span v-if="!player.isAlive" class="badge-dead">💀 Mort</span>
                  </div>
                </div>
                <div class="player-actions">
                  <button v-if="player.isAlive" class="btn-action kill" title="Tuer" @click="doAction('kill', player.id)">💀</button>
                  <button v-if="!player.isAlive" class="btn-action revive" title="Ressusciter" @click="doAction('revive', player.id)">✨</button>
                  <button v-if="player.isAlive && !player.isInfected" class="btn-action infect" title="Infecter" @click="doAction('infect', player.id)">🐺</button>
                  <button v-if="player.isAlive && !player.isCaptain" class="btn-action captain" title="Capitaine" @click="doAction('set_captain', player.id)">👑</button>
                </div>
              </div>
            </div>
          </section>

          <!-- Center: Phase Controls -->
          <section class="controls-panel">
            <!-- Phase Transition Controls -->
            <div class="glass-card phase-controls">
              <h2 class="panel-title">🎭 Contrôle de Phase</h2>
              <div class="transition-buttons">
                <button
                  v-for="target in availableTransitions"
                  :key="target"
                  class="transition-btn"
                  :class="getTransitionClass(target)"
                  @click="transitionTo(target)"
                >
                  <span class="transition-icon">{{ getPhaseIcon(target) }}</span>
                  <span>{{ formatPhase(target) }}</span>
                </button>
              </div>
            </div>

            <!-- Old Vote Panel removed — vote is now a sub-phase of DAY -->

            <!-- Night Panel (during NIGHT / FIRST_NIGHT) -->
            <div v-if="isNightPhase" class="glass-card night-panel">
              <h2 class="panel-title">🌙 Actions Nocturnes</h2>
              <p class="night-hint">Nuit {{ gameStore.currentGame.nightNumber }} — Exécuter les actions dans l'ordre</p>
              <div class="night-actions">
                <div v-for="(action, idx) in nightActions" :key="idx" class="night-action-row">
                  <input v-model="action.role" class="input" placeholder="Rôle" />
                  <input v-model="action.actor" class="input" placeholder="Acteur" />
                  <input v-model="action.target" class="input" placeholder="Cible" />
                  <input v-model="action.result" class="input" placeholder="Résultat" />
                  <button class="btn-ghost btn-sm" @click="nightActions.splice(idx, 1)">✕</button>
                </div>
                <button class="btn-ghost" @click="nightActions.push({ role: '', actor: '', target: '', result: '' })" style="width:100%">
                  + Ajouter une Action
                </button>
              </div>
              <div style="display:flex; gap:8px; margin-top:16px;">
                <button class="btn-ghost" @click="transitionTo('VOTE')" style="flex:0 0 auto; padding: 0 16px;">
                  ← Retour
                </button>
                <button class="btn-primary" @click="submitNightActions" style="flex:1;">
                  Confirmer la Nuit
                </button>
              </div>
            </div>

            <!-- Narrateur Override Panel -->
            <div class="glass-card override-panel">
              <h2 class="panel-title">⚡ Override Narrateur</h2>
              <div class="override-buttons">
                <button class="btn-danger" @click="forceEnd">Forcer la Fin</button>
                <button class="btn-ghost" @click="gameStore.fetchGame(gameStore.currentGame!._id)">Rafraîchir</button>
              </div>
            </div>
          </section>

          <!-- Right: Game Log -->
          <section class="log-panel glass-card">
            <div class="panel-header">
              <h2 class="panel-title">📜 Chronique</h2>
              <button class="btn-ghost btn-sm" @click="copyLogs">📋 Copier</button>
            </div>
            <div class="log-entries">
              <div
                v-for="(log, idx) in reversedLogs"
                :key="idx"
                class="log-entry"
                :class="log.type"
              >
                <span class="log-time">{{ formatTime(log.timestamp) }}</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
            </div>

            <!-- Story Export (when game ended) -->
            <button
              v-if="gameStore.currentPhase === 'END'"
              class="btn-primary"
              @click="exportStory"
              style="margin-top:16px; width:100%"
            >
              📜 Exporter l'Histoire
            </button>
          </section>
        </div>
      </template>

      <div v-else class="game-not-found">
        <span class="not-found-icon">🌙</span>
        <h2>Partie introuvable</h2>
        <NuxtLink to="/dashboard" class="btn-primary">Retour au Dashboard</NuxtLink>
      </div>

      <!-- Dawn Rise Overlay -->
      <Teleport to="body">
        <Transition name="dawnrise">
          <div v-if="showDawnRise" class="dawnrise-overlay">
            <div class="dawn-embers">
              <span v-for="i in 60" :key="i" class="ember" :style="{ left: Math.random() * 100 + '%', bottom: Math.random() * 50 + '%', animationDelay: Math.random() * 3 + 's', width: Math.random() * 3 + 1 + 'px', height: Math.random() * 3 + 1 + 'px' }" />
            </div>
            <div class="dawn-horizon-glow" />
            <div class="dawn-sun">🌅</div>
            <div class="dawn-text">
              <span class="dawn-title">L'Aube Se Lève...</span>
              <span class="dawn-sub">Jour {{ gameStore.currentGame?.dayNumber }}</span>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Death Reveal Overlay -->
      <Teleport to="body">
        <Transition name="death-reveal">
          <div v-if="showDeathReveal" class="death-reveal-overlay">
            <div class="dr-bg-particles">
              <span v-for="i in 30" :key="i" class="dr-particle" :style="{ left: (i * 3.3) + '%', animationDelay: (i * 0.1) + 's', animationDuration: (2 + (i % 4)) + 's' }" />
            </div>
            <div class="dr-header">
              <span class="dr-title-icon">⚰️</span>
              <h2 class="dr-title">Victimes du Jour</h2>
              <p class="dr-subtitle">{{ deathRevealList.length }} joueur{{ deathRevealList.length > 1 ? 's' : '' }} éliminé{{ deathRevealList.length > 1 ? 's' : '' }}</p>
            </div>
            <div class="dr-cards">
              <div
                v-for="(victim, i) in deathRevealList"
                :key="i"
                class="dr-card"
                :style="{ animationDelay: (i * 0.35) + 's' }"
              >
                <div class="dr-card-avatar" :class="{ 'has-img': victim.avatar }">
                  <img v-if="victim.avatar" :src="victim.avatar" :alt="victim.name" />
                  <span v-else>{{ victim.name.charAt(0).toUpperCase() }}</span>
                </div>
                <div class="dr-card-info">
                  <span class="dr-card-name">{{ victim.name }}</span>
                  <span class="dr-card-role">{{ victim.roleIcon }} {{ victim.roleName }}</span>
                </div>
                <div class="dr-skull">💀</div>
              </div>
            </div>
            <button class="dr-continue-btn" @click="dismissDeathReveal">
              Continuer →
            </button>
          </div>
        </Transition>
      </Teleport>

      <!-- Scan Selection Modal -->
      <Teleport to="body">
        <!-- Night Fall Overlay -->
        <Transition name="nightfall">
          <div v-if="showNightFall" class="nightfall-overlay">
            <div class="nightfall-stars">
              <span v-for="i in 80" :key="i" class="star" :style="{ left: Math.random() * 100 + '%', top: Math.random() * 100 + '%', animationDelay: Math.random() * 2 + 's', width: Math.random() * 3 + 1 + 'px', height: Math.random() * 3 + 1 + 'px' }" />
            </div>
            <div class="nightfall-moon">🌙</div>
            <div class="nightfall-text">
              <span class="nightfall-title">La Nuit Tombe...</span>
              <span class="nightfall-sub">Nuit {{ (gameStore.currentGame?.nightNumber || 0) + 1 }}</span>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Scan Selection Modal -->
      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="showScanModal" class="modal-overlay" @click="closeScanModal">
            <div class="modal-content scan-modal" @click.stop>
              <div class="modal-header">
                <h2 class="modal-title">👥 Sélectionner les Joueurs</h2>
                <button class="btn-close-modal" @click="closeScanModal">✕</button>
              </div>
              
              <div class="modal-body">
                <div class="modal-info">
                  <p>{{ scannedPlayers.length }} joueur(s) trouvé(s) dans le salon Discord</p>
                  <div class="modal-actions-top">
                    <button class="btn-secondary-sm" @click="selectAllPlayers">Tout sélectionner</button>
                    <button class="btn-secondary-sm" @click="deselectAllPlayers">Tout désélectionner</button>
                  </div>
                </div>

                <div class="scanned-players-list">
                  <div
                    v-for="player in scannedPlayers"
                    :key="player.discordId"
                    class="scanned-player-item"
                    :class="{ selected: selectedPlayerIds.has(player.discordId) }"
                    @click="togglePlayerSelection(player.discordId)"
                  >
                    <div class="player-select-check">
                      <Transition name="check-pop">
                        <span v-if="selectedPlayerIds.has(player.discordId)" class="check-icon">✓</span>
                      </Transition>
                    </div>
                    <div class="player-avatar-scan" :class="{ 'has-image': player.avatar }">
                      <img v-if="player.avatar" :src="player.avatar" :alt="player.displayName || player.username" />
                      <span v-else>{{ (player.displayName || player.username).charAt(0).toUpperCase() }}</span>
                    </div>
                    <div class="player-info-scan">
                      <div class="player-name-scan">{{ player.displayName || player.username }}</div>
                      <div class="player-username-scan">@{{ player.username }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="modal-footer">
                <button class="btn-ghost" @click="closeScanModal">Annuler</button>
                <button
                  class="btn-primary"
                  :disabled="selectedPlayerIds.size === 0"
                  @click="addSelectedPlayers"
                >
                  Ajouter {{ selectedPlayerIds.size }} joueur(s)
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import type { GameStatus } from '~/types'

const route = useRoute()
const gameStore = useGameStore()
const { success, error, warning, info, confirm } = useNotification()
const loading = ref(true)
const newPlayerName = ref('')
const votes = ref<Record<string, string>>({})
const nightActions = ref<{ role: string; actor: string; target: string; result: string }[]>([])

// Helper: get the vote draft for a specific day from the game's voteDrafts
function getVoteDraftForDay(game: any, day: number): Record<string, string> {
  const drafts = game?.voteDrafts
  if (!drafts) return {}
  const d = drafts[String(day)]
  return d && typeof d === 'object' && Object.keys(d).length ? { ...d } : {}
}

// Helper: get saved revote state for a specific day
function getRevoteStateForDay(game: any, day: number): any {
  return game?.voteRevoteState?.[String(day)] || null
}

// Helper: apply saved revote state to refs
function applyRevoteState(game: any, dayNum: number) {
  const rs = getRevoteStateForDay(game, dayNum)
  if (rs && rs.round > 1) {
    dayVoteRound.value = rs.round || 1
    dayVoteHistory.value = rs.history || []
    dayRevoteCandidates.value = new Set(rs.candidates || [])
    dayManualPick.value = rs.manualPick || null
  } else {
    dayVoteRound.value = 1
    dayVoteHistory.value = []
    dayRevoteCandidates.value = new Set()
    dayManualPick.value = null
  }
}

// Sanitize votes to ensure they're valid (remove votes from dead players, invalid targets)
function sanitizeVotes(voteData: Record<string, string>, game?: any): Record<string, string> {
  if (!game) return {}
  const sanitized: Record<string, string> = {}
  const alivePlayerIds = new Set(game.players?.filter((p: any) => p.isAlive).map((p: any) => p.id) || [])
  
  for (const [voterId, targetId] of Object.entries(voteData)) {
    // Only keep votes from alive players voting for alive targets
    if (alivePlayerIds.has(voterId) && alivePlayerIds.has(targetId) && voterId !== targetId) {
      sanitized[voterId] = targetId
    }
  }
  
  return sanitized
}

// Setup phase state - Smart Input
const smartInput = ref('')
const smartInputRef = ref<HTMLInputElement | null>(null)
const inputHint = ref('Entrez un nom, un ID utilisateur, ou un ID salon')
const inputType = ref<'name' | 'user' | 'channel'>('name')
const botAlive = ref(false)
const isProcessing = ref(false)
const isTransitioning = ref(false) // Loading state for phase transitions
const isNormalizingNames = ref(false) // Loading state for AI name normalization
const nightConfirmPending = ref(false) // Double-click confirm for night transition
let nightConfirmTimer: ReturnType<typeof setTimeout> | null = null
const playerRoles = ref<Record<string, string>>({}) // playerId -> roleId
const previousPlayerRoles = ref<Record<string, string>>({}) // Track previous state for swapping
const manualRoleAssignments = ref<Record<string, boolean>>({}) // Track which assignments are manual
const showRandomModes = ref(false) // Track if split button is expanded
const availableRoles = ref<any[]>([])
const roleQuantities = ref<Record<string, number>>({}) // roleId -> quantity
const roleSearchQuery = ref('')
let botCheckInterval: NodeJS.Timeout | null = null
let saveRolesTimeout: NodeJS.Timeout | null = null
let savePlayerRolesTimeout: NodeJS.Timeout | null = null
let saveManualAssignmentsTimeout: NodeJS.Timeout | null = null
let saveCaptainTimeout: NodeJS.Timeout | null = null
let saveFirstNightTimeout: NodeJS.Timeout | null = null
let saveNightPhaseTimeout: NodeJS.Timeout | null = null
let saveVoteDraftTimeout: NodeJS.Timeout | null = null
let isSavingPlayerRoles = false // Prevent overlapping saves

// Night fall + First Night
const showNightFall = ref(false)
const showDeathReveal = ref(false)
const deathRevealList = ref<Array<{name: string; avatar?: string; roleIcon: string; roleName: string}>>([])
let deathRevealResolve: (() => void) | null = null
function dismissDeathReveal() { deathRevealResolve?.(); deathRevealResolve = null }
const firstNightActions = ref<Record<string, string>>({})
const firstNightDone = ref<Record<string, boolean>>({})
const nightPhaseActions = ref<Record<string, string>>({})
const nightPhaseDone = ref<Record<string, boolean>>({})

// Day phase — single central timer
const showDawnRise = ref(false)
// Computed transition name — instant under overlay, reversed on back nav, normal forward
const phaseTransitionName = computed(() =>
  (showNightFall.value || showDawnRise.value) ? 'phase-instant'
    : isGoingBack.value ? 'phase-transition-back'
    : 'phase-transition'
)
const dayTimerDuration = ref(90)
const dayTimerRemaining = ref(90)
const dayTimerRunning = ref(false)
const daySpeakerId = ref<string | null>(null)
const daySpokenSet = ref<Set<string>>(new Set())
// Speaking order (new)
const dayStartSpeakerId = ref<string | null>(null)
const dayDirection = ref<'up' | 'down' | null>(null)
const dayOrderPhase = ref<'setup' | 'first-round' | 'second-debate' | 'vote'>('setup')
const daySecondDebateIds = ref<Set<string>>(new Set())
const daySecondDebateSpokenSet = ref<Set<string>>(new Set())
let timerInterval: ReturnType<typeof setInterval> | null = null

// Defense alert tracking
const defenseAlertData = ref<{ id: string; name: string; count: number; key: number } | null>(null)
let prevVoteCounts: Record<string, number> = {}

// Day vote death tracking
const dayVoteDeaths = ref<Set<string>>(new Set()) // Players killed during day vote phase
const daySuicides = ref<Set<string>>(new Set())   // Players who abandoned (not yet killed in DB — killed at night transition)
const showExecutePanel = ref(false) // Show narrator execution controls
const isGoingBack = ref(false)        // Directional flag for phase-transition animation
// Vote round tracking (for repeat votes on tie)
const dayVoteRound = ref(1)
const dayVoteHistory = ref<Array<{round: number, votes: Record<string, string>}>>([]) 
const dayManualPick = ref<string | null>(null)  // Narrator-designated condemned player
const isManualPickMode = ref(false)              // Click-to-pick mode active
const dayRevoteCandidates = ref<Set<string>>(new Set()) // Tied players forced as candidates in revote
const executeMode = ref<'vote' | 'manual' | 'suicide'>('vote') // Which execution mode
const selectedExecuteTargets = ref<Set<string>>(new Set()) // For manual execution

// Scan selection modal
const showScanModal = ref(false)
const scannedPlayers = ref<Array<{ discordId: string; username: string; displayName?: string; avatar: string }>>([])
const selectedPlayerIds = ref<Set<string>>(new Set())
const openNumberPicker = ref<string | null>(null) // Track which player's number picker is open

// Captain election state
const captainCandidates = ref<Set<string>>(new Set())
const captainVotes = ref<Record<string, string>>({}) // voterId -> candidateId
const captainElected = ref<string | null>(null)
const captainVoteRounds = ref<Array<{ label: string; votes: Record<string, string>; voterIds: string[] }>>([]) // archived rounds for copy log
const captainVoterFilter = ref<string[] | null>(null) // null = all non-candidates vote; non-null = only these IDs vote (loser captains)
const selectedVoter = ref<string | null>(null) // which voter's picker is open
const voteViewMode = ref<'circle' | 'table'>('table') // toggle between circle and table view

// Spin state
const spinTargetCount = ref(2) // how many candidates to keep after spin
const isSpinning = ref(false)
const spinHighlightIndex = ref(-1) // currently lit candidate index during spin
const spinResult = ref<Set<string>>(new Set()) // final selected candidates from spin
const spinCandidatesList = ref<string[]>([]) // frozen list of candidates when spin starts

// Auto-save captain election data
watch(captainCandidates, (newCandidates) => {
  if (!gameStore.currentGame || !['CAPTAIN_APPLICATION', 'CAPTAIN_VOTE', 'CAPTAIN_SPIN'].includes(gameStore.currentPhase)) return
  const gameId = gameStore.currentGame._id
  if (saveCaptainTimeout) clearTimeout(saveCaptainTimeout)
  saveCaptainTimeout = setTimeout(async () => {
    try {
      await $fetch(`/api/games/${gameId}/captain-election`, {
        method: 'PUT',
        body: { captainCandidates: Array.from(newCandidates) },
      })
    } catch (e) { console.error('Failed to save captain candidates:', e) }
  }, 300)
}, { deep: true })

watch(captainVotes, (newVotes) => {
  if (!gameStore.currentGame || !['CAPTAIN_VOTE', 'CAPTAIN_SPIN'].includes(gameStore.currentPhase)) return
  const gameId = gameStore.currentGame._id
  if (saveCaptainTimeout) clearTimeout(saveCaptainTimeout)
  saveCaptainTimeout = setTimeout(async () => {
    try {
      await $fetch(`/api/games/${gameId}/captain-election`, {
        method: 'PUT',
        body: { captainVotes: newVotes },
      })
    } catch (e) { console.error('Failed to save captain votes:', e) }
  }, 300)
}, { deep: true })

watch(captainVoteRounds, (newRounds) => {
  if (!gameStore.currentGame || !['CAPTAIN_APPLICATION', 'CAPTAIN_VOTE', 'CAPTAIN_SPIN'].includes(gameStore.currentPhase)) return
  const gameId = gameStore.currentGame._id
  try {
    $fetch(`/api/games/${gameId}/captain-election`, {
      method: 'PUT',
      body: { captainVoteRounds: newRounds },
    })
  } catch (e) { console.error('Failed to save captain vote rounds:', e) }
}, { deep: true })

// Auto-save first night progress
watch(firstNightActions, (newActions) => {
  if (!gameStore.currentGame || gameStore.currentPhase !== 'FIRST_NIGHT') return
  const gameId = gameStore.currentGame._id
  if (saveFirstNightTimeout) clearTimeout(saveFirstNightTimeout)
  saveFirstNightTimeout = setTimeout(async () => {
    try {
      await $fetch(`/api/games/${gameId}/first-night-state`, {
        method: 'PUT',
        body: { firstNightActions: newActions },
      })
    } catch (e) { console.error('Failed to save first night actions:', e) }
  }, 400)
}, { deep: true })

watch(firstNightDone, (newDone) => {
  if (!gameStore.currentGame || gameStore.currentPhase !== 'FIRST_NIGHT') return
  const gameId = gameStore.currentGame._id
  if (saveFirstNightTimeout) clearTimeout(saveFirstNightTimeout)
  saveFirstNightTimeout = setTimeout(async () => {
    try {
      await $fetch(`/api/games/${gameId}/first-night-state`, {
        method: 'PUT',
        body: { firstNightDone: newDone },
      })
    } catch (e) { console.error('Failed to save first night done:', e) }
  }, 400)
}, { deep: true })

watch(nightPhaseActions, (newActions) => {
  if (!gameStore.currentGame || gameStore.currentPhase !== 'NIGHT') return
  const gameId = gameStore.currentGame._id
  if (saveNightPhaseTimeout) clearTimeout(saveNightPhaseTimeout)
  saveNightPhaseTimeout = setTimeout(async () => {
    try {
      await $fetch(`/api/games/${gameId}/night-phase-state`, {
        method: 'PUT',
        body: { nightPhaseActions: newActions },
      })
    } catch (e) { console.error('Failed to save night phase actions:', e) }
  }, 400)
}, { deep: true })

watch(nightPhaseDone, (newDone) => {
  if (!gameStore.currentGame || gameStore.currentPhase !== 'NIGHT') return
  const gameId = gameStore.currentGame._id
  if (saveNightPhaseTimeout) clearTimeout(saveNightPhaseTimeout)
  saveNightPhaseTimeout = setTimeout(async () => {
    try {
      await $fetch(`/api/games/${gameId}/night-phase-state`, {
        method: 'PUT',
        body: { nightPhaseDone: newDone },
      })
    } catch (e) { console.error('Failed to save night phase done:', e) }
  }, 400)
}, { deep: true })

watch(votes, () => {
  triggerVoteStateSave()
}, { deep: true })

// Also save revote state when any of the revote refs change
watch(
  [dayVoteRound, dayVoteHistory, dayRevoteCandidates, dayManualPick],
  () => { triggerVoteStateSave() },
  { deep: true }
)

function triggerVoteStateSave() {
  if (!gameStore.currentGame || (gameStore.currentPhase !== 'VOTE' && dayOrderPhase.value !== 'vote')) return
  const gameId = gameStore.currentGame._id
  const dayNum = gameStore.currentGame.dayNumber || 1
  if (saveVoteDraftTimeout) clearTimeout(saveVoteDraftTimeout)
  saveVoteDraftTimeout = setTimeout(async () => {
    try {
      await $fetch(`/api/games/${gameId}/vote-draft`, {
        method: 'PUT',
        body: {
          voteDraft: votes.value,
          dayNumber: dayNum,
          revoteState: {
            round: dayVoteRound.value,
            history: dayVoteHistory.value,
            candidates: [...dayRevoteCandidates.value],
            manualPick: dayManualPick.value,
          },
        },
      })
    } catch (e) { console.error('Failed to save vote state:', e) }
  }, 400)
}

// Auto-save role selections
watch(roleQuantities, async (newQuantities) => {
  if (!gameStore.currentGame || gameStore.currentPhase !== 'SETUP') return
  
  const gameId = gameStore.currentGame._id
  
  // Debounce saves
  if (saveRolesTimeout) clearTimeout(saveRolesTimeout)
  
  saveRolesTimeout = setTimeout(async () => {
    try {
      await $fetch(`/api/games/${gameId}/selected-roles`, {
        method: 'PUT',
        body: { selectedRoles: newQuantities },
      })
    } catch (error) {
      console.error('Failed to save role selections:', error)
    }
  }, 2000)
}, { deep: true })

// Auto-save player role assignments
watch(playerRoles, async (newAssignments) => {
  if (!gameStore.currentGame || gameStore.currentPhase !== 'SETUP') return
  
  // Debounce saves
  if (savePlayerRolesTimeout) clearTimeout(savePlayerRolesTimeout)
  
  savePlayerRolesTimeout = setTimeout(async () => {
    // Skip if already saving to prevent conflicts
    if (isSavingPlayerRoles) {
      console.log('[Auto-save] Skipping overlapping save')
      return
    }
    
    try {
      isSavingPlayerRoles = true
      
      const players = gameStore.currentGame!.players.map(player => {
        const roleId = newAssignments[player.id]
        const role = roleId ? availableRoles.value.find(r => r._id === roleId) : null
        return {
          ...player,
          roleId: roleId || undefined,
          roleName: role?.name || undefined,
          roleTeam: role?.team || undefined,
          roleIsUnique: role?.isUnique || false,
        }
      })
      
      await gameStore.updatePlayers(players)
    } catch (error: any) {
      console.error('Failed to save player role assignments:', error)
      // If it's a 409 conflict, the server will retry automatically
      if (error?.statusCode !== 409) {
        console.error('Non-conflict error:', error)
      }
    } finally {
      isSavingPlayerRoles = false
    }
  }, 2500) // Increased debounce to reduce save frequency
}, { deep: true })

// Auto-save manual role assignments tracking
watch(manualRoleAssignments, async (newAssignments) => {
  if (!gameStore.currentGame || gameStore.currentPhase !== 'SETUP') return
  
  const gameId = gameStore.currentGame._id
  
  // Debounce saves
  if (saveManualAssignmentsTimeout) clearTimeout(saveManualAssignmentsTimeout)
  
  saveManualAssignmentsTimeout = setTimeout(async () => {
    try {
      await $fetch(`/api/games/${gameId}/manual-assignments`, {
        method: 'PUT',
        body: { manualRoleAssignments: newAssignments },
      })
    } catch (error) {
      console.error('Failed to save manual role assignments:', error)
    }
  }, 500)
}, { deep: true })

// Watch for phase changes to reload setup data when returning from confirmation
watch(() => gameStore.currentPhase, async (newPhase, oldPhase) => {
  // When returning to SETUP from CONFIRMATION, reload all setup data
  if (newPhase === 'SETUP' && oldPhase === 'CONFIRMATION') {
    await loadSetupData()
    // Restart bot status checking when entering SETUP
    startBotStatusCheck()
  }
  
  // Stop bot status checking when leaving SETUP
  if (oldPhase === 'SETUP' && newPhase !== 'SETUP') {
    if (botCheckInterval) {
      clearInterval(botCheckInterval)
      botCheckInterval = null
    }
  }

  // Restore saved night phase state when entering NIGHT phase
  if (newPhase === 'NIGHT') {
    if (oldPhase === 'DAY') {
      // Going backward: restore saved state
      await gameStore.fetchGame(gameStore.currentGame!._id)
      const game = gameStore.currentGame
      if (game?.nightPhaseActions && Object.keys(game.nightPhaseActions).length) {
        nightPhaseActions.value = { ...game.nightPhaseActions }
      }
      if (game?.nightPhaseDone && Object.keys(game.nightPhaseDone).length) {
        nightPhaseDone.value = { ...game.nightPhaseDone }
      }
    } else {
      // Going forward (from VOTE): start a fresh night
      nightPhaseActions.value = {}
      nightPhaseDone.value = {}
    }
  }

  // Restore saved first night state when entering FIRST_NIGHT phase
  if (newPhase === 'FIRST_NIGHT') {
    await gameStore.fetchGame(gameStore.currentGame!._id)
    const game = gameStore.currentGame
    if (game?.firstNightActions && Object.keys(game.firstNightActions).length) {
      firstNightActions.value = { ...game.firstNightActions }
    }
    if (game?.firstNightDone && Object.keys(game.firstNightDone).length) {
      firstNightDone.value = { ...game.firstNightDone }
    }
  }
})

// Valid transitions map
const VALID_TRANSITIONS: Record<string, string[]> = {
  SETUP: ['CAPTAIN_APPLICATION', 'FIRST_NIGHT', 'END'],
  CAPTAIN_APPLICATION: ['CONFIRMATION', 'CAPTAIN_VOTE', 'CAPTAIN_SPIN', 'END'],
  CAPTAIN_SPIN: ['CAPTAIN_VOTE', 'END'],
  CAPTAIN_VOTE: ['CAPTAIN_APPLICATION', 'FIRST_NIGHT', 'END'],
  FIRST_NIGHT: ['CAPTAIN_VOTE', 'DAY'],
  DAY: ['VOTE', 'NIGHT', 'END'],
  VOTE: ['DAY', 'NIGHT', 'FIRST_NIGHT', 'END'],
  NIGHT: ['DAY', 'VOTE', 'END'],
  END: ['SETUP'],
}

// Load setup data (roles, player assignments, deck)
async function loadSetupData() {
  if (!gameStore.currentGame) return
  
  await fetchAvailableRoles()
  
  // Load saved role selections
  if (gameStore.currentGame.selectedRoles) {
    roleQuantities.value = { ...gameStore.currentGame.selectedRoles }
  }
  
  // Load saved player role assignments
  if (gameStore.currentGame.players) {
    const assignments: Record<string, string> = {}
    for (const player of gameStore.currentGame.players) {
      if (player.roleId) {
        assignments[player.id] = player.roleId
      }
    }
    playerRoles.value = assignments
    previousPlayerRoles.value = { ...assignments }
  }
  
  // Load saved manual role assignments tracking
  if (gameStore.currentGame.manualRoleAssignments) {
    manualRoleAssignments.value = { ...gameStore.currentGame.manualRoleAssignments }
  }
}

// Watch route changes to refresh bot status and game data
watch(() => route.params.id, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    await gameStore.fetchGame(newId as string)
    // Refresh bot status immediately when navigating back (non-blocking)
    if (gameStore.currentPhase === 'SETUP') {
      checkBotStatus() // Don't await - let it run in background
    }
  }
})

onMounted(async () => {
  const id = route.params.id as string
  await gameStore.fetchGame(id)
  loading.value = false
  
  // Start bot status checking if in SETUP phase
  if (gameStore.currentPhase === 'SETUP') {
    startBotStatusCheck()
  }

  // Always load roles + player assignments (needed for night roles, grimoire, etc.)
  if (gameStore.currentPhase !== 'END') {
    await loadSetupData()
  }

  // Restore captain election state from server
  if (['CAPTAIN_APPLICATION', 'CAPTAIN_VOTE', 'CAPTAIN_SPIN'].includes(gameStore.currentPhase)) {
    const game = gameStore.currentGame
    if (game?.captainCandidates?.length) {
      captainCandidates.value = new Set(game.captainCandidates)
    }
    if (game?.captainVotes && Object.keys(game.captainVotes).length) {
      captainVotes.value = { ...game.captainVotes }
    }
    // Restore vote rounds history
    if (game?.captainVoteRounds?.length) {
      captainVoteRounds.value = game.captainVoteRounds.map(r => ({
        label: r.label,
        votes: { ...r.votes },
        voterIds: [...r.voterIds],
      }))
    }
    // Restore voter filter (captains-vote mode)
    if (game?.captainVoterFilter?.length) {
      captainVoterFilter.value = [...game.captainVoterFilter]
    } else {
      captainVoterFilter.value = null
    }
    // Restore spin state if a spin was completed but not yet applied
    if (game?.spinCandidates?.length && game?.spinResult?.length) {
      spinCandidatesList.value = [...game.spinCandidates]
      spinResult.value = new Set(game.spinResult)
      isSpinning.value = false
      spinHighlightIndex.value = -1
    }
      // Restore elected captain
      if (game?.captainId) {
        captainElected.value = game.captainId
      } else {
        captainElected.value = null
      }
  }

  // Restore first night progress
  if (gameStore.currentPhase === 'FIRST_NIGHT') {
    const game = gameStore.currentGame
    if (game?.firstNightActions && Object.keys(game.firstNightActions).length) {
      firstNightActions.value = { ...game.firstNightActions }
    }
    if (game?.firstNightDone && Object.keys(game.firstNightDone).length) {
      firstNightDone.value = { ...game.firstNightDone }
    }
  }

  // Restore vote draft if already in VOTE phase
  if (gameStore.currentPhase === 'VOTE') {
    dayOrderPhase.value = 'vote'
    const game = gameStore.currentGame
    const dayNum = game?.dayNumber || 1
    const draft = getVoteDraftForDay(game, dayNum)
    votes.value = Object.keys(draft).length ? draft : {}
    applyRevoteState(game, dayNum)
  }

  // Restore vote draft if in DAY phase with saved draft (vote sub-phase)
  if (gameStore.currentPhase === 'DAY') {
    const game = gameStore.currentGame
    const dayNum = game?.dayNumber || 1
    const draft = getVoteDraftForDay(game, dayNum)
    if (Object.keys(draft).length) {
      votes.value = draft
      dayOrderPhase.value = 'vote'
      applyRevoteState(game, dayNum)
    } else {
      votes.value = {}
    }
  }

  // Restore night phase progress
  if (gameStore.currentPhase === 'NIGHT') {
    const game = gameStore.currentGame
    if (game?.nightPhaseActions && Object.keys(game.nightPhaseActions).length) {
      nightPhaseActions.value = { ...game.nightPhaseActions }
    }
    if (game?.nightPhaseDone && Object.keys(game.nightPhaseDone).length) {
      nightPhaseDone.value = { ...game.nightPhaseDone }
    }
  }
})

onUnmounted(() => {
  if (botCheckInterval) {
    clearInterval(botCheckInterval)
  }
  if (timerInterval) clearInterval(timerInterval)
  if (saveCaptainTimeout) clearTimeout(saveCaptainTimeout)
  if (saveFirstNightTimeout) clearTimeout(saveFirstNightTimeout)
  if (saveNightPhaseTimeout) clearTimeout(saveNightPhaseTimeout)
  if (saveVoteDraftTimeout) clearTimeout(saveVoteDraftTimeout)
  if (saveRolesTimeout) {
    clearTimeout(saveRolesTimeout)
  }
  if (savePlayerRolesTimeout) {
    clearTimeout(savePlayerRolesTimeout)
  }
  if (saveCaptainTimeout) {
    clearTimeout(saveCaptainTimeout)
  }
  if (saveManualAssignmentsTimeout) {
    clearTimeout(saveManualAssignmentsTimeout)
  }
})

const phaseClass = computed(() => {
  const p = gameStore.currentPhase
  if (p.includes('NIGHT') || p === 'FIRST_NIGHT') return 'night'
  if (p === 'DAY' || p === 'VOTE') return 'day'
  if (p === 'END') return 'end'
  return 'setup'
})

const phaseIcon = computed(() => getPhaseIcon(gameStore.currentPhase))

const isNightPhase = computed(() =>
  gameStore.currentPhase === 'NIGHT' || gameStore.currentPhase === 'FIRST_NIGHT'
)

const nightRoles = computed(() => {
  if (!gameStore.currentGame) return []
  // Only show roles assigned to ALIVE players
  const alivePlayerIds = new Set(gameStore.alivePlayers.map((p: any) => p.id))
  const assignedToAliveRoleIds = new Set(
    Object.entries(playerRoles.value)
      .filter(([playerId]) => alivePlayerIds.has(playerId))
      .map(([, roleId]) => roleId)
  )
  return availableRoles.value
    .filter((r: any) => r.hasNightAction && assignedToAliveRoleIds.has(r._id))
    .sort((a: any, b: any) => a.nightOrder - b.nightOrder)
})

const firstNightLog = computed(() => {
  return nightRoles.value
    .filter((r: any) => firstNightDone.value[r._id] && firstNightActions.value[r._id])
    .map((r: any) => ({
      icon: r.icon || (r.team === 'WOLF' ? '🐺' : '🏘️'),
      roleName: r.name,
      targetName: gameStore.alivePlayers.find((p: any) => p.id === firstNightActions.value[r._id])?.name || '—',
    }))
})

const nightPhaseLog = computed(() => {
  return nightRoles.value
    .filter((r: any) => nightPhaseDone.value[r._id] && nightPhaseActions.value[r._id])
    .map((r: any) => ({
      icon: r.icon || (r.team === 'WOLF' ? '🐺' : '🏘️'),
      roleName: r.name,
      targetName: gameStore.alivePlayers.find((p: any) => p.id === nightPhaseActions.value[r._id])?.name || '—',
    }))
})

const inputPlaceholder = computed(() => {
  if (inputType.value === 'name') return 'Ex: Jean Dupont'
  if (inputType.value === 'user') return 'Ex: 123456789012345678'
  return 'Ex: 987654321098765432'
})

const addButtonIcon = computed(() => {
  if (inputType.value === 'name') return '+'
  if (inputType.value === 'user') return '🆔'
  return '🔍'
})

// Player and role counts
const playerCount = computed(() => gameStore.currentGame?.players.length || 0)

const totalRoleCount = computed(() => {
  return Object.values(roleQuantities.value).reduce((sum, qty) => sum + qty, 0)
})

// Expand roles with quantities into a flat array for deck display
const expandedDeckRoles = computed(() => {
  const expanded: Array<{ roleId: string; name: string; index: number }> = []
  
  // Get all role IDs with quantities
  const quantities = roleQuantities.value
  const roleIds = Object.keys(quantities).filter(id => (quantities[id] || 0) > 0)
  
  // Sort by team hierarchy
  const sortedIds = roleIds.sort((a, b) => {
    const roleA = availableRoles.value.find(r => r._id === a)
    const roleB = availableRoles.value.find(r => r._id === b)
    
    const teamOrder = { WOLF: 0, VILLAGER: 1, NEUTRAL: 2 }
    const orderA = teamOrder[roleA?.team as keyof typeof teamOrder] ?? 3
    const orderB = teamOrder[roleB?.team as keyof typeof teamOrder] ?? 3
    
    if (orderA !== orderB) return orderA - orderB
    return (roleA?.name || '').localeCompare(roleB?.name || '')
  })
  
  // Expand each role based on its quantity
  for (const roleId of sortedIds) {
    const role = availableRoles.value.find(r => r._id === roleId)
    const quantity = quantities[roleId] || 0
    
    for (let i = 0; i < quantity; i++) {
      expanded.push({
        roleId,
        name: role?.name || 'Unknown',
        index: i
      })
    }
  }
  
  return expanded
})

// Map deck entries to assigned players
const deckEntryPlayers = computed(() => {
  const playersByRole: Record<string, any[]> = {}
  
  // Group players by their assigned roleId
  if (gameStore.currentGame?.players) {
    for (const player of gameStore.currentGame.players) {
      const assignedRoleId = playerRoles.value[player.id]
      if (assignedRoleId) {
        if (!playersByRole[assignedRoleId]) {
          playersByRole[assignedRoleId] = []
        }
        playersByRole[assignedRoleId].push(player)
      }
    }
  }
  
  // Map each deck entry to its assigned player
  const mapping: Record<number, any> = {}
  const usedIndexByRole: Record<string, number> = {}
  
  expandedDeckRoles.value.forEach((entry, deckIndex) => {
    const players = playersByRole[entry.roleId] || []
    const roleIndex = usedIndexByRole[entry.roleId] || 0
    
    if (players[roleIndex]) {
      mapping[deckIndex] = players[roleIndex]
    }
    
    usedIndexByRole[entry.roleId] = roleIndex + 1
  })
  
  return mapping
})

// Check if all players have roles assigned
const allPlayersHaveRoles = computed(() => {
  if (!gameStore.currentGame?.players.length) return false
  return gameStore.currentGame.players.every(player => {
    return playerRoles.value[player.id] && playerRoles.value[player.id] !== ''
  })
})

// Check if all players have numbers assigned
const allPlayersHaveNumbers = computed(() => {
  if (!gameStore.currentGame?.players.length) return false
  return gameStore.currentGame.players.every(player => player.number && player.number > 0)
})

// Check if any role has more players assigned than available quantity
const roleAssignmentsValid = computed(() => {
  const roleUsage: Record<string, number> = {}
  
  // Count how many players are assigned to each role
  for (const roleId of Object.values(playerRoles.value)) {
    if (roleId) {
      roleUsage[roleId] = (roleUsage[roleId] || 0) + 1
    }
  }
  
  // Check if any role has more players than its quantity
  for (const [roleId, count] of Object.entries(roleUsage)) {
    const availableQuantity = roleQuantities.value[roleId] || 0
    if (count > availableQuantity) {
      return false
    }
  }
  
  return true
})

// Validation state for starting game
const canStartGame = computed(() => {
  return playerCount.value > 0 && totalRoleCount.value > 0 && playerCount.value === totalRoleCount.value && allPlayersHaveRoles.value && allPlayersHaveNumbers.value && roleAssignmentsValid.value && !hasDuplicateNumbers.value
})

// Check if random assignment is possible
const canRandomAssign = computed(() => {
  if (!gameStore.currentGame?.players.length) return false
  if (totalRoleCount.value === 0) return false
  if (playerCount.value !== totalRoleCount.value) return false
  
  // Allow randomization as long as basic requirements are met
  // The randomAssignRoles function will handle mode-specific validation
  return true
})

// Sort players by number
const sortedPlayers = computed(() => {
  if (!gameStore.currentGame?.players) return []
  return [...gameStore.currentGame.players].sort((a, b) => {
    const numA = a.number || 999
    const numB = b.number || 999
    return numA - numB
  })
})

// Detect duplicate player numbers
const duplicateNumbers = computed(() => {
  if (!gameStore.currentGame?.players) return new Set<number>()
  const numbers: number[] = []
  const duplicates = new Set<number>()
  
  gameStore.currentGame.players.forEach(player => {
    if (player.number) {
      if (numbers.includes(player.number)) {
        duplicates.add(player.number)
      } else {
        numbers.push(player.number)
      }
    }
  })
  
  return duplicates
})

const hasDuplicateNumbers = computed(() => {
  return duplicateNumbers.value.size > 0
})

// Group players by team for confirmation screen
const playersByTeam = computed(() => {
  if (!gameStore.currentGame?.players) return { WOLF: [], VILLAGER: [], NEUTRAL: [] }
  
  const groups: { WOLF: any[], VILLAGER: any[], NEUTRAL: any[] } = {
    WOLF: [],
    VILLAGER: [],
    NEUTRAL: []
  }
  
  sortedPlayers.value.forEach(player => {
    // Use the roleTeam field saved with the player
    if (player.roleTeam === 'WOLF') {
      groups.WOLF.push(player)
    } else if (player.roleTeam === 'VILLAGER') {
      groups.VILLAGER.push(player)
    } else {
      // Players without roles or with neutral roles
      groups.NEUTRAL.push(player)
    }
  })
  
  // Sort each team: unique roles first, non-unique roles last
  const sortByRoleUniqueness = (a: any, b: any) => {
    // Use roleIsUnique field stored on player
    const isUniqueA = a.roleIsUnique ? 1 : 0
    const isUniqueB = b.roleIsUnique ? 1 : 0
    
    // Unique roles (1) come before non-unique (0), so we sort descending
    return isUniqueB - isUniqueA
  }
  
  groups.WOLF.sort(sortByRoleUniqueness)
  groups.VILLAGER.sort(sortByRoleUniqueness)
  groups.NEUTRAL.sort(sortByRoleUniqueness)
  
  return groups
})

const validationState = computed(() => {
  if (playerCount.value === 0) {
    return { icon: '⚠️', message: 'Ajoutez des joueurs', class: 'validation-warning' }
  }
  if (totalRoleCount.value === 0) {
    return { icon: '⚠️', message: 'Sélectionnez des rôles', class: 'validation-warning' }
  }
  if (playerCount.value < totalRoleCount.value) {
    return { icon: '❌', message: 'Pas assez de joueurs', class: 'validation-error' }
  }
  if (playerCount.value > totalRoleCount.value) {
    return { icon: '❌', message: 'Pas assez de rôles', class: 'validation-error' }
  }
  if (!allPlayersHaveRoles.value) {
    return { icon: '❌', message: 'Tous les joueurs doivent avoir un rôle', class: 'validation-error' }
  }
  if (!roleAssignmentsValid.value) {
    return { icon: '❌', message: 'Trop de joueurs assignés à un rôle', class: 'validation-error' }
  }
  if (!allPlayersHaveNumbers.value) {
    return { icon: '❌', message: 'Chaque joueur doit avoir un numéro', class: 'validation-error' }
  }
  if (hasDuplicateNumbers.value) {
    return { icon: '❌', message: 'Deux joueurs ont le même numéro', class: 'validation-error' }
  }
  return { icon: '✅', message: 'Prêt à démarrer !', class: 'validation-success' }
})

const availableTransitions = computed(() =>
  VALID_TRANSITIONS[gameStore.currentPhase] || []
)

const reversedLogs = computed(() =>
  [...(gameStore.currentGame?.logs || [])].reverse()
)

function getPhaseIcon(phase: string): string {
  const icons: Record<string, string> = {
    SETUP: '⚙️',
    CONFIRMATION: '✅',
    CAPTAIN_APPLICATION: '🙋',
    CAPTAIN_SPIN: '🎡',
    CAPTAIN_VOTE: '🗳️',
    FIRST_NIGHT: '🌙',
    DAY: '☀️',
    VOTE: '🗳️',
    NIGHT: '🌙',
    END: '🏁',
  }
  return icons[phase] || '❓'
}

function getTransitionClass(target: string): string {
  if (target.includes('NIGHT') || target === 'FIRST_NIGHT') return 'btn-night'
  if (target === 'DAY') return 'btn-day'
  if (target === 'END') return 'btn-end'
  return 'btn-default'
}

function formatPhase(phase: string): string {
  const labels: Record<string, string> = {
    SETUP: 'Lobby',
    CONFIRMATION: 'Confirmation',
    CAPTAIN_APPLICATION: 'Candidature Capitaine',
    CAPTAIN_SPIN: 'Tirage Capitaine',
    CAPTAIN_VOTE: 'Vote Capitaine',
    FIRST_NIGHT: 'Première Nuit',
    DAY: 'Jour',
    VOTE: 'Vote',
    NIGHT: 'Nuit',
    END: 'Fin',
  }
  return labels[phase] || phase.replace(/_/g, ' ')
}

function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(date: string | Date | undefined): string {
  if (!date) return ''
  return new Date(date).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function transitionTo(target: string) {
  if (isTransitioning.value) return // Prevent double-clicks
  
  isTransitioning.value = true
  
  try {
    await gameStore.transitionPhase(target as GameStatus)

    if (target === 'VOTE') {
      // Reset votes completely and reload from backend
      votes.value = {}
      // Fetch fresh game data to ensure we have latest vote draft
      await gameStore.fetchGame(gameStore.currentGame!._id)
      const game = gameStore.currentGame
      const dayNum = game?.dayNumber || 1
      const draftVotes = getVoteDraftForDay(game, dayNum)
      // Sanitize votes to remove any corrupted/invalid entries
      votes.value = sanitizeVotes(draftVotes, game)
      // Clear any deaths from previous vote phase (in case we're going back)
      dayVoteDeaths.value.clear()
      daySuicides.value = new Set()
      showExecutePanel.value = false
      dayVoteRound.value = 1
      dayVoteHistory.value = []
      dayRevoteCandidates.value = new Set()
      dayManualPick.value = null
      isManualPickMode.value = false
    }
    if (target === 'DAY') {
      showDawnRise.value = true
      // Fetch fresh game data to ensure clean state
      await gameStore.fetchGame(gameStore.currentGame!._id)
      const game = gameStore.currentGame
      const dayNum = game?.dayNumber || 1
      // Reset votes for the new day (empty if fresh day)
      const draftVotes = getVoteDraftForDay(game, dayNum)
      votes.value = sanitizeVotes(draftVotes, game)
      dayOrderPhase.value = 'setup'
      dayVoteDeaths.value.clear()
      daySuicides.value = new Set()
      showExecutePanel.value = false
      dayVoteRound.value = 1
      dayVoteHistory.value = []
      dayRevoteCandidates.value = new Set()
      dayManualPick.value = null
      isManualPickMode.value = false
      initDayTimers()
      setTimeout(() => { showDawnRise.value = false }, 2800)
    }
    if (target === 'NIGHT' || target === 'FIRST_NIGHT') {
      nightActions.value = []
    }
    if (target === 'CAPTAIN_APPLICATION') {
      const game = gameStore.currentGame
      if (game?.captainCandidates?.length) {
        captainCandidates.value = new Set(game.captainCandidates)
      } else {
        captainCandidates.value = new Set()
      }
      captainVotes.value = {}
      captainElected.value = null
      captainVoteRounds.value = []
      captainVoterFilter.value = null
    }
    if (target === 'CAPTAIN_VOTE') {
      // Re-fetch so we restore whatever was saved (works for both forward and back navigation)
      await gameStore.fetchGame(gameStore.currentGame!._id)
      const game = gameStore.currentGame
      captainCandidates.value = game?.captainCandidates?.length
        ? new Set(game.captainCandidates)
        : new Set()
      captainVotes.value = game?.captainVotes && Object.keys(game.captainVotes).length
        ? { ...game.captainVotes }
        : {}
      captainElected.value = game?.captainId ?? null
      captainVoteRounds.value = game?.captainVoteRounds?.length
        ? game.captainVoteRounds.map((r: any) => ({ label: r.label, votes: { ...r.votes }, voterIds: [...r.voterIds] }))
        : []
      captainVoterFilter.value = game?.captainVoterFilter?.length
        ? [...game.captainVoterFilter]
        : null
    }
  } catch (error: any) {
    console.error('Transition failed:', error)
    warning('❌ Erreur de transition: ' + (error?.data?.statusMessage || error?.message || 'Impossible de changer de phase'))
  } finally {
    isTransitioning.value = false
  }
}

// ─── Vote-Based Death Logic ────────────────────────────────

const highestVotedPlayerId = computed(() => {
  if (!voteTally.value || Object.keys(voteTally.value).length === 0) return null
  const entries = Object.entries(voteTally.value)
  if (entries.length === 0) return null
  const [id] = entries.reduce((a, b) => (b[1] > a[1] ? b : a))
  return id
})

const highestVoteCount = computed(() => {
  if (!highestVotedPlayerId.value) return 0
  return voteTally.value[highestVotedPlayerId.value] || 0
})

// Check if there's a TIE (multiple players with same highest vote count)
const isVoteTie = computed(() => {
  if (!voteTally.value || highestVoteCount.value === 0) return false
  const maxVotes = highestVoteCount.value
  const tiedPlayers = Object.entries(voteTally.value).filter(([_, count]) => count === maxVotes)
  return tiedPlayers.length > 1
})

// Only execute if there's a CLEAR winner (no tie)
const hasVoteWinner = computed(() => {
  return highestVotedPlayerId.value !== null && !isVoteTie.value
})

// True when every eligible player (not dead/suicided) has cast ANY vote (including blanc)
// In revote mode, candidates (dayRevoteCandidates) don't vote — they are voted on
const allVoted = computed(() => {
  const eligible = gameStore.alivePlayers.filter(
    p => !dayVoteDeaths.value.has(p.id) && !daySuicides.value.has(p.id)
      && (dayRevoteCandidates.value.size === 0 || !dayRevoteCandidates.value.has(p.id))
  )
  return eligible.length > 0 && eligible.every(p => !!votes.value[p.id])
})

// Show tie resolution options when everyone voted and result is a tie
const showTieResolution = computed(() =>
  allVoted.value && isVoteTie.value && !dayManualPick.value
)

// All player IDs sharing the current maximum vote count (1 if clear winner, 2+ if tied)
const topVotePlayerIds = computed((): Set<string> => {
  if (highestVoteCount.value === 0) return new Set()
  const max = highestVoteCount.value
  return new Set(
    Object.entries(voteTally.value)
      .filter(([, count]) => count === max)
      .map(([id]) => id)
  )
})

// Get player with most votes (for auto-execution)
function getHighestVotedPlayer() {
  if (!highestVotedPlayerId.value) return null
  return gameStore.currentGame?.players.find(p => p.id === highestVotedPlayerId.value) || null
}

// ─── Vote Kill Persistence ───────────────────────────────────
// Record kills to DB so they survive page reloads and multi-step undo
async function recordVoteKillsToDb(playerIds: string[]) {
  const game = gameStore.currentGame
  if (!game || playerIds.length === 0) return
  await $fetch(`/api/games/${game._id}/vote-kills`, {
    method: 'PUT',
    body: { action: 'add', dayNumber: game.dayNumber || 1, playerIds },
  }).catch(e => console.error('Failed to record vote kills:', e))
}

// Revive all players killed on a given day (from DB record) and clear that record
async function undoVoteKillsForDay(dayNum: number) {
  const game = gameStore.currentGame
  if (!game) return
  const toRevive: string[] = game.voteKills?.[String(dayNum)] || []
  if (toRevive.length === 0) return
  for (const pid of toRevive) {
    await gameStore.performAction('revive', pid)
  }
  await $fetch(`/api/games/${game._id}/vote-kills`, {
    method: 'PUT',
    body: { action: 'clear', dayNumber: dayNum },
  }).catch(e => console.error('Failed to clear vote kills:', e))
}

async function recordSuicideKillsToDb(playerIds: string[]) {
  const game = gameStore.currentGame
  if (!game || playerIds.length === 0) return
  await $fetch(`/api/games/${game._id}/vote-kills`, {
    method: 'PUT',
    body: { action: 'add', dayNumber: game.dayNumber || 1, playerIds, field: 'suicideKills' },
  }).catch(e => console.error('Failed to record suicide kills:', e))
}

async function removeSuicideKillFromDb(playerId: string) {
  const game = gameStore.currentGame
  if (!game) return
  await $fetch(`/api/games/${game._id}/vote-kills`, {
    method: 'PUT',
    body: { action: 'remove', dayNumber: game.dayNumber || 1, playerIds: [playerId], field: 'suicideKills' },
  }).catch(e => console.error('Failed to remove suicide kill:', e))
}

// Direct (non-debounced) save of current vote + revote state to DB
async function saveVoteStateNow(
  overrideVotes?: Record<string, string>,
  overrideRound?: number,
  overrideHistory?: Array<{round: number, votes: Record<string, string>}>,
  overrideCandidates?: string[],
  overrideManualPick?: string | null
) {
  if (!gameStore.currentGame) return
  const gameId = gameStore.currentGame._id
  const dayNum = gameStore.currentGame.dayNumber || 1
  if (saveVoteDraftTimeout) { clearTimeout(saveVoteDraftTimeout); saveVoteDraftTimeout = null }
  try {
    await $fetch(`/api/games/${gameId}/vote-draft`, {
      method: 'PUT',
      body: {
        voteDraft: overrideVotes ?? votes.value,
        dayNumber: dayNum,
        revoteState: {
          round: overrideRound ?? dayVoteRound.value,
          history: overrideHistory ?? dayVoteHistory.value,
          candidates: overrideCandidates ?? [...dayRevoteCandidates.value],
          manualPick: overrideManualPick !== undefined ? overrideManualPick : dayManualPick.value,
        },
      },
    })
  } catch (e) { console.error('Failed to save vote state:', e) }
}

// Repeat a vote round: save current votes to history, reset votes, increment round
async function repeatVote() {
  const newHistory = [...dayVoteHistory.value, { round: dayVoteRound.value, votes: { ...votes.value } }]
  const newCandidates = [...topVotePlayerIds.value]
  const newRound = dayVoteRound.value + 1

  // Save to DB FIRST (with exact new values), then update refs
  await saveVoteStateNow({}, newRound, newHistory, newCandidates, null)

  dayVoteHistory.value = newHistory
  dayRevoteCandidates.value = new Set(newCandidates)
  dayVoteRound.value = newRound
  votes.value = {}
  dayManualPick.value = null
  isManualPickMode.value = false
  info(`🔁 Vote ${newRound} — seuls les joueurs ex-æquo sont candidats`)
}

async function resetToFirstVote() {
  const firstRound = dayVoteHistory.value[0]
  const restoredVotes = firstRound ? { ...firstRound.votes } : {}

  // Save to DB FIRST (round 1, no history, no candidates)
  await saveVoteStateNow(restoredVotes, 1, [], [], null)

  votes.value = restoredVotes
  dayVoteRound.value = 1
  dayVoteHistory.value = []
  dayRevoteCandidates.value = new Set()
  dayManualPick.value = null
  isManualPickMode.value = false
  info('↩ Retour au vote initial (Tour 1)')
}

const resetRoundConfirmPending = ref(false)
let resetRoundConfirmTimer: ReturnType<typeof setTimeout> | null = null
function handleResetRoundClick() {
  if (!resetRoundConfirmPending.value) {
    resetRoundConfirmPending.value = true
    resetRoundConfirmTimer = setTimeout(() => { resetRoundConfirmPending.value = false; resetRoundConfirmTimer = null }, 2500)
  } else {
    if (resetRoundConfirmTimer) { clearTimeout(resetRoundConfirmTimer); resetRoundConfirmTimer = null }
    resetRoundConfirmPending.value = false
    dayResetRound()
  }
}

const debateConfirmPending = ref(false)
let debateConfirmTimer: ReturnType<typeof setTimeout> | null = null
function handleDebateClick() {
  if (!debateConfirmPending.value) {
    debateConfirmPending.value = true
    debateConfirmTimer = setTimeout(() => { debateConfirmPending.value = false; debateConfirmTimer = null }, 2500)
  } else {
    if (debateConfirmTimer) { clearTimeout(debateConfirmTimer); debateConfirmTimer = null }
    debateConfirmPending.value = false
    startSecondDebate()
  }
}

const resetConfirmPending = ref(false)
let resetConfirmTimer: ReturnType<typeof setTimeout> | null = null

function handleResetClick() {
  if (!resetConfirmPending.value) {
    // First click — enter confirm state, auto-cancel after 2.5s
    resetConfirmPending.value = true
    resetConfirmTimer = setTimeout(() => {
      resetConfirmPending.value = false
      resetConfirmTimer = null
    }, 2500)
  } else {
    // Second click — confirmed, execute
    if (resetConfirmTimer) { clearTimeout(resetConfirmTimer); resetConfirmTimer = null }
    resetConfirmPending.value = false
    resetToFirstVote()
  }
}

// Auto-execute highest voted player on night transition
async function executeVoteLoser() {
  // Don't execute if there's a tie
  if (isVoteTie.value) {
    warning('🤝 Égalité ! Pas d\'exécution automatique. Veuillez choisir manuellement.')
    return
  }
  
  const player = getHighestVotedPlayer()
  if (!player || !gameStore.currentGame) {
    warning('Aucun joueur à éliminer')
    return
  }
  
  try {
    await gameStore.performAction('kill', player.id)
    success(`💀 ${player.name} a été éliminé par le vote`)
    dayVoteDeaths.value.add(player.id)
    dayVoteDeaths.value = new Set(dayVoteDeaths.value)
    await recordVoteKillsToDb([player.id])
  } catch (e) {
    error('Impossible d\'éliminer le joueur')
  }
}

// Manual execution by narrator
async function executePlayersManually(playerIds: string[]) {
  if (!gameStore.currentGame) return
  
  try {
    for (const playerId of playerIds) {
      await gameStore.performAction('kill', playerId)
      const player = gameStore.currentGame.players.find(p => p.id === playerId)
      if (player) {
        info(`💀 ${player.name} a été exécuté`)
        dayVoteDeaths.value.add(playerId)
      }
    }
    dayVoteDeaths.value = new Set(dayVoteDeaths.value)
    await recordVoteKillsToDb(playerIds)
    selectedExecuteTargets.value.clear()
  } catch (e) {
    error('Erreur lors de l\'exécution')
  }
}

// Mark player as having left the game (soft — they are killed at night transition)
async function suicidePlayer(playerId: string) {
  if (!gameStore.currentGame) return
  const player = gameStore.currentGame.players.find(p => p.id === playerId)
  if (!player) return
  daySuicides.value.add(playerId)
  daySuicides.value = new Set(daySuicides.value)
  votes.value[playerId] = ''
  await recordSuicideKillsToDb([playerId])
  info(`⛔ ${player.name} quitte la partie`)
}

// Undo a soft-suicide
async function reviveSuicide(playerId: string) {
  if (!gameStore.currentGame) return
  const player = gameStore.currentGame.players.find(p => p.id === playerId)
  daySuicides.value.delete(playerId)
  daySuicides.value = new Set(daySuicides.value)
  await removeSuicideKillFromDb(playerId)
  if (player) info(`↩ ${player.name} reste dans la partie`)
}

// ─── Captain Election Logic ─────────────────────────────────

// Copy captain votes to clipboard (table format)
async function copyCaptainVotes() {
  const allPlayersMap = Object.fromEntries(sortedPlayers.value.map(p => [p.id, p]))
  let text = 'ÉLECTION DU MAIRE\n'

  // Previous rounds (archived)
  for (const round of captainVoteRounds.value) {
    text += `\n── ${round.label} ──\n`
    const roundVoters = round.voterIds.map(id => allPlayersMap[id]).filter((p): p is NonNullable<typeof p> => !!p)
    for (const voter of roundVoters) {
      const votedId = round.votes[voter.id]
      const voted = votedId ? allPlayersMap[votedId] : null
      const voterNum = voter.number !== undefined ? String(voter.number).padStart(2, '0') : '--'
      const votedNum = voted && voted.number !== undefined ? String(voted.number).padStart(2, '0') : '--'
      text += `${voterNum} ${voter.name} ➔ ${voted ? votedNum + ' ' + voted.name : '—'}\n`
    }
    text += `⚔️ ÉGALITÉ\n`
  }

  // Current round
  const currentLabel = captainVoteRounds.value.length > 0 ? `Vote ${captainVoteRounds.value.length + 1}` : null
  if (currentLabel) text += `\n── ${currentLabel} ──\n`
  const voters = activeVoters.value
  for (const voter of voters) {
    const votedId = captainVotes.value[voter.id]
    const voted = votedId ? allPlayersMap[votedId] : null
    const voterNum = voter.number !== undefined ? String(voter.number).padStart(2, '0') : '--'
    const votedNum = voted && voted.number !== undefined ? String(voted.number).padStart(2, '0') : '--'
    text += `${voterNum} ${voter.name} ➔ ${voted ? votedNum + ' ' + voted.name : '—'}\n`
  }

  // Elected captain
  if (captainElected.value) {
    const captain = allPlayersMap[captainElected.value]
    if (captain) {
      const captainNum = captain.number !== undefined ? String(captain.number).padStart(2, '0') : '--'
      text += `\nMAIRE ÉLU : ${captainNum} ${captain.name}\n`
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    success('✅ Tableau des votes copié !')
  } catch (e) {
    warning('❌ Impossible de copier')
  }
}

async function copyDayVotes() {
  const allPlayersMap = Object.fromEntries(sortedPlayers.value.map(p => [p.id, p]))
  const dayNum = gameStore.currentGame?.dayNumber || 1
  const alivePlayers = gameStore.alivePlayers

  // Helper: render one round of votes as text block
  function renderRound(label: string, roundVotes: Record<string, string>, roundNum: number) {
    let block = `${label}\n\n`
    for (const player of alivePlayers) {
      const votedId = roundVotes[player.id]
      const voted = votedId && votedId !== 'blanc' ? allPlayersMap[votedId] : null
      const voterNum = player.number !== undefined ? String(player.number).padStart(2, '0') : '--'
      const votedNum = voted && voted.number !== undefined ? String(voted.number).padStart(2, '0') : '--'
      // Mayor mark only shown in round 1 (re-votes lose double weight)
      const captainMark = (player.isCaptain && roundNum === 1) ? ' 👑×2' : ''
      const voteLabel = votedId === 'blanc' ? '🤍 vote blanc' : (voted ? votedNum + ' ' + voted.name : '—')
      block += `${voterNum} ${player.name}${captainMark} ➔ ${voteLabel}\n`
    }
    const tally: Record<string, number> = {}
    for (const player of alivePlayers) {
      const vid = roundVotes[player.id]
      if (vid && vid !== 'blanc') {
        const w = (player.isCaptain && roundNum === 1) ? 2 : 1
        tally[vid] = (tally[vid] || 0) + w
      }
    }
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1])
    if (sorted.length > 0) {
      block += `\nRÉSULTATS :\n`
      for (const [id, count] of sorted) {
        const p = allPlayersMap[id]
        if (p) {
          const num = p.number !== undefined ? String(p.number).padStart(2, '0') : '--'
          block += `${num} ${p.name} : ${count} vote${count > 1 ? 's' : ''}\n`
        }
      }
    }
    return block
  }

  let text = `VOTE DU VILLAGE — Jour ${dayNum}\n${'─'.repeat(26)}\n\n`
  // Past rounds
  for (const hist of dayVoteHistory.value) {
    text += renderRound(`Tour ${hist.round}`, hist.votes, hist.round) + '\n'
  }
  // Current round
  text += renderRound(`Tour ${dayVoteRound.value}`, votes.value, dayVoteRound.value)
  // Manual pick note
  if (dayManualPick.value) {
    const picked = allPlayersMap[dayManualPick.value]
    if (picked) text += `\n✋ Désigné : ${picked.name}\n`
  }

  try {
    await navigator.clipboard.writeText(text)
    success('✅ Votes du village copiés !')
  } catch (e) {
    warning('❌ Impossible de copier')
  }
}
function toggleCandidate(playerId: string) {
  const set = new Set(captainCandidates.value)
  if (set.has(playerId)) {
    set.delete(playerId)
  } else {
    set.add(playerId)
  }
  captainCandidates.value = set
}

function setCaptainVote(voterId: string, candidateId: string) {
  if (captainVotes.value[voterId] === candidateId) {
    // Unvote
    const newVotes = { ...captainVotes.value }
    delete newVotes[voterId]
    captainVotes.value = newVotes
  } else {
    captainVotes.value = { ...captainVotes.value, [voterId]: candidateId }
  }
}

// Open the vote picker for a voter
function openVotePicker(playerId: string) {
  if (captainCandidates.value.has(playerId)) return
  selectedVoter.value = selectedVoter.value === playerId ? null : playerId
}

// Assign a vote from the picker
function assignVote(candidateId: string) {
  if (!selectedVoter.value) return
  const voterId = selectedVoter.value
  if (captainVotes.value[voterId] === candidateId) {
    // Same candidate → toggle off
    const nv: Record<string, string> = { ...captainVotes.value }
    delete nv[voterId]
    captainVotes.value = nv
  } else {
    captainVotes.value = { ...captainVotes.value, [voterId]: candidateId }
  }
  selectedVoter.value = null
}

// Clear vote from the picker
function clearVoterVote() {
  if (!selectedVoter.value) return
  const nv: Record<string, string> = { ...captainVotes.value }
  delete nv[selectedVoter.value]
  captainVotes.value = nv
  selectedVoter.value = null
}

// Table view: directly assign vote for a voter to a candidate (toggle)
function tableAssignVote(voterId: string, candidateId: string) {
  if (captainVotes.value[voterId] === candidateId) {
    const nv: Record<string, string> = { ...captainVotes.value }
    delete nv[voterId]
    captainVotes.value = nv
  } else {
    captainVotes.value = { ...captainVotes.value, [voterId]: candidateId }
  }
}

// Helper: get color for a candidate or a voter's chosen candidate
function getVoteColor(playerId: string): string {
  const votedFor = captainVotes.value[playerId]
  if (!votedFor) return 'transparent'
  return candidateColors.value[votedFor] || 'transparent'
}

function getVotedCandidateId(playerId: string): string | undefined {
  return captainVotes.value[playerId]
}

// Candidate colors for vote indicators
const CANDIDATE_COLORS: string[] = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#f43f5e', '#6366f1']
const candidateColors = computed(() => {
  const result: Record<string, string> = {}
  Array.from(captainCandidates.value).forEach((id, i) => {
    result[id] = CANDIDATE_COLORS[i % CANDIDATE_COLORS.length] || '#8b5cf6'
  })
  return result
})

const captainVoteTally = computed(() => {
  const tally: Record<string, number> = {}
  for (const candidateId of captainCandidates.value) {
    tally[candidateId] = 0
  }
  for (const [, candidateId] of Object.entries(captainVotes.value)) {
    if (candidateId) tally[candidateId] = (tally[candidateId] || 0) + 1
  }
  return tally
})

const captainWinner = computed(() => {
  const tally = captainVoteTally.value
  const entries = Object.entries(tally)
  if (entries.length === 0) return null
  entries.sort((a, b) => b[1] - a[1])
  const first = entries[0]
  const second = entries[1]
  // Only a winner if top vote is strictly highest
  if (!first) return null
  if (!second || first[1] > second[1]) {
    return first[0]
  }
  return null // Tie
})

// Detect tied candidates (those sharing the highest vote count)
const tiedCandidates = computed(() => {
  const tally = captainVoteTally.value
  const entries = Object.entries(tally)
  if (entries.length === 0) return []
  const maxVotes = Math.max(...entries.map(e => e[1]))
  if (maxVotes === 0) return []
  const tied = entries.filter(e => e[1] === maxVotes).map(e => e[0])
  return tied.length > 1 ? tied : []
})

// Active voters in the current round: all non-candidates, or only filtered ones in captains-vote mode
const activeVoters = computed(() => {
  if (captainVoterFilter.value !== null) {
    return sortedPlayers.value.filter(p => captainVoterFilter.value!.includes(p.id))
  }
  return sortedPlayers.value.filter(p => !captainCandidates.value.has(p.id))
})

// Tie-break state
const showTieBreakPanel = ref(false)
const tieBreakMode = ref<'menu' | 'pick'>('menu') // 'menu' = show options, 'pick' = picking manually

// Undo snapshot — saves state before any destructive captain action
const captainSnapshot = ref<{ candidates: string[]; votes: Record<string, string> } | null>(null)

function saveCaptainSnapshot() {
  captainSnapshot.value = {
    candidates: Array.from(captainCandidates.value),
    votes: { ...captainVotes.value },
  }
}

async function undoCaptainElection() {
  if (!gameStore.currentGame) return
  isTransitioning.value = true
  try {
    // Save current captain ID before clearing local state
    const previousCaptainId = captainElected.value

    // If snapshot exists, restore candidates/votes
    if (captainSnapshot.value) {
      captainCandidates.value = new Set(captainSnapshot.value.candidates)
      captainVotes.value = { ...captainSnapshot.value.votes }
    }
    // Always remove captain
    captainElected.value = null
    showTieBreakPanel.value = false
    tieBreakMode.value = 'menu'

    // Unset captain on server
    if (previousCaptainId) {
      await gameStore.performAction('remove_captain', previousCaptainId)
    }

    // Save restored candidates/votes to server
    if (saveCaptainTimeout) clearTimeout(saveCaptainTimeout)
    const gameId = gameStore.currentGame!._id
    await $fetch(`/api/games/${gameId}/captain-election`, {
      method: 'PUT',
      body: {
        captainCandidates: Array.from(captainCandidates.value),
        captainVotes: { ...captainVotes.value },
        captainVoterFilter: [],
      },
    })

    captainVoterFilter.value = null
    captainSnapshot.value = null
    success('↩️ Élection annulée — votes restaurés')
  } catch (e: any) {
    warning('❌ Erreur: ' + (e?.data?.statusMessage || e?.message || 'Impossible'))
  } finally {
    isTransitioning.value = false
  }
}

// Tie-break: random pick from tied candidates
async function tieBreakRandom() {
  const tied = tiedCandidates.value
  if (tied.length === 0) return
  saveCaptainSnapshot()
  // Fisher-Yates for single random pick
  const idx = Math.floor(Math.random() * tied.length)
  const winnerId = tied[idx] as string
  
  isTransitioning.value = true
  try {
    await gameStore.performAction('set_captain', winnerId)
    captainElected.value = winnerId
    // Do NOT overwrite votes; preserve vote history
    // Persist candidates/votes to server
    if (saveCaptainTimeout) clearTimeout(saveCaptainTimeout)
    const gameId = gameStore.currentGame!._id
    await $fetch(`/api/games/${gameId}/captain-election`, {
      method: 'PUT',
      body: {
        captainCandidates: Array.from(captainCandidates.value),
        captainVotes: { ...captainVotes.value },
      },
    })
    success('👑 Capitaine élu par tirage : ' + (getPlayerById(winnerId)?.name || 'Inconnu'))
    showTieBreakPanel.value = false
  } catch (e: any) {
    warning('❌ Erreur: ' + (e?.data?.statusMessage || e?.message || 'Impossible'))
  } finally {
    isTransitioning.value = false
  }
}

// Tie-break: narrateur picks manually from tied candidates
async function tieBreakPick(candidateId: string) {
  saveCaptainSnapshot()
  isTransitioning.value = true
  try {
    await gameStore.performAction('set_captain', candidateId)
    captainElected.value = candidateId
    // Do NOT overwrite votes; preserve vote history
    // Persist candidates/votes to server
    if (saveCaptainTimeout) clearTimeout(saveCaptainTimeout)
    const gameId = gameStore.currentGame!._id
    await $fetch(`/api/games/${gameId}/captain-election`, {
      method: 'PUT',
      body: {
        captainCandidates: Array.from(captainCandidates.value),
        captainVotes: { ...captainVotes.value },
      },
    })
    success('👑 Capitaine choisi : ' + (getPlayerById(candidateId)?.name || 'Inconnu'))
    showTieBreakPanel.value = false
    tieBreakMode.value = 'menu'
  } catch (e: any) {
    warning('❌ Erreur: ' + (e?.data?.statusMessage || e?.message || 'Impossible'))
  } finally {
    isTransitioning.value = false
  }
}

// Tie-break: revote normal — save current votes as a round, reset all votes
async function tieBreakRevoteNormal() {
  // Archive the current vote round before resetting
  captainVoteRounds.value.push({
    label: `Vote ${captainVoteRounds.value.length + 1}`,
    votes: { ...captainVotes.value },
    voterIds: activeVoters.value.map(p => p.id),
  })
  saveCaptainSnapshot()
  showTieBreakPanel.value = false
  tieBreakMode.value = 'menu'
  captainVotes.value = {}
  captainElected.value = null
  captainVoterFilter.value = null // back to normal mode
  // candidates stay the same
  if (saveCaptainTimeout) clearTimeout(saveCaptainTimeout)
  const gameId = gameStore.currentGame!._id
  try {
    await $fetch(`/api/games/${gameId}/captain-election`, {
      method: 'PUT',
      body: { captainVotes: {}, captainVoterFilter: [] },
    })
  } catch (e) { console.error('Failed to save revote state:', e) }
}

// Tie-break: loser captains vote for tied captains (players don't vote)
async function tieBreakCaptainsVote() {
  const tied = tiedCandidates.value
  if (tied.length === 0) return
  // Loser captains = all current candidates minus the tied ones
  const loserCaptainIds = Array.from(captainCandidates.value).filter(id => !tied.includes(id))
  // Archive current round
  captainVoteRounds.value.push({
    label: `Vote ${captainVoteRounds.value.length + 1}`,
    votes: { ...captainVotes.value },
    voterIds: activeVoters.value.map(p => p.id),
  })
  saveCaptainSnapshot()
  showTieBreakPanel.value = false
  tieBreakMode.value = 'menu'
  // Candidates = tied ones only; voters = loser captains only
  captainCandidates.value = new Set(tied)
  captainVoterFilter.value = loserCaptainIds
  captainVotes.value = {}
  captainElected.value = null
  if (saveCaptainTimeout) clearTimeout(saveCaptainTimeout)
  const gameId = gameStore.currentGame!._id
  try {
    await $fetch(`/api/games/${gameId}/captain-election`, {
      method: 'PUT',
      body: { captainCandidates: tied, captainVotes: {}, captainVoterFilter: loserCaptainIds },
    })
  } catch (e) { console.error('Failed to save captains-vote state:', e) }
}

// Cancel captains-vote mode — restore previous state
async function cancelCaptainsVote() {
  if (!gameStore.currentGame) return
  isTransitioning.value = true
  try {
    // Remove the round that was archived when starting captains vote
    captainVoteRounds.value.pop()
    // Restore from snapshot
    if (captainSnapshot.value) {
      captainCandidates.value = new Set(captainSnapshot.value.candidates)
      captainVotes.value = { ...captainSnapshot.value.votes }
    }
    captainVoterFilter.value = null
    captainElected.value = null
    captainSnapshot.value = null
    showTieBreakPanel.value = false
    tieBreakMode.value = 'menu'
    const gameId = gameStore.currentGame._id
    await $fetch(`/api/games/${gameId}/captain-election`, {
      method: 'PUT',
      body: {
        captainCandidates: Array.from(captainCandidates.value),
        captainVotes: { ...captainVotes.value },
        captainVoterFilter: [],
        captainVoteRounds: captainVoteRounds.value,
      },
    })
    success('↩️ Vote des capitaines annulé — votes restaurés')
  } catch (e: any) {
    warning('❌ Erreur: ' + (e?.data?.statusMessage || e?.message || 'Impossible'))
  } finally {
    isTransitioning.value = false
  }
}

// Group voters by their chosen candidate (village clusters)
const voterGroups = computed(() => {
  const groups: Record<string, Array<{ id: string; name: string; avatar?: string; number?: number }>> = {}
  for (const candidateId of captainCandidates.value) {
    groups[candidateId] = []
  }
  for (const [voterId, candidateId] of Object.entries(captainVotes.value)) {
    const player = getPlayerById(voterId)
    if (player && groups[candidateId]) {
      groups[candidateId].push({ id: player.id, name: player.name, avatar: player.avatar, number: player.number })
    }
  }
  return groups
})

const undecidedVoters = computed(() => {
  return sortedPlayers.value.filter(p => !captainVotes.value[p.id])
})

function getPlayerById(id: string) {
  return gameStore.currentGame?.players.find(p => p.id === id)
}

async function confirmCaptain() {
  if (!captainWinner.value || isTransitioning.value) return
  saveCaptainSnapshot()
  isTransitioning.value = true
  try {
    await gameStore.performAction('set_captain', captainWinner.value)
    captainElected.value = captainWinner.value
    success('👑 Capitaine élu : ' + (getPlayerById(captainWinner.value)?.name || 'Inconnu'))
  } catch (e: any) {
    warning('Erreur: ' + (e?.data?.statusMessage || e?.message || 'Impossible'))
  } finally {
    isTransitioning.value = false
  }
}

async function skipCaptainElection() {
  await transitionTo('FIRST_NIGHT')
}

// ─── Spin Logic ─────────────────────────────────────────────
// Start spin: freeze candidate list and run animation directly (no phase transition)
function startSpin() {
  spinCandidatesList.value = Array.from(captainCandidates.value)
  spinResult.value = new Set()
  spinHighlightIndex.value = -1
  runSpinAnimation()
}

// Save spin state to server for persistence
async function saveSpinState() {
  if (!gameStore.currentGame) return
  const gameId = gameStore.currentGame._id
  try {
    await $fetch(`/api/games/${gameId}/captain-election`, {
      method: 'PUT',
      body: {
        spinCandidates: spinCandidatesList.value,
        spinResult: Array.from(spinResult.value),
      },
    })
  } catch (e) { console.error('Failed to save spin state:', e) }
}

// Clear spin state on server
async function clearSpinState() {
  if (!gameStore.currentGame) return
  const gameId = gameStore.currentGame._id
  try {
    await $fetch(`/api/games/${gameId}/captain-election`, {
      method: 'PUT',
      body: { spinCandidates: [], spinResult: [] },
    })
  } catch (e) { console.error('Failed to clear spin state:', e) }
}

// Back from spin: reset state, stay on same page
function backFromSpin() {
  spinResult.value = new Set()
  spinHighlightIndex.value = -1
  isSpinning.value = false
  spinCandidatesList.value = []
  clearSpinState()
}

// Run the spin animation then reveal winners one by one
function runSpinAnimation() {
  const candidates = spinCandidatesList.value
  const total = candidates.length
  const keepCount = Math.min(spinTargetCount.value, total)

  // Pre-select random winners using Fisher-Yates shuffle (unbiased)
  const shuffled: string[] = [...candidates]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = shuffled[i] as string
    shuffled[i] = shuffled[j] as string
    shuffled[j] = tmp
  }
  const winnersArray = shuffled.slice(0, keepCount)
  const winnersSet = new Set(winnersArray)

  isSpinning.value = true
  spinResult.value = new Set()
  spinHighlightIndex.value = 0

  // Phase 1: Fast spinning across all candidates
  const totalCycles = total * 4 + Math.floor(Math.random() * total)
  let step = 0
  const baseSpeed = 80 // ms - fast base
  const slowdownStart = totalCycles - total * 1.5

  function tick() {
    spinHighlightIndex.value = step % total

    step++
    if (step >= totalCycles) {
      // Phase 1 done — start revealing winners one by one
      spinHighlightIndex.value = -1
      revealWinners(candidates, winnersArray, winnersSet)
      return
    }

    let delay = baseSpeed
    if (step > slowdownStart) {
      const progress = (step - slowdownStart) / (totalCycles - slowdownStart)
      delay = baseSpeed + progress * 300
    }

    setTimeout(tick, delay)
  }

  tick()
}

// Phase 2: Reveal winners one at a time with dramatic pauses
function revealWinners(candidates: string[], winnersArray: string[], winnersSet: Set<string>) {
  let revealIndex = 0

  function revealNext() {
    if (revealIndex >= winnersArray.length) {
      // All revealed — done
      isSpinning.value = false

      // Save spin state to server so it persists across navigation
      saveSpinState()
      return
    }

    const winnerId: string = winnersArray[revealIndex] as string
    const candidateIdx = candidates.indexOf(winnerId)

    // Highlight the winner briefly before marking them
    spinHighlightIndex.value = candidateIdx

    setTimeout(() => {
      // Add to results (turns green)
      const updated = new Set<string>(spinResult.value)
      updated.add(winnerId)
      spinResult.value = updated
      spinHighlightIndex.value = -1

      revealIndex++

      // Pause before next reveal
      setTimeout(revealNext, 600)
    }, 500)
  }

  // Small pause before first reveal
  setTimeout(revealNext, 400)
}

// Apply spin result: update candidates and go to vote
async function applySpinResult() {
  const winners = new Set(spinResult.value)
  captainCandidates.value = winners
  spinResult.value = new Set()
  spinCandidatesList.value = []

  // Save reduced candidates to server immediately (bypass debounce watcher)
  if (saveCaptainTimeout) clearTimeout(saveCaptainTimeout)
  const gameId = gameStore.currentGame!._id
  try {
    await $fetch(`/api/games/${gameId}/captain-election`, {
      method: 'PUT',
      body: {
        captainCandidates: Array.from(winners),
        spinCandidates: [],
        spinResult: [],
      },
    })
  } catch (e) { console.error('Failed to save spin result:', e) }

  await transitionTo('CAPTAIN_VOTE')
}

// Player positions in circle
function getCirclePosition(index: number, total: number, radiusX: number, radiusY: number) {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2 // Start from top
  return {
    x: Math.cos(angle) * radiusX,
    y: Math.sin(angle) * radiusY,
  }
}

async function doAction(action: string, playerId: string) {
  await gameStore.performAction(action, playerId)
}

// Legacy function - kept for compatibility
async function addPlayer() {
  if (!newPlayerName.value.trim() || !gameStore.currentGame) return
  const players = [
    ...gameStore.currentGame.players,
    { id: crypto.randomUUID(), name: newPlayerName.value.trim(), isAlive: true, isCaptain: false, isInfected: false },
  ]
  await gameStore.updatePlayers(players)
  newPlayerName.value = ''
}

async function submitVoteResults() {
  if (!gameStore.currentGame) return
  const voteList = Object.entries(votes.value)
    .filter(([_, target]) => target)
    .map(([voterId, target]) => {
      const player = gameStore.currentGame!.players.find(p => p.id === voterId)
      return {
        voter: player?.name || voterId,
        target: gameStore.currentGame!.players.find(p => p.id === target)?.name || target,
        // Mayor double weight only in round 1
        weight: (player?.isCaptain && dayVoteRound.value === 1) ? 2 : 1,
      }
    })

  await gameStore.submitVotes(gameStore.currentGame.dayNumber || 1, voteList)
}

function getPlayerByRoleId(roleId: string) {
  if (!gameStore.currentGame) return null
  const playerId = Object.entries(playerRoles.value).find(([, rId]) => rId === roleId)?.[0]
  return playerId ? gameStore.currentGame.players.find((p: any) => p.id === playerId) : null
}

async function startNightFall() {
  showNightFall.value = true
  await new Promise(r => setTimeout(r, 2800))
  await transitionTo('FIRST_NIGHT')
  await new Promise(r => setTimeout(r, 900))
  showNightFall.value = false
}

// ─── Day Timer Logic ────────────────────────────────────────

function formatTimer(seconds: number): string {
  const abs = Math.abs(seconds)
  const m = Math.floor(abs / 60)
  const s = abs % 60
  const sign = seconds < 0 ? '−' : ''
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── Day timer computeds ──
const dayOrderedPlayers = computed(() => {
  if (!dayStartSpeakerId.value || !dayDirection.value) return []
  const sorted = [...gameStore.alivePlayers].sort((a, b) => Number(a.number) - Number(b.number))
  const startIdx = sorted.findIndex(p => p.id === dayStartSpeakerId.value)
  if (startIdx === -1) return []
  const n = sorted.length
  // Build circular order, then filter out the captain (maire) — they speak after everyone else
  return Array.from({ length: n }, (_, i) => {
    const idx = dayDirection.value === 'up' ? (startIdx + i) % n : (startIdx - i + n) % n
    return sorted[idx]!
  }).filter((p): p is NonNullable<typeof sorted[0]> => !!p && !p.isCaptain)
})

// Number of players expected to speak in first round (excludes captain)
const dayFirstRoundTotal = computed(() => {
  const hasCaptain = gameStore.alivePlayers.some(p => p.isCaptain)
  return hasCaptain ? gameStore.aliveCount - 1 : gameStore.aliveCount
})

// Number of players who have filled in a vote
const dayVoteFilledCount = computed(() => {
  return Object.values(votes.value).filter(v => v && v !== '').length
})

const dayStartSpeakerPlayer = computed(() => {
  if (!dayStartSpeakerId.value) return null
  return gameStore.alivePlayers.find(p => p.id === dayStartSpeakerId.value) || null
})

const daySecondDebateList = computed(() => {
  const ids = [
    dayStartSpeakerId.value,
    ...[...daySecondDebateIds.value].filter(id => id !== dayStartSpeakerId.value)
  ]
  return ids.filter(Boolean).map(id => gameStore.alivePlayers.find(p => p.id === id)).filter(Boolean) as any[]
})

const daySpeakerPlayer = computed(() => {
  if (!daySpeakerId.value) return null
  return gameStore.alivePlayers.find(p => p.id === daySpeakerId.value) || null
})

const daySpeakerIndex = computed(() => {
  if (!daySpeakerId.value) return -1
  return gameStore.alivePlayers.findIndex(p => p.id === daySpeakerId.value)
})

const dayTimerFraction = computed(() => {
  if (dayTimerDuration.value === 0) return 0
  return dayTimerRemaining.value / dayTimerDuration.value
})

const dayProgress = computed(() => {
  const total = gameStore.aliveCount
  if (total <= 1) return 0
  const spoken = daySpokenSet.value.size
  const current = daySpeakerId.value && !daySpokenSet.value.has(daySpeakerId.value) ? 0.5 : 0
  return Math.min(1, (spoken + current) / total)
})

const dayAtmosphereStyle = computed(() => {
  const dp = dayProgress.value
  // Peak sun at noon (0.5), sunset begins > 0.7, night falls > 0.9
  const amberBase = Math.max(0, Math.sin(dp * Math.PI) * 0.22).toFixed(3)
  const violet = (Math.max(0, 0.12 - dp * 0.08)).toFixed(3)
  const orange = (Math.max(0, dp - 0.6) * 0.55).toFixed(3)
  const night = (Math.max(0, dp - 0.85) * 5.5).toFixed(3) // Rapid darkening at end

  return {
    background: [
      `linear-gradient(180deg, rgba(10,3,32,${night}) 0%, rgba(10,3,32,${Math.min(0.6, Number(night) * 0.4)}) 100%)`,
      `radial-gradient(ellipse 90% 45% at 50% -8%, rgba(168,85,247,${violet}) 0%, transparent 65%)`,
      `radial-gradient(ellipse 115% 58% at 50% 106%, rgba(251,191,36,${amberBase}) 0%, transparent 58%)`,
      `radial-gradient(ellipse 100% 52% at 50% 108%, rgba(251,146,60,${orange}) 0%, transparent 52%)`
    ].join(', '),
    transition: 'background 5s ease'
  }
})

const dayRaysStyle = computed(() => {
  const dp = dayProgress.value
  // Rays are most visible at sunrise (0.0 - 0.2) and sunset (0.8 - 1.0)
  // They rotate slowly
  const opacity = Math.max(0, Math.sin(dp * Math.PI) * 0.5).toFixed(2)
  return {
    opacity,
    transform: `rotate(${dp * 180}deg)`,
    transition: 'transform 10s linear, opacity 3s ease'
  }
})

const dayHorizonStyle = computed(() => {
  const dp = dayProgress.value
  const base = 0.2 + Math.sin(dp * Math.PI) * 0.52
  const orange = Math.max(0, dp - 0.55) * 0.8
  const g = Math.round(191 - dp * 45)
  const b = Math.round(Math.max(16, 36 - dp * 20))
  return {
    background: `linear-gradient(90deg, transparent, rgba(251,191,36,${(base * 0.48).toFixed(3)}) 18%, rgba(251,${g},${b},${base.toFixed(3)}) 50%, rgba(251,${g},${b},${(base * 0.48).toFixed(3)}) 82%, transparent)`,
    boxShadow: `0 0 32px 8px rgba(251,191,36,${(base * 0.16).toFixed(3)}), 0 0 80px 16px rgba(251,${g},${b},${(base * 0.08).toFixed(3)})`,
    opacity: String(Math.min(1, 0.4 + orange * 0.6).toFixed(2)),
    transition: 'all 5s ease'
  }
})

const dayGridCols = computed(() => {
  const count = gameStore.aliveCount
  if (count <= 8) return 3
  if (count <= 14) return 4
  return 5
})

// Vote tally: count weighted votes per target ('blanc' votes excluded from tally)
const voteTally = computed(() => {
  const tally: Record<string, number> = {}
  for (const player of gameStore.alivePlayers) {
    const targetId = votes.value[player.id]
    if (targetId && targetId !== 'blanc') {
      // Mayor gets ×2 only in the first vote round
      const weight = (player.isCaptain && dayVoteRound.value === 1) ? 2 : 1
      tally[targetId] = (tally[targetId] || 0) + weight
    }
  }
  return tally
})

const defensePlayers = computed(() => {
  return Object.entries(voteTally.value)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => {
      const p = gameStore.alivePlayers.find(pl => pl.id === id)
      return { id, name: p?.name || '?', number: p?.number, count }
    })
})

// Defense alert: fires whenever a player reaches ≥2 votes OR their count increases while ≥2
watch(voteTally, (tally) => {
  for (const [id, count] of Object.entries(tally)) {
    const prev = prevVoteCounts[id] ?? 0
    if (count >= 2 && count !== prev) {
      const p = gameStore.alivePlayers.find(pl => pl.id === id)
      defenseAlertData.value = { id, name: p?.name || '?', count, key: Date.now() }
    }
  }
  // If current alert player dropped below 2, clear it
  if (defenseAlertData.value && (tally[defenseAlertData.value.id] ?? 0) < 2) {
    defenseAlertData.value = null
  }
  prevVoteCounts = { ...tally }
}, { deep: true })

const nextUnspokenIndex = computed(() => {
  return gameStore.alivePlayers.findIndex(p => !daySpokenSet.value.has(p.id) && p.id !== daySpeakerId.value)
})

// ── Day timer actions ──
function initDayTimers() {
  dayTimerPause()
  dayTimerRemaining.value = dayTimerDuration.value
  daySpeakerId.value = null
  daySpokenSet.value = new Set()
  dayStartSpeakerId.value = null
  dayDirection.value = null
  dayOrderPhase.value = 'setup'
  daySecondDebateIds.value = new Set()
  daySecondDebateSpokenSet.value = new Set()
}

function dayResetRound() {
  const c = confirm('Réinitialiser tout le tour de parole ?')
  if (!c) return
  dayTimerPause()
  dayTimerRemaining.value = dayTimerDuration.value
  daySpeakerId.value = null
  daySpokenSet.value = new Set()
  
  // Reset start player and phase
  dayStartSpeakerId.value = null
  dayDirection.value = null
  dayOrderPhase.value = 'setup'
  
  daySecondDebateIds.value = new Set()
  daySecondDebateSpokenSet.value = new Set()
}

function dayChipClick(playerId: string) {
  if (dayOrderPhase.value === 'setup') {
    dayStartSpeakerId.value = playerId
    // Start player always gets second debate
    daySecondDebateIds.value = new Set([playerId])
  } else if (dayOrderPhase.value === 'first-round') {
    if (playerId === daySpeakerId.value) {
      // Clicking current speaker → mark as spoken + advance (like skip)
      dayTimerSkip()
    } else if (daySpokenSet.value.has(playerId)) {
      // Clicking a spoken player → un-mark them
      const newSet = new Set(daySpokenSet.value)
      newSet.delete(playerId)
      daySpokenSet.value = newSet
    } else {
      // Clicking any un-spoken player → make them the current speaker (free narrator override)
      dayTimerPause()
      daySpeakerId.value = playerId
      dayTimerRemaining.value = dayTimerDuration.value
    }
  } else if (dayOrderPhase.value === 'second-debate') {
    if (playerId === daySpeakerId.value) {
      // Clicking current speaker → mark as spoken + advance
      dayTimerSkip()
    } else if (daySecondDebateSpokenSet.value.has(playerId)) {
      // Un-mark
      const newSet = new Set(daySecondDebateSpokenSet.value)
      newSet.delete(playerId)
      daySecondDebateSpokenSet.value = newSet
    } else {
      // Make them the current speaker (free choice)
      dayTimerPause()
      daySpeakerId.value = playerId
      dayTimerRemaining.value = dayTimerDuration.value
    }
  }
}

function dayCancelStart() {
  if (dayOrderPhase.value !== 'setup') return
  dayStartSpeakerId.value = null
  daySecondDebateIds.value = new Set()
}

function daySetDirection(dir: 'up' | 'down') {
  if (!dayStartSpeakerId.value) return
  dayDirection.value = dir
  dayOrderPhase.value = 'first-round'

  // dayOrderedPlayers already skips the captain — narrator picks start freely
  const first = dayOrderedPlayers.value[0]
  if (first) {
    daySpeakerId.value = first.id
    dayTimerRemaining.value = dayTimerDuration.value
  }
}

function dayToggleSecondDebate(playerId: string) {
  if (playerId === dayStartSpeakerId.value) return // can't remove start player
  const newSet = new Set(daySecondDebateIds.value)
  if (newSet.has(playerId)) { newSet.delete(playerId) } else { newSet.add(playerId) }
  daySecondDebateIds.value = newSet
}

function startSecondDebate() {
  // Switch to second-debate phase; players with the '2' toggle are the speakers
  dayOrderPhase.value = 'second-debate'
  daySecondDebateSpokenSet.value = new Set()
  const list = daySecondDebateList.value
  if (list.length > 0) {
    daySpeakerId.value = list[0].id
    dayTimerPause()
    dayTimerRemaining.value = dayTimerDuration.value
  } else {
    daySpeakerId.value = null
  }
}

function enterVoteSubPhase() {
  dayTimerPause()
  defenseAlertData.value = null
  prevVoteCounts = {}
  dayVoteRound.value = 1
  dayVoteHistory.value = []
  dayRevoteCandidates.value = new Set()
  dayManualPick.value = null
  isManualPickMode.value = false
  dayOrderPhase.value = 'vote'
}

function backToSpeaking() {
  dayOrderPhase.value = 'second-debate'
}

async function handleNightTransition() {
  if (!nightConfirmPending.value) {
    nightConfirmPending.value = true
    nightConfirmTimer = setTimeout(() => {
      nightConfirmPending.value = false
    }, 4000)
    return
  }
  if (nightConfirmTimer) clearTimeout(nightConfirmTimer)
  nightConfirmPending.value = false
  
  // Kill abandoned players first (soft-suicided during vote phase)
  if (daySuicides.value.size > 0) {
    const suicideIds = [...daySuicides.value]
    for (const playerId of suicideIds) {
      await gameStore.performAction('kill', playerId)
      dayVoteDeaths.value.add(playerId)
    }
    dayVoteDeaths.value = new Set(dayVoteDeaths.value)
    await recordVoteKillsToDb(suicideIds)
    daySuicides.value = new Set()
  }

  // Auto-execute: use narrator's manual pick if set, else auto from votes if clear winner
  if (dayOrderPhase.value === 'vote') {
    if (dayManualPick.value) {
      const target = gameStore.currentGame?.players.find(p => p.id === dayManualPick.value)
      if (target && target.isAlive && !dayVoteDeaths.value.has(target.id)) {
        await gameStore.performAction('kill', target.id)
        success(`💀 ${target.name} a été éliminé (désigné par le narrateur)`)
        dayVoteDeaths.value.add(target.id)
        dayVoteDeaths.value = new Set(dayVoteDeaths.value)
        await recordVoteKillsToDb([target.id])
      }
    } else {
      const highest = getHighestVotedPlayer()
      if (highest && highest.isAlive && !dayVoteDeaths.value.has(highest.id) && hasVoteWinner.value) {
        await executeVoteLoser()
      }
    }
  }

  // Show death reveal animation for all players eliminated this day
  if (dayVoteDeaths.value.size > 0) {
    deathRevealList.value = [...dayVoteDeaths.value].map(id => {
      const player = gameStore.currentGame?.players.find(p => p.id === id)
      const roleId = playerRoles.value[id]
      const role = availableRoles.value.find((r: any) => r._id === roleId)
      return {
        name: player?.name || 'Inconnu',
        avatar: player?.avatar,
        roleIcon: role?.icon || '❓',
        roleName: role?.name || 'Rôle inconnu',
      }
    })
    showDeathReveal.value = true
    await new Promise<void>(resolve => {
      deathRevealResolve = resolve
    })
    showDeathReveal.value = false
    deathRevealList.value = []
    deathRevealResolve = null
  }

  showNightFall.value = true
  await new Promise(r => setTimeout(r, 2800))
  await transitionTo('NIGHT')
  await new Promise(r => setTimeout(r, 900))
  showNightFall.value = false
}

// Keep for backward-compat (unused now but keep to avoid type error)
function daySelectSpeaker(playerId: string) { dayChipClick(playerId) }

function dayTimerStart() {
  if (!daySpeakerId.value) return
  // Allow starting even if expired (negative) so we can continue if needed
  // if (dayTimerRemaining.value === 0) return
  
  dayTimerRunning.value = true
  timerInterval = setInterval(() => {
    dayTimerRemaining.value -= 1
    // Removed auto-stop at 0 per request
  }, 1000)
}

function dayTimerPause() {
  dayTimerRunning.value = false
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
}

function dayTimerReset() {
  dayTimerPause()
  dayTimerRemaining.value = dayTimerDuration.value
}

function dayTimerSkip() {
  if (!daySpeakerId.value) return
  if (dayOrderPhase.value === 'first-round') {
    daySpokenSet.value.add(daySpeakerId.value)
    daySpokenSet.value = new Set(daySpokenSet.value)
    dayTimerPause()
    const nextSpeaker = dayOrderedPlayers.value.find(p => p && !daySpokenSet.value.has(p.id))
    if (nextSpeaker) {
      daySpeakerId.value = nextSpeaker.id
      dayTimerRemaining.value = dayTimerDuration.value
    } else {
      // First round done (all non-captain spoke) — move to free / second debate
      dayOrderPhase.value = 'second-debate'
      daySecondDebateSpokenSet.value = new Set()
      // Suggest the captain (maire) as next speaker if they haven't spoken
      const captain = gameStore.alivePlayers.find(p => p.isCaptain && !daySpokenSet.value.has(p.id))
      if (captain) {
        daySpeakerId.value = captain.id
        dayTimerRemaining.value = dayTimerDuration.value
      } else {
        const firstDebater = daySecondDebateList.value[0]
        if (firstDebater) {
          daySpeakerId.value = firstDebater.id
          dayTimerRemaining.value = dayTimerDuration.value
        } else {
          daySpeakerId.value = null
          dayTimerRemaining.value = 0
        }
      }
    }
  } else if (dayOrderPhase.value === 'second-debate') {
    daySecondDebateSpokenSet.value.add(daySpeakerId.value)
    daySecondDebateSpokenSet.value = new Set(daySecondDebateSpokenSet.value)
    dayTimerPause()
    const nextDebater = daySecondDebateList.value.find(p => !daySecondDebateSpokenSet.value.has(p.id))
    if (nextDebater) {
      daySpeakerId.value = nextDebater.id
      dayTimerRemaining.value = dayTimerDuration.value
    } else {
      daySpeakerId.value = null
      dayTimerRemaining.value = 0
    }
  } else {
    // Setup phase fallback
    dayTimerPause()
  }
}

function setTimerDuration(seconds: number) {
  dayTimerDuration.value = Math.max(15, seconds)
  dayTimerReset()
}

async function startDawnRise() {
  showDawnRise.value = true
  await new Promise(r => setTimeout(r, 2800))
  await transitionTo('DAY')
  initDayTimers()
  await new Promise(r => setTimeout(r, 400))
  showDawnRise.value = false
}

async function backToPreviousNight() {
  const game = gameStore.currentGame
  const dayNum = game?.dayNumber ?? 1
  if (dayNum <= 1) {
    // Going back from Day 1 to First Night: reset to night=1, day=0
    await backTo('FIRST_NIGHT', { setNightNumber: 1, setDayNumber: 0 })
  } else {
    // Going back from Day N to Night N: dayNumber decrements, nightNumber stays
    await backTo('NIGHT', { setNightNumber: dayNum, setDayNumber: dayNum - 1 })
  }
}

async function backToVoteSubPhase() {
  if (isTransitioning.value) return
  isTransitioning.value = true
  isGoingBack.value = true
  try {
    // Transition server phase back to VOTE
    await gameStore.transitionPhase('VOTE' as GameStatus, true) // isBack = true

    // dayNumber doesn't change on NIGHT→VOTE back, so read it now
    const dayNum = gameStore.currentGame?.dayNumber || 1

    // Revive all players killed on this day (from DB — survives multi-step undo)
    await undoVoteKillsForDay(dayNum)
    dayVoteDeaths.value.clear()
    showExecutePanel.value = false

    // Fetch fresh game data AFTER revivals so draft loads with everyone alive
    await gameStore.fetchGame(gameStore.currentGame!._id)
    const game = gameStore.currentGame
    // Restore abandoned state from DB so their cards still show as suicided
    const suicidedIds: string[] = game?.suicideKills?.[String(dayNum)] || []
    daySuicides.value = new Set(suicidedIds)
    // Load draft directly — no sanitize needed, players are alive again
    votes.value = getVoteDraftForDay(game, dayNum)
    applyRevoteState(game, dayNum)
    dayOrderPhase.value = 'vote'
  } catch (e: any) {
    console.error('backToVoteSubPhase error:', e)
  } finally {
    isGoingBack.value = false
    isTransitioning.value = false
  }
}

async function backTo(target: string, counters: { setDayNumber?: number, setNightNumber?: number } = {}) {
  if (isTransitioning.value) return
  isTransitioning.value = true
  isGoingBack.value = true
  try {
    await gameStore.transitionPhase(target as GameStatus, true, counters) // isBack = true
    await gameStore.fetchGame(gameStore.currentGame!._id)
    const game = gameStore.currentGame
    if (target === 'DAY') {
      initDayTimers()
    }
    if (target === 'VOTE') {
      const dayNum = game?.dayNumber || 1
      // Revive all players killed on this day (from DB — survives multi-step undo)
      await undoVoteKillsForDay(dayNum)
      dayVoteDeaths.value.clear()
      showExecutePanel.value = false
      // Refetch after revivals
      await gameStore.fetchGame(gameStore.currentGame!._id)
      const freshGame = gameStore.currentGame
      // Restore abandoned state from DB so their cards still show as suicided
      const suicidedIds: string[] = freshGame?.suicideKills?.[String(dayNum)] || []
      daySuicides.value = new Set(suicidedIds)
      votes.value = getVoteDraftForDay(freshGame, dayNum)
      dayOrderPhase.value = 'vote'
    }
    // NIGHT / FIRST_NIGHT state restored by the phase watcher
  } catch (e: any) {
    console.error('backTo error:', e)
  } finally {
    isGoingBack.value = false
    isTransitioning.value = false
  }
}

// ─── AI: Normalize player names ─────────────────────────────
async function normalizeNames() {
  if (!gameStore.currentGame || isNormalizingNames.value) return
  isNormalizingNames.value = true
  try {
    const gameId = gameStore.currentGame._id
    const res = await $fetch(`/api/games/${gameId}/normalize-names`, { method: 'POST' })
    if ((res as any)?.success) {
      await gameStore.fetchGame(gameId)
      success('✨ Noms normalisés avec succès')
    }
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.message || 'Échec de la normalisation'
    error(`❌ ${msg}`)
  } finally {
    isNormalizingNames.value = false
  }
}

async function finishFirstNight() {
  if (!gameStore.currentGame) return
  // Submit night actions
  const actions = nightRoles.value
    .filter((r: any) => firstNightDone.value[r._id])
    .map((r: any) => ({
      role: r.name,
      actor: getPlayerByRoleId(r._id)?.name || '—',
      target: gameStore.alivePlayers.find((p: any) => p.id === firstNightActions.value[r._id])?.name || '—',
      result: '—',
    }))
  if (actions.length > 0) {
    await gameStore.submitNightLog(1, actions)
  }
  await transitionTo('DAY')
  firstNightActions.value = {}
  firstNightDone.value = {}
}

async function finishNight() {
  if (!gameStore.currentGame) return
  const nightNum = gameStore.currentGame.nightNumber
  const actions = nightRoles.value
    .filter((r: any) => nightPhaseDone.value[r._id])
    .map((r: any) => ({
      role: r.name,
      actor: getPlayerByRoleId(r._id)?.name || '—',
      target: gameStore.alivePlayers.find((p: any) => p.id === nightPhaseActions.value[r._id])?.name || '—',
      result: '—',
    }))
  if (actions.length > 0) {
    await gameStore.submitNightLog(nightNum, actions)
  }
  showDawnRise.value = true
  await new Promise(r => setTimeout(r, 2800))
  await transitionTo('DAY')
  initDayTimers()
  await new Promise(r => setTimeout(r, 400))
  showDawnRise.value = false
}

async function submitNightActions() {
  if (!gameStore.currentGame) return
  const validActions = nightActions.value.filter(a => a.role && a.target)
  await gameStore.submitNightLog(gameStore.currentGame.nightNumber, validActions)
}

async function forceEnd() {
  const confirmed = await confirm(
    'Forcer la fin de cette partie ?',
    'Confirmer la fin de partie'
  )
  
  if (confirmed) {
    try {
      await gameStore.transitionPhase('END' as GameStatus)
      success('✅ Partie terminée !')
      // Redirect to dashboard after ending
      navigateTo('/dashboard')
    } catch (error: any) {
      error('❌ Erreur: ' + (error?.data?.statusMessage || 'Impossible de terminer la partie'))
    }
  }
}

async function copyLogs() {
  const logs = gameStore.currentGame?.logs
    .map(l => `[${formatTime(l.timestamp)}] ${l.message}`)
    .join('\n')
  if (logs) {
    await navigator.clipboard.writeText(logs)
  }
}

async function exportStory() {
  const result = await gameStore.getStory()
  if (result?.story) {
    await navigator.clipboard.writeText(result.story)
    success('📖 Histoire copiée !')
  }
}

// ─── Setup Phase Functions ─────────────────────────────────

async function fetchAvailableRoles() {
  try {
    const res = await $fetch<any>('/api/roles')
    if (res.success) {
      availableRoles.value = res.data
    }
  } catch (error) {
    console.error('Failed to fetch roles:', error)
  }
}

function startBotStatusCheck() {
  checkBotStatus() // Check immediately
  botCheckInterval = setInterval(checkBotStatus, 60000) // Check every 60s (reduced from 30s)
}

async function checkBotStatus() {
  try {
    const data = await $fetch('/api/discord/state')
    const now = Date.now()
    botAlive.value = !!(data.bot.lastHeartbeat && (now - data.bot.lastHeartbeat) < 15000)
  } catch (error) {
    botAlive.value = false
  }
}

// Smart input detection
function updateInputHint() {
  const input = smartInput.value.trim()
  
  if (!input) {
    inputHint.value = 'Entrez un nom, un ID utilisateur, ou un ID salon'
    inputType.value = 'name'
    return
  }
  
  // Check if it's a Discord ID (18-19 digit number)
  if (/^\d{17,19}$/.test(input)) {
    // Could be user ID or channel ID - default to user
    inputType.value = 'user'
    inputHint.value = '🆔 ID Discord détecté → Recherche d\'utilisateur (ou salon si introuvable)'
  } else {
    // It's a name
    inputType.value = 'name'
    inputHint.value = '✍️ Nom détecté → Ajout manuel'
  }
}

async function handleSmartAdd() {
  const input = smartInput.value.trim()
  if (!input || isProcessing.value) return
  
  updateInputHint() // Ensure type is detected
  
  if (inputType.value === 'name') {
    await addPlayerByName(input)
  } else {
    // It's a Discord ID - try as user first, then channel if needed
    await addByDiscordId(input)
  }
}

async function addPlayerByName(name: string) {
  if (!gameStore.currentGame) return
  
  try {
    isProcessing.value = true
    const players = [
      ...gameStore.currentGame.players,
      { 
        id: crypto.randomUUID(), 
        name, 
        isAlive: true, 
        isCaptain: false, 
        isInfected: false 
      },
    ]
    await gameStore.updatePlayers(players)
    smartInput.value = ''
    inputHint.value = '✅ Joueur ajouté !'
    
    // Keep focus for quick successive additions
    nextTick(() => {
      smartInputRef.value?.focus()
    })
    
    setTimeout(() => {
      inputHint.value = 'Entrez un nom, un ID utilisateur, ou un ID salon'
    }, 2000)
  } catch (error: any) {
    inputHint.value = '❌ Erreur lors de l\'ajout'
  } finally {
    isProcessing.value = false
  }
}

async function addByDiscordId(discordId: string) {
  if (!gameStore.currentGame) return
  
  if (!botAlive.value) {
    inputHint.value = '⚠️ Le bot Discord n\'est pas connecté'
    return
  }
  
  try {
    isProcessing.value = true
    
    // Try as user ID first
    try {
      await $fetch('/api/discord/request-fetch', {
        method: 'POST',
        body: { 
          discordId,
          gameId: gameStore.currentGame._id,
        },
      })
      
      inputHint.value = '⏳ Recherche de l\'utilisateur...'
      
      // Poll for result with timeout
      let attempts = 0
      const maxAttempts = 10
      const checkInterval = setInterval(async () => {
        attempts++
        await refreshGame()
        
        // Check if player was added
        const playerExists = gameStore.currentGame?.players.some(
          p => p.discordId === discordId
        )
        
        if (playerExists || attempts >= maxAttempts) {
          clearInterval(checkInterval)
          isProcessing.value = false
          
          if (playerExists) {
            smartInput.value = ''
            inputHint.value = '✅ Utilisateur Discord ajouté !'
            setTimeout(() => {
              inputHint.value = 'Entrez un nom, un ID utilisateur, ou un ID salon'
            }, 2000)
          } else {
            // Not found as user, try as channel
            inputHint.value = '👤 Utilisateur introuvable. Essai en tant que salon...'
            await scanChannelById(discordId)
          }
        }
      }, 500)
      
    } catch (error: any) {
      // If user fetch fails, try as channel
      inputHint.value = '🔍 Tentative de scan du salon...'
      await scanChannelById(discordId)
    }
    
  } catch (error: any) {
    inputHint.value = '❌ ' + (error?.data?.statusMessage || 'Erreur')
    isProcessing.value = false
  }
}

async function scanChannelById(channelId: string) {
  if (!gameStore.currentGame) return
  
  try {
    await $fetch('/api/discord/request-scan', {
      method: 'POST',
      body: {
        channelId,
        gameId: gameStore.currentGame._id,
      },
    })
    
    inputHint.value = '⏳ Scan du salon en cours...'
    
    // Poll for pending results
    let attempts = 0
    const maxAttempts = 15
    
    const checkInterval = setInterval(async () => {
      attempts++
      
      try {
        const result = await $fetch<any>('/api/discord/pending-scan')
        
        if (result.players && result.players.length > 0) {
          // Results ready - show modal
          clearInterval(checkInterval)
          isProcessing.value = false
          scannedPlayers.value = result.players
          selectedPlayerIds.value = new Set(result.players.map((p: any) => p.discordId))
          showScanModal.value = true
          smartInput.value = ''
          inputHint.value = 'Entrez un nom, un ID utilisateur, ou un ID salon'
          return
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(checkInterval)
          isProcessing.value = false
          inputHint.value = '⏱️ Délai d\'attente dépassé'
          setTimeout(() => {
            inputHint.value = 'Entrez un nom, un ID utilisateur, ou un ID salon'
          }, 3000)
        }
      } catch (error) {
        // Keep polling
      }
    }, 500)
    
  } catch (error: any) {
    inputHint.value = '❌ Impossible de scanner le salon'
    isProcessing.value = false
  }
}

// Scan modal functions
function togglePlayerSelection(discordId: string) {
  if (selectedPlayerIds.value.has(discordId)) {
    selectedPlayerIds.value.delete(discordId)
  } else {
    selectedPlayerIds.value.add(discordId)
  }
}

function selectAllPlayers() {
  selectedPlayerIds.value = new Set(scannedPlayers.value.map(p => p.discordId))
}

function deselectAllPlayers() {
  selectedPlayerIds.value.clear()
}

async function addSelectedPlayers() {
  if (!gameStore.currentGame || selectedPlayerIds.value.size === 0) return
  
  try {
    const selected = scannedPlayers.value.filter(p => selectedPlayerIds.value.has(p.discordId))
    
    const result = await $fetch('/api/discord/add-selected', {
      method: 'POST',
      body: {
        gameId: gameStore.currentGame._id,
        selectedPlayers: selected,
      },
    })
    
    if (result.success) {
      await gameStore.fetchGame(gameStore.currentGame._id)
      showScanModal.value = false
      scannedPlayers.value = []
      selectedPlayerIds.value.clear()
    }
  } catch (error) {
    console.error('Failed to add selected players:', error)
    alert('❌ Erreur lors de l\'ajout des joueurs')
  }
}

function closeScanModal() {
  showScanModal.value = false
  scannedPlayers.value = []
  selectedPlayerIds.value.clear()
}

async function assignRole(playerId: string, roleId: string) {
  if (!gameStore.currentGame) return
  
  // Get the OLD role from the tracked previous state (before v-model updated)
  const currentPlayerOldRole = previousPlayerRoles.value[playerId] || ''
  
  // If assigning an empty role ("--"), just clear it
  if (!roleId) {
    playerRoles.value[playerId] = ''
    previousPlayerRoles.value[playerId] = ''
    manualRoleAssignments.value[playerId] = false
    return
  }
  
  // Find the role to check if it's unique
  const role = availableRoles.value.find(r => r._id === roleId)
  if (!role) return
  
  // Only apply swap logic for UNIQUE roles
  if (role.isUnique) {
    // Check if another player already has this unique role assigned
    for (const [otherPlayerId, assignedRoleId] of Object.entries(playerRoles.value)) {
      if (otherPlayerId !== playerId && assignedRoleId === roleId) {
        // Found another player with this unique role - SWAP roles
        if (currentPlayerOldRole) {
          // Current player has a role, give it to the other player
          playerRoles.value[otherPlayerId] = currentPlayerOldRole
          previousPlayerRoles.value[otherPlayerId] = currentPlayerOldRole
          // Mark the other player's new assignment as manual too
          manualRoleAssignments.value[otherPlayerId] = true
        } else {
          // Current player has no role, just unassign from other player
          playerRoles.value[otherPlayerId] = ''
          previousPlayerRoles.value[otherPlayerId] = ''
          manualRoleAssignments.value[otherPlayerId] = false
        }
        break
      }
    }
  } else {
    // For non-unique roles, check if we've exceeded the available quantity
    const availableQuantity = roleQuantities.value[roleId] || 0
    
    // Count how many OTHER players have this role (not including current player)
    const othersWithRole = Object.entries(playerRoles.value)
      .filter(([pid, rid]) => pid !== playerId && rid === roleId)
      .length
    
    // If other players already fill all available slots, can't assign to current player
    if (othersWithRole >= availableQuantity) {
      // Revert the selection
      playerRoles.value[playerId] = currentPlayerOldRole
      previousPlayerRoles.value[playerId] = currentPlayerOldRole
      warning(`⚠️ Impossible d'assigner ${role.name} : tous les exemplaires sont déjà attribués (${availableQuantity} disponibles)`)
      return
    }
  }
  
  // Update tracking
  previousPlayerRoles.value[playerId] = roleId
  // Mark this assignment as manual
  manualRoleAssignments.value[playerId] = true
}

async function saveRoleAssignments() {
  if (!gameStore.currentGame) return
  
  try {
    const players = gameStore.currentGame.players.map(player => {
      const roleId = playerRoles.value[player.id]
      const role = roleId ? availableRoles.value.find(r => r._id === roleId) : null
      
      return {
        ...player,
        roleId: roleId || undefined,
        roleName: role?.name || undefined,
        roleTeam: role?.team || undefined,
        roleIsUnique: role?.isUnique || false,
      }
    })
    
    await gameStore.updatePlayers(players)
    // No notification - silent save
  } catch (error: any) {
    warning('❌ Erreur: ' + (error?.data?.statusMessage || 'Impossible d\'assigner les rôles'))
    throw error // Re-throw to prevent transition on error
  }
}

function getRolesByTeam(team: string) {
  const query = roleSearchQuery.value.toLowerCase().trim()
  let filtered = availableRoles.value.filter(role => role.team === team)
  
  if (query) {
    filtered = filtered.filter(role => 
      role.name.toLowerCase().includes(query) || 
      (role.description && role.description.toLowerCase().includes(query))
    )
  }
  
  return filtered
}

// For unique roles: simple toggle
function toggleRole(roleId: string) {
  if (roleQuantities.value[roleId]) {
    // Removing the role - unassign from all players
    roleQuantities.value[roleId] = 0
    unassignRoleFromPlayers(roleId)
  } else {
    roleQuantities.value[roleId] = 1
  }
}

// For non-unique roles: increment/decrement quantity
function incrementRole(roleId: string) {
  if (!roleQuantities.value[roleId]) {
    roleQuantities.value[roleId] = 1
  } else {
    roleQuantities.value[roleId]++
  }
}

function decrementRole(roleId: string) {
  if (roleQuantities.value[roleId] && roleQuantities.value[roleId] > 0) {
    roleQuantities.value[roleId]--
    
    // If quantity reaches 0, unassign from all players
    if (roleQuantities.value[roleId] === 0) {
      unassignRoleFromPlayers(roleId)
    } else {
      // If quantity decreased but still > 0, check if too many players have it
      const playersWithRole = Object.entries(playerRoles.value)
        .filter(([_, assignedRoleId]) => assignedRoleId === roleId)
      
      const newQuantity = roleQuantities.value[roleId]
      
      // If more players have the role than available quantity, unassign excess
      if (playersWithRole.length > newQuantity) {
        // Unassign from the last player(s) assigned
        const excessCount = playersWithRole.length - newQuantity
        for (let i = 0; i < excessCount; i++) {
          const entry = playersWithRole[playersWithRole.length - 1 - i]
          if (entry) {
            const [playerId] = entry
            playerRoles.value[playerId] = ''
          }
        }
      }
    }
  }
}

// Helper function to unassign a role from all players
function unassignRoleFromPlayers(roleId: string) {
  for (const [playerId, assignedRoleId] of Object.entries(playerRoles.value)) {
    if (assignedRoleId === roleId) {
      playerRoles.value[playerId] = ''
    }
  }
}

// Clear all selected roles
async function clearAllRoles() {
  if (totalRoleCount.value === 0) return
  
  const confirmed = await confirm(
    'Cela supprimera également les assignations aux joueurs.',
    '🗑️ Désélectionner tous les rôles ?'
  )
  
  if (confirmed) {
    // Clear all quantities
    roleQuantities.value = {}
    // Clear all player role assignments
    playerRoles.value = {}
    previousPlayerRoles.value = {}
    success('✅ Tous les rôles ont été désélectionnés')
  }
}

// Random assignment of roles to players
// mode: 'rest' = only assign to non-manually assigned players, 'full' = reassign all
function randomAssignRoles(mode: 'rest' | 'full' = 'rest') {
  if (!gameStore.currentGame?.players) return
  
  let playersToAssign: any[]
  
  if (mode === 'full') {
    // Full random: assign to all players
    playersToAssign = gameStore.currentGame.players
  } else {
    // Rest mode: only assign to players without manual assignments
    playersToAssign = gameStore.currentGame.players.filter(player => {
      return !manualRoleAssignments.value[player.id]
    })
  }
  
  if (playersToAssign.length === 0) {
    if (mode === 'rest') {
      info('ℹ️ Tous les joueurs ont été assignés manuellement')
    }
    return
  }
  
  // Get all deck roles
  const allDeckRoles: string[] = []
  for (const entry of expandedDeckRoles.value) {
    allDeckRoles.push(entry.roleId)
  }
  
  // Determine which roles are available for random assignment
  let rolePool: string[] = []
  
  if (mode === 'full') {
    // Full random: use all roles from deck
    rolePool = [...allDeckRoles]
  } else {
    // Rest mode: exclude roles that are manually assigned
    const manuallyAssignedRoleIds: string[] = []
    
    for (const [playerId, isManual] of Object.entries(manualRoleAssignments.value)) {
      if (isManual && playerRoles.value[playerId]) {
        manuallyAssignedRoleIds.push(playerRoles.value[playerId])
      }
    }
    
    // Build pool from remaining roles
    const roleCount: Record<string, number> = {}
    
    // Count total available for each role
    for (const roleId in roleQuantities.value) {
      roleCount[roleId] = roleQuantities.value[roleId] || 0
    }
    
    // Subtract manually assigned roles
    for (const roleId of manuallyAssignedRoleIds) {
      if (roleCount[roleId] !== undefined) {
        roleCount[roleId] = Math.max(0, roleCount[roleId] - 1)
      }
    }
    
    // Build the pool
    for (const [roleId, count] of Object.entries(roleCount)) {
      for (let i = 0; i < count; i++) {
        rolePool.push(roleId)
      }
    }
  }
  
  if (rolePool.length < playersToAssign.length) {
    warning(`⚠️ Pas assez de rôles disponibles (${rolePool.length} rôles pour ${playersToAssign.length} joueurs)`)
    return
  }
  
  // Shuffle the role pool using Fisher-Yates algorithm
  for (let i = rolePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = rolePool[i]
    if (temp && rolePool[j]) {
      rolePool[i] = rolePool[j]!
      rolePool[j] = temp
    }
  }
  
  // Assign roles to players
  for (let i = 0; i < playersToAssign.length; i++) {
    const player = playersToAssign[i]
    const roleId = rolePool[i]
    if (player && roleId) {
      playerRoles.value[player.id] = roleId
      previousPlayerRoles.value[player.id] = roleId
      // Mark as NOT manual (randomized)
      manualRoleAssignments.value[player.id] = false
    }
  }
  
  const modeText = mode === 'full' ? 'Tous les rôles' : `${playersToAssign.length} rôle(s)`
  success(`✅ ${modeText} assigné(s) aléatoirement !`)
}

// Clear all player role assignments
async function clearPlayerAssignments() {
  // Check if there are any assignments to clear
  const hasAssignments = Object.values(playerRoles.value).some(roleId => roleId && roleId !== '')
  
  if (!hasAssignments) {
    info('ℹ️ Aucune assignation de rôle à réinitialiser')
    return
  }
  
  const confirmed = await confirm(
    'Toutes les assignations de rôles des joueurs seront supprimées.',
    '🔄 Réinitialiser les assignations ?'
  )
  
  if (confirmed) {
    playerRoles.value = {}
    previousPlayerRoles.value = {}
    manualRoleAssignments.value = {}
    success('✅ Assignations réinitialisées !')
  }
}

function getRoleCountByTeam(team: string) {
  let count = 0
  for (const roleId in roleQuantities.value) {
    const role = availableRoles.value.find(r => r._id === roleId)
    if (role && role.team === team) {
      count += roleQuantities.value[roleId] || 0
    }
  }
  return count
}

function getRoleName(roleId: string) {
  const role = availableRoles.value.find(r => r._id === roleId)
  return role ? role.name : 'Unknown'
}

function getRoleTeamClass(roleId: string) {
  const role = availableRoles.value.find(r => r._id === roleId)
  if (!role) return ''
  if (role.team === 'WOLF') return 'wolf-role'
  if (role.team === 'VILLAGER') return 'village-role'
  return 'neutral-role'
}

async function copyDeck() {
  if (expandedDeckRoles.value.length === 0) {
    warning('⚠️ Aucun rôle sélectionné')
    return
  }

  // Get all role names
  const roleNames = expandedDeckRoles.value.map(entry => entry.name)

  // Build Discord-formatted text
  const deckText = `# log\n${roleNames.join('\n')}`
  
  await navigator.clipboard.writeText(deckText)
  success('✅ Deck copié dans le presse-papiers !')
}

async function copyRoleToClipboard(player: any) {
  if (!player.roleName || player.roleName === '--') {
    warning('⚠️ Aucun rôle assigné à copier')
    return
  }
  
  try {
    await navigator.clipboard.writeText(player.roleName)
    success(`✅ "${player.roleName}" copié !`)
  } catch (error) {
    warning('❌ Impossible de copier')
  }
}

async function selectPlayerNumber(playerId: string, num: number | null) {
  if (!gameStore.currentGame) return
  
  const players = gameStore.currentGame.players.map(p => 
    p.id === playerId ? { ...p, number: num || undefined } : p
  )
  await gameStore.updatePlayers(players)
  openNumberPicker.value = null
}

async function removePlayer(playerId: string) {
  if (!gameStore.currentGame) return
  const players = gameStore.currentGame.players.filter(p => p.id !== playerId)
  await gameStore.updatePlayers(players)
  // Also remove role assignments from both current and shadow state
  delete playerRoles.value[playerId]
  delete previousPlayerRoles.value[playerId]
}

async function startGame() {
  if (!canStartGame.value) {
    warning(validationState.value.message)
    return
  }
  
  if (isTransitioning.value) return // Prevent double-clicks
  
  // Show spinner immediately before any async work
  isTransitioning.value = true
  
  try {
    // Wait for any pending auto-saves to complete
    if (savePlayerRolesTimeout) {
      clearTimeout(savePlayerRolesTimeout)
      // Trigger immediate save if pending
      if (!isSavingPlayerRoles && gameStore.currentGame) {
        const players = gameStore.currentGame.players.map(player => {
          const roleId = playerRoles.value[player.id]
          const role = roleId ? availableRoles.value.find(r => r._id === roleId) : null
          return {
            ...player,
            roleId: roleId || undefined,
            roleName: role?.name || undefined,
            roleTeam: role?.team || undefined,
            roleIsUnique: role?.isUnique || false,
          }
        })
        await gameStore.updatePlayers(players)
      }
    }
    
    // Transition to confirmation phase (skip double-check since we already set isTransitioning)
    await gameStore.transitionPhase('CONFIRMATION' as GameStatus)
  } catch (error) {
    console.error('Failed to start game:', error)
    warning('❌ Erreur lors du démarrage')
  } finally {
    isTransitioning.value = false
  }
}

async function refreshGame() {
  if (gameStore.currentGame) {
    await gameStore.fetchGame(gameStore.currentGame._id)
  }
}
</script>

<style lang="scss">
@use "sass:color";
@use '~/assets/scss/variables' as *;

.game-page {
  background:
    radial-gradient(ellipse at 30% 20%, rgba($violet-600, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba($pink-400, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba($violet-800, 0.2) 0%, transparent 70%);
}

// ─── Night Stars ──────────────────────────────────────────────
.night-stars-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.night-moon-ambient {
  position: absolute;
  top: -120px;
  left: 50%;
  transform: translateX(-50%);
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(160, 100, 255, 0.12) 0%, transparent 70%);
  animation: ambient-pulse 6s ease-in-out infinite;
}

@keyframes ambient-pulse {
  0%, 100% { opacity: 0.6; transform: translateX(-50%) scale(1); }
  50%       { opacity: 1;   transform: translateX(-50%) scale(1.1); }
}

.stars-layer {
  position: absolute;
  inset: 0;
  background-repeat: repeat;
  animation: stars-drift linear infinite;
}

.stars-small {
  background-image:
    radial-gradient(1px 1px at 10% 15%, rgba(255,255,255,0.9) 0%, transparent 100%),
    radial-gradient(1px 1px at 25% 40%, rgba(255,255,255,0.7) 0%, transparent 100%),
    radial-gradient(1px 1px at 40% 8%,  rgba(255,255,255,0.8) 0%, transparent 100%),
    radial-gradient(1px 1px at 55% 55%, rgba(255,255,255,0.6) 0%, transparent 100%),
    radial-gradient(1px 1px at 70% 22%, rgba(255,255,255,0.9) 0%, transparent 100%),
    radial-gradient(1px 1px at 85% 70%, rgba(255,255,255,0.7) 0%, transparent 100%),
    radial-gradient(1px 1px at 15% 75%, rgba(255,255,255,0.8) 0%, transparent 100%),
    radial-gradient(1px 1px at 30% 90%, rgba(255,255,255,0.5) 0%, transparent 100%),
    radial-gradient(1px 1px at 60% 35%, rgba(255,255,255,0.7) 0%, transparent 100%),
    radial-gradient(1px 1px at 90% 12%, rgba(255,255,255,0.9) 0%, transparent 100%),
    radial-gradient(1px 1px at 5%  50%, rgba(255,255,255,0.6) 0%, transparent 100%),
    radial-gradient(1px 1px at 45% 65%, rgba(255,255,255,0.8) 0%, transparent 100%),
    radial-gradient(1px 1px at 75% 85%, rgba(255,255,255,0.7) 0%, transparent 100%),
    radial-gradient(1px 1px at 20% 28%, rgba(200,180,255,0.8) 0%, transparent 100%),
    radial-gradient(1px 1px at 95% 45%, rgba(255,255,255,0.6) 0%, transparent 100%),
    radial-gradient(1px 1px at 50% 80%, rgba(255,255,255,0.7) 0%, transparent 100%),
    radial-gradient(1px 1px at 35% 18%, rgba(255,255,255,0.9) 0%, transparent 100%),
    radial-gradient(1px 1px at 80% 58%, rgba(200,180,255,0.7) 0%, transparent 100%);
  background-size: 300px 300px;
  animation-duration: 120s;
  opacity: 0.7;
}

.stars-medium {
  background-image:
    radial-gradient(1.5px 1.5px at 18% 32%, rgba(255,255,255,0.9) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 42% 60%, rgba(220,200,255,0.9) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 67% 14%, rgba(255,255,255,0.8) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 83% 78%, rgba(255,255,255,0.9) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 7%  88%, rgba(220,200,255,0.8) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 55% 42%, rgba(255,255,255,0.7) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 92% 25%, rgba(255,255,255,0.9) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 30% 70%, rgba(220,200,255,0.8) 0%, transparent 100%);
  background-size: 500px 500px;
  animation-duration: 180s;
  opacity: 0.6;
  animation-direction: reverse;
}

.stars-large {
  background-image:
    radial-gradient(2px 2px at 22% 18%, rgba(255,255,255,1)   0%, transparent 100%),
    radial-gradient(2px 2px at 58% 72%, rgba(220,200,255,0.9) 0%, transparent 100%),
    radial-gradient(2px 2px at 78% 38%, rgba(255,255,255,1)   0%, transparent 100%),
    radial-gradient(2px 2px at 12% 55%, rgba(220,200,255,0.9) 0%, transparent 100%),
    radial-gradient(3px 3px at 45% 25%, rgba(255,255,255,0.9) 0%, transparent 100%),
    radial-gradient(2px 2px at 88% 85%, rgba(255,255,255,1)   0%, transparent 100%);
  background-size: 700px 700px;
  animation-duration: 240s;
  opacity: 0.8;
  animation-name: stars-twinkle;
}

@keyframes stars-drift {
  from { background-position: 0 0; }
  to   { background-position: 300px 300px; }
}

@keyframes stars-twinkle {
  0%   { opacity: 0.8; background-position: 0 0; }
  25%  { opacity: 1; }
  50%  { opacity: 0.6; background-position: 350px 350px; }
  75%  { opacity: 1; }
  100% { opacity: 0.8; background-position: 700px 700px; }
}

.stars-fade-enter-active { transition: opacity 1.5s ease; }
.stars-fade-leave-active { transition: opacity 2s ease; }
.stars-fade-enter-from,
.stars-fade-leave-to    { opacity: 0; }

.game-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
  color: $text-muted;
}

// ─── Game Ended Banner ──────────────────────────────────────
.game-ended-banner {
  background: linear-gradient(135deg, rgba($violet-600, 0.15), rgba($pink-500, 0.1));
  border: 2px solid rgba($violet-400, 0.3);
  border-radius: $radius-lg;
  padding: 3rem 2rem;
  margin-bottom: 2rem;
  text-align: center;
  
  .ended-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  
  .ended-icon {
    font-size: 4rem;
    filter: drop-shadow(0 0 10px rgba($violet-400, 0.5));
  }
  
  .ended-title {
    @include elegant-text();
    font-size: 2rem;
    font-weight: 700;
    color: $text-primary;
  }
  
  .ended-subtitle {
    font-size: 1rem;
    color: $text-secondary;
    margin-bottom: 1rem;
  }
  
  .ended-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }
}

// ─── Confirmation Interface ──────────────────────────────────
.confirmation-interface {
  padding: 1rem;
  min-height: calc(100vh - 80px);
  max-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.confirmation-container {
  max-width: 1400px;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

// ─── Header with Fairytale Style ───
.confirmation-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid rgba($violet-400, 0.2);
}

.confirmation-icon-wrap {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba($violet-500, 0.2), rgba($pink-500, 0.15));
  border: 2px solid rgba($violet-400, 0.4);
  box-shadow: 0 4px 16px rgba($violet-500, 0.3), inset 0 2px 8px rgba(255, 255, 255, 0.1);
  transition: all $transition-base;
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.05) rotate(5deg);
    box-shadow: 0 6px 20px rgba($violet-500, 0.4);
  }
}

.confirmation-icon {
  font-size: 1.5rem;
  background: linear-gradient(135deg, $violet-300, $pink-300);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.confirmation-header-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.confirmation-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  font-weight: 700;
  font-style: italic;
  background: linear-gradient(135deg, $violet-200, $pink-300);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
  letter-spacing: 0.5px;
}

.confirmation-subtitle {
  font-size: 0.75rem;
  color: $text-secondary;
  letter-spacing: 0.3px;
  font-weight: 500;
}

// ─── Three Column Team Grid ───
.confirmation-teams {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  flex: 1;
  min-height: 0;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
}

.team-bubble {
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  border-radius: $radius-md;
  overflow: hidden;
  
  &.team-wolf {
    border: 2px solid rgba($wolf-red, 0.5);
    background: rgba($wolf-red, 0.08);
  }
  
  &.team-villager {
    border: 2px solid rgba(#4ade80, 0.5);
    background: rgba(#4ade80, 0.08);
  }
  
  &.team-neutral {
    border: 2px solid rgba($violet-400, 0.5);
    background: rgba($violet-500, 0.08);
  }
}

.team-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.team-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.team-title {
  font-size: 0.9rem;
  font-weight: 700;
  flex: 1;
  
  .team-wolf & {
    color: $wolf-red;
  }
  
  .team-villager & {
    color: #4ade80;
  }
  
  .team-neutral & {
    color: $violet-300;
  }
}

.team-count {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.3);
  
  .team-wolf & {
    color: $wolf-red;
    border: 2px solid rgba($wolf-red, 0.5);
  }
  
  .team-villager & {
    color: #4ade80;
    border: 2px solid rgba(#4ade80, 0.5);
  }
  
  .team-neutral & {
    color: $violet-300;
    border: 2px solid rgba($violet-400, 0.5);
  }
}

.team-players {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  overflow-y: auto;
  flex: 1;
  padding-right: 0.5rem;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba($violet-400, 0.3);
    border-radius: 2px;
    
    &:hover {
      background: rgba($violet-400, 0.5);
    }
  }
}

.team-player {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: $radius-sm;
  transition: all $transition-fast;
  cursor: pointer;
  
  &:hover {
    background: rgba(0, 0, 0, 0.4);
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba($violet-400, 0.15);
  }
}

.player-number-small {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.3);
  
  .team-wolf & {
    color: $wolf-red;
    border: 1px solid rgba($wolf-red, 0.5);
  }
  
  .team-villager & {
    color: #4ade80;
    border: 1px solid rgba(#4ade80, 0.5);
  }
  
  .team-neutral & {
    color: $violet-300;
    border: 1px solid rgba($violet-400, 0.5);
  }
}

.player-avatar-small {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
  overflow: hidden;
  background: linear-gradient(135deg, rgba($violet-500, 0.4), rgba($pink-400, 0.3));
  border: 1px solid rgba(255, 255, 255, 0.2);

  &.has-image {
    background: transparent;
    padding: 0;
  }

  .avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .team-wolf & {
    border-color: rgba($wolf-red, 0.5);
  }
  
  .team-villager & {
    border-color: rgba(#4ade80, 0.5);
  }
  
  .team-neutral & {
    border-color: rgba($violet-400, 0.5);
  }
}

.player-name-small {
  font-size: 0.75rem;
  font-weight: 600;
  color: $text-primary;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-role-small {
  font-size: 0.65rem;
  font-weight: 500;
  padding: 0.15rem 0.45rem;
  border-radius: $radius-sm;
  background: rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  
  .team-wolf & {
    color: $wolf-red;
    border: 1px solid rgba($wolf-red, 0.3);
  }
  
  .team-villager & {
    color: #4ade80;
    border: 1px solid rgba(#4ade80, 0.3);
  }
  
  .team-neutral & {
    color: $violet-300;
    border: 1px solid rgba($violet-400, 0.3);
  }
}

.team-empty {
  padding: 1.5rem;
  text-align: center;
  color: $text-muted;
  font-style: italic;
  font-size: 0.8rem;
}

// ─── Action Buttons ───
.confirmation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  padding-top: 0.5rem;
  border-top: 2px solid rgba($violet-400, 0.2);
}

.confirmation-warning {
  width: 100%;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: $rose-400;
  margin: 0;
  padding: 0.4rem 0.8rem;
  background: rgba($rose-400, 0.08);
  border-radius: $radius-md;
  border: 1px solid rgba($rose-400, 0.2);
}

.btn-confirmation-edit {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.4rem;
  border-radius: $radius-md;
  border: 2px solid rgba($violet-400, 0.4);
  background: rgba($violet-500, 0.1);
  color: $text-primary;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover:not(:disabled) {
    border-color: $violet-400;
    background: rgba($violet-500, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba($violet-500, 0.3);
  }

  &:disabled {
    cursor: wait;
    opacity: 1;
    animation: pulse-glow 1.5s ease-in-out infinite;
  }
}

.btn-normalize-names {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.2rem;
  border-radius: $radius-md;
  border: 2px solid rgba($pink-400, 0.5);
  background: rgba($pink-400, 0.08);
  color: $pink-300;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;
  white-space: nowrap;

  &:hover:not(:disabled) {
    border-color: $pink-400;
    background: rgba($pink-400, 0.18);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba($pink-400, 0.25);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }
}

.btn-confirmation-start {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.4rem;
  border-radius: $radius-md;
  border: 2px solid $violet-400;
  background: linear-gradient(135deg, rgba($violet-500, 0.3), rgba($pink-500, 0.2));
  color: $violet-100;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-base;
  box-shadow: $glow-violet;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba($violet-500, 0.4), rgba($pink-500, 0.3));
    border-color: $violet-300;
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba($violet-500, 0.5);
  }

  &:disabled {
    cursor: wait;
    opacity: 1;
    animation: pulse-glow 1.5s ease-in-out infinite;
  }
}

// ─── Captain Election Interface ─────────────────────────────
.captain-interface {
  padding: 0.5rem 1.5rem 0.8rem;
  animation: fadeInUp 0.6s ease-out;
}

.captain-container {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
}

// Captain Header
.captain-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.captain-crown-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: 0.2rem;
}

.captain-crown {
  font-size: 2rem;
  z-index: 2;
  position: relative;
  animation: crown-float 3s ease-in-out infinite;
  filter: drop-shadow(0 0 12px rgba($violet-400, 0.5));
}

.crown-rays {
  position: absolute;
  inset: -8px;
  z-index: 1;
}

.crown-ray {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, rgba($violet-400, 0.4), transparent);
  transform-origin: 0 50%;
  animation: ray-pulse 3s ease-in-out infinite;
}

@keyframes crown-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

@keyframes ray-pulse {
  0%, 100% { opacity: 0.2; width: 30px; }
  50% { opacity: 0.6; width: 44px; }
}

.captain-title {
  @include elegant-text();
  font-size: 1.5rem;
  background: linear-gradient(135deg, $violet-300, $pink-300);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-style: italic;
}

.captain-subtitle {
  color: $text-muted;
  font-size: 0.78rem;
  font-weight: 500;
}

// Player Circle Arena
.captain-arena {
  position: relative;
  width: 640px;
  height: 640px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  @media (max-width: 700px) {
    width: 360px;
    height: 360px;
  }
}

.arena-center {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  z-index: 1;

  .arena-center-icon {
    font-size: 2rem;
    filter: drop-shadow(0 0 12px rgba($violet-400, 0.6));
    animation: crown-float 3s ease-in-out infinite;
  }

  .arena-center-label {
    font-size: 0.75rem;
    color: $text-muted;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.circle-player {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  /* Rotate-translate-counter-rotate for circle layout */
  transform: translate(-50%, -50%) rotate(var(--angle)) translateX(275px) rotate(calc(-1 * var(--angle)));
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: circle-appear 0.5s ease-out backwards;
  animation-delay: var(--delay);

  @media (max-width: 700px) {
    transform: translate(-50%, -50%) rotate(var(--angle)) translateX(155px) rotate(calc(-1 * var(--angle)));
  }

  &:hover {
    z-index: 10;
    .circle-player-avatar {
      transform: scale(1.15);
      box-shadow: 0 0 24px rgba($violet-400, 0.6);
      border-color: $violet-400;
    }
  }

  &.candidate {
    .circle-player-avatar {
      border-color: $violet-400;
      box-shadow: 0 0 20px rgba($violet-400, 0.5), 0 0 40px rgba($violet-400, 0.15);
      background: linear-gradient(135deg, rgba($violet-500, 0.3), rgba($pink-400, 0.2));
    }
    .circle-player-name {
      color: $violet-200;
      font-weight: 700;
    }
  }

  &.not-candidate {
    opacity: 0.4;
    filter: grayscale(0.3);
  }
}

@keyframes circle-appear {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3);
  }
  to {
    opacity: 1;
  }
}

.circle-player-avatar {
  width: 62px;
  height: 62px;
  border-radius: 50%;
  border: 2px solid $border-subtle;
  background: rgba($violet-600, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;

  .circle-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  .circle-avatar-letter {
    font-size: 1.4rem;
    font-weight: 700;
    color: $violet-200;
  }

  .circle-player-number {
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: $bg-primary;
    border: 1.5px solid $border-subtle;
    font-size: 0.65rem;
    font-weight: 700;
    color: $violet-300;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.candidate-badge {
  position: absolute;
  top: -6px;
  left: -6px;
  font-size: 1rem;
  filter: drop-shadow(0 0 6px rgba($violet-400, 0.8));
  animation: pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.circle-player-name {
  font-size: 0.85rem;
  color: $text-secondary;
  font-weight: 600;
  text-align: center;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.3s ease;
}

// Captain Actions
.captain-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.captain-actions-buttons {
  display: flex;
  gap: 1rem;
  width: 100%;
  justify-content: center;
}

.btn-captain-skip {
  padding: 0.5rem 1.2rem;
  border-radius: $radius-md;
  border: 1px solid $border-subtle;
  background: rgba($violet-500, 0.06);
  color: $text-muted;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;

  &:hover:not(:disabled) {
    background: rgba($violet-500, 0.12);
    color: $text-secondary;
    border-color: $border-active;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.5;
  }
}

.btn-captain-proceed {
  padding: 0.6rem 1.6rem;
  border-radius: $radius-md;
  border: 2px solid $violet-400;
  background: linear-gradient(135deg, rgba($violet-500, 0.25), rgba($pink-500, 0.15));
  color: $violet-100;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-base;
  box-shadow: $glow-violet;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba($violet-500, 0.4), rgba($pink-500, 0.25));
    border-color: $violet-300;
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba($violet-500, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }
}

// ─── Captain Actions Row ────────────────────────────

.captain-actions-row {
  display: inline-flex;
  gap: 0.8rem;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.btn-captain-back-lobby {
  padding: 0.5rem 1.2rem;
  border-radius: $radius-md;
  border: 1px solid $border-subtle;
  background: rgba($violet-500, 0.06);
  color: $text-muted;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;
  display: flex;
  align-items: center;
  gap: 0.3rem;

  &:hover:not(:disabled) {
    background: rgba($violet-500, 0.12);
    color: $text-secondary;
    border-color: $border-active;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.5;
  }
}

// ─── Captain Body (Arena + Spin Sidebar) ────────────────────

.captain-body {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

// ─── Spin Sidebar ────────────────────────────

.spin-sidebar {
  position: absolute;
  right: -12rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
  padding: 0.8rem;
  border-radius: $radius-lg;
  border: 1px solid rgba($violet-400, 0.25);
  background: linear-gradient(160deg, rgba($violet-900, 0.85), rgba($bg-primary, 0.9));
  backdrop-filter: blur(12px);
  min-width: 140px;
  max-width: 160px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);

  .spin-sidebar-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: $violet-200;
  }

  .spin-sidebar-desc {
    font-size: 0.68rem;
    color: $text-muted;
    text-align: center;
    line-height: 1.4;
    margin: 0;
  }
}

.slide-right-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.slide-right-leave-active {
  transition: all 0.25s ease-in;
}
.slide-right-enter-from,
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.spin-count-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}

.spin-count-label {
  font-size: 0.68rem;
  color: $text-muted;
  font-weight: 600;
  margin-bottom: 0.1rem;
}

.spin-count-btns {
  display: flex;
  gap: 0.3rem;
}

.spin-count-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid $border-subtle;
  background: rgba($violet-500, 0.08);
  color: $text-muted;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: $violet-400;
    color: $violet-200;
    background: rgba($violet-500, 0.2);
  }

  &.active {
    border-color: $violet-400;
    background: linear-gradient(135deg, rgba($violet-500, 0.4), rgba($pink-500, 0.2));
    color: $violet-100;
    box-shadow: 0 0 12px rgba($violet-500, 0.4);
    transform: scale(1.1);
  }
}

.btn-captain-spin {
  padding: 0.5rem 1rem;
  border-radius: $radius-md;
  border: 2px solid $violet-400;
  background: linear-gradient(135deg, rgba($violet-500, 0.3), rgba($pink-500, 0.2));
  color: $violet-100;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-base;
  box-shadow: 0 0 16px rgba($violet-500, 0.3);
  white-space: nowrap;
  width: 100%;
  text-align: center;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba($violet-500, 0.5), rgba($pink-500, 0.3));
    border-color: $violet-300;
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba($violet-500, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }
}

// ─── Captain Spin Phase ────────────────────────────

.spin-container {
  gap: 0.6rem;
}

.spin-arena {
  min-height: 520px;
}

.spin-player {
  transition: all 0.2s ease;

  &.spin-highlight {
    .circle-player-avatar {
      border-color: $violet-300;
      box-shadow: 0 0 24px rgba($violet-400, 0.7), 0 0 48px rgba($pink-400, 0.3);
      transform: scale(1.2);
    }

    .circle-player-name {
      color: $violet-100;
      font-weight: 700;
    }
  }

  &.spin-selected {
    .circle-player-avatar {
      border-color: #10b981;
      box-shadow: 0 0 20px rgba(#10b981, 0.5), 0 0 40px rgba(#10b981, 0.2);
      transform: scale(1.1);
    }

    .circle-player-name {
      color: #10b981;
      font-weight: 700;
    }
  }

  &.spin-eliminated {
    opacity: 0.35;
    filter: grayscale(0.6);

    .circle-player-avatar {
      border-color: rgba($text-muted, 0.3);
      transform: scale(0.9);
    }

    .circle-player-name {
      color: $text-muted;
    }
  }
}

.spin-center-anim {
  display: flex;
  align-items: center;
  justify-content: center;

  .spin-dice {
    font-size: 2.5rem;
    animation: spin-dice 0.6s linear infinite;
    filter: drop-shadow(0 0 16px rgba($violet-400, 0.6));
  }
}

.spin-center-done {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);

  .spin-done-icon {
    font-size: 2rem;
    filter: drop-shadow(0 0 12px rgba(#10b981, 0.6));
  }

  .spin-done-label {
    font-size: 0.8rem;
    color: #10b981;
    font-weight: 700;
  }
}

.eliminated-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  font-size: 0.9rem;
  filter: drop-shadow(0 0 6px rgba(#ef4444, 0.8));
  animation: pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes spin-dice {
  0% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(90deg) scale(1.1); }
  50% { transform: rotate(180deg) scale(1); }
  75% { transform: rotate(270deg) scale(1.1); }
  100% { transform: rotate(360deg) scale(1); }
}

// ─── Captain Vote Phase (Circle) ────────────────────────────

.captain-vote-phase {
  padding: 0.5rem 1rem 1rem;
}

.vote-layout-container {
  max-width: 750px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  animation: fadeInUp 0.5s ease-out;
}

// Header
.vote-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;

  .vote-header-icon {
    font-size: 1.2rem;
  }

  .vote-header-title {
    @include elegant-text();
    font-size: 1.2rem;
    background: linear-gradient(135deg, $violet-300, $pink-300);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-style: italic;
    margin: 0;
  }

  .vote-header-count {
    font-size: 0.72rem;
    font-weight: 700;
    color: $text-muted;
    background: rgba($violet-500, 0.1);
    padding: 2px 8px;
    border-radius: 100px;
    border: 1px solid $border-subtle;
  }
}

// Vote Arena — reuses .captain-arena but with vote-specific tweaks
.vote-arena {
  margin: 0 auto;
  width: 640px;
  height: 640px;

  @media (max-width: 700px) {
    width: 420px;
    height: 420px;
  }

  .circle-player {
    transform: translate(-50%, -50%) rotate(var(--angle)) translateX(280px) rotate(calc(-1 * var(--angle)));

    @media (max-width: 700px) {
      transform: translate(-50%, -50%) rotate(var(--angle)) translateX(175px) rotate(calc(-1 * var(--angle)));
    }
  }
}

// Center tally
.vote-center {
  gap: 6px !important;
}

.vote-tally-center {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
}

.tally-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 12px;
  border-radius: 100px;
  transition: all 0.3s ease;

  &.is-leader {
    background: rgba($violet-500, 0.1);
    .tally-name { color: $violet-200; }
    .tally-count { color: $violet-200; }
  }
}

.tally-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tally-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: $text-muted;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tally-count {
  font-size: 1rem;
  font-weight: 800;
  color: $text-secondary;
  min-width: 10px;
  text-align: center;
}

.vote-center-winner {
  font-size: 1rem;
  font-weight: 700;
  color: $violet-300;
  animation: pulse-glow 2s ease-in-out infinite;
}

.vote-center-tie {
  font-size: 0.95rem;
  font-weight: 700;
  color: $rose-400;
}

.vote-center-waiting {
  font-size: 0.9rem;
  font-weight: 600;
  color: $text-muted;
  font-style: italic;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

// Tally view wrapper (center default)
.vote-tally-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

// ─── Vote Picker (center overlay when voter selected) ───
.vote-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  animation: picker-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes picker-in {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

.picker-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.picker-voter-name {
  font-size: 0.75rem;
  font-weight: 800;
  color: $violet-200;
  @include elegant-text();
}

.picker-label {
  font-size: 0.65rem;
  color: $text-muted;
  font-style: italic;
}

.picker-close {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid $border-subtle;
  background: rgba($violet-500, 0.1);
  color: $text-muted;
  font-size: 0.6rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba($rose-400, 0.2);
    border-color: $rose-400;
    color: $rose-400;
  }
}

.picker-candidates {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.picker-candidate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 8px;
  border-radius: $radius-md;
  border: 2px solid transparent;
  background: rgba($violet-500, 0.06);
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;

  &:hover {
    border-color: var(--pick-color);
    background: rgba($violet-500, 0.12);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }

  &.is-selected {
    border-color: var(--pick-color);
    background: rgba($violet-500, 0.15);
    box-shadow: 0 0 20px color-mix(in srgb, var(--pick-color) 30%, transparent);

    .picker-avatar {
      box-shadow: 0 0 12px color-mix(in srgb, var(--pick-color) 50%, transparent);
    }
  }
}

.picker-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2.5px solid;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($bg-primary, 0.5);
  transition: all 0.25s ease;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  span {
    font-size: 0.7rem;
    font-weight: 800;
    color: $violet-200;
  }
}

.picker-name {
  font-size: 0.6rem;
  font-weight: 700;
  color: $text-secondary;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-check {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--pick-color);
  color: white;
  font-size: 0.55rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.picker-clear {
  font-size: 0.6rem;
  font-weight: 600;
  color: $rose-400;
  border: 1px solid rgba($rose-400, 0.3);
  background: rgba($rose-400, 0.08);
  padding: 2px 10px;
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba($rose-400, 0.18);
    border-color: $rose-400;
  }
}

// Vote-specific player styles (extends .circle-player)
.vote-player {
  // Candidates: not clickable, they just show vote counts
  &.is-candidate {
    cursor: default;

    .circle-player-avatar {
      border-width: 3px;
      border-color: var(--candidate-color);
      box-shadow: 0 0 16px rgba(var(--candidate-color), 0.3);
      background: linear-gradient(135deg, rgba($violet-500, 0.25), rgba($pink-400, 0.15));
    }

    .circle-player-name {
      color: $violet-200;
      font-weight: 700;
    }

    &.is-leading {
      .circle-player-avatar {
        box-shadow: 0 0 24px rgba($violet-400, 0.5), 0 0 48px rgba($violet-400, 0.15);
        animation: leader-pulse 2s ease-in-out infinite;
      }
    }

    &.is-elected {
      .circle-player-avatar {
        border-color: $neutral-amber;
        box-shadow: 0 0 30px rgba($neutral-amber, 0.5), 0 0 60px rgba($neutral-amber, 0.15);
      }
    }
  }

  // Voters: clickable, show vote indicator
  &.is-voter {
    cursor: pointer;

    &:hover {
      .circle-player-avatar {
        transform: scale(1.18);
        box-shadow: 0 0 20px rgba($violet-400, 0.4);
      }
    }

    &.has-voted {
      .circle-player-avatar {
        border-width: 2.5px;
        // border-color set inline via :style
      }
      .circle-player-name {
        font-weight: 700;
      }
    }

    &:not(.has-voted) {
      .circle-player-avatar {
        border-style: dashed;
        border-color: rgba($violet-400, 0.25);
        opacity: 0.7;
      }
      &:hover .circle-player-avatar {
        opacity: 1;
        border-style: solid;
        border-color: $violet-400;
      }
    }

    // Currently selecting this voter
    &.is-selecting {
      .circle-player-avatar {
        transform: scale(1.25);
        border-style: solid;
        border-color: $violet-300;
        border-width: 3px;
        box-shadow: 0 0 24px rgba($violet-400, 0.6), 0 0 48px rgba($violet-400, 0.15);
        animation: selecting-pulse 1.5s ease-in-out infinite;
      }
      .circle-player-name {
        color: $violet-200;
        font-weight: 800;
      }
    }
  }
}

@keyframes selecting-pulse {
  0%, 100% { box-shadow: 0 0 24px rgba($violet-400, 0.6); }
  50% { box-shadow: 0 0 32px rgba($violet-400, 0.9), 0 0 56px rgba($violet-400, 0.25); }
}

@keyframes leader-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba($violet-400, 0.4); }
  50% { box-shadow: 0 0 36px rgba($violet-400, 0.7), 0 0 60px rgba($violet-400, 0.2); }
}

// Vote indicator: mini avatar overlay on voted players
.vote-indicator {
  position: absolute;
  bottom: -4px;
  left: -4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  z-index: 3;
  animation: pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  .vote-indicator-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  .vote-indicator-letter {
    font-size: 0.5rem;
    font-weight: 800;
    color: white;
  }
}

// Crown badge for elected
.vote-crown-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  font-size: 1.2rem;
  filter: drop-shadow(0 0 8px rgba($neutral-amber, 0.8));
  animation: crown-float 2s ease-in-out infinite;
  z-index: 4;
}

// Vote count below candidate names
.circle-vote-count {
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.3px;
}

// Bottom action bar
.vote-bottom-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.5rem 0.8rem;
  @include glass(0.04);
  border-radius: $radius-lg;
  flex-wrap: wrap;
  width: 100%;
  max-width: 600px;
}

.btn-captain-back {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.9rem;
  border-radius: $radius-md;
  border: 1px solid $border-subtle;
  background: rgba($violet-500, 0.06);
  color: $text-muted;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;

  &:hover:not(:disabled) {
    background: rgba($violet-500, 0.12);
    border-color: $border-active;
    color: $text-secondary;
  }

  &:disabled {
    opacity: 0.5;
    cursor: wait;
  }
}

.vote-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  justify-content: center;
}

.vote-leader {
  font-size: 0.8rem;
  font-weight: 700;
  color: $violet-300;
}

.vote-tie {
  font-size: 0.8rem;
  font-weight: 700;
  color: $rose-400;
}

.vote-waiting {
  font-size: 0.75rem;
  font-weight: 600;
  color: $text-muted;
  font-style: italic;
}

.btn-captain-confirm {
  padding: 0.45rem 1.2rem;
  border-radius: $radius-md;
  border: 2px solid rgba($neutral-amber, 0.5);
  background: linear-gradient(135deg, rgba($neutral-amber, 0.15), rgba($violet-500, 0.1));
  color: $violet-100;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-base;
  box-shadow: 0 0 12px rgba($neutral-amber, 0.12);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba($neutral-amber, 0.25), rgba($violet-500, 0.15));
    border-color: $neutral-amber;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba($neutral-amber, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  .elected-text {
    color: $neutral-amber;
  }
}

// ─── Elected actions container ───
.elected-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

// ─── Undo button ───
.btn-captain-undo {
  padding: 0.45rem 0.9rem;
  border-radius: $radius-md;
  border: 1px solid rgba($rose-400, 0.4);
  background: rgba($rose-400, 0.08);
  color: $rose-300;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;

  &:hover:not(:disabled) {
    background: rgba($rose-400, 0.15);
    border-color: $rose-400;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// ─── Proceed to night button ───
.btn-captain-next {
  padding: 0.45rem 1.2rem;
  border-radius: $radius-md;
  border: 2px solid rgba($violet-400, 0.5);
  background: linear-gradient(135deg, rgba($violet-500, 0.2), rgba($violet-700, 0.15));
  color: $violet-100;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-base;
  box-shadow: 0 0 12px rgba($violet-400, 0.15);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba($violet-500, 0.3), rgba($violet-700, 0.2));
    border-color: $violet-400;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba($violet-400, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// ─── Tie-break button ───
.btn-captain-tiebreak {
  padding: 0.45rem 1.2rem;
  border-radius: $radius-md;
  border: 2px solid rgba($rose-400, 0.5);
  background: linear-gradient(135deg, rgba($rose-400, 0.15), rgba($violet-500, 0.1));
  color: $violet-100;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-base;
  box-shadow: 0 0 12px rgba($rose-400, 0.12);
  animation: tiebreak-pulse 2s ease-in-out infinite;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba($rose-400, 0.25), rgba($violet-500, 0.15));
    border-color: $rose-400;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba($rose-400, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

@keyframes tiebreak-pulse {
  0%, 100% { box-shadow: 0 0 12px rgba($rose-400, 0.12); }
  50% { box-shadow: 0 0 20px rgba($rose-400, 0.3); }
}

// ─── Tie-break panel ───
.tiebreak-panel {
  position: relative;
  width: 100%;
  max-width: 600px;
  padding: 1rem 1.2rem;
  @include glass(0.08);
  border: 1px solid rgba($rose-400, 0.3);
  border-radius: $radius-lg;
  margin-top: 0.5rem;
}

.tiebreak-header {
  text-align: center;
  margin-bottom: 0.8rem;

  h3 {
    font-family: $font-display;
    font-size: 1.15rem;
    font-weight: 700;
    color: $rose-300;
    margin: 0 0 0.6rem 0;
  }
}

.tiebreak-tied-players {
  display: flex;
  justify-content: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.tiebreak-player-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: $radius-md;
  border: 1px solid;
  @include glass(0.06);
  font-size: 0.85rem;
  font-weight: 600;
  color: $text-primary;
}

.tiebreak-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.tiebreak-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.6rem 0.5rem;
  border-radius: $radius-md;
  border: 1px solid $border-subtle;
  @include glass(0.04);
  cursor: pointer;
  transition: all $transition-base;
  text-align: center;

  &:hover:not(:disabled) {
    border-color: $border-active;
    @include glass(0.1);
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.tiebreak-icon {
  font-size: 1.6rem;
  line-height: 1;
}

.tiebreak-label {
  font-size: 0.88rem;
  font-weight: 700;
  color: $text-primary;
}

.tiebreak-desc {
  font-size: 0.72rem;
  color: $text-muted;
  line-height: 1.35;
}

.tiebreak-random:hover:not(:disabled) {
  border-color: rgba($neutral-amber, 0.5);
  box-shadow: 0 4px 16px rgba($neutral-amber, 0.15);
}

.tiebreak-pick:hover:not(:disabled) {
  border-color: rgba($violet-400, 0.5);
  box-shadow: 0 4px 16px rgba($violet-400, 0.15);
}

.tiebreak-revote-tied:hover:not(:disabled) {
  border-color: rgba($rose-400, 0.5);
  box-shadow: 0 4px 16px rgba($rose-400, 0.15);
}

.tiebreak-revote-all:hover:not(:disabled) {
  border-color: rgba($pink-400, 0.5);
  box-shadow: 0 4px 16px rgba($pink-400, 0.15);
}

// ─── Pick mode ───
.tiebreak-pick-grid {
  text-align: center;
}

.tiebreak-pick-prompt {
  font-size: 0.9rem;
  font-weight: 600;
  color: $text-secondary;
  margin: 0 0 0.6rem 0;
}

.tiebreak-pick-candidates {
  display: flex;
  justify-content: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-bottom: 0.6rem;
}

.tiebreak-pick-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.6rem 0.8rem;
  border-radius: $radius-md;
  border: 2px solid;
  @include glass(0.04);
  cursor: pointer;
  transition: all $transition-base;
  min-width: 80px;

  &:hover:not(:disabled) {
    @include glass(0.12);
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba($violet-500, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.tiebreak-pick-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  @include glass(0.08);
  font-size: 0.85rem;
  font-weight: 700;
  color: $text-primary;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.tiebreak-pick-name {
  font-size: 0.75rem;
  font-weight: 700;
  color: $text-primary;
}

.tiebreak-pick-votes {
  font-size: 0.65rem;
  color: $text-muted;
}

.tiebreak-back-btn {
  padding: 0.3rem 0.8rem;
  border-radius: $radius-sm;
  border: 1px solid $border-subtle;
  background: transparent;
  color: $text-muted;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;

  &:hover {
    border-color: $border-active;
    color: $text-secondary;
  }
}

.tiebreak-close {
  position: absolute;
  top: 0.4rem;
  right: 0.5rem;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid $border-subtle;
  background: transparent;
  color: $text-muted;
  font-size: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-base;

  &:hover {
    border-color: $rose-400;
    color: $rose-300;
    background: rgba($rose-400, 0.1);
  }
}

// ─── First Night Phase ───────────────────────────────────────────────────────
.first-night-interface {
  width: 100%;
  min-height: 70vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: fn-appear 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  margin-top: 1.5rem;
}

@keyframes fn-appear {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

.fn-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.2rem;
  width: min(100%, 1300px);
  margin: 0 auto;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

// Header
.fn-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.4rem;
}

.fn-header-icon {
  font-size: 2.2rem;
  filter: drop-shadow(0 0 12px rgba($violet-400, 0.6));
  animation: moon-float 3s ease-in-out infinite;
}

@keyframes moon-float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-6px); }
}

.fn-title {
  font-family: $font-display;
  font-size: 1.4rem;
  font-weight: 700;
  color: $text-primary;
  margin: 0;
}

.fn-subtitle {
  font-size: 0.82rem;
  color: $text-muted;
  margin: 2px 0 0;
}

.fn-progress {
  margin-left: auto;
  display: flex;
  align-items: baseline;
  gap: 3px;
  @include glass(0.06);
  border: 1px solid rgba($violet-400, 0.2);
  border-radius: $radius-md;
  padding: 6px 14px;
}

.fn-progress-num {
  font-size: 1.4rem;
  font-weight: 700;
  color: $violet-300;
  font-family: $font-display;
}

.fn-progress-sep { font-size: 1rem; color: $text-muted; }

.fn-progress-total {
  font-size: 1.1rem;
  font-weight: 600;
  color: $text-secondary;
  font-family: $font-display;
}

.fn-progress-label {
  font-size: 0.7rem;
  color: $text-muted;
  margin-left: 4px;
}

// Roles Panel
.fn-roles-panel {
  @include glass(0.06);
  border: 1px solid rgba($violet-400, 0.18);
  border-radius: $radius-lg;
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.fn-roles-list {
  column-count: 2;
  column-gap: 0.5rem;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin-bottom: 1rem;
  align-content: start;

  @media (max-width: 700px) {
    column-count: 1;
  }
}

.fn-role-row {
  break-inside: avoid;
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 0.7rem;
  padding: 0.6rem 0.8rem;
  border-radius: $radius-md;
  border: 1px solid $border-subtle;
  @include glass(0.03);
  transition: all $transition-base;
  margin-bottom: 0.5rem;

  &:hover {
    border-color: rgba($violet-400, 0.25);
    @include glass(0.07);
  }

  &.done {
    opacity: 0.7;
    border-color: rgba($village-green, 0.3);
    background: rgba($village-green, 0.04);

    .fn-role-name { text-decoration: line-through; color: $text-muted; }
  }
}

.fn-order-badge {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-sm;
  background: rgba($violet-500, 0.12);
  border: 1px solid rgba($violet-400, 0.2);
  font-size: 0.78rem;
  font-weight: 700;
  color: $violet-300;
  font-family: $font-display;
  flex-shrink: 0;
}

.fn-role-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.fn-role-icon { font-size: 1.1rem; flex-shrink: 0; }

.fn-player-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  background: rgba($violet-500, 0.2);
  border: 1.5px solid rgba($violet-400, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;

  &.has-image { border-color: rgba($violet-300, 0.5); }
}

.fn-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.fn-avatar-initial {
  font-size: 0.85rem;
  font-weight: 700;
  color: $violet-300;
  line-height: 1;
}

.fn-role-name-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.fn-role-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fn-role-player {
  font-size: 0.88rem;
  font-weight: 600;
  color: $text-secondary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fn-target-select {
  background: rgba($bg-primary, 0.5);
  border: 1px solid $border-subtle;
  border-radius: $radius-sm;
  color: $text-primary;
  font-family: $font-body;
  font-size: 0.8rem;
  padding: 4px 8px;
  cursor: pointer;
  min-width: 100px;
  max-width: 140px;
  transition: border-color $transition-fast;

  &:focus {
    outline: none;
    border-color: rgba($violet-400, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.fn-done-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid $border-subtle;
  background: transparent;
  color: $text-muted;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-fast;
  flex-shrink: 0;

  &:hover {
    border-color: rgba($village-green, 0.6);
    color: $village-green;
  }

  &.checked {
    background: rgba($village-green, 0.15);
    border-color: $village-green;
    color: $village-green;
  }
}

.fn-empty {
  text-align: center;
  padding: 2rem;
  color: $text-muted;
  font-size: 2rem;

  p { font-size: 0.85rem; margin-top: 0.5rem; }
}

.fn-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid $border-subtle;
  display: flex;
  gap: 0.6rem;
  align-items: stretch;
}

.fn-btn-back {
  flex: 0 0 auto;
  padding: 0.85rem 1.1rem;
  border-radius: $radius-md;
  border: 1px solid $border-subtle;
  background: rgba($bg-glass, 0.4);
  color: $text-muted;
  font-family: $font-body;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: rgba($violet-500, 0.12);
    border-color: rgba($violet-400, 0.4);
    color: $text-primary;
  }

  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.fn-btn-day {
  flex: 1;
  width: 100%;
  padding: 0.85rem;
  border-radius: $radius-md;
  border: none;
  background: linear-gradient(135deg, rgba($neutral-amber, 0.2), rgba($neutral-amber, 0.08));
  border: 1px solid rgba($neutral-amber, 0.35);
  color: $neutral-amber;
  font-family: $font-display;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-base;
  letter-spacing: 0.02em;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba($neutral-amber, 0.3), rgba($neutral-amber, 0.12));
    box-shadow: 0 0 20px rgba($neutral-amber, 0.2);
    transform: translateY(-1px);
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

// Night Log Panel
.fn-log-panel {
  @include glass(0.05);
  border: 1px solid rgba($violet-400, 0.15);
  border-radius: $radius-lg;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: 70vh;
  overflow: hidden;
}

.fn-log-header {
  font-size: 0.85rem;
  font-weight: 700;
  color: $text-secondary;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid $border-subtle;
  margin-bottom: 0.6rem;
}

.fn-log-entries {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  overflow-y: auto;
  flex: 1;
}

.fn-log-entry {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  border-radius: $radius-sm;
  @include glass(0.03);
  border: 1px solid $border-subtle;
  animation: fn-appear 0.3s ease;
}

.fn-log-icon { font-size: 1rem; flex-shrink: 0; }

.fn-log-text {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  min-width: 0;
}

.fn-log-role { font-weight: 700; color: $violet-300; }
.fn-log-arrow { color: $text-muted; }
.fn-log-target { color: $text-primary; font-weight: 600; }

.fn-log-empty {
  font-size: 0.78rem;
  color: $text-muted;
  font-style: italic;
  text-align: center;
  padding: 1rem;
}

// ─── Night Fall Overlay ───────────────────────────────────────────────────────
.nightfall-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: radial-gradient(ellipse at 50% 30%, #0a0320 0%, #000010 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  overflow: hidden;
}

.nightfall-stars {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.star {
  position: absolute;
  border-radius: 50%;
  background: white;
  animation: star-twinkle 2s ease-in-out infinite;
  opacity: 0;
}

@keyframes star-twinkle {
  0%   { opacity: 0; transform: scale(0.5); }
  50%  { opacity: 1; transform: scale(1); }
  100% { opacity: 0.3; transform: scale(0.8); }
}

.nightfall-moon {
  font-size: 5rem;
  line-height: 1;
  animation: moon-rise 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  filter: drop-shadow(0 0 30px rgba(180, 140, 255, 0.8));
  position: relative;
  z-index: 1;
}

@keyframes moon-rise {
  from { transform: translateY(60px) scale(0.6); opacity: 0; }
  to   { transform: translateY(0)   scale(1);   opacity: 1; }
}

.nightfall-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  position: relative;
  z-index: 1;
  animation: text-fade-in 0.8s 0.5s both;
}

@keyframes text-fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

.nightfall-title {
  font-family: $font-display;
  font-size: 2rem;
  font-weight: 700;
  color: #d4b0ff;
  letter-spacing: 0.05em;
  text-shadow: 0 0 20px rgba(180, 140, 255, 0.8);
}

.nightfall-sub {
  font-size: 0.95rem;
  color: rgba(180, 140, 255, 0.5);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.nightfall-enter-active {
  transition: opacity 0.5s ease;
}
.nightfall-leave-active {
  transition: opacity 0.8s ease;
}
.nightfall-enter-from,
.nightfall-leave-to {
  opacity: 0;
}

// ─── Dawn Rise Overlay ───────────────────────────────────────
.dawnrise-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: radial-gradient(ellipse at 50% 100%, #1a0a14 0%, #080012 60%, #040009 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  overflow: hidden;
}

.dawn-embers {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.ember {
  position: absolute;
  border-radius: 50%;
  background: rgba(200, 60, 60, 0.85);
  opacity: 0;
  animation: ember-float 3.5s ease-out infinite;
}

@keyframes ember-float {
  0%   { opacity: 0;    transform: translateY(0)     scale(1); }
  20%  { opacity: 0.85; }
  80%  { opacity: 0.3; }
  100% { opacity: 0;    transform: translateY(-90px) scale(0.3); }
}

.dawn-horizon-glow {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 35%;
  background: linear-gradient(180deg, transparent 0%, rgba(150, 25, 25, 0.14) 60%, rgba(170, 35, 35, 0.24) 100%);
}

.dawn-sun {
  font-size: 5rem;
  line-height: 1;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 0 30px rgba(200, 60, 60, 0.7)) drop-shadow(0 0 60px rgba(150, 30, 60, 0.4));
  animation: sun-rise 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes sun-rise {
  from { transform: translateY(60px) scale(0.6); opacity: 0; }
  to   { transform: translateY(0)    scale(1);   opacity: 1; }
}

.dawn-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  position: relative;
  z-index: 1;
  animation: text-fade-in 0.8s 0.6s both;
}

.dawn-title {
  font-family: $font-display;
  font-size: 2rem;
  font-weight: 700;
  color: #ff9090;
  letter-spacing: 0.05em;
  text-shadow: 0 0 24px rgba(200, 50, 50, 0.75);
}

.dawn-sub {
  font-size: 0.95rem;
  color: rgba(200, 120, 120, 0.55);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.dawnrise-enter-active { transition: opacity 0.5s ease; }
.dawnrise-leave-active { transition: opacity 0.9s ease; }
.dawnrise-enter-from,
.dawnrise-leave-to { opacity: 0; }

// ─── Death Reveal Overlay ──────────────────────────────────
.death-reveal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: radial-gradient(ellipse at 50% 20%, #2a0000 0%, #0d0000 60%, #000 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  overflow: hidden;
  padding: 2rem;
}

.dr-bg-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.dr-particle {
  position: absolute;
  bottom: -10px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(255, 60, 60, 0.7);
  animation: dr-float linear infinite;
}

@keyframes dr-float {
  from { transform: translateY(0) scale(1); opacity: 0.8; }
  to   { transform: translateY(-110vh) scale(0); opacity: 0; }
}

.dr-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  animation: text-fade-in 0.6s both;
  z-index: 1;
}

.dr-title-icon {
  font-size: 3.5rem;
  filter: drop-shadow(0 0 20px rgba(255, 60, 60, 0.9));
  animation: dr-icon-pulse 2s ease-in-out infinite;
}

@keyframes dr-icon-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}

.dr-title {
  font-family: $font-display;
  font-size: 2.2rem;
  font-weight: 700;
  color: #ff6060;
  letter-spacing: 0.05em;
  text-shadow: 0 0 30px rgba(255, 60, 60, 0.9);
  margin: 0;
}

.dr-subtitle {
  font-size: 0.9rem;
  color: rgba(255, 100, 100, 0.6);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin: 0;
}

.dr-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  justify-content: center;
  max-width: 720px;
  z-index: 1;
}

.dr-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: rgba(80, 0, 0, 0.5);
  border: 1px solid rgba(255, 60, 60, 0.3);
  border-radius: 16px;
  backdrop-filter: blur(8px);
  animation: dr-card-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  box-shadow: 0 0 30px rgba(255, 0, 0, 0.15), inset 0 1px 0 rgba(255,100,100,0.08);
  min-width: 220px;
}

@keyframes dr-card-in {
  from { opacity: 0; transform: translateY(40px) scale(0.9); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.dr-card-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 60, 60, 0.15);
  border: 2px solid rgba(255, 60, 60, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 700;
  color: #ff9090;
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.dr-card-info {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
}

.dr-card-name {
  font-size: 1.15rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 10px rgba(255, 100, 100, 0.5);
}

.dr-card-role {
  font-size: 0.9rem;
  color: rgba(255, 150, 150, 0.8);
}

.dr-skull {
  font-size: 1.5rem;
  margin-left: auto;
  animation: dr-icon-pulse 2.5s ease-in-out infinite;
  filter: drop-shadow(0 0 8px rgba(255, 0, 0, 0.6));
}

.dr-continue-btn {
  padding: 0.75rem 2.5rem;
  background: rgba(160, 0, 0, 0.35);
  border: 1px solid rgba(255, 60, 60, 0.45);
  border-radius: 999px;
  color: #ff9090;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  cursor: pointer;
  animation: text-fade-in 0.5s 0.8s both;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
  z-index: 1;

  &:hover {
    background: rgba(210, 0, 0, 0.45);
    border-color: rgba(255, 80, 80, 0.65);
    transform: scale(1.04);
  }
}

.death-reveal-enter-active { transition: opacity 0.4s ease; }
.death-reveal-leave-active { transition: opacity 0.6s ease; }
.death-reveal-enter-from,
.death-reveal-leave-to { opacity: 0; }

// ─── Day Interface ── L'Aube — Dawn Breaking ──────────────

// ── Fixed dawn atmosphere layers ─────────────────────────
// Background is fully driven by Vue computed (dayAtmosphereStyle) for
// smooth real-time sunrise→midday→dusk color progression.
.dawn-atmosphere {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  animation: dawn-atm-in 1.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes dawn-atm-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.dawn-horizon {
  position: fixed;
  bottom: 0;
  left: 0; right: 0;
  height: 1px;
  pointer-events: none;
  z-index: 1;
  // background & box-shadow driven by dayHorizonStyle computed
}

// ── Dawn Rays ─────────────────────────────────────────────
.dawn-rays {
  position: fixed;
  top: 50%; left: 50%;
  width: 200vmax; height: 200vmax;
  transform: translate(-50%, -50%);
  background:
    conic-gradient(from 0deg at 50% 50%,
      transparent 0deg, rgba(251,191,36,0.03) 15deg,
      transparent 30deg, rgba(251,191,36,0.03) 45deg,
      transparent 60deg, rgba(251,191,36,0.03) 75deg,
      transparent 90deg, rgba(251,191,36,0.03) 105deg,
      transparent 120deg, rgba(251,191,36,0.03) 135deg,
      transparent 150deg, rgba(251,191,36,0.03) 165deg,
      transparent 180deg, rgba(251,191,36,0.03) 195deg,
      transparent 210deg, rgba(251,191,36,0.03) 225deg,
      transparent 240deg, rgba(251,191,36,0.03) 255deg,
      transparent 270deg, rgba(251,191,36,0.03) 285deg,
      transparent 300deg, rgba(251,191,36,0.03) 315deg,
      transparent 330deg, rgba(251,191,36,0.03) 345deg,
      transparent 360deg
    );
  mix-blend-mode: overlay;
  pointer-events: none;
  z-index: 0;
  will-change: transform, opacity;
}

// ── Main container ────────────────────────────────────────
.day-interface {
  --dp: var(--day-progress, 0);
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-top: 72px;
  animation: fn-appear 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

// ── Defense alert text ────────────────────────────────────
.day-defense-alert {
  text-align: center;
  font-size: 1.05rem;
  color: $rose-400;
  padding: 8px 0;
  position: relative;
  z-index: 2;
  animation: defense-flash 0.6s ease;

  strong {
    font-weight: 900;
    color: #fff;
    font-size: 1.1rem;
  }
}

@keyframes defense-flash {
  0%   { opacity: 0; transform: scale(0.9); }
  40%  { opacity: 1; transform: scale(1.06); }
  70%  { transform: scale(0.98); }
  100% { transform: scale(1); }
}

.defense-pop-enter-active {
  animation: defense-flash 0.5s ease;
}
.defense-pop-leave-active {
  transition: opacity 0.2s ease;
}
.defense-pop-leave-to {
  opacity: 0;
}

// ── Header row ────────────────────────────────────────────
.day-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 0 18px;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  &::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba($neutral-amber, 0.22) 25%,
      rgba($violet-400, 0.18) 75%,
      transparent
    );
    transition: background 0.4s ease;
  }
  &.is-tie-state::after {
    background: linear-gradient(
      90deg,
      transparent,
      rgba($neutral-amber, 0.6) 20%,
      rgba($neutral-amber, 0.5) 80%,
      transparent
    );
    box-shadow: 0 0 12px rgba($neutral-amber, 0.25);
  }
}

.day-header-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  position: absolute;
  right: 0;
  flex-shrink: 0;
}

.dir-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  border: 1px solid $border-subtle;
  background: $bg-glass;
  color: $text-muted;
  cursor: pointer;
  transition: all $transition-fast;

  svg { flex-shrink: 0; }

  &:hover {
    background: $bg-glass-hover;
    border-color: rgba($neutral-amber, 0.4);
    color: $neutral-amber;
    transform: translateY(-1px);
  }

  &:active { transform: translateY(0); }

  &.reset {
    color: $rose-400;
    &:hover {
      border-color: rgba($rose-400, 0.6);
      background: rgba($rose-400, 0.1);
      box-shadow: 0 0 8px rgba($rose-400, 0.2);
    }
    &.is-confirming {
      width: auto;
      padding: 0 9px;
      background: rgba($rose-500, 0.18);
      border-color: rgba($rose-400, 0.65);
      color: $rose-300;
      box-shadow: 0 0 10px rgba($rose-500, 0.3);
      animation: confirm-danger-pulse 0.6s ease-in-out infinite;
      &:hover { background: rgba($rose-500, 0.32); border-color: $rose-400; }
    }
  }

  &.debate {
    color: $violet-300;
    &:hover {
      border-color: rgba($violet-400, 0.6);
      background: rgba($violet-500, 0.14);
      color: $violet-200;
      box-shadow: 0 0 8px rgba($violet-400, 0.2);
    }
    &.is-confirming {
      width: auto;
      padding: 0 9px;
      background: rgba($violet-500, 0.2);
      border-color: rgba($violet-400, 0.65);
      color: $violet-200;
      box-shadow: 0 0 10px rgba($violet-400, 0.3);
      animation: confirm-violet-pulse 0.6s ease-in-out infinite;
      &:hover { background: rgba($violet-500, 0.35); border-color: $violet-400; }
    }
  }
}

.ctrl-confirm-label {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

@keyframes confirm-violet-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba($violet-400, 0.3); }
  50%       { box-shadow: 0 0 18px rgba($violet-400, 0.65); }
}

.day-header-progress {
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.day-prog-track {
  height: 5px;
  background: rgba($violet-500, 0.07);
  border: 1px solid $border-subtle;
  border-radius: 6px;
  overflow: hidden;
}

.day-prog-fill {
  height: 100%;
  background: linear-gradient(90deg, $violet-500 0%, $neutral-amber 100%);
  border-radius: 6px;
  transition: width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 0 8px rgba($neutral-amber, 0.35);
}

.day-prog-text {
  font-size: 0.68rem;
  color: $text-muted;
  font-weight: 500;
  text-align: center;
  letter-spacing: 0.04em;
}

.day-header-spacer { flex: 0 0 4px; }

.day-dur-control {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 7px 14px;
  border-radius: $radius-md;
  background: rgba($violet-500, 0.05);
  border: 1px solid $border-subtle;
}

.day-dur-label {
  font-size: 0.64rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: $text-muted;
  padding-right: 2px;
}

.day-dur-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid $border-subtle;
  background: transparent;
  color: $violet-300;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-fast;
  line-height: 1;
  &:hover:not(:disabled) { background: $bg-glass-hover; border-color: $border-active; color: $lavender; }
  &:disabled { opacity: 0.25; cursor: not-allowed; }
}

.day-dur-val {
  font-family: $font-display;
  font-size: 0.88rem;
  font-weight: 700;
  color: $neutral-amber;
  min-width: 40px;
  text-align: center;
}

// ── Main layout ───────────────────────────────────────────
.day-main {
  display: flex;
  gap: 24px;
  flex: 1;
  padding-top: 22px;
  min-height: 0;
  position: relative;
  z-index: 2;
}

// ── Timer column ──────────────────────────────────────────
.day-timer-col {
  width: 288px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.day-timer-card {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 32px 24px;
  border-radius: $radius-lg;
  overflow: hidden;
  transition: box-shadow 0.7s ease, border-color 0.6s ease;

  // Premium background — closer to the page glass style but with violet warmth
  background:
    radial-gradient(ellipse 95% 50% at 50% -5%, rgba($violet-600, 0.28) 0%, transparent 65%),
    radial-gradient(ellipse 60% 35% at 50% 110%, rgba($neutral-amber, 0.07) 0%, transparent 55%),
    rgba(20, 8, 44, 0.78);
  backdrop-filter: blur(20px) saturate(1.4);

  // Glowing violet border
  border: 1px solid rgba($violet-400, 0.28);

  // Layered box shadow: inner sheen + depth + violet ambient aura
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    inset 0 1px 0 rgba($violet-300, 0.18),
    0 4px 24px rgba(0, 0, 0, 0.20),
    0 0 60px rgba($violet-600, 0.10),
    0 0 100px rgba($violet-800, 0.06);

  // Top shimmer line — violet-to-amber gradient
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 10%;
    right: 10%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba($violet-300, 0.60) 35%,
      rgba($neutral-amber, 0.50) 65%,
      transparent
    );
    z-index: 1;
    pointer-events: none;
  }

  // Radial glow aura behind the timer hub
  &::after {
    content: '';
    position: absolute;
    top: 20%;
    left: 50%;
    transform: translateX(-50%);
    width: 300px;
    height: 300px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba($violet-600, 0.18) 0%,
      rgba($violet-700, 0.07) 45%,
      transparent 70%
    );
    pointer-events: none;
    z-index: 0;
  }

  // Running state — amber aura blooms
  &:has(.day-timer-hub.is-running) {
    border-color: rgba($neutral-amber, 0.32);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.04),
      inset 0 1px 0 rgba($neutral-amber, 0.18),
      0 4px 24px rgba(0, 0, 0, 0.20),
      0 0 60px rgba($neutral-amber, 0.10),
      0 0 100px rgba($violet-700, 0.06);

    &::after {
      background: radial-gradient(
        circle,
        rgba($neutral-amber, 0.12) 0%,
        rgba($violet-600, 0.08) 45%,
        transparent 70%
      );
    }
  }

  // Urgent state — red pulse aura
  &:has(.day-timer-hub.is-urgent) {
    border-color: rgba($wolf-red, 0.42);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.04),
      inset 0 1px 0 rgba($wolf-red, 0.20),
      0 4px 24px rgba(0, 0, 0, 0.20),
      0 0 50px rgba($wolf-red, 0.14),
      0 0 80px rgba($wolf-red, 0.06);

    &::after {
      background: radial-gradient(
        circle,
        rgba($wolf-red, 0.14) 0%,
        rgba($wolf-red, 0.04) 45%,
        transparent 70%
      );
    }
  }
}

.day-timer-hub {
  position: relative;
  width: 216px;
  height: 216px;
  flex-shrink: 0;
}

.day-ring-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  z-index: 1;
  filter: drop-shadow(0 0 8px rgba($violet-400, 0.18));
  transition: filter 0.5s ease;

  .is-running & { filter: drop-shadow(0 0 14px rgba($neutral-amber, 0.28)); }
  .is-urgent  & { filter: drop-shadow(0 0 14px rgba($wolf-red, 0.40)); }
}

.ring-track {
  fill: none;
  stroke: rgba($violet-500, 0.12);
  stroke-width: 7;
}

.ring-fill {
  fill: none;
  stroke: $violet-400;
  stroke-width: 7;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear, stroke 0.5s ease;

  .is-running & { stroke: url(#dawn-ring-grad); }
  .is-urgent  & { stroke: $wolf-red; }
  .is-done    & { stroke: rgba($wolf-red, 0.2); }
}

.day-timer-inner {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.day-timer-time {
  font-family: $font-display;
  font-size: 2.9rem;
  font-weight: 700;
  color: $text-primary;
  letter-spacing: 0.04em;
  line-height: 1;
  transition: color 0.4s ease, text-shadow 0.4s ease;

  &.running {
    color: $neutral-amber;
    text-shadow: 0 0 22px rgba($neutral-amber, 0.45);
  }
  &.urgent {
    color: $wolf-red;
    text-shadow: 0 0 18px rgba($wolf-red, 0.55);
    animation: timer-urgent-pulse 0.75s ease-in-out infinite;
  }
  &.done { color: rgba($wolf-red, 0.38); }
}

@keyframes timer-urgent-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.42; }
}

.day-speaker-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: $neutral-amber;
  text-align: center;
  max-width: 164px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 0 14px rgba($neutral-amber, 0.35);
  animation: name-dawn-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes name-dawn-in {
  from { opacity: 0; transform: translateY(4px) scale(0.94); }
  to   { opacity: 1; transform: none; }
}

// Speaker avatar inside the ring
.day-timer-avatar {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 166px;
  height: 166px;
  border-radius: 50%;
  overflow: hidden;
  z-index: 2;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
  }

  // scrim: transparent center so timer digits are legible, dark edge
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(
      circle at 50% 42%,
      rgba(10, 5, 20, 0.10) 0%,
      rgba(10, 5, 20, 0.65) 72%,
      rgba(10, 5, 20, 0.82) 100%
    );
  }

  .day-timer-avatar-initials {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba($violet-500, 0.18);
    font-size: 3.5rem;
    font-weight: 800;
    color: rgba($neutral-amber, 0.6);
    font-family: $font-display;
  }
}

.timer-avatar-enter-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.timer-avatar-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.timer-avatar-enter-from  { opacity: 0; transform: translate(-50%, -50%) scale(0.88); }
.timer-avatar-leave-to    { opacity: 0; transform: translate(-50%, -50%) scale(1.06); }

// When avatar is present, make timer time text pop with a text shadow for legibility
.day-timer-hub:has(.day-timer-avatar) {
  .day-timer-time {
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.9), 0 0 22px rgba($neutral-amber, 0.2);
  }
  .day-speaker-name {
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.95), 0 0 14px rgba($neutral-amber, 0.35);
  }
}

.day-speaker-hint {
  font-size: 0.7rem;
  color: $text-muted;
  text-align: center;
  font-style: italic;
  letter-spacing: 0.06em;
}

.day-timer-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dtc-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: all $transition-base;

  &:disabled { opacity: 0.25; cursor: not-allowed; }

  &.play, &.pause {
    width: 52px;
    height: 52px;
    background: rgba($violet-500, 0.1);
    border: 1.5px solid $border-active;
    color: $violet-300;
    box-shadow: $glow-violet;
    &:hover:not(:disabled) {
      background: rgba($violet-500, 0.18);
      transform: scale(1.07);
    }
  }
  &.play {
    background: rgba($neutral-amber, 0.1);
    border-color: rgba($neutral-amber, 0.4);
    color: $neutral-amber;
    box-shadow: 0 0 22px rgba($neutral-amber, 0.22);
    &:hover:not(:disabled) {
      background: rgba($neutral-amber, 0.18);
      box-shadow: 0 0 32px rgba($neutral-amber, 0.4);
    }
  }
  &.skip, &.reset {
    width: 38px;
    height: 38px;
    background: $bg-glass;
    border: 1px solid $border-subtle;
    color: $text-muted;
    &:hover:not(:disabled) {
      background: $bg-glass-hover;
      border-color: $border-active;
      color: $text-secondary;
    }
  }
}

// ── Players column ────────────────────────────────────────
.day-players-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  z-index: 2;
}

.day-players-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba($neutral-amber, 0.12);
}

.day-players-title {
  font-family: $font-display;
  font-size: 0.85rem;
  font-weight: 600;
  color: $text-muted;
  letter-spacing: 0.07em;
  font-style: italic;

  strong { color: $neutral-amber; font-style: normal; }
  .title-second-debate { color: $neutral-amber; text-shadow: 0 0 14px rgba($neutral-amber, 0.4); }
}

.day-players-count {
  font-size: 0.73rem;
  font-weight: 700;
  color: $neutral-amber;
  background: rgba($neutral-amber, 0.1);
  border: 1px solid rgba($neutral-amber, 0.24);
  border-radius: 10px;
  padding: 2px 9px;
  letter-spacing: 0.04em;
}

// ── Direction Picker ─────────────────────────────────────
.day-direction-picker {
  position: absolute;
  top: 48px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  background: rgba(#1a1625, 0.92);
  border: 1px solid rgba($neutral-amber, 0.3);
  border-radius: 999px;
  backdrop-filter: blur(20px);
  box-shadow: 0 6px 28px rgba(0, 0, 0, 0.45);
  white-space: nowrap;
  animation: slide-dawn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slide-dawn {
  from { opacity: 0; transform: translateX(-50%) translateY(-6px) scale(0.95); }
  to   { opacity: 1; transform: translateX(-50%) none; }
}

.ddir-start-name {
  font-weight: 800;
  color: $neutral-amber;
  font-size: 0.82rem;
}

.ddir-sep {
  color: $text-muted;
  font-size: 0.72rem;
}

.ddir-cancel {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba($rose-400, 0.12);
  border: 1px solid rgba($rose-400, 0.3);
  color: $rose-400;
  font-size: 0.65rem;
  cursor: pointer;
  transition: all $transition-fast;
  flex-shrink: 0;

  &:hover {
    background: rgba($rose-400, 0.25);
    transform: scale(1.1);
  }
}

.day-dir-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid $border-subtle;
  background: $bg-glass;
  color: $text-secondary;
  cursor: pointer;
  font-size: 0.76rem;
  font-weight: 600;
  transition: all $transition-fast;

  &:hover {
    background: rgba($neutral-amber, 0.15);
    border-color: rgba($neutral-amber, 0.5);
    color: $neutral-amber;
    box-shadow: 0 0 12px rgba($neutral-amber, 0.15);
  }
}

.ddir-arrow {
  font-size: 0.9rem;
  font-weight: 900;
  color: $neutral-amber;
  line-height: 1;
}

// ── Player Grid ───────────────────────────────────────────
.day-players-grid {
  flex: 1;
  display: grid;
  gap: 8px;
  align-content: start;

  &.cols-3 { grid-template-columns: repeat(3, 1fr); }
  &.cols-4 { grid-template-columns: repeat(4, 1fr); }
  &.cols-5 { grid-template-columns: repeat(5, 1fr); }
  &.cols-6 { grid-template-columns: repeat(6, 1fr); }
}

.day-player-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 13px 14px;
  min-height: 58px;
  border-radius: $radius-md;
  border: 1px solid $border-subtle;
  background: $bg-glass;
  cursor: pointer;
  transition: all $transition-base;
  position: relative;
  overflow: hidden;
  min-width: 0;
  text-align: left;
  z-index: 1; /* For avatar layering */

  &.is-maire {
    overflow: visible;
    border-color: rgba($neutral-amber, 0.50);
    background: linear-gradient(135deg, rgba($neutral-amber, 0.13) 0%, rgba($neutral-amber, 0.05) 100%);
    box-shadow: inset 0 0 0 1px rgba($neutral-amber, 0.14);
    .chip-avatar-bg { clip-path: inset(0 round 8px); }

    &.has-avatar {
      background: linear-gradient(to right, rgba(25, 15, 0, 0.80), rgba($neutral-amber, 0.10));
    }
  }

  &.has-avatar {
    padding-left: 56px; /* Space for avatar */
    background: rgba(10, 5, 30, 0.6); /* Slightly darker bg for text readability */
  }

  /* Avatar Background Image */
  .chip-avatar-bg {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 48px;
    height: 100%;
    object-fit: cover;
    opacity: 0.9;
    mask-image: linear-gradient(to right, black 80%, transparent 100%);
    -webkit-mask-image: linear-gradient(to right, black 80%, transparent 100%);
    transition: all 0.5s ease;
    z-index: 0;
    pointer-events: none; /* Let clicks pass through */
    border-right: 1px solid rgba(255,255,255,0.1);
  }

  &.is-speaking .chip-avatar-bg {
    width: 100%; /* Expand to full bg */
    opacity: 0.4;
    mask-image: none;
    -webkit-mask-image: none;
    filter: blur(2px) grayscale(0.3);
  }

  /* Ensure content is above avatar */
  .chip-num, .chip-name, .chip-2nd-toggle, .chip-state {
    position: relative;
    z-index: 2;
  }

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      108deg,
      transparent 30%,
      rgba(255, 255, 255, 0.03) 50%,
      transparent 70%
    );
    transform: translateX(-100%);
    transition: transform 0.55s ease;
  }

  &:hover {
    background: $bg-glass-hover;
    border-color: $border-active;
    transform: translateY(-2px);
    box-shadow: 0 4px 18px rgba($violet-500, 0.12);
    &::before { transform: translateX(100%); }
  }

  // Setup phase: dims chips until one is picked as start
  &.is-pending-start {
    opacity: 0.55;
    &:hover { opacity: 0.85; }
  }

  // The selected start speaker
  &.is-start-selected {
    background: linear-gradient(135deg, rgba($neutral-amber, 0.1), rgba($violet-500, 0.06));
    border-color: rgba($neutral-amber, 0.45);
    box-shadow: 0 0 22px rgba($neutral-amber, 0.15);
    animation: start-pulse 2s ease-in-out infinite;
    .chip-num { color: $neutral-amber; }
    .chip-name { color: $text-primary; font-weight: 700; }
  }

  @keyframes start-pulse {
    0%, 100% { box-shadow: 0 0 22px rgba($neutral-amber, 0.15); }
    50%       { box-shadow: 0 0 36px rgba($neutral-amber, 0.3); }
  }

  // Has second debate assigned
  &.is-second-debate:not(.is-speaking) {
    &::after {
      content: '';
      position: absolute;
      right: 0; top: 0; bottom: 0;
      width: 3px;
      background: linear-gradient(to bottom, transparent, rgba($neutral-amber, 0.8) 40%, rgba($neutral-amber, 0.8) 60%, transparent);
      border-radius: 0 2px 2px 0;
    }
  }

  // Currently speaking
  &.is-speaking {
    background: linear-gradient(135deg, rgba($violet-500, 0.14), rgba($neutral-amber, 0.07));
    border-color: rgba($neutral-amber, 0.38);
    transform: translateY(-2px) scale(1.01);
    animation: speaking-dawn 2.5s ease-in-out infinite;
    .chip-pos  { color: $neutral-amber; }
    .chip-num  { color: $neutral-amber; }
    .chip-name { color: $text-primary; font-weight: 700; }
  }

  &.has-spoken {
    opacity: 0.32;
    border-color: rgba($violet-500, 0.06);
    background: rgba($violet-500, 0.02);
    &:hover { opacity: 0.58; transform: none; }
  }

  /* Captain skipped during first round — dimmed with crown indicator */
  &.is-captain-skipped {
    opacity: 0.45;
    border-color: rgba($neutral-amber, 0.2);
    border-style: dashed;
    background: rgba($neutral-amber, 0.04);
    &:hover {
      opacity: 0.8;
      border-color: rgba($neutral-amber, 0.45);
      transform: translateY(-2px);
    }
    .chip-name {
      font-style: italic;
      color: $text-muted;
    }
  }
}

@keyframes speaking-dawn {
  0%, 100% {
    box-shadow:
      0 0 0 1px rgba($neutral-amber, 0.14),
      0 0 22px rgba($neutral-amber, 0.14),
      0 0 8px  rgba($violet-500, 0.18);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba($neutral-amber, 0.28),
      0 0 38px rgba($neutral-amber, 0.28),
      0 0 18px rgba($violet-500, 0.28);
  }
}

// Order position number (shows instead of chip-num when speaking started)
.chip-pos {
  font-size: 0.62rem;
  font-weight: 800;
  color: $text-muted;
  min-width: 18px;
  flex-shrink: 0;
  background: $bg-glass;
  border: 1px solid $border-subtle;
  border-radius: 6px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-variant-numeric: tabular-nums;
}

.chip-num {
  font-size: 0.72rem;
  font-weight: 700;
  color: $violet-200;
  min-width: 18px;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  padding: 0 4px;

  /* If there is an avatar, overlay number nicer */
  .has-avatar & {
    position: absolute;
    top: 4px; left: 4px;
    background: rgba(0,0,0,0.7);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 4px;
    padding: 1px 4px;
    font-size: 0.65rem;
    color: white;
    z-index: 3;
    pointer-events: none;
  }
}

.chip-name {
  font-size: 0.92rem;
  font-weight: 600;
  color: $text-secondary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  
  .has-avatar & {
    color: #e5e7eb;
    text-shadow: 0 1px 3px rgba(0,0,0,0.8);
    font-weight: 700;
  }
}

// card-crown — shared absolute wearing-crown for speak chips + vote cards
.card-crown {
  position: absolute;
  top: -16px;
  left: 5px;
  width: 28px;
  height: auto;
  line-height: 1;
  transform: rotate(-26deg);
  transform-origin: bottom center;
  z-index: 10;
  filter:
    drop-shadow(0 2px 6px rgba(251, 191, 36, 0.75))
    drop-shadow(0 0 14px rgba(251, 191, 36, 0.5));
  pointer-events: none;
  animation: crown-wear 3.5s ease-in-out infinite;

  svg { display: block; width: 100%; height: auto; overflow: visible; }
}

@keyframes crown-wear {
  0%, 100% { transform: rotate(-26deg) translateY(0);    filter: drop-shadow(0 2px 6px rgba(251,191,36,0.7))  drop-shadow(0 0 12px rgba(251,191,36,0.45)); }
  50%       { transform: rotate(-22deg) translateY(-1px); filter: drop-shadow(0 3px 10px rgba(251,191,36,0.95)) drop-shadow(0 0 18px rgba(251,191,36,0.6)); }
}

// timer-crown — sits at top-left inside the ring hub
.timer-crown {
  position: absolute;
  top: 12px;
  left: 20px;
  width: 46px;
  height: auto;
  line-height: 1;
  transform: rotate(-28deg);
  transform-origin: bottom center;
  z-index: 5;
  filter:
    drop-shadow(0 3px 10px rgba(251, 191, 36, 0.9))
    drop-shadow(0 0 20px rgba(251, 191, 36, 0.6));
  pointer-events: none;
  animation: crown-wear 3.5s ease-in-out infinite;

  svg { display: block; width: 100%; height: auto; overflow: visible; }
}

// x2 badge for vote round 1 mayor
.day-vote-x2 {
  font-size: 0.62rem;
  font-weight: 800;
  color: rgba($neutral-amber, 0.7);
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

// Second debate toggle "2" button
.chip-2nd-toggle {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid $border-subtle;
  background: transparent;
  color: $text-muted;
  font-size: 0.65rem;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-fast;
  line-height: 1;

  &:hover:not(.is-locked) {
    border-color: rgba($neutral-amber, 0.5);
    background: rgba($neutral-amber, 0.1);
    color: $neutral-amber;
  }

  &.is-active {
    background: rgba($neutral-amber, 0.14);
    border-color: rgba($neutral-amber, 0.5);
    color: $neutral-amber;
    box-shadow: 0 0 8px rgba($neutral-amber, 0.2);
  }

  &.is-locked {
    background: rgba($neutral-amber, 0.18);
    border-color: rgba($neutral-amber, 0.55);
    color: $neutral-amber;
    cursor: default;
  }
}

.chip-state {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}

.chip-live-dot {
  display: block;
  width: 7px;
  height: 7px;
  background: $neutral-amber;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba($neutral-amber, 0.95);
  animation: live-blink 1.4s ease-in-out infinite;
}

@keyframes live-blink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.28; transform: scale(0.6); }
}

@keyframes confirm-pulse {
  0%, 100% { box-shadow: 0 0 12px rgba($neutral-amber, 0.15); }
  50%       { box-shadow: 0 0 24px rgba($neutral-amber, 0.35); }
}

.chip-check {
  width: 13px;
  height: 13px;
  color: rgba($village-green, 0.6);
}

// ── Vote sub-phase (inside day) ──────────────────────────
.day-vote-area {
  flex: 1;
  padding: 0 4px;
  overflow: visible;
}

.day-vote-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.day-vote-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 10px 10px;
  border-radius: $radius-md;
  border: 1px solid $border-subtle;
  background: $bg-glass;
  transition: all $transition-base;
  position: relative;
  overflow: hidden;

  &.is-maire {
    overflow: visible;
    border-color: rgba($neutral-amber, 0.50);
    background: linear-gradient(135deg, rgba($neutral-amber, 0.13) 0%, rgba($neutral-amber, 0.05) 100%);
    box-shadow: inset 0 0 0 1px rgba($neutral-amber, 0.14);
    .day-vote-avatar-bg { clip-path: inset(0 round 8px); }

    &.has-avatar {
      background: linear-gradient(to right, rgba(25, 15, 0, 0.80), rgba($neutral-amber, 0.10));
    }
  }

  &.has-avatar {
    padding-left: 52px;
    background: rgba(10, 5, 30, 0.6);
  }

  &:hover {
    background: $bg-glass-hover;
    border-color: $border-active;
    transform: translateY(-2px);
    box-shadow: 0 4px 18px rgba($violet-500, 0.12);
  }
}

.day-vote-avatar-bg {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 44px;
  height: 100%;
  object-fit: cover;
  opacity: 0.9;
  mask-image: linear-gradient(to right, black 75%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black 75%, transparent 100%);
  z-index: 0;
  pointer-events: none;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.day-vote-player {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  min-width: 0;
  width: 100%;
  position: relative;
  z-index: 1;
}

.day-vote-num {
  font-size: 0.85rem;
  font-weight: 700;
  color: $violet-200;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.day-vote-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: $text-secondary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  position: relative;
  z-index: 1;
}

// .day-vote-crown replaced by .card-crown (absolute wearing style)

.day-vote-select {
  width: 100%;
  padding: 6px 8px;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: $font-body;
  color: $text-primary;
  background: rgba($violet-500, 0.08);
  border: 1px solid $border-subtle;
  border-radius: 8px;
  cursor: pointer;
  transition: all $transition-base;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23c084fc'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 24px;

  option {
    background: #1a0a2e;
    color: $text-primary;
  }

  &:focus {
    outline: none;
    border-color: rgba($neutral-amber, 0.5);
    box-shadow: 0 0 12px rgba($neutral-amber, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// ─── Death & Condemnation Indicators ──
.condemned-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 4px 0;
  background: linear-gradient(90deg, transparent, rgba($rose-500, 0.85), transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-md $radius-md 0 0;
  z-index: 2;
  animation: condemned-bar-in 0.4s ease-out both;

  &.is-tie {
    background: linear-gradient(90deg, transparent, rgba($neutral-amber, 0.75), transparent);
    .condemned-label {
      color: rgba(255, 230, 160, 0.95);
      text-shadow: 0 0 8px rgba($neutral-amber, 0.7);
    }
  }

  &.is-manual {
    background: linear-gradient(90deg, transparent, rgba($rose-400, 0.95), transparent);
  }

  // Revote: player is a candidate (was tied) — neutral color until votes come in
  &.is-candidate-bar {
    background: linear-gradient(90deg, transparent, rgba($violet-400, 0.7), transparent);
    .condemned-label {
      color: rgba(210, 190, 255, 0.95);
      text-shadow: 0 0 8px rgba($violet-400, 0.7);
    }
    // Once they're leading in the revote
    &.is-condemned-now {
      background: linear-gradient(90deg, transparent, rgba($rose-500, 0.85), transparent);
      .condemned-label { color: rgba(255, 200, 200, 0.95); text-shadow: 0 0 8px rgba($rose-400, 0.8); }
    }
    &.is-tie {
      background: linear-gradient(90deg, transparent, rgba($neutral-amber, 0.75), transparent);
      .condemned-label { color: rgba(255, 230, 160, 0.95); text-shadow: 0 0 8px rgba($neutral-amber, 0.7); }
    }
  }
}

@keyframes condemned-bar-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.condemned-label {
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  color: rgba(255, 200, 200, 0.95);
  text-transform: uppercase;
  text-shadow: 0 0 8px rgba($rose-400, 0.8);
}

// Tie controls — absolute LEFT in header, never shifts layout
.day-vote-tie-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  position: absolute;
  left: 0;
}

.dvha-tie-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 10px;
  border-right: 1px solid rgba($neutral-amber, 0.22);

  .dvha-tie-icon {
    font-size: 1rem;
    animation: tie-icon-pulse 2.5s ease-in-out infinite;
    filter: drop-shadow(0 0 5px rgba($neutral-amber, 0.5));
  }

  .dvha-tie-info {
    display: flex;
    flex-direction: column;
    line-height: 1.15;
  }

  .dvha-tie-label {
    font-size: 0.75rem;
    font-weight: 700;
    color: $neutral-amber;
    letter-spacing: 0.03em;
  }

  .dvha-tie-sub {
    font-size: 0.6rem;
    color: rgba($neutral-amber, 0.5);
    font-weight: 500;
  }
}

.dvha-tie-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid rgba($neutral-amber, 0.22);
  background: rgba($neutral-amber, 0.07);
  color: rgba($neutral-amber, 0.7);
  cursor: pointer;
  font-size: 0.74rem;
  font-weight: 600;
  white-space: nowrap;
  transition: all $transition-fast;

  &:hover {
    background: rgba($neutral-amber, 0.16);
    border-color: rgba($neutral-amber, 0.5);
    color: $neutral-amber;
    box-shadow: 0 0 10px rgba($neutral-amber, 0.2);
    transform: translateY(-1px);
  }

  &:active { transform: none; }

  &.active {
    background: rgba($neutral-amber, 0.2);
    border-color: rgba($neutral-amber, 0.55);
    color: $neutral-amber;
    box-shadow: 0 0 12px rgba($neutral-amber, 0.25);
  }
}

@keyframes tie-icon-pulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba($neutral-amber, 0.5)); }
  50%       { transform: scale(1.15); filter: drop-shadow(0 0 10px rgba($neutral-amber, 0.85)); }
}

// Slide in from left
.dvha-swap-enter-active { transition: opacity 0.2s ease, transform 0.22s ease; }
.dvha-swap-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.dvha-swap-enter-from  { opacity: 0; transform: translateX(-10px); }
.dvha-swap-leave-to    { opacity: 0; transform: translateX(-6px); }

// Manual pick hint bar
.day-manual-pick-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  margin-bottom: 8px;
  border-radius: $radius-sm;
  background: rgba($violet-500, 0.07);
  border: 1px solid rgba($violet-500, 0.22);
  font-size: 0.81rem;
  color: $text-muted;
  animation: fade-in 0.2s ease-out;

  &.is-active {
    background: rgba($rose-500, 0.07);
    border-color: rgba($rose-400, 0.28);
    color: $text-secondary;
    strong { color: $rose-300; }
  }

  button {
    margin-left: auto;
    flex-shrink: 0;
    padding: 3px 10px;
    border-radius: $radius-sm;
    border: 1px solid $border-subtle;
    background: transparent;
    color: $text-muted;
    cursor: pointer;
    font-size: 0.75rem;
    transition: all $transition-fast;
    &:hover { background: rgba(255, 255, 255, 0.08); color: $text-secondary; }
  }
}

// Vote card clickable in manual pick mode
.day-vote-card.is-pickable {
  cursor: pointer;
  outline: 1px dashed rgba($rose-400, 0.35);
  &:hover {
    border-color: rgba($rose-400, 0.55);
    background: rgba($rose-500, 0.08);
    transform: translateY(-2px);
    box-shadow: 0 4px 18px rgba($rose-500, 0.14);
  }
}

// Revote: card is a candidate (everyone votes for them)
.day-vote-card.is-candidate {
  border-color: rgba($violet-400, 0.45);
  box-shadow: 0 0 10px rgba($violet-400, 0.15);
  .day-vote-select { display: none; } // candidates don't vote
}

// Revote: card belongs to a voter (non-candidate) — slightly dimmed to signal restricted role
.day-vote-card.is-non-voter {
  opacity: 0.82;
}

.abandoned-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.2rem;
  z-index: 3;
  animation: fade-in 0.3s ease-out;
  cursor: pointer;

  &:hover {
    background: rgba($neutral-amber, 0.3);
  }
}

.dead-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  z-index: 3;
  animation: fade-in 0.3s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.day-vote-card {
  &.is-condemned {
    border: 2px solid rgba($rose-400, 0.85);
    background: linear-gradient(160deg, rgba($rose-500, 0.18) 0%, rgba($rose-500, 0.04) 100%);
    box-shadow:
      0 0 0 1px rgba($rose-500, 0.2),
      0 0 20px rgba($rose-500, 0.25),
      inset 0 0 16px rgba($rose-500, 0.1);
  }

  &.is-abandoned {
    opacity: 0.6;
    filter: grayscale(0.5) brightness(0.8);
    border-color: rgba($neutral-amber, 0.4);
  }

  &.is-dead {
    opacity: 0.5;
    filter: grayscale(0.8);
  }
}

// ─── Narrator Execution Panel ──
.narrator-exec-panel {
  position: absolute;
  top: 0;
  right: -280px;
  width: 270px;
  background: rgba($violet-950, 0.95);
  border: 1.5px solid $violet-700;
  border-radius: $radius-lg;
  padding: 12px;
  z-index: 20;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  max-height: 80vh;
  overflow-y: auto;
  animation: slide-in 0.3s ease-out;
}

@keyframes slide-in {
  from { transform: translateX(300px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.exec-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba($violet-400, 0.2);
}

.exec-panel-title {
  font-weight: 700;
  color: $rose-300;
  font-size: 0.9rem;
}

.btn-close {
  background: none;
  border: none;
  color: $text-muted;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0;
  transition: color $transition-fast;

  &:hover {
    color: $rose-300;
  }
}

.exec-panel-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.exec-option {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.exec-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: $violet-300;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.exec-btn {
  padding: 8px 10px;
  border: 1.5px solid;
  border-radius: $radius-md;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  text-align: center;

  &.exec-manual {
    color: $rose-300;
    border-color: rgba($rose-400, 0.4);
    background: rgba($rose-500, 0.1);

    &:hover {
      background: rgba($rose-500, 0.2);
      border-color: rgba($rose-400, 0.6);
      box-shadow: 0 0 12px rgba($rose-500, 0.2);
    }
  }
}

.exec-player {
  font-size: 0.65rem;
  opacity: 0.8;
}

.exec-player-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.exec-player-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: $radius-sm;
  background: rgba($violet-500, 0.05);
  border: 1px solid rgba($violet-400, 0.15);
}

.exec-row-name {
  flex: 1;
  font-size: 0.72rem;
  font-weight: 600;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.exec-suicide-btn {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border: 1px solid rgba($neutral-amber, 0.35);
  border-radius: $radius-sm;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($neutral-amber, 0.07);

  &:hover {
    background: rgba($neutral-amber, 0.22);
    border-color: rgba($neutral-amber, 0.6);
  }
}

.exec-revive-btn {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border: 1px solid rgba($neutral-amber, 0.4);
  border-radius: $radius-sm;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($neutral-amber, 0.08);
  color: $neutral-amber;

  &:hover {
    background: rgba($neutral-amber, 0.25);
    border-color: rgba($neutral-amber, 0.7);
    box-shadow: 0 0 6px rgba($neutral-amber, 0.3);
  }
}

.is-abandoned-row {
  opacity: 0.75;
  border-color: rgba($neutral-amber, 0.3) !important;
  background: rgba($neutral-amber, 0.05) !important;
}

.day-vote-header-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  position: absolute;
  right: 0;
}

.day-vote-action-btn {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: $bg-glass;
  border: 1px solid $border-subtle;
  color: $text-muted;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-fast;

  &:hover,
  &.active {
    background: rgba($rose-500, 0.25);
    border-color: rgba($rose-400, 0.5);
    color: $rose-300;
    box-shadow: 0 0 8px rgba($rose-500, 0.2);
  }

  &.is-danger {
    border-color: rgba($neutral-amber, 0.35);
    color: $neutral-amber;
    &:hover {
      background: rgba($neutral-amber, 0.15);
      border-color: rgba($neutral-amber, 0.6);
      box-shadow: 0 0 8px rgba($neutral-amber, 0.25);
    }

    &.is-confirming {
      width: auto;
      padding: 0 10px;
      background: rgba($rose-500, 0.18);
      border-color: rgba($rose-400, 0.65);
      color: $rose-300;
      box-shadow: 0 0 10px rgba($rose-500, 0.3);
      animation: confirm-danger-pulse 0.6s ease-in-out infinite;

      .reset-confirm-label {
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        white-space: nowrap;
      }

      &:hover {
        background: rgba($rose-500, 0.32);
        border-color: $rose-400;
        box-shadow: 0 0 16px rgba($rose-500, 0.45);
        transform: scale(1.05);
      }
    }
  }
}

@keyframes confirm-danger-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba($rose-500, 0.3); }
  50%       { box-shadow: 0 0 18px rgba($rose-500, 0.6); }
}

// ── Vote-against indicator ──
.day-vote-against {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  font-size: 0.78rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  color: $neutral-amber;
  background: rgba($neutral-amber, 0.12);
  border-bottom-left-radius: $radius-md;
  border-left: 1px solid rgba($neutral-amber, 0.2);
  border-bottom: 1px solid rgba($neutral-amber, 0.2);
  z-index: 2;
  line-height: 1;
  transition: all 0.25s ease;

  &.is-defense {
    color: #fff;
    background: rgba($rose-400, 0.7);
    border-color: rgba($rose-400, 0.5);
  }
}

// ── Footer ────────────────────────────────────────────────
.day-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 18px 0 0;
  flex-shrink: 0;
  margin-top: 18px;
  position: relative;
  z-index: 2;
  // Dawn-warm top separator
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba($neutral-amber, 0.18) 25%,
      rgba($violet-400, 0.16) 75%,
      transparent
    );
  }
}

.day-nav-btn {
  padding: 10px 22px;
  border-radius: $radius-md;
  border: 1px solid $border-subtle;
  background: $bg-glass;
  color: $text-muted;
  font-size: 0.82rem;
  font-weight: 600;
  font-family: $font-body;
  cursor: pointer;
  transition: all $transition-base;

  &:disabled { opacity: 0.3; cursor: not-allowed; }
  &:hover:not(:disabled) {
    background: $bg-glass-hover;
    border-color: $border-active;
    color: $text-secondary;
    transform: translateY(-1px);
  }

  &.back { color: $text-muted; font-size: 0.78rem; }

  &.night {
    color: $violet-300;
    border-color: rgba($violet-400, 0.3);
    background: rgba($violet-500, 0.08);
    &:hover:not(:disabled) {
      background: rgba($violet-500, 0.16);
      border-color: $border-active;
      color: $lavender;
      box-shadow: $glow-violet;
    }
    &.night-confirm {
      color: $neutral-amber;
      border-color: rgba($neutral-amber, 0.55);
      background: rgba($neutral-amber, 0.18);
      box-shadow: 0 0 18px rgba($neutral-amber, 0.2);
      animation: confirm-pulse 1.2s ease-in-out infinite;
    }
  }

  &.vote {
    color: $neutral-amber;
    border-color: rgba($neutral-amber, 0.35);
    background: rgba($neutral-amber, 0.09);
    font-weight: 700;
    &:hover:not(:disabled) {
      background: rgba($neutral-amber, 0.16);
      border-color: rgba($neutral-amber, 0.55);
      box-shadow: 0 0 22px rgba($neutral-amber, 0.2);
    }
  }
}

// slide-up transition
.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

// ─── View Toggle ───
.vote-view-toggle {
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: $radius-md;
  @include glass(0.06);
  border: 1px solid $border-subtle;
  margin-left: auto;
}

.view-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  border-radius: calc($radius-md - 2px);
  border: none;
  background: transparent;
  color: $text-muted;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.25s ease;

  &:hover {
    color: $violet-300;
    background: rgba($violet-500, 0.1);
  }

  &.active {
    background: rgba($violet-500, 0.2);
    color: $violet-200;
    box-shadow: 0 0 8px rgba($violet-400, 0.2);
  }
}

// ─── View switch transition ───
.view-switch-enter-active,
.view-switch-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.view-switch-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.view-switch-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}

// ─── Circle View Wrapper ───
.vote-circle-view {
  display: flex;
  justify-content: center;
}

// ─── Table View ───
.vote-table-view {
  width: 100%;
  max-width: 650px;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  animation: fadeInUp 0.3s ease-out;
}

// Candidate summary cards row
.table-candidates-bar {
  display: flex;
  gap: 0.6rem;
  justify-content: center;
  flex-wrap: wrap;
}

.table-candidate-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0.6rem 0.8rem;
  border-radius: $radius-lg;
  border: 2px solid var(--cand-color);
  @include glass(0.06);
  transition: all 0.3s ease;
  position: relative;
  min-width: 80px;

  &.is-leading {
    background: rgba($violet-500, 0.1);
    box-shadow: 0 0 20px color-mix(in srgb, var(--cand-color) 25%, transparent);

    .table-cand-name {
      color: $violet-200;
    }
  }

  &.is-elected {
    border-color: $neutral-amber;
    box-shadow: 0 0 24px rgba($neutral-amber, 0.4);
  }
}

.table-cand-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2.5px solid;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($bg-primary, 0.5);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  span {
    font-size: 0.8rem;
    font-weight: 800;
    color: $violet-200;
  }
}

.table-cand-name {
  font-size: 0.75rem;
  font-weight: 700;
  color: $text-secondary;
}

.table-cand-votes {
  font-size: 0.85rem;
  font-weight: 900;
}

.table-cand-crown {
  position: absolute;
  top: -8px;
  right: -8px;
  font-size: 1.1rem;
  filter: drop-shadow(0 0 6px rgba($neutral-amber, 0.8));
}

// Voters table grid
.vote-table-grid {
  border-radius: $radius-lg;
  @include glass(0.04);
  border: 1px solid $border-subtle;
  overflow: hidden;
}

.vote-table-header {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.8rem;
  background: rgba($violet-500, 0.06);
  border-bottom: 1px solid $border-subtle;
  gap: 0.5rem;

  .vtable-col {
    font-size: 0.7rem;
    font-weight: 700;
    color: $text-muted;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.vtable-col-num {
  width: 32px;
  text-align: center;
  flex-shrink: 0;
}

.vtable-col-player {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.vtable-col-vote {
  width: auto;
  display: flex;
  justify-content: flex-end;
}

.vote-table-body {
  display: flex;
  flex-direction: column;
}

.vote-table-row {
  display: flex;
  align-items: center;
  padding: 0.45rem 0.8rem;
  gap: 0.5rem;
  border-bottom: 1px solid rgba($border-subtle, 0.5);
  transition: all 0.2s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba($violet-500, 0.04);
  }

  &.has-voted {
    background: rgba($violet-500, 0.03);
  }
}

.vtable-player-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid $border-subtle;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba($bg-primary, 0.3);
  transition: all 0.25s ease;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  span {
    font-size: 0.6rem;
    font-weight: 800;
    color: $text-muted;
  }
}

.vtable-player-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: $text-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vtable-vote-buttons {
  display: flex;
  gap: 4px;
}

.vtable-vote-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: rgba($violet-500, 0.05);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;

  &:hover {
    border-color: var(--btn-color);
    transform: scale(1.15);
    background: rgba($violet-500, 0.1);
  }

  &.is-active {
    border-color: var(--btn-color);
    background: color-mix(in srgb, var(--btn-color) 15%, transparent);
    box-shadow: 0 0 12px color-mix(in srgb, var(--btn-color) 35%, transparent);
    transform: scale(1.1);

    .vtable-btn-avatar {
      box-shadow: 0 0 8px color-mix(in srgb, var(--btn-color) 40%, transparent);
    }
  }
}

.vtable-btn-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1.5px solid;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($bg-primary, 0.3);
  transition: all 0.25s;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  span {
    font-size: 0.5rem;
    font-weight: 800;
    color: $violet-200;
  }
}

// Result strip

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse-green {
  0%, 100% { box-shadow: 0 0 0 0 rgba($village-green, 0.7); }
  50% { box-shadow: 0 0 0 6px rgba($village-green, 0); }
}

@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba($wolf-red, 0.7); }
  50% { box-shadow: 0 0 0 6px rgba($wolf-red, 0); }
}

// ─── Setup Interface (3-Column Layout) ──────────────────────
.setup-interface {
  padding: 0 1rem 2rem;
}

.setup-grid-three {
  display: grid;
  grid-template-columns: 300px 1fr 280px;
  gap: 1.2rem;
  
  @media (max-width: 1400px) {
    grid-template-columns: 260px 1fr 240px;
  }
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
}

.setup-panel-left,
.setup-panel-center,
.setup-panel-right {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 200px);
  overflow: hidden;
}

.setup-panel-right {
  gap: 0;
}

.setup-panel-center {
  max-height: calc(100vh - 200px);
  overflow: hidden;
}

.panel-header-setup {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba($violet-400, 0.2);
}

.panel-title-setup {
  @include elegant-text();
  font-size: 1.3rem;
  font-weight: 700;
  background: linear-gradient(135deg, $violet-300, $pink-400);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0;
}

.panel-subtitle {
  font-size: 0.82rem;
  color: $text-muted;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.count-badge {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border-radius: $radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid;
  font-weight: 700;
  font-size: 1.1rem;
  transition: all $transition-fast;

  &.player-badge {
    background: rgba($village-green, 0.12);
    border-color: rgba($village-green, 0.3);
    color: $village-green;
    box-shadow: 0 2px 8px rgba($village-green, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  &.role-badge {
    background: rgba($violet-500, 0.12);
    border-color: rgba($violet-400, 0.3);
    color: $violet-200;
    box-shadow: 0 2px 8px rgba($violet-500, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba($violet-500, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }

  .badge-value {
    font-size: 1.1rem;
    font-variant-numeric: tabular-nums;
  }
}

// ─── Left Panel: Players ────────────────────────────────────
.bot-status-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba($violet-400, 0.2);
}

.status-dot-mini {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: $wolf-red;
  box-shadow: 0 0 6px rgba($wolf-red, 0.5);

  &.online {
    background: $village-green;
    box-shadow: 0 0 6px rgba($village-green, 0.5);
  }
}

.panel-header-with-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.player-addition-inline {
  display: flex;
  gap: 8px;
  flex: 1;
  max-width: 400px;
  min-width: 200px;
}

.input-modern-inline {
  flex: 1;
  padding: 8px 12px;
  border-radius: $radius-md;
  border: 1px solid rgba($violet-400, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: $text-primary;
  font-size: 0.85rem;
  transition: all $transition-fast;

  &:focus {
    outline: none;
    border-color: $violet-400;
    box-shadow: 0 0 0 2px rgba($violet-400, 0.2);
  }

  &::placeholder {
    color: $text-muted;
  }
}

.btn-add-inline {
  width: 36px;
  height: 36px;
  border-radius: $radius-md;
  border: 1px solid $violet-400;
  background: rgba($violet-500, 0.2);
  color: $violet-100;
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-fast;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: rgba($violet-500, 0.3);
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.input-hint-compact {
  font-size: 0.7rem;
  color: $text-muted;
  margin-bottom: 8px;
  padding-left: 2px;
}

.players-setup-list-compact {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
  max-height: 540px;
  overflow-y: auto;
  margin-bottom: 1rem;
  padding-right: 4px;

  @media (max-width: 1400px) {
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  }

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba($violet-400, 0.3);
    border-radius: 2px;

    &:hover {
      background: rgba($violet-400, 0.5);
    }
  }
}

.player-card-compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  padding: 12px 10px;
  border-radius: $radius-lg;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba($violet-400, 0.15);
  transition: all $transition-fast;
  position: relative;
  min-height: 210px;

  &:hover {
    border-color: rgba($violet-400, 0.35);
    background: rgba($violet-500, 0.05);
    
    .btn-remove-mini {
      opacity: 1;
      pointer-events: auto;
    }
  }
}

.player-number-wrapper {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 10;
}

.player-number-select {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba($violet-500, 0.7), rgba($violet-600, 0.6));
  border: 2px solid rgba($violet-300, 0.4);
  font-size: 0.95rem;
  font-weight: 700;
  color: $text-primary;
  box-shadow: 0 1px 4px rgba($violet-500, 0.15);
  transition: all $transition-fast;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    border-color: rgba($violet-300, 0.6);
    background: linear-gradient(135deg, rgba($violet-400, 0.8), rgba($violet-500, 0.7));
    transform: scale(1.05);
  }
  
  &.has-duplicate {
    background: linear-gradient(135deg, rgba($wolf-red, 0.7), rgba($wolf-red, 0.8));
    border-color: $wolf-red;
    animation: pulse-error 1.5s ease-in-out infinite;
    
    &:hover {
      background: linear-gradient(135deg, rgba($wolf-red, 0.8), rgba($wolf-red, 0.9));
      border-color: $wolf-red;
    }
  }
}

@keyframes pulse-error {
  0%, 100% {
    box-shadow: 0 1px 4px rgba($wolf-red, 0.3);
  }
  50% {
    box-shadow: 0 0 12px rgba($wolf-red, 0.6);
  }
}

.number-picker-dropdown {
  position: absolute;
  top: 40px;
  left: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 8px;
  background: rgba($bg-secondary, 0.98);
  border: 2px solid rgba($violet-400, 0.6);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 100;
  max-width: 160px;
  
  .number-option {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: rgba($violet-500, 0.2);
    border: 1px solid rgba($violet-400, 0.4);
    color: $text-primary;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      background: rgba($violet-500, 0.4);
      border-color: $violet-400;
      transform: scale(1.08);
    }
  }
}

.player-info-compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.player-avatar-mini {
  width: 75px !important;
  height: 75px !important;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba($violet-500, 0.4), rgba($pink-400, 0.3));
  border: 2px solid rgba($violet-400, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.7rem;
  color: $violet-100;
  flex-shrink: 0;
  overflow: hidden;
  position: relative;

  &.has-image {
    background: transparent;
    padding: 0;
  }

  .avatar-image {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover;
  }
}

.player-name-compact {
  font-size: 0.82rem;
  font-weight: 600;
  color: $text-primary;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.discord-tag {
  font-size: 0.7rem;
  opacity: 0.7;
}

.role-select-compact {
  width: 100%;
  padding: 6px;
  border-radius: $radius-md;
  border: 1px solid rgba($violet-400, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: $text-primary;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;
  text-align: center;

  option {
    background: $bg-secondary;
    color: $text-primary;
    padding: 8px 12px;
    border-radius: $radius-sm;
    font-weight: 500;
    
    &:hover {
      background: rgba($violet-500, 0.2);
      color: $violet-100;
    }
    
    &:checked {
      background: rgba($violet-500, 0.3);
      color: $violet-100;
    }
  }

  &:focus {
    outline: none;
    border-color: $violet-400;
    background: rgba(0, 0, 0, 0.4);
  }

  &:hover {
    border-color: rgba($violet-400, 0.5);
    background: rgba(0, 0, 0, 0.35);
  }

  &.no-role {
    border-color: rgba($violet-400, 0.4);
    background: rgba(0, 0, 0, 0.3);
    opacity: 0.7;
  }
}

.btn-remove-mini {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba($wolf-red, 0.3);
  background: rgba($wolf-red, 0.1);
  color: $wolf-red;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  opacity: 0;
  pointer-events: none;

  &:hover {
    opacity: 1;
    border-color: $wolf-red;
    background: rgba($wolf-red, 0.25);
    transform: scale(1.15);
  }
}

.empty-state-compact {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1rem;
  text-align: center;
}

.empty-icon-compact {
  font-size: 2.5rem;
  opacity: 0.3;
  margin-bottom: 0.5rem;
}

.empty-text-compact {
  font-size: 0.85rem;
  color: $text-secondary;
}

.start-game-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 1rem;
  border-top: 2px solid rgba($violet-400, 0.2);
  margin-top: auto;
}

.game-action-buttons {
  display: flex;
  gap: 10px;
  width: 100%;
}

.btn-reset-assignments {
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: $radius-lg;
  border: 1px solid rgba($violet-400, 0.4);
  background: rgba(0, 0, 0, 0.3);
  color: $text-secondary;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all $transition-base;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    transform: translateY(-2px) rotate(180deg);
    background: rgba($violet-500, 0.2);
    border-color: rgba($violet-400, 0.6);
    color: $text-primary;
  }

  &:active {
    transform: translateY(0) rotate(360deg);
  }
}

.validation-display-inline {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: $radius-md;
  border: 1px solid;
  transition: all $transition-fast;
  width: 100%;

  &.validation-success {
    background: rgba(0, 0, 0, 0.2);
    border-color: rgba($violet-400, 0.4);
    
    .validation-icon {
      color: rgba($village-green, 0.8);
    }
  }

  &.validation-warning {
    background: rgba(0, 0, 0, 0.2);
    border-color: rgba($violet-400, 0.3);
    
    .validation-icon {
      color: rgba($text-secondary, 0.8);
    }
  }

  &.validation-error {
    background: rgba(0, 0, 0, 0.2);
    border-color: rgba($violet-400, 0.3);
    
    .validation-icon {
      color: rgba($text-secondary, 0.8);
    }
  }
}

.validation-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
}

.validation-counts-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  color: $text-primary;
  flex-wrap: nowrap;
}

.count-item {
  padding: 2px 8px;
  border-radius: $radius-sm;
  background: rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}

.count-separator {
  opacity: 0.5;
}

.validation-message {
  font-size: 0.72rem;
  color: $text-muted;
  font-weight: 600;
  white-space: nowrap;
}

.btn-start-game-inline {
  flex: 1;
  padding: 10px 20px;
  border-radius: $radius-lg;
  border: 2px solid $violet-400;
  background: linear-gradient(135deg, rgba($violet-500, 0.3), rgba($pink-500, 0.2));
  color: $violet-100;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-base;
  box-shadow: $glow-violet;
  white-space: nowrap;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba($violet-500, 0.4);
    background: linear-gradient(135deg, rgba($violet-500, 0.4), rgba($pink-500, 0.3));
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }
}

.btn-random-assign {
  flex: 1;
  padding: 10px 20px;
  border-radius: $radius-lg;
  border: 2px solid rgba($day-accent, 0.5);
  background: linear-gradient(135deg, rgba($day-accent, 0.2), rgba($day-accent, 0.1));
  color: $day-accent;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-base;
  box-shadow: 0 4px 12px rgba($day-accent, 0.2);
  white-space: nowrap;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba($day-accent, 0.3);
    background: linear-gradient(135deg, rgba($day-accent, 0.3), rgba($day-accent, 0.15));
    border-color: $day-accent;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }
}

// Single Random Button (before expansion)
.btn-random-single {
  flex: 1;
  padding: 10px 20px;
  border-radius: $radius-lg;
  border: 2px solid rgba($day-accent, 0.5);
  background: linear-gradient(135deg, rgba($day-accent, 0.2), rgba($day-accent, 0.1));
  color: $day-accent;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-base;
  box-shadow: 0 4px 12px rgba($day-accent, 0.2);
  white-space: nowrap;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba($day-accent, 0.3);
    background: linear-gradient(135deg, rgba($day-accent, 0.3), rgba($day-accent, 0.15));
    border-color: $day-accent;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }
}

// Split Random Button (after expansion)
.btn-split-random {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
  border-radius: $radius-lg;
}

.btn-random-left,
.btn-random-right {
  flex: 1;
  padding: 10px 16px;
  border: 2px solid rgba($day-accent, 0.5);
  background: linear-gradient(135deg, rgba($day-accent, 0.2), rgba($day-accent, 0.1));
  color: $day-accent;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-base;
  box-shadow: 0 4px 12px rgba($day-accent, 0.2);
  white-space: nowrap;
  position: relative;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba($day-accent, 0.3);
    background: linear-gradient(135deg, rgba($day-accent, 0.3), rgba($day-accent, 0.15));
    border-color: $day-accent;
    z-index: 1;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }
}

.btn-random-left {
  border-top-left-radius: $radius-lg;
  border-bottom-left-radius: $radius-lg;
  border-right: 1px solid rgba($day-accent, 0.3);
}

.btn-random-right {
  border-top-right-radius: $radius-lg;
  border-bottom-right-radius: $radius-lg;
  border-left: 1px solid rgba($day-accent, 0.3);
}

// ─── Role Search ─────────────────────────────────────────────
.role-search-container {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 1rem;
}

.role-search-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: $radius-md;
  border: 1px solid rgba($violet-400, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: $text-primary;
  font-size: 0.85rem;
  transition: all $transition-fast;

  &:focus {
    outline: none;
    border-color: $violet-400;
    box-shadow: 0 0 0 2px rgba($violet-400, 0.2);
    background: rgba(0, 0, 0, 0.4);
  }

  &::placeholder {
    color: $text-muted;
  }
}

.btn-clear-roles {
  width: 40px;
  height: 40px;
  border-radius: $radius-md;
  border: 1px solid rgba($wolf-red, 0.3);
  background: rgba($wolf-red, 0.1);
  color: $wolf-red;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    border-color: $wolf-red;
    background: rgba($wolf-red, 0.2);
    box-shadow: 0 0 12px rgba($wolf-red, 0.4);
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

// ─── Center Panel: Grimoire ─────────────────────────────────
.grimoire-scroll {
  overflow-y: auto;
  max-height: calc(100vh - 280px);
  padding-right: 8px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba($violet-400, 0.3);
    border-radius: 3px;

    &:hover {
      background: rgba($violet-400, 0.5);
    }
  }
}

.grimoire-section {
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
}

.grimoire-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid rgba($violet-400, 0.2);
}

.grimoire-icon {
  font-size: 1.5rem;
}

.grimoire-title {
  font-size: 1rem;
  font-weight: 700;
  color: $text-primary;
}

.wolf-header {
  border-bottom-color: rgba($wolf-red, 0.3);
  .grimoire-icon { filter: drop-shadow(0 0 8px rgba($wolf-red, 0.6)); }
}

.village-header {
  border-bottom-color: rgba($village-green, 0.3);
  .grimoire-icon { filter: drop-shadow(0 0 8px rgba($village-green, 0.6)); }
}

.neutral-header {
  border-bottom-color: rgba($violet-400, 0.3);
  .grimoire-icon { filter: drop-shadow(0 0 8px rgba($violet-400, 0.6)); }
}

.grimoire-roles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.role-card-grimoire {
  padding: 12px;
  border-radius: $radius-md;
  border: 2px solid rgba($violet-400, 0.2);
  background: rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: all $transition-fast;
  text-align: left;

  &:hover {
    border-color: $violet-400;
    background: rgba($violet-500, 0.1);
    transform: translateY(-2px);
    box-shadow: $glow-violet;
  }

  &.selected {
    border-color: $violet-400;
    background: linear-gradient(135deg, rgba($violet-500, 0.3), rgba($pink-500, 0.2));
    box-shadow: $glow-violet;
  }
}

.role-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.role-card-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: $text-primary;
}

.role-check-unique {
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.role-check {
  font-size: 1rem;
  color: $violet-300;
  font-weight: 700;
}

.role-quantity-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px;
  border-radius: $radius-sm;
  border: 1px solid rgba($violet-400, 0.3);
}

.btn-qty {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba($violet-400, 0.4);
  background: rgba($violet-500, 0.2);
  color: $violet-200;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    border-color: $violet-400;
    background: rgba($violet-500, 0.3);
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.qty-display {
  min-width: 20px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: $violet-100;
}

.role-card-grimoire.non-unique {
  cursor: default;
  
  &:hover {
    transform: none;
  }
}

.role-card-desc {
  font-size: 0.75rem;
  color: $text-muted;
  line-height: 1.4;
  margin: 0;
}

// ─── Right Panel: Deck ──────────────────────────────────────
.btn-copy-deck {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba($violet-400, 0.3);
  background: rgba($violet-500, 0.2);
  color: $violet-200;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: $violet-400;
    background: rgba($violet-500, 0.3);
    box-shadow: $glow-violet;
    transform: scale(1.1);
  }
}

.deck-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 0;
}

.deck-stat {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.stat-icon-img {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: $text-primary;
  min-width: 20px;
  text-align: center;
}

.deck-log-container {
  border-radius: $radius-lg;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba($violet-400, 0.2);
  padding: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

.deck-log {
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  flex: 1;
  min-height: 0;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba($violet-400, 0.3);
    border-radius: 2px;

    &:hover {
      background: rgba($violet-400, 0.5);
    }
  }
}

.deck-log-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
  transition: all $transition-fast;
  border-bottom: 1px solid rgba($violet-400, 0.1);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba($violet-500, 0.05);
    
    .btn-remove-role {
      opacity: 1;
    }
  }
}

.log-number {
  font-size: 0.8rem;
  font-weight: 700;
  color: $text-muted;
  min-width: 24px;
}

.log-player-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($violet-500, 0.2);
  border: 1px solid rgba($violet-400, 0.3);
}

.log-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.log-avatar-initial {
  font-size: 0.65rem;
  font-weight: 700;
  color: $violet-200;
}

.log-role-name {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 600;
  color: $text-primary;
  
  &.wolf-role {
    color: $wolf-red;
  }
  
  &.village-role {
    color: color.adjust($village-green, $lightness: -5%);
  }
  
  &.neutral-role {
    color: $violet-400;
  }
}

.btn-remove-role {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba($wolf-red, 0.3);
  background: rgba($wolf-red, 0.1);
  color: $wolf-red;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.5;

  &:hover {
    opacity: 1;
    border-color: $wolf-red;
    background: rgba($wolf-red, 0.2);
    transform: scale(1.15);
  }
}

.empty-deck {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 1rem;
  text-align: center;
}

.empty-deck-icon {
  font-size: 3rem;
  opacity: 0.3;
  margin-bottom: 1rem;
}

.empty-deck-text {
  font-size: 0.9rem;
  font-weight: 700;
  color: $text-secondary;
  margin-bottom: 0.5rem;
}

.empty-deck-hint {
  font-size: 0.75rem;
  color: $text-muted;
}

// Role Categories (Legacy - Remove if not used)

.role-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.role-chip {
  padding: 7px 14px;
  border-radius: $radius-lg;
  border: 1px solid rgba($violet-400, 0.3);
  background: rgba(0, 0, 0, 0.2);
  color: $text-secondary;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    border-color: $violet-400;
    background: rgba($violet-500, 0.1);
    color: $text-primary;
    transform: translateY(-2px);
  }

  &.selected {
    border-color: $violet-400;
    background: linear-gradient(135deg, rgba($violet-500, 0.3), rgba($pink-500, 0.2));
    color: $violet-100;
    box-shadow: $glow-violet;
  }
}

.deck-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: $radius-lg;
  background: linear-gradient(135deg, rgba($violet-600, 0.15), rgba($pink-500, 0.1));
  border: 1px solid rgba($violet-400, 0.3);
}

.summary-label {
  font-size: 0.85rem;
  color: $text-secondary;
  font-weight: 600;
}

.summary-count {
  font-size: 0.9rem;
  font-weight: 700;
  color: $violet-200;
}

// Player Addition
.player-addition {
  margin-bottom: 1.5rem;
}

.smart-input-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.method-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  color: $text-secondary;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.label-icon {
  font-size: 1rem;
}

.input-hint {
  font-size: 0.75rem;
  color: $text-muted;
  min-height: 18px;
  transition: all $transition-fast;
  
  &:empty::before {
    content: '\u200b'; // Zero-width space to maintain height
  }
}

.input-row {
  display: flex;
  gap: 10px;
}

.input-modern {
  flex: 1;
  padding: 12px 16px;
  border-radius: $radius-lg;
  border: 1px solid rgba($violet-400, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: $text-primary;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all $transition-fast;

  &:focus {
    outline: none;
    border-color: $violet-400;
    box-shadow: $glow-violet;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::placeholder {
    color: $text-muted;
  }
}

.btn-add {
  width: 48px;
  height: 48px;
  border-radius: $radius-lg;
  border: 1px solid rgba($violet-400, 0.3);
  background: linear-gradient(135deg, rgba($violet-500, 0.2), rgba($pink-500, 0.1));
  color: $violet-200;
  font-size: 1.3rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    border-color: $violet-400;
    background: linear-gradient(135deg, rgba($violet-500, 0.3), rgba($pink-500, 0.2));
    box-shadow: $glow-violet;
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

// Players Setup List
.players-setup-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 1rem;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba($violet-400, 0.3);
    border-radius: 3px;

    &:hover {
      background: rgba($violet-400, 0.5);
    }
  }
}

.player-setup-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: $radius-lg;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba($violet-400, 0.2);
  margin-bottom: 10px;
  transition: all $transition-fast;

  &:hover {
    border-color: $violet-400;
    background: rgba($violet-500, 0.05);
    transform: translateX(4px);
  }
}

.player-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.player-avatar-setup {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba($violet-500, 0.3), rgba($pink-400, 0.2));
  border: 2px solid rgba($violet-400, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  color: $violet-100;
}

.player-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.player-name-setup {
  font-size: 0.9rem;
  font-weight: 700;
  color: $text-primary;
}

.player-badge {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: $radius-sm;
  font-weight: 700;
  width: fit-content;

  &.discord-badge {
    background: rgba($violet-500, 0.2);
    color: $violet-200;
    border: 1px solid rgba($violet-400, 0.3);
  }
}

.player-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.role-select-modern {
  min-width: 160px;
  padding: 8px 12px;
  border-radius: $radius-md;
  border: 1px solid rgba($violet-400, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: $text-primary;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;

  &:focus {
    outline: none;
    border-color: $violet-400;
    box-shadow: $glow-violet;
  }
}

.btn-remove {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba($wolf-red, 0.3);
  background: rgba($wolf-red, 0.1);
  color: $wolf-red;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: $wolf-red;
    background: rgba($wolf-red, 0.2);
    box-shadow: $glow-red;
    transform: scale(1.1);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  opacity: 0.3;
  margin-bottom: 1rem;
}

.empty-text {
  font-size: 1rem;
  font-weight: 700;
  color: $text-secondary;
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.85rem;
  color: $text-muted;
}

.setup-actions {
  padding-top: 1rem;
  border-top: 2px solid rgba($violet-400, 0.2);
}

.btn-start-game {
  width: 100%;
  padding: 14px 24px;
  border-radius: $radius-lg;
  border: 2px solid $violet-400;
  background: linear-gradient(135deg, rgba($violet-500, 0.3), rgba($pink-500, 0.2));
  color: $violet-100;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-base;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: $glow-violet;

  .btn-icon {
    font-size: 1.4rem;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba($violet-500, 0.4);
    background: linear-gradient(135deg, rgba($violet-500, 0.4), rgba($pink-500, 0.3));
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse-green {
  0%, 100% { box-shadow: 0 0 0 0 rgba($village-green, 0.7); }
  50% { box-shadow: 0 0 0 6px rgba($village-green, 0); }
}

@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba($wolf-red, 0.7); }
  50% { box-shadow: 0 0 0 6px rgba($wolf-red, 0); }
}

// ─── Phase Banner ───────────────────────────────────────────
.phase-banner {
  text-align: center;
  padding: 36px 0;
  margin-bottom: 28px;
  transition: all $transition-cinematic;

  .phase-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .phase-icon {
    font-size: 3rem;
    filter: drop-shadow(0 0 10px rgba($violet-400, 0.5));
  }

  .phase-title {
    @include elegant-text();
    font-size: 2rem;
    font-weight: 700;
    font-style: italic;
  }

  .phase-info {
    font-size: 0.85rem;
    color: $text-secondary;
  }

  &.night {
    .phase-title {
      background: linear-gradient(135deg, $violet-200, $violet-400);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }

  &.day {
    .phase-title {
      background: linear-gradient(135deg, $day-accent, #fde68a);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }

  &.end {
    .phase-title {
      background: linear-gradient(135deg, $rose-300, $rose-400);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }
}

// ─── Game Grid ──────────────────────────────────────────────
.game-grid {
  display: grid;
  grid-template-columns: 300px 1fr 300px;
  gap: 20px;
  align-items: start;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
}

// ─── Panel Common ───────────────────────────────────────────
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-title {
  @include elegant-text();
  font-size: 0.88rem;
  font-style: italic;
  color: $violet-300;
}

// ─── Players Panel ──────────────────────────────────────────
.player-count {
  font-size: 0.75rem;
  color: $text-muted;
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.player-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: $radius-md;
  @include glass(0.04);
  transition: all $transition-fast;
  position: relative;

  &:hover {
    background: $bg-glass-hover;
  }

  &.dead {
    opacity: 0.4;
  }

  &.captain {
    border-left: 3px solid $day-accent;
  }

  &.infected {
    border-left: 3px solid $wolf-red;
  }
}

.player-number-badge-game {
  position: absolute;
  top: -6px;
  left: -6px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba($violet-500, 0.9), rgba($violet-600, 0.8));
  border: 2px solid rgba($violet-300, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: $text-primary;
  z-index: 10;
  box-shadow: 0 2px 6px rgba($violet-500, 0.3);
}

.player-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba($violet-500, 0.2), rgba($pink-400, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.2rem;
  color: $violet-200;
  flex-shrink: 0;
  border: 1px solid rgba($violet-400, 0.15);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &.dead {
    background: rgba(100, 100, 100, 0.2);
    border-color: rgba(100, 100, 100, 0.15);
    color: rgba(150, 150, 150, 0.5);
  }
}

.player-info {
  flex: 1;
  min-width: 0;
}

.player-name {
  font-size: 0.85rem;
  font-weight: 700;
}

.player-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;

  span {
    font-size: 0.6rem;
    padding: 2px 6px;
    border-radius: 100px;
  }
}

.badge-captain {
  background: rgba($day-accent, 0.12);
  color: $day-accent;
  border: 1px solid rgba($day-accent, 0.2);
}

.badge-dead {
  background: rgba(150, 150, 150, 0.1);
  color: #999;
}

.player-actions {
  display: flex;
  gap: 4px;
}

.btn-action {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: $radius-sm;
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  font-size: 0.75rem;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    transform: scale(1.15);
  }

  &.kill:hover { background: rgba($wolf-red, 0.15); }
  &.revive:hover { background: rgba($village-green, 0.15); }
  &.infect:hover { background: rgba($wolf-red, 0.1); }
  &.captain:hover { background: rgba($day-accent, 0.15); }
}

.add-player {
  display: flex;
  gap: 8px;
  margin-top: 10px;

  .input { flex: 1; padding: 9px 14px; font-size: 0.82rem; }
  .add-btn { padding: 9px 16px; border-radius: $radius-md; }
}

// ─── Phase Controls ─────────────────────────────────────────
.transition-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.transition-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 20px;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  background: transparent;
  color: $text-primary;
  font-family: $font-body;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-base;

  .transition-icon { font-size: 1.2rem; }

  &:hover {
    transform: translateX(6px);
  }

  &.btn-night {
    border-color: rgba($violet-400, 0.2);
    &:hover { background: rgba($violet-500, 0.08); box-shadow: $glow-violet; }
  }

  &.btn-day {
    border-color: rgba($day-accent, 0.2);
    &:hover { background: rgba($day-accent, 0.08); }
  }

  &.btn-end {
    border-color: rgba($wolf-red, 0.2);
    &:hover { background: rgba($wolf-red, 0.08); box-shadow: $glow-red; }
  }

  &.btn-default {
    &:hover { background: $bg-glass-hover; }
  }
}

// ─── Vote Panel ─────────────────────────────────────────────
.vote-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.vote-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.voter-name {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 600;
}

.vote-weight {
  font-size: 0.72rem;
  color: $day-accent;
  font-weight: 700;
}

.vote-select {
  width: 140px;
  padding: 7px 12px;
  font-size: 0.8rem;
}

// ─── Night Panel ────────────────────────────────────────────
.night-panel {
  margin-top: 1.5rem;
}

.night-hint {
  font-size: 0.82rem;
  color: $text-muted;
  margin-top: 6px;
}

.night-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.night-action-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr auto;
  gap: 6px;

  .input {
    padding: 7px 10px;
    font-size: 0.8rem;
  }

  .btn-ghost {
    padding: 7px 10px;
    font-size: 0.8rem;
  }
}

// ─── Override Panel ─────────────────────────────────────────
.override-panel {
  margin-top: 16px;
}

.override-buttons {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;

  .btn-danger, .btn-ghost {
    flex: 1;
    font-size: 0.82rem;
    padding: 11px;
  }
}

// ─── Log Panel ──────────────────────────────────────────────
.log-entries {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 500px;
  overflow-y: auto;
}

.log-entry {
  display: flex;
  gap: 8px;
  padding: 7px 12px;
  border-radius: $radius-sm;
  font-size: 0.78rem;
  @include glass(0.03);

  .log-time {
    color: $text-muted;
    font-size: 0.7rem;
    flex-shrink: 0;
  }

  .log-message {
    flex: 1;
    color: $text-secondary;
  }

  &.death {
    border-left: 2px solid $wolf-red;
    .log-message { color: $wolf-red; }
  }

  &.action {
    border-left: 2px solid $violet-400;
    .log-message { color: $violet-300; }
  }

  &.system {
    .log-message { color: $text-muted; font-style: italic; }
  }
}

// ─── Game Not Found ─────────────────────────────────────────
.game-not-found {
  text-align: center;
  padding: 60px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: $text-muted;

  .not-found-icon {
    font-size: 3rem;
    opacity: 0.4;
  }
}

// ─── Scan Selection Modal ───────────────────────────────────
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-content {
  background: linear-gradient(135deg, rgba($violet-900, 0.95), rgba($violet-950, 0.9));
  border-radius: $radius-xl;
  border: 2px solid rgba($violet-400, 0.3);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &.scan-modal {
    max-width: 860px;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 2px solid rgba($violet-400, 0.2);
}

.modal-title {
  @include elegant-text();
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, $violet-300, $pink-400);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.btn-close-modal {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba($wolf-red, 0.3);
  background: rgba($wolf-red, 0.1);
  color: $wolf-red;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba($wolf-red, 0.2);
    transform: scale(1.1);
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.modal-info {
  margin-bottom: 1.5rem;
  
  p {
    font-size: 0.95rem;
    color: $text-secondary;
    margin-bottom: 1rem;
  }
}

.modal-actions-top {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-secondary-sm {
  padding: 6px 12px;
  border-radius: $radius-md;
  border: 1px solid rgba($violet-400, 0.4);
  background: rgba($violet-500, 0.2);
  color: $violet-200;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: rgba($violet-500, 0.3);
    border-color: $violet-400;
  }
}

.scanned-players-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.scanned-player-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: $radius-lg;
  background: rgba(15, 7, 32, 0.5);
  border: 1.5px solid rgba($violet-400, 0.12);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba($violet-500, 0.06), rgba($pink-400, 0.03));
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  &:hover {
    border-color: rgba($violet-400, 0.35);
    transform: translateY(-1px);

    &::before {
      opacity: 1;
    }
  }

  &.selected {
    background: rgba($violet-500, 0.12);
    border-color: rgba($violet-400, 0.5);
    box-shadow: 0 0 16px rgba($violet-500, 0.15), inset 0 0 20px rgba($violet-500, 0.05);

    &::before {
      opacity: 1;
    }

    .player-select-check {
      background: linear-gradient(135deg, $violet-500, $pink-500);
      border-color: transparent;
    }

    .player-avatar-scan {
      border-color: rgba($violet-400, 0.5);
    }
  }
}

.player-select-check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid rgba($violet-400, 0.25);
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;

  .check-icon {
    font-size: 0.7rem;
    font-weight: 900;
    color: white;
    line-height: 1;
  }
}

.check-pop-enter-active {
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.check-pop-leave-active {
  transition: all 0.15s ease-out;
}
.check-pop-enter-from,
.check-pop-leave-to {
  opacity: 0;
  transform: scale(0.3);
}

.player-avatar-scan {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba($violet-500, 0.3), rgba($pink-400, 0.2));
  border: 2px solid rgba($violet-400, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  color: $violet-200;
  flex-shrink: 0;
  overflow: hidden;
  transition: border-color 0.25s ease;

  &.has-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.player-info-scan {
  flex: 1;
  min-width: 0;
}

.player-name-scan {
  font-size: 0.88rem;
  font-weight: 600;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.player-username-scan {
  font-size: 0.72rem;
  color: $text-muted;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 2px solid rgba($violet-400, 0.2);
}

// Modal transitions
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
  
  .modal-content {
    transition: transform 0.3s ease;
  }
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  
  .modal-content {
    transform: scale(0.9);
  }
}

// Loading animation for phase transitions
.loading-with-spinner {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  
  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// Phase transition animations — forward (content rises from below)
.phase-transition-enter-active,
.phase-transition-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.phase-transition-enter-from {
  opacity: 0;
  transform: translate3d(0, 12px, 0);
  filter: blur(6px);
}
.phase-transition-leave-to {
  opacity: 0;
  transform: translate3d(0, -8px, 0);
  filter: blur(6px);
}

// Back navigation — content descends from above (reversed direction)
.phase-transition-back-enter-active,
.phase-transition-back-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.phase-transition-back-enter-from {
  opacity: 0;
  transform: translate3d(0, -12px, 0);
  filter: blur(6px);
}
.phase-transition-back-leave-to {
  opacity: 0;
  transform: translate3d(0, 8px, 0);
  filter: blur(6px);
}

// Instant — no animation used when nightfall/dawnrise overlay covers the transition
.phase-instant-enter-active,
.phase-instant-leave-active { transition: none !important; }
.phase-instant-enter-from,
.phase-instant-leave-to { opacity: 1; transform: none; filter: none; }
</style>
