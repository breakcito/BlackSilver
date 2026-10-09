import { useEffect, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Divider,
  FileInput,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconTruck,
  IconUpload,
  IconMapPin,
  IconScale,
  IconReceipt,
  IconCoins,
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

interface Props {
  compra: CompraCarbonResumen;
  onSuccess: () => void;
  onCancel: () => void;
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

export const ModalRegistroCargas = ({ compra, onSuccess, onCancel }: Props) => {
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

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializar con 1 carga por defecto heredando el tipo de carbón prometido
  const [cargas, setCargas] = useState<CargaFormState[]>([
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
  ]);

  // Carga de catálogos necesarios
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [tiposRes, almRes, lugRes, transRes] = await Promise.all([
          TipoCarbonService.getTipos({ id_proveedor: compra.id_proveedor }),
          AuxService.get_almacenes({ para_carbon: true }),
          AuxService.get_lugares_extraccion_carbon(compra.id_proveedor),
          AuxService.get_transportistas(),
        ]);
        if (cancel) return;

        if (tiposRes.success && tiposRes.data) setTipos(tiposRes.data);
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
      }
    })();

    return () => {
      cancel = true;
    };
  }, [compra.id_proveedor]);

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

      // Si cambió porcentaje de ceniza o tipo de carbón, buscar tarifa
      if (field === "porcentaje_ceniza" || field === "id_tipo_carbon") {
        const ceniza =
          field === "porcentaje_ceniza"
            ? Number(val)
            : Number(actual.porcentaje_ceniza);
        const tipoId =
          field === "id_tipo_carbon"
            ? Number(val)
            : Number(actual.id_tipo_carbon);

        if (tipoId > 0 && ceniza > 0) {
          AuxService.get_tarifas_carbon({ id_tipo_carbon: tipoId }).then(
            (res) => {
              if (res.success && res.data) {
                const list: RES_TarifaCarbon[] = Array.isArray(res.data)
                  ? res.data
                  : [res.data];
                const tarifaValida = list.find(
                  (t) =>
                    ceniza >= Number(t.inicio_porcentaje_ceniza) &&
                    ceniza <= Number(t.fin_porcentaje_ceniza),
                );
                if (tarifaValida) {
                  setCargas((p2) => {
                    const c2 = [...p2];
                    c2[index] = {
                      ...c2[index],
                      id_tarifa_carbon: tarifaValida.id_tarifa_carbon,
                      precio_unitario: Number(tarifaValida.precio_unitario),
                    };
                    return c2;
                  });
                }
              }
            },
          );
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

  return (
    <Stack gap="md">
      {error && (
        <Alert color="red" variant="light" title="Atención" radius="md">
          {error}
        </Alert>
      )}

      <Group justify="space-between" align="center">
        <Text size="xs" c="gray">
          Proveedor: {compra.proveedor} · Estimado:{" "}
          {formatNumber(compra.toneladas_prometidas, 2)} TN (
          {compra.tipo_carbon_prometido})
        </Text>
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
          const subtotalAntes =
            Math.round(
              Number(carga.cantidad) * Number(carga.precio_unitario) * 100,
            ) / 100;
          const descuentoFlete = carga.pagar_flete
            ? Math.round(
                Number(carga.cantidad) *
                  Number(carga.costo_flete_por_tonelada) *
                  100,
              ) / 100
            : 0;
          const subtotalConDesc = Math.max(0, subtotalAntes - descuentoFlete);

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
                  data={tipos.map((t) => ({
                    value: String(t.id_tipo_carbon),
                    label: `${t.nombre} ${t.codigo ? `(${t.codigo})` : ""}`,
                  }))}
                  value={
                    carga.id_tipo_carbon ? String(carga.id_tipo_carbon) : null
                  }
                  onChange={(val) =>
                    handleChangeCarga(index, "id_tipo_carbon", Number(val))
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

                <NumberInput
                  label="Precio unit. / TN (S/)"
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
              </SimpleGrid>

              {/* Flete */}
              <div className="mt-2 p-3 bg-zinc-950/40 rounded-xl border border-zinc-800/60 w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                {/* Pregunta: ocupa 4 columnas de 12 (1/3 aprox) */}
                <div
                  className={`flex flex-row gap-2.5 items-start ${carga.pagar_flete ? "lg:col-span-4" : "lg:col-span-12"}`}
                >
                  <Checkbox
                    checked={carga.pagar_flete}
                    onChange={(e) =>
                      handleChangeCarga(
                        index,
                        "pagar_flete",
                        e.currentTarget.checked,
                      )
                    }
                    color="indigo"
                    size="sm"
                    className="mt-0.5"
                  />
                  <div className="text-left">
                    <Text size="xs" fw={600} c="white">
                      ¿Se pagará flete por esta carga?
                    </Text>
                    <Text size="xs" c="gray">
                      Se descontará el flete al proveedor y se pagará a la
                      empresa de transporte
                    </Text>
                  </div>
                </div>

                {/* Resto de campos: ocupa las 8 columnas restantes (2/3) y todo el ancho */}
                {carga.pagar_flete && (
                  <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                    <Select
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
                    />

                    <NumberInput
                      label="Costo flete x TN (S/)"
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
                      size="xs"
                      radius="lg"
                    />

                    <TextInput
                      label="Guía transportista (opcional)"
                      placeholder="Ej. V001-1234"
                      value={carga.guia_transportista || ""}
                      onChange={(e) =>
                        handleChangeCarga(
                          index,
                          "guia_transportista",
                          e.currentTarget.value,
                        )
                      }
                      classNames={inputClasses}
                      size="xs"
                      radius="lg"
                    />
                  </div>
                )}
              </div>

              {/* Evidencias de la carga */}
              <FileInput
                label="Evidencias / Fotos de la carga (balanza, guías, etc.)"
                placeholder="Seleccionar archivos"
                multiple
                value={carga.archivos || []}
                onChange={(files) =>
                  handleChangeCarga(index, "archivos", files)
                }
                leftSection={<IconUpload size={16} />}
                classNames={inputClasses}
                size="xs"
                radius="lg"
                mt="sm"
              />

              {/* Subtotal de la carga */}
              <Group justify="flex-end" mt="md" gap="xl">
                <Text size="xs" c="dimmed">
                  Subtotal base:{" "}
                  <span className="text-zinc-200 font-semibold">
                    S/ {formatNumber(subtotalAntes)}
                  </span>
                </Text>
                {carga.pagar_flete && (
                  <Text size="xs" c="dimmed">
                    Desc. Flete:{" "}
                    <span className="text-red-400 font-semibold">
                      - S/ {formatNumber(descuentoFlete)}
                    </span>
                  </Text>
                )}
                <Text size="sm" fw={700} c="indigo.4">
                  Subtotal carga: S/ {formatNumber(subtotalConDesc)}
                </Text>
              </Group>
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
          leftSection={<IconPlus size={16} />}
        >
          Guardar e ingresar cargas ({cargas.length})
        </Button>
      </Group>
    </Stack>
  );
};
