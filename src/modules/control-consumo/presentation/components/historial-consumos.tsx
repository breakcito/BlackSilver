import { useEffect, useMemo, useState } from "react";
import { Badge, Divider, Group, Stack, Text, Tooltip } from "@mantine/core";
import {
  BanknotesIcon,
  CogIcon,
  MapPinIcon,
  UserIcon,
  BriefcaseIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { AuxService } from "../../../../service/auxiliar.service";
import type { RES_LoteMineral } from "../../../../service/responses/lote-mineral";
import type {
  RES_ResumenEntregasReq,
  RES_Consumo,
} from "../../service/control-consumo.responses";
import { isOtros } from "./helpers";

interface HistorialConsumosProps {
  record: RES_ResumenEntregasReq;
}

/**
 * Helper para formatear la moneda como prefijo del monto.
 */
const formatMonto = (
  valor: number | string | null | undefined,
  moneda?: string | null,
) => {
  const n = Number(valor ?? 0);
  const prefix = (moneda || "PEN").toUpperCase().startsWith("USD") ? "$" : "S/.";
  return `${prefix} ${formatNumber(n, 4)}`;
};

const origenCostoLabel: Record<string, { label: string; color: string }> = {
  snapshot_detalle: { label: "Snapshot", color: "teal" },
  lote_promedio: { label: "Lote Prom.", color: "indigo" },
  lote_compra: { label: "Lote Compra", color: "violet" },
  oc_detalle: { label: "OC", color: "blue" },
  sin_costo: { label: "Sin Costo", color: "gray" },
};

export const HistorialConsumos = ({ record }: HistorialConsumosProps) => {
  const costoUnitDetalle = Number(record.costo_unitario_base ?? 0);
  const [lotesMineral, setLotesMineral] = useState<RES_LoteMineral[]>([]);

  useEffect(() => {
    const cargarLotes = async () => {
      try {
        const resp = await AuxService.get_lotes_mineral();
        if (resp.success && resp.data) {
          setLotesMineral(resp.data);
        }
      } catch (err) {
        console.error("Error al cargar lotes mineral para historial:", err);
      }
    };
    cargarLotes();
  }, []);

  const contratistasPorLote = useMemo(() => {
    const map = new Map<number, string>();
    lotesMineral.forEach((lm) => {
      map.set(lm.id_lote_mineral, lm.contratista);
    });
    return map;
  }, [lotesMineral]);

  return (
    <div className="p-5 bg-zinc-950/40 border-l-2 border-indigo-500/40 pl-6 py-4 flex flex-col gap-3">
      <Group justify="space-between" wrap="wrap" gap="xs">
        <Text size="xs" fw={800} className="text-zinc-400">
          Historial de Consumo ({record.consumos.length})
        </Text>
        {costoUnitDetalle > 0 && (
          <Group gap={4}>
            <BanknotesIcon className="w-3.5 h-3.5 text-emerald-400" />
            <Text size="10px" c="zinc.5" fw={700} className="uppercase tracking-wider">
              Costo Unit. Detalle:
            </Text>
            <Badge
              variant="light"
              color="emerald"
              size="xs"
              className="font-bold border border-emerald-500/10"
            >
              {formatMonto(costoUnitDetalle, record.moneda)}
            </Badge>
          </Group>
        )}
      </Group>

      {record.consumos.length === 0 ? (
        <Text size="xs" c="dimmed" fs="italic" className="py-1">
          Sin consumos registrados para esta entrega
        </Text>
      ) : (
        <Stack gap="xs">
          {record.consumos.map((c: RES_Consumo) => {
            const showReqUnit = isOtros(record);
            const qty = showReqUnit
              ? c.cantidad_base_consumida *
                (record.cantidad_entregada_req / record.cantidad_entregada_base)
              : c.cantidad_base_consumida;
            const unit = showReqUnit
              ? record.unidad_medida_req_abv
              : record.unidad_medida_base_abv;
            const origenCosto = c.origen_costo_unitario ?? "sin_costo";
            const origenMeta =
              origenCostoLabel[origenCosto] ?? origenCostoLabel.sin_costo;
            const costoTotalConsumo = Number(c.costo_total_consumo ?? 0);
            const contratistaLote =
              c.id_lote_mineral != null
                ? contratistasPorLote.get(c.id_lote_mineral)
                : undefined;
            return (
              <div
                key={c.id_consumo}
                className="bg-zinc-900/45 border border-zinc-800/50 hover:border-zinc-700/50 rounded-xl p-3.5 transition-all duration-200"
              >
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
                  {/* Left details: badges, cantidad, destinos y costos */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 flex-1">
                    <Badge
                      color={
                        c.estado === "Consumo Total" ? "teal.4" : "yellow.4"
                      }
                      size="xs"
                      variant="light"
                      className="font-extrabold uppercase border border-current/10 py-1"
                    >
                      {c.estado}
                    </Badge>
                    <Text
                      size="xs"
                      className="text-zinc-200 font-semibold flex items-center gap-1"
                    >
                      <span className="text-white font-extrabold text-xs">
                        {formatNumber(qty)}
                      </span>
                      <span className="text-white font-extrabold text-xs">
                        {unit}
                      </span>
                    </Text>

                    {(c.para_produccion === true ||
                      Number(c.para_produccion) === 1) && (
                      <>
                        <Tooltip
                          label={
                            <Stack gap={2}>
                              {contratistaLote && (
                                <Text size="10px" c="zinc.2">
                                  Contratista: <span className="text-zinc-100">{contratistaLote}</span>
                                </Text>
                              )}
                              {c.mina_lote_mineral && (
                                <Text size="10px" c="zinc.2">
                                  Mina: <span className="text-zinc-100">{c.mina_lote_mineral}</span>
                                </Text>
                              )}
                              {c.labor_lote_mineral && (
                                <Text size="10px" c="zinc.2">
                                  Labor: <span className="text-zinc-100">{c.labor_lote_mineral}</span>
                                </Text>
                              )}
                            </Stack>
                          }
                          multiline
                          w={240}
                          withArrow
                        >
                          <Badge
                            size="xs"
                            color="teal"
                            variant="light"
                            className="font-semibold uppercase tracking-wider py-1 border border-current/15 cursor-help"
                          >
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                              <BeakerIcon className="w-3 h-3" />
                              Prod.: {c.codigo_lote_mineral || "S/L"}
                            </span>
                          </Badge>
                        </Tooltip>
                        {contratistaLote && (
                          <Badge
                            size="xs"
                            color="gray"
                            variant="light"
                            className="font-semibold tracking-wider py-1 border border-current/15"
                          >
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                              <UserIcon className="w-3 h-3" />
                              {contratistaLote}
                            </span>
                          </Badge>
                        )}
                      </>
                    )}

                    {c.labor && (
                      <Badge
                        size="xs"
                        color="grape"
                        variant="light"
                        className="font-semibold uppercase tracking-wider py-1 border border-current/15"
                      >
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                          <MapPinIcon className="w-3 h-3" />
                          Labor: {c.labor}
                        </span>
                      </Badge>
                    )}

                    {(c.para_mantenimiento === true ||
                      Number(c.para_mantenimiento) === 1) && (
                      <Tooltip
                        label={
                          <Stack gap={2}>
                            {c.marca_activo_fijo_consumidor && (
                              <Text size="10px" c="zinc.2">
                                Marca: <span className="text-zinc-100">{c.marca_activo_fijo_consumidor}</span>
                              </Text>
                            )}
                            {c.modelo_activo_fijo_consumidor && (
                              <Text size="10px" c="zinc.2">
                                Modelo: <span className="text-zinc-100">{c.modelo_activo_fijo_consumidor}</span>
                              </Text>
                            )}
                            {Number(c.costo_compra_activo_fijo_consumidor) > 0 && (
                              <Text size="10px" c="zinc.2">
                                Costo AF: <span className="text-zinc-100">{formatMonto(c.costo_compra_activo_fijo_consumidor, record.moneda)}</span>
                              </Text>
                            )}
                          </Stack>
                        }
                        multiline
                        w={220}
                        withArrow
                      >
                        <Badge
                          size="xs"
                          color="pink"
                          variant="light"
                          className="font-semibold uppercase tracking-wider py-1 border border-current/15 cursor-help"
                        >
                          <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            <CogIcon className="w-3 h-3" />
                            Mant.: {c.correlativo_activo_fijo_consumidor || "S/A"}
                          </span>
                        </Badge>
                      </Tooltip>
                    )}

                    {Number(c.costo_unitario_base) > 0 && (
                      <Tooltip
                        label={
                          <Stack gap={2}>
                            <Text size="10px" c="indigo.3" fw={800}>
                              Costo unitario de este consumo
                            </Text>
                            <Text size="10px" c="zinc.2">
                              Origen: <span className="text-zinc-100">{origenMeta.label}</span>
                            </Text>
                            <Text size="10px" c="zinc.2">
                              Cant. base: <span className="text-zinc-100">{formatNumber(c.cantidad_base_consumida, 4)}</span>
                            </Text>
                          </Stack>
                        }
                        multiline
                        w={210}
                        withArrow
                      >
                        <Badge
                          size="xs"
                          color={origenMeta.color}
                          variant="light"
                          className="font-extrabold uppercase tracking-wider py-1.5 border border-current/15 cursor-help"
                        >
                          <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            <BanknotesIcon className="w-3 h-3" />
                            Costo: {formatMonto(costoTotalConsumo, record.moneda)}
                          </span>
                        </Badge>
                      </Tooltip>
                    )}
                  </div>

                  {/* Right details: Quién, cuándo */}
                  <div className="flex flex-row items-center md:items-end gap-x-3 gap-y-0.5 text-[11px] text-zinc-500 border-t md:border-t-0 border-zinc-800/40 pt-2 md:pt-0 w-full md:w-auto self-stretch md:self-auto justify-between md:justify-start">
                    <Stack gap={2}>
                      <Group gap={4}>
                        <UserIcon className="w-3 h-3 text-zinc-500" />
                        <Text size="10px" c="zinc.5" fw={700} className="uppercase tracking-wider">
                          Por:
                        </Text>
                        <Text size="11px" fw={700} className="text-zinc-200">
                          {c.empleado_registro}
                        </Text>
                      </Group>
                      {c.cargo_registro && (
                        <Group gap={4}>
                          <BriefcaseIcon className="w-3 h-3 text-zinc-500" />
                          <Text size="9px" c="zinc.5" fw={700} className="uppercase tracking-wider">
                            {c.cargo_registro}
                          </Text>
                        </Group>
                      )}
                    </Stack>
                    <Divider orientation="vertical" />
                    <Stack gap={2}>
                      <Group gap={4}>
                        <Text size="10px" c="zinc.5" fw={700} className="uppercase tracking-wider">
                          Consumo:
                        </Text>
                        <Text size="11px" fw={700} className="text-zinc-200">
                          {dayjs(c.fecha_hora_consumo).format("DD/MM/YYYY HH:mm")}
                        </Text>
                      </Group>
                      <Group gap={4}>
                        <Text size="9px" c="zinc.5" fw={700} className="uppercase tracking-wider">
                          Reg.:
                        </Text>
                        <Text size="10px" fw={700} className="text-zinc-300">
                          {dayjs(c.created_at).format("DD/MM/YYYY HH:mm")}
                        </Text>
                      </Group>
                    </Stack>
                  </div>

                  {/* Comentario abajo (si existe) */}
                  {c.comentario_consumo && (
                    <div className="w-full mt-1 pt-2 border-t border-zinc-800/40">
                      <Text size="10px" c="zinc.5" fw={700} className="uppercase tracking-wider mb-0.5">
                        Comentario
                      </Text>
                      <Text size="11px" className="text-zinc-300 italic">
                        "{c.comentario_consumo}"
                      </Text>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </Stack>
      )}
    </div>
  );
};
