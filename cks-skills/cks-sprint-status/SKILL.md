---
name: CKS Sprint status
description: Snapshot agregado del Sprint MVP de cks-system con días restantes, items completados/abiertos/críticos y estado de los datasources externos. Lee /openclaw-state/sprint-status.json bind-mounted.
homepage: https://github.com/David-CKS/cks-system
triggers:
  - sprint status
  - estado sprint
  - mvp status
  - cks sprint
  - dias mvp
metadata:
  category: Productivity
  author: CKS
  version: 1.0.0
---

# CKS Sprint status

Devuelve el estado del **Sprint MVP** de CKS System (deadline canónico **1-may-2026**, no negociable). Lee un fichero JSON producido por el cron `cks-sprint-status.sh` cada día laboral a las 07:50 UTC en el VPS.

## Cuándo invocar

- El operador pregunta "¿cómo va el sprint?", "¿cuánto queda?", "¿qué hay abierto?"
- Antes del daily brief
- Antes de cualquier reunión con Sergio o decisión de scope
- Cuando el daily brief no llegó por Telegram y se necesita el dato

## Variables requeridas

Ninguna. El fichero está bind-mounted en `/openclaw-state/sprint-status.json` desde el host VPS.

## Procedimiento

```bash
SPRINT_FILE=/openclaw-state/sprint-status.json

if [ ! -f "$SPRINT_FILE" ]; then
  echo "❌ Sprint status no disponible. Comprueba el bind mount y el cron cks-sprint-status."
  exit 1
fi

cat "$SPRINT_FILE" | jq '{
  generated_at,
  sprint: .sprint_name,
  deadline,
  days_left,
  items: {
    open: .items_open,
    closed: .items_closed,
    critical: .items_critical,
    total: (.items_open + .items_closed)
  },
  datasources: .datasources_status
}'
```

## Output esperado

```json
{
  "generated_at": "2026-04-28T07:50:00Z",
  "sprint": "MVP-CKS-System",
  "deadline": "2026-05-01",
  "days_left": 3,
  "items": {
    "open": 7,
    "closed": 10,
    "critical": 0,
    "total": 17
  },
  "datasources": {
    "github": "ok",
    "vercel": "ok",
    "supabase": "ok",
    "sergio_api": "ok",
    "tunnel_cloudflare": "ok"
  }
}
```

Resumir al operador en una sola frase:

> 🚦 Sprint MVP-CKS-System — quedan **3 días** (deadline 1-may). 7 abiertos / 10 cerrados / 0 críticos. Datasources todos verdes.

Si `days_left ≤ 2` y `items.critical > 0` → señalar como **🔴 RIESGO** y sugerir acción inmediata.

## Errores comunes

| Síntoma | Causa | Acción |
|---|---|---|
| Fichero no existe | Bind mount roto o cron no corrió | Verificar `/etc/cron.d/cks-openclaw` y `docker inspect <container> | jq '.[0].Mounts'` |
| `generated_at` > 24 h | Cron roto o VPS mal de hora | Avisar a David, ejecutar manualmente `cks-sprint-status.sh` |
| Algún `datasources.* != ok` | Otro skill afectado | Invocar el skill correspondiente (`cks-bridge-health`, `cks-deploy-check`, etc.) para confirmar |

## No debes

- **Modificar el fichero** — es read-only output del cron, escribir en él rompe la trazabilidad.
- **Recalcular tu propia versión del status** — siempre confiar en el JSON o avisar de su ausencia.
