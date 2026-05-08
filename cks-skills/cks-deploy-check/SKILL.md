---
name: CKS Deploy check
description: Devuelve el estado del último deployment Vercel del proyecto cks-system con su URL, autor y duración. Útil para verificar si un push reciente está vivo en producción.
homepage: https://vercel.com
triggers:
  - deploy check
  - vercel status
  - cks-system deploy
  - ultimo deploy
  - cks deploy
metadata:
  category: DevOps & Cloud
  author: CKS
  version: 1.0.0
---

# CKS Deploy check

Consulta la API REST de Vercel para devolver el último deployment del proyecto **cks-system** (la app Next.js que es el producto principal). Replica la lógica del cron `cks-deploy-check` que corre cada 15 min en el VPS.

## Cuándo invocar

- Tras hacer `git push` a `main` y querer confirmar que Vercel ya construyó
- Cuando el operador reporta "la web no carga" — discriminar Vercel vs DNS
- Antes de prometer una demo a un cliente / Sergio
- Diagnóstico rápido de regresiones

## Variables requeridas

- `VERCEL_TOKEN` — token personal Vercel de David (scope: deployments read)
- `VERCEL_PROJECT_ID` — ID del proyecto `cks-system` (en la URL del dashboard Vercel)

## Procedimiento

```bash
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&limit=1" \
  | jq '.deployments[0] | {url: .url, state, createdAt, ready, target, source, creator: .creator.username}'
```

Para más detalle (logs, build duration):

```bash
DEPLOYMENT_ID=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&limit=1" \
  | jq -r '.deployments[0].uid')

curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v13/deployments/$DEPLOYMENT_ID" | jq .
```

## Output esperado

```json
{
  "url": "cks-system-abc123.vercel.app",
  "state": "READY",
  "createdAt": 1714914000000,
  "ready": 1714914120000,
  "target": "production",
  "source": "git",
  "creator": "david-cks"
}
```

Resumir al operador:

- **🟢 READY** — deploy vivo. Citar URL completa con `https://`. Calcular `ready - createdAt` para mostrar duración.
- **🟡 BUILDING** o **QUEUED** — en curso. Mostrar tiempo transcurrido.
- **🔴 ERROR** o **CANCELED** — fallo. Pedir permiso al operador y adjuntar URL del log para que él lo revise.

## Errores comunes

| Síntoma | Causa | Acción |
|---|---|---|
| `401 Unauthorized` | Token caducado o sin scope | Pedir a David rotar token Vercel |
| `404 Not Found` | `VERCEL_PROJECT_ID` mal | Verificar en `https://vercel.com/<team>/cks-system/settings` |
| `state=ERROR` | Build roto | Sugerir abrir el deploy en navegador; no arreglar nada sin permiso |

## Notas

- **Solo lectura.** Esta skill nunca despliega, promueve, ni cancela. Para esas acciones, usar el wrapper `cks-vercel.sh` del agente `cks-dev` con autorización humana.
- Si el operador pide "rebuild" o "redeploy", **abortar y derivar a David** — esas son acciones que requieren aprobación explícita (ADR-002).
