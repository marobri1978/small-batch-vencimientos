# Vencimientos · Espacio Small Batch

Tablero interno para que una vinoteca chica controle todo lo que vence: habilitaciones, seguros, matafuegos, acuerdos de consignación con productores, listas de precios de distribuidores y permisos de cata. La app calcula el estado de cada documento con la fecha de hoy y muestra avisos en pantalla antes de que sea tarde.

> **Es una demo.** Todo se guarda en el `localStorage` de este navegador. No hay backend, no hay cuentas, no se mandan correos ni mensajes, y no se sincroniza entre dispositivos. Los documentos, montos y plazos son de ejemplo, y la app no controla el cumplimiento de ninguna norma: solo ordena fechas.

## Cómo arrancarlo

Requisitos: Node 18 o más nuevo.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # pruebas automatizadas (Vitest + Testing Library)
npm run build      # build de producción en dist/
npm run preview    # sirve el build
```

El build usa `base: './'` y `HashRouter`, así que funciona en cualquier hosting estático o URL de previsualización sin configurar redirecciones.

Stack: React 18 + TypeScript + Vite + Tailwind CSS 3 + React Router. Compatible con la estructura de proyectos de Lovable.

## Pantallas

| Ruta | Pantalla | Qué se hace |
| --- | --- | --- |
| `#/` | **Avisos** | Contadores de urgencia (Vencidos, Por vencer) y En gestión aparte. Avisos sin ver con «Ya lo vi», «En gestión» y «Renovar». En cero: «Todo en orden por hoy». |
| `#/documentos` | **Documentos** | Lista ordenada por urgencia, búsqueda y filtros: Activos, Vencidos, Por vencer, Vigentes, En gestión, Dados de baja. Alta de documento. |
| `#/documentos/:id` | **Detalle de documento** | Estado, días restantes, dónde está el original, a quién llamar. Renovar, Ya lo vi, En gestión / Quitar de gestión, Editar datos, Dar de baja. Historial. |
| `#/contrapartes` | **Contrapartes** | Agrupadas por tipo (El local, Productores, Distribuidores, Servicios), activas y dadas de baja. Alta. |
| `#/contrapartes/:id` | **Detalle de contraparte** | Sus documentos, agregar documento, editar, dar de baja (bloqueado con documentos activos), reactivar. |
| `#/agenda` | **Agenda del mes** | Calendario con cada vencimiento en su día, lista del mes con montos y total. Navegación entre meses (`?mes=AAAA-MM`). |

El encabezado muestra la marca de avisos sin ver en todas las pantallas. El menú ☰ tiene atajos para cargar documentos y contrapartes, y **Reiniciar datos de ejemplo**.

## Modelo de datos

Definido en [`src/domain/types.ts`](src/domain/types.ts).

- **Contraparte** (`CP-0001`…): nombre, tipo (`local`, `productor`, `distribuidor`, `servicio`), cómo ubicarla, notas, estado guardado `activa | baja`.
- **Documento** (`DOC-0001`…): pertenece a una contraparte (`counterpartyId`) y a un tipo del catálogo. Guarda inicio, vencimiento, monto, dónde está el original, notas, estado guardado `activo | en_gestion | baja`, la marca de visto (`seenAt`, `seenStatus`) y el historial (`H-0001`…).
- **Correlativos**: `counters` dentro de los mismos datos. Como cada acción guarda los datos completos de una vez, si el guardado falla no avanzan.

**Estados que ve la gente** (calculados, nunca guardados), en [`src/domain/status.ts`](src/domain/status.ts):

| Estado | Regla |
| --- | --- |
| Vigente | faltan más días que los días de aviso del tipo |
| Por vencer | faltan entre 0 y los días de aviso |
| Vencido | la fecha ya pasó |
| En gestión | lo marca una persona; conserva la fecha y sale de los contadores de urgencia |
| Dado de baja | ya no aplica; no genera avisos ni bloquea la baja de la contraparte |

**Avisos**: cada documento Por vencer o Vencido genera uno. Cuenta en la marca si no fue visto, si pasaron 3 días desde «Ya lo vi», o si pasó de Por vencer a Vencido después de verlo. Renovar, pasar a En gestión o dar de baja lo sacan. Una lista de precios vencida muestra «No vender con esta lista».

## Vigencia con fecha de referencia

- Hay **una sola fecha de hoy** para toda la app: `TodayProvider` en [`src/state/store.tsx`](src/state/store.tsx). En uso normal es la fecha actual del negocio en hora de Argentina (`America/Argentina/Buenos_Aires`) y se actualiza sola al pasar la medianoche.
- Lista, avisos, detalle y agenda calculan con esa fecha. El mes visible de la agenda es solo un parámetro de la vista: cambiarlo no cambia hoy ni renueva nada.
- No hay pantalla para cambiar el reloj. Solo las pruebas fijan la fecha (ver abajo).

## Qué está simulado

| Pieza | En esta demo | Para producción (lo integra Kodarvia) |
| --- | --- | --- |
| Persistencia | `localStorage`, clave `small-batch-vencimientos:v1` | Backend y base de datos |
| Avisos | Solo en pantalla | Notificaciones reales si se definen |
| Contacto con contrapartes | Texto de referencia («Vendedor de zona, pasa los martes») | No hay mensajes, llamadas ni correos |
| Archivos | No se suben: se anota dónde está el original | — |
| Usuarios | Sin cuentas ni autenticación | — |

Los formularios y confirmaciones lo avisan: «Demo: se guarda solo en este navegador. Guardar no contacta al negocio…».

**Guardado seguro**: cada acción es una función pura ([`src/domain/actions.ts`](src/domain/actions.ts)) que devuelve una copia completa de los datos. Primero se guarda en `localStorage` y recién después se actualiza la pantalla y se muestra el éxito. Si el navegador rechaza el guardado (sin espacio, modo privado), el formulario queda abierto con lo escrito y no cambia nada.

## Datos de ejemplo y cómo reiniciarlos

La semilla ([`src/domain/seed.ts`](src/domain/seed.ts)) se carga **solo si no existe la clave** `small-batch-vencimientos:v1`. Las fechas se calculan desde el día en que se carga, así la demo siempre muestra la misma situación:

- **9 contrapartes**: El Local; los productores Viñas del Arroyo Hondo, Viñas de la Meseta y Finca Cuatro Vientos; los distribuidores Distribuidora Atlántica y Vinos del Litoral; los servicios Matafuegos Costa, Control de Plagas Sur y Seguros del Puerto.
- **15 documentos**: los cinco primeros tipos para el Local (dos matafuegos), un acuerdo por productor, una lista por distribuidor, dos permisos de cata para los próximos sábados, y dos ya dados de baja (la lista anterior de Distribuidora Atlántica y el permiso de cata del sábado pasado).
- Situación que se ve al abrir: lista de Distribuidora Atlántica **Por vencer con 4 días** (cargada hace 17, dura 21), lista de Vinos del Litoral **Vencida** con «No vender con esta lista», matafuegos del salón **Vencido**, acuerdo con Viñas del Arroyo Hondo y permiso de bebidas Por vencer (el permiso ya marcado como visto ayer), seguro integral **En gestión**, el permiso de cata del próximo sábado Por vencer (avisa 7 días antes), y el resto Vigente.

Todos los nombres y datos son sintéticos. No hay información personal de nadie.

**Para reiniciar** (volver a la semilla con fechas desde hoy), cualquiera de estas opciones:

1. Menú ☰ → **Reiniciar datos de ejemplo** → Reiniciar.
2. En la consola del navegador: `localStorage.removeItem('small-batch-vencimientos:v1')` y recargar.

## Pruebas

```bash
npm test
```

- **Fecha de referencia fija**: [`src/test/referencia.ts`](src/test/referencia.ts) fija `REF = '2026-12-10'`. Las pruebas usan esa fecha y una copia aislada de la semilla (o un `localStorage` vacío de jsdom), sin tocar el catálogo inicial ni sus totales.
- [`src/test/vigencia.test.ts`](src/test/vigencia.test.ts): reglas de dominio. Caso de aceptación (17 días de 21 → Por vencer con 4; renovar hoy → Vigente con 21), límites exactos (6/5/0/−1 días), vencido automático, «Ya lo vi» y su vuelta a los 3 días o al vencer, En gestión fuera de los contadores, total de la agenda, baja de contraparte bloqueada, guardado fallido sin cambios, semilla solo sin clave.
- [`src/test/pruebaGuiada.test.tsx`](src/test/pruebaGuiada.test.tsx): la **prueba guiada** sobre la app completa renderizada. Ver abajo.

## Prueba guiada (manual, reproducible)

> Con 4 días restantes aparece Por vencer en todas las vistas. Navegar al mes siguiente no cambia ese estado y renovar con fecha actual sí lo actualiza.

1. Reiniciá los datos de ejemplo (menú ☰). La lista de **Distribuidora Atlántica** queda cargada hace 17 días con 21 de duración.
2. **Avisos**: la tarjeta «Lista de precios vigente» dice **Por vencer** y «Vence en 4 días». Anotá el número de la marca del encabezado.
3. **Documentos**: la misma tarjeta dice **Por vencer**.
4. Tocála. En el **detalle**: **Por vencer**, «Vence en 4 días».
5. **Agenda**: el día de vencimiento (hoy + 4) tiene el punto amarillo y en la lista del mes figura **Por vencer**.
6. Tocá **›** (mes siguiente) y volvé. El encabezado sigue diciendo «Hoy es…» con la misma fecha, la marca no cambió y la lista sigue **Por vencer**.
7. Desde el detalle, **Renovar**: la fecha de renovación viene con hoy y el nuevo vencimiento con hoy + 21. Guardá.
8. El documento pasa a **Vigente**, «Vence en 21 días», el historial suma la línea «Renovado desde…» y la marca baja en 1.
9. Recargá la página: todo sigue igual.

La versión automatizada de estos pasos corre en `npm test` con la fecha fija `2026-12-10`.

## Estructura

```
src/
  domain/      tipos, catálogo, fechas, estados y acciones puras (sin React)
  state/       localStorage, fecha de referencia y store
  components/  layout, tarjetas, hojas de formulario, piezas de UI
  screens/     las seis pantallas
  test/        fecha de referencia fija y pruebas
```

## Identidad visual

Pizarra de vinoteca escrita a tiza sobre papel crudo. Tinto `#4A1C2C` (pizarra, texto), papel `#F5EFE4` (fondo), bordó `#8C2F39` (En gestión, acentos), dorado `#D9B44A` (Por vencer, subrayados), oliva `#5E7D4E` (Vigente), lacre `#B33A2B` (Vencido, «No vender»), blanco `#FFFFFF` (etiquetas). Títulos en Playfair Display, texto en Work Sans. El estado se lee siempre con la palabra y el color.
