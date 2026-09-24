import { useMemo } from "react";
import {
  Table,
  Text,
  Skeleton,
  Tooltip,
  ActionIcon,
  Badge,
  Stack,
} from "@mantine/core";
import { DocumentDuplicateIcon,  TrashIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

import type {
  DTO_CotizacionRequest,
  DTO_ProductoComparativo,
  DTO_CotizacionDetalle,
} from "../../../service/cotizaciones.requests";
import { CabeceraCotizacion } from "./cabecera-cotizacion";
import { CeldaDetalle } from "./celda-detalle";
import type { RES_Almacen } from "../../../../../service/responses/almacen";
import type { RES_Mina } from "../../../../../service/responses/mina";
import { TipoDespachoCompra } from "../../../../../shared/enums/_generic/tipo-despacho-compra";
import { Periodo } from "../../../../../shared/enums/_generic/periodo";
import { TipoBien } from "../../../../../shared/enums/_generic/tipo-bien";
import type { RES_Proveedor } from "../../../../../service/responses/proveedor";
import type { RES_Empresa } from "../../../../../service/responses/empresa";
import type { RES_UnidadMedida } from "../../../../../service/responses/unidad-medida";
import type { CopiedCotizacion } from "../../../hooks/shared/useCotizacionHandlers";
import type { LoadingMaestrosState } from "../../../hooks/shared/utils";
import { Moneda } from "../../../../../shared/enums/_generic/moneda";

interface ComparativoTablaProps {
  productos: (
    | (DTO_ProductoComparativo & {
        nombre: string;
        codigo: string;
        id_unidad_medida_base: number;
        unidad_medida_base: string;
        unidad_medida_abreviatura: string;
        tipo_bien?: TipoBien;
        /**
         * true cuando el producto del comparativo no se encontro en el
         * catalogo cacheado de cotizaciones. La UI debe mostrar un badge
         * "Pendiente" y permitir cargar el producto via ModalSeleccionProductos.
         */
        requiereCargaProducto?: boolean;
      })
    | null
  )[];
  cotizaciones: DTO_CotizacionRequest[];
  unidadesMedida: { value: string; label: string; abreviatura: string }[];
  unidadesCompletas: RES_UnidadMedida[];
  almacenes: RES_Almacen[];
  minas: RES_Mina[];
  proveedores: RES_Proveedor[];
  onAgregarProveedorLocal?: (nuevo: RES_Proveedor) => void;
  empresas: RES_Empresa[];
  copiedCotizacion?: CopiedCotizacion | null;
  onIniciarCopiaCotizacion?: (
    sourceIndex: number,
    type: "all" | "general" | "delivery",
  ) => void;
  onPegarCotizacion?: (targetIndex: number) => void;
  onCancelarCopiaCotizacion?: () => void;
  loadingMaestros?: LoadingMaestrosState;
  onUpdateHeader: <K extends keyof DTO_CotizacionRequest>(
    index: number,
    field: K,
    value: DTO_CotizacionRequest[K],
  ) => void;
  onUpdateDetail: <K extends keyof DTO_CotizacionDetalle>(
    cotIndex: number,
    rowIndex: number,
    field: K,
    value: DTO_CotizacionDetalle[K],
  ) => void;
  onToggleNoCotiza: (cotIndex: number, rowIndex: number) => void;
  onRemoveCotizacion: (index: number) => void;
  onDuplicarFila?: (rowIndex: number) => void;
  onEliminarFila?: (rowIndex: number) => void;
  onUpdateGlobalLogistica?: (
    cotIndex: number,
    data: {
      id_almacen_recepcionista: number | null;
      id_mina_destino?: number | null;
      tipo_despacho: TipoDespachoCompra;
      lugar_recojo?: string;
      tiempo_entrega: number;
      tiempo_entrega_periodo: Periodo;
    },
  ) => void;
  copySource?: {
    cotIndex: number;
    rowIndex: number;
    id_producto: number;
    data: Partial<DTO_CotizacionDetalle>;
  } | null;
  onIniciarCopia?: (
    cotIndex: number,
    rowIndex: number,
    id_producto: number,
  ) => void;
  onCancelarCopia?: () => void;
  onPegarCopia?: (targetCotIndex: number, targetRowIndex: number) => void;
  monedaFiltro?: Moneda | null;
}

export const ComparativoTabla = ({
  productos,
  cotizaciones,
  unidadesMedida,
  unidadesCompletas,
  almacenes,
  minas,
  proveedores,
  onAgregarProveedorLocal,
  empresas,
  copiedCotizacion,
  onIniciarCopiaCotizacion,
  onPegarCotizacion,
  onCancelarCopiaCotizacion,
  loadingMaestros,
  onUpdateHeader,
  onUpdateDetail,
  onToggleNoCotiza,
  onRemoveCotizacion,
  onDuplicarFila,
  onEliminarFila,
  onUpdateGlobalLogistica,
  copySource,
  onIniciarCopia,
  onCancelarCopia,
  onPegarCopia,
  monedaFiltro,
}: ComparativoTablaProps) => {
  const numCotizaciones = cotizaciones.length;
  const numSkeletons = Math.max(0, 4 - numCotizaciones);
  const totalCols = numCotizaciones + numSkeletons;
  const totalWidth = 120 + totalCols * 400;

  // Cálculo de mejores precios en tiempo real
  const cheapestPrices = useMemo(() => {
    const pricesMap = new Map<number, number>();
    productos.forEach((prod, pIdx) => {
      if (!prod) return;

      const normalizedPrices = cotizaciones
        .map((cot) => {
          const det = cot.detalles[pIdx];
          if (
            !det ||
            det.no_cotiza ||
            !det.precio_unitario ||
            det.precio_unitario <= 0
          )
            return null;

          const tc = cot.tipo_cambio_venta_referencial || 1;
          const moneda = cot.moneda || "Soles";
          const basePrice = Number(det.precio_unitario_base);
          return moneda === "Soles" ? basePrice : basePrice * tc;
        })
        .filter((p): p is number => p !== null);

      if (normalizedPrices.length > 1) {
        // Solo marcar si hay competencia
        pricesMap.set(prod.id_producto, Math.min(...normalizedPrices));
      }
    });
    return pricesMap;
  }, [productos, cotizaciones]);

  const hasActivosFijos = useMemo(
    () => productos.some((p) => p?.tipo_bien === TipoBien.ActivoFijo),
    [productos],
  );

  return (
    <div
      id="comparativo-container"
      className="h-full overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950/50 shadow-xl custom-scrollbar relative"
    >
      <Table
        withColumnBorders
        withTableBorder={false}
        verticalSpacing="md"
        horizontalSpacing="md"
        layout="fixed"
        className="border-separate border-spacing-0"
        style={{
          width: totalWidth,
          minWidth: totalWidth,
          tableLayout: "fixed",
        }}
      >
        <Table.Thead className="z-50">
          <Table.Tr>
            {/* Esquina PRODUCTOS: Fija vertical y horizontalmente */}
            <Table.Th
              style={{ width: 120, minWidth: 120, verticalAlign: "middle" }}
              className="bg-zinc-900 border-b border-r border-zinc-800 sticky top-0 left-0 z-100 p-3 shadow-xl"
            >
              <Stack gap={4} align="center">
                <Text
                  size="xs"
                  fw={800}
                  className="text-white uppercase tracking-widest text-center"
                >
                  Productos
                </Text>
                {productos.length > 0 && (
                  <Badge
                    variant="light"
                    color="indigo"
                    size="xs"
                    radius="sm"
                    className="font-bold border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 self-start"
                  >
                    {productos.length}{" "}
                    {productos.length === 1 ? "item" : "items"}
                  </Badge>
                )}
              </Stack>
            </Table.Th>

            {/* Renderizar Cotizaciones Reales */}
            {cotizaciones.map((cot, idx) => (
              <Table.Th
                key={`real-col-${idx}`}
                style={{
                  width: 400,
                  minWidth: 400,
                  maxWidth: 400,
                  verticalAlign: "top",
                }}
                className="bg-zinc-900 border-b border-zinc-800 p-0 sticky top-0 z-70"
              >
                <CabeceraCotizacion
                  cot={cot}
                  idx={idx}
                  proveedores={proveedores}
                  onAgregarProveedorLocal={onAgregarProveedorLocal}
                  empresas={empresas}
                  copiedCotizacion={copiedCotizacion}
                  onIniciarCopiaCotizacion={onIniciarCopiaCotizacion}
                  onPegarCotizacion={onPegarCotizacion}
                  onCancelarCopiaCotizacion={onCancelarCopiaCotizacion}
                  loadingMaestros={loadingMaestros}
                  unidadesMedida={unidadesMedida}
                  onUpdateHeader={onUpdateHeader}
                  onRemoveCotizacion={onRemoveCotizacion}
                  almacenes={almacenes}
                  minas={minas}
                  hasActivosFijos={hasActivosFijos}
                  onUpdateGlobalLogistica={onUpdateGlobalLogistica}
                  monedaFiltro={monedaFiltro}
                />
              </Table.Th>
            ))}

            {/* Renderizar Skeletons de relleno si hay menos de 3 */}
            {Array.from({ length: numSkeletons }).map((_, i) => (
              <Table.Th
                key={`sk-col-${numCotizaciones + i}`}
                style={{
                  width: 400,
                  minWidth: 400,
                  maxWidth: 400,
                  verticalAlign: "top",
                }}
                className="bg-zinc-900 border-b border-zinc-800 p-0 sticky top-0 z-70"
              >
                <CabeceraCotizacion
                  idx={numCotizaciones + i}
                  isSkeleton={true}
                  proveedores={proveedores}
                  empresas={empresas}
                  unidadesMedida={unidadesMedida}
                  onUpdateHeader={onUpdateHeader}
                  onRemoveCotizacion={onRemoveCotizacion}
                  monedaFiltro={monedaFiltro}
                />
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {productos.length === 0 ? (
            // 1 Fila de Esqueleto si no hay productos
            <Table.Tr className="border-b border-zinc-900">
              <Table.Td
                style={{ width: 120, minWidth: 120 }}
                className="border-r border-zinc-800 sticky left-0 z-20 bg-zinc-950/90 shadow-xl backdrop-blur-md p-4"
              >
                <div className="h-3 w-3/4 bg-zinc-800/50 rounded-full" />
              </Table.Td>

              {/* Celdas esqueleto si no hay productos */}
              {Array.from({ length: totalCols }).map((_, colIdx) => (
                <Table.Td
                  key={`sk-cell-empty-prod-${colIdx}`}
                  style={{ width: 400, minWidth: 400, maxWidth: 400 }}
                  className=""
                >
                  <CeldaDetalle
                    cotIdx={colIdx}
                    unidadesMedida={unidadesMedida}
                    unidadesCompletas={unidadesCompletas}
                    almacenes={almacenes}
                    minas={minas}
                    onUpdateDetail={onUpdateDetail}
                    onToggleNoCotiza={onToggleNoCotiza}
                    isSkeleton={true}
                    rowIndex={0}
                    loadingMaestros={loadingMaestros}
                  />
                </Table.Td>
              ))}
            </Table.Tr>
          ) : (
            productos.map((prod, pIdx) => (
              <Table.Tr
                key={`${prod?.id_producto}-${pIdx}`}
                id={prod ? `producto-fila-${prod.id_producto}` : undefined}
                className=" transition-colors"
              >
                {/* Columna fija del producto */}
                <Table.Td
                  style={{ width: 120, minWidth: 120 }}
                  className="border-r border-zinc-800 sticky left-0 z-20 bg-zinc-950/90 shadow-xl backdrop-blur-md"
                >
                  {prod ? (
                    <div className="p-4 flex flex-col items-center justify-center gap-2">
                      <Text
                        size="xs"
                        fw={700}
                        className={
                          prod.requiereCargaProducto
                            ? "text-amber-300 text-left italic"
                            : "text-zinc-200 text-left"
                        }
                      >
                        {prod.nombre}
                      </Text>
                      {prod.requiereCargaProducto && (
                        <Tooltip
                          label="Este producto no se encuentra cargado en el catálogo. Ábrelo desde 'Añadir Productos' para registrarlo antes de cotizar."
                          position="bottom"
                          withArrow
                          multiline
                          w={260}
                        >
                          <Badge
                            color="amber"
                            variant="light"
                            size="xs"
                            radius="md"
                            leftSection={
                              <ExclamationTriangleIcon className="w-3 h-3" />
                            }
                          >
                            Pendiente de cargar
                          </Badge>
                        </Tooltip>
                      )}
                      <div className="flex gap-2">
                        {onDuplicarFila && (
                          <Tooltip
                            label="Repetir producto"
                            position="bottom"
                          >
                            <ActionIcon
                              variant="light"
                              color="cyan"
                              size="sm"
                              radius="xl"
                              onClick={() => onDuplicarFila(pIdx)}
                              className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400"
                            >
                              <DocumentDuplicateIcon className="w-4 h-4" />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        {onEliminarFila && (
                          <Tooltip label="Eliminar fila" position="bottom">
                            <ActionIcon
                              variant="light"
                              color="red"
                              size="sm"
                              radius="xl"
                              onClick={() => onEliminarFila(pIdx)}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <Skeleton h={12} radius="md" />
                    </div>
                  )}
                </Table.Td>

                {/* Renderizar Celdas Reales */}
                {cotizaciones.map((cot, cotIdx) => {
                  const det = cot.detalles[pIdx];
                  if (!det || !prod)
                    return (
                      <Table.Td
                        key={`real-cell-${cotIdx}`}
                        style={{ width: 400, minWidth: 400, maxWidth: 400 }}
                        className="bg-zinc-900/20"
                      />
                    );

                  const isCopyingThis =
                    copySource?.cotIndex === cotIdx &&
                    copySource?.rowIndex === pIdx;
                  const canPasteHere =
                    copySource &&
                    copySource.id_producto === prod.id_producto &&
                    !isCopyingThis &&
                    !det.no_cotiza;

                  return (
                    <Table.Td
                      key={`real-cell-${cotIdx}`}
                      style={{ width: 400, minWidth: 400, maxWidth: 400 }}
                      className={`p-4 align-top relative transition-all duration-300 ${
                        det.no_cotiza ? "bg-zinc-950/30" : ""
                      } ${
                        canPasteHere
                          ? "bg-indigo-500/10 cursor-pointer hover:bg-indigo-500/20 shadow-inner"
                          : ""
                      }`}
                      onClick={() =>
                        canPasteHere && onPegarCopia?.(cotIdx, pIdx)
                      }
                    >
                      <CeldaDetalle
                        det={det}
                        prod={prod}
                        cot={cot}
                        cotIdx={cotIdx}
                        unidadesMedida={unidadesMedida}
                        unidadesCompletas={unidadesCompletas}
                        almacenes={almacenes}
                        minas={minas}
                        onUpdateDetail={onUpdateDetail}
                        onToggleNoCotiza={onToggleNoCotiza}
                        rowIndex={pIdx}
                        copySource={copySource}
                        onIniciarCopia={onIniciarCopia}
                        onCancelarCopia={onCancelarCopia}
                        loadingMaestros={loadingMaestros}
                        isCheapest={(() => {
                          if (det.no_cotiza || !det.precio_unitario)
                            return false;
                          const tc = cot.tipo_cambio_venta_referencial || 1;
                          const basePrice = Number(det.precio_unitario_base);
                          const normalized =
                            cot.moneda === "Soles" ? basePrice : basePrice * tc;
                          const min = cheapestPrices.get(prod.id_producto);
                          return (
                            min !== undefined &&
                            Math.abs(normalized - min) < 0.0001
                          );
                        })()}
                      />

                      {/* Overlay de 'No Cotiza' */}
                      {det.no_cotiza && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 px-6">
                          <div className="bg-red-500/10 border border-red-500/50 backdrop-blur-sm rounded-xl p-4 flex flex-col items-center gap-2 shadow-2xl">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-8 h-8 text-red-500 opacity-80"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
                              />
                            </svg>
                            <Text
                              size="xs"
                              fw={800}
                              className="text-red-500 uppercase tracking-tighter"
                            >
                              No participa
                            </Text>
                          </div>
                        </div>
                      )}
                    </Table.Td>
                  );
                })}

                {/* Renderizar Celdas Skeleton de relleno */}
                {Array.from({ length: numSkeletons }).map((_, i) => (
                  <Table.Td
                    key={`sk-cell-${numCotizaciones + i}`}
                    style={{ width: 400, minWidth: 400, maxWidth: 400 }}
                    className="p-4 align-top text-zinc-600/20"
                  >
                    <CeldaDetalle
                      cotIdx={numCotizaciones + i}
                      unidadesMedida={unidadesMedida}
                      unidadesCompletas={unidadesCompletas}
                      almacenes={almacenes}
                      minas={minas}
                      onUpdateDetail={onUpdateDetail}
                      onToggleNoCotiza={onToggleNoCotiza}
                      isSkeleton={true}
                      rowIndex={0}
                      loadingMaestros={loadingMaestros}
                    />
                  </Table.Td>
                ))}
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>

      {/* Estilos inline para la transición de hover en cabeceras */}
      <style>{`
        .group-header:hover .opacity-0 {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};
