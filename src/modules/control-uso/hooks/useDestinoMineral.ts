import { useCallback, useEffect, useMemo, useState } from "react";
import { AuxService } from "../../../service/auxiliar.service";
import type { RES_Labor } from "../../../service/responses/labor";
import type { RES_LoteMineral } from "../../../service/responses/lote-mineral";
import { getCoincidencias } from "../../../shared/functions/get-coincidencias";

/** Opcion lista para un `Select` de Mantine. */
export interface OpcionDestino {
  value: string;
  label: string;
}

/**
 * Aplica la busqueda tolerante sobre las opciones de un `Select`.
 * Con la query vacia devuelve la lista completa sin invocar el motor de
 * busqueda (que es lo mas caro).
 */
const aplicarBusqueda = (
  base: OpcionDestino[],
  busqueda: string,
): OpcionDestino[] => {
  const q = busqueda.trim();
  if (!q) return base;
  return getCoincidencias(base, q, {
    keys: ["label"],
    fuseThreshold: 0.4,
  }).map((r) => r.item);
};

/**
 * Cascada Mina > Labor > Lote de mineral para los controles de uso.
 *
 * Los tres catalogos se piden UNA sola vez (en paralelo) y a partir de ahi
 * todo el filtrado ocurre en el cliente:
 *
 *   - Minas    -> filtra las labores y los lotes de esa mina.
 *   - Labor    -> auto-elige la mina de esa labor y filtra sus lotes.
 *   - Lote     -> auto-elige la labor y la mina de ese lote.
 *
 * Los endpoints auxiliares ya devuelven los ids de sus padres
 * (`RES_Labor.id_mina`, `RES_LoteMineral.id_mina` / `id_labor`), por lo que
 * no hace falta volver a pegarle a la API en cada seleccion.
 *
 * `activo` permite posponer la carga (p. ej. mientras el modal esta cerrado).
 */
export const useDestinoMineral = (activo: boolean = true) => {
  // ===== Catalogos (se cargan una sola vez) =====
  const [minas, setMinas] = useState<OpcionDestino[]>([]);
  const [labores, setLabores] = useState<RES_Labor[]>([]);
  const [lotesMineral, setLotesMineral] = useState<RES_LoteMineral[]>([]);

  const [loadingMinas, setLoadingMinas] = useState(false);
  const [loadingLabores, setLoadingLabores] = useState(false);
  const [loadingLotesMineral, setLoadingLotesMineral] = useState(false);

  // ===== Seleccion actual =====
  const [idMina, setIdMina] = useState<string | null>(null);
  const [idLabor, setIdLabor] = useState<string | null>(null);
  const [idLoteMineral, setIdLoteMineral] = useState<string | null>(null);

  // ===== Busqueda tolerante (getCoincidencias) =====
  const [busquedaMina, setBusquedaMina] = useState("");
  const [busquedaLabor, setBusquedaLabor] = useState("");
  const [busquedaLote, setBusquedaLote] = useState("");

  // Carga unica de los tres catalogos.
  useEffect(() => {
    if (!activo) return;

    let cancelado = false;

    const cargarCatalogos = async () => {
      setLoadingMinas(true);
      setLoadingLabores(true);
      setLoadingLotesMineral(true);
      try {
        const [respMinas, respLabores, respLotes] = await Promise.all([
          AuxService.get_minas(),
          AuxService.get_labores(),
          AuxService.get_lotes_mineral(),
        ]);
        if (cancelado) return;
        if (respMinas.success) {
          setMinas(
            respMinas.data.map((m) => ({
              value: String(m.id_mina),
              label: m.nombre,
            })),
          );
        }
        if (respLabores.success) setLabores(respLabores.data);
        if (respLotes.success) setLotesMineral(respLotes.data);
      } catch (e) {
        if (!cancelado) console.error(e);
      } finally {
        if (!cancelado) {
          setLoadingMinas(false);
          setLoadingLabores(false);
          setLoadingLotesMineral(false);
        }
      }
    };

    cargarCatalogos();

    return () => {
      cancelado = true;
    };
  }, [activo]);

  // ===== Cascada: handlers de seleccion =====
  const seleccionarMina = useCallback(
    (valor: string | null) => {
      setIdMina(valor);
      setBusquedaMina("");
      if (!valor) {
        setIdLabor(null);
        setIdLoteMineral(null);
        setBusquedaLabor("");
        setBusquedaLote("");
        return;
      }
      const idMinaNum = Number(valor);
      // La labor actual debe pertenecer a la nueva mina; si no, se limpia
      // (y con ella el lote, que dependia de esa labor).
      if (
        idLabor !== null &&
        !labores.some(
          (l) => String(l.id_labor) === idLabor && l.id_mina === idMinaNum,
        )
      ) {
        setIdLabor(null);
        setIdLoteMineral(null);
        setBusquedaLabor("");
        setBusquedaLote("");
        return;
      }
      // Sin labor, el lote actual debe pertenecer a la nueva mina.
      if (
        idLabor === null &&
        idLoteMineral !== null &&
        !lotesMineral.some(
          (lm) =>
            String(lm.id_lote_mineral) === idLoteMineral &&
            lm.id_mina === idMinaNum,
        )
      ) {
        setIdLoteMineral(null);
        setBusquedaLote("");
      }
    },
    [idLabor, idLoteMineral, labores, lotesMineral],
  );

  /**
   * Selecciona una labor.
   * @param valor id de la labor o null (deseleccionar).
   * @param minaDerivada true cuando la mina NO es un input propio del
   *   formulario sino que se deduce de la labor (card "Destino del
   *   Trabajo"). En ese caso, al deseleccionar la labor tambien se limpia
   *   la mina deducida.
   */
  const seleccionarLabor = useCallback(
    (valor: string | null, minaDerivada = false) => {
      setIdLabor(valor);
      setBusquedaLabor("");
      if (!valor) {
        setIdLoteMineral(null);
        setBusquedaLote("");
        if (minaDerivada) {
          setIdMina(null);
          setBusquedaMina("");
        }
        return;
      }
      // Auto-seleccion ascendente: la labor arrastra su mina.
      const labor = labores.find((l) => String(l.id_labor) === valor);
      if (labor) setIdMina(String(labor.id_mina));
      // El lote actual debe pertenecer a la labor elegida.
      if (
        idLoteMineral !== null &&
        !lotesMineral.some(
          (lm) =>
            String(lm.id_lote_mineral) === idLoteMineral &&
            lm.id_labor === Number(valor),
        )
      ) {
        setIdLoteMineral(null);
        setBusquedaLote("");
      }
    },
    [idLoteMineral, labores, lotesMineral],
  );

  /** Labor del card "Destino del Trabajo": la mina se deduce de la labor. */
  const seleccionarLaborComoDestino = useCallback(
    (valor: string | null) => seleccionarLabor(valor, true),
    [seleccionarLabor],
  );

  const seleccionarLote = useCallback(
    (valor: string | null) => {
      setIdLoteMineral(valor);
      setBusquedaLote("");
      if (!valor) return;
      // Auto-seleccion ascendente: el lote arrastra su labor y su mina.
      const lote = lotesMineral.find(
        (lm) => String(lm.id_lote_mineral) === valor,
      );
      if (!lote) return;
      setIdLabor(String(lote.id_labor));
      setIdMina(String(lote.id_mina));
      setBusquedaLabor("");
    },
    [lotesMineral],
  );

  // ===== Listas filtradas (en cliente) =====
  const laboresVisibles = useMemo(() => {
    if (!idMina) return labores;
    return labores.filter((l) => l.id_mina === Number(idMina));
  }, [labores, idMina]);

  const lotesVisibles = useMemo(() => {
    if (idLabor) {
      return lotesMineral.filter((lm) => lm.id_labor === Number(idLabor));
    }
    if (idMina) {
      return lotesMineral.filter((lm) => lm.id_mina === Number(idMina));
    }
    return lotesMineral;
  }, [lotesMineral, idLabor, idMina]);

  // ===== Opciones para los Select (con busqueda tolerante) =====
  const opcionesMina = useMemo(() => {
    const q = busquedaMina.trim();
    if (!q) return minas;
    return getCoincidencias(minas, q, {
      keys: ["label"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [minas, busquedaMina]);

  /**
   * Labores de TODAS las minas, con la mina en la etiqueta.
   * Es la lista que usa el card "Destino del Trabajo": alla la mina no es un
   * input propio (se deduce de la labor), asi que no debe filtrar la lista.
   */
  const opcionesLabor = useMemo(() => {
    const base: OpcionDestino[] = labores.map((l) => ({
      value: String(l.id_labor),
      label: `${l.nombre || `Labor #${l.id_labor}`} · ${l.mina}`,
    }));
    return aplicarBusqueda(base, busquedaLabor);
  }, [labores, busquedaLabor]);

  /**
   * Labores de la mina seleccionada (la mina SI es un input propio, como en
   * el card de vueltas). Sin mina se listan todas, con su mina en la etiqueta.
   */
  const opcionesLaborPorMina = useMemo(() => {
    const base: OpcionDestino[] = laboresVisibles.map((l) => ({
      value: String(l.id_labor),
      label: idMina
        ? l.nombre || `Labor #${l.id_labor}`
        : `${l.nombre || `Labor #${l.id_labor}`} · ${l.mina}`,
    }));
    return aplicarBusqueda(base, busquedaLabor);
  }, [laboresVisibles, idMina, busquedaLabor]);

  const opcionesLote = useMemo(() => {
    const base: OpcionDestino[] = lotesVisibles.map((lm) => ({
      value: String(lm.id_lote_mineral),
      // Sin labor seleccionada se listan los lotes de toda la mina (o de
      // todas): se agrega el nombre de la labor como contexto.
      label:
        idLabor || !lm.labor
          ? `${lm.contratista ? `${lm.contratista.split(" ")[0]} - ` : ""}${lm.codigo}`
          : `${lm.contratista ? `${lm.contratista.split(" ")[0]} - ` : ""}${lm.codigo} · ${lm.labor}`,
    }));
    return aplicarBusqueda(base, busquedaLote);
  }, [lotesVisibles, idLabor, busquedaLote]);

  return {
    // Catalogos crudos (para busquedas por id al enriquecer el log).
    minas,
    labores,
    lotesMineral,
    // Opciones ya filtradas por la cascada.
    opcionesMina,
    opcionesLabor,
    opcionesLaborPorMina,
    opcionesLote,
    // Seleccion actual.
    idMina,
    idLabor,
    idLoteMineral,
    // Handlers de la cascada (auto-seleccion ascendente + limpieza).
    seleccionarMina,
    seleccionarLabor,
    seleccionarLaborComoDestino,
    seleccionarLote,
    // Setters crudos: para inicializar desde un registro existente sin
    // disparar la cascada.
    setIdMina,
    setIdLabor,
    setIdLoteMineral,
    // Loaders.
    loadingMinas,
    loadingLabores,
    loadingLotesMineral,
    // Busqueda tolerante.
    busquedaMina,
    setBusquedaMina,
    busquedaLabor,
    setBusquedaLabor,
    busquedaLote,
    setBusquedaLote,
  };
};

export default useDestinoMineral;
