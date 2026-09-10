import {
  ActionIcon,
  Badge,
  Button,
  rem,
  Stack,
  Tabs,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconBuilding,
  IconEye,
  IconFlame,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { DataTableColumn } from "mantine-datatable";
import dayjs from "dayjs";
import "dayjs/locale/es";

import { useTitlePage } from "../../../../hooks/useTitlePage";
import { useProveedores } from "../../hooks/useProveedores";
import { RegistroProveedor } from "../registro-proveedor/registro-proveedor";
import { RegistroProveedorCarbon } from "../registro-proveedor-carbon/registro-proveedor-carbon";
import { EdicionProveedor } from "../edicion-proveedor/edicion-proveedor";
import { CuentasBancarias } from "../cuentas-bancarias/cuentas-bancarias";
import { PersonalExternoProveedor } from "../personal-externo-proveedor/personal-externo-proveedor";
import { TiposCarbonProveedor } from "../tipos-carbon-proveedor/tipos-carbon-proveedor";
import { LugaresExtraccionProveedor } from "../lugares-extraccion-proveedor/lugares-extraccion-proveedor";
import type {
  CuentaBancariaResponse,
  LugarExtraccionResponse,
  ProveedorResponse,
  TipoCarbonProveedorResponse,
} from "../../service/proveedores.responses";
import { Proveedor } from "./components/proveedor";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { BotonRecargar } from "../../../../presentation/utils/boton-recargar";
import { DataTableEstandar } from "../../../../presentation/utils/datatable-estandar";
import { parseCambiosLog } from "../../../../presentation/utils/parse-cambios-log";

dayjs.locale("es");

type ModoProveedor = "logistica" | "carbon";

interface CambioProveedorGlobal {
  id: string;
  id_proveedor: number;
  proveedor: string;
  fecha: string;
  id_empleado: number | null;
  nombre_empleado: string;
  campo: string;
  valor_anterior: unknown;
  valor_nuevo: unknown;
}

/** Los flags viajan como 0/1 desde MySQL: se muestran como Sí/No. */
const formatValorCambio = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (v === 0 || v === "0") return "No";
  if (v === 1 || v === "1") return "Sí";
  return String(v);
};

export const ProveedoresPage = () => {
  useTitlePage("Proveedores");
  const [modo, setModo] = useState<ModoProveedor>("logistica");
  const modoCarbon = modo === "carbon";

  const {
    proveedores,
    loading,
    insertProveedor,
    updateProveedor,
    replaceProveedor,
    eliminarProveedor,
    eliminandoId,
    recargar,
  } = useProveedores(modoCarbon);

  const [openRegistro, setOpenRegistro] = useState(false);
  const [proveedorEnEdicion, setProveedorEnEdicion] =
    useState<ProveedorResponse | null>(null);
  const [openCambios, setOpenCambios] = useState(false);
  const [selectedProveedor, setSelectedProveedor] =
    useState<ProveedorResponse | null>(null);
  const [proveedorPersonal, setProveedorPersonal] =
    useState<ProveedorResponse | null>(null);
  const [proveedorTiposCarbon, setProveedorTiposCarbon] =
    useState<ProveedorResponse | null>(null);
  const [proveedorLugares, setProveedorLugares] =
    useState<ProveedorResponse | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const proveedorEnGestion =
    selectedProveedor
      ? (proveedores.find((p) => p.id_proveedor === selectedProveedor.id_proveedor) ??
        selectedProveedor)
      : null;

  const proveedorPersonalEnGestion =
    proveedorPersonal
      ? (proveedores.find(
          (p) => p.id_proveedor === proveedorPersonal.id_proveedor,
        ) ?? proveedorPersonal)
      : null;

  const proveedorTiposCarbonEnGestion =
    proveedorTiposCarbon
      ? (proveedores.find(
          (p) => p.id_proveedor === proveedorTiposCarbon.id_proveedor,
        ) ?? proveedorTiposCarbon)
      : null;

  const proveedorLugaresEnGestion =
    proveedorLugares
      ? (proveedores.find(
          (p) => p.id_proveedor === proveedorLugares.id_proveedor,
        ) ?? proveedorLugares)
      : null;

  const actualizarCuentas = (
    proveedor: ProveedorResponse,
    cuentas: CuentaBancariaResponse[],
  ): ProveedorResponse => ({
    ...proveedor,
    cuentas_bancarias: cuentas,
    cantidad_cuentas_bancarias: cuentas.length,
  });

  const handleCuentaActualizada = (cuenta: CuentaBancariaResponse) => {
    if (!selectedProveedor) return;

    // selectedProveedor queda stale tras cada cambio; leer el array
    // actual desde el state global para no perder cuentas previas.
    const proveedorActual = proveedores.find(
      (p) => p.id_proveedor === selectedProveedor.id_proveedor,
    );
    const cuentasActuales = proveedorActual?.cuentas_bancarias ?? [];

    const cuentasActualizadas = cuentasActuales.map((c) =>
      c.id_cuenta_bancaria === cuenta.id_cuenta_bancaria ? cuenta : c,
    );

    updateProveedor(
      selectedProveedor.id_proveedor,
      actualizarCuentas(proveedorActual ?? selectedProveedor, cuentasActualizadas),
    );
  };

  const handleCuentaAgregada = (cuenta: CuentaBancariaResponse) => {
    if (!selectedProveedor) return;

    // selectedProveedor queda stale tras cada cambio; leer el array
    // actual desde el state global para no perder cuentas previas.
    const proveedorActual = proveedores.find(
      (p) => p.id_proveedor === selectedProveedor.id_proveedor,
    );
    const cuentasActuales = proveedorActual?.cuentas_bancarias ?? [];

    const cuentasActualizadas = [cuenta, ...cuentasActuales];

    updateProveedor(
      selectedProveedor.id_proveedor,
      actualizarCuentas(proveedorActual ?? selectedProveedor, cuentasActualizadas),
    );
  };

  const handleTiposCarbonGuardados = (
    proveedor: ProveedorResponse,
    tipos: TipoCarbonProveedorResponse[],
  ) => {
    updateProveedor(proveedor.id_proveedor, {
      cantidad_tipos_carbon: tipos.length,
      tipos_carbon: tipos,
    });
  };

  const handleLugaresGuardados = (
    proveedor: ProveedorResponse,
    lugares: LugarExtraccionResponse[],
  ) => {
    updateProveedor(proveedor.id_proveedor, {
      cantidad_lugares_extraccion: lugares.length,
      lugares_extraccion: lugares,
    });
  };

  const iconStyle = { width: rem(18), height: rem(18) };

  const cambiosGlobal = useMemo<CambioProveedorGlobal[]>(() => {
    const lista: CambioProveedorGlobal[] = [];
    proveedores.forEach((p) => {
      const logs = parseCambiosLog(p.cambios_log);
      logs.forEach((log) => {
        const nombreEmpleado = log.nombre_empleado?.trim() || "—";
        log.cambios.forEach((cambio) => {
          lista.push({
            id: `${p.id_proveedor}-${log.update_at}-${cambio.campo_bd ?? cambio.campo ?? Math.random()}`,
            id_proveedor: p.id_proveedor,
            proveedor: p.razon_social,
            fecha: log.update_at,
            id_empleado: log.id_empleado ?? null,
            nombre_empleado: nombreEmpleado,
            campo: cambio.campo ?? cambio.campo_bd ?? "—",
            valor_anterior: cambio.valor_anterior,
            valor_nuevo: cambio.valor_nuevo,
          });
        });
      });
    });
    lista.sort((a, b) => dayjs(b.fecha).valueOf() - dayjs(a.fecha).valueOf());
    return lista;
  }, [proveedores]);

  const cambiosColumns: DataTableColumn<CambioProveedorGlobal>[] = [
    { accessor: "index", title: "#", textAlign: "center", width: 50 },
    {
      accessor: "proveedor",
      title: "Proveedor",
      width: 220,
      render: (r) => (
        <Text size="sm" className="text-zinc-200 font-medium">
          {r.proveedor}
        </Text>
      ),
    },
    {
      accessor: "campo",
      title: "Campo",
      width: 180,
      render: (r) => (
        <Badge color="indigo" variant="light" size="sm" radius="sm">
          {r.campo}
        </Badge>
      ),
    },
    {
      accessor: "valor_anterior",
      title: "Valor Anterior",
      width: 160,
      render: (r) => (
        <Text size="xs" className="text-zinc-400 line-through">
          {formatValorCambio(r.valor_anterior)}
        </Text>
      ),
    },
    {
      accessor: "valor_nuevo",
      title: "Valor Nuevo",
      width: 160,
      render: (r) => (
        <Text size="xs" className="text-emerald-300 font-semibold">
          {formatValorCambio(r.valor_nuevo)}
        </Text>
      ),
    },
    {
      accessor: "nombre_empleado",
      title: "Modificado por",
      width: 200,
      render: (r) => (
        <Text size="xs" className="text-zinc-300">
          {r.nombre_empleado}
        </Text>
      ),
    },
    {
      accessor: "fecha",
      title: "Fecha",
      width: 170,
      render: (r) => (
        <Text size="xs" className="text-zinc-400">
          {dayjs(r.fecha).format("DD MMM YYYY, HH:mm:ss")}
        </Text>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <Tabs
        value={modo}
        onChange={(v) => setModo((v as ModoProveedor) ?? "logistica")}
        variant="pills"
        color="pink"
        classNames={{
          root: "space-y-6",
          list: "bg-zinc-950/80 p-0 rounded-[20px] border border-zinc-800 w-fit shrink-0 overflow-hidden gap-0",
          tab: "rounded-none px-8 py-3 transition-all duration-300 data-[active]:bg-pink-600! data-[active]:text-white text-zinc-400 hover:text-zinc-200 font-bold",
        }}
      >
        <div className="flex flex-col lg:flex-row gap-4 items-end justify-between">
          <div className="flex flex-col md:flex-row items-end gap-4 flex-1 w-full">
            <Tabs.List>
              <Tabs.Tab
                value="logistica"
                leftSection={<IconBuilding style={iconStyle} />}
              >
                Logistica
              </Tabs.Tab>
              <Tabs.Tab
                value="carbon"
                leftSection={<IconFlame style={iconStyle} />}
              >
                Carbon
              </Tabs.Tab>
            </Tabs.List>

            <TextInput
              label="Buscar Proveedor"
              placeholder="Buscar por razon social, RUC o DNI..."
              leftSection={<IconSearch size={16} className="text-zinc-400" />}
              radius="lg"
              size="sm"
              value={busqueda}
              onChange={(e) => setBusqueda(e.currentTarget.value)}
              className="flex-1 min-w-50"
              classNames={{
                label: "text-zinc-400 mb-1 font-medium",
                input:
                  "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all h-[38px]",
              }}
            />
          </div>

          <div className="flex gap-2 items-center shrink-0 mb-px">
            <BotonRecargar onReload={recargar} loading={loading} />
            <Tooltip label="Ver historial de cambios" position="bottom" withArrow>
              <ActionIcon
                variant="default"
                color="zinc.4"
                radius="lg"
                size={36}
                onClick={() => setOpenCambios(true)}
                className="border border-zinc-700/50"
                aria-label="Ver historial de cambios"
              >
                <IconEye size={18} stroke={1.5} />
              </ActionIcon>
            </Tooltip>
            <Button
              leftSection={<IconPlus size={18} />}
              radius="lg"
              size="sm"
              onClick={() => setOpenRegistro(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 shrink-0 h-9.5 px-8"
            >
              {modoCarbon ? "Nuevo Proveedor de Carbon" : "Nuevo Proveedor"}
            </Button>
          </div>
        </div>

        <Tabs.Panel value="logistica">
          <Proveedor
            proveedores={proveedores}
            loading={loading}
            modoCarbon={false}
            onOpenCuentas={(p) => setSelectedProveedor(p)}
            onOpenPersonal={(p) => setProveedorPersonal(p)}
            onEditar={(p) => setProveedorEnEdicion(p)}
            onEliminar={(p) => {
              void eliminarProveedor(p.id_proveedor);
            }}
            eliminandoId={eliminandoId}
          />
        </Tabs.Panel>

        <Tabs.Panel value="carbon">
          <Proveedor
            proveedores={proveedores}
            loading={loading}
            modoCarbon={true}
            onOpenCuentas={(p) => setSelectedProveedor(p)}
            onOpenPersonal={(p) => setProveedorPersonal(p)}
            onOpenTiposCarbon={(p) => setProveedorTiposCarbon(p)}
            onOpenLugaresExtraccion={(p) => setProveedorLugares(p)}
            onEditar={(p) => setProveedorEnEdicion(p)}
            onEliminar={(p) => {
              void eliminarProveedor(p.id_proveedor);
            }}
            eliminandoId={eliminandoId}
          />
        </Tabs.Panel>
      </Tabs>

      {/* Modal: Registro de Proveedor */}
      <ModalEstandar
        opened={openRegistro}
        close={() => setOpenRegistro(false)}
        title={modoCarbon ? "Nuevo Proveedor de Carbon" : "Nuevo Proveedor"}
        size="lg"
      >
        {modoCarbon ? (
          <RegistroProveedorCarbon
            onCancel={() => setOpenRegistro(false)}
            onSuccess={(p) => {
              insertProveedor(p);
              setOpenRegistro(false);
            }}
          />
        ) : (
          <RegistroProveedor
            onCancel={() => setOpenRegistro(false)}
            onSuccess={(p) => {
              insertProveedor(p);
              setOpenRegistro(false);
            }}
          />
        )}
      </ModalEstandar>

      {/* Modal: Edición de Proveedor */}
      <ModalEstandar
        opened={!!proveedorEnEdicion}
        close={() => setProveedorEnEdicion(null)}
        title={
          proveedorEnEdicion
            ? `Editar: ${proveedorEnEdicion.razon_social}`
            : "Editar Proveedor"
        }
        size="lg"
      >
        {proveedorEnEdicion && (
          <EdicionProveedor
            proveedor={proveedorEnEdicion}
            modoCarbon={modoCarbon}
            onCancel={() => setProveedorEnEdicion(null)}
            onSuccess={(p) => {
              replaceProveedor(p);
              setProveedorEnEdicion(null);
            }}
          />
        )}
      </ModalEstandar>

      {/* Modal: Historial de Cambios */}
      <ModalEstandar
        opened={openCambios}
        close={() => setOpenCambios(false)}
        title="Historial de Cambios de Proveedores"
        size="min(1250px, 95vw)"
      >
        {cambiosGlobal.length === 0 ? (
          <Stack align="center" gap="md" py={60}>
            <IconEye size={40} stroke={1.5} className="text-zinc-700" />
            <Text
              size="sm"
              fw={700}
              className="text-zinc-400 uppercase tracking-widest"
            >
              Sin cambios registrados
            </Text>
            <Text size="xs" c="dimmed">
              Aún no se han registrado modificaciones en los proveedores.
            </Text>
          </Stack>
        ) : (
          <div className="mt-2">
            <DataTableEstandar
              idAccessor="id"
              columns={cambiosColumns}
              records={cambiosGlobal}
              loading={false}
            />
          </div>
        )}
      </ModalEstandar>

      {/* Modal: Gestión de Cuentas Bancarias */}
      <ModalEstandar
        opened={!!selectedProveedor}
        close={() => setSelectedProveedor(null)}
        title={
          proveedorEnGestion
            ? `Cuentas Bancarias: ${proveedorEnGestion.razon_social}`
            : ""
        }
        size="xl"
      >
        {proveedorEnGestion && (
          <CuentasBancarias
            proveedor={proveedorEnGestion}
            onCuentaActualizada={handleCuentaActualizada}
            onCuentaAgregada={handleCuentaAgregada}
          />
        )}
      </ModalEstandar>

      {/* Modal: Personal Externo del proveedor (disponible en ambos modos) */}
      <ModalEstandar
        opened={!!proveedorPersonal}
        close={() => setProveedorPersonal(null)}
        title={
          proveedorPersonalEnGestion
            ? `Contactos de ${proveedorPersonalEnGestion.razon_social}`
            : ""
        }
        size="lg"
      >
        {proveedorPersonalEnGestion && (
          <PersonalExternoProveedor
            proveedor={proveedorPersonalEnGestion}
          />
        )}
      </ModalEstandar>

      {/* Modal: Tipos de carbon del proveedor (solo tab Carbon) */}
      <ModalEstandar
        opened={!!proveedorTiposCarbon}
        close={() => setProveedorTiposCarbon(null)}
        title="Tipos de carbon"
        size="md"
      >
        {proveedorTiposCarbonEnGestion && (
          <TiposCarbonProveedor
            proveedor={proveedorTiposCarbonEnGestion}
            key={proveedorTiposCarbonEnGestion.id_proveedor}
            onGuardados={(tipos) => {
              handleTiposCarbonGuardados(
                proveedorTiposCarbonEnGestion,
                tipos,
              );
              setProveedorTiposCarbon(null);
            }}
          />
        )}
      </ModalEstandar>

      {/* Modal: Lugares de extraccion del proveedor (solo tab Carbon) */}
      <ModalEstandar
        opened={!!proveedorLugares}
        close={() => setProveedorLugares(null)}
        title="Lugares de extraccion"
        size="lg"
      >
        {proveedorLugaresEnGestion && (
          <LugaresExtraccionProveedor
            proveedor={proveedorLugaresEnGestion}
            key={proveedorLugaresEnGestion.id_proveedor}
            onGuardados={(lugares) => {
              handleLugaresGuardados(proveedorLugaresEnGestion, lugares);
              setProveedorLugares(null);
            }}
          />
        )}
      </ModalEstandar>
    </div>
  );
};