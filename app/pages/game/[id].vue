<template>
  <div class="game-page">
    <NuxtLayout name="game">
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
        <div v-if="!['SETUP', 'CONFIRMATION', 'CAPTAIN_APPLICATION', 'CAPTAIN_VOTE', 'CAPTAIN_SPIN'].includes(gameStore.currentPhase)" class="phase-banner" :class="phaseClass">
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
        <Transition name="phase-transition" mode="out-in">
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
        <Transition name="phase-transition" mode="out-in">
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
        <Transition name="phase-transition" mode="out-in">
          <div v-if="gameStore.currentPhase === 'CAPTAIN_APPLICATION'" key="captain-app" class="captain-interface">
            <div class="captain-container">
              <!-- Header -->
              <div class="captain-header">
                <div class="captain-crown-wrap">
                  <span class="captain-crown">👑</span>
                  <div class="crown-rays">
                    <span v-for="i in 8" :key="i" class="crown-ray" :style="{ transform: `rotate(${i * 45}deg)` }" />
                  </div>
                </div>
                <h1 class="captain-title">
                  <template v-if="isSpinning">🎡 Tirage en cours...</template>
                  <template v-else-if="spinResult.size > 0">✨ Résultat du Tirage</template>
                  <template v-else>Élection du Capitaine</template>
                </h1>
                <p class="captain-subtitle">
                  <template v-if="isSpinning">Le sort est en train de choisir...</template>
                  <template v-else-if="spinResult.size > 0">{{ spinResult.size }} candidat{{ spinResult.size !== 1 ? 's' : '' }} sélectionné{{ spinResult.size !== 1 ? 's' : '' }} !</template>
                  <template v-else>Sélectionnez les candidats qui se présentent</template>
                </p>
              </div>

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
        <Transition name="phase-transition" mode="out-in">
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
                    @click="transitionTo('FIRST_NIGHT')"
                    :disabled="isTransitioning"
                  >
                    🌙 Passer à la Nuit 1
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



        <!-- Main Game Grid (Hidden during SETUP, CONFIRMATION, and Captain phases) -->
        <div v-if="!['SETUP', 'CONFIRMATION', 'CAPTAIN_APPLICATION', 'CAPTAIN_SPIN', 'CAPTAIN_VOTE'].includes(gameStore.currentPhase)" class="game-grid">
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
                <div class="player-number-badge-game">{{ player.number || '?' }}</div>
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

            <!-- Vote Panel (during VOTE phase) -->
            <div v-if="gameStore.currentPhase === 'VOTE'" class="glass-card vote-panel">
              <h2 class="panel-title">🗳️ Vote du Village</h2>
              <div class="vote-grid">
                <div v-for="player in gameStore.alivePlayers" :key="player.id" class="vote-row">
                  <span class="voter-name">{{ player.number }}. {{ player.name }}</span>
                  <span v-if="player.isCaptain" class="vote-weight">×2</span>
                  <select v-model="votes[player.id]" class="input vote-select">
                    <option value="">— Pas de vote —</option>
                    <option
                      v-for="target in gameStore.alivePlayers.filter(t => t.id !== player.id)"
                      :key="target.id"
                      :value="target.id"
                    >
                      {{ target.name }}
                    </option>
                  </select>
                </div>
              </div>
              <button class="btn-primary" @click="submitVoteResults" style="margin-top:16px; width:100%">
                Soumettre les Votes
              </button>
            </div>

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
              <button class="btn-primary" @click="submitNightActions" style="margin-top:16px; width:100%">
                Confirmer la Nuit
              </button>
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

// Setup phase state - Smart Input
const smartInput = ref('')
const smartInputRef = ref<HTMLInputElement | null>(null)
const inputHint = ref('Entrez un nom, un ID utilisateur, ou un ID salon')
const inputType = ref<'name' | 'user' | 'channel'>('name')
const botAlive = ref(false)
const isProcessing = ref(false)
const isTransitioning = ref(false) // Loading state for phase transitions
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
let isSavingPlayerRoles = false // Prevent overlapping saves

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
})

// Valid transitions map
const VALID_TRANSITIONS: Record<string, string[]> = {
  SETUP: ['CAPTAIN_APPLICATION', 'FIRST_NIGHT', 'END'],
  CAPTAIN_APPLICATION: ['CONFIRMATION', 'CAPTAIN_VOTE', 'CAPTAIN_SPIN', 'END'],
  CAPTAIN_SPIN: ['CAPTAIN_VOTE', 'END'],
  CAPTAIN_VOTE: ['CAPTAIN_APPLICATION', 'FIRST_NIGHT', 'END'],
  FIRST_NIGHT: ['CAPTAIN_VOTE', 'DAY'],
  DAY: ['VOTE', 'NIGHT', 'END'],
  VOTE: ['DAY', 'NIGHT', 'END'],
  NIGHT: ['DAY', 'END'],
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
})

onUnmounted(() => {
  if (botCheckInterval) {
    clearInterval(botCheckInterval)
  }
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
      votes.value = {}
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
      captainVotes.value = {}
      captainElected.value = null
      captainVoteRounds.value = []
      captainVoterFilter.value = null
    }
  } catch (error: any) {
    console.error('Transition failed:', error)
    warning('❌ Erreur de transition: ' + (error?.data?.statusMessage || error?.message || 'Impossible de changer de phase'))
  } finally {
    isTransitioning.value = false
  }
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
        weight: player?.isCaptain ? 2 : 1,
      }
    })

  await gameStore.submitVotes(gameStore.currentGame.dayNumber || 1, voteList)
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
  width: 520px;
  height: 520px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  @media (max-width: 700px) {
    width: 340px;
    height: 340px;
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
  // Rotate-translate-counter-rotate for circle layout
  transform: translate(-50%, -50%) rotate(var(--angle)) translateX(220px) rotate(calc(-1 * var(--angle)));
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: circle-appear 0.5s ease-out backwards;
  animation-delay: var(--delay);

  @media (max-width: 700px) {
    transform: translate(-50%, -50%) rotate(var(--angle)) translateX(140px) rotate(calc(-1 * var(--angle)));
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
  width: 52px;
  height: 52px;
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
    font-size: 1.2rem;
    font-weight: 700;
    color: $violet-200;
  }

  .circle-player-number {
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: $bg-primary;
    border: 1.5px solid $border-subtle;
    font-size: 0.6rem;
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
  font-size: 0.7rem;
  color: $text-secondary;
  font-weight: 600;
  text-align: center;
  max-width: 80px;
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

// Phase transition animations (matching page transitions)
.phase-transition-enter-active,
.phase-transition-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.phase-transition-enter-from {
  opacity: 0;
  transform: translate3d(0, 10px, 0);
  filter: blur(6px);
}

.phase-transition-leave-to {
  opacity: 0;
  transform: translate3d(0, -6px, 0);
  filter: blur(6px);
}
</style>
