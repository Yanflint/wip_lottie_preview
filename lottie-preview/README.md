# Lottie Preview (split-source)

Репозиторий хранит исходники по областям логики в `src/app/`.
На деплое Netlify выполняет `npm run build`, который собирает `app.js` из кусочков.

## Локально
```bash
npm install
npm run prepare    # собирает app.js из src/app/*
netlify dev        # локальный сервер
```

## Деплой (Netlify)
- В `netlify.toml` задано:
  - `build.command = "npm run build"` -> вызывает сборку `app.js`
  - `build.publish = "."`
  - `functions = "netlify/functions"`

## Git
- В `.gitignore` исключён собранный файл `app.js` — в репозитории остаются только исходники.
