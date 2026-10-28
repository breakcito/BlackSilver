import { useEffect, useMemo, useRef, useState } from "react";
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
  IconCreditCard,
} from "@tabler/icons-react";

import { useNotify } from "../../../hooks/useNotify";
import { AuxService } from "../../../service/auxiliar.service";
import type { RES_Empresa } from "../../../service/responses/empresa";
import type { RES_CuentaProveedor } from "../../../service/responses/cuenta-proveedor";
import type { RES_TipoCarbon } from "../../tipo-carbon/service/tipo-carbon.responses";
import { Moneda } from "../../../shared/enums/_generic/moneda";
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
  /**
   * Si viene definida, el componente entra en modo edicion: precarga los
   * estados con los valores de la compra indicada y al guardar llama a
   * CompraCarbonService.actualizarCompra. Si es null, modo registro normal.
   */
  compraInicial?: CompraCarbonResumen | null;
  /**
   * Callback cuando la edicion termina OK. No se usa en modo registro.
   */
  onUpdated?: (compra: CompraCarbonResumen) => void;
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

/**
 * Detracción SUNAT sobre el carbón: 10%, y solo si la compra aplica IGV.
 * El valor viaja al backend y queda guardado en `compra_carbon`.
 */
const PORCENTAJE_DETRACCION = 10;

export const RegistroCompraCarbon = ({
  onCancel,
  onCreated,
  compraInicial,
  onUpdated,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  const [empresas, setEmpresas] = useState<RES_Empresa[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorResponse[]>([]);
  const [tipos, setTipos] = useState<RES_TipoCarbon[]>([]);
  const [cuentasProveedor, setCuentasProveedor] = useState<
    RES_CuentaProveedor[]
  >([]);

  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [loadingProveedores, setLoadingProveedores] = useState(true);
  const [loadingTipos, setLoadingTipos] = useState(false);
  const [loadingCuentas, setLoadingCuentas] = useState(false);

  const [proveedorBusqueda, setProveedorBusqueda] = useState("");
  const [cuentaBusqueda, setCuentaBusqueda] = useState("");

  // Cabecera preliminar
  const [idEmpresa, setIdEmpresa] = useState<string | null>(null);
  const [idProveedor, setIdProveedor] = useState<string | null>(null);
  const [idCuentaProveedor, setIdCuentaProveedor] = useState<string | null>(
    null,
  );
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

  const esEdicion = Boolean(compraInicial);

  /**
   * Tipo de carbón con el que se precargó la compra en modo edición. Sirve
   * para no pisar su tarifa ni su precio al auto-completar.
   */
  const tipoCarbonPrecargadoRef = useRef<string | null>(null);

  // Precarga de estado cuando llega una compra inicial (modo edicion).
  useEffect(() => {
    if (!compraInicial) return;
    setIdEmpresa(String(compraInicial.id_empresa));
    setIdProveedor(String(compraInicial.id_proveedor));
    setAplicaIgv(Boolean(compraInicial.aplica_igv));
    setIdTipoCarbon(String(compraInicial.id_tipo_carbon_prometido));
    setToneladasPrometidas(Number(compraInicial.toneladas_prometidas));
    setPrecioUnitario(Number(compraInicial.precio_unitario_cotizado));
    setIdTarifaAuto(
      compraInicial.id_tarifa_carbon
        ? Number(compraInicial.id_tarifa_carbon)
        : null,
    );
    setIdCuentaProveedor(
      compraInicial.id_cuenta_proveedor
        ? String(compraInicial.id_cuenta_proveedor)
        : null,
    );
    tipoCarbonPrecargadoRef.current = String(
      compraInicial.id_tipo_carbon_prometido,
    );
  }, [compraInicial]);

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

  // Al cambiar de proveedor, cargar las cuentas bancarias en soles y que
  // no sean de detraccion. Se limpian al cambiar de proveedor.
  useEffect(() => {
    setCuentasProveedor([]);
    // NO reseteamos idCuentaProveedor aquí: en modo edición el useEffect de
    // precarga (compraInicial) setea la cuenta y este useEffect se vuelve a
    // disparar, pisándolo. El reset real ocurre en el onChange del Select de
    // proveedor, solo cuando el usuario cambia el proveedor manualmente.
    setCuentaBusqueda("");

    if (!idProveedor) {
      return;
    }

    let cancel = false;
    setLoadingCuentas(true);
    (async () => {
      try {
        const cuentasRes = await AuxService.get_cuentas_proveedor({
          id_proveedor: Number(idProveedor),
          moneda: Moneda.Soles,
          es_para_detraccion: false,
        });
        if (cancel) return;
        if (cuentasRes.success && cuentasRes.data) {
          const list = Array.isArray(cuentasRes.data)
            ? cuentasRes.data
            : [cuentasRes.data];
          setCuentasProveedor(list);
          // Se preselecciona la primera cuenta que devuelve la API, pero solo
          // si no hay ninguna elegida: en modo edicion la cuenta precargada
          // de la compra no debe ser reemplazada.
          if (list.length > 0) {
            setIdCuentaProveedor((prev) =>
              prev ?? String(list[0].id_cuenta_bancaria),
            );
          }
        }
      } catch (err: unknown) {
        console.error(err);
      } finally {
        if (!cancel) setLoadingCuentas(false);
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

    // En modo edicion la compra ya tiene su tarifa y su precio: no se
    // sobreescriben hasta que el usuario cambie el tipo de carbón.
    if (esEdicion && tipoCarbonPrecargadoRef.current === idTipoCarbon) {
      return;
    }
    tipoCarbonPrecargadoRef.current = idTipoCarbon;

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
  }, [idTipoCarbon, esEdicion]);

  // Proveedores filtrados con búsqueda tolerante
  const proveedoresVisibles = useMemo(() => {
    const q = proveedorBusqueda.trim();
    if (!q) return proveedores;
    return getCoincidencias(proveedores, q, {
      keys: ["razon_social", "ruc", "dni"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [proveedores, proveedorBusqueda]);

  // Cuentas visibles con busqueda tolerante (Regla 11 README).
  const cuentasVisibles = useMemo(() => {
    const q = cuentaBusqueda.trim();
    if (!q) return cuentasProveedor;
    return getCoincidencias(cuentasProveedor, q, {
      keys: ["banco", "numero_cuenta", "cci"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [cuentasProveedor, cuentaBusqueda]);

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

  // Cascada de la compra: subtotal -> IGV -> total -> detracción -> neto a
  // pagar. La detracción es 10% y solo aplica si la compra emite IGV; el
  // porcentaje viaja al backend y queda en `compra_carbon`.
  const totalConIgv = useMemo(() => {
    return Math.round((totalCotizado + montoIgvCotizado) * 100) / 100;
  }, [totalCotizado, montoIgvCotizado]);

  const montoDetraccionCotizado = useMemo(() => {
    if (!aplicaIgv) return 0;
    return (
      Math.round(((totalConIgv * PORCENTAJE_DETRACCION) / 100) * 100) / 100
    );
  }, [aplicaIgv, totalConIgv]);

  const netoAPagarCotizado = useMemo(() => {
    return Math.round((totalConIgv - montoDetraccionCotizado) * 100) / 100;
  }, [totalConIgv, montoDetraccionCotizado]);

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
      if (esEdicion && compraInicial) {
        const res = await CompraCarbonService.actualizarCompra(
          compraInicial.id_compra_carbon,
          {
            id_empresa: Number(idEmpresa),
            id_proveedor: Number(idProveedor),
            id_tipo_carbon_prometido: Number(idTipoCarbon),
            id_tarifa_carbon: idTarifaAuto,
            id_cuenta_proveedor: idCuentaProveedor
              ? Number(idCuentaProveedor)
              : null,
            aplica_igv: aplicaIgv,
            porcentaje_igv: aplicaIgv ? porcentajeIgv : 0,
            toneladas_prometidas: tn,
            precio_unitario_cotizado: Number(precioUnitario) || 0,
          },
        );

        if (res.success && res.data) {
          notifySuccess("Orden de compra actualizada correctamente");
          onUpdated?.(res.data);
          onCreated(res.data);
        } else {
          setError(res.message || "Error al actualizar la orden");
          notifyError(res.message || "Error al actualizar la orden");
        }
      } else {
        const res = await CompraCarbonService.crearCompra({
          id_empresa: Number(idEmpresa),
          id_proveedor: Number(idProveedor),
          id_tipo_carbon_prometido: Number(idTipoCarbon),
          toneladas_prometidas: tn,
          aplica_igv: aplicaIgv,
          porcentaje_igv: aplicaIgv ? porcentajeIgv : 0,
          precio_unitario_cotizado: Number(precioUnitario) || 0,
          id_tarifa_carbon: idTarifaAuto,
          id_cuenta_proveedor: idCuentaProveedor
            ? Number(idCuentaProveedor)
            : null,
        });

        if (res.success && res.data) {
          notifySuccess("Orden de compra preliminar creada correctamente");
          onCreated(res.data);
        } else {
          setError(res.message || "Error al crear la orden de compra");
          notifyError(res.message || "Error al crear la orden");
        }
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
        <Group justify="space-between" align="center">
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">
            Datos de la Compra
          </Text>

          <Group gap="sm">
            <Text size="xs" fw={600} c="white">
              ¿Aplica IGV?
            </Text>
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

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
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
            clearable
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
            onChange={(val) => {
              setIdProveedor(val);
              setIdCuentaProveedor(null);
            }}
            searchValue={proveedorBusqueda}
            onSearchChange={setProveedorBusqueda}
            leftSection={<IconUsers size={16} />}
            rightSection={
              loadingProveedores ? <Loader size={14} color="indigo" /> : null
            }
            disabled={loadingProveedores || saving}
            classNames={inputClasses}
            searchable
            clearable
            nothingFoundMessage="Sin coincidencias"
            size="xs"
            radius="lg"
          />

          <Select
            label="Cuenta del proveedor"
            placeholder={
              idProveedor ? "Seleccione cuenta" : "Elija primero el proveedor"
            }
            data={cuentasVisibles.map((c) => ({
              value: String(c.id_cuenta_bancaria),
              label: `${c.banco} — ${c.numero_cuenta}${c.cci ? ` / CCI ${c.cci}` : ""}`,
            }))}
            value={idCuentaProveedor}
            onChange={setIdCuentaProveedor}
            searchValue={cuentaBusqueda}
            onSearchChange={setCuentaBusqueda}
            leftSection={<IconCreditCard size={16} />}
            rightSection={
              loadingCuentas ? <Loader size={14} color="indigo" /> : null
            }
            disabled={!idProveedor || loadingCuentas || saving}
            classNames={inputClasses}
            searchable
            clearable
            nothingFoundMessage="El proveedor no tiene cuentas en soles / sin detracción"
            size="xs"
            radius="lg"
            comboboxProps={{ withinPortal: true }}
          />
        </SimpleGrid>
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
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
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
        </SimpleGrid>

        {/* Resumen de totales */}
        <Group justify="space-between" grow mt={12}>
          <div className="text-left">
            <Text size="xs" c="gray">
              Subtotal
            </Text>
            <Text size="md" fw={800} c="teal">
              {formatPEN(totalCotizado)}
            </Text>
          </div>
          <div className="text-left">
            <Text size="xs" c="gray">
              {aplicaIgv ? `IGV (${porcentajeIgv}%)` : "IGV (-)"}
            </Text>
            <Text size="md" fw={800} c="gray.3">
              {formatPEN(montoIgvCotizado)}
            </Text>
          </div>
          <div className="text-left">
            <Text size="xs" c="gray">
              Total
            </Text>
            <Text size="md" fw={800} c="white">
              {formatPEN(totalConIgv)}
            </Text>
          </div>
          <div className="text-left">
            <Text size="xs" c="gray">
              {aplicaIgv
                ? `Detracción (${PORCENTAJE_DETRACCION}%)`
                : "Detracción (-)"}
            </Text>
            <Text size="md" fw={800} c="orange.4">
              {formatPEN(montoDetraccionCotizado)}
            </Text>
          </div>
          <div className="text-left">
            <Text size="xs" c="gray">
              Neto a pagar
            </Text>
            <Text size="md" fw={800} c="lime.4">
              {formatPEN(netoAPagarCotizado)}
            </Text>
          </div>
        </Group>
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
