# CKS Fork Workflow

Fork de [`outsourc-e/clawsuite`](https://github.com/outsourc-e/clawsuite) mantenido para Car Key System.

## Estructura de branches

- `main` — espejo del upstream main (no tocar nuestro)
- `cks-main` — base v3.2.0 + parches CKS (rama operativa que corre el VPS)

## Remotes en el VPS

```
upstream → https://github.com/outsourc-e/clawsuite.git
cks      → https://github.com/David-CKS/clawsuite.git
```

## Parches actuales (8-may-2026)

| Commit | Descripción | Why |
|---|---|---|
| `19d5328` | `npm install --legacy-peer-deps` en Dockerfile | upstream v3.2.0 tiene `package-lock.json` desincronizado (~22 paquetes TanStack v1.157→v1.166); `npm ci` falla con EUSAGE |

## Cómo subir a una nueva versión upstream (workflow rebase)

```bash
# Desde Mac local (gh autenticado como David-CKS)
cd /tmp/clawsuite-fork-cks         # o donde tengas el clone
git fetch upstream --tags
git fetch origin

# Ver qué versión nueva hay
git tag --sort=-creatordate | head -5

# Rebase nuestro cks-main sobre el nuevo tag (e.g. v3.3.0)
git checkout cks-main
git rebase v3.3.0
# → si hay conflicts, resolver en cada commit (los parches son pocos y localizados)
# → si el upstream ya resolvió el lock file, el commit 19d5328 será automáticamente
#   marcado como "empty" y se puede dropear con `git rebase --skip`

# Si todo OK, push force-with-lease al fork
git push --force-with-lease origin cks-main

# En el VPS:
ssh root@72.62.190.131
cd /docker/clawsuite
git fetch cks
git reset --hard cks/cks-main
docker compose -f docker-compose.yml -f docker-compose.cks.yml up -d --build clawsuite
```

## Cómo añadir un nuevo parche CKS

```bash
cd /tmp/clawsuite-fork-cks
git checkout cks-main

# Edit ficheros
# ...
git commit -m "feat(cks): branding logo + colores pentagon"
git push origin cks-main

# Pull en VPS
ssh root@72.62.190.131
cd /docker/clawsuite
git pull cks cks-main
docker compose ... up -d --build clawsuite
```

## Reglas

1. NUNCA commit secrets (.env, tokens, passwords) al fork — todos en `.env` local del VPS, gitignorados.
2. NUNCA push a `main` del fork — eso es espejo del upstream.
3. Cada parche en `cks-main` debe explicar el "why" en commit message — facilita el rebase futuro.
4. Si upstream resuelve algo que parchamos → drop el commit en rebase.
5. Cuando upstream haga release breaking change, decidir manualmente si saltar la versión o adaptar.
