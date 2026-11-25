import {
  Badge,
  Button,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import type { DataTableColumn } from "mantine-datatable";
import { useMemo } from "react";
import { CurrencyDollarIcon } from "@heroicons/react/24/outline";

import { formatNumber } from "../../../../shared/functions/formatNumber";
import { DataTableEstandar } from "../../../../presentation/utils/datatable-estandar";

/** Resumen de gastos de un grupo (operacion agrupada). */
export interface ResumenGrupoGastos {
  id_grupo_gastos: number;
  /** Fecha de la operacion agrupada. */
  fecha_inicio?: string | null;
  /** Cantidad de gastos registrados. */
  gastos_cantidad: number;
  /** Suma de los totales de los gastos. */
  gastos_total: number | string;
  /** Gastos que aun no se han pagado. */
  gastos_pendientes: number | string;
}

interface Props<T> {
  /** Grupos con sus registros (cada grupo es un container). */
  grupos: ResumenGrupoGastos[];
  /** Registros que todavia no pertenecen a ninguna operacion agrupada. */
  sinAgrupar: T[];
  /** Columnas de la tabla (las mismas para todos los containers). */
  columns: DataTableColumn<T>[];
  loading: boolean;
  idAccessor: string;
  noRecordsText: string;
  /** Titulo del container de registros sin agrupar. */
  tituloSinAgrupar: string;
  /** Titulo de los containers de cada operacion agrupada. */
  tituloOperacion: string;
  selectedRecords: T[];
  onSelectedRecordsChange: (records: T[]) => void;
  /** Abre el modal con los gastos de la operacion. */
  onVerGastos: (idGrupo: number) => void;
  /** Contenido extra que se muestra arriba de todos los containers. */
  barraSeleccion?: React.ReactNode;
}

/**
 * Operaciones agrupadas por operacion.
 *
 * Cada grupo es un container: arriba una barra con la cantidad de gastos y el
 * total de esa operacion, abajo sus registros. Los registros que todavia no
 * pertenecen a ninguna operacion van al final, en su propio container (el
 * unico donde se pueden marcar para agrupar).
 */
export function OperacionesAgrupadas<
  T extends { id_grupo_gastos?: number | null },
>({
  grupos,
  sinAgrupar,
  columns,
  loading,
  idAccessor,
  noRecordsText,
  tituloSinAgrupar,
  tituloOperacion,
  selectedRecords,
  onSelectedRecordsChange,
  onVerGastos,
  barraSeleccion,
}: Props<T>) {
  /** Registros de cada grupo, segun su id_grupo_gastos. */
  const registrosPorGrupo = useMemo(() => {
    const mapa = new Map<number, T[]>();
    grupos.forEach((g) => mapa.set(g.id_grupo_gastos, []));
    sinAgrupar.forEach((r) => {
      const id = r.id_grupo_gastos;
      if (id && mapa.has(id)) {
        mapa.get(id)!.push(r);
      }
    });
    return mapa;
  }, [grupos, sinAgrupar]);

  return (
    <Stack gap="md">
      {barraSeleccion}

      {grupos.map((g) => (
        <Paper
          key={g.id_grupo_gastos}
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden"
        >
          {/* Barra de la operacion: cantidad de gastos y total */}
          <Group
            justify=""
            px="md"
            py="xs"
            wrap="nowrap"
            className="bg-zinc-900/80 border-b border-zinc-800"
          >
            {tituloOperacion && (
              <Text size="xs" fw={700} c="zinc.100">
                {tituloOperacion}
              </Text>
            )}

            <Group gap={6} wrap="nowrap">
              <Badge size="sm" variant="light" color="red" radius="xl">
                Total S/ {formatNumber(g.gastos_total)}
              </Badge>
              {Number(g.gastos_pendientes) > 0 && (
                <Badge size="sm" variant="light" color="yellow" radius="xl">
                  Pendiente S/ {formatNumber(g.gastos_pendientes)}
                </Badge>
              )}
              <Tooltip label="Ver los gastos de esta operación" withArrow>
                <Button
                  variant="light"
                  color="teal"
                  size="xs"
                  radius="md"
                  leftSection={<CurrencyDollarIcon className="w-3.5 h-3.5" />}
                  onClick={() => onVerGastos(g.id_grupo_gastos)}
                >
                  Gastos
                </Button>
              </Tooltip>
            </Group>
          </Group>

          {/* Los registros del grupo: sin paginacion ni checks, son pocos. */}
          <DataTableEstandar
            records={registrosPorGrupo.get(g.id_grupo_gastos) ?? []}
            columns={columns}
            idAccessor={idAccessor}
            loading={loading}
            noRecordsText={noRecordsText}
            minHeight={0}
            renderPagination={() => null}
          />
        </Paper>
      ))}

      {grupos.length > 0 && (
        <Divider orientation="horizontal" my={5} variant="dashed" />
      )}

      {/* Container final: las operaciones que aun no se agruparon */}
      <Paper className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <Group
          justify="space-between"
          px="md"
          py="xs"
          wrap="nowrap"
          className="bg-zinc-900/80 border-b border-zinc-800"
        >
          <Text size="xs" fw={700} c="zinc.100">
            {tituloSinAgrupar}
          </Text>
          <Badge size="xs" variant="light" color="zinc" radius="xl">
            {sinAgrupar.length} registro{sinAgrupar.length === 1 ? "" : "s"}
          </Badge>
        </Group>

        <DataTableEstandar
          records={sinAgrupar}
          columns={columns}
          idAccessor={idAccessor}
          loading={loading}
          noRecordsText={noRecordsText}
          selectionTrigger="checkbox"
          selectedRecords={selectedRecords}
          onSelectedRecordsChange={onSelectedRecordsChange}
        />
      </Paper>
    </Stack>
  );
}
