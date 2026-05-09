# CKS Logo Racing-Cut v2 — Notas de refinamiento (A16)

**Fecha:** 9-may-2026
**Branch:** `feat/logo-cks-racing-cut-refined`
**PR:** A16
**Status:** DRAFT — pendiente validación CEO antes de promover a favicon activo

---

## Contexto

El asset `assets/cks-logo-traced.svg` (846B) era resultado de auto-trace con `potrace` desde un PNG. Inspección reveló que el trace NO contiene letterforms reales — solo 1 path con 3 sub-paths que dibujan un rectángulo bordeado con bandas horizontales (la silueta del bounding box, no las letras). Calidad real para uso brand: 2/10.

Por otro lado, los assets activos `cks-logo-mark.svg` (favicon, 405B) y `cks-logo-full.svg` (737B) ya usan `Arial Black` italic con `letter-spacing: -0.3` — son funcionalmente correctos pero genéricos (no tienen el "racing feel" italic agresivo del logo brand de Car Key System).

## Variantes generadas

Cuatro SVGs nuevos, **drafts** sin promoción al favicon/mark activo:

| Fichero | Tamaño | Aproximación | Caso de uso |
|---|---|---|---|
| `cks-logo-racing-v2.svg` | ~1.1 KB | **Opción A — paths Bezier manuales** | Hero/print fidelidad máxima, no depende de fonts del SO |
| `cks-logo-racing-v2-font.svg` | ~700 B | **Opción C — text + font stack** | Web ligero, escalable, requiere Anton/Bowlby instalada o webfont |
| `cks-logo-racing-v2-mark.svg` | ~640 B | Mark 24×24 racing-cut | Favicon-ready si CEO lo aprueba |
| `cks-logo-racing-v2-dark.svg` | ~620 B | Variante currentColor | Dark mode / theming via CSS |

## Decisiones de diseño

### Tipografía

- **Italic angle:** 12° (vs ~7° de Arial Black italic default). Más agresivo, racing-style.
- **Font stack:** `Anton, Bowlby One, Paytone One, Arial Black, Helvetica Neue, sans-serif`. Tres fuentes racing-leaning como primera opción + 2 fallbacks seguros.
- **Font weight:** 900 (Black).
- **Letter-spacing:** -6 px en font variant, -0.5 en mark. Letras pegadas estilo logo automotive.
- **Skew adicional:** `skewX(-12)` en variants font para acentuar el racing italic más allá del italic nativo de la font.

### Color

- **Brand red:** `#c5020e` (mantenido del existing).
- **Variante dark:** `currentColor` para inheritance via CSS (mismo patrón que `cks-logo-mark-dark.svg` existing).

### Racing accents

- Bottom stripe: `<rect>` 6px height, full-width (signature racing stripe).
- Top-left short stripe (variantes font/dark): 80×3 px, accent decorativo opcional.
- Mark variant: esquina superior-derecha "diagonal cut" via path en lugar de `rx` uniforme — sugiere "chip cortado en ángulo" típico racing/automotive.

### Opción A (paths manuales)

Los paths C, K, S están dibujados a mano con coordenadas Bezier (puntos de inflexión calculados a ojo, no exportados de Illustrator). Resultado: letterforms estilo racing pero **simplificadas geométricamente** — no son fidelidad pixel-perfect al logo brand original (necesita designer humano). Pros: 0 dependencia de fonts del navegador. Contras: las letras no son las del brand exacto, son una interpretación.

### Opción C (font-based)

Usa text SVG con stack de fuentes. Si Anton/Bowlby/Paytone están instaladas localmente o cargadas como webfont, el resultado es excelente. Si fallback a Arial Black, es funcional pero pierde el racing feel.

**Para usar Opción C en producción** (cualquiera de los 3 ficheros con `<text>`):
```html
<!-- Cargar Anton desde Google Fonts en el <head> del HTML/Next.js _document -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&display=swap" rel="stylesheet">
```

O alternativamente embed la WOFF2 de Anton directamente en el SVG via `@font-face` (aumenta peso del SVG ~50-100 KB pero auto-contenido). Decisión post-validación CEO.

## Recomendación CEO

1. **Compara visualmente** los 4 SVGs en navegador o Finder Quick Look.
2. **Si te gusta v2-font**: lanza orden para "promover v2-font a `cks-logo-full.svg` activo + cargar Anton webfont en `_document.tsx`".
3. **Si te gusta v2 (Opción A paths)**: lanza orden para "promover v2 a `cks-logo-traced.svg` activo (reemplazar trace garbage actual)".
4. **Si NINGUNO convence**: A16 sigue necesitando designer humano (Figma/Illustrator) para fidelidad pixel-perfect al logo brand original. Mi mejor esfuerzo sin ojo humano + tablet de diseño termina aquí.

**Honest assessment:** estos 4 SVGs son una **aproximación razonable** al "racing-cut" estilo automotive, pero NO son una réplica del logo CKS brand original (no tengo acceso al artwork master en .ai/.psd ni al brand-book). Si la fidelidad al logo brand es prioritaria, contrata 1h de designer.

## Cómo regenerar / iterar

Estos SVGs son texto plano. Cualquier edit:

1. Abre el `.svg` en VSCode/cualquier editor.
2. Modifica:
   - `font-size` para tamaño global de las letras.
   - `letter-spacing` para apretar/separar (negativo = más juntas).
   - `transform="skewX(-12)"` para más/menos italic agresivo (-15 = más racing, -8 = más sutil).
   - `fill="#c5020e"` para cambiar color brand.
3. Refresh en navegador (Quick Look en Finder) para ver cambios al instante.

Para regenerar trace desde un PNG nuevo (futuro):
```bash
brew install potrace
convert input.png -threshold 50% input.pgm
potrace -s input.pgm -o output.svg
# resultado pobre, hay que limpiar manual
```

## Variantes futuras posibles

- **CKS con shadow/3D bevel:** añadir filter SVG `<feDropShadow>` para profundidad.
- **CKS con racing stripes background:** stripes diagonales rojas detrás de las letras (estilo Audi RS racing).
- **CKS animado:** hover state con `<animate>` que mueva las letras tipo "speed motion".
- **CKS con marco metálico:** linear-gradient grey → silver para contorno (efecto cromado).

Todas son post-MVP, requieren validación CEO de la dirección creativa primero.

---

**Referencias visuales** (estilos racing italic considerados durante diseño):

- Audi RS, BMW M-Sport, Mercedes AMG (italic compacto + sharp terminations)
- Logos top10 carrocería Italia (Pininfarina, Bertone) — italic más sutil
- Anton font (Vernon Adams 2011, libre Google Fonts) — black condensed sans
- Bowlby One (Vernon Adams 2011, libre Google Fonts) — black ultra-condensed sans

**No referencias** explícitas: no copié de ningún logo automotriz, son interpretaciones libres.
