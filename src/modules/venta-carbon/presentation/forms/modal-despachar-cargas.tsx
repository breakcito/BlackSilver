import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { IconTruck } from "@tabler/icons-react";

import { useNotify } from "../../../../hooks/useNotify";
import { AuxService } from "../../../../service/auxiliar.service";
import { useCatalogosDespacho } from "../../hooks/useCatalogosDespacho";
import { ListaCargasVenta } from "./lista-cargas-venta";
import {
  esCargaVentaCompleta,
  esCargaVentaVacia,
  nuevaCargaVenta,
  type CargaVentaFormState,
} from "./carga-venta-form-state";
import { VentaCarbonService } from "../../service/venta-carbon.service";
import { exigeSegundaPlaca } from "../../../../shared/enums/venta-carbon/tipo-vehiculo-carbon";
import type { VentaCarbonResumen } from "../../service/venta-carbon.responses";
import type { RES_StockCarbon } from "../../../../service/responses/stock-carbon";

interface Props {
  venta: VentaCarbonResumen;
  onClose: () => void;
  onDispatched: (venta: VentaCarbonResumen) => void;
}

/**
 * Despacha cargas adicionales sobre una venta ya registrada. Cada carga
 * descuenta stock del almacen de salida de la venta.
 */
export const ModalDespacharCargas = ({
  venta,
  onClose,
  onDispatched,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();
  const { tipos, calidades, vehiculos, marcas, reloadVehiculos, reloadMarcas } =
    useCatalogosDespacho();

  const [cargas, setCargas] = useState<CargaVentaFormState[]>([
    nuevaCargaVenta(),
  ]);
  const [stock, setStock] = useState<RES_StockCarbon[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await AuxService.get_stock_carbon({
          id_almacen: venta.id_almacen_empresa_salida,
        });
        if (cancel) return;
        if (res.success && res.data) setStock(res.data);
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
    stock.forEach((s) => {
      if (!s.id_tipo_carbon || !s.calidad) return;
      mapa.set(
        `${s.id_tipo_carbon}|${s.calidad}`,
        Number(s.stock_actual) || 0,
      );
    });
    return mapa;
  }, [stock]);

  const handleSubmit = async () => {
    setError(null);

    const incompletas = cargas.filter(
      (c) => !esCargaVentaVacia(c) && !esCargaVentaCompleta(c),
    );

    if (incompletas.length > 0) {
      setError(
        `Hay ${incompletas.length} carga(s) sin completar. Complete o elimine cada carga antes de guardar.`,
      );
      return;
    }

    // Solo se despachan las cargas completas: las filas en blanco se ignoran.
    const conCarga = cargas.filter(esCargaVentaCompleta);

    if (conCarga.length === 0) {
      setError("Debe registrar al menos una carga para despachar");
      return;
    }

    for (let i = 0; i < conCarga.length; i++) {
      const c = conCarga[i];
      if (exigeSegundaPlaca(c.tipo_vehiculo) && !c.segunda_placa.trim()) {
        setError(
          `Carga #${i + 1}: el vehiculo ${c.tipo_vehiculo} requiere la segunda placa`,
        );
        return;
      }
    }

    setSaving(true);
    try {
      const res = await VentaCarbonService.registrarCargas(
        venta.id_venta_carbon,
        conCarga.map((c) => ({
          id_tipo_carbon: Number(c.id_tipo_carbon),
          id_vehiculo_carbon: Number(c.id_vehiculo_carbon),
          tipo_vehiculo: c.tipo_vehiculo,
          calidad: c.calidad,
          cantidad_toneladas: c.cantidad_toneladas,
          segunda_placa: c.segunda_placa.trim() || null,
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

      <ListaCargasVenta
        cargas={cargas}
        onChange={setCargas}
        tipos={tipos}
        calidades={calidades}
        vehiculos={vehiculos}
        marcas={marcas}
        stockPorClave={stockPorClave}
        onVehiculoRegistrado={() => reloadVehiculos()}
        onMarcaRegistrada={(marca) => reloadMarcas(marca)}
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
