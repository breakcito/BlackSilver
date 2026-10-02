import { Badge, Button, Group, Stack, Text } from "@mantine/core";
import {
  MapIcon,
  BoltIcon,
  FlagIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { useState, useMemo } from "react";
import dayjs from "dayjs";
import { type DataTableColumn } from "mantine-datatable";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { RegistroLabor } from "./registro-labor";
import { useLabores } from "../../hooks/labores/useLabores";
import type {
  RES_ResumenLabor,
  RES_ResumenMina,
} from "../../service/minas.responses";
import { FinalizarLaborModal } from "./components/FinalizarLaborModal";
import {
  EmpresaLaborGroup,
  type GroupedLaborEmpresa,
} from "./components/EmpresaLaborGroup";
import { EstadoBase } from "../../../../shared/enums/_generic/estado-base";

interface Props {
  mina: RES_ResumenMina;
  onLaborCreada?: (id_mina: number) => void;
  onLaborFinalizada?: (id_mina: number) => void;
  busqueda: string;
  setBusqueda: (v: string) => void;
  openCreate: () => void;
  openedCreate: boolean;
  closeCreate: () => void;
  onRecargarRef?: React.MutableRefObject<(() => void) | null>;
}

export const GestionLabores = ({
  mina,
  onLaborCreada,
  onLaborFinalizada,
  busqueda,
  openedCreate,
  closeCreate,
  onRecargarRef,
}: Props) => {
  const {
    laboresFiltradas,
    loading,
    recargar,
    handleLaborCreada,
    handleLaborFinalizada,
  } = useLabores({ idMina: mina.id_mina, busqueda, closeCreate });

  if (onRecargarRef) {
    onRecargarRef.current = recargar;
  }

  // Estado para finalizar labor
  const [laborAFinalizar, setLaborAFinalizar] =
    useState<RES_ResumenLabor | null>(null);

  const handleOpenFinalizar = (labor: RES_ResumenLabor) => {
    setLaborAFinalizar(labor);
  };

  const handleFinishSuccess = (laborActualizada: RES_ResumenLabor) => {
    handleLaborFinalizada(laborActualizada);
    if (onLaborFinalizada) onLaborFinalizada(mina.id_mina);
    setLaborAFinalizar(null);
  };

  // Lógica de agrupación por empresa
  const groupedLabores = useMemo(() => {
    const groups: Record<string, GroupedLaborEmpresa> = {};

    laboresFiltradas.forEach((l) => {
      const key = l.empresa || "Sin asignar";
      if (!groups[key]) {
        groups[key] = {
          empresa: key,
          labores: [],
          total_activas: 0,
        };
      }
      groups[key].labores.push(l);
      if (l.estado === "Activo") groups[key].total_activas++;
    });

    return Object.values(groups).sort((a, b) =>
      a.empresa.localeCompare(b.empresa),
    );
  }, [laboresFiltradas]);

  const columns: DataTableColumn<RES_ResumenLabor>[] = [
    {
      accessor: "index",
      title: "#",
      textAlign: "center",
      width: 50,
    },
    {
      accessor: "nombre",
      title: "Labor",
      width: 150,
      render: (r) => (
        <div className="flex flex-col gap-1.5 py-2">
          <Group gap="xs">
            <Text
              size="sm"
              fw={800}
              className="text-white tracking-tight leading-none mb-1"
            >
              {r.nombre}
            </Text>
            <Badge color="pink" variant="light" size="xs" radius="sm">
              {r.prefijo}
            </Badge>
          </Group>

          {/* Detalles técnicos mejorados y más grandes */}
          {(r.veta || r.nivel || r.ancho || r.alto) && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 bg-zinc-950/30 p-2 rounded-xl border border-zinc-800/50 w-fit">
              {r.veta && (
                <div className="flex items-center gap-1.5">
                  <MapIcon className="size-3 text-zinc-500" />
                  <Text size="11px" fw={700} className="text-zinc-400">
                    Veta: <span className="text-zinc-200">{r.veta}</span>
                  </Text>
                </div>
              )}
              {r.nivel && (
                <div className="flex items-center gap-1.5">
                  <BoltIcon className="size-3 text-zinc-500" />
                  <Text size="11px" fw={700} className="text-zinc-400">
                    Nivel: <span className="text-zinc-200">{r.nivel}</span>
                  </Text>
                </div>
              )}
              {r.ancho && (
                <Text
                  size="11px"
                  fw={700}
                  className="text-emerald-500/80 pl-4.5"
                >
                  {r.ancho}m{" "}
                  <span className="text-zinc-600 font-medium">ancho</span>
                </Text>
              )}
              {r.alto && (
                <Text size="11px" fw={700} className="text-amber-500/80 pl-4.5">
                  {r.alto}m{" "}
                  <span className="text-zinc-600 font-medium">alto</span>
                </Text>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      accessor: "operacion",
      title: "Tipo / Operación",
      width: 150,
      render: (r) => (
        <div className="flex flex-row gap-3 py-2">
          <Badge
            variant="filled"
            color={r.tipo_labor ? "cyan.9" : "gray"}
            size="xs"
            className="font-black px-2 shadow-sm w-fit uppercase tracking-wider"
          >
            {r.tipo_labor || "No especificado"}
          </Badge>
          {r.es_de_produccion == true && (
            <Badge
              color="pink.7"
              size="xs"
              variant="filled"
              className="font-black px-2 shadow-sm w-fit tracking-wider"
            >
              PRODUCCIÓN
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessor: "fecha_inicio",
      title: "Período Operativo",
      textAlign: "left",
      width: 150,
      render: (r) => (
        <Group gap={8} wrap="nowrap" justify="flex-start">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Text size="11px" fw={600} className="text-zinc-500  w-12">
                Desde:
              </Text>
              <Text size="xs" fw={800} className="text-zinc-200">
                {r.fecha_inicio
                  ? dayjs(r.fecha_inicio).format("DD MMM YYYY")
                  : "—"}
              </Text>
            </div>
            <div className="flex items-center gap-1.5">
              <Text size="11px" fw={600} className="text-zinc-500 w-12">
                Cierre Estimado:
              </Text>
              <Text size="xs" fw={800} className="text-zinc-400">
                {r.fecha_fin_estimada
                  ? dayjs(r.fecha_fin_estimada).format("DD MMM YYYY")
                  : "—"}
              </Text>
            </div>
            {r.fecha_cierre && (
              <div className="flex items-center gap-1.5 mt-0.5 pt-0.5 border-t border-zinc-800/50">
                <Text
                  size="11px"
                  fw={600}
                  className="text-indigo-500  w-12 text-right"
                >
                  Cierre:
                </Text>
                <Text size="xs" fw={800} className="text-indigo-400">
                  {dayjs(r.fecha_cierre).format("DD MMM YYYY")}
                </Text>
              </div>
            )}
            {!r.fecha_cierre && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Text size="11px" fw={600} c="bluew" className=" w-12">
                  Estado:
                </Text>
                <Text size="xs" fw={800} className="italic" c={"teal"}>
                  En curso
                </Text>
              </div>
            )}
          </div>
        </Group>
      ),
    },
    {
      accessor: "acciones",
      title: "Acciones",
      textAlign: "center",
      width: 150,
      render: (r) => (
        <Group gap={6} justify="center" wrap="nowrap">
          {r.estado === EstadoBase.Activo && (
            <Button
              variant="light"
              color="indigo"
              size="compact-xs"
              radius="md"
              leftSection={<FlagIcon className="size-3.5" />}
              onClick={() => handleOpenFinalizar(r)}
              className="font-bold border border-indigo-500/10 hover:border-indigo-500/30 transition-all"
            >
              Finalizar
            </Button>
          )}
          {r.estado === EstadoBase.Inactivo && (
            <div className="flex items-center gap-1 text-emerald-500/80 bg-emerald-500/5 px-2 py-1 rounded-lg border border-emerald-500/10">
              <CheckCircleIcon className="size-4" />
              <Text size="10px" fw={900} className="uppercase tracking-widest">
                Finalizada
              </Text>
            </div>
          )}
        </Group>
      ),
    },
    {
      accessor: "estado",
      title: "Estado",
      textAlign: "center",
      width: 110,
      render: (r) => (
        <Badge
          color={r.estado === "Activo" ? "teal.9" : "zinc.7"}
          variant="filled"
          size="sm"
          radius="md"
          className="font-black border border-zinc-800/50 shadow-md"
        >
          {r.estado === "Activo" ? "ACTIVA" : "TERMINADA"}
        </Badge>
      ),
    },
  ];

  const handleLocalLaborCreada = (nueva: RES_ResumenLabor) => {
    handleLaborCreada(nueva);
    if (onLaborCreada) onLaborCreada(mina.id_mina);
  };

  return (
    <div className="space-y-5">
      <Stack gap="xl">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <div className="size-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <Text
              size="xs"
              fw={700}
              className="text-zinc-500 uppercase tracking-widest"
            >
              Cargando Labores...
            </Text>
          </div>
        ) : groupedLabores.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 border border-dashed border-zinc-800 rounded-4xl bg-zinc-900/10">
            <Text
              size="sm"
              fw={700}
              className="text-zinc-500 uppercase tracking-widest"
            >
              Sin labores registradas
            </Text>
          </div>
        ) : (
          groupedLabores.map((group) => (
            <EmpresaLaborGroup
              key={group.empresa}
              group={group}
              columns={columns}
              loading={loading}
            />
          ))
        )}
      </Stack>

      {/* Modal para Crear Labor */}
      <ModalEstandar
        opened={openedCreate}
        close={closeCreate}
        title="Registrar Labor"
        validateClose
        size="lg"
      >
        <RegistroLabor
          idMina={mina.id_mina}
          onSuccess={handleLocalLaborCreada}
          onCancel={closeCreate}
        />
      </ModalEstandar>

      {/* Modal para Finalizar Labor */}
      <FinalizarLaborModal
        labor={laborAFinalizar}
        onClose={() => setLaborAFinalizar(null)}
        onSuccess={handleFinishSuccess}
      />
    </div>
  );
};
