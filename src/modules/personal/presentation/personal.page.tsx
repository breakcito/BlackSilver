import { useState, useMemo } from "react";
import {
  Tabs,
  rem,
  Select,
  TextInput,
  Button,
  Group,
  ActionIcon,
  Tooltip,
  Stack,
  Badge,
  Text,
} from "@mantine/core";
import {
  UserGroupIcon,
  WrenchScrewdriverIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  MapPinIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

import { useTitlePage } from "../../../hooks/useTitlePage";
import { TabEmpleados } from "./tab-empleados";
import { TabContratistas } from "./tab-contratistas";
import { useEmpleados } from "../hooks/useEmpleados";
import { useContratistas } from "../hooks/useContratistas";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { useDisclosure } from "@mantine/hooks";
import { RegistroEmpleado } from "./registro-empleado";
import { RegistroContratista } from "./registro-contratista";
import { AsignacionLaboresContratista } from "./asignacion-labores-contratista";
import { useAsignacionLaboresContratista } from "../hooks/useAsignacionLaboresContratista";
import { ModalFotocheck } from "./modal-fotocheck";
import { ModalFotocheckContratista } from "./modal-fotocheck-contratista";
import { CuentasBancarias } from "./cuentas-bancarias/cuentas-bancarias";
import type {
  RES_EmpleadoResumen,
  RES_ContratistaResumen,
} from "../service/empleados.responses";
import { parseCambiosLog } from "../../../presentation/utils/parse-cambios-log";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import type { DataTableColumn } from "mantine-datatable";

import { BotonRecargar } from "../../../presentation/utils/boton-recargar";
import dayjs from "dayjs";

interface CambioPersonalGlobal {
  id: string;
  tipo: "Empleado" | "Contratista";
  id_persona: number;
  persona: string;
  fecha: string;
  id_empleado: number | null;
  nombre_empleado: string;
  campo: string;
  valor_anterior: unknown;
  valor_nuevo: unknown;
}

const formatValorCambio = (v: unknown): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  return String(v);
};

export const PersonalPage = () => {
  useTitlePage("Trabajadores / Personal");
  const [activeTab, setActiveTab] = useState<string | null>("empleados");

  const empleadosCtrl = useEmpleados();
  const [selectedEmpleadoCuentas, setSelectedEmpleadoCuentas] = useState<RES_EmpleadoResumen | null>(null);
  const contratistasCtrl = useContratistas();
  const asignacionCtrl = useAsignacionLaboresContratista(
    contratistasCtrl.actualizarContratistaEnLista,
  );

  const [openedRegEmp, { open: openRegEmp, close: closeRegEmp }] =
    useDisclosure(false);
  const [openedRegCon, { open: openRegCon, close: closeRegCon }] =
    useDisclosure(false);
  const [openedCambios, { open: openCambios, close: closeCambios }] =
    useDisclosure(false);

  const cambiosGlobal = useMemo<CambioPersonalGlobal[]>(() => {
    const lista: CambioPersonalGlobal[] = [];

    const consumir = (
      registros: (RES_EmpleadoResumen | RES_ContratistaResumen)[],
      tipo: "Empleado" | "Contratista",
    ) => {
      registros.forEach((r) => {
        const idPersona =
          tipo === "Empleado"
            ? (r as RES_EmpleadoResumen).id_empleado
            : (r as RES_ContratistaResumen).id_contratista;
        const logs = parseCambiosLog(r.cambios_log);
        const nombreCompleto = `${r.nombre} ${r.apellido}`;
        logs.forEach((log) => {
          const nombreEmpleado = log.nombre_empleado?.trim() || "—";
          log.cambios.forEach((cambio) => {
            lista.push({
              id: `${tipo}-${idPersona}-${log.update_at}-${cambio.campo_bd ?? cambio.campo ?? Math.random()}`,
              tipo,
              id_persona: idPersona,
              persona: nombreCompleto,
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
    };

    consumir(empleadosCtrl.empleados, "Empleado");
    consumir(contratistasCtrl.contratistas, "Contratista");

    // Mas recientes primero
    lista.sort(
      (a, b) => dayjs(b.fecha).valueOf() - dayjs(a.fecha).valueOf(),
    );
    return lista;
  }, [empleadosCtrl.empleados, contratistasCtrl.contratistas]);

  const cambiosColumns: DataTableColumn<CambioPersonalGlobal>[] = [
    {
      accessor: "index",
      title: "#",
      textAlign: "center",
      width: 50,
    },
    {
      accessor: "persona",
      title: "Persona",
      width: 240,
      render: (r) => (
        <Stack gap={2}>
          <Text size="sm" fw={600} className="text-zinc-200 leading-tight">
            {r.persona}
          </Text>
          <Badge
            size="xs"
            color={r.tipo === "Empleado" ? "indigo" : "pink"}
            variant="light"
            radius="sm"
            className="font-bold w-fit"
          >
            {r.tipo}
          </Badge>
        </Stack>
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

  const iconStyle = { width: rem(18), height: rem(18) };

  return (
    <div className="animate-fade-in space-y-6">
      <Tabs
        value={activeTab}
        onChange={setActiveTab}
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
                value="empleados"
                leftSection={<UserGroupIcon style={iconStyle} />}
              >
                Empleados
              </Tabs.Tab>
              <Tabs.Tab
                value="contratistas"
                leftSection={<WrenchScrewdriverIcon style={iconStyle} />}
              >
                Contratistas
              </Tabs.Tab>
            </Tabs.List>

            {activeTab === "empleados" ? (
              <Group grow className="flex-1 w-full" align="flex-end" gap="sm">
                <div className="w-full md:w-56 shrink-0">
                  <Select
                    label="Filtrar por Área"
                    placeholder="Todas..."
                    data={empleadosCtrl.areasUnicas}
                    value={empleadosCtrl.filtroArea}
                    onChange={empleadosCtrl.setFiltroArea}
                    searchable
                    clearable
                    radius="lg"
                    size="sm"
                    classNames={{
                      input: "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 transition-all h-[38px]",
                      label: "text-zinc-400 mb-1 font-medium",
                    }}
                  />
                </div>

                <div className="flex-1 min-w-50">
                  <TextInput
                    label="Buscar empleado"
                    placeholder="Buscar por nombre, DNI, cargo o área..."
                    leftSection={
                      <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400" />
                    }
                    value={empleadosCtrl.busqueda}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      empleadosCtrl.setBusqueda(e.currentTarget.value)
                    }
                    radius="lg"
                    size="sm"
                    classNames={{
                      label: "text-zinc-400 mb-1 font-medium",
                      input:
                        "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 transition-all h-[38px]",
                    }}
                  />
                </div>
              </Group>
            ) : (
              <Group grow className="flex-1 w-full" align="flex-end">
                <Select
                  label="Filtrar por Mina"
                  placeholder="Todas las minas"
                  data={contratistasCtrl.minas.map((m: { id_mina: number; nombre: string }) => ({
                    value: m.id_mina.toString(),
                    label: m.nombre,
                  }))}
                  value={contratistasCtrl.idMina?.toString() || null}
                  onChange={(val: string | null) =>
                    contratistasCtrl.setIdMina(val ? Number(val) : null)
                  }
                  leftSection={<MapPinIcon className="w-4 h-4 text-zinc-400" />}
                  radius="lg"
                  size="sm"
                  classNames={{
                    label: "text-zinc-400 mb-1 font-medium",
                    input:
                      "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 transition-all h-[38px]",
                  }}
                  searchable
                  clearable
                />
                <TextInput
                  label="Buscar contratista"
                  placeholder="Buscar por nombre o DNI..."
                  leftSection={
                    <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400" />
                  }
                  value={contratistasCtrl.busqueda}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    contratistasCtrl.setBusqueda(e.currentTarget.value)
                  }
                  radius="lg"
                  size="sm"
                  className="flex-1"
                  classNames={{
                    label: "text-zinc-400 mb-1 font-medium",
                    input:
                      "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 transition-all h-[38px]",
                  }}
                />
              </Group>
            )}
          </div>

          <div className="flex gap-2 items-center shrink-0 mb-px">
            <BotonRecargar
              onReload={
                activeTab === "empleados"
                  ? empleadosCtrl.recargar
                  : contratistasCtrl.recargar
              }
              loading={
                activeTab === "empleados"
                  ? empleadosCtrl.loading
                  : contratistasCtrl.loading
              }
            />
            <Tooltip
              label="Ver historial de cambios"
              position="bottom"
              withArrow
            >
              <ActionIcon
                variant="default"
                color="zinc.4"
                radius="lg"
                size={36}
                onClick={openCambios}
                className="border border-zinc-700/50"
                aria-label="Ver historial de cambios"
              >
                <EyeIcon className="w-4 h-4" />
              </ActionIcon>
            </Tooltip>
            <Button
              leftSection={<PlusIcon className="w-5 h-5" />}
              onClick={activeTab === "empleados" ? openRegEmp : openRegCon}
              radius="lg"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 shrink-0 h-9.5 px-8"
            >
              Nuevo {activeTab === "empleados" ? "Empleado" : "Contratista"}
            </Button>
          </div>
        </div>

        <Tabs.Panel value="empleados">
          <TabEmpleados controller={empleadosCtrl} onOpenCuentas={setSelectedEmpleadoCuentas} />
        </Tabs.Panel>

        <Tabs.Panel value="contratistas">
          <TabContratistas
            controller={contratistasCtrl}
            asignacion={asignacionCtrl}
          />
        </Tabs.Panel>
      </Tabs>

      {/* Modales Compartidos */}
      <ModalEstandar
        opened={openedRegEmp}
        close={closeRegEmp}
        title="Registrar Empleado"
        size="lg"
      >
        <RegistroEmpleado
          onSuccess={(nuevo) => {
            empleadosCtrl.pushNuevoEmpleado(nuevo);
            closeRegEmp();
          }}
          onCancel={closeRegEmp}
        />
      </ModalEstandar>

      <ModalEstandar
        opened={openedRegCon}
        close={closeRegCon}
        title="Registrar Contratista"
        size="lg"
      >
        <RegistroContratista
          onSuccess={(nuevo) => {
            contratistasCtrl.pushNuevoContratista(nuevo);
            closeRegCon();
          }}
          onCancel={closeRegCon}
        />
      </ModalEstandar>

      <ModalEstandar
        opened={asignacionCtrl.opened}
        close={asignacionCtrl.cerrar}
        title="Asignación de Labores"
        size="sm"
      >
        {asignacionCtrl.contratista && (
          <AsignacionLaboresContratista
            contratista={asignacionCtrl.contratista}
            minas={asignacionCtrl.minas}
            idMina={asignacionCtrl.idMina}
            onMinaChange={asignacionCtrl.onMinaChange}
            laboresDisponibles={asignacionCtrl.laboresDisponibles}
            inactiveLaborInfo={asignacionCtrl.inactiveLaborInfo}
            seleccionados={asignacionCtrl.seleccionados}
            loading={asignacionCtrl.loading}
            loadingMinas={asignacionCtrl.loadingMinas}
            loadingLabores={asignacionCtrl.loadingLabores}
            onToggle={asignacionCtrl.toggleSeleccion}
            onAsignar={asignacionCtrl.handleAsignar}
            onCancelar={asignacionCtrl.cerrar}
          />
        )}
      </ModalEstandar>

      {/* Modal de fotocheck */}
      {empleadosCtrl.modalFotocheckAbierto && (
        <ModalFotocheck
          opened={empleadosCtrl.modalFotocheckAbierto}
          close={empleadosCtrl.cerrarModalFotocheck}
          empleados={empleadosCtrl.empleadosSeleccionados}
        />
      )}

      {/* Modal de fotocheck de contratistas */}
      {contratistasCtrl.modalFotocheckAbierto && (
        <ModalFotocheckContratista
          opened={contratistasCtrl.modalFotocheckAbierto}
          close={contratistasCtrl.cerrarModalFotocheck}
          contratistas={contratistasCtrl.contratistasSeleccionados}
        />
      )}

      {/* Modal: Gestión de Cuentas Bancarias */}
      <ModalEstandar
        opened={selectedEmpleadoCuentas !== null}
        close={() => setSelectedEmpleadoCuentas(null)}
        title={
          selectedEmpleadoCuentas
            ? `Cuentas Bancarias: ${selectedEmpleadoCuentas.nombre} ${selectedEmpleadoCuentas.apellido}`
            : ""
        }
        size="xl"
      >
        {selectedEmpleadoCuentas && (
          <CuentasBancarias
            empleado={selectedEmpleadoCuentas}
            onCuentaAddedGlobal={empleadosCtrl.recargar}
          />
        )}
      </ModalEstandar>

      {/* Modal: Historial global de cambios (Empleados + Contratistas) */}
      <ModalEstandar
        opened={openedCambios}
        close={closeCambios}
        title="Historial de Cambios de Personal"
        size="min(1250px, 95vw)"
      >
        {cambiosGlobal.length === 0 ? (
          <Stack align="center" gap="md" py={60}>
            <EyeIcon className="w-10 h-10 text-zinc-700" />
            <Text size="sm" fw={700} className="text-zinc-400 uppercase tracking-widest">
              Sin cambios registrados
            </Text>
            <Text size="xs" c="dimmed">
              Aún no se han registrado modificaciones en el personal.
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
    </div>
  );
};

export default PersonalPage;
