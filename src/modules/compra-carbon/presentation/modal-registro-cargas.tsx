import { useEffect, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconTruck,
  IconMapPin,
  IconScale,
  IconReceipt,
  IconCoins,
  IconAlertTriangle,
  IconEye,
} from "@tabler/icons-react";
import dayjs from "dayjs";

import { useNotify } from "../../../hooks/useNotify";
import { AuxService } from "../../../service/auxiliar.service";
import { TipoCarbonService } from "../../tipo-carbon/service/tipo-carbon.service";
import { ProveedoresService } from "../../proveedores/service/proveedores.service";
import { ClientesService } from "../../clientes/service/clientes.service";
import { CompraCarbonService } from "../service/compra-carbon.service";
import type { CargaFormItem } from "../service/compra-carbon.requests";
import type { CompraCarbonResumen } from "../service/compra-carbon.responses";
import type { RES_TipoCarbon } from "../../tipo-carbon/service/tipo-carbon.responses";
import type { RES_Almacen } from "../../../service/responses/almacen";
import type { RES_LugarExtraccionCarbon } from "../../../service/responses/lugar-extraccion-carbon";
import type { RES_Transportista } from "../../../service/responses/transportista";
import type { RES_TarifaCarbon } from "../../../service/responses/tarifa-carbon";
import { formatNumber } from "../../../shared/functions/formatNumber";
import {
  colorCalidadCarbon,
  resolverCalidadCarbon,
} from "../../../shared/functions/calidad-carbon";
import { MultiFilePicker } from "../../../presentation/utils/archivo/multifile-picker";
import { FormTarifaCarbon } from "../../../presentation/utils/form-tarifa-carbon";
import { FormTransportista } from "../../../presentation/utils/form-transportista";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import { round2 } from "./components/input-classes";
import type { RES_CalidadCarbon } from "../../tipo-carbon/service/tipo-carbon.responses";
import type { CargaCompraCarbonItem } from "../service/compra-carbon.responses";

interface Props {
  compra: CompraCarbonResumen;
  onSuccess: () => void;
  onCancel: () => void;
  /**
   * Si viene definida, el modal entra en modo edicion para esa carga.
   * El backend hace la reversión/aplicación de stock + kardex en una sola
   * transaccion. Solo se puede editar si la carga NO esta Anulada ni
   * Pagada, y si NO tiene comprobante / pago / comprobante de flete
   * asignado.
   */
  cargaInicial?: CargaCompraCarbonItem | null;
}

const inputClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
  dropdown:
    "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
  option:
    "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors",
  label: "text-zinc-300 mb-1 font-semibold tracking-tight",
};

interface CargaFormState extends CargaFormItem {
  id_almacen_tipo_destino: "empresa" | "cliente";
}

/**
 * Fila etiqueta/valor de los bloques de costo de una carga.
 */
const FilaCosto = ({
  etiqueta,
  valor,
  sufijo,
  destacado = false,
  color = "zinc.200",
}: {
  etiqueta: string;
  valor: number;
  sufijo?: string;
  destacado?: boolean;
  color?: string;
}) => (
  <Group justify="space-between" gap="xs" wrap="nowrap">
    <Text
      size="xs"
      c={destacado ? "zinc.300" : "dimmed"}
      fw={destacado ? 700 : 500}
    >
      {etiqueta}
    </Text>
    <Text size="xs" fw={destacado ? 800 : 700} c={color} className="font-mono">
      {`S/ ${formatNumber(valor)}${sufijo ? ` ${sufijo}` : ""}`}
    </Text>
  </Group>
);

export const ModalRegistroCargas = ({
  compra,
  onSuccess,
  onCancel,
  cargaInicial,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  const [tipos, setTipos] = useState<RES_TipoCarbon[]>([]);
  const [almacenesEmpresa, setAlmacenesEmpresa] = useState<RES_Almacen[]>([]);
  const [lugaresExtraccion, setLugaresExtraccion] = useState<
    RES_LugarExtraccionCarbon[]
  >([]);
  const [almacenesProveedor, setAlmacenesProveedor] = useState<
    { id: number; direccion: string }[]
  >([]);
  const [almacenesCliente, setAlmacenesCliente] = useState<
    { id: number; direccion: string; cliente: string }[]
  >([]);
  const [transportistas, setTransportistas] = useState<RES_Transportista[]>([]);
  const [calidades, setCalidades] = useState<RES_CalidadCarbon[]>([]);

  const [loadingTipos, setLoadingTipos] = useState(true);
  const [tarifas, setTarifas] = useState<RES_TarifaCarbon[]>([]);
  const [openNuevaTarifa, setOpenNuevaTarifa] = useState(false);
  const [targetTarifaIdx, setTargetTarifaIdx] = useState<number | null>(null);

  // Modal para registrar un nuevo transportista (boton "+").
  const [openNuevoTransportista, setOpenNuevoTransportista] = useState(false);
  const [targetTransportistaIdx, setTargetTransportistaIdx] = useState<
    number | null
  >(null);

  // Modal que lista las tarifas del tipo de carbon seleccionado.
  const [openListadoTarifas, setOpenListadoTarifas] = useState(false);
  const [targetTarifasListadoIdx, setTargetTarifasListadoIdx] = useState<
    number | null
  >(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esEdicionCarga = Boolean(cargaInicial);

  // Inicializar con 1 carga por defecto (modo registro) o con la carga
  // inicial precargada (modo edicion de una carga individual).
  const [cargas, setCargas] = useState<CargaFormState[]>(() => {
    if (cargaInicial) {
      const tipoDestino = cargaInicial.id_almacen_cliente_llegada
        ? "cliente"
        : "empresa";
      return [
        {
          id_tipo_carbon: cargaInicial.id_tipo_carbon,
          tipo_despacho: (cargaInicial.tipo_despacho as "Envio" | "Recojo") || "Envio",
          id_almacen_tipo_destino: tipoDestino,
          id_almacen_empresa_llegada: cargaInicial.id_almacen_empresa_llegada
            ? Number(cargaInicial.id_almacen_empresa_llegada)
            : null,
          id_almacen_cliente_llegada: cargaInicial.id_almacen_cliente_llegada
            ? Number(cargaInicial.id_almacen_cliente_llegada)
            : null,
          id_almacen_proveedor_recojo: cargaInicial.id_almacen_proveedor_recojo
            ? Number(cargaInicial.id_almacen_proveedor_recojo)
            : null,
          id_lugar_extraccion: cargaInicial.id_lugar_extraccion
            ? Number(cargaInicial.id_lugar_extraccion)
            : null,
          placa: cargaInicial.placa ?? "",
          fecha_hora_ingreso: cargaInicial.fecha_hora_ingreso
            ? dayjs(cargaInicial.fecha_hora_ingreso).format("YYYY-MM-DDTHH:mm")
            : dayjs().format("YYYY-MM-DDTHH:mm"),
          guia_remitente: cargaInicial.guia_remitente ?? "",
          guia_transportista: cargaInicial.guia_transportista ?? "",
          codigo_ticket_balanza: cargaInicial.codigo_ticket_balanza ?? "",
          cantidad: Number(cargaInicial.cantidad) || 0,
          porcentaje_ceniza: Number(cargaInicial.porcentaje_ceniza) || 0,
          porcentaje_humedad: Number(cargaInicial.porcentaje_humedad) || 0,
          precio_unitario: Number(cargaInicial.precio_unitario) || 0,
          pagar_flete: Boolean(cargaInicial.pagar_flete),
          id_transportista: cargaInicial.id_transportista
            ? Number(cargaInicial.id_transportista)
            : null,
          costo_flete_por_tonelada: Number(cargaInicial.costo_flete_por_tonelada) || 0,
          id_tarifa_carbon: cargaInicial.id_tarifa_carbon
            ? Number(cargaInicial.id_tarifa_carbon)
            : null,
          archivos: [],
        },
      ];
    }
    return [
      {
        id_tipo_carbon: compra.id_tipo_carbon_prometido,
        tipo_despacho: "Envio",
        id_almacen_tipo_destino: "empresa",
        id_almacen_empresa_llegada: null,
        id_almacen_cliente_llegada: null,
        id_almacen_proveedor_recojo: null,
        id_lugar_extraccion: null,
        placa: "",
        fecha_hora_ingreso: dayjs().format("YYYY-MM-DDTHH:mm"),
        guia_remitente: "",
        guia_transportista: "",
        codigo_ticket_balanza: "",
        cantidad: 0,
        porcentaje_ceniza: 0,
        porcentaje_humedad: 0,
        precio_unitario: Number(compra.precio_unitario_cotizado || 0),
        pagar_flete: false,
        id_transportista: null,
        costo_flete_por_tonelada: 0,
        id_tarifa_carbon: null,
        archivos: [],
      },
    ];
  });

  // Carga de catálogos necesarios
  useEffect(() => {
    let cancel = false;
    setLoadingTipos(true);
    (async () => {
      try {
        const [tiposRes, almRes, lugRes, transRes, tarifasRes, calRes] =
          await Promise.all([
            TipoCarbonService.getTipos({ id_proveedor: compra.id_proveedor }),
            AuxService.get_almacenes({ para_carbon: true }),
            AuxService.get_lugares_extraccion_carbon(compra.id_proveedor),
            AuxService.get_transportistas(),
            AuxService.get_tarifas_carbon(),
            TipoCarbonService.getCalidades(),
          ]);
        if (cancel) return;

        if (tiposRes.success && tiposRes.data) setTipos(tiposRes.data);
        if (calRes.success && calRes.data) setCalidades(calRes.data);
        if (tarifasRes.success && tarifasRes.data) {
          const tList: RES_TarifaCarbon[] = Array.isArray(tarifasRes.data)
            ? tarifasRes.data
            : [tarifasRes.data];
          setTarifas(tList);
        }
        if (almRes.success && almRes.data) {
          setAlmacenesEmpresa(almRes.data);
          // Si hay almacén empresa y primera carga no tiene, asignar el primero
          if (almRes.data.length > 0) {
            setCargas((prev) =>
              prev.map((c, i) =>
                i === 0 && !c.id_almacen_empresa_llegada
                  ? {
                      ...c,
                      id_almacen_empresa_llegada: almRes.data![0].id_almacen,
                    }
                  : c,
              ),
            );
          }
        }
        if (lugRes.success && lugRes.data) setLugaresExtraccion(lugRes.data);
        if (transRes.success && transRes.data) {
          const tList: RES_Transportista[] = Array.isArray(transRes.data)
            ? transRes.data
            : [transRes.data];
          setTransportistas(tList);
        }

        // Almacenes del proveedor
        try {
          const almProvRes =
            await ProveedoresService.getAlmacenesCarbonPorProveedor(
              compra.id_proveedor,
            );
          if (!cancel && almProvRes.success && almProvRes.data) {
            setAlmacenesProveedor(
              almProvRes.data.map((a) => ({
                id: a.id_almacen,
                direccion: a.direccion,
              })),
            );
          }
        } catch (e) {
          console.error("Error fetching almacenes proveedor:", e);
        }

        // Almacenes de clientes
        try {
          const almCliRes = await ClientesService.getAlmacenesCarbonTodos();
          if (!cancel && almCliRes.success && almCliRes.data) {
            setAlmacenesCliente(
              almCliRes.data.map((a) => ({
                id: a.id_almacen,
                direccion: a.direccion,
                cliente: a.cliente_razon_social || "Cliente",
              })),
            );
          }
        } catch (e) {
          console.error("Error fetching almacenes clientes:", e);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancel) setLoadingTipos(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [compra.id_proveedor]);

  // Obtener la tarifa correspondiente al tipo de carbón y % de ceniza
  const tarifaPara = (
    idTipo: number | null,
    ceniza: number,
  ): RES_TarifaCarbon | null => {
    if (!idTipo || !ceniza || ceniza <= 0) return null;
    return (
      tarifas.find(
        (t) =>
          Number(t.id_tipo_carbon) === Number(idTipo) &&
          (t.estado ?? "Activo") === "Activo" &&
          ceniza >= Number(t.inicio_porcentaje_ceniza) &&
          ceniza <= Number(t.fin_porcentaje_ceniza),
      ) ?? null
    );
  };

  const handleAgregarCarga = () => {
    setCargas((prev) => [
      ...prev,
      {
        id_tipo_carbon: compra.id_tipo_carbon_prometido,
        tipo_despacho: "Envio",
        id_almacen_tipo_destino: "empresa",
        id_almacen_empresa_llegada:
          almacenesEmpresa.length > 0 ? almacenesEmpresa[0].id_almacen : null,
        id_almacen_cliente_llegada: null,
        id_almacen_proveedor_recojo: null,
        id_lugar_extraccion: null,
        placa: "",
        fecha_hora_ingreso: dayjs().format("YYYY-MM-DDTHH:mm"),
        guia_remitente: "",
        guia_transportista: "",
        codigo_ticket_balanza: "",
        cantidad: 0,
        porcentaje_ceniza: 0,
        porcentaje_humedad: 0,
        precio_unitario: Number(compra.precio_unitario_cotizado || 0),
        pagar_flete: false,
        id_transportista: null,
        costo_flete_por_tonelada: 0,
        id_tarifa_carbon: null,
        archivos: [],
      },
    ]);
  };

  const handleEliminarCarga = (index: number) => {
    if (cargas.length === 1) return;
    setCargas((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChangeCarga = <K extends keyof CargaFormState>(
    index: number,
    field: K,
    val: CargaFormState[K],
  ) => {
    setCargas((prev) => {
      const copia = [...prev];
      const actual = { ...copia[index], [field]: val };

      // Si cambió porcentaje de ceniza o tipo de carbón, autoseleccionar tarifa
      if (field === "porcentaje_ceniza" || field === "id_tipo_carbon") {
        const ceniza =
          field === "porcentaje_ceniza"
            ? Number(val)
            : Number(actual.porcentaje_ceniza);
        const tipoId =
          field === "id_tipo_carbon"
            ? val
              ? Number(val)
              : null
            : actual.id_tipo_carbon
              ? Number(actual.id_tipo_carbon)
              : null;

        if (tipoId && ceniza > 0) {
          const tarifaCoincide = tarifaPara(tipoId, ceniza);
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

      copia[index] = actual;
      return copia;
    });
  };

  const handleSubmit = async () => {
    setError(null);
    for (let i = 0; i < cargas.length; i++) {
      const c = cargas[i];
      if (!c.id_tipo_carbon) {
        setError(`Carga #${i + 1}: Debe seleccionar el tipo de carbón`);
        return;
      }
      if (Number(c.cantidad) <= 0) {
        setError(`Carga #${i + 1}: Ingrese una cantidad válida de toneladas`);
        return;
      }
      if (!c.placa.trim()) {
        setError(`Carga #${i + 1}: Ingrese la placa del vehículo`);
        return;
      }
      if (!c.codigo_ticket_balanza.trim()) {
        setError(`Carga #${i + 1}: Ingrese el código de ticket de balanza`);
        return;
      }
      if (
        c.pagar_flete &&
        (!c.id_transportista || Number(c.costo_flete_por_tonelada) <= 0)
      ) {
        setError(
          `Carga #${i + 1}: Especifique transportista y costo de flete por tonelada`,
        );
        return;
      }
    }

    setSaving(true);
    try {
      const payloads: CargaFormItem[] = cargas.map((c) => ({
        id_tipo_carbon: Number(c.id_tipo_carbon),
        id_lugar_extraccion: c.id_lugar_extraccion
          ? Number(c.id_lugar_extraccion)
          : null,
        tipo_despacho: c.tipo_despacho,
        id_almacen_proveedor_recojo:
          c.tipo_despacho === "Recojo" && c.id_almacen_proveedor_recojo
            ? Number(c.id_almacen_proveedor_recojo)
            : null,
        id_almacen_empresa_llegada:
          c.id_almacen_tipo_destino === "empresa" &&
          c.id_almacen_empresa_llegada
            ? Number(c.id_almacen_empresa_llegada)
            : null,
        id_almacen_cliente_llegada:
          c.id_almacen_tipo_destino === "cliente" &&
          c.id_almacen_cliente_llegada
            ? Number(c.id_almacen_cliente_llegada)
            : null,
        placa: c.placa.trim(),
        fecha_hora_ingreso: c.fecha_hora_ingreso,
        guia_remitente: c.guia_remitente.trim(),
        guia_transportista: c.guia_transportista?.trim() || null,
        pagar_flete: c.pagar_flete,
        id_transportista:
          c.pagar_flete && c.id_transportista
            ? Number(c.id_transportista)
            : null,
        costo_flete_por_tonelada: c.pagar_flete
          ? Number(c.costo_flete_por_tonelada)
          : 0,
        codigo_ticket_balanza: c.codigo_ticket_balanza.trim(),
        cantidad: Number(c.cantidad),
        porcentaje_ceniza: Number(c.porcentaje_ceniza) || 0,
        porcentaje_humedad: Number(c.porcentaje_humedad) || 0,
        precio_unitario: Number(c.precio_unitario) || 0,
        id_tarifa_carbon: c.id_tarifa_carbon
          ? Number(c.id_tarifa_carbon)
          : null,
        archivos: c.archivos,
      }));

      // Modo edicion: una sola carga, llamada directa a actualizarCarga.
      if (esEdicionCarga && cargaInicial) {
        const payload = payloads[0];
        const res = await CompraCarbonService.actualizarCarga(
          compra.id_compra_carbon,
          cargaInicial.id_carga_compra_carbon,
          payload,
        );
        if (res.success) {
          notifySuccess("Carga actualizada correctamente");
          onSuccess();
        } else {
          setError(res.message || "Error al actualizar la carga");
          notifyError(res.message || "Error al actualizar la carga");
        }
        return;
      }

      const res = await CompraCarbonService.registrarCargas(
        compra.id_compra_carbon,
        payloads,
      );

      if (res.success) {
        notifySuccess("Cargas registradas con éxito e ingresadas al almacén");
        onSuccess();
      } else {
        setError(res.message || "Error al registrar las cargas");
        notifyError(res.message || "Error al registrar cargas");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      setError(msg);
      notifyError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Porcentajes de la compra (CompraCarbon) que gobiernan el IGV y la
  // detraccion, tanto del carbon como del flete.
  const pctIgv = Number(compra.porcentaje_igv) || 0;
  const pctDetraccion = Number(compra.porcentaje_detraccion) || 0;
  const pctIgvFlete = Number(compra.porcentaje_igv_flete) || 0;
  const pctDetraccionFlete = Number(compra.porcentaje_detraccion_flete) || 0;

  return (
    <Stack gap="md">
      {error && (
        <Alert color="red" variant="light" title="Atención" radius="md">
          {error}
        </Alert>
      )}

      {/* Impuestos de la orden: se leen de la compra a la que pertenece la
          carga. No son un parametro del registro. */}
      <Group justify="space-between">
        <Group gap="xs">
          <Text size="xs" c="dimmed">
            Aplicado por la orden:
          </Text>
          <Badge color="indigo" variant="light" size="sm">
            IGV {formatNumber(Number(compra.porcentaje_igv || 0))}%
          </Badge>
          <Badge
            color={
              Number(compra.porcentaje_detraccion || 0) > 0 ? "orange" : "gray"
            }
            variant="light"
            size="sm"
          >
            Detracción {formatNumber(Number(compra.porcentaje_detraccion || 0))}
            %
          </Badge>
          {/* <Badge color="blue" variant="light" size="sm">
            IGV flete {formatNumber(Number(compra.porcentaje_igv_flete || 0))}%
          </Badge> */}
          <Badge color="cyan" variant="light" size="sm">
            Detracción flete{" "}
            {formatNumber(Number(compra.porcentaje_detraccion_flete || 0))}%
          </Badge>
        </Group>
        <Button
          size="xs"
          radius="lg"
          variant="light"
          color="indigo"
          leftSection={<IconPlus size={16} />}
          onClick={handleAgregarCarga}
          disabled={saving}
        >
          Añadir otra carga
        </Button>
      </Group>

      {/* Lista de cargas a ingresar */}
      <Stack gap="lg">
        {cargas.map((carga, index) => {
          // Mismo criterio que aplica el backend al registrar la carga
          // (CompraCarbonData::insert_cargas), con los porcentajes de la
          // compra a la que pertenece.
          const cantidad = Number(carga.cantidad) || 0;
          const precioUnitario = Number(carga.precio_unitario) || 0;
          const costoFleteTn = carga.pagar_flete
            ? Number(carga.costo_flete_por_tonelada) || 0
            : 0;

          // ── COSTOS DEL CARBON ──────────────────────────────────────
          // El flete lo asume la empresa, asi que sale del precio unitario
          // que se le reconoce al proveedor por el carbon.
          const precioMateriaPrima = Math.max(
            0,
            Math.round((precioUnitario - costoFleteTn) * 1e6) / 1e6,
          );
          const subtotalCarga = round2(precioMateriaPrima * cantidad);
          const montoIgv =
            pctIgv > 0 ? round2((subtotalCarga * pctIgv) / 100) : 0;
          const totalCarga = round2(subtotalCarga + montoIgv);
          const montoDetraccion =
            pctDetraccion > 0 ? round2((totalCarga * pctDetraccion) / 100) : 0;
          const netoAPagar = round2(totalCarga - montoDetraccion);

          // ── COSTOS DE TRANSPORTE ────────────────────────────────────
          const fleteSubtotal = carga.pagar_flete
            ? round2(cantidad * costoFleteTn)
            : 0;
          const fleteIgv =
            pctIgvFlete > 0 ? round2((fleteSubtotal * pctIgvFlete) / 100) : 0;
          const fleteTotal = round2(fleteSubtotal + fleteIgv);
          const fleteMontoDetraccion =
            pctDetraccionFlete > 0
              ? round2((fleteTotal * pctDetraccionFlete) / 100)
              : 0;
          const fleteNetoAPagar = round2(fleteTotal - fleteMontoDetraccion);

          return (
            <Paper
              key={index}
              p="md"
              radius="lg"
              className="bg-zinc-900/60 border border-zinc-800 relative"
            >
              <Group justify="space-between" mb="xs">
                <Group justify="space-between" align="center">
                  <Badge color="indigo" variant="light" size="sm">
                    Carga #{index + 1}
                  </Badge>
                  <Divider orientation="vertical" size="xs" />

                  <div className="flex items-center gap-2">
                    <Text
                      size="xs"
                      fw={600}
                      c="zinc.300"
                      className="whitespace-nowrap"
                    >
                      Fecha y hora de ingreso:
                    </Text>

                    <TextInput
                      type="datetime-local"
                      value={carga.fecha_hora_ingreso}
                      onChange={(e) =>
                        handleChangeCarga(
                          index,
                          "fecha_hora_ingreso",
                          e.currentTarget.value,
                        )
                      }
                      classNames={inputClasses}
                      size="xs"
                      radius="lg"
                    />
                  </div>
                </Group>
                {cargas.length > 1 && (
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    size="sm"
                    onClick={() => handleEliminarCarga(index)}
                    disabled={saving}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                )}
              </Group>

              <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
                <Select
                  label="Tipo de carbón"
                  placeholder={
                    loadingTipos
                      ? "Cargando tipos de carbón..."
                      : "Seleccione tipo de carbón"
                  }
                  disabled={loadingTipos}
                  rightSection={
                    loadingTipos ? (
                      <Loader size="xs" color="indigo" />
                    ) : undefined
                  }
                  data={tipos.map((t) => ({
                    value: String(t.id_tipo_carbon),
                    label: `${t.nombre} ${t.codigo ? `(${t.codigo})` : ""}`,
                  }))}
                  value={
                    carga.id_tipo_carbon ? String(carga.id_tipo_carbon) : null
                  }
                  onChange={(val) =>
                    handleChangeCarga(
                      index,
                      "id_tipo_carbon",
                      val ? Number(val) : 0,
                    )
                  }
                  classNames={inputClasses}
                  size="xs"
                  radius="lg"
                  searchable
                />

                <Select
                  label="Lugar de extracción"
                  placeholder="Seleccione procedencia"
                  data={lugaresExtraccion.map((l) => ({
                    value: String(l.id_lugar_extraccion),
                    label:
                      [l.departamento_nombre, l.direccion]
                        .filter(Boolean)
                        .join(" - ") || l.direccion,
                  }))}
                  value={
                    carga.id_lugar_extraccion
                      ? String(carga.id_lugar_extraccion)
                      : null
                  }
                  onChange={(val) =>
                    handleChangeCarga(
                      index,
                      "id_lugar_extraccion",
                      val ? Number(val) : null,
                    )
                  }
                  classNames={inputClasses}
                  leftSection={<IconMapPin size={16} />}
                  size="xs"
                  radius="lg"
                  searchable
                  clearable
                />

                <Select
                  label="Tipo despacho"
                  data={[
                    { value: "Envio", label: "Envío" },
                    {
                      value: "Recojo",
                      label: "Recojo",
                    },
                  ]}
                  value={carga.tipo_despacho}
                  onChange={(val) =>
                    handleChangeCarga(index, "tipo_despacho", val || "Envio")
                  }
                  classNames={inputClasses}
                  size="xs"
                  radius="lg"
                />

                {carga.tipo_despacho === "Recojo" && (
                  <Select
                    label="Almacén del proveedor para recojo"
                    placeholder="Seleccione almacén del proveedor"
                    data={almacenesProveedor.map((a) => ({
                      value: String(a.id),
                      label: a.direccion,
                    }))}
                    value={
                      carga.id_almacen_proveedor_recojo
                        ? String(carga.id_almacen_proveedor_recojo)
                        : null
                    }
                    onChange={(val) =>
                      handleChangeCarga(
                        index,
                        "id_almacen_proveedor_recojo",
                        val ? Number(val) : null,
                      )
                    }
                    classNames={inputClasses}
                    size="xs"
                    radius="lg"
                    searchable
                  />
                )}
              </SimpleGrid>

              {/* Placa, Balanza, Guías y Fecha */}
              <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm" mt="sm">
                {/* Destino de llegada */}
                <div className="mt-2 flex flex-col gap-1.5">
                  {/* Switch / Selector de tipo de destino */}
                  <div className="flex items-center justify-between">
                    <Text size="xs" fw={500} c="zinc.300">
                      Destino de llegada
                    </Text>
                    <Switch
                      size="xs"
                      color="indigo"
                      checked={carga.id_almacen_tipo_destino === "cliente"}
                      onChange={(e) => {
                        const nuevoTipo = e.currentTarget.checked
                          ? "cliente"
                          : "empresa";
                        handleChangeCarga(
                          index,
                          "id_almacen_tipo_destino",
                          nuevoTipo,
                        );
                      }}
                      labelPosition="left"
                      label={
                        <Text size="xs" c="dimmed">
                          {carga.id_almacen_tipo_destino === "cliente"
                            ? "Cliente"
                            : "Empresa"}
                        </Text>
                      }
                    />
                  </div>

                  {/* Select dinámico único */}
                  <Select
                    placeholder={
                      carga.id_almacen_tipo_destino === "empresa"
                        ? "Seleccione almacén de la empresa"
                        : "Seleccione almacén del cliente"
                    }
                    data={
                      carga.id_almacen_tipo_destino === "empresa"
                        ? almacenesEmpresa.map((a) => ({
                            value: String(a.id_almacen),
                            label: a.nombre,
                          }))
                        : almacenesCliente.map((a) => ({
                            value: String(a.id),
                            label: `${a.cliente} - ${a.direccion}`,
                          }))
                    }
                    value={
                      carga.id_almacen_tipo_destino === "empresa"
                        ? carga.id_almacen_empresa_llegada
                          ? String(carga.id_almacen_empresa_llegada)
                          : null
                        : carga.id_almacen_cliente_llegada
                          ? String(carga.id_almacen_cliente_llegada)
                          : null
                    }
                    onChange={(val) => {
                      const idNumerico = val ? Number(val) : null;
                      if (carga.id_almacen_tipo_destino === "empresa") {
                        handleChangeCarga(
                          index,
                          "id_almacen_empresa_llegada",
                          idNumerico,
                        );
                      } else {
                        handleChangeCarga(
                          index,
                          "id_almacen_cliente_llegada",
                          idNumerico,
                        );
                      }
                    }}
                    classNames={inputClasses}
                    size="xs"
                    radius="lg"
                    searchable
                    clearable
                  />
                </div>

                <TextInput
                  label="Placa vehículo"
                  placeholder="Ej. T3T-809"
                  value={carga.placa}
                  onChange={(e) =>
                    handleChangeCarga(
                      index,
                      "placa",
                      e.currentTarget.value.toUpperCase(),
                    )
                  }
                  classNames={inputClasses}
                  leftSection={<IconTruck size={16} />}
                  size="xs"
                  radius="lg"
                />

                <TextInput
                  label="Ticket balanza"
                  placeholder="Ej. 5629"
                  value={carga.codigo_ticket_balanza}
                  onChange={(e) =>
                    handleChangeCarga(
                      index,
                      "codigo_ticket_balanza",
                      e.currentTarget.value.toUpperCase(),
                    )
                  }
                  classNames={inputClasses}
                  leftSection={<IconReceipt size={16} />}
                  size="xs"
                  radius="lg"
                />

                <TextInput
                  label="Guía remitente"
                  placeholder="Ej. EG07-1327"
                  value={carga.guia_remitente}
                  onChange={(e) =>
                    handleChangeCarga(
                      index,
                      "guia_remitente",
                      e.currentTarget.value.toUpperCase(),
                    )
                  }
                  classNames={inputClasses}
                  size="xs"
                  radius="lg"
                />
              </SimpleGrid>

              {/* Tonelaje, Calidad y Precios */}
              <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm" mt="sm">
                <NumberInput
                  label="Cantidad (TM)"
                  placeholder="0.00"
                  value={carga.cantidad}
                  onChange={(val) =>
                    handleChangeCarga(index, "cantidad", Number(val) || 0)
                  }
                  leftSection={<IconScale size={16} />}
                  classNames={inputClasses}
                  size="xs"
                  radius="lg"
                />

                <NumberInput
                  label="% Humedad"
                  placeholder="0.00"
                  value={carga.porcentaje_humedad}
                  onChange={(val) =>
                    handleChangeCarga(
                      index,
                      "porcentaje_humedad",
                      Number(val) || 0,
                    )
                  }
                  max={100}
                  classNames={inputClasses}
                  size="xs"
                  radius="lg"
                />

                <div>
                  <NumberInput
                    label="% Ceniza"
                    placeholder="0.00"
                    value={carga.porcentaje_ceniza}
                    onChange={(val) =>
                      handleChangeCarga(
                        index,
                        "porcentaje_ceniza",
                        Number(val) || 0,
                      )
                    }
                    max={100}
                    classNames={inputClasses}
                    size="xs"
                    radius="lg"
                  />
                  {(() => {
                    const calidad = resolverCalidadCarbon(
                      carga.porcentaje_ceniza,
                      calidades,
                    );
                    if (!calidad) return null;
                    return (
                      <Badge
                        mt={4}
                        color={colorCalidadCarbon(calidad.nombre)}
                        variant="light"
                        size="sm"
                        radius="md"
                      >
                        Calidad: {calidad.nombre} (
                        {formatNumber(calidad.porcentaje_inicio_ceniza)}% –
                        {formatNumber(calidad.porcentaje_fin_ceniza)}%)
                      </Badge>
                    );
                  })()}
                </div>

                <div className="flex flex-col ">
                  <NumberInput
                    label="Precio x TN"
                    placeholder="0.00"
                    value={carga.precio_unitario}
                    onChange={(val) =>
                      handleChangeCarga(
                        index,
                        "precio_unitario",
                        Number(val) || 0,
                      )
                    }
                    fixedDecimalScale
                    leftSection={<IconCoins size={16} />}
                    classNames={inputClasses}
                    size="xs"
                    radius="lg"
                  />
                  {/* Indicador de Tarifa aplicada según % de ceniza */}
                  {carga.id_tipo_carbon &&
                    Number(carga.porcentaje_ceniza) > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {(() => {
                          const tarifa = tarifaPara(
                            Number(carga.id_tipo_carbon),
                            Number(carga.porcentaje_ceniza),
                          );
                          if (tarifa) {
                            return (
                              <Badge
                                color="teal"
                                variant="light"
                                size="sm"
                                radius="md"
                              >
                                {`${tarifa.inicio_porcentaje_ceniza}% - ${tarifa.fin_porcentaje_ceniza}% · S/ ${formatNumber(
                                  Number(tarifa.precio_unitario),
                                )}`}
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
                                {`Sin tarifa - ${formatNumber(Number(carga.porcentaje_ceniza))}% de ceniza`}
                              </Badge>
                              <Tooltip
                                label="Ver tarifas registradas"
                                withArrow
                              >
                                <ActionIcon
                                  variant="subtle"
                                  color="indigo"
                                  size="sm"
                                  radius="lg"
                                  onClick={() => {
                                    setTargetTarifasListadoIdx(index);
                                    setOpenListadoTarifas(true);
                                  }}
                                  className="font-semibold"
                                  disabled={saving}
                                >
                                  <IconEye size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </>
                          );
                        })()}
                      </div>
                    )}
                </div>
              </SimpleGrid>

              {/* Flete */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full mt-2">
                <Group gap="xs" align="flex-end" wrap="nowrap">
                  <Select
                    className="flex-1"
                    label="Empresa de transporte"
                    placeholder="Seleccione transportista"
                    data={transportistas.map((t) => ({
                      value: String(t.id_transportista),
                      label: t.razon_social,
                    }))}
                    value={
                      carga.id_transportista
                        ? String(carga.id_transportista)
                        : null
                    }
                    onChange={(val) =>
                      handleChangeCarga(
                        index,
                        "id_transportista",
                        val ? Number(val) : null,
                      )
                    }
                    classNames={inputClasses}
                    size="xs"
                    radius="lg"
                    searchable
                    rightSection={
                      loadingTipos ? (
                        <Loader size="12" color="indigo" />
                      ) : undefined
                    }
                  />
                  <Tooltip label="Registrar nuevo transportista" withArrow>
                    <ActionIcon
                      size={32}
                      variant="filled"
                      color="indigo.6"
                      radius="lg"
                      onClick={() => {
                        setTargetTransportistaIdx(index);
                        setOpenNuevoTransportista(true);
                      }}
                      disabled={saving}
                      className="mb-0.75"
                    >
                      <IconPlus size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>

                <TextInput
                  label="Guía transportista (opcional)"
                  placeholder="Ej. V001-1234"
                  value={carga.guia_transportista || ""}
                  onChange={(e) =>
                    handleChangeCarga(
                      index,
                      "guia_transportista",
                      e.currentTarget.value.toUpperCase(),
                    )
                  }
                  classNames={inputClasses}
                  size="xs"
                  radius="lg"
                />

                <NumberInput
                  styles={{
                    label: {
                      width: "100%",
                      display: "block",
                    },
                  }}
                  label={
                    <div className="flex items-center justify-between w-full">
                      <span>Flete x TN</span>
                      <Tooltip
                        label="Se descontará el flete al proveedor y se pagará a la empresa de transporte"
                        withArrow
                        position="top"
                        multiline
                        w={220}
                      >
                        <div className="inline-flex">
                          <Switch
                            size="xs"
                            label="Pagar flete"
                            checked={carga.pagar_flete}
                            onChange={(e) =>
                              handleChangeCarga(
                                index,
                                "pagar_flete",
                                e.currentTarget.checked,
                              )
                            }
                            styles={{
                              label: {
                                fontSize: "11px",
                                paddingLeft: "6px",
                                cursor: "pointer",
                              },
                            }}
                          />
                        </div>
                      </Tooltip>
                    </div>
                  }
                  placeholder="0.00"
                  value={carga.costo_flete_por_tonelada}
                  onChange={(val) =>
                    handleChangeCarga(
                      index,
                      "costo_flete_por_tonelada",
                      Number(val) || 0,
                    )
                  }
                  fixedDecimalScale
                  classNames={inputClasses}
                  disabled={!carga.pagar_flete}
                  size="xs"
                  radius="lg"
                />
              </div>
              {/* Desglose de costos de la carga (mismos campos que se
                  guardan en carga_compra_carbon) */}
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" mt="md">
                <MultiFilePicker
                  label="Evidencias / Fotos de la carga (balanza, guías, etc.)"
                  files={carga.archivos || []}
                  onFilesChange={(files) =>
                    handleChangeCarga(index, "archivos", files)
                  }
                />

                <Group grow>
                  {/* COSTOS DEL CARBON */}
                  <Paper
                    p="xs"
                    radius="md"
                    className="bg-zinc-950/60 border border-zinc-800"
                  >
                    <Group justify="space-between" mb={6} gap="xs">
                      <Text
                        size="10px"
                        fw={800}
                        c="zinc.400"
                        className="uppercase tracking-wider"
                      >
                        Costos del carbón
                      </Text>
                      <Text size="10px" c="gray">
                        IGV {formatNumber(pctIgv)}%
                      </Text>
                    </Group>
                    <FilaCosto
                      etiqueta="Precio materia prima"
                      valor={precioMateriaPrima}
                    />
                    <FilaCosto etiqueta="Subtotal" valor={subtotalCarga} />
                    <FilaCosto etiqueta="Monto IGV" valor={montoIgv} />
                    <FilaCosto etiqueta="Total" valor={totalCarga} destacado />
                    <FilaCosto
                      etiqueta="Monto de detracción"
                      valor={montoDetraccion}
                      color="orange.4"
                    />
                    <FilaCosto
                      etiqueta="Neto a pagar"
                      valor={netoAPagar}
                      destacado
                      color="teal.4"
                    />
                  </Paper>
                  {/* COSTOS DE TRANSPORTE */}
                  {carga.pagar_flete && (
                    <Paper
                      p="xs"
                      radius="md"
                      className="bg-zinc-950/60 border border-blue-900/40"
                    >
                      <Group justify="space-between" mb={6} gap="xs">
                        <Text
                          size="10px"
                          fw={800}
                          c="blue.3"
                          className="uppercase tracking-wider"
                        >
                          Costos de transporte
                        </Text>
                        <Text size="10px" c="gray">
                          IGV {formatNumber(pctIgvFlete)}%
                        </Text>
                      </Group>
                      <FilaCosto
                        etiqueta="Flete por tonelada"
                        valor={costoFleteTn}
                      />
                      <FilaCosto
                        etiqueta="Subtotal flete"
                        valor={fleteSubtotal}
                      />
                      <FilaCosto etiqueta="IGV del flete" valor={fleteIgv} />
                      <FilaCosto
                        etiqueta="Total del flete"
                        valor={fleteTotal}
                        destacado
                      />
                      <FilaCosto
                        etiqueta="Detracción del flete"
                        valor={fleteMontoDetraccion}
                        color="orange.4"
                      />
                      <FilaCosto
                        etiqueta="Neto a pagar del flete"
                        valor={fleteNetoAPagar}
                        destacado
                        color="teal.4"
                      />
                    </Paper>
                  )}
                </Group>
              </SimpleGrid>
            </Paper>
          );
        })}
      </Stack>

      <Group justify="flex-end" gap="sm" mt="md">
        <Button
          variant="default"
          onClick={onCancel}
          disabled={saving}
          size="xs"
          radius="lg"
        >
          Cancelar
        </Button>
        <Button
          color="indigo"
          onClick={handleSubmit}
          loading={saving}
          size="xs"
          radius="lg"
          leftSection={esEdicionCarga ? <IconPencil size={16} /> : <IconPlus size={16} />}
        >
          {esEdicionCarga
            ? "Guardar cambios de la carga"
            : `Guardar e ingresar cargas (${cargas.length})`}
        </Button>
      </Group>

      {/* Modal: Registrar nuevo transportista (boton "+") */}
      <ModalEstandar
        opened={openNuevoTransportista}
        close={() => {
          setOpenNuevoTransportista(false);
          setTargetTransportistaIdx(null);
        }}
        validateClose
        title="Nuevo Transportista"
        size="md"
      >
        <FormTransportista
          onSuccess={(nuevo) => {
            // Insertamos al inicio y lo dejamos seleccionado en la carga que abrio el modal.
            setTransportistas((prev) => [nuevo, ...prev]);
            if (targetTransportistaIdx !== null) {
              handleChangeCarga(
                targetTransportistaIdx,
                "id_transportista",
                Number(nuevo.id_transportista),
              );
            }
            setOpenNuevoTransportista(false);
            setTargetTransportistaIdx(null);
          }}
          onCancel={() => {
            setOpenNuevoTransportista(false);
            setTargetTransportistaIdx(null);
          }}
        />
      </ModalEstandar>

      {/* Modal: Listado de tarifas del tipo de carbon de la fila + boton para crear mas */}
      <ModalEstandar
        opened={openListadoTarifas}
        close={() => {
          setOpenListadoTarifas(false);
          setTargetTarifasListadoIdx(null);
        }}
        title={
          targetTarifasListadoIdx !== null && tipos.length > 0
            ? `Tarifas de ${
                tipos.find(
                  (t) =>
                    Number(t.id_tipo_carbon) ===
                    Number(cargas[targetTarifasListadoIdx]?.id_tipo_carbon),
                )?.nombre ?? "carbón"
              }`
            : "Tarifas de Carbón"
        }
        size="60rem"
      >
        <Stack gap="md">
          {(() => {
            const tipoId =
              targetTarifasListadoIdx !== null
                ? Number(cargas[targetTarifasListadoIdx]?.id_tipo_carbon || 0)
                : 0;
            const propias = tarifas.filter(
              (t) => Number(t.id_tipo_carbon) === tipoId,
            );
            return (
              <DataTableEstandar
                records={propias}
                idAccessor="id_tarifa_carbon"
                columns={[
                  {
                    accessor: "index",
                    title: "#",
                  },
                  {
                    accessor: "inicio_porcentaje_ceniza",
                    title: "Ceniza desde (%)",
                  },
                  {
                    accessor: "fin_porcentaje_ceniza",
                    title: "Ceniza hasta (%)",
                  },
                  {
                    accessor: "precio_unitario",
                    title: "Precio unit. (S/ x TN)",
                  },
                  {
                    accessor: "estado",
                    title: "Estado",
                  },
                ]}
                loading={loadingTipos}
              />
            );
          })()}
          <Group justify="flex-end" gap="sm">
            <Button
              color="indigo"
              size="xs"
              radius="lg"
              leftSection={<IconPlus size={14} />}
              onClick={() => {
                setTargetTarifaIdx(targetTarifasListadoIdx);
                setOpenNuevaTarifa(true);
              }}
              disabled={
                targetTarifasListadoIdx === null ||
                !cargas[targetTarifasListadoIdx]?.id_tipo_carbon
              }
            >
              Registrar nueva tarifa
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>

      {/* Modal: Nueva tarifa de carbón.
          IMPORTANTE: va al final para quedar visualmente ENCIMA del listado de
          tarifas (zIndex + orden del portal de Mantine). Asi el usuario ve el
          form al hacer click en "Registrar nueva tarifa". */}
      <ModalEstandar
        opened={openNuevaTarifa}
        close={() => {
          setOpenNuevaTarifa(false);
          setTargetTarifaIdx(null);
        }}
        validateClose
        title="Nueva Tarifa de Carbón"
        size="md"
      >
        <FormTarifaCarbon
          idTipoCarbonInicial={
            targetTarifaIdx !== null && cargas[targetTarifaIdx]?.id_tipo_carbon
              ? Number(cargas[targetTarifaIdx].id_tipo_carbon)
              : null
          }
          cenizaReferenciaInicial={
            targetTarifaIdx !== null
              ? Number(cargas[targetTarifaIdx]?.porcentaje_ceniza || 0)
              : 0
          }
          onSuccess={(nueva) => {
            setTarifas((prev) => [...prev, nueva]);
            if (targetTarifaIdx !== null) {
              setCargas((prev) => {
                const copy = [...prev];
                copy[targetTarifaIdx] = {
                  ...copy[targetTarifaIdx],
                  id_tarifa_carbon: nueva.id_tarifa_carbon,
                  precio_unitario: Number(nueva.precio_unitario),
                };
                return copy;
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
    </Stack>
  );
};
