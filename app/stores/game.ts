import { defineStore } from 'pinia'
import type { IGame, GameStatus, IGamePlayer } from '~/types'

export const useGameStore = defineStore('game', {
  state: () => ({
    currentGame: null as IGame | null,
    games: [] as IGame[],
    loading: false,
  }),

  getters: {
    isActive: (state) => state.currentGame && state.currentGame.status !== 'END',
    alivePlayers: (state) => state.currentGame?.players.filter(p => p.isAlive) || [],
    deadPlayers: (state) => state.currentGame?.players.filter(p => !p.isAlive) || [],
    captain: (state) => state.currentGame?.players.find(p => p.isCaptain),
    currentPhase: (state) => state.currentGame?.status || 'SETUP',
    playerCount: (state) => state.currentGame?.players.length || 0,
    aliveCount(): number { return this.alivePlayers.length },
  },

  actions: {
    async fetchGames() {
      this.loading = true
      try {
        const res = await $fetch<any>('/api/games')
        if (res.success) this.games = res.data
      } finally {
        this.loading = false
      }
    },

    async fetchGame(id: string) {
      this.loading = true
      try {
        const res = await $fetch<any>(`/api/games/${id}`)
        if (res.success) this.currentGame = res.data
      } finally {
        this.loading = false
      }
    },

    async createGame() {
      const res = await $fetch<any>('/api/games', { method: 'POST' })
      if (res.success) {
        this.currentGame = res.data
        this.games.unshift(res.data)
      }
      return res
    },

    async transitionPhase(targetPhase: GameStatus) {
      if (!this.currentGame) return
      const res = await $fetch<any>(`/api/games/${this.currentGame._id}/transition`, {
        method: 'POST',
        body: { targetPhase },
      })
      if (res.success) {
        this.currentGame = res.data
        // If transitioning to END, also update the games list
        if (targetPhase === 'END') {
          const gameIndex = this.games.findIndex(g => g._id === res.data._id)
          if (gameIndex !== -1) {
            this.games[gameIndex] = res.data
          }
        }
      }
      return res
    },

    async updatePlayers(players: Partial<IGamePlayer>[]) {
      if (!this.currentGame) return
      const res = await $fetch<any>(`/api/games/${this.currentGame._id}/players`, {
        method: 'PUT',
        body: { players },
      })
      if (res.success) this.currentGame = res.data
      return res
    },

    async performAction(action: string, playerId: string, data?: any) {
      if (!this.currentGame) return
      const res = await $fetch<any>(`/api/games/${this.currentGame._id}/action`, {
        method: 'POST',
        body: { action, playerId, data },
      })
      if (res.success) this.currentGame = res.data
      return res
    },

    async submitVotes(dayNumber: number, votes: { voter: string; target: string; weight: number }[]) {
      if (!this.currentGame) return
      const res = await $fetch<any>(`/api/games/${this.currentGame._id}/vote`, {
        method: 'POST',
        body: { dayNumber, votes },
      })
      if (res.success) this.currentGame = res.data.game
      return res
    },

    async submitNightLog(nightNumber: number, actions: any[]) {
      if (!this.currentGame) return
      const res = await $fetch<any>(`/api/games/${this.currentGame._id}/night-log`, {
        method: 'POST',
        body: { nightNumber, actions },
      })
      if (res.success) this.currentGame = res.data
      return res
    },

    async getStory() {
      if (!this.currentGame) return null
      const res = await $fetch<any>(`/api/games/${this.currentGame._id}/story`)
      return res.data
    },

    // Called by WebSocket updates
    handleWSUpdate(payload: any) {
      if (this.currentGame && payload.gameId === this.currentGame._id) {
        Object.assign(this.currentGame, payload)
      }
    },
  },
})
