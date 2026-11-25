/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import {
  DataTable,
  type DataTableColumn,
  type DataTableColumnGroup,
} from "mantine-datatable";
import clsx from "clsx";
const generateUUID = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 9);

// Tipos flexibles: hacen `accessor` e `id` opcionales a nivel de API pública.
// El componente asigna UUIDs automáticamente cuando faltan.
type FlexibleColumn = Omit<DataTableColumn<any>, "accessor" | "id"> & {
  accessor?: DataTableColumn<any>["accessor"];
  id?: string;
};
type FlexibleGroup = Omit<DataTableColumnGroup<any>, "id"> & { id?: string };

interface DataTableEstandarProps {
  idAccessor?: string;
  columns: FlexibleColumn[];
  records: any[];
  initialPageSize?: number;
  loading: boolean;
  columnGroups?: FlexibleGroup[];
  [key: string]: any;
}

export const DataTableEstandar = ({
  idAccessor,
  columns,
  records,
  initialPageSize = 25,
  loading,
  columnGroups,
  ...props
}: DataTableEstandarProps) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [prevRecords, setPrevRecords] = useState(records);

  // Genera un idAccessor estable por instancia si el consumer no lo provee.
  // Por defecto usamos "id" (campo estándar en los responses del proyecto).
  // Caveat: si los records no tienen campo "id", el consumer DEBE pasar
  // idAccessor apuntando al campo real.
  const finalIdAccessor = idAccessor ?? "id";

  if (records !== prevRecords) {
    setPrevRecords(records);
    setPage(1);
  }

  // Aseguramos que cada record tenga una clave única para React y para
  // mantine-datatable (sino produce warning de "missing key").
  const recordsWithId = useMemo(() => {
    return records.map((r, idx) => ({
      ...r,
      [finalIdAccessor]: r[finalIdAccessor] ?? r.id ?? `row-${idx}`,
    }));
  }, [records, finalIdAccessor]);

  const pagedRecords = useMemo(() => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    return recordsWithId.slice(from, to);
  }, [recordsWithId, page, pageSize]);

  // Asigna accessor UUID a columnas que no lo tengan (estable por referencia de columns).
  // Las columnas con accessor ausente deben traer `render` propio: la librería no
  // puede mapear el record sin accessor y la celda quedaría vacía.
  const columnsWithAccessors = useMemo(
    () =>
      columns.map((col) =>
        col.accessor ? col : { ...col, accessor: `c-${generateUUID()}` },
      ),
    [columns],
  );

  // Aplica el render del `#` automático sobre las columnas con accessor "index".
  // Separado del memo anterior para que los UUIDs no se regeneren en cada cambio
  // de página.
  const enhancedColumns = useMemo(
    () =>
      columnsWithAccessors.map((col) => {
        if (col.accessor === "index") {
          return {
            ...col,
            id: col.id ?? `col-${generateUUID()}`,
            render: (_record: any, index: number) => {
              const absoluteIndex = (page - 1) * pageSize + index + 1;
              return col.render
                ? col.render(_record, absoluteIndex - 1)
                : absoluteIndex;
            },
          };
        }
        return { ...col, id: col.id ?? `col-${generateUUID()}` };
      }),
    [columnsWithAccessors, page, pageSize],
  );

  // Asigna id UUID a grupos (recursivo) que no lo tengan, estable por referencia.
  // El id solo se usa como React key del <th>, así que un UUID es válido.
  const enhancedGroups = useMemo(() => {
    if (!columnGroups || columnGroups.length === 0) return undefined;
    const enhance = (g: FlexibleGroup): DataTableColumnGroup<any> => ({
      ...g,
      id: g.id ?? `g-${generateUUID()}`,
      title: (
        <div className="flex items-center justify-center gap-2 px-2 py-1">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-100">
            {g.title}
          </span>
        </div>
      ),
      groups: g.groups?.map(enhance),
    });
    return columnGroups.map(enhance) as DataTableColumnGroup<any>[];
  }, [columnGroups]);

  const { minHeight = 300, ...otherProps } = props;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden backdrop-blur-sm">
      <DataTable
        columns={enhancedColumns as DataTableColumn<any>[]}
        groups={enhancedGroups as any}
        records={pagedRecords}
        totalRecords={records.length}
        recordsPerPage={pageSize}
        page={page}
        minHeight={minHeight}
        onPageChange={setPage}
        recordsPerPageOptions={[5, 10, 25, 50, 100]}
        onRecordsPerPageChange={setPageSize}
        striped={true}
        highlightOnHover={true}
        fetching={loading}
        idAccessor={finalIdAccessor}
        // Activa bordes verticales cuando hay grupos presentes
        withColumnBorders={Boolean(enhancedGroups)}
        noRecordsText="No se encontraron registros..."
        loadingText="Cargando..."
        paginationText={({ from, to, totalRecords }) =>
          `${from} - ${to} de ${totalRecords}`
        }
        scrollAreaProps={{
          viewportProps: {
            style: {
              minHeight: minHeight,
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
        classNames={{
          root: "bg-transparent",
          table: clsx(
            "bg-transparent",
            // Aplica el color del borde a todas las celdas cuando hay agrupación
            enhancedGroups && "[&_th]:!border-zinc-800 [&_td]:!border-zinc-800",
          ),
          header: clsx(
            "bg-zinc-900/80",
            enhancedGroups && ["[&_tr:not(:last-child)_th]:!bg-zinc-950"],
          ),
          pagination: "bg-zinc-900/50 border-t border-zinc-800",
        }}
        styles={{
          header: {
            "--mantine-color-text": "var(--mantine-color-zinc-3, #d4d4d8)",
          },
        }}
        {...otherProps}
      />
    </div>
  );
};
