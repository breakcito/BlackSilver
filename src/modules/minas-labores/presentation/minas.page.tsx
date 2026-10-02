import {
  ActionIcon,
  Badge,
  Button,
  TextInput,
  Tooltip,
  Skeleton,
  ScrollArea,
} from "@mantine/core";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserIcon,
  BriefcaseIcon,
  Squares2X2Icon,
  BuildingOffice2Icon,
  InboxStackIcon,
} from "@heroicons/react/24/outline";
import { useState, useRef } from "react";
import { useDisclosure } from "@mantine/hooks";
import { useTitlePage } from "../../../hooks/useTitlePage";
import { useMinas } from "../hooks/minas/useMinas";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { RegistroMina } from "./registro-mina";
import { EmpresasEjecutoras } from "./empresas-ejecutoras/empresas-ejecutoras";
import { HistorialResponsables } from "./responsables/historial-responsables";
import { GestionLabores } from "./labores/labores";

import { BotonRecargar } from "../../../presentation/utils/boton-recargar";

export const MinasPage = () => {
  useTitlePage("Minas & Labores");

  const {
    concesiones,
    minasFiltradas,
    loading,
    busqueda,
    setBusqueda,
    recargar,
    openedCreate,
    openCreate,
    closeCreate,
    openedEmpresas,
    closeEmpresas,
    openedResponsables,
    closeResponsables,
    openedLabores,
    closeLabores,
    selectedMina,
    handleMinaCreada,
    handleOpenEmpresas,
    handleOpenResponsables,
    handleOpenLabores,
    handleResponsableAsignado,
    handleResponsableInactivado,
    handleLaborRegistrada,
    handleLaborFinalizada,
    handleEmpresaAsignada,
  } = useMinas();

  const [busquedaLabor, setBusquedaLabor] = useState("");
  const [openedCreateLabor, { open: openCreateLabor, close: closeCreateLabor }] =
    useDisclosure(false);

  const refRecargarLabores = useRef<(() => void) | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header — igual que Empresas / Almacenes */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
        <TextInput
          label="Buscar Mina"
          placeholder="Buscar mina por nombre..."
          leftSection={
            <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400" />
          }
          value={busqueda}
          onChange={(e) => setBusqueda(e.currentTarget.value)}
          className="flex-1 min-w-64"
          radius="lg"
          size="sm"
          classNames={{
            label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
            input:
              "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
          }}
        />
        <div className="flex gap-2 items-center shrink-0">
          <BotonRecargar onReload={recargar} loading={loading} />
          <Button
            leftSection={<PlusIcon className="w-5 h-5" />}
            onClick={openCreate}
            radius="lg"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 shrink-0 px-6 font-semibold"
          >
            Nueva Mina
          </Button>
        </div>
      </div>

      {/* Grid de tarjetas */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex flex-col bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-4 gap-4"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <Skeleton height={14} width="30%" radius="sm" />
                  <Skeleton height={18} width="70%" radius="sm" />
                  <Skeleton height={12} width="50%" radius="sm" />
                </div>
                <Skeleton height={16} width={45} radius="sm" />
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-800/60">
                <Skeleton height={28} width={28} circle />
                <div className="space-y-1 fex-1">
                  <Skeleton height={8} width={60} radius="xs" />
                  <Skeleton height={12} width={100} radius="xs" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-zinc-800/50">
                <div className="flex gap-2">
                  <Skeleton height={12} width={50} radius="xs" />
                  <Skeleton height={12} width={50} radius="xs" />
                </div>
                <div className="flex gap-1.5">
                  <Skeleton height={26} width={26} radius="md" />
                  <Skeleton height={26} width={26} radius="md" />
                  <Skeleton height={26} width={26} radius="md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : minasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-800">
          <Squares2X2Icon className="w-10 h-10 text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm font-medium">
            No se encontraron minas registradas
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {minasFiltradas.map((mina) => {
            const isActive = mina.estado === "Activo";
            return (
              <div
                key={mina.id_mina}
                className="group relative flex flex-col bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-4 gap-3 hover:border-zinc-700/80 hover:bg-zinc-900/50 transition-all duration-200"
              >
                {/* Badge de estado — esquina superior derecha */}
                <Badge
                  size="xs"
                  variant="light"
                  color={isActive ? "green" : "gray"}
                  radius="sm"
                  className="absolute top-3 right-3"
                >
                  {mina.estado}
                </Badge>

                {/* Header: nombre + descripción */}
                <div className="pr-14">
                  <div className="flex items-center gap-2 mb-1">
                    <Tooltip label="Concesión">
                      <Badge
                        size="xs"
                        variant="light"
                        color="indigo"
                        radius="sm"
                        className="font-bold border-indigo-500/20"
                      >
                        {mina.concesion}
                      </Badge>
                    </Tooltip>
                    {mina.almacenes_suministradores && (
                      <Tooltip
                        label={`Almacenes: ${mina.almacenes_suministradores}`}
                      >
                        <Badge
                          size="xs"
                          variant="light"
                          color="cyan"
                          radius="sm"
                          className="font-bold border-cyan-500/20"
                          leftSection={
                            <InboxStackIcon className="w-3.5 h-3.5" />
                          }
                        >
                          Abastecido
                        </Badge>
                      </Tooltip>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                    {mina.nombre}
                  </h3>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">
                    {mina.descripcion || "Sin descripción"}
                  </p>
                </div>

                {/* Responsable */}
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-800/60">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${mina.responsables
                      ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                      : "bg-zinc-800/50 text-zinc-600 border-zinc-700/50"
                      }`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider block mb-1">
                      Responsables
                    </span>
                    {mina.responsables ? (
                      <ScrollArea
                        w="100%"
                        type="never"
                        scrollbarSize={0}
                        offsetScrollbars={false}
                      >
                        <div className="flex items-center gap-1.5 pb-0.5">
                          {mina.responsables.split(", ").map((resp, idx) => (
                            <Badge
                              key={idx}
                              variant="filled"
                              color="indigo.9"
                              size="xs"
                              radius="sm"
                              className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 lowercase first-letter:uppercase shrink-0"
                            >
                              {resp}
                            </Badge>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <span className="text-xs font-semibold text-zinc-600 italic block">
                        Sin asignar
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer: stats + botones en la misma fila */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800/50">
                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs text-zinc-600">
                    <span className="flex items-center gap-1">
                      <Squares2X2Icon className="w-3.5 h-3.5" />
                      {mina.cantidad_labores}{" "}
                      {mina.cantidad_labores === 1 ? "labor" : "labores"}
                    </span>
                    <span className="flex items-center gap-1">
                      <BuildingOffice2Icon className="w-3.5 h-3.5" />
                      {mina.cantidad_empresas_ejecutoras}{" "}
                      {mina.cantidad_empresas_ejecutoras === 1
                        ? "empresa"
                        : "empresas"}
                    </span>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1.5">
                    <Tooltip label="Ver Responsables">
                      <ActionIcon
                        variant="filled"
                        color="violet"
                        size="sm"
                        radius="md"
                        onClick={() => handleOpenResponsables(mina)}
                      >
                        <UserIcon className="w-4 h-4" />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Empresas Ejecutoras">
                      <ActionIcon
                        variant="filled"
                        color="cyan"
                        size="sm"
                        radius="md"
                        onClick={() => handleOpenEmpresas(mina)}
                      >
                        <BriefcaseIcon className="w-4 h-4" />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Gestionar Labores">
                      <ActionIcon
                        variant="filled"
                        color="pink"
                        size="sm"
                        radius="md"
                        onClick={() => handleOpenLabores(mina)}
                      >
                        <Squares2X2Icon className="w-4 h-4" />
                      </ActionIcon>
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Nueva Mina */}
      <ModalEstandar
        opened={openedCreate}
        close={closeCreate}
        title="Registrar Mina"
        validateClose
        size="md"
      >
        <RegistroMina
          concesiones={concesiones}
          onSuccess={handleMinaCreada}
          onCancel={closeCreate}
        />
      </ModalEstandar>

      {/* Modal: Empresas Ejecutoras */}
      <ModalEstandar
        opened={openedEmpresas}
        close={closeEmpresas}
        title="Empresas Ejecutoras"
        size="md"
      >
        {selectedMina && (
          <EmpresasEjecutoras
            idMina={selectedMina.id_mina}
            idConcesion={selectedMina.id_concesion}
            minaNombre={selectedMina.nombre}
            onEmpresasActualizadas={() =>
              handleEmpresaAsignada(selectedMina.id_mina)
            }
          />
        )}
      </ModalEstandar>

      {/* Modal: Responsables */}
      <ModalEstandar
        opened={openedResponsables}
        close={closeResponsables}
        title="Responsables"
        size="md"
      >
        {selectedMina && (
          <HistorialResponsables
            mina={selectedMina}
            onResponsableAsignado={(nombre) =>
              handleResponsableAsignado(selectedMina.id_mina, nombre)
            }
            onResponsableInactivado={(nombre) =>
              handleResponsableInactivado(selectedMina.id_mina, nombre)
            }
          />
        )}
      </ModalEstandar>

      {/* Modal: Labores */}
      <ModalEstandar
        opened={openedLabores}
        close={() => {
          closeLabores();
          setBusquedaLabor("");
        }}
        title={
          selectedMina ? (
            <>
              Labores - {selectedMina.nombre}
              {selectedMina.almacenes_suministradores && (
                <Badge
                  variant="transparent"
                  color="cyan"
                  size="xs"
                  className="ml-2 p-0 h-auto font-bold lowercase italic text-zinc-500"
                  leftSection={<InboxStackIcon className="w-3 h-3" />}
                >
                  abastecido por: {selectedMina.almacenes_suministradores}
                </Badge>
              )}
            </>
          ) : "Labores"
        }
        size="90%"
        rightSection={
          <div className="flex items-center gap-2 mr-4">
            <TextInput
              placeholder="Buscar labor..."
              leftSection={
                <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400" />
              }
              value={busquedaLabor}
              onChange={(e) => setBusquedaLabor(e.currentTarget.value)}
              radius="lg"
              size="xs"
              className="w-72"
              classNames={{
                input:
                  "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500",
              }}
            />
            <BotonRecargar
              onReload={() => {
                if (refRecargarLabores.current) refRecargarLabores.current();
              }}
            />
            <Button
              leftSection={<PlusIcon className="w-4 h-4" />}
              radius="lg"
              size="xs"
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 shrink-0"
              onClick={openCreateLabor}
            >
              Nueva Labor
            </Button>
          </div>
        }
      >
        {selectedMina && (
          <GestionLabores
            mina={selectedMina}
            onLaborCreada={handleLaborRegistrada}
            onLaborFinalizada={handleLaborFinalizada}
            busqueda={busquedaLabor}
            setBusqueda={setBusquedaLabor}
            openCreate={openCreateLabor}
            openedCreate={openedCreateLabor}
            closeCreate={closeCreateLabor}
            onRecargarRef={refRecargarLabores}
          />
        )}
      </ModalEstandar>
    </div>
  );
};

export default MinasPage;
