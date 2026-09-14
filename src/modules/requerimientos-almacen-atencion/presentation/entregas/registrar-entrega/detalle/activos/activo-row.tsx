import { Badge, Checkbox, Select, Group, Switch, Text } from "@mantine/core";
import type { DetalleRequerimientoExtendido } from "../../../../../service/atencion.responses";
import type { RES_ActivoFijoDisponible } from "../../../../../../../service/responses/activo-fijo";
import type { RES_LoteMineral } from "../../../../../../../service/responses/lote-mineral";
import type { DestinoItem } from "../../../../../hooks/useRegistrarEntrega";

interface ActivoRowProps {
  activo: RES_ActivoFijoDisponible;
  idDetalleReq: number;
  cant: number;
  maxBase: number;
  detalle_req: DetalleRequerimientoExtendido;
  isSelectedElsewhere: boolean;
  allActivos: RES_ActivoFijoDisponible[];
  lotesMineral: RES_LoteMineral[];
  destinosMap: Record<string, DestinoItem>;
  handleCantActivoChange: (
    idDetalle: number,
    idActivo: number,
    cant: number,
  ) => void;
  handleDestinoChange: (
    key: string,
    field: string,
    value: string | number | null,
  ) => void;
}

export const ActivoRow = ({
  activo,
  idDetalleReq,
  cant,
  maxBase,
  isSelectedElsewhere,
  allActivos,
  lotesMineral,
  destinosMap,
  detalle_req,
  handleCantActivoChange,
  handleDestinoChange,
}: ActivoRowProps) => {
  const isSelected = cant > 0;

  // Is disabled if selected elsewhere or if we reached the pending limit (and this row is not selected)
  const isDisabled = isSelectedElsewhere || (maxBase === 0 && !isSelected);

  const key = `${idDetalleReq}_activo_${activo.id_activo}`;
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
      className={`${isSelected ? "bg-indigo-500/5" : "hover:bg-zinc-800/20"} transition-colors`}
    >
      <td className="py-3 text-center">
        <Badge
          variant="light"
          color="indigo"
          radius="sm"
          className="font-bold border border-indigo-500/20 py-3"
        >
          {activo.correlativo}
        </Badge>
      </td>
      <td className="text-center">
        <div className="flex flex-col gap-1 items-center">
          <Badge
            variant="dot"
            color={activo.en_almacen_principal ? "teal" : "blue"}
            size="sm"
            className="font-bold py-1.5"
          >
            {activo.en_almacen_principal
              ? "Almacén Principal"
              : activo.mina || activo.almacen || "Sin Asignar"}
          </Badge>
        </div>
      </td>
      <td className="text-center">
        <div className="flex flex-col gap-1 items-center justify-center">
          {!activo.control_por_horometro && !activo.control_por_odometro && (
            <Badge
              variant="light"
              color="zinc"
              size="sm"
              className="bg-zinc-800/30 font-bold"
            >
              No Aplica
            </Badge>
          )}
          {!!activo.control_por_horometro && (
            <Badge
              variant="light"
              color="teal"
              size="sm"
              className="bg-zinc-800/30 font-bold"
            >
              Por Horómetro
            </Badge>
          )}
          {!!activo.control_por_odometro && (
            <Badge
              variant="light"
              color="blue"
              size="sm"
              className="bg-zinc-800/30 font-bold"
            >
              Por Odómetro
            </Badge>
          )}
        </div>
      </td>
      <td className="text-center">
        <div className="flex items-center justify-center h-full">
          <Checkbox
            checked={isSelected}
            disabled={isDisabled}
            onChange={(e) =>
              handleCantActivoChange(
                idDetalleReq,
                activo.id_activo,
                e.currentTarget.checked ? 1 : 0,
              )
            }
            color="indigo"
            radius="sm"
            size="sm"
            classNames={{
              input:
                "cursor-pointer disabled:cursor-not-allowed border-zinc-700 bg-zinc-900",
            }}
          />
        </div>
      </td>
      <td className="">
        <Group gap="xs" wrap="nowrap" className="w-full" justify="center">
          <Group gap={6} wrap="nowrap" align="center">
            <Text
              size="10px"
              className={`font-bold tracking-tight select-none uppercase ${dest.tipo === "mantenimiento" ? "text-zinc-600" : "text-emerald-400 font-black"}`}
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
              size="10px"
              className={`font-bold tracking-tight select-none uppercase ${dest.tipo === "mantenimiento" ? "text-amber-500 font-black" : "text-zinc-600"}`}
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
                  ? `${lm.contratista.split(" ")[0]} - ${lm.codigo}`
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
              className="w-40 animate-fade-in"
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
