# Cupper & Hannia — API (BlackSilver)

API del ERP Cupper & Hannia para la industria minera. Digitaliza y conecta operaciones logísticas entre el corporativo (compras, finanzas) y el campo (almacenes remotos en mina, distribución de insumos).

## Módulos

- **Configuración**: Empresas, Almacenes, Concesiones, Minas/Labores, Contratistas, Organigrama
- **Inventarios**: Productos, Categorías, Lotes, Kardex
- **Compras**: Proveedores, Clientes, Cotizaciones, Órdenes de Compra, Transferencias de OC
- **Salidas de almacén**: Requerimientos (atención), Solicitudes de Reabastecimiento (atención), Préstamos entre Almacenes (atención)
- **Personal y accesos**: Empleados, Login, Perfil, Roles, Cuentas
- **Operaciones**: Activos Fijos, Control de Uso, Mantenimiento, Control de Consumo, Producción Mineral, Lote Mineral
- **RR.HH.**: Programación de Horarios, Asistencia, Planilla, Contratos de Empleado
- **Otros**: Modo Auditoría, Personal Externo

## Stack

- React 19 (con Babel React Compiler) + Vite 7
- Mantine v8 (Core, Dates, Charts, Notifications, Modals, Tiptap, etc.)
- Zustand v5 para estado global
- React Router v7
- Axios con interceptor JWT (auto-logout en 401)
- Zod para validación
- Tailwind CSS v4
- Animaciones: Motion, GSAP, Anime.js
- PDF/Excel: `@react-pdf/renderer`, `exceljs`
- WebSockets: Laravel Echo + Pusher

## Estructura

```
src/
├── hooks/                 # transversales (useAuthUser, useNotify, useExcel, useJsonScanner...)
├── modules/<dominio>/     # cada módulo: hooks/ + presentation/ + service/
│   └── service/
│       ├── requests.ts    # DTOs de envío
│       ├── responses.ts   # DTOs de respuesta
│       └── service.ts     # métodos API
├── presentation/
│   ├── layouts/           # public, auth, generic
│   ├── pages/             # home, placeholder
│   ├── root/              # App, main, ProtectedRoute, PublicRoute
│   └── utils/             # DataTableEstandar, ModalEstandar, JsonScanner, forms rápidos, PDF, Excel, Printer
├── service/               # _api (interceptor), _socket (WS), auxiliar (catálogos), archivo, menu-nav
├── shared/
│   ├── enums/             # mapeo 1:1 de PHP Backed Enums
│   ├── functions/         # cn (tw-merge), formatNumber, get-coincidencias, en-plural, mm-to-pt
│   ├── interfaces/        # _response y contratos genéricos
│   └── variables/         # meses, monedas, íconos
└── stores/                # auth, menu, ui, auditoria, excel, printer, blackcito
```

## Componentes base (`src/presentation/utils`)

- **`DataTableEstandar`**: grilla maestra (envuelve `mantine-datatable`). Props: `columns`, `records`, `loading`, `idAccessor?`, `initialPageSize=25`, `columnGroups?`. Acepta y propaga cualquier prop extra de `mantine-datatable`. Estilo dark consistente (`bg-zinc-900/50`, header `bg-zinc-900/80`, paginación `bg-zinc-900/50 border-t border-zinc-800`, `striped` + `highlightOnHover`). **Tiene excepción al uso de `any` por diseño genérico.**
  - Indexado automático: declarar `{accessor: "index", title: "#"}` hace que el componente calcule el número absoluto. **No usar `render` para el `#`.**
  - Auto-UUID: si se omite `idAccessor` o `accessor`/`id` en columnas o grupos, se asigna uno estable por instancia/referencia.
  - `columnGroups`: array de `DataTableColumnGroup` para cabeceras agrupadas multi-nivel. Si se usa, toda columna del body debe estar referenciada desde algún grupo.
- **`ModalEstandar`**: wrapper de `Modal` con layout premium. Props: `opened`, `close`, `title`, `children`, `rightSection?`, `validateClose?` (abre confirmación al cerrar), `closeConfirmationTitle?`, `closeConfirmationMessage?`. Si `validateClose`, Enter se mantiene en "Cancelar" (acción segura).
- **`JsonScanner`**: input compacto para códigos de barras (pegado o lector USB). Limpia el input 300ms después de leer. Badge `indigo` con conteo cuando filtra.
- **`date-picker-input`**: selector de fechas unificado (`CustomDatePicker`).
- **`form-{marca,personal-externo,categoria,producto,proveedor,...}.tsx`**: formularios auto-contenidos para crear catálogos en procesos concurrentes.
- **`archivo/`**: card de adjuntos + multi-file picker drag & drop.
- **`excel/GlobalExcelPortal`**: portal flotante para colas de exportación pesadas (no bloquea el hilo principal).
- **`printer/GlobalPrinterPortal`**: cola de impresión de vales físicos.
- **Plantillas PDF** (`orden-compra-pdf`, `ticket-lote-pdf`, `fotocheck-pdf`): generadores con `@react-pdf/renderer`.

## Hooks globales (`src/hooks`)

- `useAuthUser` — sesión, login, logout, permisos reactivos.
- `useNotify` — `notifySuccess` / `notifyError` / `notifyInfo` (envoltorio de Mantine notifications).
- `useMenuNav` — carga y filtra el menú por rol.
- `useExcel` — generación asíncrona de Excel.
- `usePrint` / `useDownloadFile` — impresión y descarga.
- `useJsonScanner` — parsing de QR/códigos de barras.
- `useTitlePage` — sincroniza `<title>` con módulo activo.
- `useBlackcito` — asistente animado.
- `usePersonalExterno` — helper de catálogo de personal externo.

## Servicios (`src/service`)

- **`_api.ts`** — Axios con interceptor JWT. Inyecta `Bearer` automático, loguea request/response. En 401 limpia `auth`, `menu`, `perfil` y notifica "Sesión expirada".
- **`_socket.ts`** — Laravel Echo + Pusher para eventos en tiempo real (ej. cambio global del Modo Auditoría).
- **`auxiliar.service.ts`** — hub de catálogos compartidos (`get_productos`, `get_almacenes`, `get_marcas`, `get_empleados`, etc.).
- **`archivo.service.ts`** — gestión de adjuntos.
- **`menu-nav.service.ts`** — árbol de menús por rol.
- **`responses/`** — interfaces TypeScript (`.ts`) que mapean al 100% las respuestas HTTP de la API, módulo por módulo.

## Búsqueda tolerante en catálogos (`shared/functions/get-coincidencias.ts`)

`getCoincidencias(list, query, options)` es la utilidad **obligatoria** para alimentar cualquier `Select` con `searchable` que muestre un catálogo (productos, unidades de medida, marcas, categorías, contratistas, etc.). Combina dos motores:

- **Fuse.js** (distancia de caracteres, `fuseThreshold=0.4` por defecto) — captura errores ortográficos: escribir `"guas"` encuentra `Guía`; `"mtr"` encuentra `Metro`.
- **FlexSearch** (tokenización forward) — captura orden de palabras: `"metro cuadrado"` encuentra `Metro cuadrado` aunque el usuario tipee las palabras al revés.
- **Substring normalizado (fallback automático)** — si Fuse y FlexSearch no encuentran resultados (caso típico: queries muy cortas de 1-3 caracteres, donde el algoritmo Bitap de Fuse 7 puede fallar), se aplica un `includes()` con texto normalizado sin tildes, independientemente de cómo esté almacenado el nombre en la DB.

Soporta listas de strings o de objetos mediante genéricos `<T>`. Normaliza tildes y mayúsculas por defecto (`useNormalization: true`).

### Cómo usarla en un `Select` (patrón recomendado)

```tsx
import { getCoincidencias } from "../../../shared/functions/get-coincidencias";

const [productoBusqueda, setProductoBusqueda] = useState("");

// Memo para no recalcular en cada render. Si la query está vacía,
// devolvemos la lista completa SIN invocar getCoincidencias (ahorra CPU).
const productosVisibles = useMemo(() => {
  const q = productoBusqueda.trim();
  if (!q) return productosFiltrados;
  return getCoincidencias(productosFiltrados, q, {
    keys: ["nombre", "categoria"],
    fuseThreshold: 0.4,
  }).map((r) => r.item);
}, [productosFiltrados, productoBusqueda]);

<Select
  label="Producto"
  data={productosVisibles.map((p) => ({ value: String(p.id_producto), label: p.nombre }))}
  value={idProducto ? String(idProducto) : null}
  onChange={(val) => setIdProducto(Number(val))}
  searchable
  searchValue={productoBusqueda}
  onSearchChange={setProductoBusqueda}
  nothingFoundMessage="Sin coincidencias"
  ...
/>
```

El control `searchValue` / `onSearchChange` mantiene la query controlada por el hook (limpia al seleccionar, resetea al agregar el ítem a la lista, etc.). El helper ya está en uso en:

- `form-categoria.tsx`, `form-marca.tsx`, `form-unidad-medida.tsx` (catálogos rápidos de creación).
- `useNavbar` (search del sidebar).
- `useProductos` (catálogo), `useRegistroProducto` (categorías + unidades), `useRegistroCategoria` (validación de duplicados).
- `useRegistroRequerimiento` (productos y unidades de medida del formulario de requerimientos).

### Cuándo usarla

**Siempre** en `Select` con `searchable` cuyo `data` venga de un catálogo (productos, unidades, marcas, contratistas, empleados, áreas, cargos, bancos, agencias, categorías, lotes, minas, labores, oficinas, proveedores, clientes, activos fijos, roles, etc).

**NO** usarla para:

- Búsqueda dentro de un JSON crudo (usar `useJsonScanner`).
- Filtrado binario exacto sobre un campo puntual (ej. `id` específico).
- Listas muy pequeñas (< 10 ítems) donde el searchable nativo de Mantine basta.

---

## Reglas de código

1. **Sin `any`**. A excepción de que usar any sea justamente lo deseado, como por ejemplo en `DataTableEstandar`.
2. **Sin reutilización forzada**. Registrar y Editar son hooks/componentes separados si tienen reglas distintas. Mejor dos cosas claras que una "universal" compleja.
3. **Formularios**: `useState` + helper `setField` + `Schema.safeParse()` con Zod. NO usar `useForm` de Mantine salvo que el módulo ya lo use.
4. **Notificaciones**: SIEMPRE `useNotify()` con notifySuccess, notifyError o notifyInfo. Prohibido usar `@mantine/notifications` directo.
5. **Style Props de Mantine v8** (`c`, `bg`, `fz`, `fw`, `p`, `m`, `gap`, `justify`, `align`, etc.). NUNCA `sx` (no existe en v8) ni nombres CSS completos como prop.
6. **Paleta válida Mantine v8**: `dark, gray, red, pink, grape, violet, indigo, blue, cyan, teal, green, lime, yellow, orange` con tinte `.0`–`.9` (default `.6`). `indigo` es el primario; `yellow` reemplaza "amber" para advertencias; `teal` para PEN. Cualquier otro nombre (`amber`, `gold`, `crimson`, `purple`, `silver`, etc.) se ignora silenciosamente y el componente renderiza sin color.
7. **Inputs**: `size="xs"` y `radius="lg"` en `TextInput`, `Select`, `NumberInput`, `Button`. `Select`/`MultiSelect` siempre con `searchable`; dentro de `Modal` añadir `popoverProps={{ withinPortal: true }}`. `NumberInput` con `hideControls` en tablas y `fixedDecimalScale` para montos.
8. **Estilo dark premium**: inputs con `bg-zinc-900/50 border-zinc-800`, focus `border-zinc-300 ring-zinc-300`, `transition-all`. Sombras suaves (`shadow-lg shadow-indigo-900/20`), `backdrop-blur`, bordes sutiles. Badges `variant="light"` o `filled"`.
9. **DataTable `#` automático**: usar `{accessor: "index", title: "#"}`. NUNCA implementar `render` para el número correlativo.
10. **ActionIcon**: la prop `size` controla el botón, NO el ícono. Para íconos visibles en filas usar `size="md"` o mayor y definir el tamaño del ícono manualmente (`className="w-4 h-4"` en Heroicons o `size={16}` en Tabler).
11. **Selects con `searchable` sobre catálogos**: usar SIEMPRE `getCoincidencias` (Fuse + FlexSearch) para filtrar `data`. Ver sección "Búsqueda tolerante en catálogos" más arriba. Patrón: `useMemo` con early-return cuando la query está vacía, `searchValue` + `onSearchChange` controlados, `nothingFoundMessage` para feedback cuando no hay coincidencias.

## Catálogo Mantine v8 (instalado)

Solo se pueden usar estos. Si falta uno, **avisar antes de instalar**.

### Componentes core
- **Layout**: AppShell, AspectRatio, Center, Container, Flex, Grid, Group, SimpleGrid, Space, Stack
- **Inputs**: AngleSlider, Checkbox, Chip, ColorInput, ColorPicker, Fieldset, FileInput, Input, JsonInput, NativeSelect, NumberInput, PasswordInput, PinInput, Radio, RangeSlider, Rating, SegmentedControl, Slider, Switch, Textarea, TextInput
- **Combobox**: Autocomplete, MultiSelect, Pill, PillsInput, Select, TagsInput
- **Buttons**: ActionIcon, Button, CloseButton, CopyButton, FileButton, UnstyledButton
- **Navigation**: Anchor, Breadcrumbs, Burger, NavLink, Pagination, Stepper, TableOfContents, Tabs, Tree
- **Feedback**: Alert, Loader, Notification, Progress, RingProgress, SemiCircleProgress, Skeleton
- **Overlays**: Affix, Dialog, Drawer, FloatingIndicator, HoverCard, LoadingOverlay, Menu, Modal, Overlay, Popover, Tooltip
- **Data display**: Accordion, Avatar, BackgroundImage, Badge, Card, ColorSwatch, Image, Indicator, Kbd, NumberFormatter, Spoiler, ThemeIcon, Timeline
- **Typography**: Blockquote, Code, Highlight, List, Mark, Table, Text, Title
- **Misc**: Box, Collapse, Divider, FocusTrap, Paper, Portal, ScrollArea, Transition, VisuallyHidden

### Extensiones
- **Dates**: MiniCalendar, Calendar, DateTimePicker, DatePicker, DatePickerInput, DateInput, MonthPicker, MonthPickerInput, YearPicker, YearPickerInput, TimeInput, TimePicker, TimeGrid, TimeValue
- **Charts**: AreaChart, BarChart, LineChart, CompositeChart, DonutChart, PieChart, FunnelChart, RadarChart, ScatterChart, BubbleChart, RadialBarChart, Sparkline, Heatmap
- **Otras**: CodeHighlight, Notifications, Spotlight, Carousel, Dropzone, NavigationProgress, Modals manager, Rich text editor (Tiptap)

### Hooks (@mantine/hooks)
- **UI/Dom**: use-click-outside, use-color-scheme, use-element-size, use-event-listener, use-file-dialog, use-focus-return, use-focus-trap, use-focus-within, use-fullscreen, use-hotkeys, use-hover, use-in-viewport, use-intersection, use-long-press, use-media-query, use-mouse, use-move, use-mutation-observer, use-orientation, use-radial-move, use-reduced-motion, use-resize-observer, use-scroll-into-view, use-scroll-spy, use-viewport-size, use-window-event, use-window-scroll
- **State**: use-counter, use-debounced-callback, use-debounced-state, use-debounced-value, use-disclosure, use-id, use-input-state, use-list-state, use-local-storage, use-map, use-pagination, use-previous, use-queue, use-selection, use-set, use-set-state, use-state-history, use-throttled-callback, use-throttled-state, use-throttled-value, use-toggle, use-uncontrolled, use-validated-state
- **Utilities**: use-clipboard, use-document-title, use-document-visibility, use-eye-dropper, use-favicon, use-fetch, use-hash, use-headroom, use-idle, use-interval, use-merged-ref, use-network, use-os, use-page-leave, use-text-selection, use-timeout
- **Lifecycle**: use-did-update, use-force-update, use-is-first-render, use-isomorphic-effect, use-logger, use-mounted, use-shallow-effect

## Ejecución

```bash
# Setup (una vez)
npm install

# Diario
npm run dev
```

## Reglas para IA

1. **Leer este README completo antes de actuar.** Es la fuente de verdad del front. Si el usuario da contexto que contradice esto, avisar antes de cambiar nada.
2. **Verificar versiones en `package.json`** antes de usar APIs de librerías. Si hay duda sobre comportamiento actual (ej. nuevas props de Mantine v8, React 19, Vite 7, etc.), **buscar en internet** — el entrenamiento del modelo puede estar desactualizado o diferir con docs vigentes.
3. **No commitear ni hacer push** sin que el usuario lo pida explícitamente.
4. **No inventar componentes**. Solo usar los del "Catálogo Mantine v8" arriba. Si falta uno, preguntar antes de instalar.
5. **Respetar las "Reglas de código"**. Si una idea las rompe, plantear la alternativa antes de codear.
6. **Cuestionar reusos forzados**. Si piden "un componente que sirva para X e Y", proponer separar antes.
7. Después de cualquier cambio: `npm run build` (tsc + vite build; no confiar solo en `tsc --noEmit`).
- No muestres lo que no aporta valor
- Pon en practica los 9 principios de diseño con criterio segun aplique: Balance (Simetrico, asimetrico, radial), Contraste, Enfasis, Proporción, Repeticiones y patrones, Movimiento, Espacio en blanco, Variedad, Union y armonia
- Sugerencias:
  - Aplica el "uso" como el lenguaje humano: Las interfaces deben hablar como una persona, sin documentacion, algo claro, los humanos construyen palabras simples y claras
  - Meno es mas: No muestres toda la informacion en un solo lugar o de una sola manera. Rompe el contenido en secciones que lo usuarios puedan rapidamente encontrar lo que mas les importa
  - Errores al instante: Mostrar errores instantaneamente que los usuarios pueden arreglar al momento es mejor que hacerlos esperar por una validacion
  - Usa CTAs claras: Usa etiquetas o textis que les diga a los usuarios lo que va a suceder despues. El texto orientado a resultados reduce las dudas.
  - Siempre hazte la pregunta: Se ve bien pero, es usable? Buscando siempre una respuesta optima.
- Pon en practicas los principios de usabilidad de Jakob Nielsen:
  - Visibilidad del estado del sistema, Relación entre el sistema y el mundo real. Control y libertad del usuario, Consistencia y estándares, Prevención de errores, Reconocer antes que recordar, Flexibilidad y eficiencia de uso, Diseño estético y minimalista, Ayudar a los usuarios a reconocer, diagnosticar y corregir los errores, Ayuda y documentación. No satures la pantalla con demasiada informacion dispersa