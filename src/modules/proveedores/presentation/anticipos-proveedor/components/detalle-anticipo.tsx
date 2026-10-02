import { Badge, Divider, Group, Progress, Stack, Text } from "@mantine/core";
import {
  IconBuildingBank,
  IconCash,
  IconPaperclip,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/es";

import { formatMontoPEN } from "../../../../../shared/functions/format-monto-pen";
import { ArchivoCard } from "../../../../../presentation/utils/archivo/archivo-card";
import type { AnticipoProveedorResponse } from "../../../service/proveedores.responses";

dayjs.locale("es");

const ETIQUETA =
  "text-[10px] font-bold uppercase tracking-widest text-zinc-500";
const VALOR = "text-sm text-zinc-200";

/** "Juan Perez Lopez" a partir de nombre + apellido sueltos. */
const nombreCompleto = (
  nombre: string | null,
  apellido: string | null,
): string => [nombre ?? "", apellido ?? ""].filter(Boolean).join(" ") || "—";

/** Linea etiqueta + valor, el patron de lectura del proyecto. */
const Dato = ({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: React.ReactNode;
}) => (
  <div className="min-w-0">
    <Text className={ETIQUETA}>{etiqueta}</Text>
    <div className={VALOR}>{children}</div>
  </div>
);

/**
 * Vista de detalle de un anticipo.
 *
 * Existe porque la tabla del listado prioriza escaneo (una linea por
 * anticipo) y no cabe todo: la observacion completa, el CCI y las
 * evidencias solo se leen aqui.
 */
export const DetalleAnticipo = ({
  anticipo,
}: {
  anticipo: AnticipoProveedorResponse;
}) => {
  const inicial = Number(anticipo.saldo_inicial) || 0;
  const actual = Number(anticipo.saldo_actual) || 0;
  const consumido = Math.max(inicial - actual, 0);
  const porcentajeConsumido =
    inicial > 0 ? Math.min((consumido / inicial) * 100, 100) : 0;
  const anulado = Boolean(anticipo.esta_anulado);
  const aTerceros = Boolean(anticipo.pago_a_terceros);
  const nombreRegistro = nombreCompleto(
    anticipo.empleado_registro_nombre,
    anticipo.empleado_registro_apellido,
  );

  return (
    <Stack gap="md">
      {/* --- Saldos --- */}
      <div
        className={
          "rounded-xl border p-4 " +
          (anulado
            ? "border-red-900/40 bg-red-950/20"
            : "border-zinc-800 bg-zinc-950/50")
        }
      >
        <Group justify="space-between" align="flex-end" gap="md">
          <div>
            <Text className={ETIQUETA}>Saldo disponible</Text>
            <Text
              size="28px"
              fw={800}
              className={
                "font-mono leading-tight " +
                (anulado
                  ? "text-red-400 line-through"
                  : actual > 0
                    ? "text-emerald-400"
                    : "text-zinc-500")
              }
            >
              {formatMontoPEN(actual)}
            </Text>
          </div>
          <div className="text-right">
            <Text className={ETIQUETA}>Monto registrado</Text>
            <Text size="sm" className="font-mono text-zinc-300">
              {formatMontoPEN(inicial)}
            </Text>
            {consumido > 0 && (
              <Text size="xs" className="font-mono text-zinc-500">
                ({formatMontoPEN(consumido)} consumido)
              </Text>
            )}
          </div>
        </Group>
        {inicial > 0 && (
          <div className="mt-3">
            <Progress
              value={porcentajeConsumido}
              size="sm"
              radius="xl"
              color={
                anulado ? "red" : porcentajeConsumido >= 100 ? "gray" : "indigo"
              }
            />
            <Text size="10px" c="dimmed" ta="right" mt={4}>
              {porcentajeConsumido.toFixed(0)}% consumido
            </Text>
          </div>
        )}
      </div>

      {/* --- Badges de contexto --- */}
      <Group gap="xs">
        {aTerceros && (
          <Badge
            color="yellow"
            variant="light"
            radius="xl"
            leftSection={<IconUsers size={12} />}
          >
            Pago a terceros
          </Badge>
        )}
        {anulado && (
          <Badge color="red" variant="filled" radius="xl">
            Anulado
          </Badge>
        )}
        {anticipo.medio_pago && (
          <Badge
            color="gray"
            variant="light"
            radius="xl"
            leftSection={<IconCash size={12} />}
          >
            {anticipo.medio_pago}
          </Badge>
        )}
      </Group>

      {/* --- Pago --- */}
      <div>
        <Text className={`${ETIQUETA} mb-2`}>Pago</Text>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Dato etiqueta="Fecha del pago">
            {anticipo.fecha_hora_pago
              ? dayjs(anticipo.fecha_hora_pago).format("DD/MM/YYYY HH:mm")
              : "—"}
          </Dato>
          <Dato etiqueta="Número de operación">
            <span className="font-mono">
              {anticipo.numero_operacion || "—"}
            </span>
          </Dato>
          <Dato etiqueta="Factura / comprobante">
            <span className="font-mono">
              {anticipo.codigo_comprobante || "—"}
            </span>
          </Dato>
        </div>
      </div>

      <Divider color="zinc.8" />

      {/* --- Cuentas --- */}
      <div>
        <Group gap={6} mb={2}>
          <IconBuildingBank size={14} className="text-zinc-500" />
          <Text className={ETIQUETA}>Cuentas</Text>
        </Group>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <Text className={`${ETIQUETA} mb-1`}>
              Origen · {anticipo.empresa_nombre ?? "—"}
            </Text>
            <Text size="sm" className="text-zinc-200">
              {anticipo.cuenta_bancaria_numero
                ? `${anticipo.cuenta_bancaria_moneda ?? ""} ${anticipo.cuenta_bancaria_numero}`.trim()
                : "No registrada"}
            </Text>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <Text className={`${ETIQUETA} mb-1`}>
              Destino · {aTerceros ? "Tercero" : "Proveedor"}
            </Text>
            <Text size="sm" className="text-zinc-200">
              {aTerceros
                ? "El pago no fue a una cuenta del proveedor"
                : anticipo.cuenta_proveedor_numero
                  ? `${anticipo.cuenta_proveedor_banco ?? ""} ${anticipo.cuenta_proveedor_moneda ?? ""} ${anticipo.cuenta_proveedor_numero}`.trim()
                  : "No registrada"}
            </Text>
            {anticipo.cuenta_proveedor_cci && (
              <Text size="xs" c="dimmed" className="font-mono mt-1">
                CCI {anticipo.cuenta_proveedor_cci}
              </Text>
            )}
          </div>
        </div>
      </div>

      {/* --- Observacion --- */}
      {anticipo.observacion && (
        <>
          <Divider color="zinc.8" />
          <div>
            <Text className={`${ETIQUETA} mb-1`}>Observación</Text>
            <Text size="sm" className="text-zinc-200 whitespace-pre-wrap">
              {anticipo.observacion}
            </Text>
          </div>
        </>
      )}

      {/* --- Evidencias --- */}
      {Array.isArray(anticipo.evidencias) && anticipo.evidencias.length > 0 && (
        <>
          <Divider color="zinc.8" />
          <div>
            <Group gap={6} mb="xs">
              <IconPaperclip size={13} className="text-zinc-500" />
              <Text className={ETIQUETA}>
                Evidencias ({anticipo.evidencias.length})
              </Text>
            </Group>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {anticipo.evidencias.map((ev) => (
                <ArchivoCard key={ev.path_relativo} archivo={ev} />
              ))}
            </div>
          </div>
        </>
      )}

      <Divider color="zinc.8" />

      {/* --- Auditoria --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Dato etiqueta="Registrado por">
          <Group gap={6} wrap="nowrap">
            <IconUser size={13} className="shrink-0 text-zinc-500" />
            <span>
              {nombreRegistro} ·{" "}
              {dayjs(anticipo.created_at).format("DD/MM/YYYY HH:mm")}
            </span>
          </Group>
        </Dato>
        <Dato etiqueta="Anulado por">
          {anulado && anticipo.empleado_anulacion_nombre
            ? `${nombreCompleto(anticipo.empleado_anulacion_nombre, anticipo.empleado_anulacion_apellido)} · ${dayjs(anticipo.fecha_hora_anulacion).format("DD/MM/YYYY HH:mm")}`
            : "—"}
        </Dato>
      </div>
    </Stack>
  );
};
