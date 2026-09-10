import { useState, useCallback, useEffect } from "react";
import { useNotify } from "../../../hooks/useNotify";
import { CategoriasService } from "../service/categorias.service";
import {
  Schema_ActualizarCategoria,
  Schema_RegistroCategoria,
} from "../service/categorias.requests";
import type { RES_CategoriaResumen } from "../service/categorias.responses";
import { TipoProducto } from "../../../shared/enums/_generic/tipo-producto";
import { TipoBien } from "../../../shared/enums/_generic/tipo-bien";
import {
  getCoincidencias,
  type SearchResult,
} from "../../../shared/functions/get-coincidencias";

interface UseRegistroCategoriaProps {
  categoriasExistentes: RES_CategoriaResumen[];
  onSuccess?: (nueva: RES_CategoriaResumen) => void;
  onClose: () => void;
  /** Si viene, el hook opera en modo edición (PUT en vez de POST). */
  categoriaEdicion?: RES_CategoriaResumen | null;
}

export const useRegistroCategoria = ({
  categoriasExistentes,
  onSuccess,
  onClose,
  categoriaEdicion,
}: UseRegistroCategoriaProps) => {
  const { notify } = useNotify();

  const isEdit = !!categoriaEdicion;

  // Estado del formulario
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipoProducto, setTipoProducto] = useState<string | null>(
    TipoProducto.Bien,
  );
  const [clasificacionBien, setClasificacionBien] = useState<string | null>(
    null,
  );
  const [esConsumible, setEsConsumible] = useState(false);
  const [paraCocina, setParaCocina] = useState(false);
  const [paraMina, setParaMina] = useState(true);
  const [esAuditable, setEsAuditable] = useState(false);
  const [paraTransporte, setParaTransporte] = useState(false);
  const [controlPorOdometro, setControlPorOdometro] = useState(false);
  const [controlPorHorometro, setControlPorHorometro] = useState(false);
  const [controlPorVueltas, setControlPorVueltas] = useState(false);
  const [idsConsumidoras, setIdsConsumidoras] = useState<number[]>([]);
  const [coincidencias, setCoincidencias] = useState<
    SearchResult<RES_CategoriaResumen>[]
  >([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setNombre("");
    setDescripcion("");
    setTipoProducto(TipoProducto.Bien);
    setClasificacionBien(TipoBien.Suministro);
    setEsConsumible(false);
    setParaCocina(false);
    setParaMina(true);
    setEsAuditable(false);
    setParaTransporte(false);
    setControlPorOdometro(false);
    setControlPorHorometro(false);
    setControlPorVueltas(false);
    setIdsConsumidoras([]);
    setCoincidencias([]);
    setError("");
  }, []);

  const handleNombreChange = (val: string) => {
    setNombre(val);
    if (val.length >= 3) {
      // En edición no se compara contra sí misma.
      const base = categoriaEdicion
        ? categoriasExistentes.filter(
            (c) => c.id_categoria !== categoriaEdicion.id_categoria,
          )
        : categoriasExistentes;
      const results = getCoincidencias(base, val, {
        keys: ["nombre"],
        fuseThreshold: 0.3,
      });
      setCoincidencias(results);
    } else {
      setCoincidencias([]);
    }
  };

  const handleClasificacionChange = (val: string | null) => {
    setClasificacionBien(val);
    if (val === TipoBien.Suministro) {
      setEsConsumible(true);
    } else {
      setEsConsumible(false);
    }
  };

  const handleParaTransporteChange = (val: boolean) => {
    setParaTransporte(val);
    if (val) {
      setControlPorOdometro(true);
    }
  };

  /**
   * Hidrata el formulario con la categoría a editar. Se usa `setEsConsumible`
   * directo (no el handler de clasificación) para no pisar el valor real
   * guardado con la regla de UX "Suministro => consumible".
   */
  useEffect(() => {
    if (!categoriaEdicion) return;

    setNombre(categoriaEdicion.nombre ?? "");
    setDescripcion(categoriaEdicion.descripcion ?? "");
    setTipoProducto(categoriaEdicion.tipo_producto ?? TipoProducto.Bien);
    setClasificacionBien(categoriaEdicion.clasificacion_bien ?? null);
    setEsConsumible(!!categoriaEdicion.es_consumible);
    setParaCocina(!!categoriaEdicion.para_cocina);
    setParaMina(!!categoriaEdicion.para_mina);
    setEsAuditable(!!categoriaEdicion.es_auditable);
    setParaTransporte(!!categoriaEdicion.para_transporte);
    setControlPorOdometro(!!categoriaEdicion.control_por_odometro);
    setControlPorHorometro(!!categoriaEdicion.control_por_horometro);
    setControlPorVueltas(!!categoriaEdicion.control_por_vueltas);
    setCoincidencias([]);
    setError("");
  }, [categoriaEdicion]);

  const handleGuardar = async () => {
    setError("");
    const data = {
      nombre,
      descripcion,
      tipo_producto: TipoProducto.Bien, // Siempre Bien
      clasificacion_bien: clasificacionBien || "",
      es_consumible: esConsumible,
      para_cocina: paraCocina,
      para_mina: paraMina,
      es_auditable: esAuditable,
      para_transporte: paraTransporte,
      control_por_odometro: controlPorOdometro,
      control_por_horometro: controlPorHorometro,
      control_por_vueltas: controlPorVueltas,
      ids_categorias_consumidoras: idsConsumidoras,
    };

    // ── Modo edición ──────────────────────────────────────────────
    if (isEdit && categoriaEdicion) {
      const validation = Schema_ActualizarCategoria.safeParse(data);
      if (!validation.success) {
        setError(validation.error.issues[0].message);
        return;
      }

      setLoading(true);
      try {
        const result = await CategoriasService.actualizar_categoria(
          categoriaEdicion.id_categoria,
          validation.data,
        );
        if (result.success) {
          notify({ type: "success", content: result.message });
          onSuccess?.(result.data);
          onClose();
          reset();
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError("Error inesperado al actualizar la categoría");
        console.error(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Modo registro ─────────────────────────────────────────────
    const validation = Schema_RegistroCategoria.safeParse(data);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const result = await CategoriasService.crear_categoria(validation.data);
      if (result.success) {
        notify({ type: "success", content: "Categoría creada correctamente" });
        onSuccess?.(result.data);
        onClose();
        reset();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Error inesperado al crear la categoría");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    nombre,
    setNombre: handleNombreChange,
    descripcion,
    setDescripcion,
    tipoProducto,
    setTipoProducto,
    clasificacionBien,
    setClasificacionBien: handleClasificacionChange,
    esConsumible,
    setEsConsumible,
    paraCocina,
    setParaCocina,
    paraMina,
    setParaMina,
    esAuditable,
    setEsAuditable,
    paraTransporte,
    setParaTransporte: handleParaTransporteChange,
    controlPorOdometro,
    setControlPorOdometro,
    controlPorHorometro,
    setControlPorHorometro,
    controlPorVueltas,
    setControlPorVueltas,
    idsConsumidoras,
    setIdsConsumidoras,
    coincidencias,
    error,
    loading,
    handleGuardar,
    reset,
    isEdit,
  };
};
