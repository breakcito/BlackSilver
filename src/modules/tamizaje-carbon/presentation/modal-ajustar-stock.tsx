import {
  Button,
  Group,
  NumberInput,
  Stack,
  Text,
  Textarea,
  Paper,
  Badge,
} from "@mantine/core";
import { useState } from "react";
import { CheckIcon, XMarkIcon, ScaleIcon } from "@heroicons/react/24/outline";
import { useNotify } from "../../../hooks/useNotify";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { TamizajeCarbonService } from "../service/tamizaje-carbon.service";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import type { StockCarbonItem } from "../service/tamizaje-carbon.responses";

interface Props {
  opened: boolean;
  onClose: () => void;
  stockItem: StockCarbonItem;
  onGuardado: () => void;
}

const estilitos = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white placeholder:text-zinc-500",
  label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
};

export const ModalAjustarStock = ({
  opened,
  onClose,
  stockItem,
  onGuardado,
}: Props) => {
  const { notifySuccess, notifyError } = useNotify();
  const [nuevoStock, setNuevoStock] = useState<number | string>(
    Number(stockItem.stock_actual) || 0,
  );
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const stockActualNum = Number(stockItem.stock_actual) || 0;
  const nuevoStockNum = typeof nuevoStock === "number" ? nuevoStock : Number(nuevoStock) || 0;
  const diferencia = nuevoStockNum - stockActualNum;

  const handleSubmit = async () => {
    if (nuevoStockNum < 0) {
      notifyError("El stock resultante no puede ser negativo");
      return;
    }
    if (!motivo.trim()) {
      notifyError("Debe ingresar un motivo para el ajuste manual");
      return;
    }

    setSubmitting(true);
    try {
      const resp = await TamizajeCarbonService.actualizarStock(
        stockItem.id_stock_carbon,
        {
          stock_actual: nuevoStockNum,
          motivo: motivo.trim(),
        },
      );

      if (resp.success) {
        notifySuccess("Stock ajustado correctamente");
        onGuardado();
        onClose();
      } else {
        notifyError(resp.message || "Error al ajustar el stock");
      }
    } catch (err) {
      console.error(err);
      notifyError("Ocurrió un error al actualizar el stock");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalEstandar
      opened={opened}
      close={onClose}
      title={
        <Group gap="xs">
          <ScaleIcon className="w-5 h-5 text-indigo-400" />
          <span>Ajuste Manual de Stock</span>
        </Group>
      }
      size="md"
      validateClose
    >
      <Stack gap="md">
        <Paper className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed">
              Almacén:
            </Text>
            <Text size="xs" fw={600} className="text-white">
              {stockItem.almacen_nombre}
            </Text>
          </Group>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed">
              Tipo de carbón:
            </Text>
            <Badge variant="light" color="indigo" radius="sm">
              {stockItem.tipo_carbon_nombre}
            </Badge>
          </Group>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Stock actual en sistema:
            </Text>
            <Text size="sm" fw={700} className="text-zinc-200 font-mono">
              {formatNumber(stockActualNum)} TN
            </Text>
          </Group>
        </Paper>

        <NumberInput
          label="Nuevo stock real (TN)"
          description="Ingrese el peso medido o verificado en almacén"
          placeholder="0.00"
          value={nuevoStock}
          onChange={setNuevoStock}
          min={0}
          decimalScale={4}
          fixedDecimalScale={false}
          required
          radius="lg"
          size="xs"
          classNames={estilitos}
        />

        {diferencia !== 0 && (
          <Group justify="space-between" px="xs">
            <Text size="xs" c="dimmed">
              Variación de stock:
            </Text>
            <Badge
              variant="light"
              color={diferencia > 0 ? "teal" : "red"}
              radius="sm"
            >
              {diferencia > 0 ? `+${formatNumber(diferencia)} TN` : `${formatNumber(diferencia)} TN`}
            </Badge>
          </Group>
        )}

        <Textarea
          label="Motivo del ajuste"
          placeholder="Ej: Calibración de balanza, merma por humedad, inventario físico semestral..."
          value={motivo}
          onChange={(e) => setMotivo(e.currentTarget.value)}
          minRows={3}
          required
          radius="lg"
          size="xs"
          classNames={estilitos}
        />

        <Group justify="flex-end" gap="xs" mt="sm">
          <Button
            variant="default"
            onClick={onClose}
            disabled={submitting}
            leftSection={<XMarkIcon className="w-4 h-4" />}
            radius="lg"
            size="xs"
          >
            Cancelar
          </Button>
          <Button
            color="indigo"
            onClick={handleSubmit}
            loading={submitting}
            leftSection={<CheckIcon className="w-4 h-4" />}
            radius="lg"
            size="xs"
            className="font-semibold shadow-md shadow-indigo-950/40"
          >
            Guardar Ajuste
          </Button>
        </Group>
      </Stack>
    </ModalEstandar>
  );
};
