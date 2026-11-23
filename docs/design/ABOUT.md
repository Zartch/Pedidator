# Sistema de estilos (copia en el repositorio)

Copia de los archivos del sistema de diseño de Pedidator, para que cualquier paso del roadmap pueda leerlos sin salir del repositorio. El original, con vistas previas en vivo de cada componente y el selector de color por empresa, está publicado como artefacto de Claude (privado del propietario del proyecto).

| Archivo | Qué es |
|---|---|
| `README.md` | Las reglas: principios, color, tema por empresa, tipografía, tamaños táctiles, móvil y tablet, formatos de texto. **Léelo antes de hacer cualquier pantalla.** |
| `tokens.json` | Todos los tokens (colores por tema, tipografía, espaciado, radios, tamaños, cortes). De aquí sale `src/styles/tokens.css`. |
| `components.css` | Estilos de referencia de cada componente (`pd-*`). Son la especificación visual: en la app se implementan con Tailwind y shadcn/ui usando los mismos tokens, no se copia esta hoja. |
| `derive-brand.js` | Cálculo de los cuatro colores de marca a partir del color de la empresa. `shared/theme.ts` es su versión tipada y debe dar los mismos resultados. |
| `screens/` | Maquetas de las pantallas (ver abajo). |
| `reference-behaviour.js` | Comportamiento de referencia de pesos (g / kg), progreso del día y composición del día de trabajo, tal como lo usan las vistas previas. Las reglas mandan en `docs/SPEC.md` §3. |

## Pantallas (`screens/`)

Maquetas de las pantallas, copiadas del lienzo de diseño "Pedidator · Pantallas". Son la referencia de **qué hay en cada pantalla, en qué orden y con qué componentes**. Cada archivo `.dc.html` es HTML con las clases `pd-*` de `components.css`; el bloque `<script>` del final solo da vida a la maqueta (no es código de la app).

| Archivo | Pantalla | Tamaño | Paso del roadmap |
|---|---|---|---|
| `screens/Main.dc.html` | Día de trabajo | móvil 390×844 | F1-3 (estructura), F1-4 |
| `screens/DiaTablet.dc.html` | Día de trabajo | tablet 1180×820 | F1-4 |
| `screens/Encargo.dc.html` | Formulario de encargo | móvil | F1-5 |
| `screens/EncargoTablet.dc.html` | Formulario de encargo | tablet | F1-5 |
| `screens/Tickets.dc.html` | Tickets pendientes | móvil | F1-7 |
| `screens/Cliente.dc.html` | Ficha de cliente | móvil | F1-8 |
| `screens/Conflictos.dc.html` | Conflictos | móvil | F2-10, F3-5 |
| `screens/Ajustes.dc.html` | Ajustes de la empresa | móvil | F2-12 |
| `screens/Login.dc.html` | Entrar | móvil | F2-8 |

Cómo leerlas:
- Los textos `{{así}}` son datos de ejemplo que rellena el script de la maqueta; `<sc-for>` repite un bloque por cada elemento y `<sc-if>` lo muestra según una condición.
- `pedidator-tokens.css` son los tokens tal como los usa el lienzo; `canvas.json` es el índice del lienzo. No se usan en la app.
- No tienen maqueta todavía: archivo, lista de clientes, diálogo de nuevo ticket, historial y administración de la plataforma. Se construyen con los mismos componentes y las reglas de `README.md`.
- Si una maqueta y `docs/SPEC.md` se contradicen, manda la SPEC; avisa en el informe del paso.

## Dónde están los originales

- Sistema de estilos (componentes en vivo y selector de color): https://claude.ai/artifact/BsJiqR3vd3AosyapuLVxbL
- Pantallas (lienzo, con modo Play): https://claude.ai/artifact/88N9ga8JQje9XPYbTpzEWG

Los dos son privados del propietario del proyecto. Si cambian, se vuelven a copiar aquí en el mismo commit.
