# Lexi VK - Cloudflare Workers

Проект на базе Cloudflare Workers с использованием Wrangler.

## Установка

```bash
npm install
```

## Разработка

Запуск локального сервера:
```bash
npm run dev
```

## Развёртывание

Развернуть на Cloudflare Workers:
```bash
npm run deploy
```

## Конфигурация

Отредактируйте `wrangler.toml`:
- Добавьте `account_id` из своего аккаунта Cloudflare
- Укажите имя workers скрипта

## Переменные окружения

Для работы webhook и отправки сообщений в VK должны быть настроены секреты Worker:

- `VK_TOKEN` - токен доступа сообщества для вызовов VK API
- `VK_CALLBACK_SECRET` - секрет из настроек Callback API VK
	- Дополнительно поддерживается fallback `VK_SECRET` для обратной совместимости

Проверка callback-секрета применяется ко всем входящим событиям, кроме `confirmation`.
При несовпадении секрета Worker возвращает `403 Forbidden`.

## Документация

- [Wrangler Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
