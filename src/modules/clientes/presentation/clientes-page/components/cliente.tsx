import {
  ActionIcon,
  Badge,
  Group,
  Menu,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconBuilding,
  IconUser,
  IconBuildingBank,
  IconDotsVertical,
  IconPencil,
  IconHistory,
  IconTrash,
} from "@tabler/icons-react";
import { DataTableEstandar } from "../../../../../presentation/utils/datatable-estandar";
import type { ClienteResponse } from "../../../service/clientes.responses";

interface Props {
  clientes: ClienteResponse[];
  loading: boolean;
  onOpenCuentas: (cliente: ClienteResponse) => void;
  onEdit: (cliente: ClienteResponse) => void;
  onHistory: (cliente: ClienteResponse) => void;
  onDelete: (cliente: ClienteResponse) => void;
  deletingId: number | null;
}

export const Cliente = ({
  clientes,
  loading,
  onOpenCuentas,
  onEdit,
  onHistory,
  onDelete,
  deletingId,
}: Props) => {
  return (
    <DataTableEstandar
      idAccessor="id_cliente"
      records={clientes}
      loading={loading}
      columns={[
        {
          accessor: "index",
          title: "#",
          textAlign: "center",
          width: 50,
          render: (_: ClienteResponse, index: number) => index + 1,
        },
        {
          accessor: "razon_social",
          title: "Cliente",
          width: 280,
          render: (r: ClienteResponse) => (
            <Group gap="sm">
              <ThemeIcon
                variant="light"
                color={r.tipo_entidad === "Persona Natural" ? "cyan" : "indigo"}
                radius="xl"
                size="lg"
              >
                {r.tipo_entidad === "Persona Natural" ? (
                  <IconUser className="w-5 h-5" />
                ) : (
                  <IconBuilding className="w-5 h-5" />
                )}
              </ThemeIcon>
              <div>
                <Text size="sm" fw={500} className="text-zinc-200">
                  {r.razon_social}
                </Text>
                <Text size="xs" className="text-zinc-500">
                  {r.tipo_entidad}
                  {r.ruc && ` · RUC: ${r.ruc}`}
                  {r.dni && ` · DNI: ${r.dni}`}
                </Text>
              </div>
            </Group>
          ),
        },
        {
          accessor: "cantidad_cuentas_bancarias",
          title: "Cuentas",
          width: 150,
          textAlign: "center",
          render: (r: ClienteResponse) => (
            <Group gap="xs" justify="center" wrap="nowrap">
              <Badge
                color={r.cantidad_cuentas_bancarias > 0 ? "blue" : "gray"}
                variant="light"
                size="sm"
                radius="xl"
              >
                {r.cantidad_cuentas_bancarias === 1
                  ? "1 cuenta"
                  : `${r.cantidad_cuentas_bancarias} cuentas`}
              </Badge>
              <Tooltip label="Gestionar Cuentas" withArrow position="left">
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  radius="xl"
                  size="sm"
                  onClick={() => onOpenCuentas(r)}
                >
                  <IconBuildingBank size={16} stroke={1.5} />
                </ActionIcon>
              </Tooltip>
            </Group>
          ),
        },
        {
          accessor: "direccion",
          title: "Dirección",
          textAlign: "center",
          render: (r: ClienteResponse) => (
            <Text
              size="sm"
              className="text-zinc-400 mx-3.5 text-center"
              lineClamp={1}
            >
              {r.direccion || "—"}
            </Text>
          ),
        },
        {
          accessor: "telefono",
          title: "Teléfono",
          render: (r: ClienteResponse) => (
            <Text size="sm" className="text-zinc-300">
              {r.telefono || "—"}
            </Text>
          ),
        },
        {
          accessor: "correo",
          title: "Correo",
          render: (r: ClienteResponse) => (
            <Text size="sm" className="text-zinc-400">
              {r.correo || "—"}
            </Text>
          ),
        },
        {
          accessor: "estado",
          title: "Estado",
          width: 100,
          textAlign: "center",
          render: (r: ClienteResponse) => (
            <Badge
              color={r.estado === "Activo" ? "green" : "gray"}
              variant="light"
              size="sm"
              radius="lg"
            >
              {r.estado}
            </Badge>
          ),
        },
        {
          accessor: "actions",
          title: "",
          width: 70,
          textAlign: "right",
          render: (r: ClienteResponse) => (
            <Menu shadow="md" width={200} position="bottom-end" withArrow>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label="Abrir acciones del cliente"
                  title="Acciones"
                >
                  <IconDotsVertical className="w-5 h-5" />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown className="bg-zinc-900 border-zinc-800">
                <Menu.Label className="text-zinc-500">Acciones</Menu.Label>
                <Menu.Item
                  leftSection={<IconPencil className="w-4 h-4" />}
                  onClick={() => onEdit(r)}
                  className="text-zinc-300 hover:bg-zinc-800 hover:text-white"
                >
                  Editar
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconHistory className="w-4 h-4" />}
                  onClick={() => onHistory(r)}
                  className="text-zinc-300 hover:bg-zinc-800 hover:text-white"
                >
                  Ver historial
                </Menu.Item>
                <Menu.Divider className="border-zinc-800" />
                <Menu.Item
                  leftSection={<IconTrash className="w-4 h-4" />}
                  color="red"
                  onClick={() => onDelete(r)}
                  disabled={deletingId === r.id_cliente}
                  className="hover:bg-red-900/20"
                >
                  Eliminar
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ),
        },
      ]}
    />
  );
};
