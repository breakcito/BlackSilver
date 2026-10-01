import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  Loader,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { BeakerIcon } from "@heroicons/react/24/outline";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { AuxService } from "../../../../service/auxiliar.service";
import { useNotify } from "../../../../hooks/useNotify";
import { enPlural } from "../../../../shared/functions/en-plural";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import type { RES_Producto } from "../../../../service/responses/producto";
import type { RES_LoteDisponible } from "../../../../service/responses/lote-producto";
import type { RES_UnidadMedida } from "../../../../service/responses/unidad-medida";

export interface ConsumoPayload {
  /**
   * Activo fijo consumidor (FK al modal del padre, no se edita aqui).
   * Se incluye en el payload para que el padre pueda reenviarlo tal
   * cual al backend sin tener que mergear con su propio state.
   */
  id_activo_fijo_consumidor: number;
  id_producto: number;
  id_almacen: number;
  id_lote_producto: number;
  id_unidad_medida: number;
  cantidad_consumo: number;
  contenido_por_presentacion: number;
  /**
   * Cantidad base = cantidad_consumo * contenido_por_presentacion. La
   * incluye el modal para que el padre (que dispara la API) no tenga que
   * recalcularla.
   */
  cantidad_base: number;
  /**
   * Si el modal vino del flujo bulk de "Registrar Control por Horometro",
   * se preserva para vincular el consumo al grupo UUID. Si vino del boton
   * independiente, es null.
   */
  uuid_control_uso_activo: string | null;
  comentario: string;
}

interface Props {
  opened: boolean;
  close: () => void;
  /**
   * Activo fijo que esta consumiendo lo entregado. Si el modal se usa
   * desde "Registrar Control por Horometro", viene del `id_activo_fijo`
   * del control de uso; si se usa desde el boton independiente
   * "Registrar Consumo" del listado, viene del activo seleccionado
   * en el filtro.
   */
  id_activo_fijo_consumidor: number;
  /**
   * UUID del grupo de "Registrar Control por Horometro" al que pertenece
   * el consumo (si aplica). Si es null, el consumo queda como
   * "consumo directo huerfano" sin grupo — usado por el flujo
   * independiente desde el listado.
   */
  uuid_control_uso_activo?: string | null;
  /**
   * Callback invocado cuando el usuario confirma el modal y los datos
   * son validos. El padre decide que hacer con ellos:
   *   - Flujo bulk (`registro-uso.tsx`): agrega a la lista local
   *     `consumos[]` para enviarlos en el submit final.
   *   - Flujo independiente (`control-uso.page.tsx`): llama directo a
   *     `ControlUsoService.registrarConsumoDirecto(...)` con
   *     `uuid_control_uso_activo=null`.
   *
   * Si devuelve una promesa, el modal muestra loading hasta que se
   * resuelva. Si resuelve `false` (o lanza), el modal NO se cierra —
   * el padre debe mostrar el error y mantener abierto.
   */
  onSubmit: (
    payload: ConsumoPayload,
  ) => void | boolean | Promise<void | boolean>;
  /**
   * Estado externo de loading (ej. cuando el padre ya esta submitteando).
   * Si no se provee, el modal maneja su propio loading interno.
   */
  saving?: boolean;
}

interface FormState {
  idProducto: string | null;
  idAlmacen: string | null;
  idLoteProducto: string | null;
  idUnidadMedida: string | null;
  cantidadConsumo: number | "";
  contenidoPorPresentacion: number | "";
  comentario: string;
}

const FORM_INICIAL: FormState = {
  /**
   * Default de producto: id 12 = "Combustible" (hardcoded en varios
   * lugares del modulo, ej. control-uso.responses.ts:94). Si el catalogo
   * no lo trae (data corrupta / prod eliminado), el Select cae al primer
   * producto disponible via el useEffect de abajo.
   */
  idProducto: "12",
  idAlmacen: null,
  idLoteProducto: null,
  idUnidadMedida: null,
  cantidadConsumo: "",
  contenidoPorPresentacion: 1,
  comentario: "",
};

/**
 * Modal reutilizable para registrar un consumo directo de un activo fijo.
 * Extraido del flujo de "Registrar Control por Horometro" para soportar
 * tambien el flujo independiente "Registrar Consumo" del listado.
 *
 * El modal hace el POST al backend (`/control-consumo/consumo-directo`); el padre
 * solo necesita pasar `id_activo_fijo_consumidor` y opcionalmente
 * `uuid_control_uso_activo`. Internamente:
 *   - Carga catalogos (productos, almacenes, unidades).
 *   - Carga lotes filtrados por almacen + producto cuando ambos estan elegidos.
 *   - Calcula la conversion automatica entre la unidad base del producto y
 *     la unidad seleccionada (mismo patron que `useRegistroRequerimiento`).
 *   - Al guardar: valida, calcula `cantidad_base = cantidad * contenido`,
 *     llama al servicio, notifica y cierra.
 */
export const RegistrarConsumoModal = ({
  opened,
  close,
  id_activo_fijo_consumidor,
  uuid_control_uso_activo = null,
  onSubmit,
  saving: externalSaving,
}: Props) => {
  const { notifyError } = useNotify();

  const fieldClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    label: "text-zinc-300 mb-1 font-medium",
  };

  // Form state
  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [internalSaving, setInternalSaving] = useState(false);

  // Catalog state
  const [productos, setProductos] = useState<RES_Producto[]>([]);
  const [almacenesConsumo, setAlmacenesConsumo] = useState<
    { value: string; label: string }[]
  >([]);
  const [unidadesMedida, setUnidadesMedida] = useState<RES_UnidadMedida[]>([]);
  const [lotesModal, setLotesModal] = useState<RES_LoteDisponible[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [loadingLotesModal, setLoadingLotesModal] = useState(false);

  const saving = externalSaving ?? internalSaving;

  // Reset del form cada vez que se abre
  useEffect(() => {
    if (opened) {
      setForm(FORM_INICIAL);
    }
  }, [opened]);

  // Si el catalogo termina de cargar DESPUES de que el modal ya abrio,
  // y el idProducto por defecto (12) NO esta en el catalogo (producto
  // eliminado / data corrupta), caemos al primer producto disponible.
  // Asi evitamos que el Select quede apuntando a un id inexistente.
  useEffect(() => {
    if (!opened) return;
    if (productos.length === 0) return;
    const existe = productos.some(
      (p) => String(p.id_producto) === String(form.idProducto),
    );
    if (!existe) {
      setForm((prev) => ({
        ...prev,
        idProducto: productos[0] ? String(productos[0].id_producto) : null,
      }));
    }
  }, [opened, productos, form.idProducto]);

  // Cargar catalogos al abrir
  useEffect(() => {
    if (!opened) return;
    let cancelled = false;

    const fetchCatalogs = async () => {
      setLoadingCatalogs(true);
      try {
        const [respProductos, respUnidades, respAlmacenes] = await Promise.all([
          AuxService.get_productos(),
          AuxService.get_unidades_medida({ incluir_conversiones: true }),
          AuxService.get_almacenes(),
        ]);
        if (cancelled) return;

        if (respProductos.success) setProductos(respProductos.data);
        if (respUnidades.success) setUnidadesMedida(respUnidades.data);
        if (respAlmacenes.success) {
          setAlmacenesConsumo(
            respAlmacenes.data.map(
              (a: { id_almacen: number | string; nombre: string }) => ({
                value: String(a.id_almacen),
                label: a.nombre,
              }),
            ),
          );
        }
      } finally {
        if (!cancelled) setLoadingCatalogs(false);
      }
    };

    fetchCatalogs();
    return () => {
      cancelled = true;
    };
  }, [opened]);

  // Cargar lotes cuando hay almacen + producto elegidos.
  // Auto-selecciona el primer lote (mayor stock_actual_base) si el form
  // aun no tiene un idLoteProducto o si el actual ya no esta disponible.
  useEffect(() => {
    if (!opened) return;
    if (!form.idAlmacen || !form.idProducto) {
      setLotesModal([]);
      return;
    }
    let cancelled = false;

    const fetchLotes = async () => {
      setLoadingLotesModal(true);
      try {
        const resp = await AuxService.get_lotes_disponibles(
          Number(form.idAlmacen),
          [Number(form.idProducto)],
        );
        if (cancelled) return;
        if (resp.success) {
          const ordenados = [...resp.data].sort(
            (a, b) =>
              Number(b.stock_actual_base ?? 0) -
              Number(a.stock_actual_base ?? 0),
          );
          setLotesModal(ordenados);
          // Autoselecciona el primer lote (mayor stock) si el form aun no
          // tiene un idLoteProducto o si el actual ya no esta disponible.
          setForm((prev) => {
            const sigueValido =
              prev.idLoteProducto !== null &&
              ordenados.some(
                (l) => String(l.id_lote) === prev.idLoteProducto,
              );
            if (sigueValido) return prev;
            if (ordenados.length > 0) {
              return {
                ...prev,
                idLoteProducto: String(ordenados[0].id_lote),
              };
            }
            return { ...prev, idLoteProducto: null };
          });
        } else {
          setLotesModal([]);
        }
      } finally {
        if (!cancelled) setLoadingLotesModal(false);
      }
    };

    fetchLotes();
    return () => {
      cancelled = true;
    };
  }, [opened, form.idAlmacen, form.idProducto]);

  /**
   * Al cambiar de producto en el modal, autocompletar la unidad base del
   * producto seleccionado (el usuario la puede cambiar despues). Solo aplica
   * cuando el modal esta abierto y los catalogos ya estan cargados.
   *
   * Reglas:
   * - Si idUnidadMedida es null => se setea a la base del producto actual.
   * - Si idUnidadMedida YA era la base del producto actual => se mantiene
   *   (no se pisa, esto evita un loop al cambiar entre productos que
   *   comparten base).
   * - Si el usuario eligio manualmente OTRA unidad => se respeta esa
   *   seleccion.
   */
  useEffect(() => {
    if (!opened) return;
    if (!form.idProducto) return;
    if (productos.length === 0) return;
    const prod = productos.find(
      (p) => String(p.id_producto) === String(form.idProducto),
    );
    if (!prod) return;
    const baseStr = String(prod.id_unidad_medida_base);
    if (
      form.idUnidadMedida === null ||
      form.idUnidadMedida === baseStr
    ) {
      setForm((prev) =>
        prev.idUnidadMedida === baseStr
          ? prev
          : { ...prev, idUnidadMedida: baseStr },
      );
    }
  }, [opened, form.idProducto, form.idUnidadMedida, productos]);

  /**
   * Auto-completar `contenidoPorPresentacion` cuando cambia el producto
   * o la unidad de medida en el modal.
   *
   * Reglas:
   * - Si la unidad seleccionada es la misma que la base del producto
   *   -> contenidoPorPresentacion = 1.
   * - Si difieren y existe la conversion en la lista de conversiones
   *   de la unidad SELECCIONADA (donde id_unidad_destino = base),
   *   entonces contenidoPorPresentacion = 1 / factor (porque el
   *   factor que devuelve la API esta en direccion "origens por
   *   destino", y nosotros necesitamos "base por detalle").
   * - Si difieren y NO existe la conversion -> queda en blanco y el
   *   usuario debe tipear el factor manualmente.
   *
   * Solo aplica cuando el modal esta abierto. Ademas solo "tocamos"
   * el campo si su valor previo es "" o 1 (defaults), para no pisar
   * lo que el usuario haya tipeado a mano.
   */
  useEffect(() => {
    if (!opened) return;
    if (!form.idProducto || !form.idUnidadMedida) return;
    const prod = productos.find(
      (p) => String(p.id_producto) === String(form.idProducto),
    );
    if (!prod) return;
    const baseId = String(prod.id_unidad_medida_base);
    const selId = String(form.idUnidadMedida);
    // Unidades identicas -> contenido = 1 (siempre)
    if (baseId === selId) {
      setForm((prev) =>
        prev.contenidoPorPresentacion === 1
          ? prev
          : { ...prev, contenidoPorPresentacion: 1 },
      );
      return;
    }
    // Buscar conversion en la lista de conversiones de la unidad
    // SELECCIONADA (la consultada por la API). Match cuando el
    // id_unidad_destino coincide con la base. Luego se invierte el
    // factor con 1/x para obtener "base por detalle".
    const unidadSel = unidadesMedida.find(
      (u) => String(u.id_unidad_medida) === selId,
    );
    const conv =
      unidadSel?.conversiones?.find(
        (c) => String(c.id_unidad_destino) === baseId,
      ) ?? null;
    setForm((prev) => {
      // Solo autocompletamos si el usuario no toco el campo manualmente
      // (no pisamos un valor distinto a "" o 1 que el usuario haya tipeado).
      const tocar =
        prev.contenidoPorPresentacion === "" ||
        prev.contenidoPorPresentacion === 1;
      if (!tocar) return prev;
      if (conv) {
        const factor = Number(conv.factor_conversion);
        if (!Number.isFinite(factor) || factor <= 0) {
          // Sin conversion util -> no se debe forzar el campo
          if (prev.contenidoPorPresentacion === "") return prev;
          return { ...prev, contenidoPorPresentacion: "" };
        }
        const cpp = 1 / factor;
        if (cpp === prev.contenidoPorPresentacion) return prev;
        return { ...prev, contenidoPorPresentacion: cpp };
      }
      // Sin conversion automatica: dejar en blanco para que el
      // usuario tipee el factor a mano (solo si venia de 1).
      if (prev.contenidoPorPresentacion === "") return prev;
      return { ...prev, contenidoPorPresentacion: "" };
    });
  }, [
    opened,
    form.idProducto,
    form.idUnidadMedida,
    productos,
    unidadesMedida,
  ]);

  // Conversion automatica entre la unidad base del producto y la seleccionada
  const conversionAutomatica = useMemo<number | null>(() => {
    if (!form.idProducto || !form.idUnidadMedida) return null;
    const prodSel = productos.find(
      (p) => String(p.id_producto) === String(form.idProducto),
    );
    if (!prodSel) return null;
    const baseId = String(prodSel.id_unidad_medida_base);
    const selId = String(form.idUnidadMedida);
    if (baseId === selId) return 1;

    const unidadSel = unidadesMedida.find(
      (u) => String(u.id_unidad_medida) === selId,
    );
    const conv = unidadSel?.conversiones?.find(
      (c) => String(c.id_unidad_destino) === baseId,
    );
    if (conv) {
      const factor = Number(conv.factor_conversion);
      if (Number.isFinite(factor) && factor > 0) {
        return 1 / factor;
      }
    }
    return null;
  }, [form.idProducto, form.idUnidadMedida, productos, unidadesMedida]);

  const prodSel = productos.find(
    (p) => String(p.id_producto) === String(form.idProducto),
  );
  const baseNombre =
    prodSel?.unidad_medida_base ||
    unidadesMedida.find(
      (u) =>
        String(u.id_unidad_medida) ===
        String(prodSel?.id_unidad_medida_base ?? ""),
    )?.nombre ||
    "--";
  const baseAbbr = prodSel?.unidad_medida_base_abv ?? "--";
  const selNombre =
    unidadesMedida.find(
      (u) => String(u.id_unidad_medida) === String(form.idUnidadMedida),
    )?.nombre || "--";
  const selAbbr =
    unidadesMedida.find(
      (u) => String(u.id_unidad_medida) === String(form.idUnidadMedida),
    )?.abreviatura ?? "--";
  const unidadesIdenticas = baseAbbr !== "--" && baseAbbr === selAbbr;
  const inputBloqueado = unidadesIdenticas || conversionAutomatica !== null;

  const cantConsumoNum =
    form.cantidadConsumo === "" ? 0 : Number(form.cantidadConsumo);
  const cppNum =
    form.contenidoPorPresentacion === "" ? 0 : Number(form.contenidoPorPresentacion);
  const cantBaseNum = cantConsumoNum * cppNum;
  const tieneCantidad = cantConsumoNum > 0 && cppNum > 0;

  const handleSubmit = async () => {
    // Validaciones
    if (!form.idProducto) {
      notifyError("Seleccione un producto.");
      return;
    }
    if (!form.idAlmacen) {
      notifyError("Seleccione un almacén.");
      return;
    }
    if (!form.idLoteProducto) {
      notifyError("Seleccione un lote.");
      return;
    }
    if (!form.idUnidadMedida) {
      notifyError("Seleccione una unidad de medida.");
      return;
    }
    if (form.cantidadConsumo === "" || Number(form.cantidadConsumo) <= 0) {
      notifyError("Ingrese una cantidad válida.");
      return;
    }
    if (
      form.contenidoPorPresentacion === "" ||
      Number(form.contenidoPorPresentacion) <= 0
    ) {
      notifyError("El contenido por presentación debe ser mayor a 0.");
      return;
    }

    const payload: ConsumoPayload = {
      id_activo_fijo_consumidor,
      id_producto: Number(form.idProducto),
      id_almacen: Number(form.idAlmacen),
      id_lote_producto: Number(form.idLoteProducto),
      id_unidad_medida: Number(form.idUnidadMedida),
      cantidad_consumo: cantConsumoNum,
      contenido_por_presentacion: cppNum,
      cantidad_base: cantBaseNum,
      uuid_control_uso_activo,
      comentario: form.comentario.trim(),
    };

    // Si el padre no provee saving externo, manejamos loading interno.
    if (externalSaving === undefined) {
      setInternalSaving(true);
    }
    try {
      const result = await onSubmit(payload);
      // Si el callback devuelve false explicitamente, NO cerrar.
      if (result === false) {
        return;
      }
      close();
    } catch (err) {
      console.error(err);
      notifyError("Error inesperado al procesar el consumo");
    } finally {
      if (externalSaving === undefined) {
        setInternalSaving(false);
      }
    }
  };

  return (
    <ModalEstandar
      opened={opened}
      close={close}
      title="Registrar Consumo"
      size="xl"
    >
      <Stack gap="md">
        {/* Fila 1: Almacén | Producto | Cantidad */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
          <Select
            label="Almacén"
            placeholder="Seleccione almacén"
            data={almacenesConsumo}
            value={form.idAlmacen}
            onChange={(val) =>
              setForm((prev) => ({
                ...prev,
                idAlmacen: val ?? null,
                idLoteProducto: null,
              }))
            }
            searchable
            required
            disabled={loadingCatalogs}
            classNames={fieldClasses}
            radius="lg"
            size="sm"
            comboboxProps={{
              withinPortal: true,
              zIndex: 9999,
              transitionProps: { transition: "pop", duration: 200 },
            }}
          />

          <Select
            label="Producto"
            placeholder="Seleccione producto"
            data={productos.map((p) => ({
              value: String(p.id_producto),
              label: p.nombre,
            }))}
            value={form.idProducto}
            onChange={(val) =>
              setForm((prev) => ({
                ...prev,
                idProducto: val ?? null,
                idLoteProducto: null,
              }))
            }
            searchable
            required
            disabled={loadingCatalogs}
            classNames={fieldClasses}
            radius="lg"
            size="sm"
            comboboxProps={{
              withinPortal: true,
              zIndex: 9999,
              transitionProps: { transition: "pop", duration: 200 },
            }}
          />

          <NumberInput
            label="Cantidad"
            placeholder="Ej: 5.5"
            value={form.cantidadConsumo}
            onChange={(val) =>
              setForm((prev) => ({
                ...prev,
                cantidadConsumo: val as number | "",
              }))
            }
            min={0}
            decimalScale={6}
            required
            classNames={fieldClasses}
            radius="lg"
            size="sm"
          />
        </SimpleGrid>

        {/* Fila 2: Contenido por presentación | Unidad de Medida */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
          <NumberInput
            label={`(${baseAbbr} x ${selAbbr})`}
            placeholder={
              unidadesIdenticas
                ? "1"
                : !form.idUnidadMedida
                  ? "--x--"
                  : conversionAutomatica !== null
                    ? ""
                    : "Sin conversión automática - ingrese factor"
            }
            value={form.contenidoPorPresentacion}
            onChange={(val) =>
              setForm((prev) => ({
                ...prev,
                contenidoPorPresentacion: val as number | "",
              }))
            }
            min={0}
            decimalScale={6}
            required
            disabled={inputBloqueado}
            classNames={fieldClasses}
            radius="lg"
            size="sm"
          />

          <Select
            label="Unidad de Medida"
            placeholder="Seleccione unidad"
            data={unidadesMedida.map((u) => ({
              value: String(u.id_unidad_medida),
              label: `${u.nombre} (${u.abreviatura})`,
            }))}
            value={form.idUnidadMedida}
            onChange={(val) =>
              setForm((prev) => ({
                ...prev,
                idUnidadMedida: val ?? null,
              }))
            }
            searchable
            required
            disabled={loadingCatalogs}
            classNames={fieldClasses}
            radius="lg"
            size="sm"
            comboboxProps={{
              withinPortal: true,
              zIndex: 9999,
              transitionProps: { transition: "pop", duration: 200 },
            }}
          />
        </SimpleGrid>

        {/* Fila 3: Lote | Resumen */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
          {/* Lote */}
          <Stack gap={4}>
            <Select
              label="Lote (Producto)"
              placeholder={
                !form.idAlmacen
                  ? "Seleccione almacén"
                  : !form.idProducto
                    ? "Seleccione producto"
                    : loadingLotesModal
                      ? "Cargando lotes..."
                      : lotesModal.length > 0
                        ? "Seleccione lote"
                        : "No disponible en almacén"
              }
              data={lotesModal.map((l) => ({
                value: String(l.id_lote),
                label: `${l.correlativo} - stock: ${l.stock_actual_base}`,
              }))}
              value={form.idLoteProducto}
              onChange={(val) =>
                setForm((prev) => ({
                  ...prev,
                  idLoteProducto: val ?? null,
                }))
              }
              searchable
              disabled={
                !form.idAlmacen ||
                !form.idProducto ||
                !form.idUnidadMedida ||
                lotesModal.length === 0 ||
                loadingLotesModal
              }
              required
              classNames={fieldClasses}
              radius="lg"
              size="sm"
              comboboxProps={{
                withinPortal: true,
                zIndex: 9999,
                transitionProps: { transition: "pop", duration: 200 },
              }}
            />
            {lotesModal.length === 0 &&
              form.idAlmacen &&
              form.idProducto &&
              !loadingLotesModal && (
                <Text
                  size="11px"
                  c="amber.4"
                  fw={700}
                  className="uppercase tracking-wider"
                >
                  No hay lotes disponibles para este producto en el
                  almacén seleccionado.
                </Text>
              )}
          </Stack>

          {/* Resumen del consumo */}
          <Card
            withBorder
            padding="sm"
            radius="lg"
            className="bg-indigo-950/10 border-indigo-500/20"
          >
            <Group justify="space-between" align="center" mb={6}>
              <Text
                size="9px"
                c="indigo.3"
                fw={900}
                tt="uppercase"
                lts="0.08em"
              >
                Resumen del consumo
              </Text>
              {prodSel?.nombre ? (
                <Badge
                  size="xs"
                  color="indigo"
                  variant="light"
                  radius="sm"
                >
                  {prodSel.nombre}
                </Badge>
              ) : null}
            </Group>
            <Group gap="lg" wrap="nowrap">
              <Stack gap={2}>
                <Text size="10px" c="zinc.5" fw={700} className="uppercase">
                  {`En ${
                    selNombre && selNombre !== "--"
                      ? enPlural(selNombre)
                      : "---"
                  }`}
                </Text>
                <Group gap={6} align="baseline" wrap="nowrap">
                  <Text
                    fw={800}
                    size="xl"
                    className={
                      tieneCantidad ? "text-white" : "text-zinc-700"
                    }
                  >
                    {Number.isFinite(cantConsumoNum)
                      ? formatNumber(cantConsumoNum)
                      : "0"}
                  </Text>
                  <Text
                    size="xs"
                    fw={700}
                    c="zinc.5"
                    className="uppercase tracking-wider"
                  >
                    {selAbbr}
                  </Text>
                </Group>
              </Stack>
              <div className="h-10 w-px bg-indigo-500/20" />
              <Stack gap={2}>
                <Text size="10px" c="zinc.5" fw={700} className="uppercase">
                  {`En ${
                    baseNombre && baseNombre !== "--"
                      ? enPlural(baseNombre)
                      : "---"
                  }`}
                </Text>
                <Group gap={6} align="baseline" wrap="nowrap">
                  <Text
                    fw={800}
                    size="xl"
                    className={
                      tieneCantidad
                        ? "text-emerald-400"
                        : "text-zinc-700"
                    }
                  >
                    {Number.isFinite(cantBaseNum)
                      ? formatNumber(cantBaseNum)
                      : "0"}
                  </Text>
                  <Text
                    size="xs"
                    fw={700}
                    c="zinc.5"
                    className="uppercase tracking-wider"
                  >
                    {baseAbbr}
                  </Text>
                </Group>
              </Stack>
            </Group>
            <Text size="9px" c="dimmed" mt={6} ta="center">
              {tieneCantidad
                ? `${formatNumber(cantConsumoNum)} ${selAbbr} × ${formatNumber(cppNum)} = ${formatNumber(cantBaseNum)} ${baseAbbr}`
                : "Complete cantidad y contenido para ver la equivalencia."}
            </Text>
          </Card>
        </SimpleGrid>

        {/* Comentario */}
        <Textarea
          label="Comentario (opcional)"
          placeholder="Notas del consumo..."
          value={form.comentario}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              comentario: e.currentTarget.value,
            }))
          }
          classNames={fieldClasses}
          radius="lg"
          size="sm"
          minRows={2}
        />

        <Group justify="flex-end" gap="sm" mt="sm">
          <Button
            variant="default"
            size="xs"
            radius="lg"
            onClick={close}
            disabled={saving}
            className="bg-zinc-800! text-zinc-300! border-zinc-700!"
          >
            Cancelar
          </Button>
          <Button
            color="amber.6"
            size="xs"
            radius="lg"
            onClick={handleSubmit}
            loading={saving}
            disabled={loadingCatalogs}
            leftSection={
              saving ? null : loadingCatalogs ? (
                <Loader size={12} color="white" />
              ) : (
                <BeakerIcon className="w-4 h-4" />
              )
            }
            className="bg-amber-600! hover:bg-amber-700! text-white! font-bold"
          >
            Registrar Consumo
          </Button>
        </Group>
      </Stack>
    </ModalEstandar>
  );
};
