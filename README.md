# usage-band

A Claude Code mod that shows, right above the prompt, how much of the context window and of your subscription limits you have used.

<img width="796" height="66" alt="usage-band above the prompt: context 23% used, 5 hours 6%, week 52%" src="assets/usage-band.png" />

- **Context**: the share of the model's window the conversation takes, with token counts.
- **5 hours / week**: subscription limits as Claude's usage page shows them (rounded up), with a countdown to the reset.
- A figure turns orange at 70% and flips to an orange pill at 90%.
- In the desktop app the band is an SVG with its own typography; in the terminal it is drawn in cells, in your theme's colors.

Limits are refreshed once a minute from `api.anthropic.com/api/oauth/usage` with the session's own credential (Claude Code attaches it; the mod never sees the token), so usage from other windows and claude.ai shows up too. Without a subscription login only the context is shown.

## Install

In a Claude Code terminal:

```
/plugin install usage-band --marketplace Chappo29/usage-band
```

Answer `y` to add the marketplace and pick the user scope: the mod then loads in every session, including the desktop app's Code tab.

Or from a clone, without a marketplace: put the folder's path in `env.CLAUDE_CODE_PLUGIN_DIRS` in `~/.claude/settings.json`, or run `claude --plugin-dir <folder>`.

## Language

English by default, Russian available. Switch it in the config menu (`usage-band` → Language), or in `~/.claude/settings.json`:

```json
{
  "pluginConfigs": {
    "usage-band@usage-band": { "options": { "language": "ru" } }
  }
}
```

The key is the plugin's id: `usage-band@usage-band` when installed from this marketplace, `usage-band@inline` when loaded from a folder.

## Development

```
claude plugin validate .
claude plugin test .
```

Needs a Claude Code build with mods (function hooks); tested on 2.1.293.

---

## По-русски

Мод для Claude Code: над полем ввода — сколько израсходовано контекста и лимитов подписки (5 часов и неделя) с отсчётом до сброса. Лимиты обновляются раз в минуту с учётными данными сессии, поэтому видна и трата в других окнах и на claude.ai.

Установка: `/plugin install usage-band --marketplace Chappo29/usage-band` в терминале Claude Code. Русский язык включается в меню настроек (`usage-band` → Language → `ru`) или через `pluginConfigs` в `~/.claude/settings.json`, как показано выше.
