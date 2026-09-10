import { type DataTableColumn } from "mantine-datatable";
import { DataTableEstandar } from "../../../../presentation/utils/datatable-estandar";
import type { RES_ActivoFijoResumen } from "../../service/activos.responses";
import { ProductGroupHeader } from "./product-group-header";
import {
  Badge,
  Text,
  Group,
  Stack,
  Tooltip,
  ActionIcon,
  Menu,
} from "@mantine/core";
import {
  MapPinIcon,
  MapIcon,
  StarIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { formatNumber } from "../../../../shared/functions/formatNumber";

export interface GroupedActivoProducto {
  id_producto: number;
  producto: string;
  categoria: string | null;
  es_auditable: boolean;
  para_transporte: boolean;
  control_por_odometro: boolean;
  control_por_horometro: boolean;
  control_por_vueltas: boolean;
  activos: RES_ActivoFijoResumen[];
}

interface ProductGroupCardProps {
  product: GroupedActivoProducto;
  loading: boolean;
  onMoverActivo: (record: RES_ActivoFijoResumen) => void;
  onVerHistorial: (record: RES_ActivoFijoResumen) => void;
  onConfigurarAlertas: (record: RES_ActivoFijoResumen) => void;
  onResolverMantenimiento: (
    record: RES_ActivoFijoResumen,
    tipo: "horometro" | "odometro" | "vueltas",
  ) => void;
  onEditarActivo: (record: RES_ActivoFijoResumen) => void;
  onEliminarActivo: (record: RES_ActivoFijoResumen) => void;
  deletingId: number | null;
}

/**
 * Especificaciones son siempre `string[]` (estilo hashtags).
 * Solo filtramos strings vacíos por seguridad.
 */
const parseEspecificaciones = (raw: string[] | null | undefined): string[] => {
  if (!raw) return [];
  return raw.filter((s) => typeof s === "string" && s.trim() !== "");
};

export const ProductGroupCard = ({
  product,
  loading,
  //onMoverActivo,
  onConfigurarAlertas,
  onResolverMantenimiento,
  onEditarActivo,
  onVerHistorial,
  onEliminarActivo,
  deletingId,
}: ProductGroupCardProps) => {
  const columns: DataTableColumn<RES_ActivoFijoResumen>[] = [
    {
      accessor: "index",
      title: "#",
      textAlign: "center",
      width: 50,
    },
    {
      accessor: "correlativo",
      title: "Código",
      width: 140,
      render: (record) => (
        <Stack gap={1}>
          <Badge variant="light" color="indigo" size="sm" radius="sm" fw={700}>
            {record.correlativo}
          </Badge>
          {record.codigo && (
            <Text size="10px" c="dimmed" fw={600} className="ml-1">
              Cód: {record.codigo}
            </Text>
          )}
        </Stack>
      ),
    },
    {
      accessor: "marca_modelo",
      title: "Marca & Modelo",
      width: 180,
      render: (record) => (
        <Stack gap={1}>
          <Text size="xs" fw={700} c="white">
            {record.marca || "Genérica"} {record.modelo || "-"}
          </Text>
          <Text size="xs" c="dimmed">
            Año: {record.yearcito_modelo || "N/A"}{" "}
            {record.numero_serie ? `| S/N: ${record.numero_serie}` : ""}
          </Text>
        </Stack>
      ),
    },
    {
      accessor: "ubicacion",
      title: "Ubicación",
      width: 180,
      render: (record) => {
        const isMina = !!record.id_mina;
        const isAlmacen = !!record.id_almacen;
        const isLabor = !!record.id_labor;

        if (!isMina && !isAlmacen && !isLabor) {
          return (
            <Text size="xs" c="dimmed" fs="italic">
              Sin ubicación
            </Text>
          );
        }

        const iconBg = isMina
          ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
          : isLabor
            ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
            : "bg-teal-500/10 text-teal-400 border border-teal-500/20";

        const Icon = isMina ? MapIcon : isLabor ? MapPinIcon : MapPinIcon;

        const tipoLabel = isMina ? "Mina" : isLabor ? "Labor" : "Almacén";
        const nombre = record.mina || record.labor || record.almacen;

        return (
          <Group gap="xs" wrap="nowrap">
            <div className={`p-1.5 rounded-md ${iconBg}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <Stack gap={0}>
              <Group gap={4} wrap="nowrap">
                <Text
                  size="xs"
                  fw={700}
                  c="white"
                  className="truncate max-w-35"
                >
                  {nombre}
                </Text>
                {record.en_almacen_principal ? (
                  <Tooltip label="Almacén Principal">
                    <StarIcon className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" />
                  </Tooltip>
                ) : null}
              </Group>
              <Text
                size="10px"
                c="dimmed"
                className="uppercase font-bold tracking-wider"
              >
                {tipoLabel}
              </Text>
            </Stack>
          </Group>
        );
      },
    },
    {
      accessor: "empleado_responsable",
      title: "Responsable",
      textAlign: "center",
      width: 200,
      render: (record) => {
        if (!record.empleado_responsable) {
          return (
            <Text size="xs" c="dimmed" fs="italic">
              Sin asignar
            </Text>
          );
        }
        return (
          <Text size="xs" c="indigo.3" fw={650}>
            {record.empleado_responsable}
          </Text>
        );
      },
    },
    {
      accessor: "costo_compra",
      title: "Costo",
      textAlign: "center",
      width: 130,
      render: (record) => (
        <Text size="xs" fw={700} className="font-mono" c="teal.5">
          {record.costo_compra !== null && record.costo_compra !== undefined ? (
            `S/. ${formatNumber(record.costo_compra)}`
          ) : (
            <span className="text-zinc-500 italic">No reg.</span>
          )}
        </Text>
      ),
    },
    {
      accessor: "origen_compra",
      title: "Origen Compra",
      textAlign: "center",
      width: 180,
      render: (record) => {
        const tieneFactura =
          record.serie_factura_compra && record.numero_factura_compra;
        const tieneOC = record.id_orden_compra ? true : false;

        if (!tieneFactura && !tieneOC) {
          return (
            <Text size="xs" c="dimmed" fs="italic">
              Carga Manual
            </Text>
          );
        }

        return (
          <Group gap={6} wrap="nowrap" justify="center">
            <div className="p-1.5 bg-zinc-800/40 rounded-lg border border-zinc-700/30 flex items-center justify-center">
              <DocumentTextIcon className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="flex flex-col items-start gap-0.5">
              {tieneFactura ? (
                <Badge
                  size="sm"
                  variant="light"
                  color="cyan"
                  radius="sm"
                  className="font-bold border border-cyan-500/10 px-1"
                >
                  {record.serie_factura_compra}-{record.numero_factura_compra}
                </Badge>
              ) : null}
              {tieneOC ? (
                <Badge
                  size="xs"
                  variant="light"
                  color="cyan"
                  radius="sm"
                  className="font-bold border border-cyan-500/10 px-1 py-0"
                >
                  OC #{record.id_orden_compra}
                </Badge>
              ) : (
                <Text
                  size="9px"
                  c="orange"
                  fw={700}
                  className="uppercase tracking-wider"
                >
                  Sin O.C.
                </Text>
              )}
            </div>
          </Group>
        );
      },
    },
    {
      accessor: "especificaciones",
      title: "Especificaciones",
      render: (record) => {
        const specs = parseEspecificaciones(record.especificaciones);
        if (specs.length === 0) {
          return (
            <Text size="sm" c="dimmed">
              -
            </Text>
          );
        }
        return (
          <Group gap={4} wrap="wrap">
            {specs.map((tag, sIdx) => (
              <Badge
                key={sIdx}
                variant="light"
                color="blue"
                size="sm"
                radius="sm"
                classNames={{
                  root: "",
                }}
              >
                {tag}
              </Badge>
            ))}
          </Group>
        );
      },
    },
    {
      accessor: "control",
      title: "Control de Mantenimiento",
      width: 380,
      textAlign: "center",
      render: (record) => {
        const hasWarningH =
          record.proxima_advertencia_horas &&
          Number(record.total_horas) >=
            Number(record.proxima_advertencia_horas);
        const hasWarningKm =
          record.proxima_advertencia_kilometros &&
          Number(record.total_kilometros) >=
            Number(record.proxima_advertencia_kilometros);
        const hasWarningV =
          record.proxima_advertencia_vueltas &&
          Number(record.total_vueltas) >=
            Number(record.proxima_advertencia_vueltas);

        if (
          !product.control_por_horometro &&
          !product.control_por_odometro &&
          !product.control_por_vueltas
        ) {
          return (
            <Text size="xs" c="dimmed" fs="italic">
              No aplica
            </Text>
          );
        }

        const renderControlRow = (
          icon: React.ReactNode,
          actualVal: number,
          alertVal: number | null,
          hasWarning: boolean,
          unit: string,
          onResolve: () => void,
        ) => {
          return (
            <Group
              gap={8}
              wrap="nowrap"
              align="center"
              justify="center"
              className="w-full"
            >
              {/* Icon at left */}
              <div className="p-1.5 bg-zinc-850/60 rounded-xl border border-zinc-800/80 shrink-0 shadow-sm flex items-center justify-center">
                {icon}
              </div>

              {/* Content Group (mimics Costo Operativo) */}
              <Group gap="xs" wrap="nowrap" className="shrink-0">
                {/* Lectura Actual Block */}
                <div className="flex flex-col items-start gap-0.5 min-w-23.75">
                  <Text
                    size="8px"
                    fw={900}
                    className="text-zinc-500 uppercase tracking-widest leading-none"
                  >
                    Uso Actual
                  </Text>
                  <Badge
                    variant="light"
                    color="indigo"
                    radius="sm"
                    size="sm"
                    className="font-bold border border-indigo-500/10 px-1.5 mt-0.5"
                  >
                    {actualVal} {unit}
                  </Badge>
                </div>

                {/* Separator Divider */}
                <div className="w-px h-8 bg-zinc-800/80 self-center shrink-0" />

                {/* Limit Block */}
                <div className="flex flex-col items-start gap-0.5 min-w-30">
                  <Text
                    size="8px"
                    fw={900}
                    className="text-zinc-500 uppercase tracking-widest leading-none"
                  >
                    Mantenimiento
                  </Text>
                  {hasWarning ? (
                    <Badge
                      variant="filled"
                      color="red"
                      radius="sm"
                      size="sm"
                      onClick={onResolve}
                      className="font-bold px-1.5 mt-0.5 animate-pulse cursor-pointer border border-red-500/20"
                      style={{ cursor: "pointer" }}
                    >
                      Requiere Mantenimiento
                    </Badge>
                  ) : alertVal ? (
                    <Badge
                      variant="light"
                      color="pink"
                      radius="sm"
                      size="sm"
                      className="font-bold border border-pink-500/10 px-1.5 mt-0.5"
                    >
                      Próx: {alertVal} {unit}
                    </Badge>
                  ) : (
                    <Badge
                      variant="light"
                      color="zinc"
                      radius="sm"
                      size="sm"
                      className="font-bold border border-zinc-700/10 px-1.5 mt-0.5 text-zinc-400"
                    >
                      Sin Alerta
                    </Badge>
                  )}
                </div>
              </Group>
            </Group>
          );
        };

        return (
          <Stack gap={10} align="center" className="w-full">
            {product.control_por_horometro &&
              renderControlRow(
                <ClockIcon className="w-4 h-4 text-zinc-400" />,
                record.total_horas,
                record.proxima_advertencia_horas,
                !!hasWarningH,
                "h.",
                () => onResolverMantenimiento(record, "horometro"),
              )}
            {product.control_por_odometro &&
              renderControlRow(
                <ArrowTrendingUpIcon className="w-4 h-4 text-zinc-400" />,
                record.total_kilometros,
                record.proxima_advertencia_kilometros,
                !!hasWarningKm,
                "km",
                () => onResolverMantenimiento(record, "odometro"),
              )}
            {product.control_por_vueltas &&
              renderControlRow(
                <ArrowPathIcon className="w-4 h-4 text-zinc-400" />,
                record.total_vueltas,
                record.proxima_advertencia_vueltas,
                !!hasWarningV,
                "vueltas",
                () => onResolverMantenimiento(record, "vueltas"),
              )}
          </Stack>
        );
      },
    },
    {
      accessor: "estado",
      title: "Estado",
      textAlign: "center",
      width: 130,
      render: (record) => {
        const colors: Record<string, string> = {
          "En Uso": "green",
          "En Mantenimiento": "orange",
          "En Almacén": "teal",
          "Dado de Baja": "red",
        };
        return (
          <Badge
            variant="light"
            color={colors[record.estado] || "gray"}
            radius="sm"
            size="xs"
            fw={700}
          >
            {record.estado}
          </Badge>
        );
      },
    },
    {
      accessor: "acciones",
      title: "Acciones",
      width: 130,
      textAlign: "right",
      render: (record) => (
        <Group justify="flex-end" gap="xs" wrap="nowrap">
          <Tooltip label="Configurar alertas" withArrow>
            <ActionIcon
              variant="subtle"
              color="cyan"
              radius="xl"
              size="md"
              onClick={() => onConfigurarAlertas(record)}
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
            </ActionIcon>
          </Tooltip>
          <Menu shadow="md" width={210} position="bottom-end" withArrow>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="Más acciones del activo"
                title="Más acciones"
              >
                <EllipsisVerticalIcon className="w-5 h-5" />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown className="bg-zinc-900 border-zinc-800">
              <Menu.Label className="text-zinc-500">Acciones</Menu.Label>
              <Menu.Item
                leftSection={<PencilSquareIcon className="w-4 h-4" />}
                onClick={() => onEditarActivo(record)}
                className="text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Editar
              </Menu.Item>
              <Menu.Item
                leftSection={<EyeIcon className="w-4 h-4" />}
                onClick={() => onVerHistorial(record)}
                className="text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Ver historial
              </Menu.Item>
              <Menu.Divider className="border-zinc-800" />
              <Menu.Item
                leftSection={<TrashIcon className="w-4 h-4" />}
                color="red"
                onClick={() => onEliminarActivo(record)}
                disabled={deletingId === record.id_activo}
                className="hover:bg-red-900/20"
              >
                Eliminar
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      ),
    },
  ];

  return (
    <div className="bg-zinc-900/65 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-md">
      <ProductGroupHeader product={product} />

      <div className="relative shadow-inner">
        <DataTableEstandar
          idAccessor="id_activo"
          columns={columns}
          records={product.activos}
          loading={loading}
          initialPageSize={5}
          minHeight={0}
        />
      </div>
    </div>
  );
};
