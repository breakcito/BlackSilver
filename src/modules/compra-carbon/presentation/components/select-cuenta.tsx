import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Button,
  Group,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { AuxService } from "../../../../service/auxiliar.service";
import { ProveedoresService } from "../../../../modules/proveedores/service/proveedores.service";
import { useNotify } from "../../../../hooks/useNotify";
import { Moneda } from "../../../../shared/enums/_generic/moneda";
import { getCoincidencias } from "../../../../shared/functions/get-coincidencias";
import type { RES_Banco } from "../../../../service/responses/banco";

export type DestinoCuenta = "empresa" | "proveedor" | "transportista";

/** Cuenta que se puede elegir en el pago. */
export interface CuentaOparable {
  id_cuenta_bancaria: number;
  banco: string;
  banco_abv: string;
  numero_cuenta: string;
  es_para_detraccion: boolean | number;
}

interface Props {
  label: string;
  placeholder: string;
  /** Cuentas ya filtradas por el padre (soles y flag de detraccion). */
  cuentas: CuentaOparable[];
  /** Entidad a la que pertenece la cuenta que se va a crear. */
  destino: DestinoCuenta;
  idEntidad: number;
  value: string | null;
  onChange: (valor: string | null) => void;
  disabled?: boolean;
  required?: boolean;
  /** Marca la cuenta a crear como de detraccion. */
  predeterminadoDetraccion?: boolean;
}

const etiqueta = (c: CuentaOparable) => {
  const detraccion = Number(c.es_para_detraccion) === 1;
  const base = `${c.banco_abv || c.banco} - ${c.numero_cuenta}`;
  return detraccion ? `${base} (detracción)` : base;
};

/**
 * Select de cuenta bancaria con alta en un Popover.
 *
 * El boton "+" esta fuera del input porque dentro lo captura el Select.
 *
 * El Select del banco DENTRO del Popover va sin `withinPortal` a proposito: con
 * portal su desplegable se monta fuera del arbol del Popover, el click en la
 * opcion se interpreta como click exterior y el Popover se cerraba antes de
 * dejar elegir el banco.
 */
export const SelectCuenta = ({
  label,
  placeholder,
  cuentas,
  destino,
  idEntidad,
  value,
  onChange,
  disabled = false,
  required = false,
  predeterminadoDetraccion = false,
}: Props) => {
  const { notifySuccess, notifyError } = useNotify();

  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [bancos, setBancos] = useState<RES_Banco[]>([]);
  const [q, setQ] = useState("");
  const [qBanco, setQBanco] = useState("");

  const [idBanco, setIdBanco] = useState<string | null>(null);
  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [cci, setCci] = useState("");
  const [paraDetraccion, setParaDetraccion] = useState(predeterminadoDetraccion);

  /**
   * Cuenta recien creada. Vive en memoria para quedar preseleccionada al
   * instante: el catalogo del padre todavia no la trae.
   */
  const [cuentaCreada, setCuentaCreada] = useState<CuentaOparable | null>(null);

  useEffect(() => {
    AuxService.get_bancos()
      .then((r) => {
        if (r.success && r.data) setBancos(r.data);
      })
      .catch(() => notifyError("Error al cargar los bancos"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setParaDetraccion(predeterminadoDetraccion);
    setCuentaCreada(null);
  }, [predeterminadoDetraccion]);

  const cuentasEffectivas = useMemo(() => {
    if (!cuentaCreada) return cuentas;
    if (
      cuentas.some(
        (c) => c.id_cuenta_bancaria === cuentaCreada.id_cuenta_bancaria,
      )
    ) {
      return cuentas;
    }
    return [...cuentas, cuentaCreada];
  }, [cuentas, cuentaCreada]);

  const bancosVisibles = useMemo(() => {
    const query = qBanco.trim();
    if (!query) return bancos;
    return getCoincidencias(bancos, query, {
      keys: ["nombre", "abreviatura"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [bancos, qBanco]);

  const cuentasVisibles = useMemo(() => {
    const query = q.trim();
    if (!query) return cuentasEffectivas;
    return getCoincidencias(cuentasEffectivas, query, {
      keys: ["banco", "banco_abv", "numero_cuenta"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [cuentasEffectivas, q]);

  const banco = bancos.find((b) => String(b.id_banco) === idBanco);
  const esNacional = Number(banco?.es_nacional ?? 0) === 1;

  const cerrar = () => {
    setAbierto(false);
    setIdBanco(null);
    setNumeroCuenta("");
    setCci("");
    setQBanco("");
    setParaDetraccion(predeterminadoDetraccion);
  };

  const seleccionar = (cuenta: CuentaOparable) => {
    setCuentaCreada(cuenta);
    onChange(String(cuenta.id_cuenta_bancaria));
  };

  const guardar = async () => {
    if (!idBanco || !numeroCuenta.trim()) return;

    setGuardando(true);
    try {
      const base = {
        id_banco: Number(idBanco),
        numero_cuenta: numeroCuenta.trim(),
        cci: cci.trim(),
        es_para_detraccion: paraDetraccion,
      };

      if (destino === "empresa") {
        const resp = await AuxService.crear_cuenta_empresa({
          id_empresa: idEntidad,
          id_banco: base.id_banco,
          moneda: Moneda.Soles,
          numero_cuenta: base.numero_cuenta,
          cci: base.cci || null,
          es_para_detraccion: base.es_para_detraccion,
        });
        if (!resp.success || !resp.data) {
          notifyError(resp.message || "No se pudo registrar la cuenta");
          return;
        }
        seleccionar({
          id_cuenta_bancaria: resp.data.id_cuenta_bancaria,
          banco: banco?.nombre ?? "",
          banco_abv: banco?.abreviatura ?? "",
          numero_cuenta: base.numero_cuenta,
          es_para_detraccion: base.es_para_detraccion,
        });
      } else if (destino === "proveedor") {
        const cuenta = await ProveedoresService.crearCuentaBancaria({
          id_proveedor: idEntidad,
          id_banco: base.id_banco,
          moneda: Moneda.Soles,
          numero_cuenta: base.numero_cuenta,
          cci: base.cci,
          es_para_detraccion: base.es_para_detraccion ? 1 : 0,
        });
        if (!cuenta?.id_cuenta_bancaria) {
          notifyError("No se pudo registrar la cuenta");
          return;
        }
        seleccionar({
          id_cuenta_bancaria: cuenta.id_cuenta_bancaria,
          banco: cuenta.banco,
          banco_abv: cuenta.banco_abv,
          numero_cuenta: cuenta.numero_cuenta,
          es_para_detraccion: cuenta.es_para_detraccion,
        });
      } else {
        const resp = await AuxService.crear_cuenta_transportista({
          id_transportista: idEntidad,
          id_banco: base.id_banco,
          moneda: Moneda.Soles,
          numero_cuenta: base.numero_cuenta,
          cci: base.cci || null,
          es_para_detraccion: base.es_para_detraccion,
        });
        if (!resp.success || !resp.data) {
          notifyError(resp.message || "No se pudo registrar la cuenta");
          return;
        }
        seleccionar({
          id_cuenta_bancaria: resp.data.id_cuenta_bancaria,
          banco: banco?.nombre ?? "",
          banco_abv: banco?.abreviatura ?? "",
          numero_cuenta: base.numero_cuenta,
          es_para_detraccion: base.es_para_detraccion,
        });
      }

      notifySuccess("Cuenta bancaria registrada");
      cerrar();
    } catch (e) {
      console.error(e);
      notifyError("Error al registrar la cuenta bancaria");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <div>
          <Text size="xs" fw={600} c="dimmed" mb={4}>
            {label}
            {required && " *"}
          </Text>
          <Group gap={6} wrap="nowrap">
            <Select
              placeholder={placeholder}
              data={cuentasVisibles.map((c) => ({
                value: String(c.id_cuenta_bancaria),
                label: etiqueta(c),
              }))}
              value={value}
              onChange={(v) => {
                onChange(v);
                setQ("");
              }}
              size="xs"
              radius="lg"
              searchable
              searchValue={q}
              onSearchChange={setQ}
              nothingFoundMessage={
                cuentasEffectivas.length === 0
                  ? "Sin cuentas registradas"
                  : "Sin coincidencias"
              }
              comboboxProps={{ withinPortal: true }}
              disabled={disabled}
              className="flex-1"
            />

            <Tooltip label="Registrar cuenta" position="left">
              <ActionIcon
                size="lg"
                radius="lg"
                variant="light"
                color="indigo"
                aria-label="Registrar cuenta bancaria"
                onClick={() => setAbierto(true)}
                disabled={disabled}
                className="shrink-0"
              >
                <IconPlus className="w-4 h-4" />
              </ActionIcon>
            </Tooltip>
          </Group>
      </div>

      <ModalEstandar
        opened={abierto}
        close={cerrar}
        title="Nueva cuenta bancaria"
        size="26rem"
        zIndex={400}
      >
        <Text size="11px" c="dimmed" mb="xs">
          La cuenta se registra en soles. La detracción solo aplica a cuentas del
          Banco de la Nación.
        </Text>

        <Stack gap="xs">
          <Select
            label="Banco"
            placeholder="Seleccionar"
            data={bancosVisibles.map((b) => ({
              value: String(b.id_banco),
              label: `${b.abreviatura} — ${b.nombre}`,
            }))}
            value={idBanco}
            onChange={setIdBanco}
            searchable
            searchValue={qBanco}
            onSearchChange={setQBanco}
            nothingFoundMessage="Sin coincidencias"
            size="xs"
            radius="lg"
            comboboxProps={{ withinPortal: true }}
            required
          />

          <TextInput
            label="Número de cuenta"
            placeholder="001-0000123"
            value={numeroCuenta}
            onChange={(e) => setNumeroCuenta(e.currentTarget.value)}
            size="xs"
            radius="lg"
            required
          />

          <TextInput
            label="CCI"
            placeholder="Opcional"
            value={cci}
            onChange={(e) => setCci(e.currentTarget.value)}
            size="xs"
            radius="lg"
          />

          <Switch
            checked={paraDetraccion}
            onChange={(e) => setParaDetraccion(e.currentTarget.checked)}
            label="Cuenta de detracción"
            color="yellow"
            size="xs"
            disabled={idBanco !== null && !esNacional}
            styles={{ label: { fontSize: "xs" } }}
          />

          {idBanco !== null && !esNacional && (
            <Text size="10px" c="yellow.4">
              Solo el Banco de la Nación designa cuenta de detracción.
            </Text>
          )}

          <Group justify="flex-end" gap="xs">
            <Button
              variant="subtle"
              color="gray"
              size="compact-xs"
              radius="lg"
              onClick={cerrar}
            >
              Cancelar
            </Button>
            <Button
              variant="filled"
              color="indigo"
              size="compact-xs"
              radius="lg"
              loading={guardando}
              disabled={!idBanco || !numeroCuenta.trim()}
              onClick={guardar}
            >
              Guardar
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>
    </>
  );
};
