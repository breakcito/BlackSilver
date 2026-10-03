import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Grid,
  Group,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  Stepper,
  Text,
  TextInput,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { IconCheck, IconCirclePlus, IconCoins } from "@tabler/icons-react";

import { useNotify } from "../../../hooks/useNotify";
import { ProveedoresService } from "../../proveedores/service/proveedores.service";
import type { AnticipoProveedorResponse } from "../../proveedores/service/proveedores.responses";
import { MedioPago } from "../../../shared/enums/anticipo-proveedor/medio-pago";
import { CompraCarbonService } from "../service/compra-carbon.service";
import { useComprobantesCompraCarbon } from "../hooks/useComprobantesCompraCarbon";
import { ComprobanteProveedorForm } from "./components/comprobante-proveedor-form";
import { ComprobanteTransporteCard } from "./components/comprobante-transporte-card";
import { formatPEN, inputClasses, round2 } from "./components/input-classes";
import { AuxService } from "../../../service/auxiliar.service";
import type { RES_CuentaEmpresa } from "../../../service/responses/cuenta-empresa";
import type { CompraCarbonDetalleResponse } from "../service/compra-carbon.responses";

interface Props {
  /** Cabecera completa: el agrupamiento de fletes necesita `aplica_igv`. */
  compra: {
    id_compra_carbon: number;
    id_empresa: number;
    id_proveedor: number;
    correlativo: string;
    proveedor: string;
    total_con_descuento: number;
    monto_igv: number;
    descuento_flete: number;
    aplica_igv: boolean;
    porcentaje_igv: number;
    estado: string | null;
  };
  detalles: CompraCarbonDetalleResponse["detalles"];
  onCancel: () => void;
  onSuccess: (data: CompraCarbonDetalleResponse) => void;
}

type CargaConFlete = CompraCarbonDetalleResponse["detalles"][number];

const aFechaHoraMySQL = (d: Date | string | null): string => {
  if (!d) return "";
  const fecha = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(fecha.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())} ` +
    `${pad(fecha.getHours())}:${pad(fecha.getMinutes())}:${pad(fecha.getSeconds())}`
  );
};

/**
 * Resumen financiero permanente de la compra.
 *
 * Se mantiene visible en los tres pasos a proposito: el usuario no tiene que
 * recordar los numeros de una pantalla a otra para entender cuanto queda.
 */
const ResumenFinanciero = ({
  total,
  flete,
  anticipos,
}: {
  total: number;
  flete: number;
  anticipos: number;
}) => {
  const saldo = round2(total - anticipos);

  return (
    <Paper p="xs" radius="lg" className="bg-zinc-950/80 border border-zinc-800">
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div>
          <Text
            size="10px"
            c="gray"
            tt="uppercase"
            fw={700}
            className="tracking-wider"
          >
            Total
          </Text>
          <Text fw={700} className="font-mono" c={"cyan.4"}>
            {formatPEN(total)}
          </Text>
        </div>
        {/* <div>
          <Text
            size="10px"
            c="gray"
            tt="uppercase"
            fw={700}
            className="tracking-wider"
          >
            IGV incluído
          </Text>
          <Text fw={700} className="font-mono" c={"red.4"}>
            {igv == 0 ? "No aplica" : formatPEN(igv)}
          </Text>
        </div> */}
        <div>
          <Text
            size="10px"
            c="gray"
            tt="uppercase"
            fw={700}
            className="tracking-wider"
          >
            Flete
          </Text>
          <Text fw={700} c="yellow.4" className="font-mono">
            {formatPEN(flete)}
          </Text>
        </div>
        <div>
          <Text
            size="10px"
            c="gray"
            tt="uppercase"
            fw={700}
            className="tracking-wider"
          >
            (−) Anticipos
          </Text>
          <Text fw={700} c="red.4" className="font-mono">
            −{formatPEN(anticipos)}
          </Text>
        </div>
        <div>
          <Text
            size="10px"
            c="gray"
            tt="uppercase"
            fw={700}
            className="tracking-wider"
          >
            Saldo a pagar
          </Text>
          <Text
            fw={900}
            size="sm"
            c={saldo === 0 ? "teal.4" : "green.4"}
            className="font-mono"
          >
            {formatPEN(saldo)}
          </Text>
        </div>
      </div>
    </Paper>
  );
};

/**
 * Modal de aprobacion de la liquidacion.
 *
 * Son tres actos distintos y por eso van en pasos separados y no en un scroll
 * largo: el comprobante del proveedor, los comprobantes de flete por
 * transportista y los anticipos. Cada paso se puede completar por separado, y
 * el resumen financiero permanece visible en los tres.
 */
export const AprobarLiquidacionModal = ({
  compra,
  detalles,
  onCancel,
  onSuccess,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  const [paso, setPaso] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    loading: cargandoComprobantes,
    registrando: registrandoComprobante,
    comprobanteProveedor,
    gruposFlete,
    comprobantesFlete,
    registrarProveedor,
    registrarTransporte,
  } = useComprobantesCompraCarbon({
    idCompraCarbon: compra.id_compra_carbon,
    activo: true,
  });

  // Anticipos del proveedor
  const [anticiposDisponibles, setAnticiposDisponibles] = useState<
    AnticipoProveedorResponse[]
  >([]);
  const [cargandoAnticipos, setCargandoAnticipos] = useState(false);
  const [creandoAnticipo, setCreandoAnticipo] = useState(false);

  // clave: id_anticipo, valor: monto a retirar
  const [anticiposSeleccionados, setAnticiposSeleccionados] = useState<
    Record<number, number>
  >({});

  const [cuentasEmpresa, setCuentasEmpresa] = useState<RES_CuentaEmpresa[]>([]);
  const [mostrarFormNuevoAnticipo, setMostrarFormNuevoAnticipo] =
    useState(false);
  const [nuevoMonto, setNuevoMonto] = useState<number | string>(0);
  const [nuevoMedio, setNuevoMedio] = useState<MedioPago>(
    MedioPago.Transferencia,
  );
  const [nuevaCuenta, setNuevaCuenta] = useState<string | null>(null);
  const [nuevoNumOp, setNuevoNumOp] = useState<string>("");
  const [nuevaFechaPago, setNuevaFechaPago] = useState<Date | null>(new Date());

  // Cargas con flete agrupadas por transportista: cada grupo es un comprobante.
  const cargasPorTransportista = useMemo(() => {
    const mapa = new Map<
      number,
      { id: number; nombre: string; cargas: CargaConFlete[] }
    >();

    detalles
      .filter((d) => d.pagar_flete && d.id_transportista !== null)
      .forEach((d) => {
        const id = d.id_transportista as number;
        const actual = mapa.get(id);
        if (actual) {
          actual.cargas.push(d);
        } else {
          mapa.set(id, {
            id,
            nombre: d.transportista_razon_social ?? `Transportista ${id}`,
            cargas: [d],
          });
        }
      });

    return Array.from(mapa.values());
  }, [detalles]);

  const hayCargasFlete = cargasPorTransportista.length > 0;

  const totalAnticiposAplicados = useMemo(() => {
    let sum = 0;
    for (const id in anticiposSeleccionados) {
      sum += Number(anticiposSeleccionados[id]) || 0;
    }
    return round2(sum);
  }, [anticiposSeleccionados]);

  const cargarAnticipos = async () => {
    setCargandoAnticipos(true);
    try {
      const resp = await ProveedoresService.getAnticiposPorProveedor(
        compra.id_proveedor,
      );
      if (resp.success && resp.data) {
        setAnticiposDisponibles(
          resp.data.filter(
            (a) => !a.esta_anulado && Number(a.saldo_actual) > 0,
          ),
        );
      }
    } catch (e) {
      console.error(e);
      notifyError("Error al cargar los anticipos del proveedor");
    } finally {
      setCargandoAnticipos(false);
    }
  };

  useEffectInicial(() => {
    void cargarAnticipos();
    AuxService.get_cuentas_empresa({ id_empresa: compra.id_empresa }).then(
      (res) => {
        if (res.success && res.data) {
          setCuentasEmpresa(res.data);
          if (res.data.length > 0) {
            setNuevaCuenta(String(res.data[0].id_cuenta_bancaria));
          }
        }
      },
    );
  }, [compra.id_proveedor, compra.id_empresa]);

  const alternarAnticipo = (a: AnticipoProveedorResponse) => {
    const id = a.id_anticipo;
    if (id in anticiposSeleccionados) {
      const copy = { ...anticiposSeleccionados };
      delete copy[id];
      setAnticiposSeleccionados(copy);
    } else {
      const maxRetirable = Number(a.saldo_actual);
      const restante = Math.max(
        0,
        round2(compra.total_con_descuento - totalAnticiposAplicados),
      );
      const sugerido = Math.min(
        maxRetirable,
        restante > 0 ? restante : maxRetirable,
      );
      setAnticiposSeleccionados((prev) => ({
        ...prev,
        [id]: round2(sugerido),
      }));
    }
  };

  const setMontoRetiradoAnticipo = (id: number, val: number, max: number) => {
    setAnticiposSeleccionados((prev) => ({
      ...prev,
      [id]: round2(Math.min(max, Math.max(0, val))),
    }));
  };

  const handleCrearNuevoAnticipo = async () => {
    const monto = Number(nuevoMonto);
    if (monto <= 0) {
      notifyError("El monto del anticipo debe ser mayor a 0");
      return;
    }

    setCreandoAnticipo(true);
    try {
      const resp = await ProveedoresService.registrarAnticipoPorProveedor(
        compra.id_proveedor,
        {
          id_empresa: compra.id_empresa,
          id_cuenta_bancaria_empresa: nuevaCuenta ? Number(nuevaCuenta) : null,
          medio_pago: nuevoMedio,
          numero_operacion: nuevoNumOp.trim() || null,
          fecha_hora_pago: nuevaFechaPago
            ? aFechaHoraMySQL(nuevaFechaPago)
            : null,
          saldo: monto,
          evidencias: null,
        },
      );

      if (!resp.success || !resp.data) {
        notifyError(resp.message || "Error al crear el anticipo");
        return;
      }

      notifySuccess("Nuevo anticipo registrado correctamente");
      setMostrarFormNuevoAnticipo(false);
      setNuevoMonto(0);
      setNuevoNumOp("");
      await cargarAnticipos();
    } catch (e) {
      console.error(e);
      notifyError("Ocurrió un error al registrar el anticipo");
    } finally {
      setCreandoAnticipo(false);
    }
  };

  const handleAprobar = async () => {
    setError(null);
    setGuardando(true);

    try {
      const listaAnticipos = Object.entries(anticiposSeleccionados)
        .filter(([, monto]) => Number(monto) > 0)
        .map(([id, monto]) => ({
          id_anticipo_proveedor: Number(id),
          monto_retirado: Number(monto),
        }));

      const resp = await CompraCarbonService.aprobarLiquidacion(
        compra.id_compra_carbon,
        { anticipos: listaAnticipos },
      );

      if (!resp.success || !resp.data) {
        setError(resp.message || "Error al aprobar la liquidación");
        return;
      }

      notifySuccess(
        `Liquidación de compra ${compra.correlativo} aprobada exitosamente`,
      );
      onSuccess(resp.data);
    } catch (e) {
      console.error(e);
      setError("Ocurrió un error inesperado al aprobar la liquidación");
    } finally {
      setGuardando(false);
    }
  };

  const pendientes = useMemo(() => {
    if (compra.aplica_igv && !comprobanteProveedor) return ["proveedor"];
    const faltan = gruposFlete.filter(
      (g) => !g.id_comprobante_transporte_carbon,
    );
    return faltan.length > 0 ? ["flete"] : [];
  }, [compra.aplica_igv, comprobanteProveedor, gruposFlete]);

  const pasosVisibles = useMemo(
    () => [
      { label: "Anticipos", description: "Anticipos a aplicar" },
      {
        label: "Comprobante proveedor",
        description: compra.aplica_igv
          ? "Documento del proveedor"
          : "No aplica IGV",
      },
      {
        label: "Comprobantes de flete",
        description: hayCargasFlete
          ? `${gruposFlete.length} transportista${gruposFlete.length === 1 ? "" : "s"}`
          : "Ninguna carga paga flete",
      },
    ],
    [compra.aplica_igv, gruposFlete.length, hayCargasFlete],
  );

  return (
    <div className="space-y-4">
      {error && (
        <Alert color="red" radius="lg" variant="light">
          <Text size="xs">{error}</Text>
        </Alert>
      )}

      <Stepper active={paso} onStepClick={setPaso} size="xs" iconSize={26}>
        {/* ============ PASO 1: ANTICIPOS (van sujetos a la compra, no al comprobante) ============ */}
        <Stepper.Step
          label={pasosVisibles[0].label}
          description={pasosVisibles[0].description}
          completedIcon={<IconCheck className="w-3.5 h-3.5" />}
        >
          <div className="pt-3 space-y-3">
            <Paper
              p="sm"
              radius="lg"
              className="bg-zinc-900/40 border border-zinc-800 space-y-2"
            >
              <Group justify="space-between">
                <Group gap="xs">
                  <IconCoins className="w-4 h-4 text-amber-500" />
                  <Text
                    size="xs"
                    fw={700}
                    c="white"
                    className="uppercase tracking-wider"
                  >
                    Anticipos del proveedor disponibles
                  </Text>
                </Group>

                <Button
                  leftSection={<IconCirclePlus className="w-4 h-4" />}
                  variant="light"
                  color="yellow"
                  size="xs"
                  radius="lg"
                  onClick={() =>
                    setMostrarFormNuevoAnticipo(!mostrarFormNuevoAnticipo)
                  }
                >
                  {mostrarFormNuevoAnticipo
                    ? "Ocultar formulario"
                    : "Registrar anticipo"}
                </Button>
              </Group>

              {mostrarFormNuevoAnticipo && (
                <Paper
                  p="sm"
                  radius="md"
                  className="bg-zinc-950/80 border border-yellow-500/30 space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Select
                      label="Medio de Pago"
                      data={["Transferencia", "Depósito", "Efectivo"]}
                      value={nuevoMedio}
                      onChange={(val) =>
                        setNuevoMedio(
                          (val as MedioPago) ?? MedioPago.Transferencia,
                        )
                      }
                      size="xs"
                      radius="lg"
                      classNames={inputClasses}
                      required
                      clearable
                    />

                    <NumberInput
                      label="Monto del anticipo (S/)"
                      placeholder="0.00"
                      value={nuevoMonto}
                      onChange={setNuevoMonto}
                      min={0.01}
                      decimalScale={2}
                      fixedDecimalScale
                      size="xs"
                      radius="lg"
                      classNames={inputClasses}
                      required
                    />

                    <Select
                      label="Cuenta de la Empresa"
                      placeholder="Seleccionar cuenta de salida"
                      data={cuentasEmpresa.map((c) => ({
                        value: String(c.id_cuenta_bancaria),
                        label: `${c.banco ?? "Banco"} - ${c.numero_cuenta}`,
                      }))}
                      value={nuevaCuenta}
                      onChange={setNuevaCuenta}
                      size="xs"
                      radius="lg"
                      classNames={inputClasses}
                      searchable
                      clearable
                      comboboxProps={{ withinPortal: true }}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <TextInput
                      label="Número de Operación"
                      placeholder="Ej. OP-987654"
                      value={nuevoNumOp}
                      onChange={(e) => setNuevoNumOp(e.currentTarget.value)}
                      size="xs"
                      radius="lg"
                      classNames={inputClasses}
                    />

                    <DateTimePicker
                      label="Fecha de Pago del Anticipo"
                      value={nuevaFechaPago}
                      onChange={(v) => {
                        if (!v) setNuevaFechaPago(null);
                        else if (typeof v === "string")
                          setNuevaFechaPago(new Date(v));
                        else setNuevaFechaPago(v);
                      }}
                      size="xs"
                      radius="lg"
                      classNames={inputClasses}
                    />
                  </div>

                  <Group justify="flex-end" pt="xs">
                    <Button
                      variant="subtle"
                      color="indigo.3"
                      size="xs"
                      radius="lg"
                      onClick={() => setMostrarFormNuevoAnticipo(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="filled"
                      color="indigo.4"
                      size="xs"
                      radius="lg"
                      onClick={handleCrearNuevoAnticipo}
                      loading={creandoAnticipo}
                    >
                      Guardar Anticipo
                    </Button>
                  </Group>
                </Paper>
              )}

              {cargandoAnticipos ? (
                <Text size="xs" c="gray">
                  Cargando anticipos disponibles...
                </Text>
              ) : anticiposDisponibles.length === 0 ? (
                <Text size="xs" c="gray" fs="italic" ta="center" py="sm">
                  Este proveedor no tiene anticipos con saldo.
                </Text>
              ) : (
                <Grid gutter="md">
                  {anticiposDisponibles.map((a) => {
                    const seleccionado =
                      a.id_anticipo in anticiposSeleccionados;
                    const saldoActual = Number(a.saldo_actual);
                    const montoRetirar = Number(
                      anticiposSeleccionados[a.id_anticipo] ?? 0,
                    );

                    return (
                      <Grid.Col
                        key={a.id_anticipo}
                        span={{ base: 12, sm: 6, md: 4 }}
                      >
                        <div
                          className={`p-3 rounded-xl border transition-all h-full flex flex-col justify-between gap-3 ${
                            seleccionado
                              ? "border-yellow-500/50 bg-yellow-500/10"
                              : "border-zinc-800 bg-zinc-950/40"
                          }`}
                        >
                          <Group gap="sm" align="flex-start" wrap="nowrap">
                            <Checkbox
                              checked={seleccionado}
                              onChange={() => alternarAnticipo(a)}
                              color="yellow"
                              size="xs"
                              className="mt-1"
                            />
                            <div className="min-w-0 flex-1">
                              <Group gap="xs">
                                <Badge variant="light" color="lime" size="sm">
                                  {a.medio_pago || "Anticipo"}
                                </Badge>
                                {a.numero_operacion && (
                                  <Text
                                    size="11px"
                                    c="blue.4"
                                    fw={700}
                                    className="font-mono truncate"
                                  >
                                    Op: {a.numero_operacion}
                                  </Text>
                                )}
                              </Group>
                              <Text size="11px" c="gray.4" mt={4}>
                                Saldo disponible:{" "}
                                <span className="font-mono font-bold text-white ml-1">
                                  {formatPEN(saldoActual)}
                                </span>
                              </Text>
                            </div>
                          </Group>

                          {seleccionado && (
                            <div className="w-full pt-2 border-t border-yellow-500/20">
                              <NumberInput
                                label="Monto a aplicar (S/)"
                                value={montoRetirar}
                                onChange={(val) =>
                                  setMontoRetiradoAnticipo(
                                    a.id_anticipo,
                                    Number(val) || 0,
                                    saldoActual,
                                  )
                                }
                                max={saldoActual}
                                fixedDecimalScale
                                hideControls
                                size="xs"
                                prefix="S/ "
                                radius="lg"
                                classNames={inputClasses}
                              />
                            </div>
                          )}
                        </div>
                      </Grid.Col>
                    );
                  })}
                </Grid>
              )}
            </Paper>
          </div>
        </Stepper.Step>

        <Stepper.Step
          label={pasosVisibles[1].label}
          description={pasosVisibles[1].description}
          completedIcon={<IconCheck className="w-3.5 h-3.5" />}
        >
          <div className="pt-3">
            {!compra.aplica_igv ? (
              <Text size="xs" c="gray" ta="center" py="md">
                Esta compra no aplica IGV: no hay comprobante que registrar. Los
                pagos se registran desde "Registrar pagos" en el listado.
              </Text>
            ) : (
              <ComprobanteProveedorForm
                total={compra.total_con_descuento}
                comprobante={comprobanteProveedor}
                pagos={comprobanteProveedor?.pagos ?? []}
                registrando={registrandoComprobante}
                onRegistrar={(payload, evidencias) => {
                  void registrarProveedor(payload, evidencias);
                }}
              />
            )}
          </div>
        </Stepper.Step>

        {/* ============ PASO 2: COMPROBANTES DE FLETE ============ */}
        <Stepper.Step
          label={pasosVisibles[2].label}
          description={pasosVisibles[2].description}
          completedIcon={<IconCheck className="w-3.5 h-3.5" />}
        >
          <div className="pt-3 space-y-3">
            {!hayCargasFlete ? (
              <Text size="xs" c="gray" ta="center" py="md">
                Ninguna carga tiene flete a cargo de la empresa.
              </Text>
            ) : (
              <>
                <ScrollArea.Autosize mah={380} offsetScrollbars>
                  <div className="pr-2 space-y-2">
                    {cargasPorTransportista.map((grupo) => (
                      <ComprobanteTransporteCard
                        key={grupo.id}
                        idTransportista={grupo.id}
                        nombreTransportista={grupo.nombre}
                        cargas={grupo.cargas}
                        comprobante={
                          comprobantesFlete.find(
                            (c) => c.id_transportista === grupo.id,
                          ) ?? null
                        }
                        pagos={[]}
                        registrando={registrandoComprobante}
                        onRegistrar={(payload, evidencias) => {
                          void registrarTransporte(payload, evidencias);
                        }}
                      />
                    ))}
                  </div>
                </ScrollArea.Autosize>
              </>
            )}
          </div>
        </Stepper.Step>

        {/* ============ PASO 3: ANTICIPOS ============ */}
        <Stepper.Completed>
          <Alert
            color="teal"
            radius="lg"
            variant="light"
            icon={<IconCheck className="w-4 h-4" />}
          >
            <Text size="xs">
              Todos los pasos completados. Listo para aprobar.
            </Text>
          </Alert>
        </Stepper.Completed>
      </Stepper>

      <ResumenFinanciero
        total={compra.total_con_descuento}
        flete={compra.descuento_flete}
        anticipos={totalAnticiposAplicados}
      />

      {pendientes.length > 0 && paso < 2 && (
        <Text size="11px" c="yellow.4" ta="center">
          {pendientes.includes("proveedor")
            ? "Falta el comprobante del proveedor."
            : `Faltan ${gruposFlete.filter((g) => !g.id_comprobante_transporte_carbon).length} comprobantes de flete.`}{" "}
          Puedes aprobar igual y registrarlos despues.
        </Text>
      )}

      <Group justify="space-between" pt="xs">
        <Group gap="xs">
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            radius="lg"
            onClick={onCancel}
            disabled={guardando}
          >
            Cancelar
          </Button>
          {paso > 0 && (
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              radius="lg"
              onClick={() => setPaso((p) => p - 1)}
              disabled={guardando}
            >
              Anterior
            </Button>
          )}
          {paso < 2 && (
            <Button
              variant="light"
              color="indigo"
              size="xs"
              radius="lg"
              onClick={() => setPaso((p) => p + 1)}
              disabled={cargandoComprobantes}
            >
              Siguiente
            </Button>
          )}
        </Group>

        <Button
          variant="filled"
          color="teal"
          size="xs"
          radius="lg"
          onClick={handleAprobar}
          loading={guardando}
          leftSection={<IconCheck className="w-4 h-4" />}
        >
          Aprobar Liquidación
        </Button>
      </Group>
    </div>
  );
};

/** Ejecuta el efecto solo en el montaje. */
function useEffectInicial(fn: () => void, deps: unknown[]): void {
  const ejecutado = useRef(false);
  useEffect(() => {
    if (ejecutado.current) return;
    ejecutado.current = true;
    fn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
