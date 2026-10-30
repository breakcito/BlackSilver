import { Badge, Divider, Group, Progress, Stack, Text } from "@mantine/core";
import {
  IconBuildingBank,
  IconCash,
  IconClipboardText,
  IconPaperclip,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/es";

import { cn } from "../../../../../shared/functions/cn";
import { formatMontoPEN } from "../../../../../shared/functions/format-monto-pen";
import { ArchivoCard } from "../../../../../presentation/utils/archivo/archivo-card";
import type { AnticipoProveedorResponse } from "../../../service/proveedores.responses";

dayjs.locale("es");

/**
 * Tokens visuales del detalle.
 *
 * El nombre de campo va en caja normal (peso medio, gris suave) y solo los
 * TITULOS DE SECCION van en mayuscula: antes todo era "MAYUSCULA + bold +
 * tracking-widest", que en un panel con 12 labels se leia como un yelling
 * en vez de como informacion.
 */
const ETIQUETA = "text-[11px] font-medium text-zinc-500 leading-tight";
const TITULO_SECCION =
  "text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400";
const VALOR = "text-sm text-zinc-200";

/** "Juan Perez Lopez" a partir de nombre + apellido sueltos. */
const nombreCompleto = (
  nombre: string | null,
  apellido: string | null,
): string => [nombre ?? "", apellido ?? ""].filter(Boolean).join(" ") || "—";

/**
 * Encabezado de seccion: icono + titulo en mayuscula. Es el unico lugar
 * donde se usa el mayuscula, asi que marca la jerarquia sin gritar.
 */
const Seccion = ({
  icon,
  titulo,
  children,
}: {
  icon: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) => (
  <div>
    <Group gap={7} mb="sm">
      <span className="text-indigo-400/70">{icon}</span>
      <Text className={TITULO_SECCION}>{titulo}</Text>
    </Group>
    {children}
  </div>
);

/**
 * Campo con etiqueta. El valor va sobre una tarjeta suave para que el
 * bloque respire y los datos no se lean como texto corrido.
 */
const Campo = ({
  etiqueta,
  children,
  className,
}: {
  etiqueta: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "min-w-0 rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-3 py-2",
      className,
    )}
  >
    <Text className={ETIQUETA}>{etiqueta}</Text>
    <div className={cn(VALOR, "mt-0.5")}>{children}</div>
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

  const estadoTexto = anulado ? "Anulado" : actual > 0 ? "Con saldo" : "Sin saldo";
  const estadoColor = anulado ? "red" : actual > 0 ? "teal" : "gray";

  return (
    <Stack gap="lg">
      {/* --- Saldos --- */}
      <div
        className={cn(
          "rounded-xl border p-4",
          anulado
            ? "border-red-900/40 bg-red-950/20"
            : "border-zinc-800/80 bg-gradient-to-b from-zinc-900/40 to-transparent",
        )}
      >
        <Group justify="space-between" align="flex-end" gap="md" wrap="nowrap">
          <div className="min-w-0">
            <Text className={ETIQUETA}>Saldo disponible</Text>
            <Text
              size="30px"
              fw={700}
              className={cn(
                "leading-tight tracking-tight tabular-nums",
                anulado
                  ? "text-red-300 line-through"
                  : actual > 0
                    ? "text-emerald-300"
                    : "text-zinc-500",
              )}
            >
              {formatMontoPEN(actual)}
            </Text>
          </div>
          <div className="text-right shrink-0">
            <Text className={ETIQUETA}>Monto registrado</Text>
            <Text
              size="sm"
              fw={600}
              className="text-zinc-300 tabular-nums"
            >
              {formatMontoPEN(inicial)}
            </Text>
            {consumido > 0 && (
              <Badge
                size="xs"
                variant="light"
                color="pink"
                radius="sm"
                mt={6}
                className="tabular-nums"
              >
                {formatMontoPEN(consumido)} consumido
              </Badge>
            )}
          </div>
        </Group>
        {inicial > 0 && (
          <div className="mt-3">
            <Progress
              value={porcentajeConsumido}
              size="xs"
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
      <Group gap={6}>
        <Badge
          color={estadoColor}
          variant={anulado ? "filled" : "light"}
          size="sm"
          radius="xl"
        >
          {estadoTexto}
        </Badge>
        {anticipo.medio_pago && (
          <Badge
            color="gray"
            variant="light"
            size="sm"
            radius="xl"
            leftSection={<IconCash size={12} />}
          >
            {anticipo.medio_pago}
          </Badge>
        )}
        {aTerceros && (
          <Badge
            color="yellow"
            variant="light"
            size="sm"
            radius="xl"
            leftSection={<IconUsers size={12} />}
          >
            Pago a terceros
          </Badge>
        )}
      </Group>

      {/* --- Pago --- */}
      <Seccion icon={<IconCash size={13} />} titulo="Pago">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Campo etiqueta="Fecha del pago">
            {anticipo.fecha_hora_pago ? (
              dayjs(anticipo.fecha_hora_pago).format("DD/MM/YYYY")
            ) : (
              "—"
            )}
          </Campo>
          <Campo etiqueta="Número de operación">
            {anticipo.numero_operacion ? (
              <Badge
                size="sm"
                variant="light"
                color="teal"
                radius="sm"
                className="font-mono"
              >
                {anticipo.numero_operacion}
              </Badge>
            ) : (
              "—"
            )}
          </Campo>
          <Campo etiqueta="Factura / comprobante">
            {anticipo.codigo_comprobante ? (
              <span className="font-mono text-zinc-300">
                {anticipo.codigo_comprobante}
              </span>
            ) : (
              "—"
            )}
          </Campo>
        </div>
      </Seccion>

      <Divider color="zinc.8" />

      {/* --- Cuentas --- */}
      {anticipo.cambista_nombre ? (
        // Efectivo: el dinero salio del bolsillo del cobrador, no de una
        // cuenta bancaria. Mostrar dos tarjetas "Sin cuenta registrada"
        // no aporta nada, asi que se reemplaza por quien entrego la plata.
        <Seccion icon={<IconUser size={13} />} titulo="Origen del dinero">
          <Campo etiqueta="Cobrador (pago en efectivo)">
            <Badge
              size="sm"
              variant="light"
              color="yellow"
              radius="sm"
              fullWidth
              className="justify-start"
            >
              {anticipo.cambista_nombre}
            </Badge>
          </Campo>
        </Seccion>
      ) : (
        <Seccion icon={<IconBuildingBank size={13} />} titulo="Cuentas">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Campo etiqueta={`Origen · ${anticipo.empresa_nombre ?? "—"}`}>
              {anticipo.cuenta_bancaria_numero ? (
                <div className="space-y-1">
                  <Text size="11px" c="gray.4" truncate>
                    {anticipo.cuenta_bancaria_banco ?? "Banco no registrado"}
                  </Text>
                  <Badge
                    size="sm"
                    variant="light"
                    color="cyan"
                    radius="sm"
                    fullWidth
                    className="justify-start font-mono"
                  >
                    {`${anticipo.cuenta_bancaria_moneda ?? ""} ${anticipo.cuenta_bancaria_numero}`.trim()}
                  </Badge>
                </div>
              ) : (
                <Text size="sm" c="dimmed">
                  Sin cuenta registrada
                </Text>
              )}
            </Campo>
            <Campo
              etiqueta={aTerceros ? "Destino · Tercero" : "Destino · Proveedor"}
            >
              {aTerceros ? (
                <Badge
                  size="sm"
                  variant="light"
                  color="yellow"
                  radius="sm"
                  fullWidth
                  className="justify-start"
                >
                  El pago no fue a una cuenta del proveedor
                </Badge>
              ) : anticipo.cuenta_proveedor_numero ? (
                <div className="space-y-1">
                  <Badge
                    size="sm"
                    variant="light"
                    color="indigo"
                    radius="sm"
                    fullWidth
                    className="justify-start font-mono"
                  >
                    {`${anticipo.cuenta_proveedor_banco ?? ""} ${anticipo.cuenta_proveedor_moneda ?? ""} ${anticipo.cuenta_proveedor_numero}`.trim()}
                  </Badge>
                  {anticipo.cuenta_proveedor_cci && (
                    <Text size="10px" c="dimmed" className="font-mono">
                      CCI {anticipo.cuenta_proveedor_cci}
                    </Text>
                  )}
                </div>
              ) : (
                <Text size="sm" c="dimmed">
                  Sin cuenta registrada
                </Text>
              )}
            </Campo>
          </div>
        </Seccion>
      )}

      {/* --- Observacion --- */}
      {anticipo.observacion && (
        <>
          <Divider color="zinc.8" />
          <Seccion icon={<IconClipboardText size={13} />} titulo="Observación">
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-3 py-2">
              <Text size="sm" className="text-zinc-300 whitespace-pre-wrap">
                {anticipo.observacion}
              </Text>
            </div>
          </Seccion>
        </>
      )}

      {/* --- Evidencias --- */}
      {Array.isArray(anticipo.evidencias) && anticipo.evidencias.length > 0 && (
        <>
          <Divider color="zinc.8" />
          <Seccion
            icon={<IconPaperclip size={13} />}
            titulo={`Evidencias (${anticipo.evidencias.length})`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {anticipo.evidencias.map((ev) => (
                <ArchivoCard key={ev.path_relativo} archivo={ev} />
              ))}
            </div>
          </Seccion>
        </>
      )}

      <Divider color="zinc.8" />

      {/* --- Auditoria --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Campo etiqueta="Registrado por">
          <Group gap={6} wrap="nowrap">
            <Text size="sm" className="text-zinc-200">
              {nombreRegistro}
            </Text>
            <Badge size="xs" variant="light" color="zinc" radius="sm">
              {dayjs(anticipo.created_at).format("DD/MM/YYYY HH:mm")}
            </Badge>
          </Group>
        </Campo>
        <Campo etiqueta="Anulado por">
          {anulado && anticipo.empleado_anulacion_nombre ? (
            <Group gap={6} wrap="nowrap">
              <Text size="sm" className="text-zinc-200">
                {nombreCompleto(
                  anticipo.empleado_anulacion_nombre,
                  anticipo.empleado_anulacion_apellido,
                )}
              </Text>
              <Badge size="xs" variant="light" color="red" radius="sm">
                {dayjs(anticipo.fecha_hora_anulacion).format("DD/MM/YYYY HH:mm")}
              </Badge>
            </Group>
          ) : (
            <Text size="sm" c="dimmed">
              —
            </Text>
          )}
        </Campo>
      </div>
    </Stack>
  );
};
