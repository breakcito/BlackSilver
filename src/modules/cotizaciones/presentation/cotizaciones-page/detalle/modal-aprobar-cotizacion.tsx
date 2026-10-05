import { useState, useEffect } from "react";
import {
  Stack,
  Text,
  Button,
  Checkbox,
  Select,
  Badge,
  NumberInput,
  Textarea,
} from "@mantine/core";
import {
  CheckBadgeIcon,
  ShoppingCartIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";
import { ModalEstandar } from "../../../../../presentation/utils/modal-estandar";
import { CotizacionesService } from "../../../service/cotizaciones.service";
import { useNotify } from "../../../../../hooks/useNotify";
import { formatNumber } from "../../../../../shared/functions/formatNumber";
import { useAprobacionCotizacion } from "../../../hooks/aprobacion/useAprobacionCotizacion";

import type {
  RES_Cotizacion,
  RES_CotizacionDetalle,
} from "../../../../../service/responses/cotizaciones/cotizacion";

interface ModalAprobarCotizacionProps {
  opened: boolean;
  onClose: () => void;
  cotizacion: RES_Cotizacion | null;
  detalles: RES_CotizacionDetalle[];
  empresas: {
    id_cotizacion: number;
    id_empresa: number;
    razon_social: string;
  }[];
  onSuccess: (
    id_cotizacion: number,
    cotizacionModificada: RES_Cotizacion,
    detallesAprobados: RES_CotizacionDetalle[],
    id_orden_compra?: number,
  ) => void;
}

export const ModalAprobarCotizacion = ({
  opened,
  onClose,
  cotizacion,
  detalles,
  empresas,
  onSuccess,
}: ModalAprobarCotizacionProps) => {
  const { notifySuccess, notifyError } = useNotify();
  const [loading, setLoading] = useState(false);
  // Observación de la OC (cabecera) — se prellena con la de la cotización
  const [observacionOC, setObservacionOC] = useState("");
  // Comentario por cada detalle aprobado — prellenado con el de la cotización
  const [comentariosPorDetalle, setComentariosPorDetalle] = useState<
    Record<number, string>
  >({});

  // Cuando se abre el modal, prellenar con los valores actuales de la cotizacion/detalles
  useEffect(() => {
    if (opened && cotizacion) {
      setObservacionOC(cotizacion.observacion ?? "");
      const map: Record<number, string> = {};
      detalles.forEach((d) => {
        if (d.comentario) map[d.id_cotizacion_detalle] = d.comentario;
      });
      setComentariosPorDetalle(map);
    }
  }, [opened, cotizacion?.id_cotizacion]);

  // ─── Hook centralizado de aprobación ────────────────────────────────────────
  const aprobacion = useAprobacionCotizacion({
    moneda: cotizacion?.moneda ?? "Soles",
    opened,
    detalles: detalles.map((d) => ({
      key: d.id_cotizacion_detalle,
      precio_referencia: Number(d.precio_unitario ?? 0),
      habilitado: true,
    })),
    initialEmpresaId: empresas[0]?.id_empresa.toString() ?? null,
    initialTipoCambio: cotizacion?.tipo_cambio_venta_referencial || "",
  });

  const {
    state,
    allSelected,
    indeterminate,
    toggleKey,
    toggleAll,
    setPrecioOC,
    validate,
    getSubtotal,
    getVariacion,
    tipoCambioAplicado,
  } = aprobacion;

  const setComentarioDet = (key: number, val: string) => {
    setComentariosPorDetalle((prev) => ({ ...prev, [key]: val }));
  };

  const handleConfirm = async () => {
    if (!cotizacion) return;
    const error = validate();
    if (error) { notifyError(error); return; }

    try {
      setLoading(true);
      const res = await CotizacionesService.aprobar_cotizacion(
        cotizacion.id_cotizacion,
        {
          id_empresa_compradora: Number(state.selectedEmpresaId),
          detalles_aprobados: state.selectedKeys.map((id) => ({
            id,
            precio_confirmado: Number(state.preciosOC[id] ?? 0),
            comentario: comentariosPorDetalle[id] ?? "",
          })),
          tipo_cambio_aplicado: tipoCambioAplicado,
          observacion: observacionOC,
        },
      );

      if (res.success && res.data) {
        notifySuccess(
          `Orden de Compra ${res.data.correlativo} generada correctamente.`,
        );
        const cotDetallesAprobados = detalles.filter((d) =>
          state.selectedKeys.includes(d.id_cotizacion_detalle),
        );
        onSuccess(
          cotizacion.id_cotizacion,
          cotizacion,
          cotDetallesAprobados,
          res.data.id_orden_compra,
        );
        onClose();
      } else {
        notifyError(res.message);
      }
    } catch (e) {
      console.error(e);
      notifyError("No se pudo procesar la aprobación.");
    } finally {
      setLoading(false);
    }
  };

  if (!cotizacion) return null;

  const simbolo = cotizacion.moneda === "Soles" ? "S/." : "$";

  return (
    <ModalEstandar
      opened={opened}
      close={onClose}
      onClose={onClose}
      title="Aprobar Cotización"
      size="xl"
    >
      <div className="flex flex-col" style={{ height: "72vh" }}>
        {/* ── Sección fija superior ── */}
        <div className="flex-none space-y-3 pb-3">
          {/* Banner */}
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-3 flex gap-3 items-center">
            <ShoppingCartIcon className="w-7 h-7 text-indigo-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <Text size="sm" fw={800} className="text-white leading-tight">
                Generación de Orden de Compra
              </Text>
              <Text size="xs" c="dimmed" className="leading-snug mt-0.5">
                Verifique los productos a incluir en la compra.{" "}
                Cotización:{" "}
                <span className="text-indigo-300 font-bold">{cotizacion.correlativo}</span>
              </Text>
            </div>
          </div>

          {/* Empresa + Tipo Cambio */}
          <div className={cotizacion.moneda !== "Soles" ? "grid grid-cols-2 gap-3" : ""}>
            <Stack gap={4}>
              <Text size="xs" fw={800} className="text-zinc-400 uppercase tracking-widest">
                Empresa Compradora
              </Text>
              <Select
                placeholder="Seleccione la empresa"
                data={empresas.map((e) => ({
                  value: e.id_empresa.toString(),
                  label: e.razon_social,
                }))}
                value={state.selectedEmpresaId}
                onChange={(val) =>
                  aprobacion.setState((prev) => ({ ...prev, selectedEmpresaId: val }))
                }
                radius="lg"
                size="sm"
                classNames={{
                  input: "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-600 transition-all",
                  dropdown: "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
                  option: "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors",
                }}
              />
            </Stack>
            {cotizacion.moneda !== "Soles" && (
              <Stack gap={4}>
                <Text size="xs" fw={800} className="text-zinc-400 uppercase tracking-widest">
                  Tipo de Cambio (S/.)
                </Text>
                <NumberInput
                  placeholder="Ej. 3.85"
                  value={state.tipoCambio}
                  onChange={(val) =>
                    aprobacion.setState((prev) => ({
                      ...prev,
                      tipoCambio: val === "" ? "" : Number(val),
                    }))
                  }
                  decimalScale={4}
                  min={0}
                  radius="lg"
                  size="sm"
                  classNames={{
                    input: "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-600 transition-all",
                  }}
                />
              </Stack>
            )}
          </div>

          {/* Observaciones de la OC (cabecera) */}
          <Textarea
            label="Observaciones (Opcional)"
            placeholder="Ej: Entrega urgente en almacén principal..."
            value={observacionOC}
            onChange={(e) => setObservacionOC(e.currentTarget.value)}
            radius="lg"
            size="sm"
            minRows={2}
            maxRows={4}
            autosize
            classNames={{
              input:
                "bg-zinc-900/50 border-zinc-800 text-white text-xs placeholder:text-zinc-600",
              label: "text-zinc-400 text-xs font-semibold mb-1",
              description: "text-zinc-500 text-[10px] mt-0.5",
            }}
          />
        </div>

        {/* ── Productos (scrollable) ── */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 gap-2">
          <div className="flex-none flex items-center justify-between">
            <Text size="xs" fw={800} className="text-zinc-400 uppercase tracking-widest">
              Productos Cotizados
            </Text>
            <Checkbox
              size="xs"
              color="indigo"
              checked={allSelected}
              indeterminate={indeterminate}
              label={<Text size="xs" c="dimmed" fw={700}>Seleccionar Todos</Text>}
              onChange={toggleAll}
              classNames={{ label: "cursor-pointer" }}
            />
          </div>

          <div className="flex-1 overflow-y-auto bg-zinc-900/50 rounded-2xl border border-zinc-800/80 flex flex-col custom-scrollbar">
            {detalles.map((det) => {
              const key = det.id_cotizacion_detalle;
              const isChecked = state.selectedKeys.includes(key);
              const precioRef = Number(det.precio_unitario ?? 0);
              const variacion = getVariacion(key, precioRef);

              return (
                <div
                  key={key}
                  className={`px-4 py-3 border-b border-zinc-800/40 last:border-b-0 transition-all ${
                    isChecked ? "bg-indigo-500/5" : "opacity-50"
                  }`}
                >
                  {/* Fila principal: 3 columnas iguales */}
                  <div className="grid grid-cols-3 items-center gap-2">
                    {/* Col 1: checkbox + nombre */}
                    <div className="flex items-center gap-2 min-w-0">
                      <Checkbox
                        size="sm"
                        checked={isChecked}
                        onChange={() => toggleKey(key)}
                        color="indigo"
                        radius="sm"
                        className="shrink-0"
                      />
                      <Text
                        size="xs"
                        fw={800}
                        className={`min-w-0 truncate leading-tight ${
                          isChecked ? "text-white" : "text-zinc-400"
                        }`}
                      >
                        {det.producto}
                      </Text>
                    </div>
                    {/* Col 2: cantidad · input · c/u + variación abajo (centrado) */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center justify-center gap-1.5">
                        <Text size="11px" c="dimmed" className="whitespace-nowrap font-mono">
                          {formatNumber(det.cantidad)} {det.unidad_medida_ctz_abv} · a
                        </Text>
                        <NumberInput
                          size="xs"
                          disabled={!isChecked}
                          value={state.preciosOC[key] ?? ""}
                          onChange={(val) =>
                            setPrecioOC(key, val === "" ? "" : Number(val))
                          }
                          decimalScale={4}
                          min={0}
                          prefix={`${simbolo} `}
                          className="w-28"
                          radius="lg"
                          classNames={{
                            input: `bg-zinc-900/50 border-zinc-800 text-white text-xs font-bold transition-all placeholder:text-zinc-600 ${
                              isChecked
                                ? "focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300"
                                : "opacity-40 pointer-events-none"
                            }`,
                          }}
                        />
                        <Text size="11px" c="dimmed" className="whitespace-nowrap">c/u</Text>
                      </div>
                      {isChecked && variacion !== null && variacion !== 0 && (
                        <Badge size="xs" variant="light" color={variacion > 0 ? "red" : "teal"}>
                          {variacion > 0 ? "+" : ""}{simbolo}{" "}
                          {formatNumber(Math.abs(variacion))} vs cotización
                        </Badge>
                      )}
                    </div>
                    {/* Col 3: subtotal (derecha) */}
                    <div className="flex justify-end">
                      <Badge
                        variant="light"
                        color={isChecked ? "indigo" : "gray"}
                        size="sm"
                        className="font-mono"
                      >
                        Sub: {simbolo} {formatNumber(getSubtotal(key, Number(det.cantidad), precioRef))}
                      </Badge>
                    </div>
                  </div>

                  {/* Comentario por producto (solo si está aprobado) */}
                  {isChecked && (
                    <div className="mt-2 pl-7">
                      <Textarea
                        placeholder="Comentario opcional para este producto en la OC..."
                        value={comentariosPorDetalle[key] ?? ""}
                        onChange={(e) =>
                          setComentarioDet(key, e.currentTarget.value)
                        }
                        radius="lg"
                        size="xs"
                        minRows={1}
                        maxRows={3}
                        autosize
                        leftSection={
                          <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 text-cyan-400" />
                        }
                        classNames={{
                          input:
                            "bg-zinc-900/30 border-zinc-800/60 text-white text-[11px] placeholder:text-zinc-600 pl-7",
                          section: "left-2",
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Botones fijos al fondo ── */}
        <div className="flex-none flex justify-end gap-2 pt-3 mt-2 border-t border-zinc-800/60">
          <Button variant="subtle" color="zinc" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="filled"
            color="green"
            leftSection={<CheckBadgeIcon className="w-4 h-4" />}
            onClick={handleConfirm}
            loading={loading}
            className="shadow-lg shadow-green-900/20"
          >
            Confirmar Orden de Compra
          </Button>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}</style>
    </ModalEstandar>
  );
};

