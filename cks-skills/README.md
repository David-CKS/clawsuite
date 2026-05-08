# CKS Skills — Skills personalizadas Car Key System

Conjunto de skills para el ClawSuite browser que exponen las herramientas operativas reales de CKS (Car Key System®) al modelo: búsqueda de procedimientos técnicos, salud del bridge con Sergio, status de deploys Vercel, snapshot del sprint MVP, resumen de fichajes y resumen de stock.

Este directorio es **bundled en el repo del fork** (`David-CKS/clawsuite`). El instalador copia los skills al directorio runtime de OpenClaw.

## Qué contiene

| Skill | Categoría | Para qué |
|---|---|---|
| `cks-buscar-procedimiento` | Search & Research | Buscar procedimientos técnicos en la API v3 de Sergio (16 277 procs, 89,8% verificados) |
| `cks-bridge-health` | DevOps & Cloud | Healthcheck del Cloudflare Tunnel `api.carkeysystem.com` |
| `cks-deploy-check` | DevOps & Cloud | Status del último deploy Vercel del proyecto `cks-system` |
| `cks-sprint-status` | Productivity | Snapshot del Sprint MVP (lee `/openclaw-state/sprint-status.json` bind-mounted) |
| `cks-fichaje-summary` | Data & Analytics | Resumen agregado de fichajes desde Supabase (tabla `fichajes`) |
| `cks-stock-summary` | Data & Analytics | Resumen agregado de stock desde Supabase (tabla `stock`) |

## Instalación

ClawSuite descubre skills en `~/.openclaw/workspace/skills/<owner>/<name>/SKILL.md`. Para instalar el lote CKS:

```bash
# Desde la raíz del repo clonado
mkdir -p ~/.openclaw/workspace/skills/cks
cp -r cks-skills/cks-* ~/.openclaw/workspace/skills/cks/

# Verifica que el browser los detecta
curl -s http://localhost:3000/api/skills?tab=installed | jq '.skills[] | select(.id | startswith("cks/")) | .name'
```

Tras copiar abre el ClawSuite Skills Browser (tab Installed) — los 6 deben aparecer con badge **Installed**.

## Variables de entorno requeridas

Estas variables las consume el LLM al ejecutar los skills (vía Bash). Definirlas **en el shell del proceso OpenClaw**, no en los SKILL.md (los .md son public-readable).

| Variable | Skill que la usa | Origen |
|---|---|---|
| `SERGIO_API_KEY` | `cks-buscar-procedimiento` | Emitida por Sergio Barrera 21-abr-2026, rotación 90d |
| `SUPABASE_URL` | `cks-fichaje-summary`, `cks-stock-summary` | Proyecto `jldtppecncnynxwcfvvk` |
| `SUPABASE_SERVICE_ROLE_KEY` | idem | Service-role del proyecto Supabase |
| `VERCEL_TOKEN` | `cks-deploy-check` | Token Vercel personal de David |
| `VERCEL_PROJECT_ID` | `cks-deploy-check` | ID del proyecto `cks-system` |

## Convenciones internas

- **Idioma:** español peninsular en `description`, `triggers` y cuerpo markdown (los operadores son ES).
- **Formato `triggers`:** lista de palabras-frase cortas (1–4 palabras) que el operador puede usar en chat para activar mentalmente la skill.
- **Cuerpo markdown:** estructura fija — `## Cuándo invocar`, `## Variables requeridas`, `## Procedimiento`, `## Output esperado`, `## Errores comunes`. Esto facilita que el modelo siga la receta sin alucinación.
- **Endpoints:** siempre `https://` con dominio canónico CKS (nunca IPs ni Railway — Railway está muerto desde 20-abr-2026, ver ADR-008).

## Mantenimiento

Cualquier cambio en endpoints / schema / variables debe reflejarse en el SKILL.md correspondiente y propagarse a `~/.openclaw/workspace/skills/cks/` con `cp -r` o un `make install` (TODO).

Owner: David Utrero (CKS) · License: MIT (mismo que el fork)
