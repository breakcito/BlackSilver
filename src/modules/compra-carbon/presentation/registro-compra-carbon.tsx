import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  NumberInput,
  Paper,
  Select,

  Text,
} from "@mantine/core";
import {
  IconBuildingStore,
  IconFlame,
  IconScale,
  IconUsers,
} from "@tabler/icons-react";

import { useNotify } from "../../../hooks/useNotify";
import { AuxService } from "../../../service/auxiliar.service";
import type { RES_Empresa } from "../../../service/responses/empresa";
import type { RES_TipoCarbon } from "../../tipo-carbon/service/tipo-carbon.responses";
import type { RES_TarifaCarbon } from "../../../service/responses/tarifa-carbon";
import { ProveedoresService } from "../../proveedores/service/proveedores.service";
import type { ProveedorResponse } from "../../proveedores/service/proveedores.responses";
import { CompraCarbonService } from "../service/compra-carbon.service";
import type { CompraCarbonResumen } from "../service/compra-carbon.responses";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { getCoincidencias } from "../../../shared/functions/get-coincidencias";

interface Props {
  onCancel: () => void;
  onCreated: (cabecera: CompraCarbonResumen) => void;
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

export const RegistroCompraCarbon = ({ onCancel, onCreated }: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  const [empresas, setEmpresas] = useState<RES_Empresa[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorResponse[]>([]);
  const [tipos, setTipos] = useState<RES_TipoCarbon[]>([]);
  const [tarifas, setTarifas] = useState<RES_TarifaCarbon[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);

  // Búsqueda tolerante en proveedores
  const [proveedorBusqueda, setProveedorBusqueda] = useState("");

  // Cabecera preliminar
  const [idEmpresa, setIdEmpresa] = useState<string | null>(null);
  const [idProveedor, setIdProveedor] = useState<string | null>(null);

  // Detalle preliminar único
  const [idTipoCarbon, setIdTipoCarbon] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState<number | string>(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loadingTipos, setLoadingTipos] = useState(false);

  // Carga inicial de empresas, proveedores y tarifas
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoadingCatalogos(true);
      try {
        const [empRes, provArr, tarifasRes] = await Promise.all([
          AuxService.get_empresas(),
          ProveedoresService.getProveedores({ para_carbon: true }),
          AuxService.get_tarifas_carbon(),
        ]);

        if (cancel) return;

        if (empRes.success && empRes.data) {
          setEmpresas(empRes.data);
          // Auto-seleccionar Cupper por defecto si existe, o la primera empresa
          const cupper = empRes.data.find((e) =>
            e.razon_social.toLowerCase().includes("cupper"),
          );
          if (cupper) {
            setIdEmpresa(String(cupper.id_empresa));
          } else if (empRes.data.length > 0) {
            setIdEmpresa(String(empRes.data[0].id_empresa));
          }
        }

        if (provArr) {
          setProveedores(provArr);
        }

        if (tarifasRes.success && tarifasRes.data) {
          setTarifas(
            Array.isArray(tarifasRes.data)
              ? tarifasRes.data
              : [tarifasRes.data],
          );
        }
      } catch (e) {
        console.error(e);
        notifyError("Error al cargar los catálogos para compra preliminar");
      } finally {
        if (!cancel) setLoadingCatalogos(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [notifyError]);

  // Cargar tipos de carbón específicos del proveedor seleccionado
  useEffect(() => {
    let cancel = false;
    setIdTipoCarbon(null);

    if (!idProveedor) {
      setTipos([]);
      return;
    }

    (async () => {
      setLoadingTipos(true);
      try {
        const res = await CompraCarbonService.getTiposPorProveedor(Number(idProveedor));
        if (cancel) return;
        if (res.success && res.data) {
          setTipos(res.data);
        } else {
          setTipos([]);
        }
      } catch (e) {
        if (!cancel) {
          console.error(e);
          notifyError("Error al cargar los tipos de carbón del proveedor");
          setTipos([]);
        }
      } finally {
        if (!cancel) setLoadingTipos(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [idProveedor, notifyError]);

  // Proveedores visibles con búsqueda tolerante (getCoincidencias)
  const proveedoresVisibles = useMemo(() => {
    const q = proveedorBusqueda.trim();
    if (!q) return proveedores;
    return getCoincidencias(proveedores, q, {
      keys: ["razon_social", "ruc", "dni"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [proveedores, proveedorBusqueda]);

  // Tarifa mayor para el tipo de carbón seleccionado
  const tarifaMayor = useMemo(() => {
    if (!idTipoCarbon) return null;
    const idTipoNum = Number(idTipoCarbon);
    const tarifasDelTipo = tarifas.filter(
      (t) =>
        t.id_tipo_carbon === idTipoNum && (t.estado ?? "Activo") === "Activo",
    );
    if (tarifasDelTipo.length === 0) return null;
    return tarifasDelTipo.reduce((max, cur) =>
      Number(cur.precio_unitario) > Number(max.precio_unitario) ? cur : max,
    );
  }, [idTipoCarbon, tarifas]);

  const precioUnitarioEstimado = Number(tarifaMayor?.precio_unitario ?? 0);
  const cantidadNum = Number(cantidad) || 0;
  const subtotalEstimado =
    Math.round(cantidadNum * precioUnitarioEstimado * 100) / 100;

  const handleSubmit = async () => {
    setError(null);

    if (!idEmpresa) {
      setError("Debe seleccionar una empresa");
      return;
    }
    if (!idProveedor) {
      setError("Debe seleccionar un proveedor de carbón");
      return;
    }
    if (!idTipoCarbon) {
      setError("Debe seleccionar el tipo de carbón a comprar");
      return;
    }
    if (cantidadNum <= 0) {
      setError("La cantidad en toneladas debe ser mayor a 0");
      return;
    }

    setSaving(true);
    try {
      const resp = await CompraCarbonService.crearPreliminar({
        id_empresa: Number(idEmpresa),
        id_proveedor: Number(idProveedor),
        detalles: [
          {
            id_tipo_carbon: Number(idTipoCarbon),
            cantidad: cantidadNum,
            precio_unitario: precioUnitarioEstimado,
          },
        ],
      });

      if (!resp.success || !resp.data) {
        setError(resp.message || "Error al registrar la compra preliminar");
        return;
      }

      notifySuccess(
        `Compra preliminar ${resp.data.cabecera.correlativo} registrada exitosamente`,
      );
      onCreated({
        ...resp.data.cabecera,
        cantidad_items: resp.data.detalles.length || 1,
      });
    } catch (e) {
      console.error(e);
      setError("Ocurrió un error inesperado al registrar la compra preliminar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert color="red" radius="lg" variant="light">
          <Text size="xs">{error}</Text>
        </Alert>
      )}

      {/* Cabecera */}
      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/40 border border-zinc-800"
      >
        {/* <Text
          size="xs"
          fw={700}
          c="dimmed"
          className="uppercase tracking-wider mb-3"
        >
          1. Datos de Cabecera
        </Text> */}
        <Group gap="md" grow>
          <Select
            label="Empresa compradora"
            placeholder="Seleccione la empresa"
            leftSection={
              <IconBuildingStore className="w-4 h-4 text-zinc-400" />
            }
            data={empresas.map((e) => ({
              value: String(e.id_empresa),
              label: e.razon_social,
            }))}
            value={idEmpresa}
            onChange={setIdEmpresa}
            size="xs"
            radius="lg"
            classNames={inputClasses}
            searchable
            disabled={loadingCatalogos || saving}
            required
          />

          <Select
            label="Proveedor de Carbón"
            placeholder="Buscar por razón social o documento..."
            leftSection={<IconUsers className="w-4 h-4 text-zinc-400" />}
            data={proveedoresVisibles.map((p) => ({
              value: String(p.id_proveedor),
              label: `${p.razon_social} (${p.tipo_entidad === "Natural" ? `DNI ${p.dni}` : `RUC ${p.ruc}`})`,
            }))}
            value={idProveedor}
            onChange={setIdProveedor}
            searchValue={proveedorBusqueda}
            onSearchChange={setProveedorBusqueda}
            size="xs"
            radius="lg"
            clearable
            classNames={inputClasses}
            searchable
            nothingFoundMessage="No se encontraron proveedores"
            disabled={loadingCatalogos || saving}
            required
          />
        </Group>
      </Paper>

      {/* Detalle único */}
      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/40 border border-zinc-800"
      >
        {/* <Text
          size="xs"
          fw={700}
          c="dimmed"
          className="uppercase tracking-wider mb-3"
        >
          2. Detalle de la Carga a Comprar
        </Text> */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Tipo de carbón"
            placeholder={
              !idProveedor
                ? "Primero elija un proveedor..."
                : loadingTipos
                  ? "Cargando tipos del proveedor..."
                  : tipos.length === 0
                    ? "Este proveedor no tiene tipos de carbón asignados"
                    : "Seleccionar tipo de carbón"
            }
            leftSection={<IconFlame className="w-4 h-4 text-amber-500" />}
            data={tipos.map((t) => ({
              value: String(t.id_tipo_carbon),
              label: `${t.nombre}${t.codigo ? ` (${t.codigo})` : ""}`,
            }))}
            value={idTipoCarbon}
            onChange={setIdTipoCarbon}
            size="xs"
            radius="lg"
            classNames={inputClasses}
            searchable
            disabled={
              !idProveedor || loadingTipos || loadingCatalogos || saving
            }
            nothingFoundMessage="No hay tipos de carbón para este proveedor"
            required
          />

          <NumberInput
            label="Cantidad estimada (TM)"
            placeholder="0.00"
            leftSection={<IconScale className="w-4 h-4 text-zinc-400" />}
            value={cantidad}
            onChange={setCantidad}
            step={0.1}
            fixedDecimalScale
            size="xs"
            radius="lg"
            classNames={inputClasses}
            disabled={saving}
            required
          />
        </div>

        {/* Resumen de Tarifa Aplicada */}
        <div className="mt-4 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col md:flex-row items-center justify-between gap-3">
          <div>
            <Group gap="xs">
              <Badge variant="light" color="amber" size="sm">
                Tarifa Mayor Aplicada
              </Badge>
              {tarifaMayor ? (
                <Text size="xs" c="zinc.3">
                  Ceniza: {tarifaMayor.inicio_porcentaje_ceniza}% -{" "}
                  {tarifaMayor.fin_porcentaje_ceniza}%
                </Text>
              ) : (
                <Text size="xs" c="gray.5">
                  {idTipoCarbon
                    ? "Sin tarifa registrada (S/ 0.00)"
                    : "Seleccione un tipo de carbón"}
                </Text>
              )}
            </Group>
            <Text size="xs" c="zinc.4" mt={2}>
              Precio por TM:{" "}
              <span className="font-mono font-bold text-white">
                {formatPEN(precioUnitarioEstimado)}
              </span>
            </Text>
          </div>

          <div className="text-right">
            <Text size="11px" c="gray.5" className="uppercase tracking-wider">
              Total Estimado Preliminar
            </Text>
            <Text size="lg" fw={900} c="emerald.4" className="font-mono">
              {formatPEN(subtotalEstimado)}
            </Text>
          </div>
        </div>
      </Paper>

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
          color="indigo"
          size="xs"
          radius="lg"
          onClick={handleSubmit}
          loading={saving}
        >
          Guardar Compra Preliminar
        </Button>
      </Group>
    </div>
  );
};
