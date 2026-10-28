import { useState } from "react";
import {
  Stack,
  Group,
  Text,
  Badge,
  Collapse,
  UnstyledButton,
} from "@mantine/core";
import {
  ClockIcon,
  UserCircleIcon,
  ChevronDownIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import type { RES_CambiosLog } from "../../service/responses/_generic/cambios-log";
import { parseCambiosLog } from "./parse-cambios-log";

/**
 * ============================================================
 * CambiosLogHistorial
 * ============================================================
 *
 * Componente **genérico y reutilizable** para visualizar el historial
 * de cambios (cambios_log) de cualquier módulo del sistema.
 *
 * Props de entrada: solo `cambiosLog` (que puede llegar como array
 * o como JSON string). Componente se encarga del parseo defensivo
 * y de la presentación.
 *
 * ## Uso básico
 * ```tsx
 * <CambiosLogHistorial
 *   cambiosLog={contrato.cambios_log}
 *   titulo="Historial de Adendas"
 * />
 * ```
 *
 * ## Uso en otros módulos
 * ```tsx
 * // En un préstamo, por ejemplo:
 * <CambiosLogHistorial
 *   cambiosLog={prestamo.cambios_log}
 *   titulo="Historial de Modificaciones"
 * />
 * ```
 *
 * ## Estado colapsado
 * Por defecto cada adenda/cambio se muestra **colapsada** mostrando:
 * `# + Modificado por + Fecha`.
 *
 * Al hacer click se expande mostrando el **motivo destacado** en un
 * bloque con acento indigo y la tabla de Campos modificados
 * (anterior → nuevo).
 *
 * ## Compatibilidad
 * - Acepta `unknown` para tolerar JSON strings desde la API.
 * - Si `logs.length === 0`, no renderiza nada (return null).
 * - El padre es responsable de decidir qué mostrar cuando está vacío.
 */

// ─── Sub-componente: una sola entrada de cambio (adenda/edición) ──────────────

/** Fecha del log. Si no hay fecha o no es valida, se muestra un guion. */
const fechaLog = (valor: string | null | undefined): string => {
  if (!valor) return "-";
  const d = dayjs(valor);
  return d.isValid() ? d.format("DD/MM/YYYY [·] HH:mm") : "-";
};

interface EntradaCambioProps {
  log: RES_CambiosLog;
  index: number;
  defaultExpanded?: boolean;
}

const EntradaCambio = ({
  log,
  index,
  defaultExpanded = false,
}: EntradaCambioProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const cambios = log.cambios ?? [];

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden transition-all duration-200 ease-out ${
        expanded
          ? "border-indigo-500/40 bg-indigo-500/[0.04] shadow-lg shadow-indigo-950/20 ring-1 ring-indigo-500/10"
          : "border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700/70 hover:bg-zinc-900/50 hover:shadow-md hover:shadow-black/30"
      }`}
    >
      {/* Borde lateral indicador de estado */}
      <div
        className={`absolute top-0 left-0 bottom-0 w-[3px] transition-colors duration-200 ${
          expanded ? "bg-indigo-400/70" : "bg-zinc-700/40"
        }`}
      />

      <UnstyledButton
        className="w-full text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3 py-3 pl-4 pr-3">
          {/* Numero de la entrada */}
          <div
            className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black border transition-colors duration-200 ${
              expanded
                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                : "bg-zinc-800/60 border-zinc-700/40 text-zinc-400"
            }`}
          >
            {index + 1}
          </div>

          {/* Contenido: 1ra fila (user + fecha) + 2da fila (motivo) */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
              <Group gap={4} wrap="nowrap" className="min-w-0">
                <UserCircleIcon
                  className={`w-3.5 h-3.5 shrink-0 transition-colors duration-200 ${
                    expanded ? "text-indigo-400" : "text-zinc-500"
                  }`}
                />
                <Text
                  size="xs"
                  fw={700}
                  className={`truncate transition-colors duration-200 ${
                    expanded ? "text-indigo-300" : "text-zinc-300"
                  }`}
                >
                  {log.nombre_empleado ?? "Sistema"}
                </Text>
              </Group>

              <Group gap={4} wrap="nowrap">
                <ClockIcon className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                <Text size="xs" className="text-zinc-500 font-mono">
                  {fechaLog(log.update_at)}
                </Text>
              </Group>

              {!expanded && cambios.length > 0 && (
                <Badge
                  variant="dot"
                  color="indigo"
                  size="xs"
                  radius="sm"
                  className="font-bold"
                >
                  {cambios.length} {cambios.length === 1 ? "cambio" : "cambios"}
                </Badge>
              )}
            </div>
          </div>

          {/* Chevron rotatorio */}
          <div
            className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
              expanded
                ? "bg-indigo-500/20 text-indigo-300 rotate-0"
                : "bg-zinc-800/50 text-zinc-500 rotate-0"
            }`}
          >
            <ChevronDownIcon
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                expanded ? "rotate-180" : "rotate-0"
              }`}
            />
          </div>
        </div>
      </UnstyledButton>

      <Collapse in={expanded} transitionDuration={250}>
        <div className="px-4 pb-4">
          {/* Motivo destacado arriba del detalle, cuando aplica */}
          {log.motivo && (
            <div
              className="ml-7 mb-3 mt-1 px-3 py-2 rounded-lg border border-indigo-500/20
                bg-indigo-500/[0.06] text-zinc-300 text-xs italic leading-relaxed"
            >
              <span className="text-indigo-400 font-bold not-italic mr-1.5">
                Motivo:
              </span>
              {log.motivo}
            </div>
          )}

          <div className="ml-7 border-t border-zinc-800/40 pt-3">
            {cambios.length === 0 ? (
              <Text size="xs" c="dimmed" className="italic">
                Sin detalle de campos modificados.
              </Text>
            ) : (
              <div className="space-y-1.5">
                {/* Header de la tabla */}
                <div className="grid grid-cols-12 gap-2 px-2 mb-2">
                  <Text
                    size="9px"
                    fw={800}
                    c="zinc.5"
                    className="uppercase tracking-widest col-span-4"
                  >
                    Campo
                  </Text>
                  <Text
                    size="9px"
                    fw={800}
                    c="zinc.5"
                    className="uppercase tracking-widest col-span-4"
                  >
                    Anterior
                  </Text>
                  <Text
                    size="9px"
                    fw={800}
                    c="zinc.5"
                    className="uppercase tracking-widest col-span-4"
                  >
                    Nuevo
                  </Text>
                </div>

                {cambios.map((chg, cIdx) => {
                  const campoLabel = chg.campo ?? chg.campo_bd ?? "—";
                  const anterior = String(chg.valor_anterior ?? "—");
                  const nuevo = String(chg.valor_nuevo ?? "—");
                  return (
                    <div
                      key={cIdx}
                      className="grid grid-cols-12 gap-2 items-center px-2 py-2 rounded-lg
                        bg-zinc-950/40 border border-zinc-800/30
                        hover:bg-zinc-900/60 hover:border-zinc-700/50 transition-colors"
                    >
                      <Text
                        size="xs"
                        fw={700}
                        className="text-zinc-300 truncate col-span-4"
                        title={campoLabel}
                      >
                        {campoLabel}
                      </Text>
                      <Text
                        size="xs"
                        className="text-red-400/80 line-through font-mono truncate col-span-4"
                        title={anterior}
                      >
                        {anterior}
                      </Text>
                      <Text
                        size="xs"
                        className="text-emerald-400 font-bold font-mono truncate col-span-4"
                        title={nuevo}
                      >
                        {nuevo}
                      </Text>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Collapse>
    </div>
  );
};

// ─── Componente principal ──────────────────────────────────────────────────────

export interface CambiosLogHistorialProps {
  /** Array o JSON string. Se acepta `unknown` para máxima flexibilidad. */
  cambiosLog: unknown;
  /** Título del listado. Ej: "Historial de Adendas", "Historial de Cambios". */
  titulo?: string;
  /** Si true, abre automáticamente la entrada más reciente. Default: false. */
  primeraExpandida?: boolean;
  /** Clase extra opcional para el wrapper. */
  className?: string;
}

/**
 * Renderiza el historial de cambios como una lista de cards colapsables.
 *
 * - Si `cambiosLog` está vacío, retorna `null` (no renderiza nada).
 * - Cada entrada es colapsable individualmente.
 * - El diseño es **agnóstico al módulo**: solo necesitas pasar el array
 *   de `RES_CambiosLog` y un título opcional.
 */
export const CambiosLogHistorial = ({
  cambiosLog,
  titulo = "Historial de Modificaciones",
  primeraExpandida = false,
  className = "",
}: CambiosLogHistorialProps) => {
  const logs = parseCambiosLog(cambiosLog);
  if (logs.length === 0) return null;

  return (
    <div className={className}>
      <Group gap="xs" mb="sm" align="center">
        <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <PencilSquareIcon className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <Text
          size="xs"
          fw={800}
          className="text-zinc-400 uppercase tracking-widest"
        >
          {titulo}
        </Text>
        <Badge
          variant="light"
          color="indigo"
          size="xs"
          radius="sm"
          className="font-bold ml-0.5"
        >
          {logs.length}
        </Badge>
      </Group>

      <Stack gap="xs">
        {logs.map((log, idx) => (
          <EntradaCambio
            key={`${log.update_at}-${idx}`}
            log={log}
            index={idx}
            defaultExpanded={primeraExpandida && idx === 0}
          />
        ))}
      </Stack>
    </div>
  );
};
