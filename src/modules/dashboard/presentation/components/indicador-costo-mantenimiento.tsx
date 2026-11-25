import { Text } from "@mantine/core";

import {
  TONO_ATENCION,
  TONO_INGRESO,
  TONO_PRIMARIO,
} from "../dashboard-paleta";
import { formatearMonto } from "../dashboard-calculos";
import { DashboardVacio } from "./dashboard-ui";
import type { RES_CostoMantenimiento } from "../../service/dashboard.responses";

interface Props {
  costo: RES_CostoMantenimiento;
}

/**
 * Indicador 9: costo de mantenimiento y su composicion.
 *
 * El costo se muestra desglosado en sus tres partes: mano de obra, otros
 * gastos e insumos consumidos. Los insumos NO forman parte del costo que se
 * ve en el modulo Mantenimiento, asi que aqui aparece el costo real completo.
 */
export const IndicadorCostoMantenimiento = ({ costo }: Props) => {
  const resumen = costo.resumen;

  if (resumen.cantidad === 0) {
    return <DashboardVacio texto="Sin mantenimientos registrados en el periodo" />;
  }

  const partes = [
    {
      nombre: "Mano de obra",
      monto: resumen.costo_mano_obra,
      tono: TONO_INGRESO,
    },
    {
      nombre: "Otros gastos",
      monto: resumen.costo_otros_gastos,
      tono: TONO_ATENCION,
    },
    {
      nombre: "Insumos",
      monto: resumen.costo_insumos,
      tono: TONO_PRIMARIO,
    },
  ];

  const total = Math.max(
    1,
    resumen.costo_mano_obra + resumen.costo_otros_gastos + resumen.costo_insumos,
  );

  return (
    <div className="space-y-4">
      {/* Cifras */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <Text size="9px" fw={700} className="uppercase tracking-wider text-zinc-500">
            Costo total
          </Text>
          <Text size="xl" fw={800} className="tabular-nums text-zinc-100">
            {formatearMonto("Soles", resumen.costo_total)}
          </Text>
        </div>

        <div>
          <Text size="9px" fw={700} className="uppercase tracking-wider text-zinc-500">
            Mantenimientos
          </Text>
          <Text size="xl" fw={800} className="tabular-nums text-zinc-100">
            {resumen.cantidad}
          </Text>
        </div>

        <div>
          <Text size="9px" fw={700} className="uppercase tracking-wider text-zinc-500">
            Costo promedio
          </Text>
          <Text size="xl" fw={800} className="tabular-nums text-zinc-100">
            {formatearMonto("Soles", resumen.costo_promedio)}
          </Text>
        </div>

        <div>
          <Text size="9px" fw={700} className="uppercase tracking-wider text-zinc-500">
            Activos atendidos
          </Text>
          <Text size="xl" fw={800} className="tabular-nums text-zinc-100">
            {costo.por_activo.length}
          </Text>
        </div>
      </div>

      {/* Composicion */}
      <div className="space-y-2">
        <Text size="9px" fw={700} className="uppercase tracking-[0.14em] text-zinc-500">
          Composicion del costo
        </Text>

        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
          {partes.map((parte) =>
            parte.monto > 0 ? (
              <div
                key={parte.nombre}
                className={`h-full ${parte.tono.barra}`}
                style={{ width: `${(parte.monto / total) * 100}%` }}
                title={`${parte.nombre}: ${formatearMonto("Soles", parte.monto)}`}
              />
            ) : null,
          )}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          {partes.map((parte) => (
            <div key={parte.nombre} className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${parte.tono.punto}`} />
              <Text size="xs" className="text-zinc-400">
                {parte.nombre}
              </Text>
              <Text size="xs" fw={700} className="tabular-nums text-zinc-200">
                {formatearMonto("Soles", parte.monto)}
              </Text>
            </div>
          ))}
        </div>
      </div>

      {/* Activos que concentran el costo */}
      {costo.por_activo.length > 0 && (
        <div className="space-y-1.5 border-t border-zinc-800 pt-3">
          <Text size="9px" fw={700} className="uppercase tracking-[0.14em] text-zinc-500">
            Activos que concentran el costo
          </Text>

          {costo.por_activo.slice(0, 5).map((activo) => {
            const maximo = costo.por_activo[0]?.costo_total ?? 1;

            return (
              <div key={activo.id_activo_fijo}>
                <div className="flex items-baseline justify-between gap-2">
                  <Text size="xs" className="truncate text-zinc-300">
                    {activo.activo_producto}
                    {activo.activo_correlativo
                      ? ` · ${activo.activo_correlativo}`
                      : ""}
                  </Text>
                  <Text size="xs" fw={700} className="shrink-0 tabular-nums text-zinc-200">
                    {formatearMonto("Soles", activo.costo_total)}
                  </Text>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${TONO_PRIMARIO.barra}`}
                      style={{
                        width: `${Math.min(100, (activo.costo_total / maximo) * 100)}%`,
                      }}
                    />
                  </div>
                  <Text size="10px" className="shrink-0 tabular-nums text-zinc-600">
                    {activo.cantidad} intervencion
                    {activo.cantidad === 1 ? "" : "es"}
                  </Text>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
