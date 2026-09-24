import { Badge, Group, Text } from "@mantine/core";
import { formatNumber } from "../../../../../shared/functions/formatNumber";
import type { DetalleSolicitudExtendido } from "../../../service/solicitudes-atencion.responses";
import { LotesTable } from "./LotesTable";
import { ActivosTable } from "./activos/activos-table";
import type { RES_LoteDisponible } from "../../../../../service/responses/lote-producto";
import type { RES_ActivoFijoDisponible } from "../../../../../service/responses/activo-fijo";

interface DetalleEntregaSectionProps {
  detalle: DetalleSolicitudExtendido;
  lotes: RES_LoteDisponible[];
  activosFijos: RES_ActivoFijoDisponible[];
  entregaCantidades: Record<number, Record<number, number>>;
  entregaCantidadesActivos: Record<number, Record<number, number>>;
  loadingLotes: boolean;
  handleCantChange: (
    idSolicitudDetalle: number,
    idLote: number,
    val: number,
  ) => void;
  handleCantLoteChange: (
    idSolicitudDetalle: number,
    idLote: number,
    val: number,
  ) => void;
  handleCantActivoChange: (
    idSolicitudDetalle: number,
    idActivo: number,
    val: number,
  ) => void;
}

export const DetalleEntregaSection = ({
  detalle,
  lotes,
  activosFijos,
  entregaCantidades,
  entregaCantidadesActivos,
  loadingLotes,
  handleCantChange,
  handleCantLoteChange,
  handleCantActivoChange,
}: DetalleEntregaSectionProps) => {
  const isActivoFijo = detalle.tipo_bien === "Activo Fijo";

  const currentDetailQuantities =
    entregaCantidades[detalle.id_solicitud_detalle] || {};
  const currentDetailQuantitiesActivos =
    entregaCantidadesActivos[detalle.id_solicitud_detalle] || {};

  const tEntregadoDetalleActualBase = isActivoFijo
    ? Object.values(currentDetailQuantitiesActivos).reduce(
        (acc, v) => acc + (v || 0),
        0,
      )
    : lotes.reduce(
        (acc, l) => acc + (currentDetailQuantities[l.id_lote] || 0),
        0,
      );

  // El item fue registrado con smart calc si la BD persistio los 4
  // campos de magnitud. En ese caso el badge principal muestra
  // "items x unidad/ítem" y luego el total en base.
  const usaMagnitud =
    Number(detalle.con_magnitud ?? 0) === 1 &&
    typeof detalle.cantidad_items === "number" &&
    detalle.cantidad_items > 0 &&
    typeof detalle.valor_magnitud === "number" &&
    typeof detalle.valor_magnitud_base === "number";

  return (
    <div className="p-5 space-y-5 transition-colors hover:bg-zinc-800/10">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <Group gap="xs" wrap="nowrap" align="center" className="pl-1">
          {usaMagnitud ? (
            <Group gap="xs" wrap="nowrap" align="center">
              <Badge
                variant="light"
                color="zinc.4"
                size="md"
                className="font-black h-8 bg-zinc-800/30 border border-zinc-700/50"
              >
                {formatNumber(detalle.cantidad_items ?? 0)} ×{" "}
                {formatNumber(detalle.valor_magnitud ?? 0)}{" "}
                {detalle.unidad_medida_sol_abv}
              </Badge>
              <div className="w-1 h-1 rounded-full bg-zinc-600" />
              <Badge
                variant="light"
                color="indigo.4"
                className="bg-zinc-800/30 font-black h-7"
              >
                {formatNumber(detalle.valor_magnitud_base ?? 0)}{" "}
                {detalle.unidad_medida_base_abv}
              </Badge>
            </Group>
          ) : (
            <>
              <Badge
                variant="light"
                color="zinc.4"
                size="md"
                className="font-black h-8 bg-zinc-800/30 border border-zinc-700/50"
              >
                {formatNumber(detalle.cantidad_solicitada)}{" "}
                {detalle.unidad_medida_sol_abv}
              </Badge>

              {detalle.unidad_medida_sol_abv !== detalle.unidad_medida_base_abv && (
                <Group gap="xs" wrap="nowrap" className="items-center">
                  <div className="w-1 h-1 rounded-full bg-zinc-600" />
                  <Text
                    size="10px"
                    c="zinc.5"
                    fw={700}
                    className="italic uppercase tracking-tight opacity-60 ml-1"
                  >
                    ({formatNumber(detalle.contenido_por_presentacion)}{" "}
                    {detalle.unidad_medida_base_abv} x{" "}
                    {detalle.unidad_medida_sol_abv})
                  </Text>
                  <div className="w-1 h-1 rounded-full bg-zinc-600" />
                  <Badge
                    variant="light"
                    color="indigo.4"
                    className="bg-zinc-800/30 font-black h-7"
                  >
                    {formatNumber(detalle.cantidad_solicitada_base)}{" "}
                    {detalle.unidad_medida_base_abv}
                  </Badge>
                </Group>
              )}
            </>
          )}
        </Group>

        <div className="flex items-center gap-2.5 w-full lg:w-auto self-end">
          {/* Pendiente */}
          <div className="flex-1 lg:flex-none flex items-center gap-3 bg-linear-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-xl p-2 px-4 shadow-sm min-w-[110px]">
            <div className="flex flex-row gap-1.5">
              <Text
                size="9px"
                c="red.4"
                fw={900}
                className="uppercase self-center"
              >
                Pendiente
              </Text>
              <div className="flex items-baseline gap-1">
                <Text
                  size="xs"
                  fw={900}
                  className="text-red-500 font-mono tracking-tighter"
                >
                  {formatNumber(detalle.pendiente_base)}
                </Text>
                <Text
                  size="10px"
                  fw={800}
                  c="zinc.5"
                  className="uppercase opacity-60"
                >
                  {detalle.unidad_medida_base_abv}
                </Text>
              </div>
            </div>
          </div>

          {/* Despachando */}
          <div
            className={`flex-1 lg:flex-none flex items-center gap-3 border border-sky-500/20 rounded-xl p-2 px-4 shadow-sm min-w-[130px] transition-all duration-300 ${
              tEntregadoDetalleActualBase > 0
                ? "bg-linear-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/30 shadow-emerald-500/5"
                : "bg-linear-to-br from-indigo-500/5 to-zinc-800/10 border-zinc-800/80 shadow-inner"
            }`}
          >
            <div className="flex flex-row gap-1.5">
              <Text
                size="9px"
                c={tEntregadoDetalleActualBase > 0 ? "emerald.3" : "indigo.4"}
                fw={900}
                className="uppercase self-center"
              >
                Despachando
              </Text>
              <div className="flex items-baseline gap-1">
                <Text
                  size="sm"
                  fw={900}
                  className={`font-mono tracking-tighter ${
                    tEntregadoDetalleActualBase > 0
                      ? "text-emerald-400"
                      : "text-indigo-400/70"
                  }`}
                >
                  {formatNumber(tEntregadoDetalleActualBase)}
                </Text>
                <Text
                  size="10px"
                  fw={800}
                  c="zinc.5"
                  className="uppercase opacity-60"
                >
                  {detalle.unidad_medida_base_abv}
                </Text>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isActivoFijo ? (
        <ActivosTable
          activosFijos={activosFijos.filter(
            (a) => a.id_producto === detalle.id_producto,
          )}
          idDetalleSolicitud={detalle.id_solicitud_detalle}
          pendienteBase={detalle.pendiente_base}
          tEntregadoDetalleActualBase={tEntregadoDetalleActualBase}
          entregaCantidadesActivos={entregaCantidadesActivos}
          detalle={detalle}
          handleCantActivoChange={handleCantActivoChange}
        />
      ) : (
        <LotesTable
          lotes={lotes}
          idSolicitudDetalle={detalle.id_solicitud_detalle}
          unidadMedidaBaseAbv={detalle.unidad_medida_base_abv}
          entregaCantidades={entregaCantidades}
          pendienteBase={detalle.pendiente_base}
          tEntregadoDetalleActualBase={tEntregadoDetalleActualBase}
          loadingLotes={loadingLotes}
          handleCantChange={handleCantChange}
          handleCantLoteChange={handleCantLoteChange}
        />
      )}
    </div>
  );
};
