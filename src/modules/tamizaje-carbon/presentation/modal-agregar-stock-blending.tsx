import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  NumberInput,
  Paper,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import { useNotify } from "../../../hooks/useNotify";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { colorCalidadCarbon } from "../../../shared/functions/calidad-carbon";
import { TamizajeCarbonService } from "../service/tamizaje-carbon.service";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import type { BlendingCarbonItem } from "../service/tamizaje-carbon.responses";

interface Props {
  opened: boolean;
  onClose: () => void;
  /** Blending al que se le agregara stock. */
  blending: BlendingCarbonItem | null;
  onGuardado: (blending: BlendingCarbonItem) => void;
}

interface FilaAgregar {
  id_stock_carbon: number;
  calidad: string;
  cantidad_actual: number;
  cantidad_agregar: number;
}

const estilitos = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white placeholder:text-zinc-500",
  label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
  dropdown: "bg-zinc-900 border-zinc-800",
  option: "text-zinc-300 hover:bg-zinc-800",
};

/**
 * Agrega mas carbon a un blending ya registrado.
 *
 * Los detalles se ACUMULAN: no se reemplazan, asi que agregar stock nunca
 * deja fuera una calidad que ya estaba. El stock de la fila se descuenta
 * con el mismo piso en cero del alta.
 */
export const ModalAgregarStockBlending = ({
  opened,
  onClose,
  blending,
  onGuardado,
}: Props) => {
  const { notifySuccess, notifyError } = useNotify();

  const [filas, setFilas] = useState<FilaAgregar[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened || !blending) return;
    setError(null);
    setFilas(
      (blending.detalles ?? []).map((d) => ({
        id_stock_carbon: d.id_stock_carbon,
        calidad: d.calidad ?? "—",
        cantidad_actual: Number(d.cantidad_tomada) || 0,
        cantidad_agregar: 0,
      })),
    );
  }, [opened, blending]);

  const totalAgregar = useMemo(
    () => filas.reduce((acc, f) => acc + (Number(f.cantidad_agregar) || 0), 0),
    [filas],
  );

  const handleSubmit = async () => {
    if (!blending) return;
    setError(null);

    const detalles = filas
      .filter((f) => (Number(f.cantidad_agregar) || 0) > 0)
      .map((f) => ({
        id_stock_carbon: f.id_stock_carbon,
        cantidad_tomada: Number(f.cantidad_agregar) || 0,
      }));

    if (detalles.length === 0) {
      setError("Indique la cantidad a agregar en al menos una calidad");
      return;
    }

    setSaving(true);
    try {
      const resp = await TamizajeCarbonService.agregarStockBlending(
        blending.id_blending_carbon,
        detalles,
      );

      if (resp.success && resp.data) {
        notifySuccess("Stock agregado al blending");
        onGuardado(resp.data);
      } else {
        const msg = resp.message || "Error al agregar stock al blending";
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
    <ModalEstandar
      opened={opened}
      close={onClose}
      title="Agregar stock al blending"
      size="48rem"
      validateClose={saving}
      rightSection={
        blending && (
          <Group gap={6}>
            <Badge
              variant="light"
              color="cyan"
              radius="xl"
              size="sm"
              className="font-mono"
            >
              {blending.correlativo}
            </Badge>
            <Badge variant="light" color="teal" radius="xl" size="sm">
              {formatNumber(Number(blending.stock_actual) || 0)} TN disponibles
            </Badge>
          </Group>
        )
      }
    >
      <Stack gap="md">
        {error && (
          <Alert color="red" variant="light" title="Atención" radius="md">
            {error}
          </Alert>
        )}

      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/60 border border-zinc-800"
      >
        <Group justify="space-between" mb="xs">
          <Text size="xs" fw={700} c="gray" tt="uppercase">
            Cantidad a agregar
          </Text>
          <Badge variant="light" color="indigo" radius="xl" size="sm">
            {formatNumber(totalAgregar)} TN a agregar
          </Badge>
        </Group>

        {filas.length === 0 ? (
          <Group gap="xs" py="md" justify="center">
            <Text size="xs" c="dimmed">
              Este blending no tiene calidades registradas
            </Text>
          </Group>
        ) : (
          <Table
            highlightOnHover
            withTableBorder={false}
            verticalSpacing="xs"
            horizontalSpacing="sm"
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th
                  ta={"center"}
                  w={120}
                  className="text-zinc-400 text-xs font-semibold"
                >
                  Calidad
                </Table.Th>
                <Table.Th
                  ta={"center"}
                  w={130}
                  className="text-zinc-400 text-xs font-semibold"
                >
                  Ya tomado
                </Table.Th>
                <Table.Th
                  ta={"center"}
                  className="text-zinc-400 text-xs font-semibold"
                >
                  Agregar (TN)
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filas.map((fila) => (
                <Table.Tr key={fila.id_stock_carbon}>
                  <Table.Td ta={"center"}>
                    <Badge
                      size="sm"
                      variant="light"
                      color={colorCalidadCarbon(fila.calidad)}
                      radius="sm"
                    >
                      {fila.calidad}
                    </Badge>
                  </Table.Td>
                  <Table.Td ta={"center"}>
                    <Text size="xs" fw={700} c="zinc.200" className="font-mono">
                      {formatNumber(fila.cantidad_actual)} TN
                    </Text>
                  </Table.Td>
                  <Table.Td ta={"center"}>
                    <NumberInput
                      value={fila.cantidad_agregar}
                      onChange={(val) =>
                        setFilas((prev) =>
                          prev.map((f) =>
                            f.id_stock_carbon === fila.id_stock_carbon
                              ? {
                                  ...f,
                                  cantidad_agregar: Number(val) || 0,
                                }
                              : f,
                          ),
                        )
                      }
                      min={0}
                      decimalScale={4}
                      hideControls
                      classNames={estilitos}
                      size="xs"
                      radius="lg"
                      disabled={saving}
                    />
                    <Tooltip
                      label="Se puede pedir mas de lo que hay en stock: esa calidad quedara en cero"
                      withArrow
                    >
                      <Text size="10px" c="dimmed" mt={2}>
                        No hay límite de stock
                      </Text>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        <Alert
          color="indigo"
          variant="light"
          radius="md"
          mt="sm"
          icon={<IconInfoCircle size={16} />}
        >
          El stock de la calidad se descuenta del almacén. Si se pide más de
          lo que hay, esa calidad queda en cero.
        </Alert>
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
        >
          Agregar stock
        </Button>
      </Group>
      </Stack>
    </ModalEstandar>
  );
};
