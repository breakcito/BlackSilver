import { useState } from "react";
import {
  Group,
  Text,
  Badge,
  ActionIcon,
  Tooltip,
  Avatar,
  FileButton,
  Stack,
  Loader,
  Checkbox,
} from "@mantine/core";
import {
  PencilSquareIcon,
  MapPinIcon,
  UserGroupIcon,
  CakeIcon,
  EnvelopeIcon,
  PhoneIcon,
  IdentificationIcon,
  DocumentTextIcon,
  CheckBadgeIcon,
  EllipsisVerticalIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Menu } from "@mantine/core";

import { type DataTableColumn } from "mantine-datatable";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import { useContratistas } from "../hooks/useContratistas";
import { useAsignacionLaboresContratista } from "../hooks/useAsignacionLaboresContratista";
import type { RES_ContratistaResumen } from "../service/empleados.responses";
import { useNotify } from "../../../hooks/useNotify";
import { ModalContratoEmpleado } from "../../contratos-empleado/presentation/modal-contrato-empleado";
import { ModalHistorialContratosEmpleado } from "../../contratos-empleado/presentation/modal-historial-contratos-empleado";
import { ModalEditarContratista } from "./modal-editar-contratista";
import { EstadoBase } from "../../../shared/enums/_generic/estado-base";

interface TabContratistasProps {
  controller: ReturnType<typeof useContratistas>;
  asignacion: ReturnType<typeof useAsignacionLaboresContratista>;
}

export const TabContratistas = ({
  controller,
  asignacion,
}: TabContratistasProps) => {
  const { notifySuccess, notifyError } = useNotify();
  const [loadingToggles, setLoadingToggles] = useState<Record<number, boolean>>(
    {},
  );

  const {
    contratistas,
    loading,
    actualizarFoto,
    idActualizandoFoto,
    seleccionados,
    toggleSeleccion,
    toggleSeleccionarTodos,
    todosVisiblesSeleccionados,
    algunosVisiblesSeleccionados,
    abrirModalFotocheck,
    abrirModalFotocheckIndividual,
    modalContratoEmpleado,
    abrirModalContrato,
    cerrarModalContrato,
    onContratoCreado,
    modalHistorialContratos,
    abrirModalHistorial,
    cerrarModalHistorial,
    toggleConContrato,
    // Edición
    contratistaEnEdicion,
    abrirModalEdicion,
    cerrarModalEdicion,
    actualizarContratistaEnLista,
    // Eliminar
    eliminarContratista,
  } = controller;

  const handleUpdateFoto = async (id: number, file: File | null) => {
    if (!file) return;
    const ok = await actualizarFoto(id, file);
    if (ok) {
      notifySuccess("Foto de perfil actualizada correctamente");
    } else {
      notifyError("No se pudo actualizar la foto de perfil");
    }
  };

  const columns: DataTableColumn<RES_ContratistaResumen>[] = [
    {
      accessor: "index",
      title: "#",
      textAlign: "center",
      width: 50,
      render: (_, index) => index + 1,
    },
    {
      accessor: "seleccion",
      title: (
        <Group gap="4px" wrap="nowrap" align="center" justify="center">
          <Checkbox
            checked={todosVisiblesSeleccionados}
            indeterminate={
              !todosVisiblesSeleccionados && algunosVisiblesSeleccionados
            }
            onChange={toggleSeleccionarTodos}
            size="xs"
            color="indigo"
          />
          {seleccionados.size > 0 && (
            <>
              <Tooltip label={`Habilitar Contrato (${seleccionados.size})`}>
                <ActionIcon
                  variant="filled"
                  color="teal"
                  size="xs"
                  radius="md"
                  onClick={async () => {
                    const ids = Array.from(seleccionados);
                    const ok = await toggleConContrato(ids, true);
                    if (ok)
                      notifySuccess(
                        "Contratos habilitados para los seleccionados",
                      );
                  }}
                >
                  <CheckBadgeIcon className="w-3.5 h-3.5 text-white" />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={`Fotocheck (${seleccionados.size})`}>
                <ActionIcon
                  variant="filled"
                  color="indigo"
                  size="xs"
                  radius="md"
                  onClick={abrirModalFotocheck}
                >
                  <IdentificationIcon className="w-3.5 h-3.5 text-white" />
                </ActionIcon>
              </Tooltip>
            </>
          )}
        </Group>
      ),
      textAlign: "center",
      width: 75,
      render: (r) => (
        <Group gap="4px" wrap="nowrap" align="center" justify="center">
          <Checkbox
            checked={seleccionados.has(r.id_contratista)}
            onChange={() => toggleSeleccion(r.id_contratista)}
            size="xs"
            color="indigo"
            onClick={(e) => e.stopPropagation()}
          />
          <Tooltip label="Fotocheck">
            <ActionIcon
              variant="light"
              color="indigo"
              size="xs"
              radius="md"
              onClick={(e) => {
                e.stopPropagation();
                abrirModalFotocheckIndividual(r);
              }}
            >
              <IdentificationIcon className="w-3.5 h-3.5" />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    },
    {
      accessor: "contratista",
      title: "Contratista / Minero",
      width: 180,
      render: (r) => {
        const isUpdatingFoto = r.id_contratista === idActualizandoFoto;
        return (
          <Group gap="sm">
            <div className="relative group overflow-hidden rounded-full w-9 h-9 border border-zinc-800 shrink-0">
              {isUpdatingFoto && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full z-10">
                  <Loader size="xs" color="indigo" />
                </div>
              )}
              <FileButton
                onChange={(file) => handleUpdateFoto(r.id_contratista, file)}
                accept="image/png,image/jpeg,image/jpg"
                disabled={isUpdatingFoto}
              >
                {(props) => (
                  <div
                    {...props}
                    className={`w-full h-full cursor-pointer ${isUpdatingFoto ? "pointer-events-none" : ""}`}
                  >
                    <Avatar
                      src={r.url_foto}
                      radius="xl"
                      color="indigo"
                      variant="light"
                      className="w-full h-full"
                    >
                      {r.nombre?.[0] ?? ""}
                      {r.apellido?.[0] ?? ""}
                    </Avatar>
                    {!isUpdatingFoto && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <PencilSquareIcon className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>
                )}
              </FileButton>
            </div>
            <div className="min-w-0 flex-1">
              <Text
                size="xs"
                fw={700}
                className="text-zinc-200 truncate leading-tight"
              >
                {r.nombre} {r.apellido}
              </Text>
              <Text size="10px" className="text-zinc-500 font-mono truncate">
                DNI: {r.dni || "---"}
              </Text>
            </div>
          </Group>
        );
      },
    },
    {
      accessor: "operativo",
      title: "Mina y Labores",
      width: 320,
      textAlign: "center",
      render: (r) => {
        const hasMina = r.id_mina && r.id_mina > 0;
        const laboresActivas =
          r.labores_asignadas?.filter(
            (lab) => lab.estado === EstadoBase.Activo,
          ) ?? [];

        return (
          <div className="flex flex-row justify-center">
            <Group gap="lg" wrap="nowrap" justify="center" align="center">
              {!hasMina ? (
                <Text size="xs" c="dimmed" fs="italic" className="min-w-32.5">
                  Sin asignar
                </Text>
              ) : (
                <>
                  <Badge
                    variant="light"
                    color="pink.6"
                    radius="md"
                    size="md"
                    className="font-bold h-7 border border-pink-500/20"
                    leftSection={
                      <MapPinIcon className="w-3.5 h-3.5 text-pink-400" />
                    }
                  >
                    {r.mina}
                  </Badge>

                  <Stack gap={4} align="center">
                    {laboresActivas.length == 0 ? (
                      <Text size="xs" c="dimmed" fs="italic">
                        Sin asignar
                      </Text>
                    ) : (
                      laboresActivas.map((lab, idx) => (
                        <Badge
                          key={idx}
                          variant="light"
                          color="cyan.6"
                          radius="sm"
                          size="xs"
                          className="font-bold h-6 border border-cyan-500/10"
                        >
                          {lab.nombre}
                        </Badge>
                      ))
                    )}
                  </Stack>
                </>
              )}

              <Tooltip label="Asignación de Mina y Labores">
                <ActionIcon
                  variant="subtle"
                  color="zinc"
                  size="lg"
                  onClick={() => asignacion.abrir(r)}
                  className="hover:bg-zinc-800 transition-colors rounded-xl"
                >
                  <PencilSquareIcon className="w-5 h-5 text-zinc-400" />
                </ActionIcon>
              </Tooltip>
            </Group>
          </div>
        );
      },
    },
    {
      accessor: "contrato",
      title: "Contrato",
      width: 170,
      textAlign: "center",
      render: (r) => {
        const tieneContratoVigente =
          r.id_contrato_vigente !== null && r.id_contrato_vigente !== undefined;
        const conContratoRaw = r.con_contrato as unknown;
        const esContratistaConContrato = Boolean(
          conContratoRaw === true ||
          conContratoRaw === 1 ||
          conContratoRaw === "1" ||
          conContratoRaw === "true",
        );
        const nombreCompleto = `${r.nombre} ${r.apellido}`;

        if (!esContratistaConContrato) {
          const isToggling = Boolean(loadingToggles[r.id_contratista]);
          return (
            <Group gap={4} wrap="nowrap" justify="center">
              <Badge
                variant="light"
                color="gray"
                radius="md"
                className="font-medium"
              >
                No Aplica
              </Badge>
              <Tooltip
                label="Habilitar contrato"
                withArrow
                position="top"
                transitionProps={{ duration: 150 }}
              >
                <ActionIcon
                  variant="subtle"
                  color="teal"
                  radius="md"
                  size="sm"
                  aria-label="Habilitar contrato"
                  loading={isToggling}
                  disabled={isToggling}
                  onClick={async () => {
                    setLoadingToggles((prev) => ({
                      ...prev,
                      [r.id_contratista]: true,
                    }));
                    try {
                      const ok = await toggleConContrato(
                        [r.id_contratista],
                        true,
                      );
                      if (ok)
                        notifySuccess(
                          `Contrato habilitado para ${nombreCompleto}`,
                        );
                    } finally {
                      setLoadingToggles((prev) => ({
                        ...prev,
                        [r.id_contratista]: false,
                      }));
                    }
                  }}
                >
                  <CheckBadgeIcon className="w-4 h-4 text-teal-400" />
                </ActionIcon>
              </Tooltip>
            </Group>
          );
        }

        if (!tieneContratoVigente) {
          return (
            <Group gap={4} wrap="nowrap" justify="center">
              <Badge
                variant="light"
                color="orange"
                radius="md"
                className="font-medium"
              >
                Por Asignar
              </Badge>
              <Tooltip
                label="Ver historial de contratos"
                withArrow
                position="top"
                transitionProps={{ duration: 150 }}
              >
                <ActionIcon
                  variant="subtle"
                  color="orange"
                  radius="md"
                  size="sm"
                  aria-label="Ver histórico de contratos"
                  onClick={() =>
                    abrirModalHistorial(r.id_contratista, nombreCompleto)
                  }
                >
                  <DocumentTextIcon className="w-4 h-4" />
                </ActionIcon>
              </Tooltip>
            </Group>
          );
        }

        let badgeColor = "teal";
        let badgeText = "Con Contrato";

        if (
          esContratistaConContrato &&
          tieneContratoVigente &&
          !r.contrato_por_tiempo_indefinido &&
          r.contrato_fecha_fin
        ) {
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          const fin = new Date(r.contrato_fecha_fin);
          fin.setHours(0, 0, 0, 0);
          const diffTime = fin.getTime() - hoy.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            badgeColor = "red";
            badgeText = "Vencido";
          } else if (diffDays <= 5) {
            badgeColor = "red";
            badgeText = "Crítico";
          } else if (diffDays <= 30) {
            badgeColor = "orange";
            badgeText = "Por Vencer";
          }
        }

        return (
          <Group gap={4} wrap="nowrap" justify="center" align="center">
            <Badge
              variant="light"
              color={badgeColor}
              radius="md"
              className="font-medium"
            >
              {badgeText}
            </Badge>
            <Tooltip
              label="Ver historial de contratos"
              withArrow
              position="top"
              transitionProps={{ duration: 150 }}
            >
              <ActionIcon
                variant="subtle"
                color="indigo"
                radius="md"
                size="sm"
                aria-label="Ver histórico de contratos"
                onClick={() =>
                  abrirModalHistorial(r.id_contratista, nombreCompleto)
                }
              >
                <DocumentTextIcon className="w-4 h-4 text-indigo-400" />
              </ActionIcon>
            </Tooltip>
          </Group>
        );
      },
    },
    {
      accessor: "contacto",
      title: "Contacto",
      width: 180,
      render: (r) => (
        <Stack gap={2}>
          {r.email && (
            <Group gap={4}>
              <EnvelopeIcon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <Text size="xs" className="text-zinc-300 truncate max-w-40">
                {r.email}
              </Text>
            </Group>
          )}
          {r.telefono && (
            <Group gap={4}>
              <PhoneIcon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <Text size="xs" className="text-zinc-300 font-mono">
                {r.telefono}
              </Text>
            </Group>
          )}
          {!r.email && !r.telefono && (
            <Text size="xs" c="dimmed" fs="italic">
              Sin contacto
            </Text>
          )}
        </Stack>
      ),
    },
    {
      accessor: "fecha_nacimiento",
      title: "F. Nacimiento",
      width: 130,
      render: (r) => {
        if (!r.fecha_nacimiento) {
          return (
            <Text size="xs" c="dimmed" fs="italic">
              No registrado
            </Text>
          );
        }
        const parts = r.fecha_nacimiento.split("-");
        const formattedDate =
          parts.length === 3
            ? `${parts[2]}/${parts[1]}/${parts[0]}`
            : r.fecha_nacimiento;
        return (
          <Group gap={6}>
            <CakeIcon className="w-4 h-4 text-pink-400 shrink-0" />
            <Text size="xs" fw={500} className="text-zinc-300">
              {formattedDate}
            </Text>
          </Group>
        );
      },
    },
    {
      accessor: "estado",
      title: "Estado",
      textAlign: "center",
      width: 110,
      render: (r) => (
        <Badge
          variant="light"
          color={r.estado === "Activo" ? "green" : "gray"}
          radius="md"
        >
          {r.estado}
        </Badge>
      ),
    },
    {
      accessor: "acciones",
      title: "",
      textAlign: "center",
      width: 80,
      render: (r) => (
        <Menu position="bottom-end" withArrow shadow="lg">
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              color="zinc"
              size="sm"
              radius="md"
              aria-label="Acciones"
              onClick={(e) => e.stopPropagation()}
            >
              <EllipsisVerticalIcon className="w-4 h-4 text-zinc-400" />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<PencilSquareIcon className="w-4 h-4" />}
              onClick={() => abrirModalEdicion(r)}
            >
              Editar
            </Menu.Item>
            <Menu.Item
              leftSection={<TrashIcon className="w-4 h-4" />}
              color="red"
              onClick={async () => {
                if (
                  !window.confirm(
                    `¿Eliminar a ${r.nombre} ${r.apellido}? Esta accion es reversible solo si reactivas su estado.`,
                  )
                ) {
                  return;
                }
                const ok = await eliminarContratista(r.id_contratista);
                if (ok) {
                  notifySuccess(
                    `${r.nombre} ${r.apellido} eliminado correctamente`,
                  );
                } else {
                  notifyError("No se pudo eliminar el contratista");
                }
              }}
            >
              Eliminar
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      ),
    },
  ];

  return (
    <>
      {loading ? (
        <Stack align="center" gap="md" py={100}>
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <UserGroupIcon className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <Text
            size="xs"
            fw={900}
            className="uppercase tracking-[0.3em] text-zinc-500"
          >
            Consultando Personal Minero...
          </Text>
        </Stack>
      ) : contratistas.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 border border-dashed border-zinc-800 rounded-4xl bg-zinc-900/10 backdrop-blur-sm">
          <UserGroupIcon className="w-12 h-12 text-zinc-700 mb-4" />
          <Text
            size="sm"
            fw={700}
            className="text-zinc-400 uppercase tracking-widest"
          >
            Sin resultados
          </Text>
          <Text size="xs" c="dimmed" className="mt-1">
            No se encontraron contratistas. ¡Empieza registrando uno nuevo!
          </Text>
        </div>
      ) : (
        <DataTableEstandar
          idAccessor="id_contratista"
          columns={columns}
          records={contratistas}
          loading={loading}
        />
      )}

      {/* Modal Crear Contrato Contratista */}
      {modalContratoEmpleado?.abierto && modalContratoEmpleado.idEmpleado && (
        <ModalContratoEmpleado
          opened={modalContratoEmpleado.abierto}
          close={cerrarModalContrato}
          idEmpleado={modalContratoEmpleado.idEmpleado}
          nombreEmpleado={modalContratoEmpleado.nombre}
          onSuccess={onContratoCreado}
          esContratista={true}
        />
      )}

      {/* Modal Historial Contratos Contratista */}
      {modalHistorialContratos?.abierto &&
        modalHistorialContratos.idEmpleado && (
          <ModalHistorialContratosEmpleado
            opened={modalHistorialContratos.abierto}
            close={cerrarModalHistorial}
            idEmpleado={modalHistorialContratos.idEmpleado}
            nombreEmpleado={modalHistorialContratos.nombre}
            onCrearContratoClick={() => {
              const id = modalHistorialContratos.idEmpleado!;
              const nombre = modalHistorialContratos.nombre;
              cerrarModalHistorial();
              abrirModalContrato(id, nombre);
            }}
            esContratista={true}
          />
        )}

      {/* Modal de edición de contratista */}
      {contratistaEnEdicion && (
        <ModalEditarContratista
          contratista={contratistaEnEdicion}
          opened={true}
          close={cerrarModalEdicion}
          onSuccess={(editado) => {
            actualizarContratistaEnLista(editado);
            cerrarModalEdicion();
          }}
        />
      )}
    </>
  );
};
