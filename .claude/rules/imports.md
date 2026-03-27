---
description: Import style for all TypeScript files in functions/src
---

Always use absolute imports from `src/` — never relative paths with `../`.

Shared conversation types (`Conversation`, `ConversationStatus`, `HistoryEntry`) live in `types/conversation.ts` — import from there, never from service files.

Never use `await import(...)` dynamic imports — static top-level imports only.
