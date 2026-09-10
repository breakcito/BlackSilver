import { useState, useEffect, useMemo } from "react";
import {
  Stack,
  Text,
  Button,
  NumberInput,
  Textarea,
  Select,
  Group,
  Switch,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import dayjs from "dayjs";
import { ControlConsumoService } from "../../service/control-consumo.service";
import { AuxService } from "../../../../service/auxiliar.service";
import { useNotify } from "../../../../hooks/useNotify";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { TipoBien } from "../../../../shared/enums/_generic/tipo-bien";
import type { RES_ActivoFijoDisponible } from "../../../../service/responses/activo-fijo";
import type { RES_Labor } from "../../../../service/responses/labor";
import type { RES_LoteMineral } from "../../../../service/responses/lote-mineral";
import type {
  RES_Consumo,
  RES_ResumenEntregasReq,
} from "../../service/control-consumo.responses";

interface RegistroConsumoProps {
  close: () => void;
  selectedDetail: RES_ResumenEntregasReq;
  onSuccess: (nuevoConsumo: RES_Consumo) => void;
  activos: RES_ActivoFijoDisponible[];
}

export const RegistroConsumo = ({
  close,
  selectedDetail,
  onSuccess,
  activos,
}: RegistroConsumoProps) => {
  const { notifySuccess, notifyError } = useNotify();

  const isAF = selectedDetail.tipo_bien === TipoBien.ActivoFijo;
  const isCons =
    selectedDetail.es_consumible === true ||
    Number(selectedDetail.es_consumible) === 1;
  const isOtr = !isAF && !isCons;

  // Quantities calculation
  const totalEntregadoBase = selectedDetail.cantidad_entregada_base;
  const totalConsumidoBase = selectedDetail.cantidad_consumida_base;
  const restanteBase = totalEntregadoBase - totalConsumidoBase;

  const totalEntregadoReq = selectedDetail.cantidad_entregada_req;
  const factorConversio =
    totalEntregadoReq > 0 ? totalEntregadoBase / totalEntregadoReq : 1;
  const restanteReq = factorConversio > 0 ? restanteBase / factorConversio : 0;

  const [formCantidad, setFormCantidad] = useState<number | string>(
    isOtr ? restanteReq : restanteBase,
  );
  const [formFechaHora, setFormFechaHora] = useState<Date | null>(new Date());
  const [formComentario, setFormComentario] = useState("");
  const [formActivoFijo, setFormActivoFijo] = useState<string | null>(null);
  const [formLabor, setFormLabor] = useState<string | null>(null);
  const [formLoteMineral, setFormLoteMineral] = useState<string | null>(null);
  const [destinoTipo, setDestinoTipo] = useState<"mantenimiento" | "produccion">("produccion");

  const puedeMantenimiento = useMemo(() => {
    return selectedDetail.producto_para_mantenimiento === true ||
      Number(selectedDetail.producto_para_mantenimiento) === 1;
  }, [selectedDetail.producto_para_mantenimiento]);

  const [labores, setLabores] = useState<RES_Labor[]>([]);
  const [lotesMineral, setLotesMineral] = useState<RES_LoteMineral[]>([]);
  const [loadingLabores, setLoadingLabores] = useState(false);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const defaultQty = isOtr ? restanteReq : restanteBase;
    setFormCantidad(defaultQty);
    setFormFechaHora(new Date());
    setFormComentario("");

    const initialTipo = (selectedDetail.para_mantenimiento === true || Number(selectedDetail.para_mantenimiento) === 1)
      ? "mantenimiento"
      : "produccion";
    setDestinoTipo(initialTipo);

    setFormActivoFijo(selectedDetail.id_activo_fijo_destino ? String(selectedDetail.id_activo_fijo_destino) : null);
    setFormLoteMineral(selectedDetail.id_lote_mineral ? String(selectedDetail.id_lote_mineral) : null);
    setFormLabor(null);
    setLabores([]);
    setLotesMineral([]);

    const fetchLabores = async () => {
      setLoadingLabores(true);
      try {
        const resp = await AuxService.get_labores();
        if (resp.success && resp.data) {
          setLabores(resp.data);
        }
      } catch (err) {
        console.error("Error al cargar labores:", err);
      } finally {
        setLoadingLabores(false);
      }
    };

    const fetchLotesMineral = async () => {
      setLoadingLotes(true);
      try {
        const resp = await AuxService.get_lotes_mineral();
        if (resp.success && resp.data) {
          setLotesMineral(resp.data);
        }
      } catch (err) {
        console.error("Error al cargar lotes mineral:", err);
      } finally {
        setLoadingLotes(false);
      }
    };

    fetchLabores();
    fetchLotesMineral();
  }, [selectedDetail, isOtr, restanteReq, restanteBase]);

  const laborsData = useMemo(() => {
    const groupsMap = new Map<
      string,
      Array<{ value: string; label: string }>
    >();
    labores.forEach((l) => {
      let groupItems = groupsMap.get(l.mina);
      if (!groupItems) {
        groupItems = [];
        groupsMap.set(l.mina, groupItems);
      }
      groupItems.push({
        value: String(l.id_labor),
        label: l.nombre || "S/N",
      });
    });

    const dataList: Array<{ group: string; items: Array<{ value: string; label: string }> }> = [];
    groupsMap.forEach((items, mina) => {
      dataList.push({ group: mina, items });
    });
    return dataList;
  }, [labores]);

  const handleSubmitConsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetail || !formFechaHora) return;

    let qtyBase = 0;

    if (isAF) {
      qtyBase = restanteBase;
    } else {
      if (formCantidad === "" || Number(formCantidad) <= 0) {
        notifyError("Debe ingresar una cantidad a consumir válida.");
        return;
      }

      if (isCons) {
        qtyBase = Number(formCantidad);
        if (qtyBase > restanteBase) {
          notifyError(
            "La cantidad ingresada supera la cantidad restante por consumir.",
          );
          return;
        }
      } else {
        const qtyReq = Number(formCantidad);
        if (qtyReq > restanteReq) {
          notifyError(
            "La cantidad ingresada supera la cantidad restante por consumir.",
          );
          return;
        }
        qtyBase = qtyReq * factorConversio;
      }
    }

    if (!isAF) {
      if (destinoTipo === "mantenimiento" && !formActivoFijo) {
        notifyError("Debe seleccionar un activo fijo para el mantenimiento.");
        return;
      }
      if (destinoTipo === "produccion" && !formLoteMineral) {
        notifyError("Debe seleccionar un lote de mineral para la producción.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const resp = await ControlConsumoService.registrarConsumo({
        id_requerimiento_almacen_entrega_detalle:
          selectedDetail.id_entrega_requerimiento_detalle,
        cantidad_base_consumida: qtyBase,
        fecha_hora_consumo: dayjs(formFechaHora).format("YYYY-MM-DD HH:mm:ss"),
        comentario_consumo: formComentario.trim() || null,
        id_activo_fijo_consumidor:
          destinoTipo === "mantenimiento" && formActivoFijo
            ? Number(formActivoFijo)
            : null,
        id_labor_destino: formLabor ? Number(formLabor) : null,
        id_lote_mineral:
          destinoTipo === "produccion" && formLoteMineral
            ? Number(formLoteMineral)
            : null,
        para_mantenimiento: destinoTipo === "mantenimiento",
        para_produccion: destinoTipo === "produccion",
      });

      if (resp.success && resp.data) {
        notifySuccess("Consumo registrado correctamente.");
        close();
        onSuccess(resp.data);
      } else {
        notifyError(resp.message || "Error al registrar el consumo.");
      }
    } catch (err) {
      console.error(err);
      notifyError("Ocurrió un error al conectar con el servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  const modalFieldClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    label: "text-zinc-300 mb-1 font-semibold text-xs ml-0.5",
    dropdown:
      "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
    option:
      "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors",
  };

  const activosData = useMemo(() => {
    const groupsMap = new Map<
      string,
      Array<{ value: string; label: string }>
    >();
    activos.forEach((a) => {
      let groupItems = groupsMap.get(a.producto);
      if (!groupItems) {
        groupItems = [];
        groupsMap.set(a.producto, groupItems);
      }
      groupItems.push({
        value: String(a.id_activo),
        label: a.correlativo,
      });
    });

    const dataList: Array<{ group: string; items: Array<{ value: string; label: string }> }> = [];
    groupsMap.forEach((items, product) => {
      dataList.push({ group: product, items });
    });
    return dataList;
  }, [activos]);

  return (
    <form onSubmit={handleSubmitConsumo}>
      <Stack gap="md">
        {/* Product Info Summary Box */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-3 flex flex-col gap-2">
          <Group gap={"xs"}>
            <Text
              size="xs"
              fw={700}
              className="text-zinc-400  mb-0.5 uppercase"
            >
              Producto:
            </Text>
            <Text
              size="xs"
              fw={800}
              className="text-white font-bold uppercase"
              c={"lime.4"}
            >
              {selectedDetail.producto}
            </Text>
          </Group>

          <div className="grid grid-cols-3 gap-2 mt-1 pt-2 border-t border-zinc-900/80">
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-500 font-extrabold uppercase">
                Entregado
              </span>
              <span className="text-xs text-zinc-300 font-bold">
                {isOtr
                  ? `${formatNumber(totalEntregadoReq)} ${selectedDetail.unidad_medida_req_abv}`
                  : `${formatNumber(totalEntregadoBase)} ${selectedDetail.unidad_medida_base_abv}`}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-500 font-extrabold uppercase">
                Consumido
              </span>
              <span className="text-xs text-zinc-300 font-bold">
                {isOtr
                  ? `${formatNumber(totalConsumidoBase / factorConversio)} ${selectedDetail.unidad_medida_req_abv}`
                  : `${formatNumber(totalConsumidoBase)} ${selectedDetail.unidad_medida_base_abv}`}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-500 font-extrabold uppercase">
                Restante
              </span>
              <span className="text-xs text-amber-400 font-extrabold">
                {isOtr
                  ? `${formatNumber(restanteReq)} ${selectedDetail.unidad_medida_req_abv}`
                  : `${formatNumber(restanteBase)} ${selectedDetail.unidad_medida_base_abv}`}
              </span>
            </div>
          </div>
        </div>

        {isAF && (
          <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-3">
            <Text size="xs" c="indigo.3" fw={600}>
              Este producto es un Activo. Al registrar el consumo, quedará como
              usado en su totalidad.
            </Text>
          </div>
        )}

        {!isAF && (
          <Stack gap="md">
            <Group gap="md" grow align="flex-end">
              <NumberInput
                label={
                  isOtr
                    ? `Cantidad (${selectedDetail.unidad_medida_req_abv})`
                    : `Cantidad (${selectedDetail.unidad_medida_base_abv})`
                }
                placeholder={
                  isOtr
                    ? `4 ${selectedDetail.unidad_medida_req_abv}...`
                    : `4 ${selectedDetail.unidad_medida_base_abv}...`
                }
                value={formCantidad}
                onChange={(val) => {
                  const maxVal = isOtr ? restanteReq : restanteBase;
                  if (typeof val === "number") {
                    setFormCantidad(val > maxVal ? maxVal : val);
                  } else {
                    const num = parseFloat(val);
                    if (!isNaN(num) && num > maxVal) {
                      setFormCantidad(maxVal);
                    } else {
                      setFormCantidad(val);
                    }
                  }
                }}
                max={isOtr ? restanteReq : restanteBase}
                clampBehavior="strict"
                min={0}
                required
                radius="lg"
                size="sm"
                classNames={modalFieldClasses}
              />

              <div className="flex flex-col gap-1.5 h-10 justify-center">
                <Text size="xs" fw={600} className="text-zinc-300 ml-0.5 mb-1">
                  Destinado a
                </Text>
                <Group
                  gap={6}
                  wrap="nowrap"
                  align="center"
                  className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-1.5 h-9"
                >
                  <Text
                    size="xs"
                    fw={600}
                    className={`font-bold select-none transition-colors ${destinoTipo === "mantenimiento" ? "text-zinc-500" : "text-emerald-400 font-black"}`}
                  >
                    Producción
                  </Text>
                  <Switch
                    checked={destinoTipo === "mantenimiento"}
                    onChange={(event) => {
                      const newTipo = event.currentTarget.checked ? "mantenimiento" : "produccion";
                      setDestinoTipo(newTipo);
                      if (newTipo === "mantenimiento") {
                        setFormLoteMineral(null);
                      } else {
                        setFormActivoFijo(null);
                      }
                    }}
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
                    className={`font-bold select-none transition-colors ${destinoTipo === "mantenimiento" ? "text-amber-500 font-black" : "text-zinc-500"}`}
                  >
                    Mantenimiento
                  </Text>
                </Group>
              </div>
            </Group>

            <Group gap="md" grow>
              {destinoTipo === "mantenimiento" ? (
                <Select
                  label="Activo Fijo (Mantenimiento) *"
                  placeholder="Seleccione el activo a mantener..."
                  data={activosData}
                  value={formActivoFijo}
                  onChange={setFormActivoFijo}
                  searchable
                  required
                  radius="lg"
                  size="sm"
                  classNames={modalFieldClasses}
                  comboboxProps={{
                    withinPortal: true,
                    zIndex: 9999,
                  }}
                />
              ) : (
                <Select
                  label="Lote en Producción"
                  placeholder={loadingLotes ? "Cargando lotes..." : "Seleccione lote mineral (opcional)..."}
                  data={lotesMineral.map((lm) => ({
                    value: String(lm.id_lote_mineral),
                    label: lm.contratista
                      ? `${lm.codigo} - ${lm.contratista}`
                      : lm.codigo,
                  }))}
                  value={formLoteMineral}
                  onChange={setFormLoteMineral}
                  searchable
                  clearable
                  radius="lg"
                  size="sm"
                  classNames={modalFieldClasses}
                  comboboxProps={{
                    withinPortal: true,
                    zIndex: 9999,
                  }}
                />
              )}
            </Group>
          </Stack>
        )}

        <Group gap="md" grow>
          {/* Selector de Labor Destino (Opcional) */}
          <Select
            label="Labor Destino (opc.)"
            placeholder={
              loadingLabores
                ? "Cargando labores..."
                : laborsData.length > 0
                  ? "Seleccione labor..."
                  : "Sin labores registradas"
            }
            data={laborsData}
            value={formLabor}
            onChange={setFormLabor}
            searchable
            disabled={loadingLabores}
            clearable
            radius="lg"
            size="sm"
            classNames={modalFieldClasses}
            comboboxProps={{
              withinPortal: true,
              zIndex: 9999,
            }}
          />

          <DateTimePicker
            label="Fecha y Hora de Consumo"
            placeholder="Seleccione fecha y hora..."
            value={formFechaHora}
            onChange={(val) => setFormFechaHora(val ? new Date(val) : null)}
            maxDate={new Date()}
            required
            radius="lg"
            size="sm"
            classNames={modalFieldClasses}
          />
        </Group>

        {/* Textarea for comments */}
        <Textarea
          label="Comentario / Justificación"
          placeholder="Ingrese detalles del consumo (ej. medio litro se regó)..."
          value={formComentario}
          onChange={(e) => setFormComentario(e.currentTarget.value)}
          radius="lg"
          size="sm"
          minRows={3}
          classNames={modalFieldClasses}
        />

        <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-zinc-900/60 font-semibold">
          <Button
            variant="subtle"
            color="gray"
            radius="lg"
            size="sm"
            onClick={close}
            disabled={submitting}
            className="hover:bg-zinc-900"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            color="indigo"
            radius="lg"
            size="sm"
            loading={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-lg shadow-indigo-900/20"
          >
            Registrar Consumo
          </Button>
        </div>
      </Stack>
    </form>
  );
};
