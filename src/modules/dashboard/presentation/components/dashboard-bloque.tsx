import type { ReactNode } from "react";
import { Text } from "@mantine/core";

import { TONOS, type ITonoDashboard } from "../dashboard-paleta";

/**
 * Que filtros mueven un bloque.
 *
 * - `periodo`: el bloque se mide sobre el mes elegido.
 * - `almacen`: el bloque respeta el almacen seleccionado.
 * - `estado`: el bloque es una foto del ahora y NO depende del periodo.
 */
export type TAlcance = "periodo" | "almacen" | "estado";

const ALCANCES: Record<TAlcance, { texto: string; tono: ITonoDashboard }> = {
  periodo: { texto: "Periodo", tono: TONOS.indigo },
  almacen: { texto: "Almacén", tono: TONOS.teal },
  estado: { texto: "Estado actual", tono: TONOS.gray },
};

interface Props {
  titulo: string;
  /** Filtros que afectan a este bloque. */
  alcances: TAlcance[];
  /** Texto de apoyo bajo el titulo. */
  descripcion?: string;
  /** Contador destacado a la derecha. */
  contador?: number | null;
  /** Tono del contador. */
  tono?: ITonoDashboard;
  loading?: boolean;
  /** Acciones a la derecha del encabezado. */
  acciones?: ReactNode;
  children: ReactNode;
}

/**
 * Contenedor de un indicador.
 *
 * Todos los bloques comparten la misma envoltura para que la pantalla se lea
 * como una sola pieza: mismo borde, mismo fondo, mismo encabezado.
 */
export const DashboardBloque = ({
  titulo,
  alcances,
  descripcion,
  contador,
  tono = TONOS.gray,
  loading = false,
  acciones,
  children,
}: Props) => (
  <section className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Text
            size="sm"
            fw={700}
            className="tracking-tight text-zinc-100"
          >
            {titulo}
          </Text>

          {alcances.map((alcance) => (
            <span
              key={alcance}
              className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${ALCANCES[alcance].tono.suave} ${ALCANCES[alcance].tono.texto}`}
            >
              {ALCANCES[alcance].texto}
            </span>
          ))}
        </div>

        {descripcion && (
          <Text size="xs" className="mt-1 text-zinc-400">
            {descripcion}
          </Text>
        )}
      </div>

      <div className="flex items-center gap-3">
        {acciones}

        {contador !== null && contador !== undefined && (
          <span
            className={`rounded-xl px-2.5 py-1 text-sm font-extrabold tabular-nums ${tono.suave} ${tono.texto}`}
          >
            {contador}
          </span>
        )}
      </div>
    </header>

    <div
      className={`flex-1 px-4 py-3 transition-opacity ${loading ? "opacity-40" : ""}`}
    >
      {children}
    </div>
  </section>
);
