---
name: CKS Stock summary
description: Resumen agregado del stock operativo (transponders, mandos, llaves, herramientas) desde Supabase tabla stock. Marca items críticos por debajo del mínimo configurado. Multi-tenant BCN/MAD/SEV.
homepage: https://supabase.com
triggers:
  - stock summary
  - resumen stock
  - inventario cks
  - faltan transponders
  - cks stock
metadata:
  category: Data & Analytics
  author: CKS
  version: 1.0.0
---

# CKS Stock summary

Devuelve un snapshot agregado del **inventario operativo CKS** desde la tabla `stock` de Supabase. Multi-tenant: separa BCN, MAD y SEV (Sergio gestiona SEV de forma independiente — no compartimos stock pero sí esquema). Resalta items por debajo del umbral mínimo.

## Cuándo invocar

- El operador pregunta "¿de qué andamos cortos?", "¿hay transponders BMW?"
- Antes de aceptar un trabajo grande (perdida total → necesita transponder + carcasa + corte)
- Reporte semanal de inventario para Zeus / Álvaro
- Detección de fugas / discrepancias entre tenants

## Variables requeridas

- `SUPABASE_URL` — `https://jldtppecncnynxwcfvvk.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — service role key
- `CKS_TENANT` (opcional) — `bcn-mad` o `sev`. Sin valor → muestra todos.

## Permisos

`admin` o `direccion`. `jefe_taller` puede ver su propio tenant. Si rol insuficiente → abortar.

## Procedimiento

### 1. Stock agregado por categoría y tenant

```bash
TENANT_FILTER=""
if [ -n "$CKS_TENANT" ]; then
  TENANT_FILTER="&tenant=eq.$CKS_TENANT"
fi

curl -s -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     "$SUPABASE_URL/rest/v1/stock?select=tenant,category,sku,name,quantity,min_threshold${TENANT_FILTER}&order=tenant.asc,category.asc" \
     | jq 'group_by(.tenant + " · " + .category) | map({
         group: (.[0].tenant + " · " + .[0].category),
         items: length,
         total_units: ([.[] | .quantity] | add),
         critical: [.[] | select(.quantity <= .min_threshold) | {sku, name, quantity, min_threshold}]
       })'
```

### 2. Solo críticos (alertas accionables)

```bash
curl -s -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     "$SUPABASE_URL/rest/v1/stock?select=tenant,sku,name,quantity,min_threshold&quantity=lte.min_threshold${TENANT_FILTER}&order=tenant.asc" \
     | jq .
```

## Output esperado

```json
[
  {
    "group": "bcn-mad · transponder",
    "items": 24,
    "total_units": 312,
    "critical": [
      { "sku": "TR-MB-NEC-2", "name": "Transponder Mercedes NEC v2", "quantity": 1, "min_threshold": 5 }
    ]
  },
  {
    "group": "sev · mando",
    "items": 18,
    "total_units": 47,
    "critical": []
  }
]
```

Presentar al operador con jerarquía:

1. 🔴 **Críticos (acción inmediata)** — SKU + nombre + cantidad / mínimo, agrupado por tenant.
2. 🟡 **Bajo umbral próximo** (`quantity <= min_threshold * 1.5`) — informativo.
3. 🟢 **Resumen agregado** por categoría/tenant.

Si hay 0 críticos en todos los tenants → "🟢 Stock sano en todas las sedes".

## Errores comunes

| Código | Causa | Acción |
|---|---|---|
| `401` | Service key mal | Verificar `.env` |
| `0 rows` con `CKS_TENANT` definido | Tenant inexistente | Listar tenants válidos: `bcn-mad`, `sev` |
| `column "min_threshold" does not exist` | Schema antiguo sin esa columna | Caer a `quantity` solo y avisar a `cks-dev` para migración |

## Datos confidenciales — NO listar

- **mb_keys (5 016 llaves Mercedes)** — solo `admin`/`direccion` por interfaz dedicada.
- **K constants y security bytes** — nunca expuestos por esta skill.

Si el operador insiste en ver esos campos, **negar y derivar a David**.

## Notas multi-tenant

- BCN y MAD son del **mismo tenant** (`bcn-mad`) y comparten stock.
- SEV es **independiente** (Sergio Barrera, cesión de marca). Su stock no alimenta el nuestro ni viceversa.
- No proponer "trasvase de stock entre tenants" — es decisión de negocio, requiere David + Sergio.
