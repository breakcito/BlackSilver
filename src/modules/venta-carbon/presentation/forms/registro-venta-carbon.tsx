import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
} from "@mantine/core";
import {
  IconBuildingStore,
  IconMapPin,
  IconReceipt,
  IconTruck,
} from "@tabler/icons-react";

import { useNotify } from "../../../../hooks/useNotify";
import { AuxService } from "../../../../service/auxiliar.service";
import { getCoincidencias } from "../../../../shared/functions/get-coincidencias";
import { exigeSegundaPlaca } from "../../../../shared/enums/venta-carbon/tipo-vehiculo-carbon";
import { inputClasses } from "../components/input-classes";
import { useCatalogosCabeceraVenta } from "../../hooks/useCatalogosCabeceraVenta";
import { useCatalogosDespacho } from "../../hooks/useCatalogosDespacho";
import { ListaCargasVenta } from "./lista-cargas-venta";
import {
  esCargaVentaCompleta,
  esCargaVentaVacia,
  nuevaCargaVenta,
  type CargaVentaFormState,
} from "./carga-venta-form-state";
import { VentaCarbonService } from "../../service/venta-carbon.service";
import type { VentaCarbonResumen } from "../../service/venta-carbon.responses";
import type { RES_StockCarbon } from "../../../../service/responses/stock-carbon";

interface Props {
  onCancel: () => void;
  onCreated: (venta: VentaCarbonResumen) => void;
}

/** Empresa vendedora por defecto (Cupper & Hannia). */
const EMPRESA_POR_DEFECTO = 1;

export const RegistroVentaCarbon = ({ onCancel, onCreated }: Props) => {
  const { notifyError, notifySuccess } = useNotify();
  const {
    empresas,
    clientes,
    almacenesEmpresa,
    almacenesCliente,
    loading: loadingCabecera,
  } = useCatalogosCabeceraVenta();
  const {
    tipos,
    calidades,
    vehiculos,
    marcas,
    loading: loadingDespacho,
    reloadVehiculos,
    reloadMarcas,
  } = useCatalogosDespacho();

  // Los selects se bloquean mientras carga su propio catalogo: la cabecera
  // no depende de los tipos ni de los vehiculos.
  const loadingCatalogos = loadingCabecera || loadingDespacho;

  const [idEmpresa, setIdEmpresa] = useState<string | null>(null);
  const [idCliente, setIdCliente] = useState<string | null>(null);
  const [idClienteDestino, setIdClienteDestino] = useState<string | null>(null);
  const [idAlmacenSalida, setIdAlmacenSalida] = useState<string | null>(null);
  const [idAlmacenLlegada, setIdAlmacenLlegada] = useState<string | null>(null);

  const [cargas, setCargas] = useState<CargaVentaFormState[]>([
    nuevaCargaVenta(),
  ]);

  const [stock, setStock] = useState<RES_StockCarbon[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [destinoBusqueda, setDestinoBusqueda] = useState("");

  // Empresa por defecto: id = 1 (Cupper & Hannia).
  useEffect(() => {
    if (empresas.length === 0) return;
    const porDefecto = empresas.find(
      (e) => e.id_empresa === EMPRESA_POR_DEFECTO,
    );
    setIdEmpresa(
      String(porDefecto ? porDefecto.id_empresa : empresas[0].id_empresa),
    );
  }, [empresas]);

  // Almacen de salida por defecto: el primero disponible para carbon.
  useEffect(() => {
    if (almacenesEmpresa.length === 0) return;
    setIdAlmacenSalida((prev) => {
      if (prev) return prev;
      return String(almacenesEmpresa[0].id_almacen);
    });
  }, [almacenesEmpresa]);

  // Stock disponible del almacen de salida (para autocompletar cantidades).
  useEffect(() => {
    if (!idAlmacenSalida) {
      setStock([]);
      return;
    }

    let cancel = false;
    (async () => {
      try {
        const res = await AuxService.get_stock_carbon({
          id_almacen: Number(idAlmacenSalida),
        });
        if (cancel) return;
        if (res.success && res.data) setStock(res.data);
      } catch (err) {
        console.error(err);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [idAlmacenSalida]);

  /** Almacenes del cliente destino o del cliente facturado. */
  const almacenesDisponibles = useMemo(() => {
    const permitidos = new Set(
      [idCliente, idClienteDestino].filter(Boolean).map((v) => Number(v)),
    );
    if (permitidos.size === 0) return [];

    return almacenesCliente
      .filter((a) => permitidos.has(Number(a.id_cliente)))
      .map((a) => ({
        value: String(a.id_almacen),
        label: `${a.direccion}`,
        id_cliente: Number(a.id_cliente),
      }));
  }, [almacenesCliente, idCliente, idClienteDestino]);

  // El almacen de llegada se reinicia cuando cambia el cliente destino.
  useEffect(() => {
    setIdAlmacenLlegada((prev) => {
      if (!prev) return prev;
      const sigueValido = almacenesDisponibles.some((a) => a.value === prev);
      return sigueValido ? prev : null;
    });
  }, [almacenesDisponibles]);

  const stockPorClave = useMemo(() => {
    const mapa = new Map<string, number>();
    stock.forEach((s) => {
      if (!s.id_tipo_carbon || !s.calidad) return;
      mapa.set(`${s.id_tipo_carbon}|${s.calidad}`, Number(s.stock_actual) || 0);
    });
    return mapa;
  }, [stock]);

  const clientesVisibles = useMemo(() => {
    const q = clienteBusqueda.trim();
    if (!q) return clientes;
    return getCoincidencias(clientes, q, {
      keys: ["razon_social", "ruc", "dni"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [clientes, clienteBusqueda]);

  const destinosVisibles = useMemo(() => {
    const q = destinoBusqueda.trim();
    if (!q) return clientes;
    return getCoincidencias(clientes, q, {
      keys: ["razon_social", "ruc", "dni"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [clientes, destinoBusqueda]);

  const handleSubmit = async () => {
    setError(null);

    if (!idEmpresa) {
      setError("Debe seleccionar la empresa vendedora");
      return;
    }
    if (!idCliente) {
      setError("Debe seleccionar el cliente");
      return;
    }
    if (!idClienteDestino) {
      setError("Debe seleccionar el cliente de destino");
      return;
    }
    if (!idAlmacenSalida) {
      setError("Debe seleccionar el almacen de salida");
      return;
    }
    if (!idAlmacenLlegada) {
      setError("Debe seleccionar el almacen de llegada del cliente");
      return;
    }

    // Las cargas son opcionales: solo se guardan las que estan completas.
    // Una carga a medio llenar no se descarta en silencio, se avisa para que
    // el usuario la complete o la elimine.
    const incompletas = cargas.filter(
      (c) => !esCargaVentaVacia(c) && !esCargaVentaCompleta(c),
    );

    if (incompletas.length > 0) {
      setError(
        `Hay ${incompletas.length} carga(s) sin completar. Complete o elimine cada carga antes de guardar.`,
      );
      return;
    }

    const conCarga = cargas.filter(esCargaVentaCompleta);

    for (let i = 0; i < conCarga.length; i++) {
      const c = conCarga[i];
      if (exigeSegundaPlaca(c.tipo_vehiculo) && !c.segunda_placa.trim()) {
        setError(
          `Carga #${i + 1}: el vehiculo ${c.tipo_vehiculo} requiere la segunda placa`,
        );
        return;
      }
    }

    setSaving(true);
    try {
      const res = await VentaCarbonService.crearVenta({
        id_empresa: Number(idEmpresa),
        id_cliente: Number(idCliente),
        id_cliente_destino: Number(idClienteDestino),
        id_almacen_empresa_salida: Number(idAlmacenSalida),
        id_almacen_cliente_llegada: Number(idAlmacenLlegada),
        cargas: conCarga.map((c) => ({
          id_tipo_carbon: Number(c.id_tipo_carbon),
          id_vehiculo_carbon: Number(c.id_vehiculo_carbon),
          tipo_vehiculo: c.tipo_vehiculo,
          calidad: c.calidad,
          cantidad_toneladas: c.cantidad_toneladas,
          segunda_placa: c.segunda_placa.trim() || null,
          fecha_hora_salida: c.fecha_hora_salida,
          archivos: c.archivos,
        })),
      });

      if (res.success && res.data) {
        notifySuccess("Venta de carbon registrada correctamente");
        onCreated(res.data);
      } else {
        const msg = res.message || "Error al registrar la venta de carbon";
        setError(msg);
        notifyError(msg);
      }
    } catch (err) {
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
        <Alert color="red" variant="light" title="Atencion" radius="md">
          {error}
        </Alert>
      )}

      {/* Cabecera */}
      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/60 border border-zinc-800"
      >
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          <Select
            label="Empresa vendedora"
            placeholder="Seleccione empresa"
            data={empresas.map((e) => ({
              value: String(e.id_empresa),
              label: e.razon_social,
            }))}
            value={idEmpresa}
            onChange={setIdEmpresa}
            leftSection={<IconBuildingStore size={16} />}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            searchable
            nothingFoundMessage="Sin empresas registradas"
            disabled={saving}
          />

          <Select
            label="Cliente a Facturar"
            placeholder="Buscar por RUC o razon social"
            data={clientesVisibles.map((c) => ({
              value: String(c.id_cliente),
              label: `${c.razon_social} (${c.ruc || c.dni || "S/D"})`,
            }))}
            value={idCliente}
            onChange={setIdCliente}
            searchValue={clienteBusqueda}
            onSearchChange={setClienteBusqueda}
            leftSection={<IconReceipt size={16} />}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            searchable
            clearable
            nothingFoundMessage="Sin clientes de carbon"
            comboboxProps={{ withinPortal: true }}
            // El filtrado lo hace `getCoincidencias` (Fuse + FlexSearch): el
            // filtro por subcadena de Mantine descartaria las coincidencias
            // difusas (razon social mal escrita, RUC parcial).
            filter={({ options }) => options}
            disabled={saving}
          />

          <Select
            label="Cliente de destino"
            placeholder="Buscar destino de la carga"
            data={destinosVisibles.map((c) => ({
              value: String(c.id_cliente),
              label: `${c.razon_social} (${c.ruc || c.dni || "S/D"})`,
            }))}
            value={idClienteDestino}
            onChange={setIdClienteDestino}
            searchValue={destinoBusqueda}
            onSearchChange={setDestinoBusqueda}
            leftSection={<IconMapPin size={16} />}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            searchable
            clearable
            nothingFoundMessage="Sin clientes de carbon"
            comboboxProps={{ withinPortal: true }}
            filter={({ options }) => options}
            disabled={saving}
          />

          <Select
            label="Almacen de salida"
            placeholder="Seleccione almacen"
            data={almacenesEmpresa.map((a) => ({
              value: String(a.id_almacen),
              label: a.nombre,
            }))}
            value={idAlmacenSalida}
            onChange={setIdAlmacenSalida}
            leftSection={<IconTruck size={16} />}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            searchable
            nothingFoundMessage="Sin almacenes de carbon"
            disabled={saving}
          />

          <Select
            label="Almacen de llegada"
            placeholder={
              idCliente || idClienteDestino
                ? "Seleccione el almacen destino"
                : "Elija primero el cliente"
            }
            data={almacenesDisponibles}
            value={idAlmacenLlegada}
            onChange={setIdAlmacenLlegada}
            leftSection={<IconMapPin size={16} />}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            searchable
            clearable
            nothingFoundMessage="El cliente no tiene almacenes de carbon"
            comboboxProps={{ withinPortal: true }}
            disabled={saving || (!idCliente && !idClienteDestino)}
          />
        </SimpleGrid>
      </Paper>

      {/* Cargas */}
      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/60 border border-zinc-800"
      >
        <ListaCargasVenta
          cargas={cargas}
          onChange={setCargas}
          tipos={tipos}
          calidades={calidades}
          vehiculos={vehiculos}
          marcas={marcas}
          stockPorClave={stockPorClave}
          onVehiculoRegistrado={() => reloadVehiculos()}
          onMarcaRegistrada={(marca) => reloadMarcas(marca)}
          loadingCatalogos={loadingCatalogos}
          saving={saving}
        />
      </Paper>

      <Group justify="flex-end" gap="sm">
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
          leftSection={<IconReceipt size={16} />}
        >
          Registrar venta
        </Button>
      </Group>
    </Stack>
  );
};
