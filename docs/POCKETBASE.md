# PocketBase: guía verificada para este proyecto

_Todo lo que hay aquí se ha comprobado el 21/11/2026 contra un binario real de **PocketBase v0.40.6** (spike local). Si algo de lo que recuerdas de PocketBase contradice este documento, **manda este documento**._

Versión fijada: **v0.40.6**. No se actualiza sin un paso explícito del roadmap.

> ⚠ El repositorio de PocketBase en GitHub está archivado y el proyecto se muda a `ganigeorgiev.com`. Las versiones posteriores a la v0.40.6 no saldrán en GitHub. Por eso **no descargamos binarios**: compilamos desde el módulo Go fijado (el proxy de módulos de Go conserva una copia inmutable y `go.sum` verifica su hash).

## 1. Cómo obtenemos el binario (sin Docker, sin descargas)

`pb/` es un módulo Go mínimo. Compilar tarda unos 30 s la primera vez.

`pb/go.mod`:
```
module pedidator/pb

go 1.27

toolchain go1.27.3

require github.com/pocketbase/pocketbase v0.40.6
```
(el resto de `require` indirectos y `go.sum` los genera `go mod tidy`)

`pb/main.go`:
```go
package main

import (
	"log"
	"net/http"
	"os"
	_ "time/tzdata" // zonas horarias embebidas: sin esto, new Timezone("Europe/Madrid") devuelve UTC en silencio

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/jsvm"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
	"github.com/pocketbase/pocketbase/tools/hook"
)

func main() {
	app := pocketbase.New()

	var hooksDir, migrationsDir, publicDir string
	app.RootCmd.PersistentFlags().StringVar(&hooksDir, "hooksDir", "", "the directory with the JS app hooks")
	app.RootCmd.PersistentFlags().StringVar(&migrationsDir, "migrationsDir", "", "the directory with the migrations")
	app.RootCmd.PersistentFlags().StringVar(&publicDir, "publicDir", "pb_public", "the directory to serve static files")
	app.RootCmd.ParseFlags(os.Args[1:])

	jsvm.MustRegister(app, jsvm.Config{MigrationsDir: migrationsDir, HooksDir: hooksDir, HooksWatch: false})
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		TemplateLang: migratecmd.TemplateLangJS, Automigrate: false, Dir: migrationsDir,
	})

	// sirve la SPA desde pb_public con fallback a index.html
	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			if !e.Router.HasRoute(http.MethodGet, "/{path...}") {
				e.Router.GET("/{path...}", apis.Static(os.DirFS(publicDir), true))
			}
			return e.Next()
		},
		Priority: 999,
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
```

Comandos:
```bash
cd pb && CGO_ENABLED=0 go build -o ../.bin/pocketbase .        # compilar (Go ≥1.24 se baja solo el toolchain 1.27.3)
.bin/pocketbase superuser upsert EMAIL PASS --dir DIR           # crear superusuario (solo infraestructura y tests)
.bin/pocketbase migrate up --dir DIR --migrationsDir pb/pb_migrations
.bin/pocketbase serve --http 127.0.0.1:PORT --dir DIR --hooksDir pb/pb_hooks --migrationsDir pb/pb_migrations --publicDir dist
```
- `serve` aplica las migraciones pendientes al arrancar.
- `GET /api/health` responde 200 cuando está listo.
- Los tipos de la API JS están en `<DIR>/types.d.ts` (se genera al arrancar) y en el código fuente del módulo: `go list -m -f '{{.Dir}}' github.com/pocketbase/pocketbase` → `plugins/jsvm/internal/types/generated/types.d.ts`. **Consulta ese archivo antes de inventar un método.** La web `pocketbase.io` no es accesible desde el entorno cloud.

## 2. Motor JavaScript de los hooks (goja): qué hay y qué no

Comprobado:

| Disponible | NO disponible |
|---|---|
| `require()` CommonJS de archivos locales | `import` / ES modules, TypeScript |
| Sintaxis ES2020 (`?.`, `??`, `flat`, `Object.fromEntries`), `Promise` (el tipo) | `Intl`, `fetch`, `setTimeout`/`setInterval`, APIs de Node, paquetes npm sin empaquetar |
| `new Timezone("Europe/Madrid")`, `new DateTime(...)`, `$os.getenv`, `$http.send`, `cronAdd`, `routerAdd` | `async/await` útil (todo es síncrono) |

Reglas:
- **Cada handler se ejecuta aislado.** Las variables y `require` declarados fuera del handler no existen dentro. Haz el `require` **dentro** de cada handler:
  ```js
  routerAdd("GET", "/api/x", (e) => {
    const shared = require(`${__hooks}/lib/shared.js`)
    // ...
  })
  ```
- El código compartido se escribe en TypeScript en `shared/` y se empaqueta a CommonJS con esbuild: `esbuild shared/index.ts --bundle --format=cjs --target=es2017 --outfile=pb/pb_hooks/lib/shared.js`. El resultado está en `.gitignore`; **no se edita a mano**.
- Los archivos de hooks deben llamarse `*.pb.js`. Los de `pb/pb_hooks/lib/` no llevan `.pb.` para que no se carguen como hooks.

## 3. Zona horaria (no existe `Intl`)

```js
const madrid = new Timezone("Europe/Madrid")
const t = new DateTime("2026-07-01 10:30:00.000Z").time().in(madrid)
t.hour()                      // 12 (verano) — en diciembre devuelve 11
t.format("2006-01-02 15:04")  // "2026-07-01 12:30"  (formato de Go: la fecha de referencia es 2006-01-02 15:04:05)
t.weekday()                   // 0 = domingo … 6 = sábado
new DateTime().time().in(madrid) // ahora, en Madrid
```
Los nombres de días y meses en ca/es salen de las traducciones de `shared/`, no del motor. **No escribas a mano reglas de horario de verano.**

## 4. Migraciones (`pb/pb_migrations/*.js`)

```js
/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const companies = new Collection({
    type: "base",
    name: "companies",
    listRule: '@request.auth.active = true && (id = @request.auth.company || @request.auth.role = "platform_admin")',
    viewRule: '@request.auth.active = true && (id = @request.auth.company || @request.auth.role = "platform_admin")',
    createRule: null, updateRule: null, deleteRule: null,   // null = solo superusuario y hooks
    fields: [
      { name: "name", type: "text", required: true },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  })
  app.save(companies)

  // ampliar la colección users que ya existe
  const users = app.findCollectionByNameOrId("users")
  users.fields.add(new RelationField({ name: "company", collectionId: companies.id, maxSelect: 1 }))
  users.fields.add(new SelectField({ name: "role", values: ["staff", "company_admin", "platform_admin"], maxSelect: 1, required: true }))
  users.fields.add(new BoolField({ name: "active" }))
  users.createRule = null
  users.updateRule = null
  users.deleteRule = null
  users.authRule = "active = true"                 // un usuario inactivo no puede hacer login
  users.authToken.duration = 30 * 24 * 3600        // 30 días
  app.save(users)
}, (app) => {
  // down: deshacer en orden inverso
})
```

Hechos comprobados:
- `created` y `updated` **no son automáticos**: hay que declararlos como campos `autodate`.
- El `id` por defecto ya es de 15 caracteres `[a-z0-9]` y **acepta el id que envía el cliente** si cumple el formato.
- Los índices son SQL tal cual y admiten índices parciales:
  `"CREATE UNIQUE INDEX idx_customers_namekey ON customers (company, nameKey) WHERE deleted = FALSE"`
- Tipos de campo usados: `text`, `number` (`onlyInt: true`), `bool`, `relation` (`collectionId`, `maxSelect: 1`), `select` (`values`, `maxSelect`), `json`, `date`, `autodate`, `file` (`maxSelect`, `maxSize`, `mimeTypes`, `thumbs: ["300x0"]`, `protected: true`).
- ⚠ **Por defecto `users` permite el registro público (`createRule = ""`) y que cada usuario edite su propio registro**, incluido cualquier campo nuevo como `role`. Por eso la migración pone las tres reglas de escritura a `null`.

## 5. Reglas de la API

- `null` = solo superusuarios y código de hooks. `""` = cualquiera. **En este proyecto todas las reglas de escritura (`createRule`, `updateRule`, `deleteRule`) de todas las colecciones son `null`.**
- Regla de lectura estándar para colecciones de negocio (`listRule` y `viewRule`):
  ```
  @request.auth.active = true && (company = @request.auth.company || @request.auth.role = "platform_admin")
  ```
- Los campos de `@request.auth.*` se leen de la base de datos **en cada petición**: al poner `active = false`, el token que ya tenía el usuario deja de servir al instante (lista vacía, `auth-refresh` 403, rutas propias 403 si comprueban `active`). Comprobado.
- Una petición que no cumple la regla de lectura recibe 404 en la vista y una lista vacía en el listado (no 403).
- El tiempo real aplica las mismas reglas de lectura y admite un filtro por suscripción (`filter`), que se usa para la empresa activa del `platform_admin`.

## 6. Rutas propias

```js
routerAdd("POST", "/api/sync/push", (e) => {
  const auth = e.auth                               // registro del usuario autenticado
  if (!auth.getBool("active")) throw new ForbiddenError("inactive")
  const body = e.requestInfo().body                 // JSON ya parseado
  const id = e.request.pathValue("id")              // parámetros de ruta: "/api/x/{id}"
  // ...
  return e.json(200, { results: [] })
}, $apis.requireAuth("users"))                      // 401 si no hay token de la colección users
```
- Errores: `throw new BadRequestError("msg")`, `ForbiddenError`, `NotFoundError`, `UnauthorizedError`.
- `$apis.requireSuperuserAuth()` para rutas solo de infraestructura.
- **`$apis.requireAuth` no comprueba `active`**: compruébalo siempre en el handler.

## 7. Registros y transacciones

```js
$app.runInTransaction((tx) => {
  // dentro de la transacción usa SIEMPRE tx, nunca $app
  let existing = null
  try {
    existing = tx.findFirstRecordByFilter("customers",
      "company = {:c} && nameKey = {:k} && deleted = false", { c: company, k: key })
  } catch (_) { /* no encontrado: lanza excepción, no devuelve null */ }

  const rec = new Record(tx.findCollectionByNameOrId("customers"))
  rec.set("id", op.recordId)        // id del cliente
  rec.set("company", company)
  rec.set("version", 1)
  rec.set("updatedBy", auth.id)
  tx.save(rec)                      // valida campos, se salta las reglas de la API, emite tiempo real al confirmar
})
```
- `findRecordById(col, id)` y `findFirstRecordByFilter(...)` **lanzan excepción** si no hay resultado: envuelve en `try/catch`.
- `findRecordsByFilter(col, filter, sort, limit, offset, params)`.
- Lectura de campos: `rec.getString("x")`, `getInt`, `getBool`, `get`. `rec.id`.
- Si el handler lanza una excepción dentro de `runInTransaction`, se deshace toda la transacción.
- Violación de índice único al guardar: el error es `GoError: company: Value must be unique; nameKey: Value must be unique.` No dependas de ese texto: **comprueba la existencia antes, dentro de la misma transacción** (SQLite tiene un único escritor, no hay carrera).
- Usuarios: `rec.setPassword("...")`, `rec.validatePassword("...")`, `rec.refreshTokenKey()` (invalida todos sus tokens).

## 8. Archivos

- Subida desde una ruta propia (las escrituras REST están bloqueadas):
  ```js
  routerAdd("POST", "/api/sync/upload/tickets/{id}", (e) => {
    const rec = $app.findRecordById("tickets", e.request.pathValue("id"))
    // comprobar empresa y active aquí
    const files = e.findUploadedFiles("photo")      // multipart, campo "photo"
    if (!files.length) throw new BadRequestError("missing photo")
    rec.set("photo", files[0])
    $app.save(rec)
    return e.json(200, { photo: rec.getString("photo") })
  }, $apis.requireAuth("users"))
  ```
- Campo `protected: true`: sin token de archivo la descarga da 404. El cliente pide `POST /api/files/token` (con su token de sesión) y añade `?token=...` a `/api/files/{colección}/{id}/{nombre}`. El servidor aplica la `viewRule` del registro: un usuario de otra empresa recibe 404. Comprobado.
- Miniaturas: `?thumb=300x0` (hay que declarar `thumbs: ["300x0"]` en el campo).

## 9. Cron, HTTP y entorno

```js
cronAdd("daily-summary", "0 * * * *", () => {       // expresiones en UTC
  const shared = require(`${__hooks}/lib/shared.js`)
  const hour = new DateTime().time().in(new Timezone("Europe/Madrid")).hour()
  // ...
})

const res = $http.send({
  url: "https://api.resend.com/emails",
  method: "POST",
  headers: { "Authorization": "Bearer " + $os.getenv("RESEND_API_KEY"), "Content-Type": "application/json" },
  body: JSON.stringify(payload),
  timeout: 30,
})
// res.statusCode, res.json
```
No hay `setTimeout`: un reintento "a los 15 minutos" se hace guardando la hora del reintento en la base de datos y comprobándola desde un cron cada 15 minutos.

## 10. Pruebas de integración

- El `globalSetup` de Vitest compila el binario si falta, crea un directorio temporal, ejecuta `superuser upsert`, arranca `serve` en un puerto libre y espera a `/api/health`.
- Los datos de prueba (empresas, usuarios) se crean con el token de superusuario por la API REST estándar (`POST /api/collections/_superusers/auth-with-password`); el superusuario se salta todas las reglas.
- Cada archivo de test crea sus propias empresas con nombres únicos; no se comparte estado entre archivos.
