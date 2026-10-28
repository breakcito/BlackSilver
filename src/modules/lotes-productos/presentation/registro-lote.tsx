import { useMemo } from "react";
import {
  Button,
  Group,
  NumberInput,
  Select,
  Text,
  Textarea,
  Paper,
  Divider,
  TextInput,
  ActionIcon,
  Tooltip,
  Badge,
} from "@mantine/core";
import {
  ArchiveBoxIcon,
  ScaleIcon,
  InformationCircleIcon,
  PlusIcon,
  TrashIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import { useDisclosure } from "@mantine/hooks";
import dayjs from "dayjs";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import { RegistroProducto } from "../../productos/presentation/registro-producto";
import { enPlural } from "../../../shared/functions/en-plural";
import {
  useRegistroLote,
  type LoteAgregado,
} from "../hooks/useRegistroLote";
import type { RES_Lote } from "../service/lotes.responses";
import type { RES_Almacen } from "../../../service/responses/almacen";
import { CustomDatePicker } from "../../../presentation/utils/date-picker-input";
import { EstadoBase } from "../../../shared/enums/_generic/estado-base";

interface RegistroLoteProps {
  onSuccess: (lotes: RES_Lote[]) => void;
  onCancel: () => void;
  initialAlmacenId?: number | null;
  almacenes: RES_Almacen[];
}

export const RegistroLote = ({
  onSuccess,
  onCancel,
  initialAlmacenId,
  almacenes,
}: RegistroLoteProps) => {
  const [
    openedAddProducto,
    { open: openAddProducto, close: closeAddProducto },
  ] = useDisclosure(false);

  const {
    // Cabecera
    idAlmacen,
    setIdAlmacen,

    // Formulario de lote actual
    idProducto,
    setIdProducto,
    productoBusqueda,
    setProductoBusqueda,
    idUnidadMedida,
    setIdUnidadMedida,
    unidadBusqueda,
    setUnidadBusqueda,
    stockInicial,
    setStockInicial,
    contenidoPorPresentacion,
    setContenidoPorPresentacion,
    fechaHoraIngreso,
    setFechaHoraIngreso,
    fechaVencimiento,
    setFechaVencimiento,
    costoPorUnidad,
    setCostoPorUnidad,
    serieFactura,
    setSerieFactura,
    numeroFactura,
    setNumeroFactura,
    descripcion,
    setDescripcion,

    // Derivados del lote actual
    productoSeleccionado,
    unidadSeleccionada,
    unidadBase,
    sonIdenticas,
    conversionAutomatica,
    contenidoBloqueado,
    stockTotalBase,

    // Catálogos y filtrado
    catalogs,
    productosVisibles,
    unidadesVisibles,
    loadingProductos,
    loadingUnidades,

    // Tabla de lotes en cola
    lotes,
    anadirLote,
    eliminarLote,

    // Envío y control
    submitting,
    error,
    handleSubmit,
    recargarProductos,
  } = useRegistroLote({ initialAlmacenId, almacenes, onSuccess });

  const inputClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 text-xs",
    dropdown:
      "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
    option:
      "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium text-xs transition-colors",
    label: "text-zinc-300 mb-1 font-medium text-xs",
    description: "text-zinc-500 text-[11px] mt-1",
  };

  // Definición memoizada de columnas con tipografía coherente (text-xs)
  const tableColumns = useMemo(
    () => [
      {
        accessor: "index",
        title: "#",
        width: 45,
        textAlign: "center" as const,
      },
      {
        accessor: "producto_nombre",
        title: "Producto",
        render: (record: LoteAgregado) => (
          <div className="flex flex-col py-0.5">
            <Text size="xs" fw={700} className="text-zinc-100">
              {record.producto_nombre}
            </Text>
            {record.descripcion && (
              <Text size="xs" c="dimmed" className="italic line-clamp-1">
                {record.descripcion}
              </Text>
            )}
          </div>
        ),
      },
      {
        accessor: "stock_inicial",
        title: "Cant. Lote",
        textAlign: "right" as const,
        render: (record: LoteAgregado) => (
          <Text size="xs" fw={700} c="indigo.4">
            {record.stock_inicial}{" "}
            <span className="text-[10px] text-zinc-400 font-semibold uppercase">
              {record.unidad_abreviatura}
            </span>
          </Text>
        ),
      },
      {
        accessor: "stock_total_base",
        title: "Total Base",
        textAlign: "right" as const,
        render: (record: LoteAgregado) => (
          <Text size="xs" fw={700} c="pink.5">
            {record.stock_total_base}{" "}
            <span className="text-[10px] text-zinc-400 font-semibold uppercase">
              {record.unidad_base_abreviatura}
            </span>
          </Text>
        ),
      },
      {
        accessor: "fecha_hora_ingreso",
        title: "F. Ingreso",
        render: (record: LoteAgregado) => (
          <Text size="xs" className="text-zinc-300">
            {dayjs(record.fecha_hora_ingreso).format("DD/MM/YYYY")}
          </Text>
        ),
      },
      {
        accessor: "fecha_vencimiento",
        title: "F. Vcto",
        render: (record: LoteAgregado) =>
          record.es_perecible && record.fecha_vencimiento ? (
            <Text size="xs" className="text-amber-400 font-medium">
              {dayjs(record.fecha_vencimiento).format("DD/MM/YYYY")}
            </Text>
          ) : (
            <Badge variant="light" color="gray" size="xs">
              No perecible
            </Badge>
          ),
      },
      {
        accessor: "costo_por_unidad",
        title: "Costo Unit.",
        textAlign: "right" as const,
        render: (record: LoteAgregado) =>
          record.costo_por_unidad !== null &&
          record.costo_por_unidad !== undefined ? (
            <Text size="xs" fw={600} className="text-zinc-200">
              S/. {Number(record.costo_por_unidad).toFixed(2)}
            </Text>
          ) : (
            <Text size="xs" c="dimmed">
              ---
            </Text>
          ),
      },
      {
        accessor: "factura",
        title: "Factura",
        render: (record: LoteAgregado) =>
          record.serie_factura_compra || record.numero_factura_compra ? (
            <Text size="xs" className="text-zinc-300 font-mono">
              {[record.serie_factura_compra, record.numero_factura_compra]
                .filter(Boolean)
                .join("-")}
            </Text>
          ) : (
            <Text size="xs" c="dimmed">
              ---
            </Text>
          ),
      },
      {
        accessor: "acciones",
        title: "",
        width: 50,
        textAlign: "center" as const,
        render: (record: LoteAgregado) => (
          <Tooltip label="Quitar lote de la lista" position="left">
            <ActionIcon
              size="md"
              radius="lg"
              variant="subtle"
              color="red"
              onClick={() => eliminarLote(record.id)}
              disabled={submitting}
              className="text-zinc-500 hover:text-red-400 hover:bg-red-950/30"
              aria-label="Quitar lote"
            >
              <TrashIcon className="w-4 h-4" />
            </ActionIcon>
          </Tooltip>
        ),
      },
    ],
    [eliminarLote, submitting],
  );

  return (
    <div className="relative space-y-4 p-1">
      {/* ============ CABECERA: Almacén de Destino ============ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Almacén de Destino"
          placeholder="Seleccione almacén de destino..."
          withAsterisk
          className="md:col-span-2"
          data={almacenes.map((a) => ({
            value: String(a.id_almacen),
            label: a.nombre,
          }))}
          searchable
          value={idAlmacen ? String(idAlmacen) : null}
          onChange={(val) => setIdAlmacen(Number(val))}
          classNames={inputClasses}
          radius="lg"
          size="xs"
          comboboxProps={{
            withinPortal: true,
            zIndex: 9999,
            transitionProps: { transition: "pop", duration: 200 },
          }}
        />
      </div>

      <Divider className="border-zinc-800/40" />

      {/* ============ FORMULARIO DE LOTE ============ */}
      <Paper
        withBorder
        radius="lg"
        p="md"
        className="bg-zinc-900/30 border-zinc-800/60 shadow-sm space-y-3.5 relative"
      >
        {/* Encabezado del lote con botón 'Añadir lote' */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Text
              size="xs"
              fw={800}
              c="indigo.4"
              className="uppercase tracking-[0.2em] leading-none"
            >
              Lote #{lotes.length + 1}
            </Text>
            <Text size="xs" c="dimmed">
              (Configure los campos y añádalo a la lista)
            </Text>
          </div>

          <Button
            variant="light"
            color="indigo"
            radius="lg"
            size="compact-xs"
            leftSection={<PlusIcon className="w-3.5 h-3.5" />}
            onClick={anadirLote}
            disabled={submitting}
            className="font-bold shadow-xs"
          >
            Añadir lote
          </Button>
        </div>

        {/* FILA 1: Producto, Unidad de Medida, Cantidad, Contenido (4 inputs en una fila) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* 1. Producto */}
          <div className="flex flex-col gap-1">
            <Text size="xs" className={inputClasses.label}>
              Producto a ingresar <span className="text-red-500">*</span>
            </Text>
            <div className="flex gap-1.5 items-center">
              <Select
                placeholder="Buscar producto..."
                data={productosVisibles.map((p) => ({
                  value: String(p.id_producto),
                  label: p.nombre,
                }))}
                searchable
                searchValue={productoBusqueda}
                onSearchChange={setProductoBusqueda}
                nothingFoundMessage="Sin coincidencias"
                disabled={loadingProductos || submitting}
                value={idProducto ? String(idProducto) : null}
                onChange={(val) => setIdProducto(val ? Number(val) : null)}
                classNames={inputClasses}
                radius="lg"
                size="xs"
                comboboxProps={{
                  withinPortal: true,
                  zIndex: 9999,
                  transitionProps: { transition: "pop", duration: 200 },
                }}
                className="flex-1"
              />
              <ActionIcon
                size="lg"
                radius="lg"
                variant="filled"
                color="indigo"
                className="shrink-0 bg-indigo-600 hover:bg-indigo-700 transition-colors h-8 w-8"
                onClick={openAddProducto}
                title="Registrar nuevo producto"
                disabled={submitting}
              >
                <PlusIcon className="w-4 h-4 text-white" />
              </ActionIcon>
            </div>
          </div>

          {/* 2. Unidad de Medida */}
          <Select
            label="Unidad de Medida"
            placeholder="Ej: Caja, Bolsa, Saco..."
            data={unidadesVisibles.map((u) => ({
              value: String(u.id_unidad_medida),
              label: `${u.nombre} (${u.abreviatura})`,
            }))}
            searchable
            searchValue={unidadBusqueda}
            onSearchChange={setUnidadBusqueda}
            nothingFoundMessage="Sin coincidencias"
            withAsterisk
            disabled={loadingUnidades || submitting}
            value={idUnidadMedida ? String(idUnidadMedida) : null}
            onChange={(val) => setIdUnidadMedida(val ? Number(val) : null)}
            classNames={inputClasses}
            radius="lg"
            size="xs"
            comboboxProps={{
              withinPortal: true,
              zIndex: 9999,
              transitionProps: { transition: "pop", duration: 200 },
            }}
          />

          {/* 3. Cantidad de unidades */}
          <NumberInput
            label={`Cantidad de ${
              enPlural(unidadSeleccionada?.nombre) || "unidades"
            }`}
            min={0}
            placeholder="0"
            fixedDecimalScale
            withAsterisk
            value={stockInicial}
            onChange={(val) => setStockInicial(Number(val))}
            classNames={inputClasses}
            radius="lg"
            size="xs"
            disabled={submitting}
            leftSection={<ArchiveBoxIcon className="w-4 h-4 text-zinc-500" />}
          />

          {/* 4. Contenido */}
          <NumberInput
            label="Contenido"
            placeholder={
              sonIdenticas
                ? "1"
                : conversionAutomatica !== null &&
                    conversionAutomatica !== undefined
                  ? "Auto-completado"
                  : "Ingrese factor"
            }
            min={0.0001}
            fixedDecimalScale
            withAsterisk
            disabled={contenidoBloqueado || submitting}
            value={contenidoPorPresentacion}
            onChange={(val) => setContenidoPorPresentacion(Number(val))}
            classNames={inputClasses}
            radius="lg"
            size="xs"
            leftSection={<ScaleIcon className="w-4 h-4 text-zinc-500" />}
          />
        </div>

        <Divider className="border-zinc-800/40 my-1" />

        {/* FILA 2: Resumen de conversión a la izquierda | Fecha ingreso + Vencimiento a la derecha */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {/* Izquierda: Resumen de Conversión */}
          <Paper
            withBorder
            p="sm"
            radius="lg"
            className="bg-zinc-900/40 border-zinc-800/60 shadow-sm space-y-2 flex flex-col justify-between"
          >
            <Text
              size="xs"
              fw={800}
              className="uppercase tracking-[0.2em] leading-none text-zinc-500"
            >
              Resumen de Conversión
            </Text>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Text
                  size="xs"
                  c="indigo.4"
                  fw={700}
                  className="uppercase tracking-tight"
                >
                  Ingreso en lote
                </Text>
                <Text fw={800} size="xl" className="text-white leading-none">
                  {stockInicial || 0}{" "}
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">
                    {unidadSeleccionada?.abreviatura || "---"}
                  </span>
                </Text>
              </div>

              <div className="space-y-1">
                <Text
                  size="xs"
                  c="pink.5"
                  fw={700}
                  className="uppercase tracking-tight"
                >
                  Total base
                </Text>
                <Text fw={800} size="xl" className="text-pink-500 leading-none">
                  {stockTotalBase ?? 0}{" "}
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">
                    {unidadBase?.abreviatura || "---"}
                  </span>
                </Text>
              </div>
            </div>
          </Paper>

          {/* Derecha: Fecha de ingreso y Vencimiento / Info Producto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CustomDatePicker
              label="Fecha de ingreso"
              placeholder="Seleccione fecha de entrada"
              withAsterisk
              size="xs"
              value={fechaHoraIngreso}
              onChange={(date) => setFechaHoraIngreso(date as Date | null)}
              disabled={submitting}
            />

            {productoSeleccionado?.es_perecible ? (
              <CustomDatePicker
                label="Fecha de vencimiento"
                placeholder="Seleccione expiración"
                minDate={fechaHoraIngreso || undefined}
                size="xs"
                withAsterisk
                value={fechaVencimiento}
                onChange={(date) => setFechaVencimiento(date as Date | null)}
                disabled={submitting}
              />
            ) : (
              <div className="flex flex-col justify-center gap-1.5 p-2.5 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl h-full">
                <div className="flex items-center gap-1.5">
                  <InformationCircleIcon className="w-4 h-4 text-zinc-500 shrink-0" />
                  <Text size="xs" c="dimmed" className="italic font-medium">
                    Información de producto
                  </Text>
                </div>
                <Text size="xs" className="text-zinc-500 leading-snug">
                  Este producto ha sido configurado como{" "}
                  <span className="text-zinc-300 font-bold">No Perecible</span>,
                  por lo que no requiere fecha de vencimiento.
                </Text>
              </div>
            )}
          </div>
        </div>

        <Divider className="border-zinc-800/40 my-1" />

        {/* FILA 3: Costo, Serie Factura, Número Factura */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <NumberInput
            label={`Costo x ${
              unidadSeleccionada?.abreviatura || "---"
            } (S/.)`}
            placeholder="Ej: 15.50"
            min={0}
            decimalScale={2}
            value={
              costoPorUnidad !== null && costoPorUnidad !== undefined
                ? costoPorUnidad
                : ""
            }
            onChange={(val) =>
              setCostoPorUnidad(val !== "" ? Number(val) : null)
            }
            classNames={inputClasses}
            radius="lg"
            size="xs"
            disabled={submitting}
          />

          <TextInput
            label="Serie Factura"
            placeholder="Ej. F001"
            value={serieFactura}
            onChange={(e) =>
              setSerieFactura(e.currentTarget.value.toUpperCase())
            }
            classNames={inputClasses}
            radius="lg"
            size="xs"
            disabled={submitting}
          />

          <TextInput
            label="Número Factura"
            placeholder="Ej. 000123"
            value={numeroFactura}
            onChange={(e) =>
              setNumeroFactura(e.currentTarget.value.toUpperCase())
            }
            classNames={inputClasses}
            radius="lg"
            size="xs"
            disabled={submitting}
          />
        </div>

        <Divider className="border-zinc-800/40 my-1" />

        {/* FILA 4: Descripción */}
        <div>
          <Textarea
            label="Descripción o referencia (Opcional)"
            placeholder="Ej: Factura F-504, Guía de Remisión, Notas adicionales..."
            minRows={2}
            value={descripcion}
            onChange={(e) => setDescripcion(e.currentTarget.value)}
            classNames={inputClasses}
            radius="lg"
            size="xs"
            disabled={submitting}
          />
        </div>
      </Paper>

      {/* ============ TABLA ESTÁNDAR: LOTES EN COLA ============ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <QueueListIcon className="w-4 h-4 text-indigo-400" />
            <Text size="xs" fw={700} className="text-zinc-200 uppercase tracking-wider">
              Lotes para ingreso
            </Text>
            <Badge
              variant="light"
              color={lotes.length > 0 ? "indigo" : "gray"}
              radius="sm"
              size="xs"
              className="font-bold"
            >
              {lotes.length} {lotes.length === 1 ? "lote" : "lotes"}
            </Badge>
          </div>
          {lotes.length > 0 && (
            <Text size="xs" c="dimmed" className="italic text-zinc-500">
              Revise o elimine filas antes de confirmar el registro masivo
            </Text>
          )}
        </div>

        <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/30 shadow-inner">
          <DataTableEstandar
            idAccessor="id"
            columns={tableColumns}
            records={lotes}
            loading={false}
            initialPageSize={10}
            minHeight={lotes.length === 0 ? 110 : undefined}
            noRecordsText="Aún no hay lotes añadidos. Complete el formulario arriba y haga clic en 'Añadir lote'."
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl">
          <Text c="red.5" size="xs" ta="center" fw={700}>
            {error}
          </Text>
        </div>
      )}

      {/* ============ FOOTER: CANCELAR / CONFIRMAR ============ */}
      <Group
        justify="flex-end"
        mt="md"
        className="pt-3 border-t border-zinc-800/40"
      >
        <Button
          variant="subtle"
          onClick={onCancel}
          disabled={submitting}
          radius="lg"
          size="xs"
          className="text-zinc-500 hover:text-white font-bold"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          loading={submitting}
          disabled={lotes.length === 0 || submitting}
          radius="lg"
          size="xs"
          className="bg-linear-to-r from-zinc-100 to-zinc-300 text-zinc-900 font-bold hover:from-white hover:to-zinc-200 shadow-lg border-0 px-8 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {lotes.length === 0
            ? "Confirmar Registro"
            : lotes.length === 1
              ? "Confirmar Registro (1 lote)"
              : `Confirmar Registro (${lotes.length} lotes)`}
        </Button>
      </Group>

      {/* ============ MODAL CREAR PRODUCTO ============ */}
      <ModalEstandar
        opened={openedAddProducto}
        close={closeAddProducto}
        title="Nuevo Producto"
        size="lg"
        validateClose
      >
        <RegistroProducto
          productosExistentes={catalogs.productos.map((p) => ({
            id_producto: p.id_producto,
            nombre: p.nombre,
            prefijo: p.prefijo,
            id_categoria: p.id_categoria,
            categoria: p.categoria,
            clasificacion_bien: p.tipo_bien,
            id_unidad_medida_base: p.id_unidad_medida_base,
            unidad_medida_base: p.unidad_medida_base,
            unidad_medida_base_abreviatura: p.unidad_medida_base_abv,
            es_auditable: p.es_auditable,
            es_perecible: p.es_perecible,
            para_mantenimiento: p.para_mantenimiento,
            stock_minimo_base: p.stock_minimo_base,
            moneda: p.moneda,
            costo_promedio_base: p.costo_promedio_base,
            costo_promedio_base_log: null,
            tiempo_espera_vencimiento: null,
            periodo_espera_vencimiento: null,
            dias_espera_vencimiento: p.dias_espera_vencimiento,
            estado: EstadoBase.Activo,
            cambios_log: null,
          }))}
          onSuccess={(nuevo) => {
            recargarProductos();
            setIdProducto(nuevo.id_producto);
            closeAddProducto();
          }}
          onCancel={closeAddProducto}
        />
      </ModalEstandar>
    </div>
  );
};
