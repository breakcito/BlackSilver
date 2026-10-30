import {
  ActionIcon,
  Badge,
  Group,
  Menu,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconBuilding,
  IconUser,
  IconBuildingBank,
  IconBuildingWarehouse,
  IconCash,
  IconDotsVertical,
  IconMail,
  IconPencil,
  IconPhone,
  IconHistory,
  IconTrash,
} from "@tabler/icons-react";
import { DataTableEstandar } from "../../../../../presentation/utils/datatable-estandar";
import { formatMontoPEN } from "../../../../../shared/functions/format-monto-pen";
import type { ClienteResponse } from "../../../service/clientes.responses";

interface Props {
  clientes: ClienteResponse[];
  loading: boolean;
  modoCarbon?: boolean;
  onOpenCuentas: (cliente: ClienteResponse) => void;
  onOpenAlmacenesCarbon?: (cliente: ClienteResponse) => void;
  /**
   * Abre la gestion de anticipos recibidos del cliente. Solo se ofrece en
   * el flujo de carbon: los anticipos son del modulo carbon.
   */
  onOpenAnticipos?: (cliente: ClienteResponse) => void;
  onEdit: (cliente: ClienteResponse) => void;
  onHistory: (cliente: ClienteResponse) => void;
  onDelete: (cliente: ClienteResponse) => void;
  deletingId: number | null;
}

export const Cliente = ({
  clientes,
  loading,
  modoCarbon = false,
  onOpenCuentas,
  onOpenAlmacenesCarbon,
  onOpenAnticipos,
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
        ...(modoCarbon
          ? [
              {
                accessor: "cantidad_almacenes_carbon" as const,
                title: "Almacenes",
                width: 160,
                textAlign: "center" as const,
                render: (r: ClienteResponse) => (
                  <Group gap="xs" justify="center" wrap="nowrap">
                    <Badge
                      color={r.cantidad_almacenes_carbon > 0 ? "teal" : "gray"}
                      variant="light"
                      size="sm"
                      radius="xl"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {r.cantidad_almacenes_carbon === 1
                        ? "1 almacen"
                        : `${r.cantidad_almacenes_carbon} almacenes`}
                    </Badge>
                    {onOpenAlmacenesCarbon && (
                      <Tooltip
                        label="Asignar almacenes de carbon"
                        withArrow
                        position="left"
                      >
                        <ActionIcon
                          variant="subtle"
                          color="teal"
                          radius="xl"
                          size="sm"
                          onClick={() => onOpenAlmacenesCarbon(r)}
                        >
                          <IconBuildingWarehouse size={16} stroke={1.5} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                ),
              },
              {
                accessor: "cantidad_anticipos" as const,
                title: "Anticipos",
                width: 190,
                textAlign: "center" as const,
                render: (r: ClienteResponse) => {
                  const n = r.cantidad_anticipos ?? 0;
                  const total = r.suma_saldo_anticipos ?? 0;
                  return (
                    <Group gap="xs" justify="center" wrap="nowrap">
                      <Stack gap={6} align="center">
                        {n > 0 ? (
                          <Badge
                            color="indigo"
                            variant="light"
                            size="sm"
                            radius="xl"
                            style={{ whiteSpace: "nowrap" }}
                          >
                            {n} anticipo{n === 1 ? "" : "s"}
                          </Badge>
                        ) : (
                          <Badge
                            color="gray"
                            variant="light"
                            size="sm"
                            radius="xl"
                            style={{ whiteSpace: "nowrap" }}
                          >
                            Sin anticipos
                          </Badge>
                        )}
                        <Badge
                          color={n > 0 ? "teal" : "gray"}
                          variant="light"
                          size="sm"
                          radius="xl"
                          style={{ whiteSpace: "nowrap" }}
                        >
                          {formatMontoPEN(total)}
                        </Badge>
                      </Stack>
                      {onOpenAnticipos && (
                        <Tooltip
                          label="Gestionar anticipos"
                          withArrow
                          position="left"
                        >
                          <ActionIcon
                            variant="subtle"
                            color="indigo"
                            radius="xl"
                            size="sm"
                            onClick={() => onOpenAnticipos(r)}
                          >
                            <IconCash size={16} stroke={1.5} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  );
                },
              },
            ]
          : []),
        {
          accessor: "direccion",
          title: "Dirección",
          width: 220,
          textAlign: "center",
          render: (r: ClienteResponse) => (
            // `lineClamp={2}` deja que la direccion se reparta en dos
            // lineas ("Hola soy / la calle") en vez de desbordar la
            // celda, y recorta con "..." cuando es mas larga. El tooltip
            // conserva la direccion completa para poder leerla entera.
            <Tooltip
              label={r.direccion || "—"}
              withArrow
              multiline
              w={300}
              disabled={!r.direccion}
            >
              <Text
                size="sm"
                className="text-zinc-400 text-center mx-2"
                lineClamp={2}
              >
                {r.direccion || "—"}
              </Text>
            </Tooltip>
          ),
        },
        {
          accessor: "contacto",
          title: "Contacto",
          width: 150,
          textAlign: "center",
          render: (r: ClienteResponse) => (
            <Stack gap={2}>
              {r.correo && (
                <Group gap={4} justify="center">
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
                <Group gap={4} justify="center">
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
                  -
                </Text>
              )}
            </Stack>
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
