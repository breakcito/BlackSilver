import { ActionIcon, Badge, Checkbox, Group, Stack, Text, Tooltip } from "@mantine/core";
import {
  ClockIcon,
  CubeIcon,
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { formatNumber } from "../../../../../shared/functions/formatNumber";
import { getNombrePeriodo } from "../../../../../shared/functions/get-nombre-periodo.ts";
import { Estado_OrdenCompraDetalle } from "../../../../../shared/enums/orden-compra/orden-compra.ts";
import type { RES_OrdenCompraDetalle } from "../../../../../service/responses/ordenes-compra/orden-compra";
import { TipoBien } from "../../../../../shared/enums/_generic/tipo-bien";

interface OrdenCompraFilaDetalleProps {
  det: RES_OrdenCompraDetalle;
  idx: number;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (id: number) => void;
  onOpenTrace: (idDetalle: number, nombre: string) => void;
  symbol: string;
}

export const OrdenCompraFilaDetalle = ({
  det,
  idx,
  isSelected,
  isDisabled,
  onSelect,
  onOpenTrace,
  symbol,
}: OrdenCompraFilaDetalleProps) => {
  const req = Number(det.cantidad_requerida_base) || 0;
  const rec = Number(det.cantidad_recepcionada_base) || 0;
  const isAvailable = rec < req - 0.001;

  const isAsset = det.tipo_bien === TipoBien.ActivoFijo;

  return (
    <tr
      className={`hover:bg-zinc-900/40 transition-colors group ${
        isSelected ? (isAsset ? "bg-violet-500/5" : "bg-indigo-500/5") : ""
      } ${isDisabled ? "opacity-30 pointer-events-none select-none" : ""}`}
    >
      {/* Indice */}
      <td className="px-6 py-4 text-center text-xs font-mono text-zinc-500">
        {idx + 1}
      </td>

      {/* Selecctor para la rececpion */}
      <td className="px-6 py-4 text-center">
        <Checkbox
          checked={isSelected}
          onChange={() => onSelect(det.id_orden_compra_detalle)}
          disabled={!isAvailable || isDisabled}
          color={isAsset ? "violet" : "indigo"}
          size="sm"
          className={
            isAvailable && !isDisabled ? "cursor-pointer" : "opacity-40"
          }
        />
      </td>

      {/* Producto */}
      <td className="px-6 py-4">
        <Stack gap={4}>
          <Group gap="sm">
            <div
              className={`w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 transition-all ${
                isAsset
                  ? "group-hover:border-violet-500/50"
                  : "group-hover:border-indigo-500/50"
              }`}
            >
              {isAsset ? (
                <CpuChipIcon className="w-4 h-4 text-violet-400" />
              ) : (
                <CubeIcon className="w-4 h-4 text-zinc-400" />
              )}
            </div>
            <Text size="sm" fw={800} className="text-zinc-100 tracking-tight">
              {det.producto}
            </Text>
            {det.comentario && (
              <Tooltip
                label={det.comentario}
                position="top"
                withArrow
                multiline
                w={280}
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4 text-cyan-400 cursor-help" />
              </Tooltip>
            )}
          </Group>
          <Group gap={4}>
            {isAsset && (
              <Badge
                variant="light"
                color="violet"
                size="9px"
                radius="xs"
                className="font-black py-1.5!"
              >
                ACTIVO FIJO
              </Badge>
            )}
            {det.es_auditable && (
              <Badge
                variant="filled"
                color="red"
                size="9px"
                radius="xs"
                className="font-black py-1.5!"
              >
                AUDITABLE
              </Badge>
            )}
            {det.es_perecible && (
              <Badge
                variant="filled"
                color="orange"
                size="9px"
                radius="xs"
                className="font-black py-1.5!"
              >
                PERECIBLE
              </Badge>
            )}
          </Group>
        </Stack>
      </td>

      {/* Almacén/Entrega */}
      <td className="px-6 py-4 text-center">
        <Stack gap={0} align="center">
          <Group justify="center" gap={4}>
            <Text
              fw={700}
              c={"gray.4"}
              size="xs"
              className="italic line-clamp-1"
            >
              {det.mina_destino ? "Mina" : "Almacén"}:
            </Text>
            <Badge
              size="sm"
              fw={700}
              variant="light"
              color={det.mina_destino ? "orange.4" : "lime.4"}
              className="italic line-clamp-1"
            >
              {det.mina_destino || det.almacen_recepcionista}
            </Badge>
          </Group>
          <Group gap={4} mt={4} justify="center">
            <Badge
              color="blue"
              variant="light"
              size="xs"
              radius="xs"
              className="px-1!"
            >
              {det.tipo_despacho}
            </Badge>
            <Text size="xs" c="zinc.5" fw={600}>
              {det.tiempo_entrega}{" "}
              {getNombrePeriodo(det.tiempo_entrega_periodo)}
            </Text>
          </Group>
          {det.lugar_recojo && (
            <Text
              size="xs"
              c="zinc.5"
              mt={2}
              className="line-clamp-1"
              title={det.lugar_recojo}
            >
              Recojo: {det.lugar_recojo}
            </Text>
          )}
        </Stack>
      </td>

      {/* Cantidad solicitada */}
      <td className="px-6 py-4 text-center">
        <Stack gap={1} align="center">
          <Text size="xs" fw={800} className="text-zinc-100">
            {formatNumber(det.cantidad_requerida)} {det.unidad_medida_oc_abv}
          </Text>

          {det.id_unidad_medida_base !== det.id_unidad_medida_oc && (
            <Badge size="xs" color="cyan" fw={700} variant="outline">
              {formatNumber(det.contenido_por_presentacion)}{" "}
              {det.unidad_medida_base_abv} x {det.unidad_medida_oc_abv}
            </Badge>
          )}
        </Stack>
      </td>

      {/* Costo */}
      <td className="px-6 py-4 text-center">
        <div className="flex flex-row justify-center items-center gap-3">
          {/* Precio Unitario Base */}
          <div className="flex flex-col items-center leading-tight">
            <Text
              size="10px"
              fw={700}
              className="uppercase tracking-tighter"
              c={"cyan"}
            >
              Por {det.unidad_medida_base_abv}
            </Text>
            <Text size="xs" fw={700} className="text-zinc-100 font-mono">
              {symbol} {formatNumber(det.precio_unitario_base)}
            </Text>
          </div>

          {/* Precio Presentación (solo si es diferente a la base) */}
          {det.id_unidad_medida_base !== det.id_unidad_medida_oc && (
            <>
              <div className="w-px h-6 bg-zinc-800/60" />
              <div className="flex flex-col items-center leading-tight">
                <Text
                  size="10px"
                  fw={700}
                  c={"yellow"}
                  className="uppercase tracking-tighter"
                >
                  Por {det.unidad_medida_oc_abv}
                </Text>
                <Text size="xs" fw={700} className="text-zinc-100 font-mono">
                  {symbol} {formatNumber(det.precio_unitario)}
                </Text>
              </div>
            </>
          )}

          <div className="w-px h-6 bg-indigo-500/30" />

          {/* Subtotal */}
          <div className="flex flex-col items-center leading-tight">
            <Text
              size="10px"
              fw={800}
              c={"blue.4"}
              className="uppercase tracking-tighter"
            >
              Subtotal
            </Text>
            <Text size="xs" fw={800} className="text-teal-400 font-mono">
              {symbol}{" "}
              {formatNumber(det.precio_unitario * det.cantidad_requerida)}
            </Text>
          </div>
        </div>
      </td>

      {/* Progreso de Recepción */}
      <td className="px-6 py-4 text-center">
        <div className="flex flex-row justify-center items-center gap-2">
          <div className="flex flex-col items-center leading-none">
            <Text
              size="10px"
              fw={700}
              c="teal.5"
              className="uppercase tracking-tighter"
            >
              Rec.
            </Text>
            <Text
              size="xs"
              fw={800}
              c={det.cantidad_recepcionada_base > 0 ? "teal.4" : "zinc-6"}
            >
              {formatNumber(
                det.cantidad_recepcionada_base / det.contenido_por_presentacion,
              )}
            </Text>
          </div>

          <div className="w-px h-5 bg-zinc-800" />

          <div className="flex flex-col items-center leading-none">
            <Text
              size="10px"
              fw={700}
              c="orange.5"
              className="uppercase tracking-tighter"
            >
              Pen.
            </Text>
            <Text
              size="xs"
              fw={800}
              c={
                det.cantidad_requerida_base - det.cantidad_recepcionada_base >
                0.001
                  ? "orange.4"
                  : "zinc-6"
              }
            >
              {formatNumber(
                Math.max(
                  0,
                  det.cantidad_requerida_base - det.cantidad_recepcionada_base,
                ) / det.contenido_por_presentacion,
              )}
            </Text>
          </div>
        </div>
      </td>

      {/* Estado */}
      <td className="px-6 py-4 text-center">
        <Badge
          variant="light"
          color={
            det.estado === Estado_OrdenCompraDetalle.RecepcionCompleta
              ? "teal"
              : det.estado === Estado_OrdenCompraDetalle.EnRecepcion
                ? "indigo"
                : "cyan.4"
          }
          size="sm"
          radius="sm"
          className="font-bold"
        >
          {det.estado}
        </Badge>
      </td>

      {/* Acciones */}
      <td className="px-6 py-4 text-center">
        <ActionIcon
          variant="subtle"
          color="indigo"
          radius="md"
          className="opacity-60 hover:opacity-100 hover:bg-indigo-500/10"
          onClick={() => onOpenTrace(det.id_orden_compra_detalle, det.producto)}
          title="Ver trazabilidad"
        >
          <ClockIcon className="w-5 h-5" />
        </ActionIcon>
      </td>
    </tr>
  );
};
