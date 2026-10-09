import { useState, useEffect, useMemo } from "react";
import {
  Button,
  Checkbox,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconReceipt } from "@tabler/icons-react";
import dayjs from "dayjs";

import { useNotify } from "../../../../hooks/useNotify";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { CompraCarbonService } from "../../service/compra-carbon.service";
import type {
  CargaCompraCarbonItem,
  RespuestaRegistrarComprobanteTransporte,
} from "../../service/compra-carbon.responses";
import { inputClasses, round2 } from "./input-classes";

interface Props {
  opened: boolean;
  onClose: () => void;
  idCompraCarbon: number;
  cargasDisponiblesFlete: CargaCompraCarbonItem[];
  onSuccess: (data: RespuestaRegistrarComprobanteTransporte) => void;
}

export const ModalComprobanteTransporte = ({
  opened,
  onClose,
  idCompraCarbon,
  cargasDisponiblesFlete,
  onSuccess,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  const [idTransportista, setIdTransportista] = useState<string | null>(null);
  const [codigoComprobante, setCodigoComprobante] = useState("");
  const [fechaEmision, setFechaEmision] = useState(
    dayjs().format("YYYY-MM-DD"),
  );
  const [conDetraccion, setConDetraccion] = useState(true);
  const [pctDetraccion, setPctDetraccion] = useState<number | string>(4);
  const [cargasSeleccionadas, setCargasSeleccionadas] = useState<number[]>([]);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [observacion, setObservacion] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Lista única de transportistas derivados de las cargas disponibles con flete
  const listaTransportistas = useMemo(() => {
    const map = new Map<number, string>();
    cargasDisponiblesFlete.forEach((c) => {
      if (c.id_transportista && c.transportista_razon_social) {
        map.set(c.id_transportista, c.transportista_razon_social);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({
      value: String(id),
      label,
    }));
  }, [cargasDisponiblesFlete]);

  useEffect(() => {
    if (opened) {
      setCodigoComprobante("");
      setFechaEmision(dayjs().format("YYYY-MM-DD"));
      setConDetraccion(true);
      setPctDetraccion(4);
      setArchivos([]);
      setObservacion("");

      if (listaTransportistas.length > 0) {
        setIdTransportista(listaTransportistas[0].value);
      } else {
        setIdTransportista(null);
      }
    }
  }, [opened, listaTransportistas]);

  // Cargas del transportista seleccionado
  const cargasDelTransportista = useMemo(() => {
    if (!idTransportista) return cargasDisponiblesFlete;
    return cargasDisponiblesFlete.filter(
      (c) => String(c.id_transportista) === String(idTransportista),
    );
  }, [cargasDisponiblesFlete, idTransportista]);

  // Al cambiar transportista, pre-seleccionar todas sus cargas
  useEffect(() => {
    setCargasSeleccionadas(
      cargasDelTransportista.map((c) => c.id_carga_compra_carbon),
    );
  }, [idTransportista, cargasDelTransportista]);

  // Totales
  const totalFlete = useMemo(() => {
    const seleccionadas = cargasDelTransportista.filter((c) =>
      cargasSeleccionadas.includes(c.id_carga_compra_carbon),
    );
    const suma = seleccionadas.reduce(
      (acc, c) => acc + Number(c.descuento_flete || 0),
      0,
    );
    return round2(suma);
  }, [cargasDelTransportista, cargasSeleccionadas]);

  const montoDetraccion = useMemo(() => {
    if (!conDetraccion || Number(pctDetraccion) <= 0) return 0;
    return round2((totalFlete * Number(pctDetraccion)) / 100);
  }, [conDetraccion, pctDetraccion, totalFlete]);

  const totalNetoFlete = useMemo(() => {
    return round2(Math.max(0, totalFlete - montoDetraccion));
  }, [totalFlete, montoDetraccion]);

  const handleGuardar = async () => {
    if (!idTransportista) {
      notifyError("Seleccione la empresa de transporte");
      return;
    }
    if (!codigoComprobante.trim()) {
      notifyError("Ingrese el número de la factura de transporte");
      return;
    }
    if (!fechaEmision) {
      notifyError("Ingrese la fecha de emisión");
      return;
    }
    if (cargasSeleccionadas.length === 0) {
      notifyError(
        "Seleccione al menos una carga para este comprobante de flete",
      );
      return;
    }

    setGuardando(true);
    try {
      const res = await CompraCarbonService.registrarComprobanteTransporte(
        idCompraCarbon,
        {
          id_transportista: Number(idTransportista),
          codigo_comprobante: codigoComprobante.trim().toUpperCase(),
          fecha_emision: fechaEmision,
          observacion: observacion.trim() || undefined,
          con_detraccion: conDetraccion,
          porcentaje_detraccion: conDetraccion
            ? Number(pctDetraccion)
            : undefined,
          ids_cargas: cargasSeleccionadas,
          evidencias: archivos.length > 0 ? archivos : undefined,
        },
      );

      if (res && res.success) {
        notifySuccess("Factura de transporte registrada exitosamente");
        onSuccess(res.data);
        onClose();
      } else {
        notifyError(
          res?.message || "Error al registrar comprobante de transporte",
        );
      }
    } catch (err: unknown) {
      notifyError(
        err instanceof Error
          ? err.message
          : "Error inesperado al guardar comprobante de transporte",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalEstandar
      opened={opened}
      close={onClose}
      title="Registrar Factura de Transporte"
      size="lg"
      validateClose
    >
      <Stack gap="md">
        {/* Selector de Transportista */}

        {/* Factura y Fecha */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Select
            label="Empresa de Transporte"
            placeholder="Seleccione transportista"
            data={listaTransportistas}
            value={idTransportista}
            onChange={setIdTransportista}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            searchable
            required
          />
          <TextInput
            label="Número de factura"
            placeholder="Ej. F001-9988"
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
          {/* Detracción Transporte */}
          <NumberInput
            label={
              <Checkbox
                checked={conDetraccion}
                onChange={(e) => setConDetraccion(e.currentTarget.checked)}
                label="¿Aplicar detracción?"
                size="xs"
                color="indigo"
                styles={{
                  label: {
                    fontWeight: 600,
                    color: "white",
                    paddingLeft: 8,
                    cursor: "pointer",
                  },
                  input: { cursor: "pointer" },
                }}
              />
            }
            value={conDetraccion ? pctDetraccion : ""}
            onChange={setPctDetraccion}
            placeholder="0"
            disabled={!conDetraccion}
            rightSection={
              <Text size="xs" c="dimmed" mr={8}>
                %
              </Text>
            }
            hideControls
            classNames={inputClasses}
          />
        </SimpleGrid>

        {/* Cargas cubiertas por este flete */}
        <div>
          <Text size="xs" fw={700} c="white" mb={4}>
            Cargas con este transportista ({cargasSeleccionadas.length}/
            {cargasDelTransportista.length}):
          </Text>

          {cargasDelTransportista.length === 0 ? (
            <Paper
              p="sm"
              className="bg-zinc-950/60 border border-zinc-800 text-center"
            >
              <Text size="xs" c="dimmed">
                No hay cargas con flete pendiente asociadas al transportista
                seleccionado.
              </Text>
            </Paper>
          ) : (
            <Paper
              p="xs"
              radius="md"
              className="bg-zinc-950/60 border border-zinc-800 max-h-48 overflow-y-auto"
            >
              <Stack gap={6}>
                {cargasDelTransportista.map((c) => {
                  const check = cargasSeleccionadas.includes(
                    c.id_carga_compra_carbon,
                  );
                  return (
                    <Group
                      key={c.id_carga_compra_carbon}
                      justify="space-between"
                      className="p-1.5 rounded hover:bg-zinc-900/40"
                    >
                      <Checkbox
                        size="xs"
                        label={`Ticket #${c.codigo_ticket_balanza} · Placa ${c.placa} (${formatNumber(c.cantidad, 2)} TN)`}
                        checked={check}
                        onChange={(e) => {
                          if (e.currentTarget.checked) {
                            setCargasSeleccionadas((p) => [
                              ...p,
                              c.id_carga_compra_carbon,
                            ]);
                          } else {
                            setCargasSeleccionadas((p) =>
                              p.filter((id) => id !== c.id_carga_compra_carbon),
                            );
                          }
                        }}
                      />
                      <Text size="xs" fw={700} c="white">
                        S/ {formatNumber(c.descuento_flete)}
                      </Text>
                    </Group>
                  );
                })}
              </Stack>
            </Paper>
          )}
        </div>

        {/* Evidencias */}
        <div className="bg-zinc-950/40 p-3 rounded-2xl border border-dashed border-zinc-800">
          <MultiFilePicker
            label="Evidencias / Factura de flete (PDF, XML, Imagen)"
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

        {/* Resumen Financiero */}
        <Paper
          p="sm"
          radius="md"
          className="bg-indigo-950/20 border border-indigo-900/40"
        >
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed">
                Total Flete
              </Text>
              <Text size="sm" fw={700} c="white">
                S/ {formatNumber(totalFlete)}
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
                Neto a Pagar
              </Text>
              <Text size="sm" fw={800} c="teal.4">
                S/ {formatNumber(totalNetoFlete)}
              </Text>
            </div>
          </Group>
        </Paper>

        {/* Botones */}
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
            Guardar Factura Flete
          </Button>
        </Group>
      </Stack>
    </ModalEstandar>
  );
};
