import { useEffect, useMemo, useState } from "react";
import { Badge, Group, Pagination, Text } from "@mantine/core";

import { BalanceTipo } from "../../../../shared/enums/balances/balances";
import { formatearMonto } from "../balances-calculos";
import type { RES_MovimientoBalance } from "../../service/balances.responses";

interface Props {
  movimientos: RES_MovimientoBalance[];
  loading: boolean;
  /** Etiqueta legible del origen, indexada por su valor. */
  etiquetas: Map<string, string>;
}

/** Movimientos por pagina: tres columnas de cuatro filas. */
const POR_PAGINA = 12;

/**
 * Ficha de un movimiento.
 *
 * En una tabla los movimientos quedan dispersos en una fila muy ancha y hay
 * que seguir la linea con la vista. Como ficha, la informacion esta junta:
 * fecha, monto, categoria, descripcion y referencia se leen de un vistazo.
 */
const Ficha = ({
  movimiento,
  etiquetaCategoria,
}: {
  movimiento: RES_MovimientoBalance;
  etiquetaCategoria: string;
}) => {
  const esIngreso = movimiento.tipo === BalanceTipo.Ingreso;

  return (
    <div className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/80">
      {/* Fecha y monto */}
      <div className="flex items-baseline justify-between gap-2">
        <Group gap={"xs"}>
          <Text size="xs" fw={600} className="text-zinc-200 tabular-nums">
            {dayjsCorto(movimiento.fecha)}
          </Text>
          <Badge
            size="sm"
            radius="sm"
            variant="light"
            color={movimiento.ambito === "MINERAL" ? "indigo" : "cyan"}
            className="shrink-0"
          >
            {etiquetaCategoria}
          </Badge>
          {/* Categoria y referencia */}
          {movimiento.referencia && (
            <Text size="xs" className="text-zinc-200 truncate" fw={700}>
              <span className="text-zinc-400 font-medium">Ref. :</span>{" "}
              {movimiento.referencia}
            </Text>
          )}
        </Group>
        <Text
          size="sm"
          fw={800}
          className={`tabular-nums leading-none ${
            esIngreso ? "text-teal-400" : "text-red-400"
          }`}
        >
          {esIngreso ? "+" : "−"}
          {formatearMonto(movimiento.moneda, Math.abs(movimiento.monto))}
        </Text>
      </div>

      {/* Descripcion y detalle */}
      <Text size="xs" fw={600} className="mt-2 text-zinc-100 leading-snug">
        {movimiento.descripcion || "—"}
      </Text>
      {movimiento.detalle && (
        <Text size="xs" className="mt-0.5 text-zinc-300 leading-snug italic">
          {movimiento.detalle}
        </Text>
      )}
    </div>
  );
};

/** "07 nov 26" */
const dayjsCorto = (fecha: string): string => {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return fecha;
  const meses = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  return `${String(d.getDate()).padStart(2, "0")} ${meses[d.getMonth()]} ${String(
    d.getFullYear(),
  ).slice(2)}`;
};

/**
 * Lista de movimientos del periodo, en dos columnas.
 *
 * Cada movimiento es una ficha. En dos columnas las fichas llenan el ancho
 * de la pantalla y se leen de arriba hacia abajo, como una lista, sin el
 * costo de una tabla muy ancha.
 */
export const BalancesListaMovimientos = ({
  movimientos,
  loading,
  etiquetas,
}: Props) => {
  const [pagina, setPagina] = useState(1);

  const totalPaginas = Math.max(1, Math.ceil(movimientos.length / POR_PAGINA));

  // Si el filtro deja menos paginas, se vuelve a la primera.
  useEffect(() => {
    setPagina(1);
  }, [movimientos]);

  const visibles = useMemo(() => {
    const desde = (pagina - 1) * POR_PAGINA;
    return movimientos.slice(desde, desde + POR_PAGINA);
  }, [movimientos, pagina]);

  if (movimientos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 px-4 py-14 text-center">
        <Text size="xs" className="text-zinc-500">
          {loading
            ? "Cargando movimientos..."
            : "No hay movimientos que cumplan los filtros aplicados."}
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {visibles.map((m) => (
          <Ficha
            key={m.id_origen}
            movimiento={m}
            etiquetaCategoria={etiquetas.get(m.origen) ?? m.origen}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <Text size="xs" className="text-zinc-400 tabular-nums">
          {movimientos.length}{" "}
          {movimientos.length === 1 ? "movimiento" : "movimientos"}
          {totalPaginas > 1 && ` · página ${pagina} de ${totalPaginas}`}
        </Text>
        {totalPaginas > 1 && (
          <Pagination
            size="sm"
            radius="lg"
            value={pagina}
            onChange={setPagina}
            total={totalPaginas}
            siblings={1}
            getItemProps={(page) => ({
              "aria-label": `Página ${page}`,
            })}
          />
        )}
      </div>
    </div>
  );
};
