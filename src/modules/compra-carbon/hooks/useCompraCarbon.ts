import { useCallback, useEffect, useState } from "react";
import { CompraCarbonService } from "../service/compra-carbon.service";
import { useNotify } from "../../../hooks/useNotify";
import type { CompraCarbonResumen } from "../service/compra-carbon.responses";

const MES_ACTUAL = new Date().getMonth() + 1;
const ANIO_ACTUAL = new Date().getFullYear();

export const useCompraCarbon = () => {
  const [compras, setCompras] = useState<CompraCarbonResumen[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [mes, setMes] = useState<number>(MES_ACTUAL);
  const [anio, setAnio] = useState<number>(ANIO_ACTUAL);
  const { notifyError } = useNotify();

  const fetch = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const resp = await CompraCarbonService.getCompras({
          filtros: busqueda.trim() || undefined,
          mes,
          anio,
        });
        if (resp.success) setCompras(resp.data);
        else notifyError(resp.message || "No se pudieron cargar las compras");
      } catch (e) {
        console.error(e);
        notifyError("Ocurrio un error al cargar las compras de carbon");
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

  const insertCompra = (c: CompraCarbonResumen) => {
    setCompras((prev) => [c, ...prev]);
  };

  const updateCompraLocal = (actualizada: CompraCarbonResumen) => {
    setCompras((prev) =>
      prev.map((c) =>
        c.id_compra_carbon === actualizada.id_compra_carbon ? actualizada : c,
      ),
    );
  };

  const recargarSilencioso = useCallback(() => fetch(true), [fetch]);

  return {
    compras,
    loading,
    busqueda,
    setBusqueda,
    mes,
    anio,
    cambiarPeriodo,
    recargar: fetch,
    recargarSilencioso,
    insertCompra,
    updateCompraLocal,
  };
};