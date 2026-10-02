import { useState } from "react";
import {
  Button,
  Badge,
  Skeleton,
  Text,
  ActionIcon,
  Tooltip,
  TextInput,
} from "@mantine/core";
import {
  PlusIcon,
  Bars2Icon,
  BriefcaseIcon,
  ArrowsRightLeftIcon,
  RectangleGroupIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useTitlePage } from "../../../hooks/useTitlePage";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { useDisclosure } from "@mantine/hooks";
import { BotonRecargar } from "../../../presentation/utils/boton-recargar";

import { useOrganigrama } from "../hooks/useOrganigrama";
import { useRegistroArea } from "../hooks/useRegistroArea";
import { useRegistroCargo } from "../hooks/useRegistroCargo";

import { RegistroArea } from "./registro-area";
import { RegistroCargo } from "./registro-cargo";

import type {
  RES_Area,
  RES_Cargo,
} from "../../../service/responses/organigrama";
import { EstadoBase } from "../../../shared/enums/_generic/estado-base";

export const OrganigramaPage = () => {
  useTitlePage("Organigrama");

  const {
    busquedaAreas,
    setBusquedaAreas,
    areasFiltradas,
    cargosSinAreaFiltrados,
    loading,
    recargar,
    onAreaCreada,
    onCargoCreado,
    handleMoverCargo,
    handleCambiarEstadoCargo,
  } = useOrganigrama();

  // Estado de drag & drop
  const [draggingCargoId, setDraggingCargoId] = useState<number | null>(null);
  const [draggingOver, setDraggingOver] = useState<"sin-area" | number | null>(
    null,
  );
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Modales
  const [openedArea, { open: openArea, close: closeArea }] =
    useDisclosure(false);
  const [openedCargo, { open: openCargo, close: closeCargo }] =
    useDisclosure(false);

  // Área destino del modal de cargo (null = sin área)
  const [areaDestinoCargo, setAreaDestinoCargo] = useState<RES_Area | null>(
    null,
  );

  const regArea = useRegistroArea(onAreaCreada, closeArea);
  const regCargo = useRegistroCargo(
    onCargoCreado,
    closeCargo,
    areaDestinoCargo?.id_area ?? null,
  );

  const openModalCargo = (area: RES_Area | null) => {
    setAreaDestinoCargo(area);
    openCargo();
  };

  // Drag & drop handlers
  const onDragStart = (id_cargo: number) => {
    setDraggingCargoId(id_cargo);
  };

  const onDrop = async (destino: "sin-area" | number) => {
    if (draggingCargoId === null) return;

    const id_area = destino === "sin-area" ? null : destino;
    setDraggingCargoId(null);
    setDraggingOver(null);
    await handleMoverCargo(draggingCargoId, id_area);
  };

  const handleToggle = async (id_cargo: number) => {
    setUpdatingId(id_cargo);
    await handleCambiarEstadoCargo(id_cargo);
    setUpdatingId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
        <TextInput
          label="Buscar Área o Cargo"
          placeholder="Buscar..."
          leftSection={
            <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400" />
          }
          value={busquedaAreas}
          onChange={(e) => setBusquedaAreas(e.target.value)}
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
            onClick={openArea}
            radius="lg"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 shrink-0 px-6 font-semibold"
          >
            Nueva Área
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          {/* Skeleton barra sin área */}
          <Skeleton height={80} radius="xl" />
          {/* Skeleton cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={240} radius="xl" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* BARRA: Cargos Sin Área */}
          <div
            className={`
              group relative flex flex-col bg-zinc-900/30 border rounded-2xl p-2.5 gap-2 transition-all duration-200
              ${
                draggingOver === "sin-area"
                  ? "border-amber-500/60 bg-amber-500/5 shadow-lg shadow-amber-500/10"
                  : "border-zinc-800/60 hover:border-zinc-700/80"
              }
            `}
            onDragOver={(e) => {
              e.preventDefault();
              setDraggingOver("sin-area");
            }}
            onDragLeave={() => setDraggingOver(null)}
            onDrop={() => onDrop("sin-area")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
                  <BriefcaseIcon className="w-4 h-4" />
                </div>
                <Text
                  size="xs"
                  fw={700}
                  className="text-amber-400/80 uppercase tracking-wider"
                >
                  Cargos sin área asignada
                </Text>
                <Badge size="xs" variant="light" color="yellow" radius="sm">
                  {cargosSinAreaFiltrados.length}
                </Badge>
              </div>
              <Button
                size="xs"
                variant="subtle"
                leftSection={<PlusIcon className="w-3 h-3" />}
                onClick={() => openModalCargo(null)}
                radius="md"
                className="text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/10 px-2"
              >
                Nuevo cargo
              </Button>
            </div>

            {cargosSinAreaFiltrados.length === 0 ? (
              <Text size="xs" className="text-zinc-600 italic px-1">
                Sin cargos. Crea uno o arrastra aquí para quitar de un área.
              </Text>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cargosSinAreaFiltrados.map((cargo: RES_Cargo) => (
                  <div
                    key={cargo.id_cargo}
                    draggable
                    onDragStart={() => onDragStart(cargo.id_cargo)}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-xl
                      border cursor-grab active:cursor-grabbing transition-all duration-150
                      ${
                        cargo.estado === EstadoBase.Activo
                          ? "bg-zinc-800/60 border-zinc-700/60 hover:border-amber-500/40"
                          : "bg-zinc-900/40 border-zinc-800/40 opacity-50"
                      }
                    `}
                  >
                    <Text size="xs" fw={600} className="text-zinc-300">
                      {cargo.nombre}
                    </Text>
                    <Tooltip label="Cambiar Estado" position="top" withArrow>
                      <ActionIcon
                        variant="subtle"
                        color="indigo"
                        size="xs"
                        loading={updatingId === cargo.id_cargo}
                        onClick={() => handleToggle(cargo.id_cargo)}
                      >
                        <ArrowsRightLeftIcon className="w-3 h-3" />
                      </ActionIcon>
                    </Tooltip>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GRID DE ÁREAS */}
          {areasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-800">
              <Bars2Icon className="w-10 h-10 text-zinc-700 mb-3" />
              <p className="text-zinc-500 text-sm font-medium">
                No se encontraron áreas registradas
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {areasFiltradas.map((area: RES_Area) => {
                const isActive = area.estado === EstadoBase.Activo;
                const isOver = draggingOver === area.id_area;
                const cargosArea = area.cargos ?? [];

                return (
                  <div
                    key={area.id_area}
                    className={`
                      group relative flex flex-col bg-zinc-900/30 border rounded-2xl p-4 gap-3
                      transition-all duration-200 min-h-[200px]
                      ${
                        isOver
                          ? "border-indigo-500/60 bg-indigo-500/5 shadow-lg shadow-indigo-500/10"
                          : "border-zinc-800/60 hover:border-zinc-700/80 hover:bg-zinc-900/50"
                      }
                    `}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDraggingOver(area.id_area);
                    }}
                    onDragLeave={() => setDraggingOver(null)}
                    onDrop={() => onDrop(area.id_area)}
                  >
                    {/* Badge estado */}
                    <Badge
                      size="xs"
                      variant="light"
                      color={isActive ? "green" : "gray"}
                      radius="sm"
                      className="absolute top-3 right-3"
                    >
                      {area.estado}
                    </Badge>

                    {/* Header del área */}
                    <div className="flex items-center gap-2 pr-14">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
                        <RectangleGroupIcon className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-sm font-bold text-white leading-tight group-hover:text-indigo-300 transition-colors uppercase tracking-tight">
                        {area.nombre}
                      </h3>
                    </div>

                    {/* Lista de cargos */}
                    <div className="flex flex-col flex-1 gap-1.5">
                      {cargosArea.length === 0 ? (
                        <Text size="xs" className="text-zinc-600 italic px-1">
                          Sin cargos. Arrastra uno aquí.
                        </Text>
                      ) : (
                        cargosArea.map((cargo: RES_Cargo) => (
                          <div
                            key={cargo.id_cargo}
                            draggable
                            onDragStart={() => onDragStart(cargo.id_cargo)}
                            className={`
                              flex items-center justify-between px-3 py-1.5 rounded-xl
                              border cursor-grab active:cursor-grabbing transition-all duration-150
                              ${
                                cargo.estado === EstadoBase.Activo
                                  ? "bg-zinc-800/50 border-zinc-700/50 hover:border-indigo-500/30"
                                  : "bg-zinc-900/30 border-zinc-800/30 opacity-40"
                              }
                            `}
                          >
                            <Text
                              size="xs"
                              fw={600}
                              className="text-zinc-300 leading-tight"
                            >
                              {cargo.nombre}
                            </Text>
                            <Tooltip
                              label="Cambiar Estado"
                              position="left"
                              withArrow
                            >
                              <ActionIcon
                                variant="subtle"
                                color="indigo"
                                size="xs"
                                loading={updatingId === cargo.id_cargo}
                                onClick={() => handleToggle(cargo.id_cargo)}
                              >
                                <ArrowsRightLeftIcon className="w-3 h-3" />
                              </ActionIcon>
                            </Tooltip>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Botón añadir cargo */}
                    <Button
                      size="xs"
                      variant="subtle"
                      leftSection={<PlusIcon className="w-3 h-3" />}
                      onClick={() => openModalCargo(area)}
                      radius="md"
                      className="text-zinc-500 hover:text-indigo-300 hover:bg-indigo-500/10 w-full border border-dashed border-zinc-800 hover:border-indigo-500/30 transition-all"
                    >
                      Añadir cargo
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* MODAL NUEVA ÁREA */}
      <ModalEstandar
        opened={openedArea}
        close={closeArea}
        title="Nueva Área"
        size="md"
        validateClose
      >
        <RegistroArea
          nombre={regArea.nombre}
          setNombre={regArea.setNombre}
          cargos={regArea.cargos}
          addCargo={regArea.addCargo}
          removeCargo={regArea.removeCargo}
          updateCargo={regArea.updateCargo}
          loading={regArea.loading}
          error={regArea.error}
          onSave={regArea.handleGuardar}
          onCancel={closeArea}
        />
      </ModalEstandar>

      {/* MODAL NUEVO CARGO */}
      <ModalEstandar
        opened={openedCargo}
        close={closeCargo}
        title="Nuevo Cargo"
        size="sm"
        validateClose
      >
        <RegistroCargo
          nombre={regCargo.nombre}
          setNombre={regCargo.setNombre}
          loading={regCargo.loading}
          error={regCargo.error}
          onSave={regCargo.handleGuardar}
          onCancel={closeCargo}
          contextLabel={
            areaDestinoCargo
              ? `Área: ${areaDestinoCargo.nombre}`
              : "Sin área asignada"
          }
        />
      </ModalEstandar>
    </div>
  );
};

export default OrganigramaPage;
