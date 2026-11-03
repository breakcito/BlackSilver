import { useCallback, useEffect, useRef, useState } from "react";
import { VentaCarbonService } from "../service/venta-carbon.service";
import { useNotify } from "../../../hooks/useNotify";
import type { VentaCarbonResumen } from "../service/venta-carbon.responses";

const MES_ACTUAL = new Date().getMonth() + 1;
const ANIO_ACTUAL = new Date().getFullYear();

/**
 * Estado del modulo de venta de carbon.
 *
 * La API devuelve el arbol COMPLETO de cada venta (cargas, liquidaciones,
 * comprobantes y pagos) con un numero fijo de consultas: asi el listado
 * muestra todo desde el primer momento y desplegar una venta es instantaneo
 * (no hay una segunda consulta ni un spinner).
 */
export const useVentaCarbon = () => {
  const [ventas, setVentas] = useState<VentaCarbonResumen[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [mes, setMes] = useState<number>(MES_ACTUAL);
  const [anio, setAnio] = useState<number>(ANIO_ACTUAL);

  /**
   * Ventas desplegadas. Se controla de forma explicita porque
   * `trigger: "always"` de mantine-datatable ignora el estado controlado y
   * despliega todas las filas.
   */
  const [desplegadas, setDesplegadas] = useState<number[]>([]);

  /**
   * Id de la venta que se esta recargando porRefresh (tras liquidar, comprobar
   * o pagar). Solo hay uno a la vez: el usuario trabaja sobre una venta.
   */
  const [detalleCargando, setDetalleCargando] = useState<number | null>(null);

  const { notifyError } = useNotify();

  // Evita que una respuesta vieja pise el detalle de una venta recargada.
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
   * Reemplaza una venta en el listado (con su arbol completo).
   *
   * Asi la fila queda al dia sin tener que volver a consultar toda la lista.
   */
  const updateVentaLocal = useCallback((venta: VentaCarbonResumen) => {
    setVentas((prev) =>
      prev.map((v) => (v.id_venta_carbon === venta.id_venta_carbon ? venta : v)),
    );
  }, []);

  /**
   * Inserta la venta recien creada al inicio del listado.
   */
  const insertVenta = useCallback((venta: VentaCarbonResumen) => {
    setVentas((prev) => [venta, ...prev]);
  }, []);

  /**
   * Recarga con spinner. OJO: no se expone `fetch` directo porque su primer
   * parametro es `silent`: al pasarlo como `onClick` el evento del mouse
   * entra como parametro y el loading nunca se activa.
   */
  const recargar = useCallback(() => fetch(false), [fetch]);

  const recargarSilencioso = useCallback(() => fetch(true), [fetch]);

  /**
   * Descarga (o reutiliza) el arbol de una venta.
   *
   * @param forzar Si es `true` vuelve a pedirlo aunque ya este en la lista.
   */
  const cargarDetalle = useCallback(
    async (
      idVentaCarbon: number,
      forzar = false,
    ): Promise<VentaCarbonResumen | null> => {
      if (!forzar) {
        const enLista = ventas.find((v) => v.id_venta_carbon === idVentaCarbon);
        if (enLista) return enLista;
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
        updateVentaLocal(detalle);
        return detalle;
      } catch (e) {
        console.error(e);
        notifyError("Ocurrio un error al cargar el detalle de la venta");
        return null;
      } finally {
        if (request === detalleRequestRef.current) setDetalleCargando(null);
      }
    },
    [ventas, notifyError, updateVentaLocal],
  );

  /**
   * Cambia el juego de ventas desplegadas.
   *
   * No hace falta pedir el detalle: el arbol ya viene en el listado.
   */
  const cambiarDespliegue = useCallback((ids: number[]) => {
    setDesplegadas(ids);
  }, []);

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
  }, [ventas]);

  /**
   * Tras un cambio (liquidar, comprobar, pagar) se recarga SOLO la venta
   * afectada: no se vuelve a consultar toda la lista.
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
    detalleCargando,
    desplegadas,
    setDesplegadas,
    cargarDetalle,
    cambiarDespliegue,
    refrescarDetalle,
  };
};
