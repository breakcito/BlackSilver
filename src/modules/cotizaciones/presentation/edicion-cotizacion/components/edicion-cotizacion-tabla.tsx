import { Stack } from "@mantine/core";

import type {
  DTO_CotizacionRequest,
  DTO_ProductoComparativo,
  DTO_CotizacionDetalle,
} from "../../../service/cotizaciones.requests";
import type { RES_Almacen } from "../../../../../service/responses/almacen";
import type { RES_Mina } from "../../../../../service/responses/mina";
import type { RES_Proveedor } from "../../../../../service/responses/proveedor";
import type { RES_Empresa } from "../../../../../service/responses/empresa";
import type { RES_UnidadMedida } from "../../../../../service/responses/unidad-medida";
import { TipoBien } from "../../../../../shared/enums/_generic/tipo-bien";
import { TipoDespachoCompra } from "../../../../../shared/enums/_generic/tipo-despacho-compra";
import { Periodo } from "../../../../../shared/enums/_generic/periodo";
import type { LoadingMaestrosState } from "../../../hooks/shared/utils";
import { EdicionCotizacionCabecera } from "./edicion-cotizacion-cabecera";
import { EdicionCotizacionDetalle } from "./edicion-cotizacion-detalle";

interface EdicionCotizacionTablaProps {
  productos: (
    | (DTO_ProductoComparativo & {
        nombre: string;
        id_unidad_medida_base: number;
        unidad_medida_base: string;
        unidad_medida_abreviatura: string;
        tipo_bien?: TipoBien;
      })
    | null
  )[];
  cotizacion: DTO_CotizacionRequest;
  correlativo?: string;
  unidadesMedida: { value: string; label: string; abreviatura: string }[];
  unidadesCompletas: RES_UnidadMedida[];
  almacenes: RES_Almacen[];
  minas: RES_Mina[];
  proveedores: RES_Proveedor[];
  onAgregarProveedorLocal?: (nuevo: RES_Proveedor) => void;
  empresas: RES_Empresa[];
  loadingMaestros?: LoadingMaestrosState;
  onUpdateHeader: <K extends keyof DTO_CotizacionRequest>(
    index: number,
    field: K,
    value: DTO_CotizacionRequest[K],
  ) => void;
  onUpdateDetail: <K extends keyof DTO_CotizacionDetalle>(
    cotIndex: number,
    rowIndex: number,
    field: K,
    value: DTO_CotizacionDetalle[K],
  ) => void;
  onToggleNoCotiza: (cotIndex: number, rowIndex: number) => void;
  onUpdateGlobalLogistica?: (
    cotIndex: number,
    data: {
      id_almacen_recepcionista: number | null;
      id_mina_destino?: number | null;
      tipo_despacho: TipoDespachoCompra;
      lugar_recojo?: string;
      tiempo_entrega: number;
      tiempo_entrega_periodo: Periodo;
    },
  ) => void;
}

export const EdicionCotizacionTabla = ({
  productos,
  cotizacion,
  unidadesMedida,
  unidadesCompletas,
  almacenes,
  minas,
  proveedores,
  onAgregarProveedorLocal,
  empresas,
  loadingMaestros,
  onUpdateHeader,
  onUpdateDetail,
  onToggleNoCotiza,
  onUpdateGlobalLogistica,
}: EdicionCotizacionTablaProps) => {
  return (
    <Stack gap="md" className="h-full overflow-hidden">
      {/* Sección Cabecera */}
      <EdicionCotizacionCabecera
        cotizacion={cotizacion}
        proveedores={proveedores}
        empresas={empresas}
        loadingMaestros={loadingMaestros}
        onUpdateHeader={onUpdateHeader}
        onAgregarProveedorLocal={onAgregarProveedorLocal}
      />

      {/* Sección Detalle */}
      <EdicionCotizacionDetalle
        productos={productos}
        cotizacion={cotizacion}
        unidadesMedida={unidadesMedida}
        unidadesCompletas={unidadesCompletas}
        almacenes={almacenes}
        minas={minas}
        proveedores={proveedores}
        loadingMaestros={loadingMaestros}
        onUpdateDetail={onUpdateDetail}
        onToggleNoCotiza={onToggleNoCotiza}
        onUpdateGlobalLogistica={onUpdateGlobalLogistica}
      />
    </Stack>
  );
};
