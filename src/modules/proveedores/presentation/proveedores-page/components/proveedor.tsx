import {
  Badge,
  ActionIcon,
  Menu,
  Tooltip,
  Group,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconBuildingBank,
  IconBuilding,
  IconDotsVertical,
  IconFlame,
  IconMail,
  IconMapPin,
  IconPencil,
  IconPhone,
  IconTrash,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { DataTableEstandar } from "../../../../../presentation/utils/datatable-estandar";
import type { DataTableColumn } from "mantine-datatable";
import type { ProveedorResponse } from "../../../service/proveedores.responses";
import { TipoEntidad } from "../../../../../shared/enums/_generic/tipo-entidad";

type Col = DataTableColumn<ProveedorResponse>;

interface Props {
  proveedores: ProveedorResponse[];
  loading: boolean;
  modoCarbon: boolean;
  onOpenCuentas: (proveedor: ProveedorResponse) => void;
  onOpenPersonal: (proveedor: ProveedorResponse) => void;
  onOpenTiposCarbon?: (proveedor: ProveedorResponse) => void;
  onOpenLugaresExtraccion?: (proveedor: ProveedorResponse) => void;
  onEditar: (proveedor: ProveedorResponse) => void;
  onEliminar: (proveedor: ProveedorResponse) => void;
  eliminandoId: number | null;
}

export const Proveedor = ({
  proveedores,
  loading,
  modoCarbon,
  onOpenCuentas,
  onOpenPersonal,
  onOpenTiposCarbon,
  onOpenLugaresExtraccion,
  onEditar,
  onEliminar,
  eliminandoId,
}: Props) => {
  const columnas: Col[] = [
    {
      accessor: "index",
      title: "#",
      textAlign: "center",
      width: 50,
      render: (_: ProveedorResponse, index: number) => index + 1,
    },
    {
      accessor: "razon_social",
      title: "Proveedor",
      width: 280,
      render: (r: ProveedorResponse) => (
        <Group gap="sm">
          <ThemeIcon
            variant="light"
            color={
              r.tipo_entidad === TipoEntidad.Natural ? "cyan" : "indigo"
            }
            radius="xl"
            size="lg"
          >
            {r.tipo_entidad === TipoEntidad.Natural ? (
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
      render: (r: ProveedorResponse) => (
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
      accessor: "id_proveedor",
      title: "Personal",
      width: 110,
      textAlign: "center",
      render: (r: ProveedorResponse) => (
        <Tooltip label="Ver personal externo" withArrow position="left">
          <ActionIcon
            variant="subtle"
            color="indigo"
            radius="xl"
            size="sm"
            onClick={() => onOpenPersonal(r)}
          >
            <IconUsers size={16} stroke={1.5} />
          </ActionIcon>
        </Tooltip>
      ),
    },
    ...(modoCarbon
      ? [
          {
            accessor: "cantidad_tipos_carbon" as const,
            title: "Tipos Carbon",
            width: 130,
            textAlign: "center" as const,
            render: (r: ProveedorResponse) => (
              <Group gap="xs" justify="center" wrap="nowrap">
                <Badge
                  color={r.cantidad_tipos_carbon > 0 ? "orange" : "gray"}
                  variant="light"
                  size="sm"
                  radius="xl"
                >
                  {r.cantidad_tipos_carbon === 1
                    ? "1 tipo"
                    : `${r.cantidad_tipos_carbon} tipos`}
                </Badge>
                {onOpenTiposCarbon && (
                  <Tooltip
                    label="Gestionar tipos de carbon"
                    withArrow
                    position="left"
                  >
                    <ActionIcon
                      variant="subtle"
                      color="orange"
                      radius="xl"
                      size="sm"
                      onClick={() => onOpenTiposCarbon(r)}
                    >
                      <IconFlame size={16} stroke={1.5} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
            ),
          },
          {
            accessor: "cantidad_lugares_extraccion" as const,
            title: "Lugares Extraccion",
            width: 150,
            textAlign: "center" as const,
            render: (r: ProveedorResponse) => (
              <Group gap="xs" justify="center" wrap="nowrap">
                <Badge
                  color={r.cantidad_lugares_extraccion > 0 ? "orange" : "gray"}
                  variant="light"
                  size="sm"
                  radius="xl"
                >
                  {r.cantidad_lugares_extraccion === 1
                    ? "1 lugar"
                    : `${r.cantidad_lugares_extraccion} lugares`}
                </Badge>
                {onOpenLugaresExtraccion && (
                  <Tooltip
                    label="Gestionar lugares de extraccion"
                    withArrow
                    position="left"
                  >
                    <ActionIcon
                      variant="subtle"
                      color="orange"
                      radius="xl"
                      size="sm"
                      onClick={() => onOpenLugaresExtraccion(r)}
                    >
                      <IconMapPin size={16} stroke={1.5} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
            ),
          },
        ]
      : []),
    {
      accessor: "contacto",
      title: "Contacto",
      width: 200,
      render: (r: ProveedorResponse) => (
        <Stack gap={2}>
          {r.correo && (
            <Group gap={4}>
              <IconMail
                size={14}
                stroke={1.5}
                className="text-zinc-500 shrink-0"
              />
              <Text size="xs" className="text-zinc-300 truncate max-w-55">
                {r.correo}
              </Text>
            </Group>
          )}
          {r.telefono && (
            <Group gap={4}>
              <IconPhone
                size={14}
                stroke={1.5}
                className="text-zinc-500 shrink-0"
              />
              <Text size="xs" className="text-zinc-300 font-mono">
                {r.telefono}
              </Text>
            </Group>
          )}
          {!r.correo && !r.telefono && (
            <Text size="xs" c="dimmed" fs="italic">
              Sin contacto
            </Text>
          )}
        </Stack>
      ),
    },
    {
      accessor: "indicadores",
      title: "Indicadores",
      textAlign: "center",
      render: (r: ProveedorResponse) => {
        const badges = [];
        if (r.para_mantenimiento) {
          badges.push(
            <Badge key="maint" color="blue" variant="light" size="sm" radius="xl">
              Da Mantenimiento
            </Badge>,
          );
        }
        if (r.para_transporte) {
          badges.push(
            <Badge key="trans" color="teal" variant="light" size="sm" radius="xl">
              Transporte
            </Badge>,
          );
        }
        return badges.length > 0 ? (
          <Group gap="xs" justify="center">
            {badges}
          </Group>
        ) : (
          <Text size="sm" className="text-zinc-500">
            —
          </Text>
        );
      },
    },
    {
      accessor: "estado",
      title: "Estado",
      width: 100,
      textAlign: "center",
      render: (r: ProveedorResponse) => (
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
      accessor: "acciones",
      title: "",
      width: 70,
      textAlign: "right",
      render: (r: ProveedorResponse) => {
        const estaEliminando = eliminandoId === r.id_proveedor;
        return (
          <Menu shadow="md" width={170} position="bottom-end" withArrow>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                loading={estaEliminando}
                aria-label="Abrir acciones del proveedor"
              >
                <IconDotsVertical size={18} stroke={1.5} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown className="bg-zinc-900 border-zinc-800">
              <Menu.Label className="text-zinc-500">Acciones</Menu.Label>
              <Menu.Item
                leftSection={<IconPencil size={16} stroke={1.5} />}
                onClick={() => onEditar(r)}
                className="text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Editar
              </Menu.Item>
              <Menu.Item
                leftSection={<IconTrash size={16} stroke={1.5} />}
                color="red"
                onClick={() => onEliminar(r)}
                className="hover:bg-red-900/20"
              >
                Eliminar
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        );
      },
    },
  ];

  return (
    <DataTableEstandar
      idAccessor="id_proveedor"
      records={proveedores}
      loading={loading}
      columns={columnas}
    />
  );
};