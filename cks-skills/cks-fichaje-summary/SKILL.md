---
name: CKS Fichaje summary
description: Resumen agregado de fichajes horarios desde Supabase (tabla fichajes). Devuelve horas trabajadas por técnico en una ventana temporal. Cumple normativa española de fichaje legal.
homepage: https://supabase.com
triggers:
  - fichaje summary
  - resumen fichajes
  - horas tecnico
  - fichajes hoy
  - cks fichajes
metadata:
  category: Data & Analytics
  author: CKS
  version: 1.0.0
---

# CKS Fichaje summary

Resume las **entradas de fichaje horario** del personal CKS (técnicos junior/senior, telefonistas, jefes de taller) desde la tabla `fichajes` de Supabase. Cumple la normativa española de control horario (RD-Ley 8/2019).

## Cuándo invocar

- El operador pregunta "¿cuántas horas hizo Borja esta semana?"
- Reporte mensual / quincenal de horas
- Auditoría legal de fichajes
- Detección de jornadas excesivas (>9 h/día) o inexistentes (no fichó)

## Variables requeridas

- `SUPABASE_URL` — `https://jldtppecncnynxwcfvvk.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (solo backend, **nunca exponer al frontend**)

## Permisos

Esta consulta usa **service role**, salta RLS. Solo invocable por roles `admin`, `direccion` o `jefe_taller`. Si el operador en chat no pertenece a esos roles, **abortar** y derivar.

## Procedimiento

### 1. Resumen agregado por técnico (semana en curso)

```bash
WEEK_START=$(date -u -d "monday this week" +%Y-%m-%dT00:00:00Z 2>/dev/null \
            || date -u -v-Mon +%Y-%m-%dT00:00:00Z)

curl -s -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     "$SUPABASE_URL/rest/v1/rpc/fichajes_summary_by_user" \
     -H "Content-Type: application/json" \
     -d "{\"start_at\": \"$WEEK_START\"}" | jq .
```

### 2. Plan B si no existe la RPC: query directa

```bash
curl -s -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     "$SUPABASE_URL/rest/v1/fichajes?select=user_id,started_at,ended_at&started_at=gte.$WEEK_START&order=started_at.desc&limit=200" \
     | jq 'group_by(.user_id) | map({
         user_id: .[0].user_id,
         entries: length,
         total_hours: (map(
           if .ended_at == null then 0
           else (((.ended_at | fromdateiso8601) - (.started_at | fromdateiso8601)) / 3600)
           end
         ) | add)
       })'
```

## Output esperado

```json
[
  { "user_id": "borja-mad", "entries": 5, "total_hours": 42.5 },
  { "user_id": "alvaro-sev", "entries": 5, "total_hours": 39.0 },
  { "user_id": "judith-bcn", "entries": 5, "total_hours": 35.5 }
]
```

Presentar al operador como tabla ordenada por horas DESC con alertas:

- ⚠️ `total_hours > 45` → posible exceso de jornada
- 🔴 `entries == 0` → técnico activo sin fichajes esta semana
- ℹ️ `ended_at == null` en la última entrada → fichaje abierto (técnico todavía dentro)

## Errores comunes

| Código | Causa | Acción |
|---|---|---|
| `401` | Service key mal | Verificar `.env` del VPS, no compartir nunca por chat |
| `404` en RPC | Función no creada | Caer al Plan B (query directa REST) |
| `0 rows` | Ventana mal o nadie fichó | Confirmar fechas con el operador antes de afirmar "nadie trabajó" |

## Restricciones legales

- Los fichajes son **datos personales** sujetos al RGPD.
- **Nunca** exportar / enviar fuera del entorno operativo CKS sin permiso de dirección.
- Si el operador pide CSV/PDF para fines no operativos, derivar a David.
