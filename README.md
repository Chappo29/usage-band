# usage-band

Мод для Claude Code: над полем ввода — сколько израсходовано контекста и лимитов подписки.

```
✻  21%  КОНТЕКСТ · ИСП.   3%  5 ЧАСОВ · ИСП.        52%  НЕДЕЛЯ · ИСП.
        ▰▰▱▱▱▱▱▱▱▱        ▱▱▱▱▱▱▱▱▱▱             ▰▰▰▰▰▱▱▱▱▱
        42k из 200k       сброс через 2ч 10м     сброс через 3д 4ч
```

- **Контекст** — доля окна модели, занятая разговором, и токены.
- **5 часов / неделя** — лимиты подписки, как на странице использования Claude (округление вверх), с отсчётом до сброса.
- Цифра становится оранжевой от 70% и выворачивается в оранжевую плашку от 90%.
- В десктоп-приложении строка рисуется SVG со своей типографикой; в терминале — символами в цветах темы.

Лимиты обновляются раз в минуту запросом к `api.anthropic.com/api/oauth/usage` с учётными данными сессии (их подставляет сам Claude Code, мод токена не видит), поэтому видна и трата в других окнах и на claude.ai. Без входа через подписку показывается только контекст.

## Установка

В терминале Claude Code:

```
/plugin install usage-band --marketplace Chappo29/usage-band
```

Ответить `y` на добавление маркетплейса и выбрать user scope — мод появится во всех сессиях, включая вкладку Code десктоп-приложения.

Или из клона, без маркетплейса: путь к папке в `env.CLAUDE_CODE_PLUGIN_DIRS` в `~/.claude/settings.json`, либо `claude --plugin-dir <папка>`.

## Разработка

```
claude plugin validate .
claude plugin test .
```

Требуется Claude Code с поддержкой модов (function hooks), проверено на 2.1.293.

---

**English:** a Claude Code mod that shows context-window and subscription-limit usage (5-hour and weekly, with reset countdowns) in a band above the prompt. Limits are polled from `/api/oauth/usage` once a minute using the session's own credential. Install: `/plugin install usage-band --marketplace Chappo29/usage-band`.
