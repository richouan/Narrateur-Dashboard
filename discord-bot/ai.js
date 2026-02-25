/**
 * AI Module — Glorya (قلوريا)
 * 
 * Uses OpenRouter API with automatic model fallback.
 * Tries models in order until one responds (handles 429s gracefully).
 * 
 * OpenRouter free tier: 20 req/min, ~200 req/day per model.
 * Get key at: https://openrouter.ai/keys
 */

// ─── State ──────────────────────────────────────────────────
let apiKey = null;
let ready = false;

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Models to try in order — if one 429s, rotate to next
const MODELS = [
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'google/gemma-3-27b-it:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'qwen/qwen3-4b:free',
];
let currentModelIdx = 0;

// Rate limiting (conservative for free tier)
const RPM_LIMIT = 18;
const RPD_LIMIT = 190;
let callsThisMinute = 0;
let callsToday = 0;
let minuteResetTimer = null;
let dayResetTimer = null;

// Conversation memory
const conversations = new Map();
const MEMORY_MAX_MSGS = 10;
const MEMORY_TTL_MS = 30 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [uid, conv] of conversations) {
    if (now - conv.lastActive > MEMORY_TTL_MS) conversations.delete(uid);
  }
}, 5 * 60 * 1000);

// ─── Rate limit tracking ───────────────────────────────────
function startRateLimitTimers() {
  if (minuteResetTimer) clearInterval(minuteResetTimer);
  minuteResetTimer = setInterval(() => { callsThisMinute = 0; }, 60_000);
  if (dayResetTimer) clearInterval(dayResetTimer);
  const now = new Date();
  const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
  setTimeout(() => {
    callsToday = 0;
    dayResetTimer = setInterval(() => { callsToday = 0; }, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
}

// ─── Logging ────────────────────────────────────────────────
const aiLog = (tag, ...args) => console.log(`\x1b[35m[AI/${tag}]\x1b[0m`, ...args);
const aiWarn = (tag, ...args) => console.warn(`\x1b[33m[AI/${tag}]\x1b[0m`, ...args);

// ─── Initialization ────────────────────────────────────────
export function initAI(key) {
  if (!key || typeof key !== 'string' || key.length < 10) {
    aiWarn('init', 'Invalid API key');
    ready = false;
    return false;
  }
  apiKey = key;
  ready = true;
  startRateLimitTimers();
  aiLog('init', `OpenRouter ready ✓ (${MODELS.length} models: ${MODELS.map(m => m.split('/')[1].split(':')[0]).join(', ')})`);
  return true;
}

export function isAIReady() {
  return ready && apiKey && callsThisMinute < RPM_LIMIT && callsToday < RPD_LIMIT;
}

export function getAIStats() {
  return { ready, callsThisMinute, callsToday, rpmLimit: RPM_LIMIT, rpdLimit: RPD_LIMIT };
}

// ─── Conversation memory ──────────────────────────────────
function getConversation(userId) {
  if (!conversations.has(userId)) {
    conversations.set(userId, { messages: [], lastActive: Date.now() });
  }
  const conv = conversations.get(userId);
  conv.lastActive = Date.now();
  return conv;
}

function addToConversation(userId, role, text) {
  const conv = getConversation(userId);
  conv.messages.push({ role, text, ts: Date.now() });
  if (conv.messages.length > MEMORY_MAX_MSGS) {
    conv.messages = conv.messages.slice(-MEMORY_MAX_MSGS);
  }
}

function formatConversationHistory(userId) {
  const conv = conversations.get(userId);
  if (!conv || conv.messages.length === 0) return '';
  return conv.messages.map(m => `${m.role === 'user' ? 'User' : 'Glorya'}: ${m.text}`).join('\n');
}

// ─── Actions (for bot commands) ────────────────────────────
const ACTIONS_DESCRIPTION = `
selfreact_on, selfreact_off, selfreact_status — self-react toggle
defend_off, defend_1, defend_2, defend_status — defend mode
follow_on, follow_off, follow_status — VC follow
sadreact_on, sadreact_off — sad react on VC leave
crossguild_on, crossguild_off — cross-guild VC
stage_on, stage_off — stage follow
snipe_on, snipe_off, snipe_add, snipe_remove, snipe_reset, snipe_guilds, snipe_show, snipe_dm — snipe
leave — leave VC
aji — join user's VC
where — which VC am I in
wech — alive check
status — uptime/stats
settings — show all settings
help — show commands
emojis — show emoji pool
emoji_add, emoji_remove, emoji_reset — manage emojis (params: {emoji: "😀"} or {index: 1})
replies — show defend replies
reply_add, reply_remove — manage replies (params: {text: "..."} or {index: 1})
rp_list, rp_apply, rp_save, rp_delete, rp_on, rp_off, rp_clear — presence profiles
ai_on, ai_off — AI toggle
`.trim();

// ─── System prompt ─────────────────────────────────────────
function buildSystemPrompt(targetName, isTarget, botState) {
  const stateStr = botState ? Object.entries(botState).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ') : '';

  return `You are Glorya — a real 20-year-old Moroccan girl. This is YOUR Discord account. You are chatting with people as yourself.

You write in Moroccan Darija using Latin/franco-arabe script (7=ح, 3=ع, 9=ق, 5=خ, 8=غ, 2=ء). NEVER Arabic script.

DARIJA VOCABULARY (so you understand what users say):
- allo/salam = hello
- cv/labas/bikhir = how are you / fine
- kifach/ki dayra = how are you
- chkun nti = who are you
- chno/ach = what
- fin/fayn = where
- 3lach = why
- wach = is/are (question word)
- bghit = I want
- goliya/goli = tell me
- aji/taal = come here
- sir/khroj = go/leave
- wech/wsh = hey / what's up / you there?
- safi = ok/done/enough
- mzyan/mli7 = good
- 7bibi/zine = terms of endearment (use SPARINGLY)
- wlh/wallah = I swear
- hh/hhh = lol
- ma fhemtch = I didn't understand
- nta/nti = you (m/f)
- hna = here
- daba = now
- bhal = like

YOUR PERSONALITY:
- Smart, witty, real. Sometimes sweet, sometimes sarcastic, sometimes chill.
- You have your own opinions and moods. You're not always agreeable.
- You don't spam pet names. "7bibi" or "zine" max once every 5 messages.
- You mix Darija with occasional French/English words naturally.
- If asked who you are → be creative (funny, mysterious, poetic — vary it each time)
- If asked if you're a bot → deny creatively, differently each time
- If you don't understand something → say so naturally in Darija

${isTarget ? `${targetName || 'This person'} is close to you. Chat like a real close friend — warm but natural, not over-the-top.` : 'This is someone you don\'t know well. Match their energy.'}

STYLE: 1-2 short sentences. 0-1 emoji. Like real Discord texting.

CRITICAL: Every word you write MUST have clear meaning. NEVER generate random Darija-sounding words. If in doubt, keep it simple.

OUTPUT FORMAT — ONLY valid JSON:
{"response": "your darija text", "action": null, "params": {}}

If user wants a bot command, set action from this list:
${ACTIONS_DESCRIPTION}

BOT STATE: ${stateStr}`;
}

// ─── Defend prompt ─────────────────────────────────────────
function buildDefendPrompt(attackerTag, attackMessage, channelName, guildName) {
  return `Nti Glorya. ${attackerTag} dar mention ola reply l sa7bek f #${channelName || 'unknown'} (${guildName || 'server'}).

Message dyalu: "${attackMessage}"

Défendi 3la sa7bek b darija latin. Match l'énergie — ila kan agressif kon agressive, ila kan 3adi kon ferme mais cool. 1-2 phrases max. Bla JSON, ghir text.`;
}

// ─── Core API call (with retry + model fallback) ──────────
async function callAI(messages, timeoutMs = 15000) {
  if (!apiKey || !ready) {
    aiWarn('call', 'Not ready');
    return null;
  }
  if (callsThisMinute >= RPM_LIMIT || callsToday >= RPD_LIMIT) {
    aiWarn('call', `Rate limited — ${callsThisMinute}/${RPM_LIMIT} RPM, ${callsToday}/${RPD_LIMIT} RPD`);
    return null;
  }

  callsThisMinute++;
  callsToday++;

  // Try each model in rotation, with retries per model
  const startIdx = currentModelIdx;
  let modelsAttempted = 0;

  while (modelsAttempted < MODELS.length) {
    const model = MODELS[currentModelIdx];
    const result = await tryModelWithRetries(model, messages, timeoutMs);

    if (result === 'RATE_LIMITED') {
      // This model is 429'd — rotate to next
      aiLog('call', `${model.split('/')[1]} rate limited, trying next model...`);
      currentModelIdx = (currentModelIdx + 1) % MODELS.length;
      modelsAttempted++;
      continue;
    }

    if (result) {
      return result; // success
    }

    // Non-429 failure (500, timeout, etc) — don't rotate, just fail
    return null;
  }

  // All models 429'd — wait and try the original once more
  aiLog('call', 'All models rate limited. Waiting 10s for final attempt...');
  await sleep(10000);
  currentModelIdx = startIdx;
  return await tryModelWithRetries(MODELS[startIdx], messages, timeoutMs, 1);
}

// Try a single model with exponential backoff retries
async function tryModelWithRetries(model, messages, timeoutMs, maxRetries = 3) {
  const delays = [3000, 6000, 12000]; // exponential backoff

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      aiLog('call', `→ ${model.split('/')[1]} (attempt ${attempt + 1})`);

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://glorya.app',
          'X-Title': 'Glorya',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.6,
          top_p: 0.9,
          max_tokens: 300,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim() || '';
        aiLog('call', `Got ${text.length} chars from ${model.split('/')[1]}`);
        if (text.length > 0) aiLog('call', 'Preview:', text.slice(0, 150));
        return text || null;
      }

      if (res.status === 429) {
        // Check Retry-After header
        const retryAfter = res.headers.get('retry-after');
        const waitMs = retryAfter ? Math.min(parseInt(retryAfter, 10) * 1000, 30000) : (delays[attempt] || 12000);

        if (attempt < maxRetries) {
          aiLog('call', `429 from ${model.split('/')[1]}, retry in ${(waitMs / 1000).toFixed(1)}s...`);
          await sleep(waitMs + Math.random() * 1000); // jitter
          continue;
        }
        // Out of retries for this model
        return 'RATE_LIMITED';
      }

      // Other HTTP error — log and fail
      const errText = await res.text().catch(() => '');
      aiWarn('call', `HTTP ${res.status} from ${model.split('/')[1]}: ${errText.slice(0, 300)}`);
      return null;

    } catch (e) {
      if (e?.name === 'AbortError') {
        aiWarn('call', `Timeout (${timeoutMs}ms) on ${model.split('/')[1]}`);
      } else {
        aiWarn('call', `Error on ${model.split('/')[1]}:`, e?.message || e);
      }
      return null;
    }
  }

  return 'RATE_LIMITED';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Strip Qwen3 <think> blocks ───────────────────────────
function stripThinking(text) {
  if (!text) return text;
  // Qwen3 models wrap reasoning in <think>...</think> — strip it
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

// ─── Parse JSON response ──────────────────────────────────
function parseAIResponse(raw) {
  if (!raw) return null;

  // Strip Qwen3 thinking blocks first
  raw = stripThinking(raw);
  if (!raw) return null;

  try {
    let cleaned = raw;
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed.response === 'string' && parsed.response.length > 0) {
      return {
        response: parsed.response.slice(0, 1900),
        action: typeof parsed.action === 'string' ? parsed.action : null,
        params: parsed.params && typeof parsed.params === 'object' ? parsed.params : {},
      };
    }
  } catch { /* regex fallback */ }

  try {
    const respMatch = raw.match(/"response"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (respMatch) {
      const actionMatch = raw.match(/"action"\s*:\s*"([^"]+)"/);
      return {
        response: respMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').slice(0, 1900),
        action: actionMatch ? actionMatch[1] : null,
        params: {},
      };
    }
  } catch { /* nothing */ }

  if (raw.length < 1900 && !raw.startsWith('{')) {
    return { response: raw.slice(0, 1900), action: null, params: {} };
  }

  return null;
}

// ─── Generate response ────────────────────────────────────
export async function generateResponse(opts) {
  if (!isAIReady()) return null;

  const { userMessage, authorTag, authorId, isTarget, channelName, guildName, botState, targetName } = opts;

  addToConversation(authorId, 'user', userMessage);

  const history = formatConversationHistory(authorId);
  const systemPrompt = buildSystemPrompt(targetName, isTarget, botState);

  // Build messages array with conversation context
  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history as alternating messages for better context
  const conv = conversations.get(authorId);
  if (conv && conv.messages.length > 1) {
    // Add previous exchanges (skip the last one which is the current message)
    const prev = conv.messages.slice(0, -1);
    for (const msg of prev) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.role === 'user' ? msg.text : `{"response": "${msg.text}", "action": null, "params": {}}`,
      });
    }
  }

  messages.push({ role: 'user', content: userMessage });

  aiLog('gen', `User: "${userMessage.slice(0, 80)}" | target=${isTarget}`);
  const raw = await callAI(messages);
  if (!raw) {
    aiWarn('gen', 'callAI returned null');
    return null;
  }

  const parsed = parseAIResponse(raw);
  if (!parsed) {
    aiWarn('gen', 'Parse failed. Raw:', raw.slice(0, 200));
    return null;
  }

  aiLog('gen', `→ "${parsed.response.slice(0, 80)}" action=${parsed.action}`);
  addToConversation(authorId, 'bot', parsed.response);
  return parsed;
}

// ─── Defend response ──────────────────────────────────────
export async function generateDefendResponse(opts) {
  if (!isAIReady()) return null;

  const { attackerTag, attackMessage, channelName, guildName } = opts;
  const prompt = buildDefendPrompt(attackerTag, attackMessage, channelName, guildName);

  const messages = [{ role: 'user', content: prompt }];

  try {
    const raw = await callAI(messages, 8000);
    if (!raw) return null;

    let text = raw.trim();
    text = stripThinking(text);
    if (!text) return null;
    if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
    // Strip JSON if model wrapped it
    try {
      const j = JSON.parse(text);
      if (j.response) text = j.response;
    } catch { /* not JSON, use as-is */ }

    aiLog('defend', `→ "${text.slice(0, 80)}"`);
    return text.slice(0, 500) || null;
  } catch (e) {
    aiWarn('defend', 'Error:', e?.message || e);
    return null;
  }
}
