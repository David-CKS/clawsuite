# CKS Logo v3 — Brand Canonical (A16 v3)

**Fecha:** 9-may-2026
**Branch:** `feat/logo-cks-v3-brand-canonical`
**PR:** A16 v3
**Status:** Final — sustituye drafts v2 (PR #14) y promueve assets brand-canonical al favicon/mark activos.

---

## Origen brand

PDF master oficial del **Manual de Identidad Visual Corporativa Car Key System 2021**:

```
assets/brand-source/
  CARKEY-LOGO-OKv2-1000px-tran.pdf    241 KB  (master)
  CARKEY-LOGO-OKv2-1000px-tran.png     50 KB  (raster transparente)
  CARKEY-LOGO-OKv2-1000px.jpg          60 KB  (raster con fondo blanco)
```

**Color brand canonical:** `#c5020e` (rojo CKS racing).

---

## Hallazgo clave: el "PDF vectorial" es raster

Inspeccion forense del PDF (`pdfimages -list`) revelo que el master NO es vectorial puro. Estructura interna:

```
page  num  type   width height  enc       size
1     0    image  1000  498     jpeg      72.3K  (capa color)
1     1    smask  1000  498     image     19.9K  (alpha mask grayscale)
```

El PDF embebe un JPEG 1000×498 con mascara alpha — es un **wrapper raster en formato PDF**, no paths Bezier vectoriales. Esto explica por que:

- `pdftocairo -svg` produce un SVG que contiene `<image xlink:href="data:image/png;base64,...">`, no `<path>`s.
- Cualquier auto-trace (potrace, etc.) sobre el PNG de salida pierde fidelidad letterform.
- La V2 (PR #14) intento recrear con paths Bezier a mano y resulto en "drafts mediocres" — porque el racing-cut italic con cortes interiores (la "aleta de tiburon" de la C, el angular K, el slash de la S) es tipografia custom no recreable a ojo sin Illustrator/designer humano.

**Conclusion:** la fidelidad maxima al brand-book oficial requiere usar el raster original. Esta v3 lo hace embedded en SVG, preservando 100% pixel-perfect el isotipo brand.

---

## Metodo aplicado

### 1. Conversion PDF -> SVG via pdftocairo

```bash
brew install poppler
pdftocairo -svg assets/brand-source/CARKEY-LOGO-OKv2-1000px-tran.pdf \
           assets/brand-source/cks-logo-master-extracted.svg
```

Resultado: SVG 97 KB que envuelve el PNG raster en `<image>` (el SVG actua como contenedor con metadata).

### 2. Extraccion isotipo CKS solo (favicon + mark)

ImageMagick para aislar solo los pixeles rojos del isotipo central:

```bash
magick assets/brand-source/CARKEY-LOGO-OKv2-1000px-tran.png \
  -fuzz 25% -fill none +opaque "#c5020e" -trim +repage \
  assets/brand-source/cks-iso-only.png

magick assets/brand-source/cks-iso-only.png \
  -background none -gravity center -extent 823x823 -resize 256x256 \
  assets/brand-source/cks-iso-square-256.png
```

Resultado: 256×256 PNG con isotipo CKS centrado, fondo transparente, 4 KB.

### 3. Trimming logo completo horizontal (full)

```bash
magick assets/brand-source/CARKEY-LOGO-OKv2-1000px-tran.png \
  -trim +repage -bordercolor none -border 10x10 +repage \
  assets/brand-source/cks-full-trimmed.png
```

Resultado: 1000×453 con padding 10px, fondo transparente, 77 KB.

### 4. Embebido PNG base64 en SVG

Cada uno de los 3 entregables es un SVG con el PNG correspondiente embebido como `xlink:href="data:image/png;base64,..."` dentro de un `<image>`. Es valido XML, escalable visualmente (con cierto blur por encima del nativo), y 100% fiel al brand-book.

---

## Entregables

| Fichero | viewBox | Bytes | Embedded PNG | Caso de uso |
|---|---|---:|---:|---|
| `public/favicon.svg` | `0 0 256 256` | 6 010 | `cks-iso-square-256.png` (4 KB, 256×256) | Pestana del navegador (16×16/32×32 visualmente) |
| `assets/cks-logo-mark.svg` | `0 0 24 24` | 6 047 | `cks-iso-square-256.png` (4 KB, 256×256) | Sidebar header CKS Suite |
| `assets/cks-logo-full.svg` | `0 0 1000 453` | 103 416 | `cks-full-final-1000.png` (77 KB, 1000×453) | Header / login / footer (logo horizontal completo con CARKEY/SYSTEM) |

Todos validados con `xmllint --noout` -> XML valido.

---

## Decisiones de diseno

1. **Favicon = solo isotipo CKS, sin texto decorativo.** A 16×16 / 32×32 el texto outlined "CARKEY" y "SYSTEM" es ilegible y solo introduce ruido. El isotipo CKS ya identifica la marca al instante.

2. **Mark = mismo PNG que favicon.** Para sidebar 24×24 sirve la misma imagen — no requiere variante separada.

3. **Full = horizontal completo.** Mantiene los textos outlined "CARKEY" arriba y "SYSTEM" abajo como en el brand-book. Aspect ratio 1000:453 preservado.

4. **Bytes elevados (103 KB full)** son aceptables: es un asset brand una sola vez por pagina, cacheado por el navegador. Para un home + login + footer = 1 sola descarga inicial.

5. **NO hay variante dark.** El logo brand es siempre rojo `#c5020e` sobre cualquier fondo (claro u oscuro). Si en el futuro hace falta una version monocromatica blanca para fondos oscuros muy saturados, se generara como `cks-logo-mark-white.svg` con un PNG mascara.

---

## Como regenerar (si hace falta)

```bash
cd /path/to/clawsuite

# Pre-requisito una sola vez
brew install poppler imagemagick

# 1. Sacar PNG transparente desde el PDF master
pdftocairo -svg assets/brand-source/CARKEY-LOGO-OKv2-1000px-tran.pdf \
           assets/brand-source/cks-logo-master-extracted.svg

# 2. Generar isotipo cuadrado 256x256
magick assets/brand-source/CARKEY-LOGO-OKv2-1000px-tran.png \
  -fuzz 25% -fill none +opaque "#c5020e" -trim +repage \
  -background none -gravity center -extent +0+0 \
  -resize 256x256 \
  assets/brand-source/cks-iso-square-256.png

# 3. Generar full trimmed
magick assets/brand-source/CARKEY-LOGO-OKv2-1000px-tran.png \
  -trim +repage -bordercolor none -border 10x10 +repage \
  assets/brand-source/cks-full-final-1000.png

# 4. Re-encode SVGs con base64 nuevos (ver scripts en bash history del PR A16 v3)
```

---

## Historial v1 -> v3

| Version | Estado | Notas |
|---|---|---|
| v1 (pre-A16) | Activo (Arial Black italic + text) | Generico, no brand. Activos: `cks-logo-mark.svg` 405 B, `cks-logo-full.svg` 737 B con `<text>` Arial Black |
| v2 (PR #14, 4307794) | **Superseded** | Drafts paths Bezier hand-drawn racing-cut. CEO valoro como mediocres por no tener acceso al brand-book. 4 SVGs + notes md eliminados en esta PR |
| **v3 (este PR)** | **Final** | Brand-canonical, extraido del PDF master oficial Manual Identidad CKS 2021. Sustituye favicon + mark + full activos. |

---

## Validacion CEO

Para validar visualmente:

1. Hard-refresh (Cmd+Shift+R / Ctrl+Shift+R) en la pestana navegador `https://clawsuite.carkeysystem.com` -> ver favicon CKS oficial brand-book en la tab.
2. Comparar visualmente con el PNG de referencia `assets/brand-source/CARKEY-LOGO-OKv2-1000px-tran.png` -> debe ser pixel-perfect identico.
3. Ver mark renderizado en sidebar (24×24) -> isotipo CKS racing-cut italic rojo nitido.
4. Ver full renderizado en login/footer/header -> logo completo horizontal con CARKEY arriba + CKS centro + SYSTEM abajo.

Cualquier divergencia visual = bug a reportar (probable cache CDN o Traefik).
