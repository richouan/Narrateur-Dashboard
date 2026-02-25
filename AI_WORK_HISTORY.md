# AI Work History (Archive)

Date: 2026-02-25
Status: AI feature paused. Codebase reset to commit `4145fe9715eb12d74b8f554f0b0921f45c56c855`.

## Goal We Were Building

- Replace hardcoded Discord selfbot replies with AI-generated Moroccan Darija (Latin/franco script).
- Keep responses human-like, short, context-aware, and able to trigger bot actions.

## Main Work Implemented (Before Pause)

- Added AI integration module (`discord-bot/ai.js`) with:
  - request handling, retry logic, JSON parsing, and guardrails.
  - conversation memory and prompt-based behavior control.
- Integrated AI path in `discord-bot/selfbot.js`:
  - AI response handling, action execution, and fallback path.
- Added settings support:
  - server API support for `aiEnabled` + API key field.
  - profile page UI for AI toggle + key input.

## Providers/Models Tried

1. Google Gemini direct API
2. Groq (Llama)
3. OpenRouter (multiple free models)
4. OpenAI (`gpt-4o-mini`, then `gpt-4.1-mini`)

## Problems Encountered

- Gemini: repeated quota/rate limits and model availability issues.
- Groq/Llama: poor Darija semantic quality (looked Darija-like but often meaningless).
- OpenRouter: mixed `429/402/400`, provider-specific limitations, model instability.
- Command/chat conflicts:
  - AI sometimes answered chat instead of executing commands.
  - Action-only AI payloads (`response:""` + action) caused fallback bugs.
- Tone issues:
  - occasional robotic or awkward phrases.
  - occasional identity leaks (admitting AI/GPT) without strict guardrails.

## Fixes We Tested

- Multi-retry and backoff strategies.
- Model fallback/rotation.
- Structured JSON-only output format.
- Guardrails for identity/safety/tone and phrase cleanup.
- Direct command detection/bypass in selfbot flow.
- Token optimizations:
  - shorter prompt, reduced `max_tokens`, smaller memory window, command bypass.

## What Worked Best

- OpenAI gave the most consistent conversation quality.
- Direct command bypass + local command handlers gave best reliability.
- Strict style/identity guardrails significantly reduced “cheap AI” behavior.

## Why Paused

- Requested to stop AI feature for now and return project to stable non-AI state.

## Recommended Restart Plan (Later)

1. Reintroduce AI behind feature flag only (`aiEnabled`).
2. Keep direct local command parser first; use AI for chat + ambiguous command intent only.
3. Use one stable provider/model first (OpenAI), then optional fallback.
4. Keep hard guardrails in both prompt and post-processing.
5. Add small conversation tests (sample prompts + expected action/response behavior).

## Notes

- This file is the archive reference for future AI rework.
- Repo currently restored to commit `4145fe9715eb12d74b8f554f0b0921f45c56c855`.
