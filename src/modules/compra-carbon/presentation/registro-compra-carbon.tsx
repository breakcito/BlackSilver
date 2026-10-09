import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  Switch,
  Text,
  Stack,
  SimpleGrid,
} from "@mantine/core";
import {
  IconBuildingStore,
  IconFlame,
  IconScale,
  IconUsers,
  IconReceiptTax,
  IconCoin,
} from "@tabler/icons-react";

import { useNotify } from "../../../hooks/useNotify";
import { AuxService } from "../../../service/auxiliar.service";
import type { RES_Empresa } from "../../../service/responses/empresa";
import type { RES_TipoCarbon } from "../../tipo-carbon/service/tipo-carbon.responses";
import { TipoCarbonService } from "../../tipo-carbon/service/tipo-carbon.service";
import { ProveedoresService } from "../../proveedores/service/proveedores.service";
import type { ProveedorResponse } from "../../proveedores/service/proveedores.responses";
import { CompraCarbonService } from "../service/compra-carbon.service";
import type { CompraCarbonResumen } from "../service/compra-carbon.responses";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { getCoincidencias } from "../../../shared/functions/get-coincidencias";

interface Props {
  onCancel: () => void;
  onCreated: (compra: CompraCarbonResumen) => void;
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

  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [loadingProveedores, setLoadingProveedores] = useState(true);
  const [loadingTipos, setLoadingTipos] = useState(false);

  const [proveedorBusqueda, setProveedorBusqueda] = useState("");

  // Cabecera preliminar
  const [idEmpresa, setIdEmpresa] = useState<string | null>(null);
  const [idProveedor, setIdProveedor] = useState<string | null>(null);
  const [aplicaIgv, setAplicaIgv] = useState<boolean>(false);
  const [porcentajeIgv] = useState<number>(18);

  // Detalle prometido
  const [idTipoCarbon, setIdTipoCarbon] = useState<string | null>(null);
  const [toneladasPrometidas, setToneladasPrometidas] = useState<
    number | string
  >(0);
  const [precioUnitario, setPrecioUnitario] = useState<number | string>(0);
  const [idTarifaAuto, setIdTarifaAuto] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar empresas y proveedores iniciales
  useEffect(() => {
    let cancel = false;
    setLoadingEmpresas(true);
    setLoadingProveedores(true);

    (async () => {
      try {
        const empRes = await AuxService.get_empresas();
        if (cancel) return;
        if (empRes.success && empRes.data) {
          setEmpresas(empRes.data);
          // Auto-elegir Cupper por defecto
          const cupper = empRes.data.find((e) =>
            /cupper/i.test(e.razon_social || ""),
          );
          if (cupper) {
            setIdEmpresa(String(cupper.id_empresa));
          } else if (empRes.data.length > 0) {
            setIdEmpresa(String(empRes.data[0].id_empresa));
          }
        }
      } catch (err: unknown) {
        console.error(err);
      } finally {
        if (!cancel) setLoadingEmpresas(false);
      }
    })();

    (async () => {
      try {
        const provRes = await ProveedoresService.getProveedores({
          para_carbon: true,
          sin_lugares: true,
        });
        if (cancel) return;
        if (provRes) {
          setProveedores(provRes);
        }
      } catch (err: unknown) {
        console.error(err);
      } finally {
        if (!cancel) setLoadingProveedores(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, []);

  // Al cambiar de proveedor, cargar los tipos de carbón que ofrece
  useEffect(() => {
    if (!idProveedor) {
      setTipos([]);
      setIdTipoCarbon(null);
      return;
    }

    let cancel = false;
    setLoadingTipos(true);
    (async () => {
      try {
        const tiposRes = await TipoCarbonService.getTipos({
          id_proveedor: Number(idProveedor),
        });
        if (cancel) return;
        if (tiposRes.success && tiposRes.data) {
          setTipos(tiposRes.data);
          if (tiposRes.data.length === 1) {
            setIdTipoCarbon(String(tiposRes.data[0].id_tipo_carbon));
          }
        }
      } catch (err: unknown) {
        console.error(err);
      } finally {
        if (!cancel) setLoadingTipos(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [idProveedor]);

  // Al seleccionar tipo de carbón, autocompletar con la tarifa más alta
  useEffect(() => {
    if (!idTipoCarbon) {
      setPrecioUnitario(0);
      setIdTarifaAuto(null);
      return;
    }

    let cancel = false;
    (async () => {
      try {
        const tarifasRes = await AuxService.get_tarifas_carbon({
          id_tipo_carbon: Number(idTipoCarbon),
        });
        if (cancel) return;
        if (tarifasRes.success && tarifasRes.data) {
          const list = Array.isArray(tarifasRes.data)
            ? tarifasRes.data
            : [tarifasRes.data];
          if (list.length > 0) {
            // Obtener la de mayor precio
            const ordenada = [...list].sort(
              (a, b) => Number(b.precio_unitario) - Number(a.precio_unitario),
            );
            const mayor = ordenada[0];
            setIdTarifaAuto(mayor.id_tarifa_carbon);
            setPrecioUnitario(Number(mayor.precio_unitario));
          } else {
            setIdTarifaAuto(null);
          }
        } else {
          setIdTarifaAuto(null);
        }
      } catch (err) {
        console.error(err);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [idTipoCarbon]);

  // Proveedores filtrados con búsqueda tolerante
  const proveedoresVisibles = useMemo(() => {
    const q = proveedorBusqueda.trim();
    if (!q) return proveedores;
    return getCoincidencias(proveedores, q, {
      keys: ["razon_social", "ruc", "dni"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [proveedores, proveedorBusqueda]);

  // Cálculos de cotización
  const totalCotizado = useMemo(() => {
    const cant = Number(toneladasPrometidas) || 0;
    const pu = Number(precioUnitario) || 0;
    return Math.round(cant * pu * 100) / 100;
  }, [toneladasPrometidas, precioUnitario]);

  const montoIgvCotizado = useMemo(() => {
    if (!aplicaIgv) return 0;
    return Math.round(totalCotizado * (porcentajeIgv / 100) * 100) / 100;
  }, [aplicaIgv, totalCotizado, porcentajeIgv]);

  const handleSubmit = async () => {
    setError(null);
    if (!idEmpresa) {
      setError("Debe seleccionar la empresa compradora");
      return;
    }
    if (!idProveedor) {
      setError("Debe seleccionar el proveedor");
      return;
    }
    if (!idTipoCarbon) {
      setError("Debe seleccionar el tipo de carbón prometido");
      return;
    }
    const tn = Number(toneladasPrometidas);
    if (isNaN(tn) || tn <= 0) {
      setError("Debe indicar una cantidad válida de toneladas (> 0)");
      return;
    }

    setSaving(true);
    try {
      const res = await CompraCarbonService.crearCompra({
        id_empresa: Number(idEmpresa),
        id_proveedor: Number(idProveedor),
        id_tipo_carbon_prometido: Number(idTipoCarbon),
        toneladas_prometidas: tn,
        aplica_igv: aplicaIgv,
        porcentaje_igv: aplicaIgv ? porcentajeIgv : 0,
        precio_unitario_cotizado: Number(precioUnitario) || 0,
        id_tarifa_carbon: idTarifaAuto,
      });

      if (res.success && res.data) {
        notifySuccess("Orden de compra preliminar creada correctamente");
        onCreated(res.data);
      } else {
        setError(res.message || "Error al crear la orden de compra");
        notifyError(res.message || "Error al crear la orden");
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

      {/* Datos de Cabecera */}
      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/60 border border-zinc-800"
      >
        <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">
          Datos de la Compra
        </Text>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Select
            label="Empresa compradora"
            placeholder="Seleccione empresa"
            data={empresas.map((e) => ({
              value: String(e.id_empresa),
              label: e.razon_social,
            }))}
            value={idEmpresa}
            onChange={setIdEmpresa}
            leftSection={<IconBuildingStore size={16} />}
            rightSection={
              loadingEmpresas ? <Loader size={14} color="indigo" /> : null
            }
            disabled={loadingEmpresas || saving}
            classNames={inputClasses}
            searchable
            nothingFoundMessage="Sin empresas registradas"
            size="xs"
            radius="lg"
          />

          <Select
            label="Proveedor"
            placeholder="Buscar por RUC o Razón Social"
            data={proveedoresVisibles.map((p) => ({
              value: String(p.id_proveedor),
              label: `${p.razon_social} (${p.ruc || p.dni || "S/D"})`,
            }))}
            value={idProveedor}
            onChange={setIdProveedor}
            searchValue={proveedorBusqueda}
            onSearchChange={setProveedorBusqueda}
            leftSection={<IconUsers size={16} />}
            rightSection={
              loadingProveedores ? <Loader size={14} color="indigo" /> : null
            }
            disabled={loadingProveedores || saving}
            classNames={inputClasses}
            searchable
            nothingFoundMessage="Sin coincidencias"
            size="xs"
            radius="lg"
          />
        </SimpleGrid>

        <Group
          justify="space-between"
          mt="md"
          align="center"
          className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80"
        >
          <div>
            <Text size="xs" fw={600} c="white">
              ¿Esta compra aplica IGV esta?
            </Text>
            <Text size="xs" c="gray">
              Determina si se requerirán comprobantes/facturas o pagos directos
              al proveedor
            </Text>
          </div>
          <Group gap="sm">
            <Badge
              color={aplicaIgv ? "indigo" : "gray"}
              variant="light"
              size="sm"
            >
              {aplicaIgv ? `IGV (${porcentajeIgv}%)` : "Sin IGV"}
            </Badge>
            <Switch
              checked={aplicaIgv}
              onChange={(e) => setAplicaIgv(e.currentTarget.checked)}
              color="indigo"
              size="sm"
            />
          </Group>
        </Group>
      </Paper>

      {/* Tipo de carbón y cotización */}
      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/60 border border-zinc-800"
      >
        <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">
          Carga a cotizar
        </Text>
        <SimpleGrid cols={{ base: 1, md: 4 }} spacing="md">
          <Select
            label="Tipo de carbón"
            placeholder={
              idProveedor
                ? "Seleccione tipo ofrecido"
                : "Elija primero el proveedor"
            }
            data={tipos.map((t) => ({
              value: String(t.id_tipo_carbon),
              label: `${t.nombre} ${t.codigo ? `(${t.codigo})` : ""}`,
            }))}
            value={idTipoCarbon}
            onChange={setIdTipoCarbon}
            leftSection={<IconFlame size={16} />}
            rightSection={
              loadingTipos ? <Loader size={14} color="indigo" /> : null
            }
            disabled={!idProveedor || loadingTipos || saving}
            classNames={inputClasses}
            searchable
            clearable
            nothingFoundMessage="El proveedor no tiene tipos de carbón asignados"
            size="xs"
            radius="lg"
          />

          <NumberInput
            label="Toneladas (TM)"
            placeholder="Ej. 100"
            value={toneladasPrometidas}
            onChange={setToneladasPrometidas}
            step={1}
            leftSection={<IconScale size={16} />}
            classNames={inputClasses}
            disabled={saving}
            size="xs"
            radius="lg"
          />

          <NumberInput
            label="Precio x TN (S/)"
            placeholder="0.00"
            value={precioUnitario}
            onChange={setPrecioUnitario}
            fixedDecimalScale
            leftSection={<IconCoin size={16} />}
            classNames={inputClasses}
            disabled={saving}
            size="xs"
            radius="lg"
          />

          {/* Resumen de totales */}
          <Group justify="space-between">
            <div className="text-left">
              <Text size="xs" c="gray">
                Total cotizado
              </Text>
              <Text size="md" fw={800} c="teal">
                {formatPEN(totalCotizado)}
              </Text>
            </div>
            {aplicaIgv && (
              <div className="text-right">
                <Text size="xs" c="gray">
                  IGV (18% ref.)
                </Text>
                <Text size="md" fw={800} c="gray.3">
                  {formatPEN(montoIgvCotizado)}
                </Text>
              </div>
            )}
          </Group>
        </SimpleGrid>
      </Paper>

      {/* Botones de acción */}
      <Group justify="flex-end" gap="sm" mt="xs">
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
          leftSection={<IconReceiptTax size={16} />}
        >
          Guardar orden preliminar
        </Button>
      </Group>
    </Stack>
  );
};
