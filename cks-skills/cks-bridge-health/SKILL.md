---
name: CKS Bridge health
description: Healthcheck del Cloudflare Tunnel api.carkeysystem.com que conecta el gateway OpenClaw con el servidor Lobster de Sergio. Reporta latencia y status HTTP.
homepage: https://api.carkeysystem.com
triggers:
  - bridge health
  - tunnel health
  - api carkeysystem
  - sergio bridge
  - cks bridge
metadata:
  category: DevOps & Cloud
  author: CKS
  version: 1.0.0
---

# CKS Bridge health

Verifica que el **Cloudflare Tunnel** que expone la API de Sergio en `api.carkeysystem.com` está vivo. El tunnel vive en la cuenta Cloudflare de David (no en la de Sergio) porque el dominio `carkeysystem.com` está ahí. Reemplaza al antiguo proxy Railway, que está muerto desde el 20-abr-2026 (ADR-008).

## Cuándo invocar

- Antes de cualquier consulta a `cks-buscar-procedimiento`
- Cuando una llamada a la API v3 devuelve 5xx
- Diariamente si no hay el cron `cks-bridge-health` corriendo en el VPS
- Sospecha de incidente del lado de Sergio

## Variables requeridas

Ninguna. El endpoint `/health` es público.

## Procedimiento

```bash
START_MS=$(date +%s%3N)
HTTP_CODE=$(curl -s -o /tmp/cks-bridge-body.json -w "%{http_code}" --max-time 5 \
  https://api.carkeysystem.com/health)
END_MS=$(date +%s%3N)
LATENCY_MS=$((END_MS - START_MS))

echo "status=$HTTP_CODE latency_ms=$LATENCY_MS"
cat /tmp/cks-bridge-body.json | jq .
```

## Output esperado

Cuando todo va bien:

```
status=200 latency_ms=180
{
  "ok": true,
  "version": "v3.x.y",
  "uptime_s": 12345,
  "db": "connected"
}
```

Resumir al operador como **🟢 OK** + latencia ms.

## Errores comunes

| Síntoma | Causa probable | Acción |
|---|---|---|
| `status=000` curl timeout | Tunnel caído / DNS roto | Avisar a David por chat. Verificar `dig api.carkeysystem.com` |
| `status=502` o `503` | Backend Lobster apagado | Coordinar con Sergio (canal `@CKS_Lobster_Bridge_bot`) |
| `status=200` pero `db: error` | Postgres del Lobster con problemas | Avisar a Sergio, no degradar consultas |
| latencia > 2 000 ms | Tunnel saturado o ruta lenta | Repetir 3 veces y promediar; si persiste, escalar a Sergio |

## Contexto histórico

El `cks-bridge-health` corre en cron cada 30 minutos en el VPS Hostinger (`/etc/cron.d/cks-openclaw`). Esta skill es para **invocaciones interactivas** desde el chat cuando el operador necesita un check ad-hoc.
