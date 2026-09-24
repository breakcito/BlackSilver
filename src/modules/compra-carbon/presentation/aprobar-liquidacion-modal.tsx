import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
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
import type {
  CompraCarbonDetalleResponse,
  CompraCarbonResumen,
} from "../service/compra-carbon.responses";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { AuxService } from "../../../service/auxiliar.service";
import type { RES_CuentaEmpresa } from "../../../service/responses/cuenta-empresa";

interface Props {
  compra: CompraCarbonResumen;
  onCancel: () => void;
  onSuccess: (data: CompraCarbonDetalleResponse) => void;
}

const inputClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
  dropdown:
    "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
  option:
    "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors",
  label: "text-zinc-300 mb-1.5 font-semibold tracking-tight",
};

const formatPEN = (n: number) => `S/ ${formatNumber(n)}`;

export const AprobarLiquidacionModal = ({
  compra,
  onCancel,
  onSuccess,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Anticipos del proveedor
  const [anticiposDisponibles, setAnticiposDisponibles] = useState<
    AnticipoProveedorResponse[]
  >([]);

  // Selección de anticipos y montos a aplicar
  // clave: id_anticipo, valor: monto a retirar
  const [anticiposSeleccionados, setAnticiposSeleccionados] = useState<
    Record<number, number>
  >({});

  // Cuentas de la empresa (para registro rápido de anticipo si falta)
  const [cuentasEmpresa, setCuentasEmpresa] = useState<RES_CuentaEmpresa[]>([]);
  const [mostrarFormNuevoAnticipo, setMostrarFormNuevoAnticipo] =
    useState(false);
  const [creandoAnticipo, setCreandoAnticipo] = useState(false);

  // Form nuevo anticipo
  const [nuevoMonto, setNuevoMonto] = useState<number | string>(0);
  const [nuevoMedio, setNuevoMedio] = useState<MedioPago>(
    MedioPago.Transferencia,
  );
  const [nuevaCuenta, setNuevaCuenta] = useState<string | null>(null);
  const [nuevoNumOp, setNuevoNumOp] = useState<string>("");
  const [nuevaFechaPago, setNuevaFechaPago] = useState<Date | null>(new Date());

  const totalCompraNeto = Number(compra.total_con_descuento) || 0;

  const cargarAnticipos = async () => {
    setLoading(true);
    try {
      const resp = await ProveedoresService.getAnticiposPorProveedor(
        compra.id_proveedor,
      );
      if (resp.success && resp.data) {
        // Filtrar activos y con saldo > 0
        const conSaldo = resp.data.filter(
          (a) => !a.esta_anulado && Number(a.saldo_actual) > 0,
        );
        setAnticiposDisponibles(conSaldo);
      }
    } catch (e) {
      console.error(e);
      notifyError("Error al cargar los anticipos del proveedor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAnticipos();
    // Cargar cuentas empresa
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compra.id_proveedor, compra.id_empresa]);

  // Suma total de anticipos que se van a aplicar
  const totalAnticiposAplicados = useMemo(() => {
    let sum = 0;
    for (const id in anticiposSeleccionados) {
      sum += Number(anticiposSeleccionados[id]) || 0;
    }
    return Math.round(sum * 100) / 100;
  }, [anticiposSeleccionados]);

  const saldoPendienteLiquidacion = Math.max(
    0,
    Math.round((totalCompraNeto - totalAnticiposAplicados) * 100) / 100,
  );

  const toggleSeleccionAnticipo = (a: AnticipoProveedorResponse) => {
    const id = a.id_anticipo;
    if (id in anticiposSeleccionados) {
      const copy = { ...anticiposSeleccionados };
      delete copy[id];
      setAnticiposSeleccionados(copy);
    } else {
      // Sugerir monto: lo que quede de saldo pendiente o el saldo total del anticipo
      const maxRetirable = Number(a.saldo_actual);
      const restantePorCubrir = Math.max(
        0,
        totalCompraNeto - totalAnticiposAplicados,
      );
      const sugerido = Math.min(
        maxRetirable,
        restantePorCubrir > 0 ? restantePorCubrir : maxRetirable,
      );
      setAnticiposSeleccionados((prev) => ({
        ...prev,
        [id]: Math.round(sugerido * 100) / 100,
      }));
    }
  };

  const setMontoRetiradoAnticipo = (id: number, val: number, max: number) => {
    const clamped = Math.min(max, Math.max(0, val));
    setAnticiposSeleccionados((prev) => ({
      ...prev,
      [id]: Math.round(clamped * 100) / 100,
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
            ? typeof nuevaFechaPago === "string"
              ? nuevaFechaPago
              : (nuevaFechaPago as Date).toISOString()
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
    setSaving(true);

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
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <Alert color="red" radius="lg" variant="light">
          <Text size="xs">{error}</Text>
        </Alert>
      )}

      {/* Resumen de la Orden */}
      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/40 border border-zinc-800"
      >
        <Group justify="space-between" align="center">
          <div>
            <Group gap="xs">
              <Text
                size="xs"
                fw={700}
                c="dimmed"
                className="uppercase tracking-wider"
              >
                Orden:
              </Text>
              <Badge color="indigo" variant="filled" size="sm">
                {compra.correlativo}
              </Badge>
            </Group>
            <Text size="xs" c="white" fw={600} mt={4}>
              Proveedor: {compra.proveedor}
            </Text>
          </div>

          <div className="text-right">
            <Text
              size="11px"
              c="gray.5"
              fw={600}
              className="uppercase tracking-wider"
            >
              Total Neto a Liquidar
            </Text>
            <Text size="md" fw={900} c="emerald.4" className="font-mono">
              {formatPEN(totalCompraNeto)}
            </Text>
          </div>
        </Group>
      </Paper>

      {/* Anticipos disponibles */}
      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/40 border border-zinc-800 space-y-3"
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
              Anticipos del Proveedor Disponibles
            </Text>
          </Group>

          <Button
            leftSection={<IconCirclePlus className="w-4 h-4" />}
            variant="light"
            color="amber"
            size="xs"
            radius="lg"
            onClick={() =>
              setMostrarFormNuevoAnticipo(!mostrarFormNuevoAnticipo)
            }
          >
            {mostrarFormNuevoAnticipo
              ? "Ocultar formulario"
              : "Registrar nuevo anticipo"}
          </Button>
        </Group>

        {/* Formulario rápido para nuevo anticipo si falta saldo */}
        {mostrarFormNuevoAnticipo && (
          <Paper
            p="sm"
            radius="md"
            className="bg-zinc-950/80 border border-amber-500/30 space-y-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select
                label="Medio de Pago"
                data={["Transferencia", "Depósito", "Efectivo"]}
                value={nuevoMedio}
                onChange={(val) =>
                  setNuevoMedio((val as MedioPago) ?? MedioPago.Transferencia)
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

        {/* Lista de anticipos con saldo */}
        {loading ? (
          <Text size="xs" c="dimmed">
            Cargando anticipos disponibles...
          </Text>
        ) : anticiposDisponibles.length === 0 ? (
          <Text size="xs" c="dimmed" fs="italic">
            Este proveedor no cuenta con anticipos con saldo disponible.
          </Text>
        ) : (
          <Stack gap="xs">
            {anticiposDisponibles.map((a) => {
              const seleccionado = a.id_anticipo in anticiposSeleccionados;
              const saldoActual = Number(a.saldo_actual);
              const montoRetirar = Number(
                anticiposSeleccionados[a.id_anticipo] ?? 0,
              );

              return (
                <div
                  key={a.id_anticipo}
                  className={`p-3 rounded-xl border transition-all ${
                    seleccionado
                      ? "border-amber-500/50 bg-amber-500/10"
                      : "border-zinc-800 bg-zinc-950/40"
                  }`}
                >
                  <Group justify="space-between" align="center">
                    <Group gap="sm">
                      <Checkbox
                        checked={seleccionado}
                        onChange={() => toggleSeleccionAnticipo(a)}
                        color="amber"
                        size="xs"
                      />
                      <div>
                        <Group gap="xs">
                          <Badge variant="light" color="amber" size="sm">
                            {a.medio_pago || "Anticipo"}
                          </Badge>
                          {a.numero_operacion && (
                            <Text size="11px" c="zinc.4" className="font-mono">
                              Op: {a.numero_operacion}
                            </Text>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed" mt={2}>
                          Saldo disponible:{" "}
                          <span className="font-mono font-bold text-white">
                            {formatPEN(saldoActual)}
                          </span>
                        </Text>
                      </div>
                    </Group>

                    {seleccionado && (
                      <div className="w-44">
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
                          min={0.01}
                          max={saldoActual}
                          decimalScale={2}
                          fixedDecimalScale
                          size="xs"
                          radius="lg"
                          classNames={inputClasses}
                        />
                      </div>
                    )}
                  </Group>
                </div>
              );
            })}
          </Stack>
        )}
      </Paper>

      {/* Resumen de Amortización */}
      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-950/80 border border-zinc-800 space-y-2"
      >
        <div className="flex justify-between items-center text-xs">
          <Text size="sm" c="zinc.4">
            Total neto:
          </Text>
          <Text fw={700} size="sm" className="font-mono text-white">
            {formatPEN(totalCompraNeto)}
          </Text>
        </div>
        <div className="flex justify-between items-center text-xs">
          <Text c="amber.4" size="sm">
            (−) Anticipos aplicados:
          </Text>
          <Text fw={700} c="amber.4" className="font-mono" size="sm">
            −{formatPEN(totalAnticiposAplicados)}
          </Text>
        </div>
        <Divider color="zinc.8" my={4} />
        <div className="flex justify-between items-center">
          <Text
            fw={800}
            size="sm"
            c="white"
            className="uppercase tracking-wider"
          >
            Saldo a Pagar:
          </Text>
          <Text
            fw={900}
            size="sm"
            c={saldoPendienteLiquidacion === 0 ? "teal.4" : "green.4"}
            className="font-mono"
          >
            {formatPEN(saldoPendienteLiquidacion)}
          </Text>
        </div>
      </Paper>

      {/* Botones de acción */}
      <Group justify="flex-end" gap="sm" pt="xs">
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          radius="lg"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button
          variant="filled"
          color="teal"
          size="xs"
          radius="lg"
          onClick={handleAprobar}
          loading={saving}
          leftSection={<IconCheck className="w-4 h-4" />}
        >
          Aprobar Liquidación
        </Button>
      </Group>
    </div>
  );
};
