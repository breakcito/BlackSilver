import { Text } from "@mantine/core";

import {
  TONOS,
  TONO_ATENCION,
  TONO_INGRESO,
  TONO_ROSA,
  type ITonoDashboard,
} from "../dashboard-paleta";
import { formatearMonto } from "../dashboard-calculos";
import type { RES_Dashboard } from "../../service/dashboard.responses";

interface Props {
  datos: RES_Dashboard;
  loading?: boolean;
}

/**
 * Ficha de un dato clave.
 *
 * La cifra manda y el contexto va debajo: el usuario debe leer el numero de
 * un vistazo y entenderlo sin revisar nada mas.
 */
const Kpi = ({
  titulo,
  tono,
  valor,
  detalle,
  pie,
}: {
  titulo: string;
  tono: ITonoDashboard;
  valor: string | number;
  detalle?: string;
  pie?: React.ReactNode;
}) => (
  <div className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
    <div className="flex items-start justify-between gap-2">
      <Text size="10px" fw={700} className="uppercase tracking-[0.16em] text-zinc-300">
        {titulo}
      </Text>
      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${tono.punto}`} />
    </div>

    <Text
      size="30px"
      fw={800}
      className={`mt-2 leading-none tabular-nums ${tono.texto}`}
    >
      {valor}
    </Text>

    {detalle && (
      <Text size="xs" className="mt-1.5 text-zinc-400">
        {detalle}
      </Text>
    )}

    {pie && <div className="mt-2.5">{pie}</div>}
  </div>
);

/** Chips del desglose de alertas. */
const Chip = ({ texto, tono }: { texto: string; tono: ITonoDashboard }) => (
  <span
    className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${tono.suave} ${tono.texto}`}
  >
    {texto}
  </span>
);

/**
 * Fila de cifras clave del dashboard.
 *
 * Las tres fichas son CONTEOS (no montos): soles y dolares no se suman
 * nunca, asi que el dinero vive en su propio bloque, el balance.
 *
 * Cada ficha es el resumen GENERAL de su indicador. Los bloques de abajo
 * desglosan el mismo dato y lo filtran: aqui se responde "cuanto hay", alla
 * "de donde".
 */
export const DashboardKpis = ({ datos, loading = false }: Props) => {
  const stock = datos.stock_critico.resumen;
  const mantenimiento = datos.mantenimiento_alertas.resumen;
  const cobros = datos.cobros_pendientes.resumen;

  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 ${
        loading ? "opacity-40" : ""
      } transition-opacity`}
    >
      <Kpi
        titulo="Stock critico"
        tono={stock.sin_stock > 0 ? TONOS.red : TONOS.yellow}
        valor={stock.total_items}
        detalle={`${stock.sin_stock} sin stock · ${stock.criticos} por debajo del minimo`}
        pie={
          <div className="flex flex-wrap gap-1.5">
            <Chip texto={`${stock.almacenes.length} almacenes`} tono={TONOS.gray} />
          </div>
        }
      />

      <Kpi
        titulo="Mantenimiento"
        tono={mantenimiento.vencidos > 0 ? TONOS.red : TONOS.yellow}
        valor={mantenimiento.vencidos + mantenimiento.criticos}
        detalle={`${mantenimiento.vencidos} vencidos · ${mantenimiento.criticos} criticos · ${mantenimiento.proximos} proximos`}
      />

      <Kpi
        titulo="Por cobrar"
        tono={TONO_ROSA}
        valor={cobros.total_comprobantes}
        detalle={
          cobros.total_comprobantes === 0
            ? "Sin comprobantes pendientes"
            : "Comprobantes emitidos y no cobrados"
        }
        pie={
          <div className="space-y-1">
            {cobros.por_moneda.length === 0 && (
              <Text size="xs" className="text-zinc-500">
                Sin saldo pendiente
              </Text>
            )}
            {cobros.por_moneda.map((moneda) => (
              <div key={moneda.moneda} className="flex items-center justify-between gap-2">
                <Text size="xs" className="text-zinc-400">
                  {moneda.moneda}
                </Text>
                <Text size="sm" fw={700} className={`tabular-nums ${TONO_INGRESO.texto}`}>
                  {formatearMonto(moneda.moneda, moneda.saldo)}
                </Text>
              </div>
            ))}
            {cobros.saldo_anticipos > 0 && (
              <div className="flex items-center justify-between gap-2 border-t border-zinc-800 pt-1">
                <Text size="xs" className="text-zinc-500">
                  Anticipos por aplicar
                </Text>
                <Text size="xs" fw={600} className={`tabular-nums ${TONO_ATENCION.texto}`}>
                  {formatearMonto("Soles", cobros.saldo_anticipos)}
                </Text>
              </div>
            )}
          </div>
        }
      />
    </div>
  );
};
