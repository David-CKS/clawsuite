---
name: CKS Buscar procedimiento
description: Busca procedimientos técnicos de cerrajería del automóvil en la API v3 de Sergio (16 277 procs, 89,8% verificados) por marca, modelo, año o palabra clave.
homepage: https://api.carkeysystem.com
triggers:
  - buscar procedimiento
  - buscar proc
  - procedimiento llave
  - duplicar llave
  - cks buscar
  - api sergio
metadata:
  category: Search & Research
  author: CKS
  version: 1.0.0
---

# CKS Buscar procedimiento

Esta skill consulta la **API v3 de Lobster** (mantenida por Sergio Barrera, CEO CKS Sevilla) que expone 16 277 procedimientos técnicos verificados al 89,8 %. Es la fuente de verdad operativa para cualquier técnico que necesite saber cómo programar una llave, leer un PIN o intervenir una cerradura para una marca/modelo/año concreto.

## Cuándo invocar

- El operador pregunta "¿cómo se duplica una llave de un BMW Serie 3 2018?"
- Pide PIN reading, programación de mando, intervención de cerradura
- Solicita listas filtradas por marca/modelo/año
- Cualquier consulta del catálogo técnico CKS

## Variables requeridas

- `SERGIO_API_KEY` — clave X-API-Key emitida por Sergio (rotación 90 días). Si no está definida, **abortar y avisar al operador** para que la pida en `~/Desktop/OPENCLAW/docs/sergio/`.

## Procedimiento

1. **Búsqueda por palabra clave** (devuelve `total` + lista paginada de resultados):

   ```bash
   curl -s -H "X-API-Key: $SERGIO_API_KEY" \
     "https://api.carkeysystem.com/bridge/v1/search?q=bmw+serie+3+2018&limit=10" | jq
   ```

2. **Detalle de un procedimiento** (cuando ya conoces el `procedure_id`):

   ```bash
   curl -s -H "X-API-Key: $SERGIO_API_KEY" \
     "https://api.carkeysystem.com/bridge/v1/$PROCEDURE_ID" | jq
   ```

3. **Recomendados / stats / vehicles / brands** (Track 2 de la API):

   ```bash
   curl -s -H "X-API-Key: $SERGIO_API_KEY" "https://api.carkeysystem.com/bridge/v1/recommended"
   curl -s -H "X-API-Key: $SERGIO_API_KEY" "https://api.carkeysystem.com/bridge/v1/brands"
   ```

## Output esperado

Estructura JSON estándar:

```json
{
  "total": 393,
  "page": 1,
  "limit": 10,
  "items": [
    {
      "procedure_id": 32468,
      "brand": "BMW",
      "model": "Serie 3",
      "year_range": "2012-2019",
      "service_type": "duplicado",
      "verified": true,
      "summary": "Programación llave smart …"
    }
  ]
}
```

Resumir al operador: número total + top 3-5 resultados con `procedure_id`, marca/modelo, tipo de servicio y `verified`. **Citar el `procedure_id`** para que pueda hacer follow-up.

## Errores comunes

| Código | Significado | Acción |
|---|---|---|
| `401 Unauthorized` | API key inválida o caducada | Avisar a David — Sergio rota cada 90 días |
| `429 Too Many Requests` | >100 req/h o >1000 req/día | Esperar y avisar al operador del rate-limit |
| `5xx` | Bridge caído (Cloudflare Tunnel) | Invocar `cks-bridge-health` y reportar el incidente |
| `total: 0` | Nada coincide | Sugerir reformular la query (acortar términos, probar sinónimos) |

## Límites del rate-limit

- 100 req/h
- 1 000 req/día
- Por API key

Si el operador encadena muchas búsquedas, pre-computar combinaciones para no agotar cuota.

## Notas de criticidad

Esta skill **no devuelve datos confidenciales** (K constants, security bytes, mb_keys de Mercedes). Esos requieren rol `admin`/`direccion` y endpoint distinto, no expuesto por esta skill.
