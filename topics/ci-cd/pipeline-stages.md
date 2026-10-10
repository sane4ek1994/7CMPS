---
title: Из чего состоит пайплайн
author: devops-campus
topic: ci-cd
date: 2026-10-02
kind: notes
tags: [ci-cd, github-actions, пайплайн]
---

Почти любой пайплайн собирается из одних и тех же этапов. Названия у инструментов разные,
а идея одна: каждый этап быстро отвечает на свой вопрос, и следующий запускается,
только если ответ был «да».

## Этапы

| Этап | Вопрос, на который отвечает | Пример |
| --- | --- | --- |
| lint | код оформлен по правилам? | `eslint`, `markdownlint`, `hadolint` |
| test | код делает то, что должен? | unit-тесты |
| build | код собирается в артефакт? | `npm run build`, `docker build` |
| deploy | артефакт работает в окружении? | выкатка на staging, затем на production |

## Минимальный workflow для GitHub Actions

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```

Этот репозиторий проверяет себя похожим образом: посмотрите папку `.github/workflows`.

## Правила хорошего пайплайна

- Падает быстро: дешёвые проверки идут первыми.
- Воспроизводим: одинаковый коммит даёт одинаковый результат.
- Сообщает понятно: по логу сразу видно, какой шаг упал и почему.
