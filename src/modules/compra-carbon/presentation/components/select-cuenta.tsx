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
import { inputClasses } from "./input-classes";
import { RegistroBanco } from "../../../proveedores/presentation/cuentas-bancarias/components/registro-banco";

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

/**
 * Etiqueta de la cuenta en el Select: "ABREVIATURA - NUMERO".
 *
 * En el destino "transportista" no se anexa la marca "(detracción)": el modal
 * de pago ya lista solo las cuentas de la modalidad vigente (pago normal o
 * detracción), asi que la marca es redundante.
 */
const etiqueta = (c: CuentaOparable, conMarcaDetraccion: boolean) => {
  const base = `${c.banco_abv || c.banco} - ${c.numero_cuenta}`;
  if (!conMarcaDetraccion) return base;
  return Number(c.es_para_detraccion) === 1
    ? `${base} (detracción)`
    : base;
};

/**
 * Select de cuenta bancaria con alta en un modal.
 *
 * El boton "+" esta fuera del input porque dentro lo captura el Select.
 *
 * El Select del Banco vive dentro del modal "Nueva cuenta bancaria" (zIndex
 * 400), asi que su desplegable necesita un z-index propio: por defecto
 * Mantine usa 300 y el portal quedaria por debajo del modal.
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
  const [abiertoBanco, setAbiertoBanco] = useState(false);
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

  // Se preselecciona la primera cuenta de la lista. La lista ya viene
  // filtrada por el padre (soles y flag de detraccion), asi que la primera es
  // la recomendada. Si la eleccion actual deja de estar en la lista (cambio de
  // proveedor, de tipo de pago o alta de una cuenta), se vuelve a la primera.
  useEffect(() => {
    if (cuentasEffectivas.length === 0) return;
    const sigueVigente = cuentasEffectivas.some(
      (c) => String(c.id_cuenta_bancaria) === value,
    );
    if (!sigueVigente) {
      onChange(String(cuentasEffectivas[0].id_cuenta_bancaria));
    }
  }, [cuentasEffectivas, value, onChange]);

  const bancosVisibles = useMemo(() => {
    // La lista NO se filtra por detraccion: el switch sigue al banco, asi que
    // el usuario siempre puede cambiar de banco (si se filtrara, con el switch
    // activo solo se verian bancos nacionales y no habria forma de salir).
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

  /**
   * El switch de detraccion sigue al banco: se activa solo con el Banco de
   * la Nacion (regla que valida el backend) y se desactiva con cualquier
   * otro banco.
   */
  const handleBancoChange = (valor: string | null) => {
    setIdBanco(valor);
    const nuevo = bancos.find((b) => String(b.id_banco) === valor);
    setParaDetraccion(!!nuevo && Number(nuevo.es_nacional) === 1);
  };

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
            {required && (
              <Text span c="red.6">
                {" *"}
              </Text>
            )}
          </Text>
          <Group gap={6} wrap="nowrap">
            <Select
              placeholder={placeholder}
              data={cuentasVisibles.map((c) => ({
                value: String(c.id_cuenta_bancaria),
                label: etiqueta(c, destino !== "transportista"),
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
              classNames={inputClasses}
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
          <Group gap={6} wrap="nowrap" align="flex-end">
            {/*
              El desplegable del Banco va en portal (es el default de Combobox)
              pero con z-index propio. Con el z-index por defecto de Mantine
              (300) el portal se montaba POR DEBAJO de este modal (zIndex 400)
              y las opciones no se veian. Por eso se fija 450: por encima del
              modal de cuenta (400) y por debajo del modal "Registrar Nuevo
              Banco" (500).
            */}
            <Select
              label="Banco"
              placeholder="Seleccionar"
              data={bancosVisibles.map((b) => ({
                value: String(b.id_banco),
                label: `${b.nombre} (${b.abreviatura})`,
              }))}
              value={idBanco}
              onChange={handleBancoChange}
              searchable
              searchValue={qBanco}
              onSearchChange={setQBanco}
              nothingFoundMessage="Sin coincidencias"
              size="xs"
              radius="lg"
              required
              comboboxProps={{ withinPortal: true, zIndex: 450 }}
              classNames={inputClasses}
              className="flex-1"
            />

            <Tooltip label="Registrar nuevo banco" withArrow zIndex={450}>
              <ActionIcon
                size="lg"
                radius="lg"
                variant="light"
                color="indigo"
                aria-label="Registrar nuevo banco"
                onClick={() => setAbiertoBanco(true)}
                className="shrink-0 mb-0.5"
              >
                <IconPlus className="w-4 h-4" />
              </ActionIcon>
            </Tooltip>
          </Group>

          <TextInput
            label="Número de cuenta"
            placeholder="001-0000123"
            value={numeroCuenta}
            onChange={(e) => setNumeroCuenta(e.currentTarget.value)}
            size="xs"
            radius="lg"
            required
            classNames={inputClasses}
          />

          <TextInput
            label="CCI"
            placeholder="Opcional"
            value={cci}
            onChange={(e) => setCci(e.currentTarget.value)}
            size="xs"
            radius="lg"
            classNames={inputClasses}
          />

          <Switch
            checked={paraDetraccion}
            onChange={(e) => setParaDetraccion(e.currentTarget.checked)}
            label="Cuenta de detracción"
            color="yellow"
            size="xs"
            // No se puede marcar a mano: solo con el Banco de la Nacion
            // seleccionado se puede activar o desactivar.
            disabled={!esNacional}
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

      {/* Modal: Registro de Banco (anidado sobre el de nueva cuenta) */}
      <ModalEstandar
        opened={abiertoBanco}
        close={() => setAbiertoBanco(false)}
        title="Registrar Nuevo Banco"
        validateClose
        size="sm"
        zIndex={500}
      >
        <RegistroBanco
          onCancel={() => setAbiertoBanco(false)}
          onSuccess={(banco) => {
            setBancos((prev) => [...prev, banco]);
            setIdBanco(String(banco.id_banco));
            // El switch sigue al banco, tambien cuando es recien registrado.
            setParaDetraccion(Number(banco.es_nacional) === 1);
            setAbiertoBanco(false);
          }}
        />
      </ModalEstandar>
    </>
  );
};
