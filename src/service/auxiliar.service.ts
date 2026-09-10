import { api } from "./_api";
import type { IRespuesta } from "../shared/interfaces/_response";
import type { RES_Proveedor } from "./responses/proveedor";
import type { RES_UnidadMedida } from "./responses/unidad-medida";
import type { RES_Producto } from "./responses/producto";
import type { RES_Almacen } from "./responses/almacen";
import type { RES_PersonalExterno } from "./responses/personal-externo";
import type { RES_LoteDisponible } from "./responses/lote-producto";
import type { RES_Empleado } from "./responses/empleado";
import type { RES_Empresa } from "./responses/empresa";
import type { RES_Mina } from "./responses/mina";
import type { TipoBien } from "../shared/enums/_generic/tipo-bien";
import type { RES_Marca } from "./responses/marca";
import type { RES_ActivoFijoDisponible } from "./responses/activo-fijo";
import type { EstadoActivoFijo } from "../shared/enums/activo-fijo";
import type { RES_Labor } from "./responses/labor";
import type { RES_Contratista } from "./responses/contratista";
import type { EstadoBase } from "../shared/enums/_generic/estado-base";
import type { TipoEntidad } from "../shared/enums/_generic/tipo-entidad";
import type { TipoProducto } from "../shared/enums/_generic/tipo-producto";
import type { RES_Categoria } from "./responses/categoria";
import type { EstadoLoteMineral } from "../shared/enums/lote-mineral";
import type { RES_LoteMineral } from "./responses/lote-mineral";
import type { RES_Banco } from "./responses/banco";
import type { RES_Area, RES_Cargo } from "./responses/organigrama";
import type { RES_Rol } from "./responses/rol";
import type { RES_Agencia } from "./responses/agencia";
import type { RES_Oficina } from "./responses/oficina";
import type { Moneda } from "../shared/enums/_generic/moneda";
import type { RES_CuentaEmpresa } from "./responses/cuenta-empresa";
import type {
  RES_Departamento,
  RES_Distrito,
  RES_Provincia,
} from "./responses/ubicacion";
import type { RES_Transportista } from "./responses/transportista";
import type { RES_TarifaCarbon } from "./responses/tarifa-carbon";
import type { RES_LugarExtraccionCarbon } from "./responses/lugar-extraccion-carbon";

const path = "/aux";

export const AuxService = {
  /**
   * Obtener almacenes.
   *
   * Por defecto NO devuelve los almacenes de carbon: el modulo que los
   * necesite explicitamente debe pasar `para_carbon: true`.
   */
  get_almacenes: async (filters?: {
    id_almacen?: number;
    id_empleado_responsable?: number;
    es_principal?: boolean;
    para_carbon?: boolean;
  }): Promise<IRespuesta<RES_Almacen[]>> => {
    // Transformamos el booleano a 1 o 0 antes de enviarlo
    const params = filters
      ? {
          ...filters,
          ...(filters.es_principal !== undefined && {
            es_principal: filters.es_principal ? 1 : 0,
          }),
          ...(filters.para_carbon !== undefined && {
            para_carbon: filters.para_carbon ? 1 : 0,
          }),
        }
      : undefined;

    const { data } = await api.get<IRespuesta<RES_Almacen[]>>(
      `${path}/almacenes`,
      { params },
    );
    return data;
  },

  get_personal_externo: async (filters?: {
    id_personal?: number;
    id_proveedor?: number;
    estado?: EstadoBase;
  }): Promise<IRespuesta<RES_PersonalExterno[]>> => {
    const { data } = await api.get(`${path}/personal-externo`, {
      params: filters,
    });
    return data;
  },

  crear_personal_externo: async (nuevoPersonal: {
    id_proveedor?: number;
    nombre: string;
    apellido?: string | null;
    dni?: string;
  }): Promise<IRespuesta<RES_PersonalExterno>> => {
    const { data } = await api.post(`${path}/personal-externo`, nuevoPersonal);
    return data;
  },

  get_lotes_disponibles: async (idAlmacen: number, idsProductos: number[]) => {
    const res = await api.get<IRespuesta<RES_LoteDisponible[]>>(
      `${path}/lotes`,
      {
        params: {
          id_almacen: idAlmacen,
          ids_productos: idsProductos,
        },
      },
    );
    return res.data;
  },

  get_empleados: async (filters?: {
    id_empleado?: number;
    estado?: EstadoBase;
    id_almacen_excluyente?: number;
    id_mina_excluyente?: number;
    con_cuenta?: boolean;
  }): Promise<IRespuesta<RES_Empleado[]>> => {
    const { data } = await api.get(`${path}/empleados`, {
      params: filters,
    });
    return data;
  },

  /**
   * Obtener unidades de medida
   */
  get_unidades_medida: async (filters?: {
    id_unidad_medida?: number;
    incluir_conversiones?: boolean;
  }): Promise<IRespuesta<RES_UnidadMedida[]>> => {
    // Transformamos el booleano a 1 o 0 antes de enviarlo
    const params = filters
      ? {
          ...filters,
          ...(filters.incluir_conversiones !== undefined && {
            incluir_conversiones: filters.incluir_conversiones ? 1 : 0,
          }),
        }
      : undefined;

    const { data } = await api.get<IRespuesta<RES_UnidadMedida[]>>(
      `${path}/unidades-medida`,
      { params },
    );
    return data;
  },

  /**
   * Crear una unidad de medida en el catálogo
   */
  crear_unidad_medida: async (nuevaUnidad: {
    nombre: string;
    abreviatura: string;
  }): Promise<IRespuesta<RES_UnidadMedida>> => {
    const { data } = await api.post<IRespuesta<RES_UnidadMedida>>(
      `${path}/unidades-medida`,
      {
        nombre: nuevaUnidad.nombre,
        abreviatura: nuevaUnidad.abreviatura,
      },
    );
    return data;
  },

  /**
   * Obtener categorias
   */
  get_categorias: async (filters?: {
    id_categoria?: number;
    estado?: EstadoBase;
  }): Promise<IRespuesta<RES_Categoria[]>> => {
    const { data } = await api.get<IRespuesta<RES_Categoria[]>>(
      `${path}/categorias`,
      { params: filters },
    );
    return data;
  },

  /**
   * Crear una categoria
   */
  crear_categoria: async (nuevaCategoria: {
    nombre: string;
    tipo_producto: TipoProducto;
    clasificacion_bien: TipoBien;
    descripcion?: string;
    para_transporte?: boolean;
    control_por_odometro?: boolean;
    control_por_horometro?: boolean;
    control_por_vueltas?: boolean;
    es_consumible?: boolean;
    para_cocina?: boolean;
    para_mina?: boolean;
    es_auditable?: boolean;
    ids_categorias_consumidoras?: number[];
  }): Promise<IRespuesta<RES_Categoria>> => {
    const { data } = await api.post<IRespuesta<RES_Categoria>>(
      `${path}/categorias`,
      nuevaCategoria,
    );
    return data;
  },

  /**
   * Obtener proveedores
   */
  get_proveedores: async (filters?: {
    id_proveedor?: number;
    estado?: string;
    tipo_entidad?: string;
    para_mantenimiento?: boolean;
    para_transporte?: boolean;
    para_carbon?: boolean;
  }): Promise<IRespuesta<RES_Proveedor[]>> => {
    const { data } = await api.get<IRespuesta<RES_Proveedor[]>>(
      `${path}/proveedores`,
      { params: filters },
    );
    return data;
  },

  get_agencias_transporte: async (): Promise<IRespuesta<RES_Agencia[]>> => {
    const { data } = await api.get<IRespuesta<RES_Agencia[]>>(
      `${path}/agencias-transporte`,
    );
    return data;
  },

  crear_agencia_transporte: async (nuevaAgencia: {
    razon_social: string;
  }): Promise<IRespuesta<RES_Agencia>> => {
    const { data } = await api.post<IRespuesta<RES_Agencia>>(
      `${path}/agencias-transporte`,
      nuevaAgencia,
    );
    return data;
  },

  /**
   * Crear un proveedor
   */
  crear_proveedor: async (nuevoProveedor: {
    tipo_entidad: TipoEntidad;
    razon_social: string;
    para_mantenimiento: boolean;
    para_transporte?: boolean;
    para_carbon?: boolean;
    dni?: string;
    ruc?: string;
    direccion?: string;
    telefono?: string;
    correo?: string;
    id_departamento?: number;
    id_provincia?: number;
    id_distrito?: number;
  }): Promise<IRespuesta<RES_Proveedor>> => {
    const { data } = await api.post<IRespuesta<RES_Proveedor>>(
      `${path}/proveedores`,
      {
        tipo_entidad: nuevoProveedor.tipo_entidad,
        razonSocial: nuevoProveedor.razon_social,
        paraMantenimiento: nuevoProveedor.para_mantenimiento,
        paraTransporte: nuevoProveedor.para_transporte,
        paraCarbon: nuevoProveedor.para_carbon ?? false,
        dni: nuevoProveedor.dni,
        ruc: nuevoProveedor.ruc,
        direccion: nuevoProveedor.direccion,
        telefono: nuevoProveedor.telefono,
        correo: nuevoProveedor.correo,
        id_departamento: nuevoProveedor.id_departamento,
        id_provincia: nuevoProveedor.id_provincia,
        id_distrito: nuevoProveedor.id_distrito,
      },
    );
    return data;
  },

  get_empresas: async (filters?: {
    id_empresa?: number;
    estado?: string;
  }): Promise<IRespuesta<RES_Empresa[]>> => {
    const { data } = await api.get<IRespuesta<RES_Empresa[]>>(
      `${path}/empresas`,
      { params: filters },
    );
    return data;
  },

  get_cuentas_empresa: async (filters?: {
    id_empresa?: number | number[];
    id_cuenta_bancaria?: number | number[];
    estado?: EstadoBase;
  }): Promise<IRespuesta<RES_CuentaEmpresa[]>> => {
    const { data } = await api.get<IRespuesta<RES_CuentaEmpresa[]>>(
      `${path}/cuentas-empresa`,
      { params: filters },
    );
    return data;
  },

  crear_cuenta_empresa: async (nuevaCuenta: {
    id_empresa: number;
    id_banco: number;
    moneda: Moneda;
    numero_cuenta: string;
    cci: string | null;
    es_para_detraccion: boolean;
  }): Promise<IRespuesta<RES_CuentaEmpresa>> => {
    const { data } = await api.post<IRespuesta<RES_CuentaEmpresa>>(
      `${path}/cuentas-empresa`,
      {
        id_empresa: nuevaCuenta.id_empresa,
        id_banco: nuevaCuenta.id_banco,
        moneda: nuevaCuenta.moneda,
        numero_cuenta: nuevaCuenta.numero_cuenta,
        cci: nuevaCuenta.cci,
        es_para_detraccion: nuevaCuenta.es_para_detraccion,
      },
    );
    return data;
  },

  /**
   * Obtener catálogo de productos
   */
  get_productos: async (filters?: {
    tipo_bien_excluido?: TipoBien;
    tipo_bien?: TipoBien;
  }): Promise<IRespuesta<RES_Producto[]>> => {
    const { data } = await api.get<IRespuesta<RES_Producto[]>>(
      `${path}/productos`,
      { params: filters },
    );
    return data;
  },

  /**
   * Crear un producto
   */
  crear_producto: async (nuevoProducto: {
    id_categoria: number;
    id_unidad_medida_base: number;
    nombre: string;
    prefijo?: string;
    es_auditable: boolean;
    es_perecible: boolean;
    para_mantenimiento: boolean;
    stock_minimo_base?: number;
    costo_promedio_base?: number;
    tiempo_espera_vencimiento?: number;
    periodo_espera_vencimiento?: string;
  }): Promise<IRespuesta<RES_Producto>> => {
    const { data } = await api.post<IRespuesta<RES_Producto>>(
      `${path}/productos`,
      {
        id_unidad_medida_base: nuevoProducto.id_unidad_medida_base,
        nombre: nuevoProducto.nombre,
        prefijo: nuevoProducto.prefijo,
        es_auditable: nuevoProducto.es_auditable,
        es_perecible: nuevoProducto.es_perecible,
        para_mantenimiento: nuevoProducto.para_mantenimiento,
        stock_minimo_base: nuevoProducto.stock_minimo_base,
        costo_promedio_base: nuevoProducto.costo_promedio_base,
        tiempo_espera_vencimiento: nuevoProducto.tiempo_espera_vencimiento,
        periodo_espera_vencimiento: nuevoProducto.periodo_espera_vencimiento,
      },
    );
    return data;
  },

  /**
   * Obtener lista de minas
   */
  get_minas: async (filters?: {
    id_mina?: number;
    id_concesion?: number;
    id_empleado_responsable?: number;
    id_almacen_abastece?: number;
  }): Promise<IRespuesta<RES_Mina[]>> => {
    const { data } = await api.get<IRespuesta<RES_Mina[]>>(`${path}/minas`, {
      params: filters,
    });
    return data;
  },

  /**
   * Obtener lista de marcas
   */
  get_marcas: async (filters?: {
    id_marca?: number;
    estado?: string;
  }): Promise<IRespuesta<RES_Marca[]>> => {
    const { data } = await api.get<IRespuesta<RES_Marca[]>>(`${path}/marcas`, {
      params: filters,
    });
    return data;
  },

  /**
   * Crear una nueva marca
   */
  crear_marca: async (nuevaMarca: {
    nombre: string;
  }): Promise<IRespuesta<RES_Marca>> => {
    const { data } = await api.post<IRespuesta<RES_Marca>>(
      `${path}/marcas`,
      nuevaMarca,
    );
    return data;
  },

  get_activos_disponibles: async (filters?: {
    id_activo?: number;
    id_almacen?: number;
    id_mina?: number;
    ids_productos?: number | number[];
    para_transporte?: boolean;
    control_por_odometro?: boolean;
    control_por_horometro?: boolean;
    control_por_vueltas?: boolean;
    estado?: EstadoActivoFijo;
  }): Promise<IRespuesta<RES_ActivoFijoDisponible[]>> => {
    const apiParams = { ...filters };
    const { data } = await api.get<IRespuesta<RES_ActivoFijoDisponible[]>>(
      `${path}/activos-disponibles`,
      { params: apiParams },
    );
    return data;
  },

  /**
   * Obtener labores globalmente
   */
  get_labores: async (filters?: {
    id_mina?: number;
    id_labor?: number;
    id_contratista_excluyente?: number;
  }): Promise<IRespuesta<RES_Labor[]>> => {
    const { data } = await api.get<IRespuesta<RES_Labor[]>>(`${path}/labores`, {
      params: filters,
    });
    return data;
  },

  /**
   * Obtener contratistas
   */
  get_contratistas: async (filters?: {
    id_mina?: number;
  }): Promise<IRespuesta<RES_Contratista[]>> => {
    const { data } = await api.get<IRespuesta<RES_Contratista[]>>(
      `${path}/contratistas`,
      { params: filters },
    );
    return data;
  },

  /**
   * Crear contratista (Auxiliar global)
   */
  crear_contratista: async (
    formData: FormData,
  ): Promise<IRespuesta<RES_Contratista>> => {
    const { data } = await api.post<IRespuesta<RES_Contratista>>(
      `${path}/contratistas`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return data;
  },

  /**Obtener lotes de mineral */
  get_lotes_mineral: async (filters?: {
    id_lote_mineral?: number;
    id_contratista?: number;
    id_mina?: number;
    id_labor?: number;
    estado?: EstadoLoteMineral;
  }): Promise<IRespuesta<RES_LoteMineral[]>> => {
    const apiParams = { ...filters };
    const { data } = await api.get<IRespuesta<RES_LoteMineral[]>>(
      `${path}/lotes-mineral`,
      { params: apiParams },
    );
    return data;
  },

  registrar_lote: async (nuevoLote: {
    id_contratista: number;
    id_mina: number;
    id_labor: number;
    descripcion?: string | null;
    fecha_inicio_produccion?: string | null;
  }): Promise<IRespuesta<RES_LoteMineral>> => {
    const { data } = await api.post<IRespuesta<RES_LoteMineral>>(
      "/lote-mineral",
      nuevoLote,
    );
    return data;
  },

  get_bancos: async (): Promise<IRespuesta<RES_Banco[]>> => {
    const { data } = await api.get<IRespuesta<RES_Banco[]>>(`${path}/bancos`);
    return data;
  },

  crear_banco: async (nuevoBanco: {
    nombre: string;
    abreviatura: string;
  }): Promise<IRespuesta<RES_Banco>> => {
    const { data } = await api.post<IRespuesta<RES_Banco>>(
      `${path}/bancos`,
      nuevoBanco,
    );
    return data;
  },

  get_areas: async (filters?: {
    id_area?: number;
    estado?: EstadoBase;
    con_cargos?: boolean;
  }): Promise<IRespuesta<RES_Area[]>> => {
    const { data } = await api.get<IRespuesta<RES_Area[]>>(`${path}/areas`, {
      params: filters,
    });
    return data;
  },

  get_cargos: async (filters?: {
    id_cargo?: number;
    id_area?: number;
    estado?: EstadoBase;
    con_area?: boolean;
  }): Promise<IRespuesta<RES_Cargo[]>> => {
    const { data } = await api.get<IRespuesta<RES_Cargo[]>>(`${path}/cargos`, {
      params: filters,
    });
    return data;
  },

  get_roles_disponibles: async (filters?: {
    id_rol?: number;
    estado?: EstadoBase;
  }): Promise<IRespuesta<RES_Rol[]>> => {
    const { data } = await api.get<IRespuesta<RES_Rol[]>>(
      `${path}/roles-disponibles`,
      { params: filters },
    );
    return data;
  },

  get_oficinas: async (filters?: {
    id_cargo?: number | number[];
    id_area?: number | number[];
    estado?: EstadoBase;
  }): Promise<IRespuesta<RES_Oficina[]>> => {
    const { data } = await api.get<IRespuesta<RES_Oficina[]>>(
      `${path}/oficinas`,
      {
        params: filters,
      },
    );
    return data;
  },

  /**
   * Obtener departamentos del Perú
   */
  get_departamentos: async (filters?: {
    id_departamento?: number;
  }): Promise<IRespuesta<RES_Departamento[] | RES_Departamento>> => {
    const { data } = await api.get<
      IRespuesta<RES_Departamento[] | RES_Departamento>
    >(`${path}/departamentos`, { params: filters });
    return data;
  },

  /**
   * Obtener provincias. Si id_departamento esta presente, devuelve solo
   * provincias de ese departamento (para selects en cascada).
   */
  get_provincias: async (filters?: {
    id_provincia?: number;
    id_departamento?: number;
  }): Promise<IRespuesta<RES_Provincia[] | RES_Provincia>> => {
    const { data } = await api.get<IRespuesta<RES_Provincia[] | RES_Provincia>>(
      `${path}/provincias`,
      { params: filters },
    );
    return data;
  },

  /**
   * Obtener distritos. Si id_provincia esta presente, devuelve solo
   * distritos de esa provincia (para selects en cascada).
   */
  get_distritos: async (filters?: {
    id_distrito?: number;
    id_provincia?: number;
    id_departamento?: number;
  }): Promise<IRespuesta<RES_Distrito[] | RES_Distrito>> => {
    const { data } = await api.get<IRespuesta<RES_Distrito[] | RES_Distrito>>(
      `${path}/distritos`,
      { params: filters },
    );
    return data;
  },

  /**
   * Catalogo de transportistas para Compra de Carbon.
   * Si se omite estado, el backend asume Activo.
   */
  get_transportistas: async (filters?: {
    id_transportista?: number;
    estado?: EstadoBase;
  }): Promise<IRespuesta<RES_Transportista[] | RES_Transportista>> => {
    const { data } = await api.get<
      IRespuesta<RES_Transportista[] | RES_Transportista>
    >(`${path}/transportistas`, { params: filters });
    return data;
  },

  /**
   * Crea un transportista en el catalogo. Pensado para el boton "+".
   */
  crear_transportista: async (nuevoTransportista: {
    tipo_entidad: TipoEntidad;
    razon_social: string;
    ruc?: string | null;
    dni?: string | null;
    telefono?: string | null;
  }): Promise<IRespuesta<RES_Transportista>> => {
    const { data } = await api.post<IRespuesta<RES_Transportista>>(
      `${path}/transportistas`,
      nuevoTransportista,
    );
    return data;
  },

  /**
   * Catalogo de tarifas de carbon. Permite filtrar por tipo de carbon.
   */
  get_tarifas_carbon: async (filters?: {
    id_tarifa_carbon?: number;
    id_tipo_carbon?: number;
    estado?: EstadoBase;
  }): Promise<IRespuesta<RES_TarifaCarbon[] | RES_TarifaCarbon>> => {
    const { data } = await api.get<
      IRespuesta<RES_TarifaCarbon[] | RES_TarifaCarbon>
    >(`${path}/tarifas-carbon`, { params: filters });
    return data;
  },

  /**
   * Crea una tarifa de carbon en el catalogo. Pensado para el boton "+".
   */
  crear_tarifa_carbon: async (nuevaTarifa: {
    id_tipo_carbon: number;
    inicio_porcentaje_ceniza: number;
    fin_porcentaje_ceniza: number;
    precio_unitario: number;
  }): Promise<IRespuesta<RES_TarifaCarbon>> => {
    const { data } = await api.post<IRespuesta<RES_TarifaCarbon>>(
      `${path}/tarifas-carbon`,
      nuevaTarifa,
    );
    return data;
  },

  /**
   * Lista los lugares de extraccion de carbon asociados a un proveedor.
   * (Vista JOIN: catalogo lugar_extraccion_carbon + puente
   * lugar_extraccion_proveedor).
   */
  get_lugares_extraccion_carbon: async (
    idProveedor: number,
  ): Promise<IRespuesta<RES_LugarExtraccionCarbon[]>> => {
    const { data } = await api.get<IRespuesta<RES_LugarExtraccionCarbon[]>>(
      `/proveedores/${idProveedor}/lugares-extraccion`,
    );
    return data;
  },

  /**
   * Lista el catalogo GLOBAL de lugares de extraccion de carbon (sitios
   * nombrados, sin asociacion a proveedor). Usado para alimentar los
   * Selects de los formularios de proveedor de carbon y de compra.
   */
  get_lugar_extraccion_carbon_catalogo: async (): Promise<
    IRespuesta<RES_LugarExtraccionCarbon[]>
  > => {
    const { data } = await api.get<IRespuesta<RES_LugarExtraccionCarbon[]>>(
      `/lugar-extraccion-carbon`,
    );
    return data;
  },

  /**
   * Crea un nuevo sitio en el catalogo GLOBAL. Direccion obligatoria;
   * departamento / provincia / distrito opcionales.
   */
  crear_lugar_extraccion_carbon: async (nuevo: {
    id_departamento?: number | null;
    id_provincia?: number | null;
    id_distrito?: number | null;
    direccion: string;
  }): Promise<IRespuesta<RES_LugarExtraccionCarbon>> => {
    const { data } = await api.post<IRespuesta<RES_LugarExtraccionCarbon>>(
      `/lugar-extraccion-carbon`,
      nuevo,
    );
    return data;
  },
};
