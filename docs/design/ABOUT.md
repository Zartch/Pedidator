# Sistema de estilos (copia en el repositorio)

Copia de los archivos del sistema de diseño de Pedidator, para que cualquier paso del roadmap pueda leerlos sin salir del repositorio. El original, con vistas previas en vivo de cada componente y el selector de color por empresa, está publicado como artefacto de Claude (privado del propietario del proyecto).

| Archivo | Qué es |
|---|---|
| `README.md` | Las reglas: principios, color, tema por empresa, tipografía, tamaños táctiles, móvil y tablet, formatos de texto. **Léelo antes de hacer cualquier pantalla.** |
| `tokens.json` | Todos los tokens (colores por tema, tipografía, espaciado, radios, tamaños, cortes). De aquí sale `src/styles/tokens.css`. |
| `components.css` | Estilos de referencia de cada componente (`pd-*`). Son la especificación visual: en la app se implementan con Tailwind y shadcn/ui usando los mismos tokens, no se copia esta hoja. |
| `derive-brand.js` | Cálculo de los cuatro colores de marca a partir del color de la empresa. `shared/theme.ts` es su versión tipada y debe dar los mismos resultados. |
| `reference-behaviour.js` | Comportamiento de referencia de pesos (g / kg), progreso del día y composición del día de trabajo, tal como lo usan las vistas previas. Las reglas mandan en `docs/SPEC.md` §3. |

Si el sistema de estilos cambia, se actualiza el artefacto y se vuelve a copiar aquí en el mismo commit.
