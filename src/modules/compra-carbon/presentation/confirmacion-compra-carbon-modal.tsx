import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Collapse,
  Divider,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import {
  IconAlertTriangle,
  IconBuildingStore,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconCirclePlus,
  IconMapPin,
  IconTag,
  IconTrash,
  IconTruckDelivery,
} from "@tabler/icons-react";

import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { FormTarifaCarbon } from "../../../presentation/utils/form-tarifa-carbon";

import { useNotify } from "../../../hooks/useNotify";
import { AuxService } from "../../../service/auxiliar.service";
import type { RES_Almacen } from "../../../service/responses/almacen";
import type { RES_TipoCarbon } from "../../tipo-carbon/service/tipo-carbon.responses";
import type { RES_TarifaCarbon } from "../../../service/responses/tarifa-carbon";
import type { RES_Transportista } from "../../../service/responses/transportista";
import type { RES_LugarExtraccionCarbon } from "../../../service/responses/lugar-extraccion-carbon";
import { ProveedoresService } from "../../proveedores/service/proveedores.service";
import { ClientesService } from "../../clientes/service/clientes.service";
import type { AlmacenCarbonResponse } from "../../proveedores/service/proveedores.responses";
import type { AlmacenCarbonClienteResponse } from "../../clientes/service/clientes.responses";
import { TipoCarbonService } from "../../tipo-carbon/service/tipo-carbon.service";
import { CompraCarbonService } from "../service/compra-carbon.service";
import type {
  CompraCarbonDetalleResponse,
  CompraCarbonResumen,
  DocumentoDuplicadoItem,
} from "../service/compra-carbon.responses";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { MultiFilePicker } from "../../../presentation/utils/archivo/multifile-picker";
import { useEvidenciasCompraCarbon } from "../hooks/useEvidenciasCompraCarbon";

export interface ProgresoCompraCarbon {
  porcentaje: number;
  llenos: number;
  totales: number;
}

interface Props {
  compra: CompraCarbonResumen;
  modo: "confirmar" | "editar";
  onCancel: () => void;
  onSuccess: (data: CompraCarbonDetalleResponse) => void;
  onProgresoChange?: (progreso: ProgresoCompraCarbon) => void;
}

interface LineaDetalleForm {
  id_detalle_compra_carbon?: number;
  id_tipo_carbon: number | null;
  id_tarifa_carbon: number | null;
  cantidad: number;
  precio_unitario: number;
  porcentaje_ceniza: number;
  porcentaje_humedad: number;
  placa: string;
  guia_remitente: string;
  guia_transportista: string;
  codigo_ticket_balanza: string;
  id_lugar_extraccion: number | null;
  pagar_flete: boolean;
  id_transportista: number | null;
  costo_flete_por_tonelada: number;
}

const inputClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
  dropdown:
    "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
  option:
    "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors",
  label: "text-zinc-300 mb-1.5 font-semibold tracking-tight",
};

const formatPEN = (n: number) => `S/ ${formatNumber(n)}`;
const toBackendDateTime = (d: Date | string | null): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  if (!date || Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const lineaVacia = (idTipoDefault?: number | null): LineaDetalleForm => ({
  id_tipo_carbon: idTipoDefault ?? null,
  id_tarifa_carbon: null,
  cantidad: 0,
  precio_unitario: 0,
  porcentaje_ceniza: 0,
  porcentaje_humedad: 0,
  placa: "",
  guia_remitente: "",
  guia_transportista: "",
  codigo_ticket_balanza: "",
  id_lugar_extraccion: null,
  pagar_flete: false,
  id_transportista: null,
  costo_flete_por_tonelada: 0,
});

export const ConfirmacionCompraCarbonModal = ({
  compra,
  modo,
  onCancel,
  onSuccess,
  onProgresoChange,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  // Estados de carga independientes
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loadingEmpAlmacenes, setLoadingEmpAlmacenes] = useState(true);
  const [loadingCliAlmacenes, setLoadingCliAlmacenes] = useState(true);
  const [loadingProvAlmacenes, setLoadingProvAlmacenes] = useState(true);
  const [loadingLugares, setLoadingLugares] = useState(true);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [loadingTransportistas, setLoadingTransportistas] = useState(true);
  const [loadingDetalles, setLoadingDetalles] = useState(true);

  // Catálogos
  const [almacenesEmpresa, setAlmacenesEmpresa] = useState<RES_Almacen[]>([]);
  const [almacenesCliente, setAlmacenesCliente] = useState<
    (AlmacenCarbonClienteResponse & { cliente_razon_social?: string })[]
  >([]);
  const [almacenesProveedor, setAlmacenesProveedor] = useState<
    AlmacenCarbonResponse[]
  >([]);
  const [lugaresProveedor, setLugaresProveedor] = useState<
    RES_LugarExtraccionCarbon[]
  >([]);
  const [tipos, setTipos] = useState<RES_TipoCarbon[]>([]);
  const [tarifas, setTarifas] = useState<RES_TarifaCarbon[]>([]);
  const [transportistas, setTransportistas] = useState<RES_Transportista[]>([]);

  // Cabecera state (valores iniciales inmediatos desde compra)
  const [tipoDespacho, setTipoDespacho] = useState<"envio" | "recojo">(
    compra.tipo_despacho === "recojo" ? "recojo" : "envio",
  );
  const [idAlmacenProveedor, setIdAlmacenProveedor] = useState<string | null>(
    compra.id_almacen_proveedor ? String(compra.id_almacen_proveedor) : null,
  );

  // Destino: empresa vs cliente
  const [destinoTipo, setDestinoTipo] = useState<"empresa" | "cliente">(
    compra.id_almacen_cliente ? "cliente" : "empresa",
  );
  const [idAlmacenEmpresa, setIdAlmacenEmpresa] = useState<string | null>(
    compra.id_almacen ? String(compra.id_almacen) : null,
  );
  const [idAlmacenCliente, setIdAlmacenCliente] = useState<string | null>(
    compra.id_almacen_cliente ? String(compra.id_almacen_cliente) : null,
  );

  const [aplicaIgv, setAplicaIgv] = useState<boolean>(
    Boolean(compra.aplica_igv),
  );
  const [porcentajeIgv, setPorcentajeIgv] = useState<number | string>(
    compra.porcentaje_igv !== undefined && compra.porcentaje_igv !== null
      ? Number(compra.porcentaje_igv)
      : 18,
  );
  const [fechaHoraIngreso, setFechaHoraIngreso] = useState<Date | null>(
    compra.fecha_hora_ingreso
      ? new Date(compra.fecha_hora_ingreso)
      : new Date(),
  );
  const [motivoEdicion, setMotivoEdicion] = useState<string>("");

  // Evidencias cabecera
  const [evidenciasFiles, setEvidenciasFiles] = useState<File[]>([]);
  const { subirArchivos: subirArchivosCabecera } = useEvidenciasCompraCarbon(
    compra.id_compra_carbon,
  );

  // Detalles
  const [detalles, setDetalles] = useState<LineaDetalleForm[]>([lineaVacia()]);
  const [detallesExpandidos, setDetallesExpandidos] = useState<
    Record<number, boolean>
  >({
    0: true,
  });

  // Alerta de documentos duplicados
  const [documentosDuplicados, setDocumentosDuplicados] = useState<
    DocumentoDuplicadoItem[]
  >([]);

  // Modal para nueva tarifa de carbón desde el detalle
  const [openNuevaTarifa, setOpenNuevaTarifa] = useState(false);
  const [targetTarifaIdx, setTargetTarifaIdx] = useState<number | null>(null);

  // Cargar catálogos y datos de la compra en paralelo e independiente (rellena cada select inmediatamente)
  useEffect(() => {
    let cancel = false;

    // 1. Almacenes de la empresa
    AuxService.get_almacenes({ para_carbon: true })
      .then((res) => {
        if (cancel) return;
        if (res.success && res.data) {
          setAlmacenesEmpresa(res.data);
          // Si no tiene almacén previo, pre-seleccionar almacén principal o primero
          setIdAlmacenEmpresa((prev) => {
            if (prev) return prev;
            const principal = res.data.find((a) => a.es_principal);
            if (principal) return String(principal.id_almacen);
            return res.data[0] ? String(res.data[0].id_almacen) : null;
          });
        }
      })
      .catch((e) => console.error("Error cargando almacenes empresa:", e))
      .finally(() => {
        if (!cancel) setLoadingEmpAlmacenes(false);
      });

    // 2. Almacenes de clientes
    ClientesService.getAlmacenesCarbonTodos()
      .then((res) => {
        if (cancel) return;
        if (res.success && res.data) {
          setAlmacenesCliente(res.data);
        }
      })
      .catch((e) => console.error("Error cargando almacenes cliente:", e))
      .finally(() => {
        if (!cancel) setLoadingCliAlmacenes(false);
      });

    // 3. Almacenes del proveedor
    ProveedoresService.getAlmacenesCarbonPorProveedor(compra.id_proveedor)
      .then((res) => {
        if (cancel) return;
        if (res.success && res.data) {
          setAlmacenesProveedor(res.data);
        }
      })
      .catch((e) => console.error("Error cargando almacenes proveedor:", e))
      .finally(() => {
        if (!cancel) setLoadingProvAlmacenes(false);
      });

    // 4. Lugares de extracción del proveedor
    ProveedoresService.getLugaresExtraccionPorProveedor(compra.id_proveedor)
      .then((res) => {
        if (cancel) return;
        if (res.success && res.data) {
          setLugaresProveedor(res.data);
        }
      })
      .catch((e) =>
        console.error("Error cargando lugares extracción proveedor:", e),
      )
      .finally(() => {
        if (!cancel) setLoadingLugares(false);
      });

    // 5. Tipos de carbón ofrecidos por el proveedor
    TipoCarbonService.getTipos({
      para_compra: true,
      id_proveedor: compra.id_proveedor,
    })
      .then((res) => {
        if (cancel) return;
        if (res.success && res.data) {
          setTipos(res.data);
        }
      })
      .catch((e) => console.error("Error cargando tipos de carbón:", e))
      .finally(() => {
        if (!cancel) setLoadingTipos(false);
      });

    // 6. Tarifas carbón
    AuxService.get_tarifas_carbon()
      .then((res) => {
        if (cancel) return;
        if (res.success && res.data) {
          const tars = Array.isArray(res.data) ? res.data : [res.data];
          setTarifas(tars);
          // Si ya hay líneas con tipo y ceniza pero sin tarifa asignada o con precio 0, autoasignar
          setDetalles((prev) =>
            prev.map((d) => {
              if (
                d.id_tipo_carbon &&
                d.porcentaje_ceniza > 0 &&
                !d.id_tarifa_carbon
              ) {
                const tarifaCoincide = tars.find(
                  (t) =>
                    t.id_tipo_carbon === d.id_tipo_carbon &&
                    (t.estado ?? "Activo") === "Activo" &&
                    d.porcentaje_ceniza >= Number(t.inicio_porcentaje_ceniza) &&
                    d.porcentaje_ceniza <= Number(t.fin_porcentaje_ceniza),
                );
                if (tarifaCoincide) {
                  return {
                    ...d,
                    id_tarifa_carbon: tarifaCoincide.id_tarifa_carbon,
                    precio_unitario:
                      d.precio_unitario > 0
                        ? d.precio_unitario
                        : Number(tarifaCoincide.precio_unitario),
                  };
                }
              }
              return d;
            }),
          );
        }
      })
      .catch((e) => console.error("Error cargando tarifas carbón:", e));

    // 7. Transportistas
    AuxService.get_transportistas()
      .then((res) => {
        if (cancel) return;
        if (res.success && res.data) {
          setTransportistas(Array.isArray(res.data) ? res.data : [res.data]);
        }
      })
      .catch((e) => console.error("Error cargando transportistas:", e))
      .finally(() => {
        if (!cancel) setLoadingTransportistas(false);
      });

    // 8. Hidratación completa de la compra y sus cargas/detalles
    CompraCarbonService.getCompraConDetalles(compra.id_compra_carbon)
      .then((res) => {
        if (cancel) return;
        if (res.success && res.data) {
          const cab = res.data.cabecera;
          const dets = res.data.detalles;

          if (cab.tipo_despacho === "recojo") {
            setTipoDespacho("recojo");
            if (cab.id_almacen_proveedor) {
              setIdAlmacenProveedor(String(cab.id_almacen_proveedor));
            }
          } else if (cab.tipo_despacho === "envio") {
            setTipoDespacho("envio");
          }

          if (cab.id_almacen_cliente) {
            setDestinoTipo("cliente");
            setIdAlmacenCliente(String(cab.id_almacen_cliente));
          } else if (cab.id_almacen) {
            setDestinoTipo("empresa");
            setIdAlmacenEmpresa(String(cab.id_almacen));
          }

          if (cab.aplica_igv !== undefined && cab.aplica_igv !== null) {
            setAplicaIgv(Boolean(cab.aplica_igv));
          }
          if (cab.porcentaje_igv !== undefined && cab.porcentaje_igv !== null) {
            setPorcentajeIgv(Number(cab.porcentaje_igv));
          }
          if (cab.fecha_hora_ingreso) {
            setFechaHoraIngreso(new Date(cab.fecha_hora_ingreso));
          }

          if (dets && dets.length > 0) {
            setDetalles(
              dets.map((d) => ({
                id_detalle_compra_carbon: d.id_detalle_compra_carbon,
                id_tipo_carbon: d.id_tipo_carbon,
                id_tarifa_carbon: d.id_tarifa_carbon,
                cantidad: Number(d.cantidad) || 0,
                precio_unitario: Number(d.precio_unitario) || 0,
                porcentaje_ceniza: Number(d.porcentaje_ceniza) || 0,
                porcentaje_humedad: Number(d.porcentaje_humedad) || 0,
                placa: d.placa ?? "",
                guia_remitente: d.guia_remitente ?? "",
                guia_transportista: d.guia_transportista ?? "",
                codigo_ticket_balanza: d.codigo_ticket_balanza ?? "",
                id_lugar_extraccion: d.id_lugar_extraccion,
                pagar_flete: Boolean(d.pagar_flete),
                id_transportista: d.id_transportista,
                costo_flete_por_tonelada:
                  Number(d.costo_flete_por_tonelada) || 0,
              })),
            );
          }
        }
      })
      .catch((e) => {
        console.error("Error al cargar detalles de la compra:", e);
        notifyError("Error al cargar la información de la compra");
      })
      .finally(() => {
        if (!cancel) setLoadingDetalles(false);
      });

    return () => {
      cancel = true;
    };
  }, [compra.id_compra_carbon, compra.id_proveedor, notifyError]);

  // Obtener la tarifa correspondiente al tipo de carbón y % de ceniza
  const tarifaPara = (
    idTipo: number | null,
    ceniza: number,
  ): RES_TarifaCarbon | null => {
    if (!idTipo || !ceniza || ceniza <= 0) return null;
    return (
      tarifas.find(
        (t) =>
          t.id_tipo_carbon === idTipo &&
          (t.estado ?? "Activo") === "Activo" &&
          ceniza >= Number(t.inicio_porcentaje_ceniza) &&
          ceniza <= Number(t.fin_porcentaje_ceniza),
      ) ?? null
    );
  };

  // Actualizar un detalle
  const updateDetalle = (index: number, patch: Partial<LineaDetalleForm>) => {
    setDetalles((prev) => {
      const copy = [...prev];
      const actual = { ...copy[index], ...patch };

      // Si cambia porcentaje de ceniza o tipo de carbón, sugerir tarifa aplicable
      if ("porcentaje_ceniza" in patch || "id_tipo_carbon" in patch) {
        const idTipo = actual.id_tipo_carbon;
        const ceniza = actual.porcentaje_ceniza;
        if (idTipo && ceniza > 0) {
          const tarifaCoincide = tarifaPara(idTipo, ceniza);
          if (tarifaCoincide) {
            actual.id_tarifa_carbon = tarifaCoincide.id_tarifa_carbon;
            actual.precio_unitario = Number(tarifaCoincide.precio_unitario);
          } else {
            actual.id_tarifa_carbon = null;
          }
        } else {
          actual.id_tarifa_carbon = null;
        }
      }

      copy[index] = actual;
      return copy;
    });
  };

  const agregarDetalle = () => {
    const idTipoDefault = detalles[0]?.id_tipo_carbon ?? null;
    const nuevoIndex = detalles.length;
    setDetalles((prev) => [...prev, lineaVacia(idTipoDefault)]);
    setDetallesExpandidos((prev) => ({ ...prev, [nuevoIndex]: true }));
  };

  const eliminarDetalle = (index: number) => {
    if (detalles.length <= 1) {
      notifyError("La compra debe tener al menos una carga");
      return;
    }
    setDetalles((prev) => prev.filter((_, i) => i !== index));
  };

  // Cálculo de subtotales
  const totalesCalculados = useMemo(() => {
    let sumAntes = 0;
    let sumFlete = 0;
    let sumNeto = 0;

    for (const d of detalles) {
      const cant = Number(d.cantidad) || 0;
      const precio = Number(d.precio_unitario) || 0;
      const costoFlete = d.pagar_flete
        ? Number(d.costo_flete_por_tonelada) || 0
        : 0;

      const subAntes = Math.round(cant * precio * 100) / 100;
      const flete = Math.round(cant * costoFlete * 100) / 100;
      const subNeto = Math.round((subAntes - flete) * 100) / 100;

      sumAntes += subAntes;
      sumFlete += flete;
      sumNeto += subNeto;
    }

    const pctIgv = aplicaIgv ? Number(porcentajeIgv) || 0 : 0;
    const montoIgv = aplicaIgv
      ? Math.round(((sumAntes * pctIgv) / 100) * 100) / 100
      : 0;

    return {
      totalAntesDescuento: sumAntes,
      descuentoFleteTotal: sumFlete,
      totalNetoProveedor: sumNeto,
      montoIgv,
    };
  }, [detalles, aplicaIgv, porcentajeIgv]);

  // Barra de progreso de completado
  const progresoInfo = useMemo(() => {
    let camposTotales = 0;
    let camposLlenos = 0;

    // Cabecera: tipo despacho
    camposTotales++;
    if (tipoDespacho) camposLlenos++;

    // Si recojo: almacén proveedor
    if (tipoDespacho === "recojo") {
      camposTotales++;
      if (idAlmacenProveedor) camposLlenos++;
    }

    // Almacén destino
    camposTotales++;
    if (
      (destinoTipo === "empresa" && idAlmacenEmpresa) ||
      (destinoTipo === "cliente" && idAlmacenCliente)
    ) {
      camposLlenos++;
    }

    // Fecha ingreso
    camposTotales++;
    if (fechaHoraIngreso) camposLlenos++;

    // Detalles
    for (const d of detalles) {
      // Tipo de carbón
      camposTotales++;
      if (d.id_tipo_carbon) camposLlenos++;

      // Cantidad > 0
      camposTotales++;
      if (Number(d.cantidad) > 0) camposLlenos++;

      // Precio unitario >= 0
      camposTotales++;
      if (Number(d.precio_unitario) > 0) camposLlenos++;

      // Código ticket balanza
      camposTotales++;
      if (d.codigo_ticket_balanza.trim()) camposLlenos++;

      // Placa vehículo
      camposTotales++;
      if (d.placa.trim()) camposLlenos++;

      // Si paga flete
      if (d.pagar_flete) {
        camposTotales += 2;
        if (d.id_transportista) camposLlenos++;
        if (Number(d.costo_flete_por_tonelada) > 0) camposLlenos++;
      }
    }

    const pct =
      camposTotales > 0 ? Math.round((camposLlenos / camposTotales) * 100) : 0;
    return { porcentaje: pct, llenos: camposLlenos, totales: camposTotales };
  }, [
    tipoDespacho,
    idAlmacenProveedor,
    destinoTipo,
    idAlmacenEmpresa,
    idAlmacenCliente,
    fechaHoraIngreso,
    detalles,
  ]);

  // Notificar al componente contenedor (para mostrar en cabecera del modal)
  useEffect(() => {
    onProgresoChange?.(progresoInfo);
  }, [progresoInfo, onProgresoChange]);

  // Firma única de documentos (tickets y guías) para no ejecutar validación de duplicados
  // cuando el usuario modifica otros campos (ceniza, humedad, precio, cantidad, etc.)
  const docsSignature = useMemo(() => {
    return detalles
      .map(
        (d) =>
          `${(d.codigo_ticket_balanza || "").trim()}::${(d.guia_remitente || "").trim()}::${(d.guia_transportista || "").trim()}`,
      )
      .filter((sig) => sig !== "::::")
      .join("||");
  }, [detalles]);

  // Verificar documentos duplicados SOLO cuando cambian los documentos (debounced a 800ms)
  useEffect(() => {
    if (!docsSignature) {
      setDocumentosDuplicados([]);
      return;
    }

    const tickets = Array.from(
      new Set(
        detalles
          .map((d) => d.codigo_ticket_balanza.trim())
          .filter((t) => t.length >= 3),
      ),
    );
    const guiasR = Array.from(
      new Set(
        detalles
          .map((d) => d.guia_remitente.trim())
          .filter((g) => g.length >= 3),
      ),
    );
    const guiasT = Array.from(
      new Set(
        detalles
          .map((d) => d.guia_transportista.trim())
          .filter((g) => g.length >= 3),
      ),
    );

    if (tickets.length === 0 && guiasR.length === 0 && guiasT.length === 0) {
      setDocumentosDuplicados([]);
      return;
    }

    const handler = setTimeout(async () => {
      try {
        const resp = await CompraCarbonService.verificarDocumentosDuplicados({
          id_proveedor: compra.id_proveedor,
          tickets,
          guias_remitente: guiasR,
          guias_transportista: guiasT,
          id_compra_carbon: compra.id_compra_carbon,
        });
        if (resp.success && resp.data) {
          setDocumentosDuplicados(resp.data);
        } else {
          setDocumentosDuplicados([]);
        }
      } catch (e) {
        console.error("Error al verificar documentos duplicados:", e);
      }
    }, 800);

    return () => clearTimeout(handler);
  }, [docsSignature, compra.id_proveedor, compra.id_compra_carbon]);

  const handleSubmit = async () => {
    setError(null);

    if (tipoDespacho === "recojo" && !idAlmacenProveedor) {
      setError(
        "Debe indicar de qué almacén del proveedor se va a recoger la carga",
      );
      return;
    }

    if (destinoTipo === "empresa" && !idAlmacenEmpresa) {
      setError("Debe seleccionar el almacén de la empresa de destino");
      return;
    }

    if (destinoTipo === "cliente" && !idAlmacenCliente) {
      setError("Debe seleccionar el almacén del cliente de destino");
      return;
    }

    if (!fechaHoraIngreso) {
      setError("Debe indicar la fecha y hora de ingreso de la carga");
      return;
    }

    if (detalles.length === 0) {
      setError("Debe registrar al menos un ítem o carga");
      return;
    }

    for (let i = 0; i < detalles.length; i++) {
      const d = detalles[i];
      const num = i + 1;
      if (!d.id_tipo_carbon) {
        setError(`El ítem #${num} no tiene tipo de carbón seleccionado`);
        return;
      }
      if (Number(d.cantidad) <= 0) {
        setError(
          `El ítem #${num} debe tener una cantidad en toneladas mayor a 0`,
        );
        return;
      }
      if (Number(d.precio_unitario) < 0) {
        setError(`El ítem #${num} debe tener un precio unitario válido`);
        return;
      }
      if (d.pagar_flete) {
        if (!d.id_transportista) {
          setError(
            `El ítem #${num} requiere seleccionar un transportista para el flete`,
          );
          return;
        }
        if (Number(d.costo_flete_por_tonelada) <= 0) {
          setError(`El ítem #${num} debe tener un costo de flete mayor a 0`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      // Subir evidencias si hay
      let evidenciasUrls = null;
      if (evidenciasFiles.length > 0) {
        evidenciasUrls = await subirArchivosCabecera(evidenciasFiles);
      }

      const payloadComun = {
        id_empresa: compra.id_empresa,
        id_proveedor: compra.id_proveedor,
        tipo_despacho: tipoDespacho,
        id_almacen_proveedor:
          tipoDespacho === "recojo" && idAlmacenProveedor
            ? Number(idAlmacenProveedor)
            : null,
        id_almacen:
          destinoTipo === "empresa" && idAlmacenEmpresa
            ? Number(idAlmacenEmpresa)
            : null,
        id_almacen_cliente:
          destinoTipo === "cliente" && idAlmacenCliente
            ? Number(idAlmacenCliente)
            : null,
        aplica_igv: aplicaIgv,
        porcentaje_igv: aplicaIgv ? Number(porcentajeIgv) : 0,
        fecha_hora_ingreso: toBackendDateTime(fechaHoraIngreso),
        evidencias: evidenciasUrls,
        detalles: detalles.map((d) => ({
          id_detalle_compra_carbon: d.id_detalle_compra_carbon,
          id_tipo_carbon: Number(d.id_tipo_carbon),
          id_lugar_extraccion: d.id_lugar_extraccion
            ? Number(d.id_lugar_extraccion)
            : null,
          id_tarifa_carbon: d.id_tarifa_carbon
            ? Number(d.id_tarifa_carbon)
            : null,
          placa: d.placa.trim(),
          guia_remitente: d.guia_remitente.trim(),
          guia_transportista: d.guia_transportista.trim() || null,
          pagar_flete: d.pagar_flete,
          codigo_ticket_balanza: d.codigo_ticket_balanza.trim(),
          cantidad: Number(d.cantidad),
          porcentaje_ceniza: Number(d.porcentaje_ceniza) || 0,
          porcentaje_humedad: Number(d.porcentaje_humedad) || 0,
          precio_unitario: Number(d.precio_unitario) || 0,
          costo_flete_por_tonelada: d.pagar_flete
            ? Number(d.costo_flete_por_tonelada) || 0
            : 0,
          id_transportista:
            d.pagar_flete && d.id_transportista
              ? Number(d.id_transportista)
              : null,
        })),
      };

      let resp;
      if (modo === "confirmar") {
        resp = await CompraCarbonService.confirmar(
          compra.id_compra_carbon,
          payloadComun,
        );
      } else {
        resp = await CompraCarbonService.actualizar(compra.id_compra_carbon, {
          ...payloadComun,
          motivo: motivoEdicion.trim() || null,
        });
      }

      if (!resp.success || !resp.data) {
        setError(resp.message || "Error al procesar la compra");
        return;
      }

      notifySuccess(
        modo === "confirmar"
          ? `Llegada de carga confirmada para ${compra.correlativo}`
          : `Compra ${compra.correlativo} actualizada exitosamente`,
      );
      onSuccess(resp.data);
    } catch (e) {
      console.error(e);
      setError("Ocurrió un error inesperado al guardar la compra");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alerta de duplicados */}
      {documentosDuplicados.length > 0 && (
        <Alert
          icon={<IconAlertTriangle className="w-5 h-5 text-amber-400" />}
          color="yellow"
          radius="lg"
          variant="light"
          title="Atención: Posibles Documentos Duplicados"
        >
          <Stack gap={4}>
            <Text size="xs">
              Se encontraron coincidencias de tickets o guías en compras
              anteriores de este proveedor:
            </Text>
            {documentosDuplicados.map((dup, i) => (
              <Text key={i} size="11px" c="amber.2" className="font-mono">
                •{" "}
                {dup.codigo_ticket_balanza
                  ? `Ticket: ${dup.codigo_ticket_balanza}`
                  : ""}{" "}
                {dup.guia_remitente
                  ? `| Guía Remitente: ${dup.guia_remitente}`
                  : ""}{" "}
                {dup.guia_transportista
                  ? `| Guía Transp.: ${dup.guia_transportista}`
                  : ""}{" "}
                — Registrado en compra:{" "}
                <span className="font-bold">{dup.correlativo}</span>
              </Text>
            ))}
          </Stack>
        </Alert>
      )}

      {error && (
        <Alert color="red" radius="lg" variant="light">
          <Text size="xs">{error}</Text>
        </Alert>
      )}

      {/* SECCIÓN 1: Despacho y Almacén */}
      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/40 border border-zinc-800"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Fila 1: 4 Selects */}
          <Select
            label="Tipo de Despacho"
            data={[
              { value: "envio", label: "Envío" },
              { value: "recojo", label: "Recojo" },
            ]}
            value={tipoDespacho}
            onChange={(val) =>
              setTipoDespacho((val as "envio" | "recojo") ?? "envio")
            }
            size="xs"
            radius="lg"
            classNames={inputClasses}
            leftSection={
              <IconTruckDelivery className="w-4 h-4 text-zinc-400" />
            }
            required
          />

          {tipoDespacho === "recojo" && (
            <Select
              label="Almacén de Recojo"
              placeholder={
                loadingProvAlmacenes
                  ? "Cargando almacenes del proveedor..."
                  : "Seleccionar almacén del proveedor"
              }
              data={almacenesProveedor.map((a) => ({
                value: String(a.id_almacen),
                label: a.direccion,
              }))}
              value={idAlmacenProveedor}
              onChange={setIdAlmacenProveedor}
              size="xs"
              radius="lg"
              classNames={inputClasses}
              searchable
              disabled={loadingProvAlmacenes}
              nothingFoundMessage={
                loadingProvAlmacenes
                  ? "Cargando..."
                  : "El proveedor no tiene almacenes registrados"
              }
              leftSection={<IconMapPin className="w-4 h-4 text-amber-500" />}
            />
          )}

          <Select
            label="Lugar de llegada"
            size="xs"
            value={destinoTipo}
            onChange={(val) => {
              if (val) setDestinoTipo(val as "empresa" | "cliente");
            }}
            data={[
              { value: "empresa", label: "Almacén de la Empresa" },
              { value: "cliente", label: "Almacén de un Cliente" },
            ]}
            allowDeselect={false}
            classNames={inputClasses}
            radius="lg"
          />

          {destinoTipo === "empresa" ? (
            <Select
              clearable
              label="Almacén de la empresa"
              placeholder={
                loadingEmpAlmacenes
                  ? "Cargando almacenes..."
                  : "Seleccionar almacén de recepción"
              }
              data={almacenesEmpresa.map((a) => ({
                value: String(a.id_almacen),
                label: `${a.nombre} (${a.direccion || "S/D"})`,
              }))}
              value={idAlmacenEmpresa}
              onChange={setIdAlmacenEmpresa}
              size="xs"
              radius="lg"
              classNames={inputClasses}
              searchable
              disabled={loadingEmpAlmacenes}
              nothingFoundMessage={
                loadingEmpAlmacenes
                  ? "Cargando..."
                  : "No hay almacenes disponibles"
              }
              leftSection={
                <IconBuildingStore className="w-4 h-4 text-zinc-400" />
              }
              required
            />
          ) : (
            <Select
              label="Almacén del cliente"
              placeholder={
                loadingCliAlmacenes
                  ? "Cargando almacenes de clientes..."
                  : "Seleccionar cliente y almacén"
              }
              data={almacenesCliente.map((a) => ({
                value: String(a.id_almacen),
                label: `${a.cliente_razon_social ?? "Cliente"} · ${a.direccion}`,
              }))}
              value={idAlmacenCliente}
              onChange={setIdAlmacenCliente}
              size="xs"
              radius="lg"
              classNames={inputClasses}
              searchable
              disabled={loadingCliAlmacenes}
              nothingFoundMessage={
                loadingCliAlmacenes
                  ? "Cargando..."
                  : "No hay almacenes de clientes registrados"
              }
              leftSection={
                <IconBuildingStore className="w-4 h-4 text-indigo-400" />
              }
              required
            />
          )}

          {/* Fila 2: Fecha, IGV Switch y % IGV */}
          <DateTimePicker
            label="Fecha y hora de ingreso"
            value={fechaHoraIngreso}
            onChange={(v) => {
              if (!v) setFechaHoraIngreso(null);
              else if (typeof v === "string") setFechaHoraIngreso(new Date(v));
              else setFechaHoraIngreso(v);
            }}
            size="xs"
            radius="lg"
            classNames={inputClasses}
            leftSection={<IconCalendar className="w-4 h-4 text-zinc-400" />}
            required
          />

          <div className="h-8 flex items-center">
            <Switch
              label="¿Aplica IGV?"
              checked={aplicaIgv}
              onChange={(e) => setAplicaIgv(e.currentTarget.checked)}
              color="indigo"
              size="sm"
            />
          </div>

          {aplicaIgv && (
            <NumberInput
              label="% IGV"
              value={porcentajeIgv}
              onChange={setPorcentajeIgv}
              min={0}
              max={100}
              size="xs"
              radius="lg"
              classNames={inputClasses}
            />
          )}
        </div>
      </Paper>

      {/* SECCIÓN 2: Detalles / Cargas */}
      <Stack>
        <Group justify="space-between">
          <Group gap="xs">
            <Text
              size="xs"
              fw={700}
              c="dimmed"
              className="uppercase tracking-wider"
            >
              Cargas ({detalles.length})
            </Text>
            {loadingDetalles && (
              <Group gap={6}>
                <Loader size={12} color="indigo" />
                <Text size="11px" c="dimmed">
                  Cargando información previa...
                </Text>
              </Group>
            )}
          </Group>
          <Button
            leftSection={<IconCirclePlus className="w-4 h-4" />}
            variant="light"
            color="indigo"
            size="xs"
            radius="lg"
            onClick={agregarDetalle}
            disabled={loadingDetalles}
          >
            Agregar otra carga
          </Button>
        </Group>

        <Stack gap="md">
          {detalles.map((item, index) => {
            const isExpanded = Boolean(detallesExpandidos[index]);
            const subtotalItemAntes =
              Math.round(
                (Number(item.cantidad) || 0) *
                  (Number(item.precio_unitario) || 0) *
                  100,
              ) / 100;
            const fleteItem = item.pagar_flete
              ? Math.round(
                  (Number(item.cantidad) || 0) *
                    (Number(item.costo_flete_por_tonelada) || 0) *
                    100,
                ) / 100
              : 0;
            const subtotalItemNeto =
              Math.round((subtotalItemAntes - fleteItem) * 100) / 100;

            const tipoNombre =
              tipos.find((t) => t.id_tipo_carbon === item.id_tipo_carbon)
                ?.nombre ?? "Sin tipo";

            return (
              <div
                key={index}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden transition-all"
              >
                {/* Cabecera del item colapsable */}
                <div
                  className="p-3 bg-zinc-900/40 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40 transition-colors"
                  onClick={() =>
                    setDetallesExpandidos((prev) => ({
                      ...prev,
                      [index]: !prev[index],
                    }))
                  }
                >
                  <Group gap="sm">
                    <ActionIcon variant="subtle" size="sm" color="gray">
                      {isExpanded ? (
                        <IconChevronDown className="w-4 h-4" />
                      ) : (
                        <IconChevronRight className="w-4 h-4" />
                      )}
                    </ActionIcon>
                    <Badge color="indigo" variant="light" size="sm">
                      Carga #{index + 1}
                    </Badge>
                    <Text size="xs" fw={700} c="white">
                      {tipoNombre}
                    </Text>
                    {item.placa && (
                      <Badge color="gray" variant="outline" size="xs">
                        {item.placa}
                      </Badge>
                    )}
                    {item.codigo_ticket_balanza && (
                      <Badge color="cyan" variant="outline" size="xs">
                        Ticket: {item.codigo_ticket_balanza}
                      </Badge>
                    )}
                  </Group>

                  <Group gap="md">
                    <Text
                      size="xs"
                      c="emerald.4"
                      fw={700}
                      className="font-mono"
                    >
                      {formatPEN(subtotalItemNeto)}
                    </Text>
                    {detalles.length > 1 && (
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarDetalle(index);
                        }}
                      >
                        <IconTrash className="w-4 h-4" />
                      </ActionIcon>
                    )}
                  </Group>
                </div>

                {/* Formulario expandido del ítem */}
                <Collapse in={isExpanded}>
                  <div className="p-4 space-y-4 border-t border-zinc-800/80">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Select
                        label="Tipo de Carbón"
                        placeholder={
                          loadingTipos
                            ? "Cargando tipos de carbón..."
                            : "Seleccionar"
                        }
                        data={tipos.map((t) => ({
                          value: String(t.id_tipo_carbon),
                          label: `${t.nombre}${t.codigo ? ` (${t.codigo})` : ""}`,
                        }))}
                        value={
                          item.id_tipo_carbon
                            ? String(item.id_tipo_carbon)
                            : null
                        }
                        onChange={(val) =>
                          updateDetalle(index, {
                            id_tipo_carbon: val ? Number(val) : null,
                          })
                        }
                        size="xs"
                        radius="lg"
                        classNames={inputClasses}
                        searchable
                        disabled={loadingTipos}
                        nothingFoundMessage={
                          loadingTipos
                            ? "Cargando..."
                            : "No hay tipos de carbón disponibles"
                        }
                        required
                      />

                      <Select
                        label="Lugar de Extracción"
                        placeholder={
                          loadingLugares
                            ? "Cargando lugares..."
                            : "Lugar del proveedor"
                        }
                        data={lugaresProveedor.map((l) => ({
                          value: String(l.id_lugar_extraccion),
                          label: `${l.direccion}${l.distrito_nombre ? ` (${l.distrito_nombre})` : ""}`,
                        }))}
                        value={
                          item.id_lugar_extraccion
                            ? String(item.id_lugar_extraccion)
                            : null
                        }
                        onChange={(val) =>
                          updateDetalle(index, {
                            id_lugar_extraccion: val ? Number(val) : null,
                          })
                        }
                        size="xs"
                        radius="lg"
                        classNames={inputClasses}
                        searchable
                        disabled={loadingLugares}
                        nothingFoundMessage={
                          loadingLugares
                            ? "Cargando..."
                            : "El proveedor no tiene lugares registrados"
                        }
                      />

                      <TextInput
                        label="Placa del Vehículo"
                        placeholder="Ej. ABC-123"
                        value={item.placa}
                        onChange={(e) =>
                          updateDetalle(index, {
                            placa: e.currentTarget.value.toUpperCase(),
                          })
                        }
                        size="xs"
                        radius="lg"
                        classNames={inputClasses}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <TextInput
                        label="Ticket de Balanza"
                        placeholder="Código de ticket"
                        value={item.codigo_ticket_balanza}
                        onChange={(e) =>
                          updateDetalle(index, {
                            codigo_ticket_balanza: e.currentTarget.value,
                          })
                        }
                        size="xs"
                        radius="lg"
                        classNames={inputClasses}
                        required
                      />

                      <TextInput
                        label="Guía Remitente (Opcional)"
                        placeholder="Ej. T001-000123"
                        value={item.guia_remitente}
                        onChange={(e) =>
                          updateDetalle(index, {
                            guia_remitente: e.currentTarget.value,
                          })
                        }
                        size="xs"
                        radius="lg"
                        classNames={inputClasses}
                      />

                      <TextInput
                        label="Guía Transportista (Opcional)"
                        placeholder="Ej. V001-000456"
                        value={item.guia_transportista}
                        onChange={(e) =>
                          updateDetalle(index, {
                            guia_transportista: e.currentTarget.value,
                          })
                        }
                        size="xs"
                        radius="lg"
                        classNames={inputClasses}
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <NumberInput
                        label="Cantidad (TM)"
                        placeholder="0.00"
                        value={item.cantidad}
                        onChange={(val) =>
                          updateDetalle(index, { cantidad: Number(val) || 0 })
                        }
                        size="xs"
                        radius="lg"
                        classNames={inputClasses}
                        required
                      />

                      <NumberInput
                        label="% Ceniza"
                        placeholder="0.00"
                        value={item.porcentaje_ceniza}
                        onChange={(val) =>
                          updateDetalle(index, {
                            porcentaje_ceniza: Number(val) || 0,
                          })
                        }
                        max={100}
                        size="xs"
                        radius="lg"
                        classNames={inputClasses}
                      />

                      <NumberInput
                        label="% Humedad"
                        placeholder="0.00"
                        value={item.porcentaje_humedad}
                        onChange={(val) =>
                          updateDetalle(index, {
                            porcentaje_humedad: Number(val) || 0,
                          })
                        }
                        max={100}
                        size="xs"
                        radius="lg"
                        classNames={inputClasses}
                      />

                      <NumberInput
                        label="Precio / TM"
                        placeholder="0.00"
                        value={item.precio_unitario}
                        onChange={(val) =>
                          updateDetalle(index, {
                            precio_unitario: Number(val) || 0,
                          })
                        }
                        size="xs"
                        radius="lg"
                        classNames={inputClasses}
                        required
                      />
                    </div>

                    {/* Indicador de Tarifa aplicada según % de ceniza */}
                    {item.id_tipo_carbon && item.porcentaje_ceniza > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {(() => {
                          const tarifa = tarifaPara(
                            item.id_tipo_carbon,
                            item.porcentaje_ceniza,
                          );
                          if (tarifa) {
                            return (
                              <Badge
                                color="teal"
                                variant="light"
                                size="sm"
                                radius="md"
                                leftSection={
                                  <IconTag
                                    size={12}
                                    className="text-teal-400"
                                  />
                                }
                              >
                                {`Tarifa aplicada: ${tarifa.inicio_porcentaje_ceniza}% - ${tarifa.fin_porcentaje_ceniza}% ceniza · S/ ${formatNumber(
                                  Number(tarifa.precio_unitario),
                                )}/TM`}
                              </Badge>
                            );
                          }
                          return (
                            <>
                              <Badge
                                color="yellow"
                                variant="light"
                                size="sm"
                                radius="md"
                                leftSection={
                                  <IconAlertTriangle
                                    size={12}
                                    className="text-yellow-400"
                                  />
                                }
                              >
                                {`Sin tarifa para ${formatNumber(item.porcentaje_ceniza)}% ceniza (precio editable)`}
                              </Badge>
                              <Button
                                variant="subtle"
                                color="indigo"
                                size="compact-xs"
                                radius="lg"
                                leftSection={<IconCirclePlus size={14} />}
                                onClick={() => {
                                  setTargetTarifaIdx(index);
                                  setOpenNuevaTarifa(true);
                                }}
                                className="font-semibold text-xs h-6"
                              >
                                Crear tarifa
                              </Button>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* Flete */}
                    <div className="p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/60">
                      <Group
                        justify="space-between"
                        mb={item.pagar_flete ? "xs" : 0}
                      >
                        <Switch
                          label="¿Se pagará flete por esta carga?"
                          checked={item.pagar_flete}
                          onChange={(e) =>
                            updateDetalle(index, {
                              pagar_flete: e.currentTarget.checked,
                            })
                          }
                          color="indigo"
                          size="xs"
                        />
                        {item.pagar_flete && (
                          <Text size="xs" c="amber.4" className="font-mono">
                            Flete total: −{formatPEN(fleteItem)}
                          </Text>
                        )}
                      </Group>

                      {item.pagar_flete && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                          <Select
                            label="Empresa Transportista"
                            placeholder={
                              loadingTransportistas
                                ? "Cargando transportistas..."
                                : "Seleccionar transportista"
                            }
                            data={transportistas.map((t) => ({
                              value: String(t.id_transportista),
                              label: `${t.razon_social} (${t.ruc ? `RUC ${t.ruc}` : `DNI ${t.dni}`})`,
                            }))}
                            value={
                              item.id_transportista
                                ? String(item.id_transportista)
                                : null
                            }
                            onChange={(val) =>
                              updateDetalle(index, {
                                id_transportista: val ? Number(val) : null,
                              })
                            }
                            size="xs"
                            radius="lg"
                            classNames={inputClasses}
                            searchable
                            disabled={loadingTransportistas}
                            nothingFoundMessage={
                              loadingTransportistas
                                ? "Cargando..."
                                : "No hay transportistas registrados"
                            }
                            required
                          />

                          <NumberInput
                            label="Costo Flete / TM"
                            placeholder="0.00"
                            value={item.costo_flete_por_tonelada}
                            onChange={(val) =>
                              updateDetalle(index, {
                                costo_flete_por_tonelada: Number(val) || 0,
                              })
                            }
                            size="xs"
                            radius="lg"
                            classNames={inputClasses}
                            required
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </Collapse>
              </div>
            );
          })}
        </Stack>
      </Stack>

      <div className="grid grid-cols-3 gap-4">
        {/* Resumen de totales */}
        <Paper
          p="md"
          radius="lg"
          className="bg-zinc-950/80 border border-zinc-800 space-y-0.5 col-span-1"
        >
          <div className="flex justify-between items-center text-xs">
            <Text c="zinc.4" size="sm">
              Total sin descuento:
            </Text>
            <Text fw={700} className="font-mono text-white" size="sm">
              {formatPEN(totalesCalculados.totalAntesDescuento)}
            </Text>
          </div>
          {totalesCalculados.descuentoFleteTotal > 0 && (
            <div className="flex justify-between items-center text-xs">
              <Text size="sm" c="amber.4">
                (−) Descuento por flete:
              </Text>
              <Text fw={700} c="amber.4" className="font-mono" size="sm">
                −{formatPEN(totalesCalculados.descuentoFleteTotal)}
              </Text>
            </div>
          )}
          {aplicaIgv && (
            <div className="flex justify-between items-center text-xs">
              <Text size="sm" c="indigo.3">
                (+) IGV ({porcentajeIgv}%):
              </Text>
              <Text fw={700} size="sm" c="indigo.3" className="font-mono">
                +{formatPEN(totalesCalculados.montoIgv)}
              </Text>
            </div>
          )}
          <Divider color="zinc.8" my={2} />
          <div className="flex justify-between items-center">
            <Text
              fw={800}
              size="sm"
              c="white"
              className="uppercase tracking-wider"
            >
              Total Neto:
            </Text>
            <Text fw={900} size="md" c="green.4" className="font-mono">
              {formatPEN(totalesCalculados.totalNetoProveedor)}
            </Text>
          </div>
        </Paper>

        {/* Evidencias de cabecera */}
        <Paper
          p="md"
          radius="lg"
          className="bg-zinc-900/40 border border-zinc-800 col-span-2"
        >
          <MultiFilePicker
            files={evidenciasFiles}
            onFilesChange={setEvidenciasFiles}
            label="Adjuntar fotos de ticket, guías o evidencias de la carga"
          />
        </Paper>
      </div>

      {modo === "editar" && (
        <Paper
          p="md"
          radius="lg"
          className="bg-zinc-900/40 border border-zinc-800"
        >
          <TextInput
            label="Motivo de la edición (para trazabilidad en log)"
            placeholder="Ej. Corrección de pesaje de ticket o actualización de tarifas"
            value={motivoEdicion}
            onChange={(e) => setMotivoEdicion(e.currentTarget.value)}
            size="xs"
            radius="lg"
            classNames={inputClasses}
          />
        </Paper>
      )}

      {/* Botones de acción */}
      <Group justify="flex-end" gap="sm" pt="xs">
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          radius="lg"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button
          variant="filled"
          color={modo === "confirmar" ? "green" : "indigo"}
          size="xs"
          radius="lg"
          onClick={handleSubmit}
          loading={saving || loadingDetalles}
          leftSection={<IconCheck className="w-4 h-4" />}
        >
          {modo === "confirmar"
            ? "Confirmar Llegada"
            : "Guardar Modificaciones"}
        </Button>
      </Group>

      {/* Modal: Nueva tarifa de carbón */}
      <ModalEstandar
        opened={openNuevaTarifa}
        close={() => {
          setOpenNuevaTarifa(false);
          setTargetTarifaIdx(null);
        }}
        title="Nueva Tarifa de Carbón"
        size="md"
      >
        <FormTarifaCarbon
          idTipoCarbonInicial={
            targetTarifaIdx !== null
              ? (detalles[targetTarifaIdx]?.id_tipo_carbon ?? null)
              : null
          }
          cenizaReferenciaInicial={
            targetTarifaIdx !== null
              ? (detalles[targetTarifaIdx]?.porcentaje_ceniza ?? 0)
              : 0
          }
          onSuccess={(nueva) => {
            setTarifas((prev) => [...prev, nueva]);
            if (targetTarifaIdx !== null) {
              updateDetalle(targetTarifaIdx, {
                id_tarifa_carbon: nueva.id_tarifa_carbon,
                precio_unitario: Number(nueva.precio_unitario),
              });
            }
            setOpenNuevaTarifa(false);
            setTargetTarifaIdx(null);
          }}
          onCancel={() => {
            setOpenNuevaTarifa(false);
            setTargetTarifaIdx(null);
          }}
        />
      </ModalEstandar>
    </div>
  );
};
