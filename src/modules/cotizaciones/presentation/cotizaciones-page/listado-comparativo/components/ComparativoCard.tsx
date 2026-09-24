import {
  Paper,
  UnstyledButton,
  Group,
  Stack,
  Text,
  Badge,
  Button,
  Collapse,
  Divider,
  Tooltip,
} from "@mantine/core";
import dayjs from "dayjs";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentMagnifyingGlassIcon,
  CalendarDaysIcon,
  BuildingStorefrontIcon,
  TableCellsIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import type {
  RES_Comparativo,
  RES_Cotizacion,
} from "../../../../../../service/responses/cotizaciones/cotizacion";
import { CotizacionCard } from "./CotizacionCard";

interface ComparativoCardProps {
  comp: RES_Comparativo;
  isExpanded: boolean;
  onToggle: () => void;
  onVerComparativo: (id: number) => void;
  // Cotizacion handlers
  expandedCots: Record<number, boolean>;
  onToggleCot: (id: number) => void;
  onPrintCotizacion: (cot: RES_Cotizacion) => void;
  onPrintOC: (id: number) => void;
  onApprove: (id: number) => void;
  onEdit: (cot: RES_Cotizacion) => void;
  printingOCId: number | null;
  stateConfigs: Record<
    string,
    { color: string; label: string; variant: string }
  >;
}

export const ComparativoCard = ({
  comp,
  isExpanded,
  onToggle,
  onVerComparativo,
  expandedCots,
  onToggleCot,
  onPrintCotizacion,
  onPrintOC,
  onApprove,
  onEdit,
  printingOCId,
  stateConfigs,
}: ComparativoCardProps) => {
  const idComp = comp.id_comparativo;
  const cots = comp.cotizaciones;
  const fecha = comp.created_at;
  const tieneAprobada = cots.some((c) => c.estado === "Aprobada");

  return (
    <Paper
      radius="xl"
      className="bg-zinc-900/40 border border-zinc-800/80 transition-all overflow-hidden"
    >
      {/* ── CABECERA DEL COMPARATIVO ── */}
      <UnstyledButton component="div" className="w-full" onClick={onToggle}>
        <div className="px-5 py-4">
          <Group justify="space-between" wrap="nowrap">
            <Group gap="md" wrap="nowrap">
              {/* Ícono */}
              <div
                className={`p-3 rounded-2xl ${
                  tieneAprobada ? "bg-teal-500/10" : "bg-indigo-500/10"
                }`}
              >
                {tieneAprobada ? (
                  <CheckBadgeIcon className="w-6 h-6 text-teal-400" />
                ) : (
                  <DocumentMagnifyingGlassIcon className="w-6 h-6 text-indigo-400" />
                )}
              </div>

              {/* Info principal */}
              <Stack gap={2}>
                <Group gap="xs" wrap="nowrap" align="center">
                  <Text size="sm" fw={900} className="text-white">
                    Comparativo #{comp.numero_correlativo}
                  </Text>
                  {comp.solicitudes_origen_correlativos && (
                    <Tooltip
                      label={`Correlativos de la${comp.solicitudes_origen_correlativos.includes(",") ? "s" : ""} solicitud${comp.solicitudes_origen_correlativos.includes(",") ? "es" : ""} de reabastecimiento que originaron este comparativo`}
                      position="top"
                      withArrow
                    >
                      <Badge
                        variant="light"
                        color="indigo"
                        size="sm"
                        radius="md"
                        leftSection={
                          <DocumentTextIcon className="w-3 h-3" />
                        }
                        className="font-mono tracking-tight cursor-help"
                      >
                        {comp.solicitudes_origen_correlativos}
                      </Badge>
                    </Tooltip>
                  )}
                  <Badge
                    variant="dot"
                    color={tieneAprobada ? "teal" : "orange"}
                    size="sm"
                  >
                    {tieneAprobada ? "Completado" : "Pendiente"}
                  </Badge>
                </Group>
                <Group gap="xs" className="text-zinc-400">
                  <CalendarDaysIcon className="w-3.5 h-3.5 text-indigo-400/70" />
                  <Text size="xs" fw={600}>
                    {dayjs(fecha).format("DD/MM/YYYY HH:mm")}
                  </Text>
                  <div className="w-1 h-1 rounded-full bg-zinc-700 mx-1" />
                  <BuildingStorefrontIcon className="w-3.5 h-3.5 text-indigo-400/70" />
                  <Text size="xs" fw={600}>
                    {cots.length}{" "}
                    {cots.length === 1 ? "Cotización" : "Cotizaciones"}
                  </Text>
                </Group>
              </Stack>
            </Group>

            {/* Botón ver comparativo + chevron */}
            <Group gap="sm" wrap="nowrap">
              <Button
                size="xs"
                radius="xl"
                variant="light"
                color="indigo"
                leftSection={<TableCellsIcon className="w-3.5 h-3.5" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onVerComparativo(idComp);
                }}
              >
                Ver Comparativo
              </Button>
              <div className="w-8 h-8 rounded-full bg-zinc-800/60 flex items-center justify-center border border-zinc-700/50 shrink-0">
                {isExpanded ? (
                  <ChevronUpIcon className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4 text-zinc-400" />
                )}
              </div>
            </Group>
          </Group>
        </div>
      </UnstyledButton>

      {/* ── CUERPO EXPANDIBLE: COTIZACIONES ── */}
      <Collapse in={isExpanded}>
        <Divider color="zinc.8" mx="md" />
        <Stack gap="sm" p="md">
          {cots.map((cot) => (
            <CotizacionCard
              key={cot.id_cotizacion}
              cot={cot}
              isExpanded={expandedCots[cot.id_cotizacion] ?? true}
              onToggle={() => onToggleCot(cot.id_cotizacion)}
              onPrintCotizacion={onPrintCotizacion}
              onPrintOC={onPrintOC}
              onApprove={onApprove}
              onEdit={onEdit}
              printingOCId={printingOCId}
              stateConfig={
                stateConfigs[cot.estado] || {
                  color: "zinc",
                  label: cot.estado,
                  variant: "light",
                }
              }
            />
          ))}
        </Stack>
      </Collapse>
    </Paper>
  );
};
