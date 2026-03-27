---
description: All user-facing copy and translations rules
---

All user-facing strings live in `config/translations.json`. Use `t("key")` or `t("key", { var: value })` — never hardcode copy in service files.

Add the translation key to `translations.json` before using `t("key")` in code — missing keys throw at runtime.

Never say "video creation" in copy — use "content".
