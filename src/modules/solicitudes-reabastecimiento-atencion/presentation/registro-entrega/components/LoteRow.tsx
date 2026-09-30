import { Badge, Group, NumberInput, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";
import { formatNumber } from "../../../../../shared/functions/formatNumber";
import type { RES_LoteDisponible } from "../../../../../service/responses/lote-producto";

interface LoteRowProps {
  lote: RES_LoteDisponible;
  cant: number;
  idSolicitudDetalle: number;
  unidadMedidaBaseAbv: string;
  maxBase: number;
  maxLote: number;
  stockAsignable: number;
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
}

export const LoteRow = ({
  lote,
  cant,
  idSolicitudDetalle,
  unidadMedidaBaseAbv,
  maxBase,
  maxLote,
  stockAsignable,
  handleCantChange,
  handleCantLoteChange,
}: LoteRowProps) => {
  const esCritico =
    lote.dias_para_vencer !== null && lote.dias_para_vencer <= 30;
  const esVencido = lote.dias_para_vencer !== null && lote.dias_para_vencer < 0;

  return (
    <tr
      className={`${cant > 0 ? "bg-indigo-500/5" : "hover:bg-zinc-800/20"} transition-colors`}
    >
      <td className="py-3 text-center">
        <Badge
          variant="light"
          color="indigo"
          radius="sm"
          className="font-bold border border-indigo-500/20 py-3"
        >
          {lote.correlativo}
        </Badge>
      </td>
      <td className="text-center">
        {lote.fecha_vencimiento ? (
          <div className="flex flex-col gap-1 items-center">
            <Text size="xs" fw={800} className="text-zinc-300 font-mono">
              {dayjs(lote.fecha_vencimiento).format("DD MMM YYYY")}
            </Text>
            <Badge
              variant="dot"
              color={esVencido ? "red" : esCritico ? "orange" : "teal"}
              size="xs"
              className="font-bold py-1.5"
            >
              {esVencido ? "CADUCADO" : `${lote.dias_para_vencer} DÍAS`}
            </Badge>
          </div>
        ) : (
          <Text size="10px" fw={700} className="italic text-zinc-500!">
            SIN VENCIMIENTO
          </Text>
        )}
      </td>
      <td className="text-center">
        <Stack align="center" gap={10}>
          <Group gap={4} wrap="nowrap" justify="center">
            <Badge
              variant="light"
              color="zinc.4"
              className="bg-zinc-800/30 font-black h-7"
            >
              {formatNumber(stockAsignable)} {unidadMedidaBaseAbv}
            </Badge>
            {lote.unidad_medida_lote_abv !== unidadMedidaBaseAbv && (
              <Badge
                variant="light"
                color="indigo.4"
                className="bg-zinc-800/30 font-black h-7"
              >
                {formatNumber(lote.stock_actual)} {lote.unidad_medida_lote_abv}
              </Badge>
            )}
          </Group>

          {lote.unidad_medida_lote_abv !== unidadMedidaBaseAbv && (
            <Text
              size="9px"
              c="zinc.5"
              fw={700}
              className="italic uppercase tracking-tight"
            >
              {formatNumber(lote.contenido_por_presentacion)}{" "}
              {unidadMedidaBaseAbv} x {lote.unidad_medida_lote_abv}
            </Text>
          )}
        </Stack>
      </td>
      <td className="pr-8">
        <div className="flex items-center justify-center gap-3">
          {lote.unidad_medida_lote_abv !== unidadMedidaBaseAbv && (
            <NumberInput
              size="sm"
              radius="xl"
              min={0}
              max={maxLote}
              value={
                cant > 0
                  ? Number(
                      (cant / (lote.contenido_por_presentacion || 1)).toFixed(
                        4,
                      ),
                    )
                  : ""
              }
              onChange={(val) =>
                handleCantLoteChange(
                  idSolicitudDetalle,
                  lote.id_lote,
                  Number(val),
                )
              }
              placeholder="0"
              clampBehavior="strict"
              hideControls
              leftSection={
                <Text size="10px" fw={600} c="gray.5" className="ml-2">
                  {lote.unidad_medida_lote_abv}
                </Text>
              }
              className="w-32"
              classNames={{
                input: `bg-zinc-950/40 border-zinc-800 focus:border-indigo-500/50 font-black text-sm shadow-inner ${cant > 0 ? "text-indigo-400 ring-1 ring-indigo-500/20" : "text-white"} text-center`,
              }}
            />
          )}

          <NumberInput
            size="sm"
            radius="xl"
            min={0}
            max={maxBase}
            value={cant || ""}
            onChange={(val) =>
              handleCantChange(idSolicitudDetalle, lote.id_lote, Number(val))
            }
            placeholder="0"
            clampBehavior="strict"
            hideControls
            leftSection={
              <Text size="10px" fw={600} c="gray.5" className="ml-2">
                {unidadMedidaBaseAbv}
              </Text>
            }
            className="w-32"
            classNames={{
              input: `bg-zinc-950/40 border-zinc-800 focus:border-indigo-500/50 font-black text-sm shadow-inner ${cant > 0 ? "text-indigo-400 ring-1 ring-indigo-500/20" : "text-white"} text-center`,
            }}
          />
        </div>
      </td>
    </tr>
  );
};
