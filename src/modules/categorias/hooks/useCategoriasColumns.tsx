import { useCallback } from "react";
import { ActionIcon, Badge, Menu, Tooltip } from "@mantine/core";
import {
  TruckIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ArrowPathIcon,
  EllipsisVerticalIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { type DataTableColumn } from "mantine-datatable";
import type { RES_CategoriaResumen } from "../service/categorias.responses";
import { TipoBien } from "../../../shared/enums/_generic/tipo-bien";

interface UseCategoriasColumnsProps {
  onEditar: (categoria: RES_CategoriaResumen) => void;
  onEliminar: (categoria: RES_CategoriaResumen) => void;
  eliminandoId: number | null;
}

export const useCategoriasColumns = ({
  onEditar,
  onEliminar,
  eliminandoId,
}: UseCategoriasColumnsProps) => {
  const getColumns =
    useCallback((): DataTableColumn<RES_CategoriaResumen>[] => {
      return [
        {
          accessor: "index",
          title: "#",
          textAlign: "center",
          width: 60,
        },
        {
          accessor: "nombre",
          title: "Nombre",
          width: 250,
          render: (cat: RES_CategoriaResumen) => (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">
                {cat.nombre}
              </span>
              {cat.es_auditable === true && (
                <Badge
                  variant="light"
                  color="red"
                  size="xs"
                  radius="sm"
                  className="font-bold border border-red-500/20 shrink-0"
                >
                  Auditable
                </Badge>
              )}
            </div>
          ),
        },
        {
          accessor: "descripcion",
          title: "Descripción",
          width: 200,
          render: (cat: RES_CategoriaResumen) => (
            <span className="text-xs text-zinc-500 line-clamp-1">
              {cat.descripcion || "Sin descripción"}
            </span>
          ),
        },
        // {
        //   accessor: "para_mina",
        //   title: "Destino de Uso",
        //   textAlign: "center",
        //   width: 160,
        //   render: (cat: RES_CategoriaResumen) => (
        //     <div className="flex items-center justify-center gap-1.5">
        //       {!!cat.para_mina && (
        //         <Badge
        //           variant="light"
        //           color="blue"
        //           size="xs"
        //           radius="sm"
        //           className="font-bold border border-blue-500/20"
        //         >
        //           Mina
        //         </Badge>
        //       )}
        //       {!!cat.para_cocina && (
        //         <Badge
        //           variant="light"
        //           color="orange"
        //           size="xs"
        //           radius="sm"
        //           className="font-bold border border-orange-500/20"
        //         >
        //           Cocina
        //         </Badge>
        //       )}
        //       {!cat.para_mina && !cat.para_cocina && (
        //         <span className="text-xs text-zinc-600 font-medium">—</span>
        //       )}
        //     </div>
        //   ),
        // },
        {
          accessor: "control_por_odometro",
          title: "Controles",
          width: 180,
          textAlign: "center",
          render: (cat: RES_CategoriaResumen) => {
            const hasControls =
              cat.para_transporte ||
              cat.control_por_odometro ||
              cat.control_por_horometro ||
              cat.control_por_vueltas;

            if (!hasControls) {
              if (cat.clasificacion_bien == TipoBien.ActivoFijo) {
                return (
                  <span className="text-xs text-zinc-600 font-medium">—</span>
                );
              }

              return (
                <span className="text-xs text-zinc-600 font-medium italic">
                  No Aplica
                </span>
              );
            }

            return (
              <div className="flex items-center gap-1.5 justify-center">
                {!!cat.para_transporte && (
                  <Tooltip
                    label="Transporte / Vehículo"
                    position="top"
                    withArrow
                  >
                    <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm transition-all hover:scale-105">
                      <TruckIcon className="w-3.5 h-3.5" />
                    </div>
                  </Tooltip>
                )}
                {!!cat.control_por_odometro && (
                  <Tooltip
                    label="Control por Odómetro (KM)"
                    position="top"
                    withArrow
                  >
                    <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm transition-all hover:scale-105">
                      <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                    </div>
                  </Tooltip>
                )}
                {!!cat.control_por_horometro && (
                  <Tooltip
                    label="Control por Horómetro (Horas)"
                    position="top"
                    withArrow
                  >
                    <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-sm transition-all hover:scale-105">
                      <ClockIcon className="w-3.5 h-3.5" />
                    </div>
                  </Tooltip>
                )}
                {!!cat.control_por_vueltas && (
                  <Tooltip label="Control por Vueltas" position="top" withArrow>
                    <div className="w-6 h-6 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-sm transition-all hover:scale-105">
                      <ArrowPathIcon className="w-3.5 h-3.5" />
                    </div>
                  </Tooltip>
                )}
              </div>
            );
          },
        },
        {
          accessor: "es_consumible",
          title: "Consumible",
          textAlign: "center",
          width: 120,
          render: (cat: RES_CategoriaResumen) => (
            <Badge
              color={cat.es_consumible ? "indigo" : "gray"}
              variant={cat.es_consumible ? "light" : "outline"}
              size="xs"
              radius="sm"
            >
              {cat.es_consumible ? "SÍ" : "NO"}
            </Badge>
          ),
        },
        {
          accessor: "estado",
          title: "Estado",
          width: 100,
          textAlign: "center",
          render: (cat: RES_CategoriaResumen) => (
            <Badge
              color={cat.estado === "Activo" ? "teal.9" : "gray.9"}
              variant="filled"
              size="xs"
              radius="sm"
              className="font-black border border-zinc-800 shadow-md mx-auto"
            >
              {cat.estado.toUpperCase()}
            </Badge>
          ),
        },
        {
          accessor: "acciones",
          title: "",
          width: 70,
          textAlign: "right",
          render: (cat: RES_CategoriaResumen) => {
            const estaEliminando = eliminandoId === cat.id_categoria;
            return (
              <Menu shadow="md" width={170} position="bottom-end" withArrow>
                <Menu.Target>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    loading={estaEliminando}
                    aria-label="Abrir acciones de la categoría"
                  >
                    <EllipsisVerticalIcon className="w-5 h-5" />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown className="bg-zinc-900 border-zinc-800">
                  <Menu.Label className="text-zinc-500">Acciones</Menu.Label>
                  <Menu.Item
                    leftSection={<PencilSquareIcon className="w-4 h-4" />}
                    onClick={() => onEditar(cat)}
                    className="text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  >
                    Editar
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<TrashIcon className="w-4 h-4" />}
                    color="red"
                    onClick={() => onEliminar(cat)}
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
    }, [onEditar, onEliminar, eliminandoId]);

  return { getColumns };
};
