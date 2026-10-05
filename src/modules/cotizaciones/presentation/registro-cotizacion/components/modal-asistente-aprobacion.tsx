import { useState, useEffect } from "react";
import {
  Stack,
  Text,
  Button,
  Group,
  Checkbox,
  Select,
  Badge,
  Stepper,
  NumberInput,
  Textarea,
} from "@mantine/core";
import {
  CheckBadgeIcon,
  DocumentCheckIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";
import { ModalEstandar } from "../../../../../presentation/utils/modal-estandar";
import type {
  DTO_RegistrarComparativo,
  DTO_CotizacionRequest,
} from "../../../service/cotizaciones.requests";
import { CotizacionesService } from "../../../service/cotizaciones.service";
import { useNotify } from "../../../../../hooks/useNotify";
import { formatNumber } from "../../../../../shared/functions/formatNumber";
import { usePrint } from "../../../../../hooks/usePrint";
import { CotizacionPDF } from "../../cotizacion-pdf";
import {
  Estado_Cotizacion,
  Estado_Cotizacion_Detalle,
} from "../../../../../shared/enums/cotizacion/cotizacion";
import type { RES_Proveedor } from "../../../../../service/responses/proveedor";
import type { RES_Producto } from "../../../../../service/responses/producto";
import type { RES_UnidadMedida } from "../../../../../service/responses/unidad-medida";
import type { RES_Empresa } from "../../../../../service/responses/empresa";
import type {
  RES_Cotizacion,
  RES_Comparativo,
} from "../../../../../service/responses/cotizaciones/cotizacion";
import {
  type AprobacionState,
  initAprobacionState,
  validateAprobacion,
  getSubtotalAprobacion,
  getVariacionAprobacion,
  getTipoCambioAplicado,
} from "../../../hooks/aprobacion/useAprobacionCotizacion";

// Tipos para el estado local del Wizard
interface WizardAprobacionState {
  originalIndex: number;
  cotizacion: DTO_CotizacionRequest;
  aprobacion: AprobacionState; // estado centralizado del hook
  /** Observación de la OC (cabecera) — prellenada con la de la cotización */
  observacion: string;
  /** Comentario por cada detalle aprobado — prellenado con el de la cotización */
  comentariosPorDetalle: Record<number, string>;
}

interface ModalAsistenteAprobacionProps {
  opened: boolean;
  onClose: () => void;
  // Todo el formulario original (para registrar la base primero)
  payloadOriginal: DTO_RegistrarComparativo | null;
  // Lista de todas las cotizaciones con sus índices para mapearlas al Wizard
  todasLasCotizaciones: DTO_CotizacionRequest[];
  // Todos los maestros para resolver nombres
  maestros: {
    proveedores: RES_Proveedor[];
    catalogo: RES_Producto[];
    unidades: RES_UnidadMedida[];
    empresas: RES_Empresa[];
  };
  onSuccessCompleto: (data: RES_Comparativo[]) => Promise<void> | void;
}

export const ModalAsistenteAprobacion = ({
  opened,
  onClose,
  payloadOriginal,
  todasLasCotizaciones,
  maestros,
  onSuccessCompleto,
}: ModalAsistenteAprobacionProps) => {
  const { notifySuccess, notifyError } = useNotify();
  const { print, prepare } = usePrint();
  const [wizardSteps, setWizardSteps] = useState<WizardAprobacionState[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Inicializar Wizard basándose en las cotizaciones que llegaron marcadas como Aprobada
  useEffect(() => {
    if (opened && todasLasCotizaciones.length > 0) {
      const steps: WizardAprobacionState[] = [];
      todasLasCotizaciones.forEach((cot, index) => {
        if (cot.estado === "Aprobada") {
          // Prellenar comentarios por detalle desde la cotización
          const comentariosPorDetalle: Record<number, string> = {};
          cot.detalles.forEach((d, dIdx) => {
            if (d.comentario) comentariosPorDetalle[dIdx] = d.comentario;
          });
          steps.push({
            originalIndex: index,
            cotizacion: cot,
            aprobacion: initAprobacionState(
              cot.detalles.map((d, dIdx) => ({
                key: dIdx,
                precio_referencia: Number(d.precio_unitario ?? 0),
                habilitado: !d.no_cotiza,
              })),
              cot.empresas_ids.length > 0
                ? cot.empresas_ids[0].toString()
                : null,
              cot.tipo_cambio_venta_referencial || "",
            ),
            observacion: cot.observacion ?? "",
            comentariosPorDetalle,
          });
        }
      });
      setWizardSteps(steps);
      setActiveStep(0);
    }
  }, [opened, todasLasCotizaciones]);

  if (!opened || !payloadOriginal) return null;

  const handleNext = () => {
    const current = wizardSteps[activeStep];
    const error = validateAprobacion(
      current.aprobacion,
      current.cotizacion.moneda,
    );
    if (error) {
      notifyError(error);
      return;
    }
    setActiveStep((curr) => curr + 1);
  };

  const handlePrev = () => setActiveStep((curr) => curr - 1);

  // Actualiza el estado aprobacion del step activo
  const updateAprobacion = (
    updater: (prev: AprobacionState) => AprobacionState,
  ) => {
    setWizardSteps((prev) => {
      const copy = [...prev];
      copy[activeStep] = {
        ...copy[activeStep],
        aprobacion: updater(copy[activeStep].aprobacion),
      };
      return copy;
    });
  };

  const toggleDetalle = (rowIndex: number) => {
    updateAprobacion((prev) => ({
      ...prev,
      selectedKeys: prev.selectedKeys.includes(rowIndex)
        ? prev.selectedKeys.filter((k) => k !== rowIndex)
        : [...prev.selectedKeys, rowIndex],
    }));
  };

  const setObservacionStep = (val: string) => {
    setWizardSteps((prev) => {
      const copy = [...prev];
      copy[activeStep] = { ...copy[activeStep], observacion: val };
      return copy;
    });
  };

  const setComentarioDetStep = (rowIndex: number, val: string) => {
    setWizardSteps((prev) => {
      const copy = [...prev];
      copy[activeStep] = {
        ...copy[activeStep],
        comentariosPorDetalle: {
          ...copy[activeStep].comentariosPorDetalle,
          [rowIndex]: val,
        },
      };
      return copy;
    });
  };

  const currentStepData = wizardSteps[activeStep] || null;

  // Lista de empresas para el select basadas en los IDs configurados
  const empresasDisponibles = currentStepData
    ? maestros.empresas.filter((e) =>
        currentStepData.cotizacion.empresas_ids.includes(e.id_empresa),
      )
    : [];

  const handleFinalSubmit = async () => {
    const current = wizardSteps[activeStep];
    const error = validateAprobacion(
      current.aprobacion,
      current.cotizacion.moneda,
    );
    if (error) {
      notifyError(error);
      return;
    }

    // Construir mapa: originalIndex → config
    const wizardMap = new Map<
      number,
      WizardAprobacionState
    >();
    for (const step of wizardSteps) {
      wizardMap.set(step.originalIndex, step);
    }

    // Construir el payload UNIFICADO con estados finales reales
    const payloadRegistrar: DTO_RegistrarComparativo = {
      ...payloadOriginal,
      cotizaciones: payloadOriginal.cotizaciones.map((c, idx) => {
        const wizardConfig = wizardMap.get(idx);

        if (wizardConfig) {
          const { aprobacion: ap, cotizacion: cot, observacion, comentariosPorDetalle } =
            wizardConfig;
          const tcOC = getTipoCambioAplicado(ap, cot.moneda);
          return {
            ...c,
            estado: Estado_Cotizacion.Aprobada,
            id_empresa_compradora: Number(ap.selectedEmpresaId),
            tipo_cambio_aplicado_oc: tcOC,
            // Propagar observacion al DTO de cotizacion para que persista en OC
            observacion: observacion ?? null,
            detalles: c.detalles.map((d, dIdx) => {
              const comentarioAprobacion = comentariosPorDetalle?.[dIdx];
              return {
                ...d,
                estado: ap.selectedKeys.includes(dIdx)
                  ? Estado_Cotizacion_Detalle.Aprobado
                  : Estado_Cotizacion_Detalle.Rechazado,
                precio_confirmado_oc: ap.selectedKeys.includes(dIdx)
                  ? Number(ap.preciosOC[dIdx] ?? d.precio_unitario ?? 0)
                  : undefined,
                // Si el usuario escribio un comentario en la aprobacion, ese gana;
                // si no, mantener el que ya tenia la cotizacion.
                comentario:
                  comentarioAprobacion !== undefined
                    ? comentarioAprobacion
                    : d.comentario,
              };
            }),
          };
        }

        // Las cotizaciones NO aprobadas se envían como Generada
        return {
          ...c,
          estado: Estado_Cotizacion.Generada,
          detalles: c.detalles.map((d) => ({
            ...d,
            estado: Estado_Cotizacion_Detalle.Pendiente,
          })),
        };
      }),
    };

    const printTarget = `PrinterCotCons_${Date.now()}`;
    const printerWindow = prepare(printTarget);

    setLoading(true);

    try {
      // UN SOLO REQUEST: registra + aprueba + crea OC todo de una vez
      const resp =
        await CotizacionesService.registrar_comparativo(payloadRegistrar);

      if (!resp.success) {
        notifyError(resp.message || "Error al registrar el comparativo.");
        setLoading(false);
        printerWindow?.close();
        return;
      }

      const comparativoData = resp.data[0];

      // --- AUTO-PRINT: FORMATO COTIZACIÓN (Todas las registradas) ---
      // url_logo ya viene como base64 data URL desde el backend
      const cotizacionesPDFData = comparativoData.cotizaciones.map(
        (cot: RES_Cotizacion) => ({
          cotizacion: cot,
          detalles: cot.detalles,
          empresas: cot.empresas.map((e) => ({
            razon_social: e.razon_social,
            url_logo: e.url_logo ?? null,
          })),
        }),
      );

      if (cotizacionesPDFData.length > 0) {
        print(<CotizacionPDF cotizaciones={cotizacionesPDFData} />, {
          documentTitle: "Cotizaciones Consolidadas",
          target: printTarget,
        });
      }

      notifySuccess("Registro y Aprobación completados correctamente.");
      onSuccessCompleto([comparativoData]);
      onClose();
    } catch (e) {
      console.error(e);
      notifyError("Ocurrió un error general en el Asistente.");
      printerWindow?.close();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalEstandar
      opened={opened}
      close={onClose}
      onClose={onClose}
      title="Asistente de Aprobación"
      size="xl"
    >
      {wizardSteps.length === 0 ? (
        <Stack align="center" py="xl">
          <Text c="dimmed">
            Cargando asistente o no hay cotizaciones aprobadas...
          </Text>
        </Stack>
      ) : (
        <div className="flex flex-col h-[70vh]">
          {/* Header con el Stepper */}
          <div className="flex-none p-4 bg-zinc-900 border-b border-zinc-800">
            <Stepper
              active={activeStep}
              onStepClick={setActiveStep}
              size="sm"
              iconSize={24}
              color="green"
              allowNextStepsSelect={false}
            >
              {wizardSteps.map((step, idx) => {
                const prov = maestros.proveedores.find(
                  (p) => p.id_proveedor === step.cotizacion.id_proveedor,
                );
                return (
                  <Stepper.Step
                    key={`step-${idx}`}
                    label={`Cotización #${idx + 1}`}
                    description={prov?.razon_social || "Desconocido"}
                  />
                );
              })}
            </Stepper>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
                <DocumentCheckIcon className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <Text
                  size="sm"
                  fw={800}
                  className="text-indigo-100 uppercase tracking-widest"
                >
                  Generación de Orden de Compra
                </Text>
                <Text size="xs" className="text-zinc-400">
                  Seleccione la empresa compradora y verifique los productos que
                  desea incluir en esta compra.
                </Text>
              </div>
            </div>

            {/* Seleccion de Empresa */}
            <Stack gap={4}>
              <Text size="sm" fw={800} className="text-zinc-200">
                Empresa Compradora
              </Text>
              <Select
                placeholder="Seleccione la empresa para la factura"
                data={empresasDisponibles.map((e) => ({
                  value: e.id_empresa.toString(),
                  label: e.razon_social,
                }))}
                value={currentStepData?.aprobacion.selectedEmpresaId || null}
                onChange={(val) =>
                  updateAprobacion((p) => ({ ...p, selectedEmpresaId: val }))
                }
                radius="lg"
                size="sm"
                classNames={{
                  input:
                    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-600 transition-all",
                  dropdown:
                    "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
                  option:
                    "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors",
                }}
              />
            </Stack>

            {/* Tipo de Cambio si no es Soles */}
            {currentStepData?.cotizacion.moneda !== "Soles" && (
              <Stack gap={4}>
                <Text size="sm" fw={800} className="text-zinc-200">
                  Tipo de Cambio Venta (S/.)
                </Text>
                <NumberInput
                  placeholder="Ej. 3.85"
                  value={currentStepData?.aprobacion.tipoCambio ?? ""}
                  onChange={(val: number | string) =>
                    updateAprobacion((p) => ({
                      ...p,
                      tipoCambio: val === "" ? "" : Number(val),
                    }))
                  }
                  decimalScale={4}
                  min={0}
                  radius="lg"
                  size="sm"
                  classNames={{
                    input:
                      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-600 transition-all",
                  }}
                />
              </Stack>
            )}

            {/* Observaciones de la OC (cabecera) — por step */}
            <Textarea
              label="Observaciones (Opcional)"
              placeholder="Ej: Entrega urgente en almacén principal..."
              value={currentStepData?.observacion ?? ""}
              onChange={(e) => setObservacionStep(e.currentTarget.value)}
              radius="lg"
              size="sm"
              minRows={2}
              maxRows={4}
              autosize
              classNames={{
                input:
                  "bg-zinc-900/50 border-zinc-800 text-white text-xs placeholder:text-zinc-600",
                label: "text-zinc-200 text-xs font-bold mb-1",
                description: "text-zinc-500 text-[10px] mt-0.5",
              }}
            />

            {/* Selección de Productos */}
            {(() => {
              const ap = currentStepData?.aprobacion;
              const detallesCotizables =
                (currentStepData?.cotizacion.detalles
                  .map((d, dIdx) => (!d.no_cotiza ? dIdx : null))
                  .filter((val) => val !== null) as number[]) || [];
              const numSelected = ap?.selectedKeys.length || 0;
              const allSelected =
                detallesCotizables.length > 0 &&
                numSelected === detallesCotizables.length;
              const indeterminate =
                numSelected > 0 && numSelected < detallesCotizables.length;
              const simbolo =
                currentStepData?.cotizacion.moneda === "Soles" ? "S/." : "$";

              return (
                <>
                  <div className="flex-none flex items-center justify-between mb-2">
                    <Text
                      size="xs"
                      fw={800}
                      className="text-zinc-400 uppercase tracking-widest"
                    >
                      Productos a Adquirir
                    </Text>
                    <Checkbox
                      size="xs"
                      color="indigo"
                      checked={allSelected}
                      indeterminate={indeterminate}
                      label={
                        <Text size="xs" c="dimmed" fw={700}>
                          Seleccionar Todos
                        </Text>
                      }
                      onChange={() => {
                        updateAprobacion((prev) => ({
                          ...prev,
                          selectedKeys: allSelected ? [] : detallesCotizables,
                        }));
                      }}
                      classNames={{ label: "cursor-pointer" }}
                    />
                  </div>
                  <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/80 flex flex-col overflow-hidden">
                    {currentStepData?.cotizacion.detalles.map((det, dIdx) => {
                      if (det.no_cotiza) return null;
                      const prodMaestro = maestros.catalogo.find(
                        (p) => p.id_producto === det.id_producto,
                      );
                      const isChecked =
                        ap?.selectedKeys.includes(dIdx) ?? false;
                      const precioRef = Number(det.precio_unitario ?? 0);
                      const variacion = ap
                        ? getVariacionAprobacion(ap, dIdx, precioRef)
                        : null;

                      return (
                        <div
                          key={`${det.id_producto}-${dIdx}`}
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
                                onChange={() => toggleDetalle(dIdx)}
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
                                {prodMaestro?.nombre ||
                                  `Producto ${det.id_producto}`}
                              </Text>
                            </div>
                            {/* Col 2: cantidad · input · c/u + variación abajo (centrado) */}
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center justify-center gap-1.5">
                                <Text
                                  size="11px"
                                  c="dimmed"
                                  className="whitespace-nowrap font-mono"
                                >
                                  {formatNumber(det.cantidad)}{" "}
                                  {(() => {
                                    const um = maestros.unidades.find(
                                      (u) =>
                                        u.id_unidad_medida ===
                                        det.id_unidad_medida,
                                    );
                                    return um?.abreviatura || "u.";
                                  })()}
                                  {" · a"}
                                </Text>
                                <NumberInput
                                  size="xs"
                                  disabled={!isChecked}
                                  value={ap?.preciosOC[dIdx] ?? ""}
                                  onChange={(val: number | string) =>
                                    updateAprobacion((prev) => ({
                                      ...prev,
                                      preciosOC: {
                                        ...prev.preciosOC,
                                        [dIdx]: val === "" ? "" : Number(val),
                                      },
                                    }))
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
                                <Text
                                  size="11px"
                                  c="dimmed"
                                  className="whitespace-nowrap"
                                >
                                  c/u
                                </Text>
                              </div>
                              {isChecked &&
                                variacion !== null &&
                                variacion !== 0 && (
                                  <Badge
                                    size="xs"
                                    variant="light"
                                    color={variacion > 0 ? "red" : "teal"}
                                  >
                                    {variacion > 0 ? "+" : ""}
                                    {simbolo}{" "}
                                    {formatNumber(Math.abs(variacion))} vs
                                    cotización
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
                                Sub: {simbolo}{" "}
                                {formatNumber(
                                  ap
                                    ? getSubtotalAprobacion(
                                        ap,
                                        dIdx,
                                        Number(det.cantidad),
                                        precioRef,
                                      )
                                    : 0,
                                )}
                              </Badge>
                            </div>
                          </div>

                          {/* Comentario por producto (solo si está aprobado) */}
                          {isChecked && (
                            <div className="mt-2 pl-7">
                              <Textarea
                                placeholder="Comentario opcional para este producto en la OC..."
                                value={
                                  currentStepData?.comentariosPorDetalle?.[
                                    dIdx
                                  ] ?? ""
                                }
                                onChange={(e) =>
                                  setComentarioDetStep(
                                    dIdx,
                                    e.currentTarget.value,
                                  )
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
                </>
              );
            })()}

            <Group justify="space-between" mt="md">
              <Button
                variant="subtle"
                color="zinc"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar Registro
              </Button>

              <Group gap="sm">
                {activeStep > 0 && (
                  <Button
                    variant="outline"
                    color="indigo"
                    onClick={handlePrev}
                    disabled={loading}
                  >
                    Atrás
                  </Button>
                )}

                {activeStep < wizardSteps.length - 1 ? (
                  <Button variant="filled" color="indigo" onClick={handleNext}>
                    Siguiente
                  </Button>
                ) : (
                  <Button
                    variant="filled"
                    color="green"
                    leftSection={<CheckBadgeIcon className="w-4 h-4" />}
                    onClick={handleFinalSubmit}
                    loading={loading}
                    className="shadow-lg shadow-green-900/20"
                  >
                    Finalizar Registro y Órdenes
                  </Button>
                )}
              </Group>
            </Group>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}</style>
    </ModalEstandar>
  );
};
