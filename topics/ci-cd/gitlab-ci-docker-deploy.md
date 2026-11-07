---
title: "GitLab CI: от проверки кода до выкладки на тестовую VM"
author: sane4ek1994
topic: ci-cd
date: 2026-11-07
kind: docs
tags: [ci-cd, gitlab-ci, docker, trivy, деплой, bash]
---

Разбор настоящего пайплайна для небольшого Python-приложения: проверка синтаксиса и тесты,
сканирование Dockerfile и образа, сборка в Docker-in-Docker и ручная выкладка на тестовую
виртуальную машину скриптом с проверкой здоровья и автоматическим откатом.

## Что за проект

Root Casino — учебное веб-приложение на Python (`app.py`, `game.py`), которое хранит данные
в SQLite. Пайплайн собирает из него Docker-образ, кладёт в GitLab Container Registry
и по кнопке выкатывает на тестовую VM.

Весь путь коммита выглядит так:

```text
validate ─► test ─► security ─► build ─► scan
                                  │
                                  └─► deploy (вручную, только main)
```

| Стадия | Задачи | Что проверяет или делает | Ломает пайплайн? |
| --- | --- | --- | --- |
| `validate` | `python_syntax` | код хотя бы компилируется | да |
| `test` | `unit_tests`, `secret_detection` | тесты проходят, в коде нет токенов и паролей | да |
| `security` | `dockerfile_check` | в Dockerfile нет опасных настроек | да |
| `build` | `build_image` | образ собирается и попадает в registry | да |
| `scan` | `image_scan` | в образе нет известных уязвимостей | нет, только предупреждает |
| `deploy` | `deploy_test`, `rollback_test` | выкладка и откат на тестовой VM | запускаются вручную |

## Файл `.gitlab-ci.yml`

```yaml
stages:
  - validate
  - test
  - security
  - build
  - scan
  - deploy

include:
  - template: Jobs/Secret-Detection.gitlab-ci.yml

default:
  interruptible: true
  tags:
    - casino-docker

python_syntax:
  stage: validate
  image: python:3.12-slim-bookworm
  script:
    - python -m py_compile app.py game.py

unit_tests:
  stage: test
  image: python:3.12-slim-bookworm
  before_script:
    - pip install --no-cache-dir -r requirements.txt
  script:
    - python -m unittest discover -s tests -v

dockerfile_check:
  stage: security
  image:
    name: aquasec/trivy:0.74.0
    entrypoint: [""]
  script:
    - trivy --quiet config --exit-code 1 --severity HIGH,CRITICAL Dockerfile

build_image:
  stage: build
  image: docker:29.8.0-cli
  services:
    - name: docker:29.8.0-dind
  variables:
    DOCKER_HOST: tcp://docker:2376
    DOCKER_TLS_CERTDIR: /certs
    DOCKER_TLS_VERIFY: "1"
    DOCKER_CERT_PATH: /certs/client
  before_script:
    - echo "$CI_REGISTRY_PASSWORD" | docker login "$CI_REGISTRY" -u "$CI_REGISTRY_USER" --password-stdin
  script:
    - export IMAGE_REF="$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA"
    - docker buildx build --pull --platform linux/amd64 --provenance=false --sbom=false -t "$IMAGE_REF" --push .
    - echo "IMAGE_REF=$IMAGE_REF" > build.env
  artifacts:
    reports:
      dotenv: build.env
    expire_in: 1 day

image_scan:
  stage: scan
  image:
    name: aquasec/trivy:0.74.0
    entrypoint: [""]
  needs:
    - job: build_image
      artifacts: true
  variables:
    TRIVY_USERNAME: $CI_REGISTRY_USER
    TRIVY_PASSWORD: $CI_REGISTRY_PASSWORD
  script:
    - trivy --quiet image --image-src remote --exit-code 1 --ignore-unfixed --severity HIGH,CRITICAL "$IMAGE_REF"
  allow_failure: true

deploy_test:
  stage: deploy
  tags:
    - casino-deploy
  needs:
    - job: build_image
      artifacts: true
  resource_group: casino-test
  environment:
    name: test
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
  script:
    - echo "$CI_REGISTRY_PASSWORD" | docker login "$CI_REGISTRY" -u "$CI_REGISTRY_USER" --password-stdin
    - bash deploy/deploy-test.sh "$IMAGE_REF"

rollback_test:
  stage: deploy
  tags:
    - casino-deploy
  resource_group: casino-test
  environment:
    name: test
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
      allow_failure: true
  script:
    - bash deploy/rollback-test.sh
```

## Разбор пайплайна

### Общие настройки

- **`stages`** задаёт порядок. Задачи одной стадии идут параллельно, следующая стадия
  стартует, только когда предыдущая прошла. Исключение — задачи с `needs`, о них ниже.
- **`include: template: Jobs/Secret-Detection.gitlab-ci.yml`** подключает готовую задачу
  GitLab `secret_detection`. Она встаёт в стадию `test` и ищет в репозитории случайно
  закоммиченные токены, ключи и пароли.
- **`default.interruptible: true`**: если в ветку пришёл новый коммит, старый пайплайн можно
  отменить и не тратить на него раннеры. Работает вместе с настройкой проекта
  *Auto-cancel redundant pipelines*.
- **`default.tags: [casino-docker]`**: все задачи по умолчанию идут на раннер с тегом
  `casino-docker`, то есть на раннер с Docker executor.

### `python_syntax` и `unit_tests`

`python -m py_compile` за секунду ловит синтаксические ошибки, не устанавливая зависимости.
Это самая дешёвая проверка, поэтому она первая: незачем ставить пакеты и гонять тесты,
если файл даже не компилируется.

`unit_tests` ставит зависимости из `requirements.txt` и запускает встроенный `unittest`:
`discover -s tests` находит все файлы `test*.py` в папке `tests`. Флаг `--no-cache-dir`
не оставляет кэш pip внутри одноразового контейнера.

Оба образа закреплены по версии (`python:3.12-slim-bookworm`), а не `python:latest`:
пайплайн не сломается сам по себе, когда выйдет новый Python.

### `dockerfile_check`

`trivy config` читает Dockerfile как конфигурацию и ищет опасные настройки: запуск от root,
отсутствие `USER`, `ADD` вместо `COPY` и так далее. `--exit-code 1` с
`--severity HIGH,CRITICAL` значит «упасть, только если нашлось что-то серьёзное».

`entrypoint: [""]` нужен потому, что у образа `aquasec/trivy` точка входа — сама программа
`trivy`. GitLab запускает в контейнере shell со скриптом задачи, и с такой точкой входа
команды превратились бы в аргументы `trivy`. Пустой `entrypoint` её отключает.

### `build_image`

Сборка идёт через **Docker-in-Docker**: сервис `docker:dind` поднимает отдельный Docker-демон,
а задача в образе `docker:cli` обращается к нему по сети.

- `DOCKER_HOST: tcp://docker:2376` — адрес демона: сервис доступен по имени `docker`,
  порт 2376 — Docker API с TLS.
- `DOCKER_TLS_CERTDIR: /certs` — демон сам создаёт сертификаты, клиентская часть лежит
  в `/certs/client`. Для этого раннер должен быть `privileged` и монтировать `/certs/client`.
- `docker login ... --password-stdin` передаёт пароль через stdin, а не аргументом:
  так он не попадает в список процессов и историю команд.
- `CI_REGISTRY_USER`, `CI_REGISTRY_PASSWORD`, `CI_REGISTRY_IMAGE` — встроенные переменные
  GitLab. Пароль — временный токен задачи, он перестаёт работать после её завершения.
  В самом файле нет ни одного секрета.

Разберём команду сборки:

| Флаг | Зачем |
| --- | --- |
| `-t "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA"` | тег — SHA коммита: по образу всегда видно, из какого кода он собран |
| `--pull` | всегда скачивать свежий базовый образ, чтобы подтянуть исправления безопасности |
| `--platform linux/amd64` | собрать под архитектуру тестовой VM |
| `--provenance=false --sbom=false` | не прикладывать аттестации: в registry окажется обычный образ, а не индекс из нескольких манифестов |
| `--push` | сразу отправить образ в registry |

Последняя строка пишет `IMAGE_REF=...` в `build.env`. Это **dotenv-артефакт**: GitLab
превратит его в переменную окружения для задач, которые зависят от `build_image` через
`needs` с `artifacts: true`. Так следующие задачи получают точное имя образа и не собирают
его заново.

### `image_scan`

`trivy image --image-src remote` скачивает образ прямо из registry (логин берёт из
`TRIVY_USERNAME` и `TRIVY_PASSWORD`) и сверяет пакеты внутри с базой известных уязвимостей.
`--ignore-unfixed` пропускает уязвимости, для которых ещё нет исправления: на них всё равно
нельзя повлиять обновлением.

`allow_failure: true` делает проверку предупреждением: задача станет оранжевой, но пайплайн
не остановится. Новые уязвимости в базовых образах находят постоянно, и без этого флага
пайплайн мог бы покраснеть без единого изменения в коде.

`needs: [build_image]` запускает сканирование сразу после сборки, не дожидаясь конца
стадии `build`.

### `deploy_test`

- **`tags: [casino-deploy]`** переопределяет тег по умолчанию: задача идёт на другой раннер,
  установленный на самой тестовой VM. Он выполняет команды прямо там, где работает
  приложение.
- **`rules`** — задача появляется только в пайплайнах ветки по умолчанию (`main`),
  и только как кнопка (`when: manual`). В пайплайнах других веток её нет совсем.
- **`needs: [build_image]`** — кнопка становится доступна сразу после сборки. Задача
  получает `IMAGE_REF` из dotenv-артефакта. Обратите внимание: результата `image_scan`
  деплой не ждёт.
- **`resource_group: casino-test`** — в одну группу ресурсов одновременно выполняется только
  одна задача. Две выкладки или выкладка с откатом не пойдут на сервер параллельно.
- **`environment: test`** — GitLab ведёт историю выкладок на странице
  *Operate → Environments*: что, когда и кем выкатывалось.

У `when: manual` внутри `rules` по умолчанию `allow_failure: false`, поэтому пайплайн
`main` будет в статусе *blocked*, пока кнопку не нажмут. Это заметное напоминание, что
сборка готова, но ещё не выложена.

### `rollback_test`

Тоже ручная кнопка на той же VM и в той же группе ресурсов. `allow_failure: true` делает её
необязательной: пайплайн не ждёт отката. `needs` у задачи нет, поэтому кнопка появится,
когда закончатся все предыдущие стадии. Логин в registry не нужен: откат работает
с контейнером, который уже есть на сервере (см. ниже).

## Скрипт выкладки `deploy/deploy-test.sh`

```bash
#!/usr/bin/env bash
# Выкладка Root Casino на тестовую VM.
# Запуск: bash deploy/deploy-test.sh <образ с тегом SHA>
# Порядок: проверить кандидата на запасном порту -> сохранить текущую версию как previous
# -> запустить новую на основном порту -> если /health не ответил, вернуть previous.
set -euo pipefail

IMAGE_REF="${1:-}"
NAME="root-casino"
PREV="root-casino-previous"
CANDIDATE="root-casino-candidate"
VOLUME="root-casino-data"
PORT=18888
CANDIDATE_PORT=18889

if [ -z "$IMAGE_REF" ]; then
  echo "Не передан образ. Пример: bash deploy/deploy-test.sh registry.gitlab.com/group/project:<sha>"
  exit 2
fi

TAG="${IMAGE_REF##*:}"
if [ "$TAG" = "latest" ] || [ "$TAG" = "$IMAGE_REF" ]; then
  echo "Отказ: нужен образ с тегом SHA коммита, latest и образ без тега не выкладываем."
  exit 2
fi

# Одинаковые ограничения для кандидата и для рабочей версии.
LIMITS=(--memory 256m --memory-swap 256m --cpus 0.5 --pids-limit 64
        --cap-drop ALL --security-opt no-new-privileges
        --read-only --tmpfs /tmp:rw,noexec,nosuid,size=32m
        --log-opt max-size=5m --log-opt max-file=2)

wait_health() {
  # $1 контейнер, $2 порт, $3 ожидаемая версия. Ждём до 30 секунд.
  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:$2/health" 2>/dev/null | grep -q "\"version\":\"$3\""; then
      return 0
    fi
    if [ "$(docker inspect --format '{{.State.Running}}' "$1")" != "true" ]; then
      echo "Контейнер $1 остановился"
      return 1
    fi
    sleep 1
  done
  return 1
}

echo "==> Скачиваю $IMAGE_REF"
docker pull --quiet "$IMAGE_REF"

echo "==> Готовлю том $VOLUME для базы SQLite"
docker volume create "$VOLUME" >/dev/null
docker run --rm --user 0 --entrypoint chown -v "$VOLUME:/data" "$IMAGE_REF" 10001:10001 /data

echo "==> Проверяю кандидата на 127.0.0.1:$CANDIDATE_PORT"
docker rm -f "$CANDIDATE" >/dev/null 2>&1 || true
docker run -d --name "$CANDIDATE" "${LIMITS[@]}" \
  --tmpfs /data:rw,size=16m,uid=10001,gid=10001 \
  -e APP_VERSION="$TAG" -p "127.0.0.1:$CANDIDATE_PORT:8000" "$IMAGE_REF" >/dev/null
if ! wait_health "$CANDIDATE" "$CANDIDATE_PORT" "$TAG"; then
  echo "Кандидат не ответил на /health. Текущая версия не тронута. Последние строки лога:"
  docker logs --tail 20 "$CANDIDATE" || true
  docker rm -f "$CANDIDATE" >/dev/null
  exit 1
fi
docker rm -f "$CANDIDATE" >/dev/null
echo "Кандидат здоров"

if docker container inspect "$NAME" >/dev/null 2>&1; then
  echo "==> Сохраняю текущую версию как $PREV"
  docker rm -f "$PREV" >/dev/null 2>&1 || true
  docker stop "$NAME" >/dev/null
  docker rename "$NAME" "$PREV"
fi

echo "==> Запускаю $NAME на 127.0.0.1:$PORT"
docker run -d --name "$NAME" --restart unless-stopped "${LIMITS[@]}" \
  -v "$VOLUME:/data" -e APP_VERSION="$TAG" \
  --label "casino.image=$IMAGE_REF" \
  -p "127.0.0.1:$PORT:8000" "$IMAGE_REF" >/dev/null

if wait_health "$NAME" "$PORT" "$TAG"; then
  echo "Deployed $TAG"
  exit 0
fi

echo "Новая версия не ответила на /health, возвращаю предыдущую"
docker logs --tail 20 "$NAME" || true
docker rm -f "$NAME" >/dev/null
if docker container inspect "$PREV" >/dev/null 2>&1; then
  docker rename "$PREV" "$NAME"
  docker start "$NAME" >/dev/null
  echo "Предыдущая версия запущена снова"
fi
exit 1
```

### Как он работает

1. **Проверяет аргумент.** `set -euo pipefail` останавливает скрипт на первой ошибке,
   на необъявленной переменной и на сбое в любой части конвейера `|`.
   `${IMAGE_REF##*:}` отрезает всё до последнего двоеточия и оставляет тег. Образы
   с тегом `latest` или без тега скрипт не выкладывает: по ним нельзя понять,
   какая версия работает, и нельзя повторить выкладку.
2. **Скачивает образ** из registry. Логин уже выполнен в задаче `deploy_test`.
3. **Готовит том для SQLite.** Приложение работает от пользователя с UID 10001, а новый
   том принадлежит root. Одноразовый контейнер от root (`--user 0`) с подменённой точкой
   входа `chown` отдаёт папку `/data` этому пользователю.
4. **Проверяет кандидата.** Новая версия запускается на запасном порту 18889 и с базой
   во временной памяти (`--tmpfs /data`), то есть настоящие данные она не трогает.
   Если за 30 секунд `/health` не вернул нужную версию, скрипт показывает лог
   и выходит. Рабочая версия всё это время продолжает отвечать.
5. **Откладывает текущую версию.** Работающий контейнер останавливается и переименовывается
   в `root-casino-previous`. Его не удаляют: это готовая точка отката.
6. **Запускает новую версию** на основном порту 18888 с настоящим томом. Метка
   `casino.image` позволяет позже посмотреть, какой образ работает:
   `docker inspect --format '{{index .Config.Labels "casino.image"}}' root-casino`.
7. **Проверяет её ещё раз.** Если `/health` не ответил, новый контейнер удаляется,
   а `previous` получает старое имя и запускается снова. Скрипт завершается с кодом 1,
   и задача в GitLab краснеет.

Функция `wait_health` проверяет не просто «сервер ответил», а «ответила **именно новая**
версия»: приложение получает тег через `APP_VERSION` и возвращает его в `/health`.
Так скрипт не примет за успех старый процесс, который почему-то остался на порту.
Если контейнер упал, функция не ждёт все 30 секунд и сразу сообщает об этом.

### Ограничения контейнера

Массив `LIMITS` применяется и к кандидату, и к рабочей версии, чтобы проверка шла в тех же
условиях, что и работа.

| Флаг | Что даёт |
| --- | --- |
| `--memory 256m --memory-swap 256m` | не больше 256 МБ памяти и без swap: утечка памяти не положит VM |
| `--cpus 0.5` | не больше половины ядра |
| `--pids-limit 64` | не больше 64 процессов: защита от fork-бомбы |
| `--cap-drop ALL` | отобраны все capabilities Linux, даже те, что Docker даёт по умолчанию |
| `--security-opt no-new-privileges` | процесс не сможет повысить права через setuid-файлы |
| `--read-only` | файловая система контейнера только для чтения |
| `--tmpfs /tmp:rw,noexec,nosuid,size=32m` | единственное место для временных файлов, запускать из него ничего нельзя |
| `--log-opt max-size=5m --log-opt max-file=2` | логи не займут больше 10 МБ диска |
| `-p 127.0.0.1:...` | порт открыт только на самой VM, снаружи напрямую к приложению не подключиться |

Писать приложение может только в `/data` (том с базой) и в `/tmp`.

## Откат

Скрипт отката `deploy/rollback-test.sh` здесь не приводится. По схеме выкладки ему есть
с чем работать: на сервере остаётся остановленный контейнер `root-casino-previous`
с прошлой версией. Поэтому кнопка `rollback_test` не скачивает образ и не ходит в registry.

## Что можно улучшить

- **Деплой не ждёт `image_scan`.** Если нужно, чтобы образ с критичной уязвимостью нельзя
  было выкатить, добавьте `image_scan` в `needs` у `deploy_test` и уберите у сканирования
  `allow_failure`.
- **Короткий простой при выкладке.** Между `docker stop` старой версии и ответом новой
  приложение недоступно несколько секунд. Для тестовой VM это нормально; без простоя
  можно переключать трафик в reverse proxy между двумя портами.
- **Миграции базы.** Старая и новая версии работают с одним томом. Если новая версия
  поменяла схему SQLite, откат на старую может не помочь. Перед выкладкой стоит копировать
  файл базы.
- **Проверка версии через `grep`.** Строка `"version":"<тег>"` должна совпадать посимвольно:
  если приложение начнёт отдавать JSON с пробелом после двоеточия, проверка сломается.
  Надёжнее разбирать ответ через `jq -e --arg v "$3" '.version == $v'`.
- **Таймаут `curl`.** Без `--max-time` зависший запрос может ждать дольше задуманных
  30 секунд. Хватит `curl -fsS --max-time 2`.

Про этапы пайплайна в целом — в материале [«Из чего состоит пайплайн»](./pipeline-stages.md).
