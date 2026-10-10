---
title: Dockerfile без сюрпризов
author: devops-campus
topic: docker
date: 2026-09-30
kind: notes
tags: [docker, dockerfile, чек-лист]
---

Короткий чек-лист, который стоит пройти перед тем, как отправлять Dockerfile на ревью.

## Чек-лист

1. **Фиксируйте версию базового образа.** `python:3.12-slim` вместо `python:latest`:
   сборка через месяц не должна внезапно получить другую версию.
2. **Сначала зависимости, потом код.** Слои кешируются сверху вниз, поэтому файл
   с зависимостями копируйте раньше исходников.
3. **Не храните секреты в образе.** Всё, что попало в слой, достаётся из образа,
   даже если позже вы удалили файл.
4. **Запускайтесь не от root.** Создайте пользователя и переключитесь на него через `USER`.
5. **Добавьте `.dockerignore`.** Каталоги `.git`, `node_modules` и локальные `.env`
   не должны попадать в контекст сборки.

## Пример

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN useradd --create-home app
USER app

EXPOSE 8000
CMD ["python", "-m", "http.server", "8000"]
```

## Как проверить себя

```bash
docker build -t checklist-demo .
docker run --rm checklist-demo whoami   # должно вывести app, а не root
docker history checklist-demo           # какие слои и сколько они весят
```
