import { useState, useEffect, useMemo } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Group,
  Loader,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCoins,
  IconPlus,
  IconReceipt,
  IconRefresh,
} from "@tabler/icons-react";
import dayjs from "dayjs";

import { useNotify } from "../../../../hooks/useNotify";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { ProveedoresService } from "../../../proveedores/service/proveedores.service";
import type { AnticipoProveedorResponse } from "../../../proveedores/service/proveedores.responses";
import { CompraCarbonService } from "../../service/compra-carbon.service";
import type {
  CargaCompraCarbonItem,
  RespuestaRegistrarComprobanteProveedor,
} from "../../service/compra-carbon.responses";
import { inputClasses, round2 } from "./input-classes";
import { ModalRegistroRapidoAnticipo } from "./modal-registro-rapido-anticipo";

interface Props {
  opened: boolean;
  onClose: () => void;
  idCompraCarbon: number;
  idProveedor: number;
  nombreProveedor?: string;
  cargasDisponibles: CargaCompraCarbonItem[];
  onSuccess: (data: RespuestaRegistrarComprobanteProveedor) => void;
}

export const ModalComprobanteProveedor = ({
  opened,
  onClose,
  idCompraCarbon,
  idProveedor,
  nombreProveedor,
  cargasDisponibles,
  onSuccess,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  // Estados del Formulario
  const [codigoComprobante, setCodigoComprobante] = useState("");
  const [fechaEmision, setFechaEmision] = useState(
    dayjs().format("YYYY-MM-DD"),
  );
  const [conDetraccion, setConDetraccion] = useState(true);
  const [pctDetraccion, setPctDetraccion] = useState<number | string>(10);
  const [cargasSeleccionadas, setCargasSeleccionadas] = useState<number[]>([]);
  const [anticiposSeleccionados, setAnticiposSeleccionados] = useState<
    Record<number, number>
  >({});
  const [archivos, setArchivos] = useState<File[]>([]);
  const [observacion, setObservacion] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Estados de Anticipos
  const [anticipos, setAnticipos] = useState<AnticipoProveedorResponse[]>([]);
  const [loadingAnticipos, setLoadingAnticipos] = useState(false);
  const [modalNuevoAnticipo, setModalNuevoAnticipo] = useState(false);

  // Cargar anticipos del proveedor
  const cargarAnticipos = async () => {
    if (!idProveedor) return;
    setLoadingAnticipos(true);
    try {
      const resp =
        await ProveedoresService.getAnticiposPorProveedor(idProveedor);
      if (resp && resp.success && Array.isArray(resp.data)) {
        // Filtrar no anulados y con saldo mayor a 0
        const disponibles = resp.data.filter((a) => {
          const esAnulado =
            Number(a.esta_anulado) === 1 || a.estado === "Anulado";
          const saldo = Number(a.saldo_actual);
          return !esAnulado && saldo > 0.001;
        });
        setAnticipos(disponibles);
      } else {
        setAnticipos([]);
      }
    } catch (err) {
      console.error("Error al cargar anticipos del proveedor:", err);
      setAnticipos([]);
    } finally {
      setLoadingAnticipos(false);
    }
  };

  useEffect(() => {
    if (opened) {
      cargarAnticipos();
      // Pre-seleccionar todas las cargas por comodidad
      setCargasSeleccionadas(
        cargasDisponibles.map((c) => c.id_carga_compra_carbon),
      );
      setAnticiposSeleccionados({});
      setCodigoComprobante("");
      setArchivos([]);
      setObservacion("");
    }
  }, [opened, idProveedor]);

  // Cálculos dinámicos
  const totalCargas = useMemo(() => {
    const seleccionadas = cargasDisponibles.filter((c) =>
      cargasSeleccionadas.includes(c.id_carga_compra_carbon),
    );
    const suma = seleccionadas.reduce(
      (acc, c) => acc + Number(c.subtotal_con_descuento || 0),
      0,
    );
    return round2(suma);
  }, [cargasDisponibles, cargasSeleccionadas]);

  const montoDetraccion = useMemo(() => {
    if (!conDetraccion || Number(pctDetraccion) <= 0) return 0;
    return round2((totalCargas * Number(pctDetraccion)) / 100);
  }, [conDetraccion, pctDetraccion, totalCargas]);

  const totalSinDetraccion = useMemo(() => {
    return round2(Math.max(0, totalCargas - montoDetraccion));
  }, [totalCargas, montoDetraccion]);

  const totalAnticiposAplicados = useMemo(() => {
    const suma = Object.values(anticiposSeleccionados).reduce(
      (acc, val) => acc + (Number(val) || 0),
      0,
    );
    return round2(suma);
  }, [anticiposSeleccionados]);

  const totalNetoAPagar = useMemo(() => {
    return round2(Math.max(0, totalSinDetraccion - totalAnticiposAplicados));
  }, [totalSinDetraccion, totalAnticiposAplicados]);

  // Selección de todos / ninguno de cargas
  const handleToggleTodasCargas = () => {
    if (cargasSeleccionadas.length === cargasDisponibles.length) {
      setCargasSeleccionadas([]);
    } else {
      setCargasSeleccionadas(
        cargasDisponibles.map((c) => c.id_carga_compra_carbon),
      );
    }
  };

  // Manejo de anticipos
  const handleSetMontoAnticipo = (idAnticipo: number, monto: number) => {
    const anticipo = anticipos.find((a) => a.id_anticipo === idAnticipo);
    const saldoMax = anticipo ? Number(anticipo.saldo_actual) : 0;
    const montoValido = Math.min(Math.max(0, monto), saldoMax);

    setAnticiposSeleccionados((prev) => {
      const copia = { ...prev };
      if (montoValido <= 0) {
        delete copia[idAnticipo];
      } else {
        copia[idAnticipo] = round2(montoValido);
      }
      return copia;
    });
  };

  const handleUsarMaximoAnticipo = (idAnticipo: number) => {
    const anticipo = anticipos.find((a) => a.id_anticipo === idAnticipo);
    if (!anticipo) return;
    const saldoMax = Number(anticipo.saldo_actual);

    // Calcular cuánto le falta por cubrir al total sin detracción
    const otrosAnticipos = Object.entries(anticiposSeleccionados).reduce(
      (acc, [id, val]) => (Number(id) === idAnticipo ? acc : acc + val),
      0,
    );
    const faltaCubrir = Math.max(0, totalSinDetraccion - otrosAnticipos);
    const montoSugerido = Math.min(saldoMax, faltaCubrir);

    handleSetMontoAnticipo(idAnticipo, montoSugerido);
  };

  const handleGuardar = async () => {
    if (!codigoComprobante.trim()) {
      notifyError("Ingrese el número de comprobante (factura/boleta)");
      return;
    }
    if (!fechaEmision) {
      notifyError("Ingrese la fecha de emisión del comprobante");
      return;
    }
    if (cargasSeleccionadas.length === 0) {
      notifyError("Debe seleccionar al menos una carga para este comprobante");
      return;
    }
    if (totalAnticiposAplicados > totalSinDetraccion) {
      notifyError(
        `El total de anticipos aplicados (S/ ${formatNumber(totalAnticiposAplicados)}) no puede superar el total sin detracción (S/ ${formatNumber(totalSinDetraccion)})`,
      );
      return;
    }

    const payloadAnticipos = Object.entries(anticiposSeleccionados)
      .filter(([, monto]) => Number(monto) > 0)
      .map(([id, monto]) => ({
        id_anticipo_proveedor: Number(id),
        monto_retirado: Number(monto),
      }));

    setGuardando(true);
    try {
      const res = await CompraCarbonService.registrarComprobanteProveedor(
        idCompraCarbon,
        {
          codigo_comprobante: codigoComprobante.trim().toUpperCase(),
          fecha_emision: fechaEmision,
          observacion: observacion.trim() || undefined,
          con_detraccion: conDetraccion,
          porcentaje_detraccion: conDetraccion
            ? Number(pctDetraccion)
            : undefined,
          ids_cargas: cargasSeleccionadas,
          anticipos: payloadAnticipos.length > 0 ? payloadAnticipos : undefined,
          evidencias: archivos.length > 0 ? archivos : undefined,
        },
      );

      if (res && res.success) {
        notifySuccess("Factura / Comprobante registrado exitosamente");
        onSuccess(res.data);
        onClose();
      } else {
        notifyError(res?.message || "Error al registrar el comprobante");
      }
    } catch (err: unknown) {
      notifyError(
        err instanceof Error
          ? err.message
          : "Error inesperado al guardar comprobante",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <ModalEstandar
        opened={opened}
        close={onClose}
        title="Registrar Comprobante"
        size="xl"
        validateClose
        rightSection={
          <Group justify="space-between">
            <Badge color="indigo" variant="light" size="sm">
              Aplica IGV
            </Badge>
            <div>
              <Text size="xs" c="dimmed">
                Proveedor
              </Text>
              <Text size="sm" fw={700} c="white">
                {nombreProveedor}
              </Text>
            </div>
          </Group>
        }
      >
        <Stack gap="md">
          {/* Datos Principales */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput
              label="Número de comprobante"
              placeholder="Ej. F001-000123"
              value={codigoComprobante}
              onChange={(e) =>
                setCodigoComprobante(e.currentTarget.value.toUpperCase())
              }
              classNames={inputClasses}
              size="xs"
              radius="lg"
              required
            />
            <TextInput
              label="Fecha de emisión"
              type="date"
              value={fechaEmision}
              onChange={(e) => setFechaEmision(e.currentTarget.value)}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              required
            />
          </SimpleGrid>

          {/* Detracción SUNAT */}
          <Group
            justify="space-between"
            p="sm"
            className="bg-zinc-900/60 rounded-xl border border-zinc-800"
          >
            <div>
              <Text size="xs" fw={600} c="white">
                ¿Aplica detracción SUNAT?
              </Text>
              <Text size="xs" c="dimmed">
                Retención oficial para depósito al Banco de la Nación
              </Text>
            </div>
            <Group gap="xs">
              {conDetraccion && (
                <NumberInput
                  value={pctDetraccion}
                  onChange={setPctDetraccion}
                  min={1}
                  max={30}
                  size="xs"
                  radius="lg"
                  rightSection={
                    <Text size="xs" mr={8}>
                      %
                    </Text>
                  }
                  hideControls
                  w={90}
                />
              )}
              <Switch
                checked={conDetraccion}
                onChange={(e) => setConDetraccion(e.currentTarget.checked)}
                color="indigo"
                size="sm"
              />
            </Group>
          </Group>

          {/* Cargas Disponibles */}
          <div>
            <Group justify="space-between" mb={4}>
              <Text size="xs" fw={700} c="white">
                Cargas a incluir en esta factura ({cargasSeleccionadas.length}/
                {cargasDisponibles.length}):
              </Text>
              {cargasDisponibles.length > 1 && (
                <Button
                  variant="subtle"
                  size="compact-xs"
                  color="indigo"
                  onClick={handleToggleTodasCargas}
                >
                  {cargasSeleccionadas.length === cargasDisponibles.length
                    ? "Deseleccionar todas"
                    : "Seleccionar todas"}
                </Button>
              )}
            </Group>

            {cargasDisponibles.length === 0 ? (
              <Paper
                p="sm"
                className="bg-zinc-950/60 border border-zinc-800 text-center"
              >
                <Text size="xs" c="dimmed">
                  No hay cargas pendientes de facturación en esta orden de
                  compra.
                </Text>
              </Paper>
            ) : (
              <Paper
                p="xs"
                radius="md"
                className="bg-zinc-950/60 border border-zinc-800 max-h-48 overflow-y-auto"
              >
                <Stack gap={6}>
                  {cargasDisponibles.map((c) => {
                    const estaCheck = cargasSeleccionadas.includes(
                      c.id_carga_compra_carbon,
                    );
                    return (
                      <Group
                        key={c.id_carga_compra_carbon}
                        justify="space-between"
                        className={`p-1.5 rounded-lg transition-colors ${
                          estaCheck
                            ? "bg-indigo-950/20 border border-indigo-900/30"
                            : "hover:bg-zinc-900/40"
                        }`}
                      >
                        <Checkbox
                          size="xs"
                          label={
                            <Text size="xs" c={estaCheck ? "white" : "zinc.4"}>
                              Ticket #{c.codigo_ticket_balanza} · Placa{" "}
                              {c.placa} ({formatNumber(c.cantidad, 2)} TN -{" "}
                              {c.tipo_carbon_nombre})
                            </Text>
                          }
                          checked={estaCheck}
                          onChange={(e) => {
                            if (e.currentTarget.checked) {
                              setCargasSeleccionadas((prev) => [
                                ...prev,
                                c.id_carga_compra_carbon,
                              ]);
                            } else {
                              setCargasSeleccionadas((prev) =>
                                prev.filter(
                                  (id) => id !== c.id_carga_compra_carbon,
                                ),
                              );
                            }
                          }}
                        />
                        <Text
                          size="xs"
                          fw={700}
                          c={estaCheck ? "teal" : "dimmed"}
                        >
                          S/ {formatNumber(c.subtotal_con_descuento)}
                        </Text>
                      </Group>
                    );
                  })}
                </Stack>
              </Paper>
            )}
          </div>

          {/* Sección de Anticipos del Proveedor */}
          <div>
            <Group justify="space-between" mb={4}>
              <Group gap="xs">
                <IconCoins size={16} className="text-yellow-400" />
                <Text size="xs" fw={700} c="white">
                  Anticipos del proveedor para amortizar:
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
                  Registrar Anticipo
                </Button>
                <Tooltip label="Refrescar lista de anticipos">
                  <Button
                    variant="subtle"
                    size="compact-xs"
                    color="yellow"
                    loading={loadingAnticipos}
                    onClick={cargarAnticipos}
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
                className="bg-zinc-950/60 border border-zinc-800 text-center"
              >
                <Group justify="center" gap="xs">
                  <Loader size="xs" color="yellow" />
                  <Text size="xs" c="dimmed">
                    Consultando anticipos disponibles del proveedor...
                  </Text>
                </Group>
              </Paper>
            ) : anticipos.length === 0 ? (
              <Paper
                p="sm"
                radius="md"
                className="bg-zinc-950/40 border border-dashed border-zinc-800"
              >
                <Group justify="space-between" align="center">
                  <Group gap="xs">
                    <ThemeIcon
                      color="yellow"
                      variant="light"
                      size="sm"
                      radius="xl"
                    >
                      <IconAlertCircle size={14} />
                    </ThemeIcon>
                    <Text size="xs" c="dimmed">
                      El proveedor no cuenta con anticipos libres. Puedes
                      registrar uno ahora mismo.
                    </Text>
                  </Group>
                </Group>
              </Paper>
            ) : (
              <Paper
                p="xs"
                radius="md"
                className="bg-zinc-950/60 border border-zinc-800 max-h-48 overflow-y-auto"
              >
                <SimpleGrid cols={2} spacing="xs">
                  {anticipos.map((a) => {
                    const saldoDisp = Number(a.saldo_actual);
                    const montoUsado =
                      anticiposSeleccionados[a.id_anticipo] || 0;
                    const isChecked = montoUsado > 0;

                    return (
                      <Group
                        key={a.id_anticipo}
                        justify="space-between"
                        align="center"
                        className={`p-2.5 rounded-lg border transition-colors ${
                          isChecked
                            ? "bg-zinc-900/80 border-amber-500/50"
                            : "bg-zinc-900/40 border-zinc-800/80"
                        }`}
                      >
                        <Group gap="xs" align="flex-start" className="flex-1">
                          <Checkbox
                            size="xs"
                            color="yellow"
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.currentTarget.checked;
                              handleSetMontoAnticipo(
                                a.id_anticipo,
                                checked ? saldoDisp : 0,
                              );
                            }}
                            className="mt-0.5"
                          />

                          <div>
                            <Group gap="xs">
                              <Text size="xs" fw={700} c="white">
                                #{a.id_anticipo}
                              </Text>
                              <Badge color="yellow" variant="outline" size="xs">
                                {dayjs(a.fecha_hora_pago).format("DD/MM/YYYY")}
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
                          w={110}
                          disabled={!isChecked}
                          value={montoUsado || ""}
                          onChange={(val) =>
                            handleSetMontoAnticipo(
                              a.id_anticipo,
                              Number(val) || 0,
                            )
                          }
                        />
                      </Group>
                    );
                  })}
                </SimpleGrid>
              </Paper>
            )}
          </div>

          {/* Adjuntos / Factura Digital */}
          <div className="bg-zinc-950/40 p-3 rounded-2xl border border-dashed border-zinc-800">
            <MultiFilePicker
              label="Evidencias / Factura digital (PDF, XML, Imagen)"
              description="Archivos permitidos: PDF, XML o imágenes"
              files={archivos}
              onFilesChange={setArchivos}
              multiple
            />
          </div>

          {/* Observación */}
          <TextInput
            label="Observación"
            placeholder="Opcional"
            value={observacion}
            onChange={(e) => setObservacion(e.currentTarget.value)}
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />

          {/* Resumen Financiero de la Factura */}
          <Paper
            p="sm"
            radius="md"
            className="bg-indigo-950/20 border border-indigo-900/40"
          >
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
              <div>
                <Text size="xs" c="dimmed">
                  Total Cargas
                </Text>
                <Text size="sm" fw={700} c="white">
                  S/ {formatNumber(totalCargas)}
                </Text>
              </div>

              {conDetraccion && (
                <div>
                  <Text size="xs" c="dimmed">
                    Detracción ({pctDetraccion}%)
                  </Text>
                  <Text size="sm" fw={700} c="orange.4">
                    S/ {formatNumber(montoDetraccion)}
                  </Text>
                </div>
              )}

              <div>
                <Text size="xs" c="dimmed">
                  Anticipos descontados
                </Text>
                <Text
                  size="sm"
                  fw={700}
                  c={totalAnticiposAplicados > 0 ? "yellow.4" : "dimmed"}
                >
                  -S/ {formatNumber(totalAnticiposAplicados)}
                </Text>
              </div>

              <div>
                <Text size="xs" c="dimmed">
                  Neto a pagar en banco
                </Text>
                <Text size="sm" fw={800} c="teal.4">
                  S/ {formatNumber(totalNetoAPagar)}
                </Text>
              </div>
            </SimpleGrid>
          </Paper>

          {/* Botones de Acción */}
          <Group justify="flex-end" gap="xs" mt="xs">
            <Button
              variant="default"
              size="xs"
              radius="lg"
              onClick={onClose}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              color="indigo"
              size="xs"
              radius="lg"
              loading={guardando}
              leftSection={<IconReceipt size={14} />}
              onClick={handleGuardar}
            >
              Guardar Factura
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>

      <ModalRegistroRapidoAnticipo
        opened={modalNuevoAnticipo}
        onClose={() => setModalNuevoAnticipo(false)}
        idProveedor={idProveedor}
        nombreProveedor={nombreProveedor}
        onSuccess={(nuevo) => {
          setAnticipos((prev) => [nuevo, ...prev]);
          handleUsarMaximoAnticipo(nuevo.id_anticipo);
        }}
      />
    </>
  );
};
