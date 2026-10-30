import { useState } from "react";
import {
  Alert,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { IconReceipt } from "@tabler/icons-react";
import dayjs from "dayjs";

import { useNotify } from "../../../../hooks/useNotify";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { VentaCarbonService } from "../../service/venta-carbon.service";
import { inputClasses } from "../components/input-classes";
import { calcularImportesComprobante } from "./liquidacion-calculos";
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
 * Los importes no se capturan: se calculan a partir de la liquidacion. Por
 * ahora no se aplican anticipos, asi que `monto_pagado_anticipos` queda en 0.
 */
export const ModalComprobante = ({
  venta,
  liquidacion,
  onClose,
  onSaved,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  const [codigoComprobante, setCodigoComprobante] = useState("");
  const [fechaEmision, setFechaEmision] = useState(
    dayjs().format("YYYY-MM-DD"),
  );
  const [observacion, setObservacion] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importes = calcularImportesComprobante(
    Number(liquidacion.subtotal) || 0,
    Number(venta.porcentaje_igv) || 0,
    Number(venta.porcentaje_detraccion) || 0,
  );

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

    setSaving(true);
    try {
      const res = await VentaCarbonService.registrarComprobante(
        venta.id_venta_carbon,
        liquidacion.id_liquidacion_venta_carbon,
        {
          codigo_comprobante: codigoComprobante.trim().toUpperCase(),
          fecha_emision: fechaEmision,
          observacion: observacion.trim() || null,
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
              S/ {formatNumber(liquidacion.subtotal)}
            </Text>
          </Text>
          <Text size="xs" c="gray">
            Anticipos aplicados
            <Text size="sm" fw={700} c="zinc.200">
              S/ 0.00
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

        {/* <Text size="10px" c="dimmed" mt="xs">
          El comprobante queda como pendiente de pago. Los pagos se registran
          contra el neto y, por separado, contra la detraccion.
        </Text> */}
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
    </Stack>
  );
};
