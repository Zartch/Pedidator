Pedidator es una herramienta de trabajo para paradas de mercado y comercios pequeños. Sirve para dos cosas: **preparar los encargos del día** y **entregarlos sabiendo quién viene, a qué hora y a por qué**. Se usa de pie, con prisa, en un iPad apoyado en el mostrador o en un móvil, a menudo con las manos mojadas o con guantes. Estas reglas son para quien construya pantallas de la app.

## Principios

- **La app es neutra; el color lo pone la empresa.** Todo lo estructural usa `surface`, `ink` y `line`. El único color con identidad es el de la empresa (`brand` y sus tres derivados).
- **El estado no es marca.** `ok`, `warn` y `danger` significan lo mismo en todas las empresas y nunca cambian con el tema.
- **Se toca, no se apunta.** Ningún control mide menos de `touch-min` (48px). Lo que se pulsa muchas veces al día (marcar un artículo, guardar) mide `touch-lg` (56px).
- **Se lee a un metro.** La hora de recogida y las cantidades van en `numeral`, con cifras tabulares, y son lo más grande de cada tarjeta.
- **La hora y la cantidad mandan; el precio no.** Las listas y el día de trabajo no enseñan importes. El precio es un dato opcional, escondido dentro del encargo.
- **Preparado se calcula, no se marca.** Un encargo está preparado cuando todos sus artículos lo están. La barra de progreso del día cuenta encargos.

## Color

### Neutros (iguales en todas las empresas)
- Fondo de pantalla: `surface`. Tarjetas, campos, diálogos y barras: `surface-raised`. Archivado y desactivado: `surface-sunken`.
- Texto: `ink`. Texto secundario: `ink-muted`. No hay un gris más claro para texto.
- `line` separa; `line-strong` delimita controles (campos, casillas, botones secundarios).

### Color de la empresa
- `brand` es **solo relleno**, siempre con `on-brand` encima: cabecera, botón principal, día seleccionado del calendario.
- `brand-strong` es el color de la empresa para todo lo que va **sobre fondo claro**: enlaces, iconos de la pestaña activa, puntos del calendario, borde de la tarjeta seleccionada, relleno del progreso y anillo de foco.
- `brand-soft` es el fondo de lo seleccionado. Encima van `ink`, `ink-muted` o `brand-strong`.
- Un botón principal por pantalla. No uses `brand` para decorar.

### Estado
- `ok` / `ok-soft`: preparado, sincronizado, pagado.
- `warn` / `warn-soft`: importante, sin conexión, cambios pendientes, "había que prepararlo ayer".
- `prep` / `prep-soft`: preparar el día anterior. Marca el **día de recogida** en el calendario, etiqueta el artículo y da color a la sección "Preparar hoy para mañana" de la víspera.
- `danger` / `danger-soft`: conflicto, error de validación, borrar.
- Todo estado lleva **icono y palabra** (o una forma distinta en el calendario: punto, rombo, barra), nunca solo color. En una carnicería el color de marca también es rojo: por eso "Borrar" es un botón con borde `danger` y fondo `surface-raised`, y nunca un relleno rojo.

## Tema por empresa

La empresa guarda **un solo valor**: su color en hexadecimal (`companies.brandColor`). La app calcula los cuatro tokens al iniciar sesión y los pone como variables CSS en la raíz. Los temas de este sistema (Carnicería, Pescadería, Frutería, Panadería) son ejemplos ya calculados; "Neutro" es la app sin color de empresa y es el valor por defecto.

Reglas del cálculo (implementación de referencia: el `<script>` de `components/ThemeStudio/preview.html`, función `PedidatorTheme.derive`):

1. Si el blanco se lee sobre el color (4,5:1 o más), `brand` es el color tal cual y `on-brand` es blanco.
2. Si no llega y el color es medio u oscuro, se oscurece (misma tonalidad) hasta que llegue.
3. Si el color es claro (amarillos, pasteles), `brand` se queda igual y `on-brand` pasa a `ink`.
4. `brand-soft` es la misma tonalidad, muy clara y casi sin saturación.
5. `brand-strong` es la misma tonalidad oscurecida hasta 4,5:1 sobre `brand-soft`.

La empresa no elige nada más: ni neutros, ni colores de estado, ni tipografía, ni radios. Así dos empresas no pueden dejar la app ilegible ni distinta de manejar.

Para aplicarlo en la app con shadcn/ui: `--primary: brand`, `--primary-foreground: on-brand`, `--ring: brand-strong`, `--accent: brand-soft`, `--accent-foreground: brand-strong`, `--background: surface`, `--card: surface-raised`, `--muted: surface-sunken`, `--muted-foreground: ink-muted`, `--foreground: ink`, `--border: line`, `--input: line-strong`, `--destructive: danger`, `--radius: radius-md`.

## Tipografía

- Titulares, horas e importes: **Bricolage Grotesque** (`display`, `title`, `numeral`). Texto e interfaz: **Figtree** (`heading`, `body`, `body-strong`, `label`, `caption`).
- La app funciona sin conexión: las dos fuentes se empaquetan con la app (paquetes `@fontsource-variable/bricolage-grotesque` y `@fontsource-variable/figtree`), no se cargan de Google en tiempo de ejecución.
- Los campos usan `body` (16px). Con menos, iOS amplía la página al enfocar.
- `caption` (13px) es el mínimo. Cifras siempre con `font-variant-numeric: tabular-nums`.

## Espaciado, tamaños y radios

- Margen lateral: `space-4` en móvil, `space-6` desde `bp-tablet`.
- Entre tarjetas de una lista: `space-3`. Entre dos controles táctiles: `space-2` como mínimo.
- Botones y tarjetas: `radius-md`. Campos, casillas y días: `radius-sm`. Diálogos: `radius-lg`. Etiquetas de estado: `radius-pill`.
- Las tarjetas no llevan sombra. `shadow-overlay` es solo para diálogos y hojas inferiores.

## Móvil y tablet

- **Móvil (por defecto):** una columna, cabecera con el nombre de la empresa, barra de estado, contenido y navegación inferior de alto `bar-height`. El botón principal ocupa todo el ancho y queda fijo abajo, al alcance del pulgar. La app se abre en el día de hoy.
- **Desde `bp-tablet` (768px):** la navegación pasa a un lateral de ancho `rail-width`; los formularios van a dos columnas.
- **Desde `bp-wide` (1024px, iPad horizontal):** dos columnas. A la izquierda (`list-col`) el día de un vistazo: calendario, progreso y "Preparar hoy para mañana". A la derecha, los encargos por hora de recogida con sus artículos para ir marcando.
- Respeta las áreas seguras de iOS (`env(safe-area-inset-*)`) en la cabecera y en la navegación inferior.
- Los diálogos tienen scroll propio y no se cierran al tocar fuera.

## Iconos

La app usa **lucide-react** (el juego de shadcn/ui), trazo de 2px, 20px en controles y 16px dentro de etiquetas. Los iconos de las vistas previas de este sistema son dibujos mínimos equivalentes, no un juego propio. No se usan emojis como iconos.

## Texto y formatos

- Interfaz en catalán y castellano. Frases cortas, sin jerga: "Sin conexión · 3 cambios pendientes", "2 conflictos por resolver".
- En la interfaz se dice **"encargo"** (ca: "encàrrec"), no "pedido".
- Los botones dicen lo que hacen: "Guardar", "Nuevo encargo", "Entregar", "Marcar pagado". Nunca "Aceptar".
- **Peso:** en gramos por debajo del kilo y en kilos desde el kilo, sin ceros de más: `750 g`, `1 kg`, `1,5 kg`, `2,48 kg`. Se escribe en gramos o en kilos con un selector g / kg y la conversión es automática; siempre se guarda en gramos.
- Unidades: `6 u`. Progreso: `3 de 5 encargos preparados`.
- Dinero (tickets, y precios cuando los hay): `12,50 €` (coma decimal, espacio, símbolo detrás). Un importe estimado lleva `≈` delante.
- Horas en 24 h: `11:00`. Fechas: `Jueves 17`, `12/12 10:41`.

## Lo que este sistema no tiene todavía

- Tema oscuro.
- Logotipo: el nombre se escribe en `display`. Las empresas tampoco suben logotipo; se identifican por nombre y color.
