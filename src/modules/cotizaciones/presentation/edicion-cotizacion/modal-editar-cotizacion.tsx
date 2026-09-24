import { Group, Button } from "@mantine/core";
import { useEditarCotizacion } from "../../hooks/edicion-cotizacion/useEditarCotizacion";
import { EdicionCotizacionTabla } from "./components/edicion-cotizacion-tabla";
import type {
  RES_Cotizacion,
  RES_Comparativo,
} from "../../../../service/responses/cotizaciones/cotizacion";

interface ModalEditarCotizacionProps {
  cotizacion: RES_Cotizacion;
  onSuccess: (data: RES_Comparativo[]) => void;
  onCancel: () => void;
}

export const ModalEditarCotizacion = ({
  cotizacion,
  onSuccess,
  onCancel,
}: ModalEditarCotizacionProps) => {
  const {
    productos,
    cotizaciones,
    loading,
    loadingMaestros,
    updateCotizacionHeader,
    updateCotizacionDetail,
    toggleCotizacionNoCotiza,
    handleSave,
    maestros,
    agregarProveedorLocal,
    updateGlobalLogistica,
  } = useEditarCotizacion(cotizacion, onSuccess);

  const productosParaMostrar = productos.map((p) => {
    const originalDet = cotizacion.detalles.find(
      (d) => d.id_producto === p.id_producto,
    );
    const maestro = maestros.catalogo.find(
      (m) => m.id_producto === p.id_producto,
    );

    return {
      ...p,
      nombre:
        maestro?.nombre || originalDet?.producto || "Producto desconocido",
      id_unidad_medida_base:
        maestro?.id_unidad_medida_base ||
        originalDet?.id_unidad_medida_base ||
        0,
      unidad_medida_base:
        maestro?.unidad_medida_base ||
        originalDet?.unidad_medida_base ||
        "unidades",
      unidad_medida_abreviatura:
        maestro?.unidad_medida_base_abv ||
        originalDet?.unidad_medida_base_abv ||
        "UND",
      tipo_bien: maestro?.tipo_bien || originalDet?.tipo_bien,
    };
  });

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden">
      <div className="flex-1 min-h-0 pr-1">
        <EdicionCotizacionTabla
          productos={productosParaMostrar}
          cotizacion={cotizaciones[0]}
          correlativo={cotizacion.correlativo}
          unidadesMedida={maestros.unidades.map((u) => ({
            value: String(u.id_unidad_medida),
            label: u.nombre,
            abreviatura: u.abreviatura,
          }))}
          unidadesCompletas={maestros.unidades}
          almacenes={maestros.almacenes}
          minas={maestros.minas}
          proveedores={maestros.proveedores}
          onAgregarProveedorLocal={agregarProveedorLocal}
          empresas={maestros.empresas}
          loadingMaestros={loadingMaestros}
          onUpdateHeader={updateCotizacionHeader}
          onUpdateDetail={updateCotizacionDetail}
          onToggleNoCotiza={toggleCotizacionNoCotiza}
          onUpdateGlobalLogistica={updateGlobalLogistica}
        />
      </div>

      <div className="pt-2 flex-none bg-zinc-950">
        <Group justify="flex-end" gap="md">
          <Button
            variant="subtle"
            onClick={onCancel}
            disabled={loading}
            radius="xl"
            size="sm"
            className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
          >
            Cancelar
          </Button>
          <Button
            loading={loading}
            onClick={handleSave}
            radius="xl"
            size="sm"
            className="bg-amber-500 text-zinc-950 font-extrabold hover:bg-amber-400 shadow-lg border-0 px-8"
          >
            Guardar Cambios
          </Button>
        </Group>
      </div>
    </div>
  );
};
