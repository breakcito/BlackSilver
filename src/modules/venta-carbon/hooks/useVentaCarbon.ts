import { useCallback, useEffect, useRef, useState } from "react";
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

  /**
   * Detalle (cargas, liquidaciones, comprobantes y pagos) de cada venta
   * desplegada. El listado llega liviano: el arbol se pide bajo demanda y
   * queda cacheado para no volver a descargarlo.
   */
  const [detalles, setDetalles] = useState<Record<number, VentaCarbonResumen>>({});
  const [detalleCargando, setDetalleCargando] = useState<number | null>(null);

  /**
   * Ventas desplegadas. Se controla de forma explicita porque
   * `trigger: "always"` de mantine-datatable ignora el estado controlado y
   * despliega todas las filas.
   */
  const [desplegadas, setDesplegadas] = useState<number[]>([]);

  const { notifyError } = useNotify();

  // Evita que un fetch viejo pise el detalle de una venta recargada.
  const detalleRequestRef = useRef(0);

  /**
   * Firma de la lista actual. Sirve para distinguir "llego una lista nueva"
   * de "la lista es la misma": asi el auto-despliegue de la venta mas
   * reciente solo se aplica cuando la lista cambia de verdad y el usuario
   * puede repliegarla sin que se vuelva a abrir sola.
   */
  const firmaListaRef = useRef<string>("");

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

  /**
   * Vuelca los contadores de una venta en su fila del listado.
   *
   * Asi la fila queda al dia (cargas, liquidaciones, toneladas, total) sin
   * tener que volver a consultar toda la lista.
   */
  const aplicarContadores = useCallback((detalle: VentaCarbonResumen) => {
    setVentas((prev) =>
      prev.map((v) =>
        v.id_venta_carbon === detalle.id_venta_carbon
          ? {
              ...v,
              cantidad_cargas: detalle.cantidad_cargas,
              cantidad_cargas_confirmadas: detalle.cantidad_cargas_confirmadas,
              cantidad_liquidaciones: detalle.cantidad_liquidaciones,
              total_toneladas: detalle.total_toneladas,
              total_toneladas_confirmadas: detalle.total_toneladas_confirmadas,
              total_subtotal: detalle.total_subtotal,
              estado: detalle.estado,
            }
          : v,
      ),
    );
  }, []);

  /**
   * Inserta la venta recien creada al inicio del listado.
   *
   * La venta viene con su arbol completo (la devuelve la API al crearla),
   * asi que tambien se cachea como detalle para no volver a descargarla.
   */
  const insertVenta = (venta: VentaCarbonResumen) => {
    setVentas((prev) => [{ ...venta, cargas: [], liquidaciones: [] }, ...prev]);
    setDetalles((prev) => ({
      ...prev,
      [venta.id_venta_carbon]: venta,
    }));
  };

  /**
   * Reemplaza la venta actualizada (por ejemplo, tras confirmar una llegada).
   *
   * La fila del listado solo recibe los contadores: el arbol se queda en el
   * cache de detalles.
   */
  const updateVentaLocal = (venta: VentaCarbonResumen) => {
    setDetalles((prev) => ({
      ...prev,
      [venta.id_venta_carbon]: venta,
    }));
    aplicarContadores(venta);
  };

  /**
   * Recarga con spinner. OJO: no se expone `fetch` directo porque su primer
   * parametro es `silent`: al pasarlo como `onClick` el evento del mouse
   * entra como parametro y el loading nunca se activa.
   */
  const recargar = useCallback(() => fetch(false), [fetch]);

  const recargarSilencioso = useCallback(() => fetch(true), [fetch]);

  /**
   * Descarga (o reutiliza) el detalle de una venta.
   *
   * @param forzar Si es `true` vuelve a pedirlo aunque ya este cacheado.
   */
  const cargarDetalle = useCallback(
    async (
      idVentaCarbon: number,
      forzar = false,
    ): Promise<VentaCarbonResumen | null> => {
      if (!forzar && detalles[idVentaCarbon]) {
        return detalles[idVentaCarbon];
      }

      const request = ++detalleRequestRef.current;
      setDetalleCargando(idVentaCarbon);

      try {
        const resp = await VentaCarbonService.getVenta(idVentaCarbon);
        if (request !== detalleRequestRef.current) return null;

        if (!resp.success || !resp.data) {
          notifyError(resp.message || "No se pudo cargar el detalle de la venta");
          return null;
        }

        const detalle = resp.data as VentaCarbonResumen;
        setDetalles((prev) => ({ ...prev, [idVentaCarbon]: detalle }));
        aplicarContadores(detalle);
        return detalle;
      } catch (e) {
        console.error(e);
        notifyError("Ocurrio un error al cargar el detalle de la venta");
        return null;
      } finally {
        if (request === detalleRequestRef.current) setDetalleCargando(null);
      }
    },
    [detalles, notifyError, aplicarContadores],
  );

  /**
   * Cambia el juego de ventas desplegadas y descarga el detalle de la que
   * acaba de abrirse.
   */
  const cambiarDespliegue = useCallback(
    async (ids: number[]) => {
      setDesplegadas(ids);

      const id = ids[0];
      if (!id) return;

      await cargarDetalle(id);
    },
    [cargarDetalle],
  );

  /**
   * Por defecto se despliega la venta mas reciente.
   *
   * Solo se aplica cuando llega una lista distinta: si el usuario repliega
   * la fila, esta se queda replegada hasta que cambie el listado.
   */
  useEffect(() => {
    if (ventas.length === 0) return;

    const firma = ventas.map((v) => v.id_venta_carbon).join(",");
    if (firma === firmaListaRef.current) return;
    firmaListaRef.current = firma;

    const id = ventas[0].id_venta_carbon;
    setDesplegadas([id]);
    void cargarDetalle(id);
  }, [ventas, cargarDetalle]);

  /**
   * Tras un cambio (despachar, confirmar llegada, liquidar, pagar) se
   * recarga SOLO el detalle de esa venta.
   *
   * No se vuelve a consultar toda la lista: los contadores de la fila se
   * actualizan en local con los del detalle.
   */
  const refrescarDetalle = useCallback(
    async (idVentaCarbon: number) => {
      await cargarDetalle(idVentaCarbon, true);
    },
    [cargarDetalle],
  );

  return {
    ventas,
    loading,
    busqueda,
    setBusqueda,
    mes,
    anio,
    cambiarPeriodo,
    recargar,
    recargarSilencioso,
    insertVenta,
    updateVentaLocal,
    detalles,
    detalleCargando,
    desplegadas,
    setDesplegadas,
    cargarDetalle,
    cambiarDespliegue,
    refrescarDetalle,
  };
};
