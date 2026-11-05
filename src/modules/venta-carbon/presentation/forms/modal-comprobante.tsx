import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Loader,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from "@mantine/core";
import {
  IconCoins,
  IconPlus,
  IconReceipt,
  IconRefresh,
} from "@tabler/icons-react";
import dayjs from "dayjs";

import { useNotify } from "../../../../hooks/useNotify";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { ClientesService } from "../../../clientes/service/clientes.service";
import type { AnticipoClienteResponse } from "../../../clientes/service/clientes.responses";
import { VentaCarbonService } from "../../service/venta-carbon.service";
import { inputClasses } from "../components/input-classes";
import {
  importesComprobanteConAnticipos,
  round2,
} from "./liquidacion-calculos";
import { ModalRegistroRapidoAnticipoCliente } from "./modal-registro-rapido-anticipo-cliente";
import type {
  LiquidacionVentaCarbonItem,
  VentaCarbonResumen,
} from "../../service/venta-carbon.responses";

interface Props {
  venta: VentaCarbonResumen;
  liquidacion: LiquidacionVentaCarbonItem;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Registro del comprobante de una liquidacion confirmada.
 *
 * Los importes NO se capturan: se derivan de la liquidacion. Si se aplican
 * anticipos del cliente, la cascada se recalcula sobre la base imponible
 * restante (base -> IGV -> total -> detraccion entera -> neto) y el monto
 * usado queda en `monto_pagado_anticipos`.
 */
export const ModalComprobante = ({
  venta,
  liquidacion,
  onClose,
  onSaved,
}: Props) => {
  const { notifyError, notifySuccess, notifyInfo } = useNotify();

  const [codigoComprobante, setCodigoComprobante] = useState("");
  const [fechaEmision, setFechaEmision] = useState(
    dayjs().format("YYYY-MM-DD"),
  );
  const [observacion, setObservacion] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Anticipos del cliente que se pueden amortizar contra este comprobante.
  const [anticipos, setAnticipos] = useState<AnticipoClienteResponse[]>([]);
  const [loadingAnticipos, setLoadingAnticipos] = useState(false);
  const [anticiposSeleccionados, setAnticiposSeleccionados] = useState<
    Record<number, number>
  >({});
  /** Registro rapido de un anticipo nuevo, sin salir del comprobante. */
  const [modalNuevoAnticipo, setModalNuevoAnticipo] = useState(false);

  const subtotal = useMemo(
    () => round2(Number(liquidacion.subtotal) || 0),
    [liquidacion.subtotal],
  );

  const cargarAnticipos = async () => {
    if (!venta.id_cliente) return;
    setLoadingAnticipos(true);
    try {
      const resp = await ClientesService.getAnticiposPorCliente(
        venta.id_cliente,
      );
      if (resp?.success && Array.isArray(resp.data)) {
        // Solo los anticipos con saldo: los anulados no se pueden amortizar.
        setAnticipos(
          resp.data.filter((a) => {
            const anulado =
              Number(a.esta_anulado) === 1 || a.estado === "Anulado";
            return !anulado && Number(a.saldo_actual) > 0.001;
          }),
        );
      } else {
        setAnticipos([]);
      }
    } catch {
      setAnticipos([]);
    } finally {
      setLoadingAnticipos(false);
    }
  };

  useEffect(() => {
    void cargarAnticipos();
    // El modal se monta cada vez que se abre: solo se carga al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalAnticiposAplicados = useMemo(() => {
    const suma = Object.values(anticiposSeleccionados).reduce(
      (acc, val) => acc + (Number(val) || 0),
      0,
    );
    return round2(suma);
  }, [anticiposSeleccionados]);

  const importes = useMemo(
    () =>
      importesComprobanteConAnticipos(
        liquidacion,
        Number(venta.porcentaje_igv) || 0,
        Number(venta.porcentaje_detraccion) || 0,
        totalAnticiposAplicados,
      ),
    [
      liquidacion,
      venta.porcentaje_igv,
      venta.porcentaje_detraccion,
      totalAnticiposAplicados,
    ],
  );

  /**
   * Fija el monto a amortizar de un anticipo. El valor se acota al saldo
   * disponible y al subtotal que todavia falta cubrir: es mejor que el
   * backend rechace el comprobante por un exceso que el usuario no ve.
   */
  const handleSetMontoAnticipo = (idAnticipo: number, monto: number) => {
    const anticipo = anticipos.find((a) => a.id_anticipo === idAnticipo);
    const saldoMax = anticipo ? Number(anticipo.saldo_actual) : 0;

    const otrosAnticipos = round2(
      totalAnticiposAplicados - (anticiposSeleccionados[idAnticipo] ?? 0),
    );
    const disponibleParaEste = Math.max(0, subtotal - otrosAnticipos);

    const montoValido = round2(
      Math.min(Math.max(0, monto), saldoMax, disponibleParaEste),
    );

    setAnticiposSeleccionados((prev) => {
      const copia = { ...prev };
      if (montoValido <= 0) {
        delete copia[idAnticipo];
      } else {
        copia[idAnticipo] = montoValido;
      }
      return copia;
    });
  };

  const handleUsarMaximoAnticipo = (idAnticipo: number) => {
    const anticipo = anticipos.find((a) => a.id_anticipo === idAnticipo);
    if (!anticipo) return;

    const otrosAnticipos = round2(
      totalAnticiposAplicados - (anticiposSeleccionados[idAnticipo] ?? 0),
    );
    const disponibleParaEste = Math.max(0, subtotal - otrosAnticipos);

    handleSetMontoAnticipo(
      idAnticipo,
      Math.min(Number(anticipo.saldo_actual), disponibleParaEste),
    );
  };

  /**
   * Anticipo recien registrado desde este mismo modal: entra a la lista y
   * se aplica de inmediato, hasta donde alcance el subtotal pendiente.
   *
   * El monto se calcula con el saldo que trae el anticipo nuevo (no con el
   * de la lista): la fila recien creada todavia no esta en el estado, asi
   * que buscarla por id todavia no daria resultado.
   */
  const handleAnticipoRegistrado = (nuevo: AnticipoClienteResponse) => {
    setAnticipos((prev) => [nuevo, ...prev]);

    const saldoNuevo = Number(nuevo.saldo_actual) || 0;
    const disponible = Math.max(0, subtotal - totalAnticiposAplicados);
    const monto = round2(Math.min(saldoNuevo, disponible));

    if (monto <= 0) {
      notifyInfo(
        "Anticipo registrado, pero el subtotal de la liquidacion ya esta cubierto por los anticipos aplicados",
      );
      return;
    }

    setAnticiposSeleccionados((prev) => ({
      ...prev,
      [nuevo.id_anticipo]: monto,
    }));
  };

  const handleSubmit = async () => {
    setError(null);

    if (!codigoComprobante.trim()) {
      setError("Ingrese el numero del comprobante");
      return;
    }
    if (!fechaEmision) {
      setError("Ingrese la fecha de emision");
      return;
    }
    if (totalAnticiposAplicados > subtotal) {
      setError(
        `El total de anticipos aplicados (S/ ${formatNumber(totalAnticiposAplicados)}) no puede superar el subtotal de la liquidacion (S/ ${formatNumber(subtotal)})`,
      );
      return;
    }

    const payloadAnticipos = Object.entries(anticiposSeleccionados)
      .filter(([, monto]) => Number(monto) > 0)
      .map(([id, monto]) => ({
        id_anticipo: Number(id),
        monto_retirado: Number(monto),
      }));

    setSaving(true);
    try {
      const res = await VentaCarbonService.registrarComprobante(
        venta.id_venta_carbon,
        liquidacion.id_liquidacion_venta_carbon,
        {
          codigo_comprobante: codigoComprobante.trim().toUpperCase(),
          fecha_emision: fechaEmision,
          observacion: observacion.trim() || null,
          anticipos: payloadAnticipos.length > 0 ? payloadAnticipos : undefined,
          evidencias: archivos.length > 0 ? archivos : undefined,
        },
      );

      if (res.success) {
        notifySuccess("Comprobante registrado correctamente");
        onSaved();
      } else {
        const msg = res.message || "Error al registrar el comprobante";
        setError(msg);
        notifyError(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      setError(msg);
      notifyError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="md">
      {error && (
        <Alert color="red" variant="light" title="Atencion" radius="md">
          {error}
        </Alert>
      )}

      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/60 border border-zinc-800"
      >
        <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
          <TextInput
            label="Numero de Factura"
            placeholder="Ej. F001-000123"
            value={codigoComprobante}
            onChange={(e) =>
              setCodigoComprobante(e.currentTarget.value.toUpperCase())
            }
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />
          <TextInput
            label="Fecha de emision"
            type="date"
            value={fechaEmision}
            onChange={(e) => setFechaEmision(e.currentTarget.value)}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />
          <div className="col-span-1 md:col-span-2">
            <Textarea
              label="Observacion"
              placeholder="Notas del comprobante..."
              value={observacion}
              onChange={(e) => setObservacion(e.currentTarget.value)}
              autosize
              minRows={2}
              maxRows={4}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              disabled={saving}
            />
          </div>
        </SimpleGrid>

        <div className="mt-2">
          <MultiFilePicker
            label="Evidencias del comprobante"
            files={archivos}
            onFilesChange={setArchivos}
          />
        </div>
      </Paper>

      {/* Anticipos del cliente a amortizar contra esta factura */}
      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/60 border border-zinc-800"
      >
        <Group justify="space-between" mb={4}>
          <Group gap="xs">
            <IconCoins size={16} className="text-yellow-400" />
            <Text size="xs" fw={700} c="white">
              Anticipos
            </Text>
          </Group>
          <Group gap="xs">
            <Button
              variant="light"
              size="compact-xs"
              color="yellow"
              radius="md"
              leftSection={<IconPlus size={12} />}
              onClick={() => setModalNuevoAnticipo(true)}
            >
              Registrar anticipo
            </Button>
            <Tooltip label="Refrescar lista de anticipos">
              <Button
                variant="subtle"
                size="compact-xs"
                color="yellow"
                loading={loadingAnticipos}
                onClick={() => void cargarAnticipos()}
                leftSection={<IconRefresh size={12} />}
              >
                Actualizar
              </Button>
            </Tooltip>
          </Group>
        </Group>

        {loadingAnticipos ? (
          <Paper
            p="sm"
            radius="md"
            className="bg-zinc-950/60 border border-zinc-800 text-center"
          >
            <Group justify="center" gap="xs">
              <Loader size="xs" color="yellow" />
              <Text size="xs" c="gray">
                Consultando anticipos del cliente...
              </Text>
            </Group>
          </Paper>
        ) : anticipos.length === 0 ? (
          <div className="w-[70%] text-center m-auto mt-3">
            <Text size="xs" c="gray">
              {venta.cliente
                ? `${venta.cliente} no tiene anticipos con saldo disponible.`
                : "El cliente no tiene anticipos con saldo disponible."}{" "}
              Puedes registrar uno ahora mismo y aplicarlo a esta factura.
            </Text>
          </div>
        ) : (
          <Paper
            p="xs"
            radius="md"
            className="bg-zinc-950/60 border border-zinc-800 max-h-48 overflow-y-auto"
          >
            <SimpleGrid cols={2}>
              {anticipos.map((a) => {
                const saldoDisp = Number(a.saldo_actual);
                const montoUsado = anticiposSeleccionados[a.id_anticipo] || 0;
                const isChecked = montoUsado > 0;

                return (
                  <Group
                    key={a.id_anticipo}
                    justify="space-between"
                    align="center"
                    wrap="nowrap"
                    className={`p-2 rounded-lg border transition-colors ${
                      isChecked
                        ? "bg-zinc-900/80 border-yellow-500/50"
                        : "bg-zinc-900/40 border-zinc-800/80"
                    }`}
                  >
                    <Group gap="xs" align="flex-start" className="flex-1">
                      <Checkbox
                        size="xs"
                        color="yellow"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.currentTarget.checked) {
                            handleUsarMaximoAnticipo(a.id_anticipo);
                          } else {
                            handleSetMontoAnticipo(a.id_anticipo, 0);
                          }
                        }}
                        className="mt-0.5"
                      />

                      <div>
                        <Group gap="xs">
                          <Badge color="yellow" variant="outline" size="sm">
                            {a.fecha_hora_pago
                              ? dayjs(a.fecha_hora_pago).format("DD/MM/YYYY")
                              : "Sin fecha"}
                          </Badge>
                          {a.codigo_comprobante && (
                            <Text size="xs" c="gray">
                              Doc: {a.codigo_comprobante}
                            </Text>
                          )}
                        </Group>
                        <Text size="xs" c="gray" mt={2}>
                          Saldo disp.:{" "}
                          <span className="text-emerald-400 font-bold">
                            S/ {formatNumber(saldoDisp)}
                          </span>
                        </Text>
                      </div>
                    </Group>

                    <NumberInput
                      placeholder="Monto"
                      max={saldoDisp}
                      fixedDecimalScale
                      size="xs"
                      radius="md"
                      w={85}
                      disabled={!isChecked}
                      value={montoUsado || ""}
                      onChange={(val) =>
                        handleSetMontoAnticipo(a.id_anticipo, Number(val) || 0)
                      }
                    />
                  </Group>
                );
              })}
            </SimpleGrid>
          </Paper>
        )}
      </Paper>

      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/60 border border-zinc-800"
      >
        <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">
          Importes del comprobante
        </Text>
        <SimpleGrid cols={{ base: 2, md: 3 }} spacing="sm">
          <Text size="xs" c="gray">
            Subtotal (de la liquidacion)
            <Text size="sm" fw={700} c="zinc.200">
              S/ {formatNumber(subtotal)}
            </Text>
          </Text>
          <Text size="xs" c="gray">
            Anticipos aplicados
            <Text
              size="sm"
              fw={700}
              c={totalAnticiposAplicados > 0 ? "yellow.3" : "zinc.200"}
            >
              {totalAnticiposAplicados > 0
                ? `-S/ ${formatNumber(totalAnticiposAplicados)}`
                : "S/ 0.00"}
            </Text>
          </Text>
          <Text size="xs" c="gray">
            Base imponible
            <Text size="sm" fw={700} c="zinc.200">
              S/ {formatNumber(importes.base_imponible)}
            </Text>
          </Text>
          <Text size="xs" c="gray">
            IGV ({formatNumber(venta.porcentaje_igv)}%)
            <Text size="sm" fw={700} c="zinc.200">
              S/ {formatNumber(importes.monto_igv)}
            </Text>
          </Text>
          <Text size="xs" c="gray">
            Importe total
            <Text size="sm" fw={700} c="indigo.3">
              S/ {formatNumber(importes.importe_total)}
            </Text>
          </Text>
          <Text size="xs" c="gray">
            Detraccion ({formatNumber(venta.porcentaje_detraccion)}%)
            <Text size="sm" fw={700} c="orange.3">
              S/ {formatNumber(importes.monto_detraccion)}
            </Text>
          </Text>
          <Text size="xs" c="gray">
            Neto a pagar
            <Text size="sm" fw={800} c="lime.3">
              S/ {formatNumber(importes.monto_neto)}
            </Text>
          </Text>
        </SimpleGrid>
      </Paper>

      <Group justify="flex-end" gap="sm">
        <Button
          variant="default"
          onClick={onClose}
          disabled={saving}
          size="xs"
          radius="lg"
        >
          Cancelar
        </Button>
        <Button
          color="indigo"
          onClick={handleSubmit}
          loading={saving}
          size="xs"
          radius="lg"
          leftSection={<IconReceipt size={16} />}
        >
          Registrar comprobante
        </Button>
      </Group>

      {/* Registro rapido de un anticipo del cliente, sin salir del comprobante */}
      <ModalRegistroRapidoAnticipoCliente
        opened={modalNuevoAnticipo}
        onClose={() => setModalNuevoAnticipo(false)}
        idCliente={venta.id_cliente}
        nombreCliente={venta.cliente ?? undefined}
        onRegistrado={handleAnticipoRegistrado}
      />
    </Stack>
  );
};
