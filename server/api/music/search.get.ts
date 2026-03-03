import { requireAuth } from '~~/server/utils/auth'

interface YTSearchItem {
  id: { videoId?: string }
  snippet: {
    title: string
    channelTitle: string
    thumbnails: {
      medium?: { url: string }
      default?: { url: string }
    }
  }
}

interface YTSearchResponse {
  items: YTSearchItem[]
}

interface YTDetailItem {
  id: string
  contentDetails: { duration: string }
}

interface YTDetailResponse {
  items: YTDetailItem[]
}

interface MusicTrack {
  id: string
  title: string
  channel: string
  thumbnail: string
  duration: string
}

function parseDuration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return '—'
  const h = parseInt(m[1] || '0')
  const min = parseInt(m[2] || '0')
  const sec = parseInt(m[3] || '0')
  const mm = String(min).padStart(h > 0 ? 2 : 1, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export default defineEventHandler(async (event): Promise<{ items: MusicTrack[] }> => {
  requireAuth(event)

  const { q } = getQuery(event) as { q?: string }
  if (!q?.trim()) return { items: [] }

  const config = useRuntimeConfig()
  const apiKey = config.youtubeApiKey as string | undefined
  if (!apiKey) {
    throw createError({ statusCode: 503, statusMessage: 'YouTube API key not configured — set YOUTUBE_API_KEY in .env' })
  }

  // Search videos
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=12&q=${encodeURIComponent(q)}&key=${apiKey}`
  const searchData = await $fetch<YTSearchResponse>(searchUrl).catch((): null => null)
  if (!searchData?.items?.length) return { items: [] }

  // Fetch durations
  const ids = searchData.items.map(i => i.id.videoId).filter(Boolean).join(',')
  const detailUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${apiKey}`
  const detailData = await $fetch<YTDetailResponse>(detailUrl).catch((): YTDetailResponse => ({ items: [] }))

  const durationMap: Record<string, string> = {}
  for (const item of detailData.items ?? []) {
    durationMap[item.id] = parseDuration(item.contentDetails?.duration ?? '')
  }

  return {
    items: searchData.items
      .filter(i => !!i.id?.videoId)
      .map(i => ({
        id: i.id.videoId!,
        title: i.snippet.title,
        channel: i.snippet.channelTitle,
        thumbnail: i.snippet.thumbnails?.medium?.url ?? i.snippet.thumbnails?.default?.url ?? '',
        duration: durationMap[i.id.videoId!] ?? '—',
      })),
  }
})
