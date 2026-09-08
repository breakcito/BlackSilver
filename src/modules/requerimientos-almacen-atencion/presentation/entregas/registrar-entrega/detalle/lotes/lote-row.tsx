import { Badge, NumberInput, Text, Select, Group, Switch } from "@mantine/core";
import dayjs from "dayjs";
import { formatNumber } from "../../../../../../../shared/functions/formatNumber";
import type { DetalleRequerimientoExtendido } from "../../../../../service/atencion.responses";
import type { RES_LoteDisponible } from "../../../../../../../service/responses/lote-producto";
import type { RES_ActivoFijoDisponible } from "../../../../../../../service/responses/activo-fijo";
import type { RES_LoteMineral } from "../../../../../../../service/responses/lote-mineral";
import type { DestinoItem } from "../../../../../hooks/useRegistrarEntrega";

interface LoteRowProps {
  lote: RES_LoteDisponible;
  idDetalleReq: number;
  cant: number;
  maxBase: number;
  maxLote: number;
  detalle_req: DetalleRequerimientoExtendido;
  stockVisible: number;
  allActivos: RES_ActivoFijoDisponible[];
  lotesMineral: RES_LoteMineral[];
  destinosMap: Record<string, DestinoItem>;
  handleCantChange: (idDetalle: number, idLote: number, cant: number) => void;
  handleCantLoteChange: (
    idDetalle: number,
    idLote: number,
    cant: number,
  ) => void;
  handleDestinoChange: (
    key: string,
    field: string,
    value: string | number | null,
  ) => void;
}

export const LoteRow = ({
  lote,
  idDetalleReq,
  cant,
  maxBase,
  maxLote,
  detalle_req,
  stockVisible,
  allActivos,
  lotesMineral,
  destinosMap,
  handleCantChange,
  handleCantLoteChange,
  handleDestinoChange,
}: LoteRowProps) => {
  const esCritico =
    lote.dias_para_vencer !== null && lote.dias_para_vencer <= 5;
  const esVencido = lote.dias_para_vencer !== null && lote.dias_para_vencer < 0;

  const key = `${idDetalleReq}_lote_${lote.id_lote}`;
  const dest = destinosMap[key] || {
    tipo: "",
    id_activo_fijo_destino: null,
    id_lote_mineral: null,
  };
  const puedeMantenimiento = !!detalle_req.producto_para_mantenimiento;

  const selectClasses = {
    input:
      "bg-zinc-950/50 border-zinc-800 focus:border-indigo-500/50 text-xs text-white placeholder:text-zinc-500 h-9 rounded-lg",
    dropdown: "bg-zinc-900 border-zinc-800 text-xs text-zinc-300",
    option:
      "hover:bg-zinc-800 text-xs text-zinc-300 data-[selected]:bg-zinc-100 data-[selected]:text-zinc-900 rounded-md my-1",
  };

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
      <td className="text-center flex flex-col gap-1 items-center justify-center py-3">
        {lote.id_unidad_medida_lote !== detalle_req.id_unidad_medida_base && (
          <Text size="xs" c="teal.4" fw={800} className="font-mono">
            {formatNumber(
              stockVisible / (lote.contenido_por_presentacion || 1),
            )}{" "}
            {lote.unidad_medida_lote_abv}
          </Text>
        )}
        <Badge variant="light" color="blue.4" size="sm">
          {formatNumber(stockVisible)} {detalle_req.unidad_medida_base_abv}
        </Badge>
      </td>
      <td className="text-center">
        <div className="flex items-center justify-center gap-3">
          {lote.id_unidad_medida_lote !== detalle_req.id_unidad_medida_base && (
            <NumberInput
              size="xs"
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
                handleCantLoteChange(idDetalleReq, lote.id_lote, Number(val))
              }
              placeholder="0"
              clampBehavior="strict"
              hideControls
              rightSection={
                <Text
                  size="11px"
                  fw={600}
                  c="teal"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {lote.unidad_medida_lote_abv}
                </Text>
              }
              rightSectionWidth={48}
              classNames={{
                input: `w-24`,
              }}
            />
          )}

          <NumberInput
            size="xs"
            radius="xl"
            min={0}
            max={maxBase}
            value={cant || ""}
            onChange={(val) =>
              handleCantChange(idDetalleReq, lote.id_lote, Number(val))
            }
            placeholder="0"
            clampBehavior="strict"
            hideControls
            rightSection={
              <Text
                size="11px"
                fw={600}
                c="blue"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {detalle_req.unidad_medida_base_abv}
              </Text>
            }
            rightSectionWidth={48}
            classNames={{
              input: `w-24`,
            }}
          />
        </div>
      </td>
      <td className="">
        <Group gap="xs" wrap="nowrap" className="w-full" justify="center">
          <Group gap={6} wrap="nowrap" align="center">
            <Text
              size="xs"
              fw={600}
              className={`font-bold  select-none  ${dest.tipo === "mantenimiento" ? "text-zinc-600" : "text-emerald-400 font-black"}`}
            >
              Producción
            </Text>
            <Switch
              checked={dest.tipo === "mantenimiento"}
              onChange={(event) =>
                handleDestinoChange(
                  key,
                  "tipo",
                  event.currentTarget.checked ? "mantenimiento" : "produccion",
                )
              }
              disabled={!puedeMantenimiento}
              color="indigo"
              size="sm"
              classNames={{
                track: "cursor-pointer disabled:cursor-not-allowed",
              }}
            />
            <Text
              size="xs"
              fw={600}
              className={`font-bold select-none  ${dest.tipo === "mantenimiento" ? "text-amber-500 font-black" : "text-zinc-600"}`}
            >
              Mantenimiento
            </Text>
          </Group>
          {dest.tipo === "produccion" && (
            <Select
              placeholder="Lote Mineral"
              data={lotesMineral.map((lm) => ({
                value: String(lm.id_lote_mineral),
                label: lm.contratista
                  ? `${lm.codigo} - ${lm.contratista}`
                  : lm.codigo,
              }))}
              value={dest.id_lote_mineral ? String(dest.id_lote_mineral) : null}
              onChange={(val) =>
                handleDestinoChange(
                  key,
                  "id_lote_mineral",
                  val ? Number(val) : null,
                )
              }
              classNames={selectClasses}
              radius="md"
              className="w-64 animate-fade-in"
              searchable
            />
          )}
          {dest.tipo === "mantenimiento" && (
            <Select
              placeholder="Equipo Destino"
              data={allActivos.map((a) => ({
                value: String(a.id_activo),
                label: `${a.correlativo} - ${a.producto}`,
              }))}
              value={
                dest.id_activo_fijo_destino
                  ? String(dest.id_activo_fijo_destino)
                  : null
              }
              onChange={(val) =>
                handleDestinoChange(
                  key,
                  "id_activo_fijo_destino",
                  val ? Number(val) : null,
                )
              }
              classNames={selectClasses}
              radius="md"
              className="w-44 animate-fade-in"
              searchable
            />
          )}
        </Group>
      </td>
    </tr>
  );
};
