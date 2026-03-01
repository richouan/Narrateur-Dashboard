import { connectDB } from '~~/server/utils/db'
import { requireAuth } from '~~/server/utils/auth'
import { getGameForNarrator } from '~~/server/utils/game'
import { broadcastGameUpdate } from '~~/server/utils/websocket'
import { retryOnVersionConflict } from '~~/server/utils/retry'

// Read geminiApiKey from bot_config MongoDB collection (same one selfbot uses)
async function getAiApiKey(): Promise<string | null> {
    try {
        const mongoose = await import('mongoose')
        const db = mongoose.default.connection.db
        if (!db) return null
        const doc = await db.collection('bot_config').findOne({ _id: 'settings' as any })
        return (doc as any)?.geminiApiKey || null
    } catch {
        return null
    }
}

export default defineEventHandler(async (event) => {
    const { userId } = requireAuth(event)
    const id = getRouterParam(event, 'id')

    // Ensure DB is connected
    await connectDB()

    const game = await getGameForNarrator(event, id!, userId)

    const players = game.players as Array<{ id: string; name: string;[key: string]: any }>
    if (!players || players.length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'No players in game' })
    }

    // Get the AI API key
    const apiKey = await getAiApiKey()
    if (!apiKey) {
        throw createError({
            statusCode: 503,
            statusMessage: 'AI key not configured — enable AI in bot settings first',
        })
    }

    const isGroq = apiKey.startsWith('gsk_')
    const isOR = apiKey.startsWith('sk-or-')
    const isGrok = apiKey.startsWith('xai-')

    let endpoint = 'https://api.openai.com/v1/chat/completions'
    let model = 'gpt-4o-mini'
    if (isGroq) {
        endpoint = 'https://api.groq.com/openai/v1/chat/completions'
        model = 'llama-3.3-70b-versatile'
    } else if (isOR) {
        endpoint = 'https://openrouter.ai/api/v1/chat/completions'
        model = 'google/gemini-2.5-flash'
    } else if (isGrok) {
        endpoint = 'https://api.xai.com/v1/chat/completions'
        model = 'grok-2-latest'
    }

    // Build the input for the AI — only id + name
    const input = players.map((p) => ({ id: p.id, name: p.name }))

    const systemPrompt = `You are a name normalizer for a Discord gaming session.
Your ONLY job is to clean player display names.

Rules:
- Remove all emojis, decorative symbols, special characters, unicode fonts (𝐒𝐂𝐀𝐑𝐅𝐀𝐂𝐄 → Scarface)
- Remove Tifinagh (ⵣ), extended unicode decorators, zalgo text
- Keep Arabic names fully in Arabic script (e.g. سلامون stays سلامون)
- Keep Latin names: first letter uppercase, rest lowercase (e.g. SCARFACE → Scarface)
- If after cleaning the name is empty, use "Player"
- DO NOT add any explanation. Reply ONLY with a valid JSON array in this exact format:
[{"id":"...","cleanName":"..."}]`

    const body = {
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(input) },
        ],
        temperature: 0.1,
        max_tokens: 2000,
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    let aiResult: Array<{ id: string; cleanName: string }>
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!res.ok) {
            const errText = await res.text().catch(() => res.statusText)
            throw createError({ statusCode: 502, statusMessage: `AI API error: ${res.status} — ${errText}` })
        }

        const data = await res.json() as any
        const raw = data.choices?.[0]?.message?.content?.trim() || '[]'

        // Strip markdown code blocks if the AI wrapped it
        const cleaned = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()
        aiResult = JSON.parse(cleaned)

        if (!Array.isArray(aiResult)) throw new Error('AI returned non-array')
    } catch (err: any) {
        clearTimeout(timeout)
        if (err.statusCode) throw err
        throw createError({ statusCode: 502, statusMessage: `AI parsing failed: ${err.message}` })
    }

    // Build a lookup map id → cleanName
    const nameMap = new Map(aiResult.map((r) => [r.id, r.cleanName]))

    // Apply normalized names and save
    return await retryOnVersionConflict(async () => {
        const freshGame = await getGameForNarrator(event, id!, userId)

        freshGame.players = (freshGame.players as any[]).map((p: any) => ({
            ...p.toObject ? p.toObject() : p,
            name: nameMap.get(p.id) || p.name,
        }))

        freshGame.logs.push({
            timestamp: new Date(),
            phase: freshGame.status,
            message: `Player names normalized by AI (${players.length} names cleaned)`,
            type: 'system',
        })

        await freshGame.save()
        broadcastGameUpdate(freshGame)

        return { success: true, data: freshGame }
    })
})
