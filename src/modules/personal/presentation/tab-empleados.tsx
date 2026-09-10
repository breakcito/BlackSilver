import { useState } from "react";
import {
  Group,
  Text,
  Badge,
  Avatar,
  FileButton,
  Stack,
  Loader,
  ActionIcon,
  Tooltip,
  Checkbox,
} from "@mantine/core";
import {
  PencilSquareIcon,
  UserGroupIcon,
  CakeIcon,
  CheckBadgeIcon,
  PhoneIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  IdentificationIcon,
  CreditCardIcon,
  EllipsisVerticalIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Menu } from "@mantine/core";
import { type DataTableColumn } from "mantine-datatable";

import { useEmpleados } from "../hooks/useEmpleados";
import type { RES_EmpleadoResumen } from "../service/empleados.responses";
import { useNotify } from "../../../hooks/useNotify";

import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import { ModalContratoEmpleado } from "../../contratos-empleado/presentation/modal-contrato-empleado";
import { ModalHistorialContratosEmpleado } from "../../contratos-empleado/presentation/modal-historial-contratos-empleado";
import { ModalEditarEmpleado } from "./modal-editar-empleado";

interface TabEmpleadosProps {
  controller: ReturnType<typeof useEmpleados>;
  onOpenCuentas: (empleado: RES_EmpleadoResumen) => void;
}

export const TabEmpleados = ({ controller, onOpenCuentas }: TabEmpleadosProps) => {
  const { notifySuccess, notifyError } = useNotify();
  const [loadingToggles, setLoadingToggles] = useState<Record<number, boolean>>({});

  const {
    empleados,
    loading,
    actualizarFoto,
    idActualizandoFoto,
    cerrarModalContrato,
    modalContratoEmpleado,
    abrirModalHistorial,
    cerrarModalHistorial,
    modalHistorialContratos,
    onContratoCreado,
    // Edición
    empleadoEnEdicion,
    abrirModalEdicion,
    cerrarModalEdicion,
    actualizarEmpleadoEnLista,
    // Eliminar
    eliminarEmpleado,
    // Selección masiva (usada en la columna de checkbox)
    seleccionados,
    toggleSeleccion,
    toggleSeleccionarTodos,
    todosVisiblesSeleccionados,
    algunosVisiblesSeleccionados,
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

  const columns: DataTableColumn<RES_EmpleadoResumen>[] = [
    {
      accessor: "index",
      title: "#",
      textAlign: "center",
      width: 50,
    },
    {
      accessor: "seleccion",
      title: (
        <Group gap="4px" wrap="nowrap" align="center" justify="center">
          <Checkbox
            checked={todosVisiblesSeleccionados}
            indeterminate={!todosVisiblesSeleccionados && algunosVisiblesSeleccionados}
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
                    const ok = await controller.toggleConContrato(ids, true);
                    if (ok) notifySuccess("Contratos habilitados para los seleccionados");
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
                  onClick={controller.abrirModalFotocheck}
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
            checked={seleccionados.has(r.id_empleado)}
            onChange={() => toggleSeleccion(r.id_empleado)}
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
                controller.abrirModalFotocheckIndividual(r);
              }}
            >
              <IdentificationIcon className="w-3.5 h-3.5" />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    },
    {
      accessor: "empleado",
      title: "Empleado",
      width: 280,
      render: (r) => {
        const isUpdatingFoto = r.id_empleado === idActualizandoFoto;
        return (
          <Group gap="sm">
            <div className="relative group overflow-hidden rounded-full w-10 h-10 border border-zinc-800">
              {isUpdatingFoto && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full z-10">
                  <Loader size="xs" color="indigo" />
                </div>
              )}
              <FileButton
                onChange={(file) => handleUpdateFoto(r.id_empleado, file)}
                accept="image/png,image/jpeg,image/jpg"
                disabled={isUpdatingFoto}
              >
                {(props) => (
                  <div
                    {...props}
                    className={`w-full h-full cursor-pointer ${
                      isUpdatingFoto ? "pointer-events-none" : ""
                    }`}
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
                        <PencilSquareIcon className="w-4 h-4 text-white" />
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
      accessor: "ubicacion",
      title: "Área / Cargo",
      width: 220,
      render: (r) => {
        if (r.con_contrato && !r.cargo) {
          return (
            <Badge
              variant="light"
              color="teal"
              radius="sm"
              size="xs"
              className="font-medium w-fit"
            >
              Cargo asignado por contrato
            </Badge>
          );
        }
        return (
          <Stack gap={4}>
            <Text
              size="xs"
              fw={700}
              className="text-zinc-100 truncate leading-tight"
            >
              {r.cargo ?? "—"}
            </Text>
            {r.area && (
              <Badge
                variant="light"
                color="indigo"
                radius="sm"
                size="xs"
                className="font-medium w-fit"
              >
                {r.area}
              </Badge>
            )}
          </Stack>
        );
      },
    },
    {
      accessor: "contacto",
      title: "Contacto",
      width: 240,
      render: (r) => (
        <Stack gap={2}>
          {r.email && (
            <Group gap={4}>
              <EnvelopeIcon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <Text size="xs" className="text-zinc-300 truncate max-w-55">
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
      accessor: "contrato",
      title: "Contrato",
      width: 170,
      textAlign: "center",
      render: (r) => {
        const tieneContratoVigente = r.id_contrato_vigente !== null;
        // Tolerante: backend puede devolver true / 1 / "1" / "true"
        const conContratoRaw = r.con_contrato as unknown;
        const esEmpleadoConContrato = Boolean(
          conContratoRaw === true ||
            conContratoRaw === 1 ||
            conContratoRaw === "1" ||
            conContratoRaw === "true",
        );
        const nombreCompleto = `${r.nombre} ${r.apellido}`;

        // 3 estados:
        // 1) con_contrato=false → "No Aplica" sin botones.
        // 2) con_contrato=true && id_contrato_vigente===null → "Por Asignar" + botón "+".
        // 3) id_contrato_vigente!==null → "Con Contrato" + botón "Documento".

        if (!esEmpleadoConContrato) {
          const isToggling = Boolean(loadingToggles[r.id_empleado]);
          return (
            <Group gap={4} wrap="nowrap" justify="center">
              <Badge variant="light" color="gray" radius="md" className="font-medium">
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
                    setLoadingToggles((prev) => ({ ...prev, [r.id_empleado]: true }));
                    try {
                      const ok = await controller.toggleConContrato([r.id_empleado], true);
                      if (ok) notifySuccess(`Contrato habilitado para ${nombreCompleto}`);
                    } finally {
                      setLoadingToggles((prev) => ({ ...prev, [r.id_empleado]: false }));
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
                    abrirModalHistorial(r.id_empleado, nombreCompleto)
                  }
                >
                  <DocumentTextIcon className="w-4 h-4" />
                </ActionIcon>
              </Tooltip>
            </Group>
          );
        }

        // Con Contrato: solo botón de ver historial
        let badgeColor = "teal";
        let badgeText = "Con Contrato";
        let warningText = "";

        if (esEmpleadoConContrato && tieneContratoVigente && !r.contrato_por_tiempo_indefinido && r.contrato_fecha_fin) {
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          const fin = new Date(r.contrato_fecha_fin);
          fin.setHours(0, 0, 0, 0);
          const diffTime = fin.getTime() - hoy.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            badgeColor = "red";
            badgeText = "Vencido";
            warningText = `Venció hace ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? "día" : "días"}`;
          } else if (diffDays <= 5) {
            badgeColor = "red";
            badgeText = "Crítico";
            warningText = `Vence en ${diffDays} ${diffDays === 1 ? "día" : "días"}`;
          } else if (diffDays <= 30) {
            badgeColor = "orange";
            badgeText = "Por Vencer";
            warningText = `Vence en ${diffDays} días`;
          }
        }

        return (
          <Group gap={4} wrap="nowrap" justify="center" align="center">
            <Stack gap={0} align="center">
              <Badge
                variant="light"
                color={badgeColor}
                radius="md"
                leftSection={<CheckBadgeIcon className="w-3.5 h-3.5" />}
                className="font-medium"
              >
                {badgeText}
              </Badge>
              {warningText && (
                <Text size="10px" fw={700} c={badgeColor} className="mt-0.5 whitespace-nowrap">
                  {warningText}
                </Text>
              )}
            </Stack>
            <Tooltip
              label="Ver historial de contratos"
              withArrow
              position="top"
              transitionProps={{ duration: 150 }}
            >
              <ActionIcon
                variant="subtle"
                color={badgeColor}
                radius="md"
                size="sm"
                aria-label="Ver histórico de contratos"
                onClick={() =>
                  abrirModalHistorial(r.id_empleado, nombreCompleto)
                }
              >
                <DocumentTextIcon className="w-4 h-4" />
              </ActionIcon>
            </Tooltip>
          </Group>
        );
      },
    },
    {
      accessor: "cantidad_cuentas_bancarias",
      title: "Cuentas",
      width: 140,
      render: (r) => {
        const count = r.cantidad_cuentas_bancarias ?? 0;
        return (
          <Group gap={4} wrap="nowrap" justify="center">
            <Badge
              color={count > 0 ? "blue" : "gray"}
              variant="light"
              radius="md"
              size="xs"
              className="font-medium"
            >
              {count === 1 ? "1 cuenta" : `${count} cuentas`}
            </Badge>
            <Tooltip label="Gestionar Cuentas" withArrow position="top">
              <ActionIcon
                variant="subtle"
                color="blue"
                radius="md"
                size="sm"
                aria-label="Gestionar Cuentas"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCuentas(r);
                }}
              >
                <CreditCardIcon className="w-4 h-4" />
              </ActionIcon>
            </Tooltip>
          </Group>
        );
      },
    },
    {
      accessor: "fecha_nacimiento",
      title: "F. Nacimiento",
      width: 160,
      render: (r) => {
        if (!r.fecha_nacimiento) {
          return (
            <Text size="xs" c="dimmed" fs="italic">
              No especificado
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
      width: 90,
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
                const ok = await eliminarEmpleado(r.id_empleado);
                if (ok) {
                  notifySuccess(
                    `${r.nombre} ${r.apellido} eliminado correctamente`,
                  );
                } else {
                  notifyError("No se pudo eliminar el empleado");
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
    <Stack gap="xl">
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
            Consultando Personal...
          </Text>
        </Stack>
      ) : empleados.length === 0 ? (
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
            No se encontraron empleados para los filtros aplicados.
          </Text>
        </div>
      ) : (
        <div className="bg-zinc-900/65 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300 hover:border-zinc-700/50">
          <DataTableEstandar
            idAccessor="id_empleado"
            columns={columns}
            records={empleados}
            loading={loading}
            initialPageSize={30}
            minHeight={0}
          />
        </div>
      )}

      {/* Modal para crear contrato (standalone desde el listado) */}
      {modalContratoEmpleado && modalContratoEmpleado.idEmpleado && (
        <ModalContratoEmpleado
          idEmpleado={modalContratoEmpleado.idEmpleado}
          opened={modalContratoEmpleado.abierto}
          close={cerrarModalContrato}
          onSuccess={(payload) => {
            onContratoCreado(payload as Parameters<typeof onContratoCreado>[0]);
          }}
        />
      )}

      {/* El botón de fotocheck y su modal están en personal.page.tsx, */}

      {/* Modal para ver historial de contratos */}
      {modalHistorialContratos && modalHistorialContratos.idEmpleado && (
        <ModalHistorialContratosEmpleado
          idEmpleado={modalHistorialContratos.idEmpleado}
          nombreEmpleado={modalHistorialContratos.nombre}
          opened={modalHistorialContratos.abierto}
          close={cerrarModalHistorial}
          onContratoCreado={(payload) => {
            if (payload?.empleado) {
              onContratoCreado({ empleado: payload.empleado as never });
            } else {
              onContratoCreado();
            }
          }}
        />
      )}

      {/* Modal de edición de empleado */}
      {empleadoEnEdicion && (
        <ModalEditarEmpleado
          empleado={empleadoEnEdicion}
          opened={true}
          close={cerrarModalEdicion}
          onSuccess={(editado) => {
            actualizarEmpleadoEnLista(editado);
            cerrarModalEdicion();
          }}
        />
      )}
    </Stack>
  );
};
