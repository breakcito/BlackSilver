import {
  Badge,
  Text,
  TextInput,
  Select,
  Group,
  Stack,
  Loader,
} from "@mantine/core";
import { useMemo } from "react";
import dayjs from "dayjs";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  TagIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { type DataTableColumn } from "mantine-datatable";

import { useKardex } from "../hooks/useKardex";
import type { RES_MovimientoKardex } from "../service/kardex.responses";

import { useTitlePage } from "../../../hooks/useTitlePage";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import { Kardex_TipoMovimiento } from "../../../shared/enums/kardex";
import { MESES } from "../../../shared/variables/meses";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { Moneda } from "../../../shared/enums/_generic/moneda";
import { BotonRecargar } from "../../../presentation/utils/boton-recargar";

export const KardexProductosPage = () => {
  useTitlePage("Kardex de Inventario");

  const {
    idAlmacen,
    setIdAlmacen,
    mes,
    setMes,
    yearcito,
    setYearcito,
    busqueda,
    setBusqueda,
    filtroProducto,
    setFiltroProducto,
    filtroLote,
    setFiltroLote,
    filteredRecords,
    almacenes,
    productosUnicos,
    lotesUnicos,
    loadingMovimientos,
    loadingAlmacenes,
    movimientos,
    recargar,
    error,
  } = useKardex();

  // Columns definition
  const columns: DataTableColumn<RES_MovimientoKardex>[] = useMemo(
    () => [
      {
        accessor: "index",
        title: "#",
        textAlign: "center",
        width: 50,
      },
      {
        accessor: "producto",
        title: "Producto",
        width: 220,
        render: (record) => (
          <Group gap="xs" wrap="nowrap">
            <div className="w-9 h-9 rounded-lg bg-zinc-800/80 flex items-center justify-center text-zinc-400 shrink-0 border border-zinc-700">
              <CubeIcon className="w-5 h-5" />
            </div>
            <Stack gap={0}>
              <Text size="sm" fw={700} className="text-white leading-tight">
                {record.producto || "-"}
              </Text>
              {record.categoria && (
                <Group gap={4} wrap="nowrap">
                  <TagIcon className="w-3 h-3 text-zinc-500" />
                  <Text size="xs" c="dimmed" fw={500} className="italic">
                    {record.categoria}
                  </Text>
                </Group>
              )}
            </Stack>
          </Group>
        ),
      },
      {
        accessor: "correlativo",
        title: "Lote / Activo",
        width: 160,
        textAlign: "center",
        render: (record) => (
          <Badge variant="light" color="violet" radius="sm">
            {record.correlativo_lote || record.correlativo_activo_fijo}
          </Badge>
        ),
      },
      {
        accessor: "tipo_movimiento",
        title: "Transacción",
        width: 120,
        render: (record) => {
          const isIngreso = record.tipo_movimiento
            .toLowerCase()
            .includes("ingreso");
          return (
            <Stack gap={2}>
              <Text
                size="10px"
                fw={800}
                className="text-zinc-500 uppercase tracking-tighter"
              >
                {record.tipo_origen}
              </Text>
              <Badge
                color={isIngreso ? "teal" : "orange"}
                variant="light"
                size="sm"
                radius="sm"
                leftSection={
                  isIngreso ? (
                    <ArrowDownIcon className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowUpIcon className="w-3.5 h-3.5" />
                  )
                }
              >
                {record.tipo_movimiento}
              </Badge>
            </Stack>
          );
        },
      },
      {
        accessor: "cantidad_movimiento",
        title: "Movimiento",
        textAlign: "center",
        width: 160,
        render: (record) => {
          const isIngreso =
            record.tipo_movimiento === Kardex_TipoMovimiento.Ingreso;
          return (
            <div className="flex flex-row items-end gap-2.5 justify-center">
              {record.id_unidad_medida_base !== record.id_unidad_medida_lote &&
                record.id_unidad_medida_lote !== null &&
                record.contenido_por_presentacion != 1 && (
                  <Badge
                    variant="filled"
                    color={isIngreso ? "green.7" : "red.7"}
                    size="sm"
                    radius="sm"
                    className="font-bold shadow-md"
                  >
                    {isIngreso ? "+" : "-"}{" "}
                    {formatNumber(record.cantidad_movimiento)}{" "}
                    {record.unidad_medida_lote_abv}
                  </Badge>
                )}
              <Text
                size="xs"
                c={isIngreso ? "green.4" : "red.4"}
                fw={700}
                className="italic pr-1 opacity-90"
              >
                ({isIngreso ? "+" : "-"}{" "}
                {formatNumber(record.cantidad_movimiento_base)}{" "}
                {record.unidad_medida_base_abv})
              </Text>
            </div>
          );
        },
      },
      {
        accessor: "stock_resultante",
        title: "Stock Resultante",
        textAlign: "center",
        width: 170,
        render: (record) => (
          <div className="flex flex-row items-end gap-2.5 justify-center">
            {record.id_unidad_medida_base !== record.id_unidad_medida_lote &&
              record.id_unidad_medida_lote !== null &&
              record.contenido_por_presentacion != 1 && (
                <Badge
                  variant="light"
                  color="cyan"
                  radius="sm"
                  size="sm"
                  className="font-bold border border-cyan-500/30"
                >
                  {formatNumber(record.stock_resultante)}{" "}
                  {record.unidad_medida_lote_abv}
                </Badge>
              )}
            <Badge
              variant="light"
              color="pink"
              radius="sm"
              size="sm"
              className="font-bold border border-pink-500/30"
            >
              {formatNumber(record.stock_resultante_base)}{" "}
              {record.unidad_medida_base_abv}
            </Badge>
          </div>
        ),
      },
      // {
      //   accessor: "costo",
      //   title: "Costo Promedio",
      //   width: 200,
      //   textAlign: "center",
      //   render: (r) => (
      //     <div className="flex flex-row items-center justify-center gap-3">
      //       {/* Precio Unitario Base */}
      //       {r.id_activo_fijo == null && (
      //         <div className="flex flex-col items-center leading-tight">
      //           <Text
      //             size="9px"
      //             fw={700}
      //             className="text-zinc-400 uppercase tracking-tighter"
      //           >
      //             Por {r.unidad_medida_base}
      //           </Text>
      //           <Text size="xs" fw={600} className="text-zinc-300 italic">
      //             {r.moneda == Moneda.Soles ? "S/." : "$"}{" "}
      //             {formatNumber(r.costo_promedio_base)}
      //           </Text>
      //         </div>
      //       )}

      //       {/* Precio Presentación */}
      //       {r.id_unidad_medida_lote !== r.id_unidad_medida_base &&
      //         r.id_activo_fijo == null && (
      //           <>
      //             <div className="w-px h-6 bg-zinc-800/60" />
      //             <div className="flex flex-col items-center leading-tight">
      //               <Text
      //                 size="9px"
      //                 fw={700}
      //                 className="text-zinc-400 uppercase tracking-tighter"
      //               >
      //                 Por {r.unidad_medida_lote}
      //               </Text>
      //               <Text size="xs" fw={600} className="text-zinc-300 italic">
      //                 {r.moneda == Moneda.Soles ? "S/." : "$"}{" "}
      //                 {formatNumber(r.costo_promedio_por_presentacion)}
      //               </Text>
      //             </div>
      //           </>
      //         )}

      //       {r.id_activo_fijo == null && (
      //         <div className="w-px h-6 bg-indigo-500/20" />
      //       )}
      //       {/* Total Movimiento */}
      //       <div className="flex flex-col items-center leading-tight">
      //         <Text
      //           size="9.5px"
      //           fw={700}
      //           c="yellow.2"
      //           className="uppercase tracking-tighter"
      //         >
      //           Subtotal
      //         </Text>
      //         <Text size="sm" fw={800} c="teal.5">
      //           {r.moneda == Moneda.Soles ? "S/." : "$"}{" "}
      //           {formatNumber(r.subtotal_promedio)}
      //         </Text>
      //       </div>
      //     </div>
      //   ),
      // },
      {
        accessor: "costo_real",
        title: "Costo",
        width: 200,
        textAlign: "center",
        render: (r) => (
          <div className="flex flex-row items-center justify-center gap-3">
            {/* costo Unitario Base */}
            {r.id_activo_fijo == null && (
              <div className="flex flex-col items-center leading-tight">
                <Text
                  size="9px"
                  fw={700}
                  className="text-zinc-400 uppercase tracking-tighter"
                >
                  Por {r.unidad_medida_base}
                </Text>
                <Text size="xs" fw={600} className="text-zinc-300 italic">
                  S/.
                  {r.costo_por_unidad_base != null
                    ? formatNumber(r.costo_por_unidad_base)
                    : "---"}
                </Text>
              </div>
            )}

            {/* Precio Presentación */}
            {r.id_unidad_medida_lote !== r.id_unidad_medida_base &&
              r.id_activo_fijo == null && (
                <>
                  <div className="w-px h-6 bg-zinc-800/60" />
                  <div className="flex flex-col items-center leading-tight">
                    <Text
                      size="9px"
                      fw={700}
                      className="text-zinc-400 uppercase tracking-tighter"
                    >
                      Por {r.unidad_medida_lote}
                    </Text>
                    <Text size="xs" fw={600} className="text-zinc-300 italic">
                      S/.
                      {r.costo_por_unidad != null
                        ? formatNumber(r.costo_por_unidad)
                        : "---"}
                    </Text>
                  </div>
                </>
              )}

            {r.id_activo_fijo == null && (
              <div className="w-px h-6 bg-indigo-500/20" />
            )}
            {/* Total Movimiento */}
            <div className="flex flex-col items-center leading-tight">
              <Text
                size="9.5px"
                fw={700}
                c="yellow.2"
                className="uppercase tracking-tighter"
              >
                Subtotal
              </Text>
              <Text size="sm" fw={800} c="teal.5">
                S/.
                {r.subtotal != null ? formatNumber(r.subtotal) : "---"}
              </Text>
            </div>
          </div>
        ),
      },
      {
        accessor: "descripcion",
        title: "Descripción",
        width: 250,
        render: (record) => (
          <Text
            size="xs"
            className="text-zinc-400 italic line-clamp-2"
            title={record.descripcion || ""}
          >
            {record.descripcion || "-"}
          </Text>
        ),
      },
      {
        accessor: "created_at",
        title: "Fecha",
        textAlign: "center",
        width: 160,
        render: (record) => (
          <Group gap="sm" wrap="nowrap" justify="center">
            <CalendarDaysIcon className="w-5 h-5 text-indigo-400 shrink-0" />
            <div className="flex flex-col gap-0 items-start">
              <Text size="xs" fw={600} className="text-zinc-100">
                {dayjs(record.created_at).format("DD/MM/YYYY")}
              </Text>
              <Text size="xs" c="dimmed" fw={500}>
                {dayjs(record.created_at).format("HH:mm A")}
              </Text>
            </div>
          </Group>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6 animate-fade-in text-zinc-100">
      {/* Filtros Principales y Buscador */}
      <div className="flex flex-col md:flex-row items-end gap-3 w-full">
        {/* Almacén */}
        <div className="w-full md:w-64">
          <Select
            label="Almacén"
            placeholder="Seleccionar almacén..."
            leftSection={
              loadingAlmacenes ? (
                <Loader size="xs" />
              ) : (
                <MapPinIcon className="w-4 h-4 text-zinc-400" />
              )
            }
            data={almacenes.map((a) => ({
              value: String(a.id_almacen),
              label: a.nombre,
            }))}
            value={idAlmacen}
            onChange={setIdAlmacen}
            radius="lg"
            size="sm"
            classNames={{
              input:
                "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white placeholder:text-zinc-500",
              label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
              dropdown: "bg-zinc-900 border-zinc-800",
              option: "text-zinc-300 hover:bg-zinc-800",
            }}
          />
        </div>

        {/* Mes */}
        <div className="w-full md:w-40">
          <Select
            label="Mes"
            placeholder="Mes"
            leftSection={<CalendarDaysIcon className="w-4 h-4 text-zinc-500" />}
            data={MESES}
            value={mes}
            onChange={(val) => setMes(val || "")}
            radius="lg"
            size="sm"
            allowDeselect={false}
            classNames={{
              input:
                "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white",
              label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
              dropdown: "bg-zinc-900 border-zinc-800",
              option: "text-zinc-300 hover:bg-zinc-800",
            }}
          />
        </div>

        {/* Año */}
        <div className="w-full md:w-32">
          <Select
            label="Año"
            placeholder="Año"
            data={Array.from({ length: 5 }, (_, i) => ({
              value: String(dayjs().year() - i),
              label: String(dayjs().year() - i),
            }))}
            value={yearcito}
            onChange={(val) => setYearcito(val || "")}
            radius="lg"
            size="sm"
            allowDeselect={false}
            classNames={{
              input:
                "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white",
              label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
              dropdown: "bg-zinc-900 border-zinc-800",
              option: "text-zinc-300 hover:bg-zinc-800",
            }}
          />
        </div>

        {/* Buscador */}
        <div className="flex-1 min-w-50 w-full flex items-end gap-2">
          <TextInput
            label="Búsqueda"
            placeholder="Producto, lote, glosa..."
            leftSection={
              <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400" />
            }
            value={busqueda}
            onChange={(e) => setBusqueda(e.currentTarget.value)}
            disabled={!idAlmacen}
            radius="lg"
            size="sm"
            className="flex-1"
            classNames={{
              input:
                "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
              label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
            }}
          />
          <BotonRecargar onReload={recargar} loading={loadingMovimientos} />
        </div>

        {/* Filtros Dinámicos */}
        {movimientos.length > 0 && (
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto animate-fade-in">
            <div className="w-full md:w-56">
              <Select
                label="Filtrar producto"
                placeholder="Todos..."
                data={productosUnicos}
                value={filtroProducto}
                onChange={(val) => {
                  setFiltroProducto(val);
                  setFiltroLote(null);
                }}
                searchable
                clearable
                radius="lg"
                size="sm"
                classNames={{
                  input:
                    "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500",
                  label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
                  dropdown: "bg-zinc-900 border-zinc-800",
                  option: "text-zinc-300 hover:bg-zinc-800",
                }}
              />
            </div>
            <div className="w-full md:w-44">
              <Select
                label="Filtrar lote"
                placeholder="Todos..."
                data={lotesUnicos}
                value={filtroLote}
                onChange={setFiltroLote}
                searchable
                clearable
                disabled={!filtroProducto && lotesUnicos.length > 50}
                radius="lg"
                size="sm"
                classNames={{
                  input:
                    "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500",
                  label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
                  dropdown: "bg-zinc-900 border-zinc-800",
                  option: "text-zinc-300 hover:bg-zinc-800",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabla / Estado Vacío */}
      {!idAlmacen ? (
        <div className="flex flex-col items-center justify-center p-24 border-2 border-dashed border-zinc-800 rounded-4xl bg-zinc-900/20">
          <div className="p-5 rounded-full bg-zinc-900/50 mb-4 border border-zinc-800">
            <CubeIcon className="w-12 h-12 text-zinc-600" />
          </div>
          <Text className="text-zinc-400 font-bold text-xl text-center">
            Seleccione un Almacén
          </Text>
          <Text className="text-zinc-500 text-sm max-w-xs text-center mt-1">
            Debe elegir un almacén y periodo para visualizar los movimientos de
            stock.
          </Text>
        </div>
      ) : (
        <div className="animate-fade-in">
          <DataTableEstandar
            idAccessor="id_kardex"
            columns={columns}
            records={filteredRecords}
            loading={loadingMovimientos}
          />
        </div>
      )}

      {error && (
        <Text
          c="red.5"
          size="sm"
          mt="md"
          fw={700}
          className="text-center animate-pulse"
        >
          {error}
        </Text>
      )}
    </div>
  );
};
