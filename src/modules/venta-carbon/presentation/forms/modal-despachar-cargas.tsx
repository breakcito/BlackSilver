import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { IconTruck } from "@tabler/icons-react";

import { useNotify } from "../../../../hooks/useNotify";
import { useCatalogosDespacho } from "../../hooks/useCatalogosDespacho";
import { EditorCargasVenta } from "./editor-cargas-venta";
import {
  esCargaVentaCompleta,
  type CargaVentaFormState,
} from "./carga-venta-form-state";
import { VentaCarbonService } from "../../service/venta-carbon.service";
import type { VentaCarbonResumen } from "../../service/venta-carbon.responses";

interface Props {
  venta: VentaCarbonResumen;
  onClose: () => void;
  onDispatched: (venta: VentaCarbonResumen) => void;
}

/**
 * Despacha cargas adicionales sobre una venta ya registrada.
 *
 * El stock no se descuenta al despachar: el asiento del Kardex se escribe al
 * confirmar la llegada. Aqui solo se reserva (el backend valida que haya
 * stock despachable una vez descontadas las cargas ya en camino).
 */
export const ModalDespacharCargas = ({
  venta,
  onClose,
  onDispatched,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();
  const { tipos, calidades } = useCatalogosDespacho();

  const [cargas, setCargas] = useState<CargaVentaFormState[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await VentaCarbonService.getStockDisponible(
          venta.id_almacen_empresa_salida,
        );
        if (cancel) return;
        if (res.success && res.data) {
          const mapa: Record<string, number> = {};
          res.data.forEach((s) => {
            mapa[`${s.id_tipo_carbon}|${s.calidad}`] = Number(s.disponible) || 0;
          });
          setStock(mapa);
        }
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [venta.id_almacen_empresa_salida]);

  const stockPorClave = useMemo(() => {
    const mapa = new Map<string, number>();
    Object.entries(stock).forEach(([clave, valor]) => {
      mapa.set(clave, valor);
    });
    return mapa;
  }, [stock]);

  const handleSubmit = async () => {
    setError(null);

    // El editor solo deja agregar cargas completas: lo que llega aqui ya
    // esta listo para despachar.
    if (cargas.length === 0) {
      setError("Debe registrar al menos una carga para despachar");
      return;
    }

    const conCarga = cargas.filter(esCargaVentaCompleta);
    if (conCarga.length !== cargas.length) {
      setError("Hay cargas sin completar. Reviselas antes de guardar.");
      return;
    }

    setSaving(true);
    try {
      const res = await VentaCarbonService.registrarCargas(
        venta.id_venta_carbon,
        conCarga.map((c) => ({
          id_tipo_carbon: Number(c.id_tipo_carbon),
          calidad: c.calidad,
          cantidad_toneladas: c.cantidad_toneladas,
          fecha_hora_salida: c.fecha_hora_salida,
          archivos: c.archivos,
        })),
      );

      if (res.success && res.data) {
        notifySuccess("Cargas despachadas correctamente");
        onDispatched(res.data.venta);
      } else {
        const msg = res.message || "Error al despachar las cargas";
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
        <Group gap="xs" mb={4}>
          <IconTruck size={16} className="text-indigo-400" />
          <Text size="xs" fw={700} c="dimmed" tt="uppercase">
            Venta {venta.correlativo}
          </Text>
        </Group>
        <Text size="xs" c="gray">
          Almacen de salida: {venta.almacen_empresa_salida ?? "—"} · Destino:{" "}
          {venta.cliente_destino ?? "—"}
        </Text>
      </Paper>

      <EditorCargasVenta
        cargas={cargas}
        onChange={setCargas}
        tipos={tipos}
        calidades={calidades}
        stockPorClave={stockPorClave}
        saving={saving}
      />

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
          leftSection={<IconTruck size={16} />}
        >
          Despachar cargas
        </Button>
      </Group>
    </Stack>
  );
};
