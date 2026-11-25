import { Text } from "@mantine/core";

import type { ITonoDashboard } from "../dashboard-paleta";

/**
 * Barra de proporcion.
 *
 * La referencia (maximo) la define quien la usa: las barras de un bloque son
 * comparables entre si, nunca entre bloques distintos.
 */
export const DashboardBarra = ({
  valor,
  maximo,
  tono,
  alto = "h-1.5",
}: {
  valor: number;
  maximo: number;
  tono: ITonoDashboard;
  alto?: string;
}) => {
  const porcentaje =
    maximo > 0 ? Math.min(100, Math.max(0, (valor / maximo) * 100)) : 0;

  return (
    <div className={`w-full overflow-hidden rounded-full bg-zinc-800 ${alto}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${tono.barra}`}
        style={{ width: `${porcentaje}%` }}
      />
    </div>
  );
};

/**
 * Estado vacio de un bloque.
 *
 * Escribir lo que falta es mejor que dejar la caja en blanco: el usuario
 * sabe que no hay datos y por que.
 */
export const DashboardVacio = ({ texto }: { texto: string }) => (
  <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center">
    <Text size="xs" className="text-zinc-500">
      {texto}
    </Text>
  </div>
);

/**
 * Etiqueta pequena con el valor al lado.
 */
export const DashboardDato = ({
  etiqueta,
  valor,
  tono,
}: {
  etiqueta: string;
  valor: string;
  tono?: ITonoDashboard;
}) => (
  <div className="min-w-0">
    <Text size="9px" fw={700} className="uppercase tracking-wider text-zinc-500">
      {etiqueta}
    </Text>
    <Text
      size="sm"
      fw={700}
      className={`mt-0.5 truncate tabular-nums ${tono ? tono.texto : "text-zinc-200"}`}
    >
      {valor}
    </Text>
  </div>
);
