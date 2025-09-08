# Preview A2HS Fix Pack — v67-offline-sw-edge

Что внутри:
- **index.html** — абсолютные пути + ранний редирект на /s/<id> через cookie.
- **app.js** — path-deeplink, cookie+IDB+SW бэкап, fallback шаринга, локальный загрузчик lottie (local → CDN), HUD, DnD.
- **sw.js** — root-scope, предкеш core, endpoint **/offline-last** (через postMessage SAVE_LAST).
- **manifest.webmanifest** — PWA манифест.
- **style.css** — базовые стили.
- **lib/lottie.min.js** — заглушка; положи сюда реальный lottie-web (или оставь — тогда возьмём CDN).
- **netlify.toml** — SPA rewrite для /s/* и Edge Function для редиректа с корня по cookie.
- **netlify/edge-functions/redirect-root.js** — сам редирект на EDGE уровне.

Как использовать:
1. Скопируй файлы в корень сайта (сохраняя структуру папок).
2. (Опционально) замени **lib/lottie.min.js** реальной сборкой Lottie (лучше — для офлайна).
3. Задеплой на Netlify. Убедись, что Edge Functions включены.
4. Создай шот → проверь, что в буфер копируется **https://<домен>/s/<id>**.
5. На iPhone: открой /s/<id> → «На экран Домой». В офлайне открывай ярлык — должно тянуть снап через /offline-last.

Диагностика:
- Нажми кнопку **HUD** (внизу справа) — увидишь: standalone, path, наличие bg/lot, SW.
- В Safari DevTools проверь, что **/sw.js** зарегистрирован со scope `/`.
