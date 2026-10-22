import { useCallback, useEffect, useState } from "react";
import { VentaCarbonService } from "../service/venta-carbon.service";
import { useNotify } from "../../../hooks/useNotify";
import type { VentaCarbonResumen } from "../service/venta-carbon.responses";

const MES_ACTUAL = new Date().getMonth() + 1;
const ANIO_ACTUAL = new Date().getFullYear();

export const useVentaCarbon = () => {
  const [ventas, setVentas] = useState<VentaCarbonResumen[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [mes, setMes] = useState<number>(MES_ACTUAL);
  const [anio, setAnio] = useState<number>(ANIO_ACTUAL);
  const { notifyError } = useNotify();

  const fetch = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const resp = await VentaCarbonService.getVentas({
          filtros: busqueda.trim() || undefined,
          mes,
          anio,
        });
        if (resp.success) setVentas(resp.data ?? []);
        else notifyError(resp.message || "No se pudieron cargar las ventas de carbon");
      } catch (e) {
        console.error(e);
        notifyError("Ocurrio un error al cargar las ventas de carbon");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [busqueda, mes, anio, notifyError],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      fetch();
    }, 250);
    return () => clearTimeout(t);
  }, [fetch]);

  const cambiarPeriodo = (nuevoMes: number, nuevoAnio: number) => {
    setMes(nuevoMes);
    setAnio(nuevoAnio);
  };

  /** Inserta la venta recien creada al inicio del listado. */
  const insertVenta = (venta: VentaCarbonResumen) => {
    setVentas((prev) => [venta, ...prev]);
  };

  /** Reemplaza la venta actualizada (por ejemplo, tras confirmar una llegada). */
  const updateVentaLocal = (venta: VentaCarbonResumen) => {
    setVentas((prev) =>
      prev.map((v) =>
        v.id_venta_carbon === venta.id_venta_carbon ? venta : v,
      ),
    );
  };

  const recargarSilencioso = useCallback(() => fetch(true), [fetch]);

  return {
    ventas,
    loading,
    busqueda,
    setBusqueda,
    mes,
    anio,
    cambiarPeriodo,
    recargar: fetch,
    recargarSilencioso,
    insertVenta,
    updateVentaLocal,
  };
};
