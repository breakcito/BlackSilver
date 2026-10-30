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
import { getCoincidencias } from "../../../../shared/functions/get-coincidencias";
import { inputClasses } from "../components/input-classes";
import { useCatalogosCabeceraVenta } from "../../hooks/useCatalogosCabeceraVenta";
import { useCatalogosDespacho } from "../../hooks/useCatalogosDespacho";
import { EditorCargasVenta } from "./editor-cargas-venta";
import {
  esCargaVentaCompleta,
  type CargaVentaFormState,
} from "./carga-venta-form-state";
import { VentaCarbonService } from "../../service/venta-carbon.service";
import type { VentaCarbonResumen } from "../../service/venta-carbon.responses";

interface Props {
  onCancel: () => void;
  onCreated: (venta: VentaCarbonResumen) => void;
}

/** Empresa vendedora por defecto (Cupper & Hannia). */
const EMPRESA_POR_DEFECTO = 1;

/** IGV por defecto de la venta de carbon. */
const IGV_POR_DEFECTO = 18;
/** Detraccion por defecto de la venta de carbon. */
const DETRACCION_POR_DEFECTO = 10;

export const RegistroVentaCarbon = ({ onCancel, onCreated }: Props) => {
  const { notifyError, notifySuccess } = useNotify();
  const {
    empresas,
    clientes,
    almacenesEmpresa,
    almacenesCliente,
    loading: loadingCabecera,
  } = useCatalogosCabeceraVenta();
  const { tipos, calidades, loading: loadingDespacho } = useCatalogosDespacho();

  // Los selects se bloquean mientras carga su propio catalogo: la cabecera
  // no depende de los tipos ni de los vehiculos.
  const loadingCatalogos = loadingCabecera || loadingDespacho;

  const [idEmpresa, setIdEmpresa] = useState<string | null>(null);
  const [idCliente, setIdCliente] = useState<string | null>(null);
  const [idClienteDestino, setIdClienteDestino] = useState<string | null>(null);
  const [idAlmacenSalida, setIdAlmacenSalida] = useState<string | null>(null);
  const [idAlmacenLlegada, setIdAlmacenLlegada] = useState<string | null>(null);

  const [cargas, setCargas] = useState<CargaVentaFormState[]>([]);

  const [stock, setStock] = useState<Record<string, number>>({});
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

  // Stock despachable del almacen de salida (para autocompletar cantidades).
  useEffect(() => {
    if (!idAlmacenSalida) {
      setStock({});
      return;
    }

    let cancel = false;
    (async () => {
      try {
        const res = await VentaCarbonService.getStockDisponible(
          Number(idAlmacenSalida),
        );
        if (cancel) return;
        if (res.success && res.data) {
          const mapa: Record<string, number> = {};
          res.data.forEach((s) => {
            mapa[`${s.id_tipo_carbon}|${s.calidad}`] = Number(s.disponible) || 0;
          });
          setStock(mapa);
        }
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
    Object.entries(stock).forEach(([clave, valor]) => {
      mapa.set(clave, valor);
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

    // Las cargas son opcionales. El editor solo deja agregar cargas
    // completas, asi que lo que llega aqui ya esta listo para guardar.
    const conCarga = cargas.filter(esCargaVentaCompleta);
    if (conCarga.length !== cargas.length) {
      setError("Hay cargas sin completar. Reviselas antes de guardar.");
      return;
    }

    setSaving(true);
    try {
      const res = await VentaCarbonService.crearVenta({
        id_empresa: Number(idEmpresa),
        id_cliente: Number(idCliente),
        id_cliente_destino: Number(idClienteDestino),
        id_almacen_empresa_salida: Number(idAlmacenSalida),
        id_almacen_cliente_llegada: Number(idAlmacenLlegada),
        porcentaje_igv: IGV_POR_DEFECTO,
        porcentaje_detraccion: DETRACCION_POR_DEFECTO,
        cargas: conCarga.map((c) => ({
          id_tipo_carbon: Number(c.id_tipo_carbon),
          calidad: c.calidad,
          cantidad_toneladas: c.cantidad_toneladas,
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

          {/* <Tooltip
            label="Se aplica a los importes de las liquidaciones de esta venta"
            withArrow
          >
            <NumberInput
              label="% IGV"
              value={porcentajeIgv}
              onChange={(val) => setPorcentajeIgv(Number(val) || 0)}
              min={0}
              max={100}
              decimalScale={2}
              hideControls
              classNames={inputClasses}
              size="xs"
              radius="lg"
              disabled={saving}
            />
          </Tooltip>

          <Tooltip
            label="Se aplica a los importes de las liquidaciones de esta venta"
            withArrow
          >
            <NumberInput
              label="% Detraccion"
              value={porcentajeDetraccion}
              onChange={(val) => setPorcentajeDetraccion(Number(val) || 0)}
              min={0}
              max={100}
              decimalScale={2}
              hideControls
              classNames={inputClasses}
              size="xs"
              radius="lg"
              disabled={saving}
            />
          </Tooltip> */}
        </SimpleGrid>
      </Paper>

      {/* Cargas */}
      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/60 border border-zinc-800"
      >
        <EditorCargasVenta
          cargas={cargas}
          onChange={setCargas}
          tipos={tipos}
          calidades={calidades}
          stockPorClave={stockPorClave}
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
