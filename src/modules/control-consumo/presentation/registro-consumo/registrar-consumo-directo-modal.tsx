import { useState, useEffect, useMemo } from "react";
import {
  Stack,
  Group,
  Text,
  Button,
  NumberInput,
  Textarea,
  Select,
  Badge,
  Card,
  Tooltip,
} from "@mantine/core";
import { ExclamationTriangleIcon, BeakerIcon } from "@heroicons/react/24/outline";
import { ControlConsumoService } from "../../service/control-consumo.service";
import { AuxService } from "../../../../service/auxiliar.service";
import { useNotify } from "../../../../hooks/useNotify";
import type { RES_ActivoFijoDisponible } from "../../../../service/responses/activo-fijo";
import type { RES_LoteDisponible } from "../../../../service/responses/lote-producto";
import type { RES_UnidadMedida } from "../../../../service/responses/unidad-medida";
import type { RES_Mina } from "../../../../service/responses/mina";

interface RegistrarConsumoDirectoModalProps {
  uuid_control_uso_activo: string;
  id_activo_fijo_inicial?: number | null;
  close: () => void;
  onSuccess?: () => void;
}

export const RegistrarConsumoDirectoModal = ({
  uuid_control_uso_activo,
  id_activo_fijo_inicial = null,
  close,
  onSuccess,
}: RegistrarConsumoDirectoModalProps) => {
  const { notifyError, notifySuccess } = useNotify();

  // Estados
  const [idMina, setIdMina] = useState<string | null>(null);
  const [idAlmacen, setIdAlmacen] = useState<string | null>(null);
  const [idProducto, setIdProducto] = useState<string | null>("12");
  const [idLoteProducto, setIdLoteProducto] = useState<string | null>(null);
  const [idUnidadMedida, setIdUnidadMedida] = useState<string | null>(null);
  const [cantidadConsumo, setCantidadConsumo] = useState<number | string>("");
  const [contenidoPorPresentacion, setContenidoPorPresentacion] = useState<
    number | string
  >("");
  const [comentario, setComentario] = useState("");
  const [idActivoFijoConsumidor, setIdActivoFijoConsumidor] = useState<
    string | null
  >(null);
  const [submitting, setSubmitting] = useState(false);

  // Catalogos
  const [minas, setMinas] = useState<RES_Mina[]>([]);
  const [activos, setActivos] = useState<RES_ActivoFijoDisponible[]>([]);
  const [almacenes, setAlmacenes] = useState<
    { value: string; label: string }[]
  >([]);
  const [productos, setProductos] = useState<
    {
      value: string;
      label: string;
      id_unidad_medida_base: string;
    }[]
  >([]);
  const [unidades, setUnidades] = useState<RES_UnidadMedida[]>([]);
  const [lotes, setLotes] = useState<RES_LoteDisponible[]>([]);
  const [loadingAlmacenes, setLoadingAlmacenes] = useState(false);
  const [loadingLotes, setLoadingLotes] = useState(false);

  // Cargar catalogos base
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const respProductos = await AuxService.get_productos();
      const respUnidades = await AuxService.get_unidades_medida({
        incluir_conversiones: true,
      });
      const respMinas = await AuxService.get_minas();
      if (cancelado) return;
      if (respProductos.success) {
        setProductos(
          respProductos.data.map((p) => ({
            value: String(p.id_producto),
            label: p.nombre,
            id_unidad_medida_base: String(p.id_unidad_medida_base),
          })),
        );
      }
      if (respUnidades.success) {
        setUnidades(respUnidades.data);
      }
      if (respMinas.success) {
        setMinas(respMinas.data);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  // Cargar almacenes cuando cambia la mina
  useEffect(() => {
    if (!idMina) {
      setAlmacenes([]);
      return;
    }
    let cancelado = false;
    setLoadingAlmacenes(true);
    AuxService.get_almacenes({ id_mina: Number(idMina) })
      .then((resp) => {
        if (cancelado || !resp.success) return;
        setAlmacenes(
          resp.data.map((a) => ({
            value: String(a.id_almacen),
            label: a.nombre,
          })),
        );
        if (resp.data.length === 1) {
          setIdAlmacen(String(resp.data[0].id_almacen));
        }
      })
      .finally(() => {
        if (!cancelado) setLoadingAlmacenes(false);
      });
    return () => {
      cancelado = true;
    };
  }, [idMina]);

  // Cargar activos filtrados por mina seleccionada
  useEffect(() => {
    let cancelado = false;
    AuxService.get_activos_disponibles({
      id_mina: idMina ? Number(idMina) : undefined,
      con_cuenta: false,
    } as never)
      .then((resp: { success: boolean; data: RES_ActivoFijoDisponible[] }) => {
        if (cancelado || !resp.success) return;
        setActivos(resp.data);
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [idMina]);

  // Cargar lotes cuando cambia almacen o producto
  useEffect(() => {
    if (!idAlmacen || !idProducto) {
      setLotes([]);
      setIdLoteProducto(null);
      return;
    }
    let cancelado = false;
    setLoadingLotes(true);
    AuxService.get_lotes_disponibles(Number(idAlmacen), [Number(idProducto)])
      .then((resp) => {
        if (cancelado || !resp.success) return;
        setLotes(resp.data);
        if (resp.data.length > 0) {
          const first = [...resp.data].sort(
            (a, b) => Number(b.stock_actual_base) - Number(a.stock_actual_base),
          )[0];
          setIdLoteProducto(String(first.id_lote));
        } else {
          setIdLoteProducto(null);
        }
      })
      .finally(() => {
        if (!cancelado) setLoadingLotes(false);
      });
    return () => {
      cancelado = true;
    };
  }, [idAlmacen, idProducto]);

  // Cuando cambia el producto, autocompletar la unidad base si el usuario no
  // la ha seleccionado manualmente.
  useEffect(() => {
    if (!idProducto) return;
    const prod = productos.find((p) => p.value === idProducto);
    if (!prod) return;
    if (idUnidadMedida === null || idUnidadMedida === prod.id_unidad_medida_base) {
      setIdUnidadMedida(prod.id_unidad_medida_base);
    }
  }, [idProducto, productos, idUnidadMedida]);

  // Cuando cambia producto o unidad_medida, recalcular contenidoPorPresentacion
  // buscando conversion (base -> seleccionada).
  useEffect(() => {
    if (!idProducto || !idUnidadMedida) {
      setContenidoPorPresentacion("");
      return;
    }
    const prod = productos.find((p) => p.value === idProducto);
    if (!prod) return;
    const baseId = prod.id_unidad_medida_base;
    if (baseId === idUnidadMedida) {
      setContenidoPorPresentacion(1);
      return;
    }
    const unidad = unidades.find(
      (u) => String(u.id_unidad_medida) === idUnidadMedida,
    );
    if (!unidad?.conversiones) {
      setContenidoPorPresentacion("");
      return;
    }
    const conv = unidad.conversiones.find(
      (c) => String(c.id_unidad_origen) === baseId,
    );
    if (conv) {
      setContenidoPorPresentacion(conv.factor_conversion);
    } else {
      setContenidoPorPresentacion("");
    }
  }, [idProducto, idUnidadMedida, productos, unidades]);

  const productoSel = productos.find((p) => p.value === idProducto);
  const unidadBase = productoSel
    ? unidades.find(
        (u) => String(u.id_unidad_medida) === productoSel.id_unidad_medida_base,
      )
    : null;
  const unidadSel = unidades.find(
    (u) => String(u.id_unidad_medida) === idUnidadMedida,
  );

  const contenidoDisplay = useMemo(() => {
    if (!idProducto || !idUnidadMedida) return "MT x CM";
    const base = unidadBase?.abreviatura ?? "?";
    const sel = unidadSel?.abreviatura ?? "?";
    return `${base} x ${sel}`;
  }, [idProducto, idUnidadMedida, unidadBase, unidadSel]);

  const cantidadConsumoNum =
    cantidadConsumo === "" ? 0 : Number(cantidadConsumo);
  const cppNum =
    contenidoPorPresentacion === "" ? 0 : Number(contenidoPorPresentacion);
  const cantidadBaseCalc = cantidadConsumoNum * cppNum;

  const submit = async () => {
    if (!idAlmacen) {
      notifyError("Seleccione un almacen.");
      return;
    }
    if (!idProducto) {
      notifyError("Seleccione un producto.");
      return;
    }
    if (!idLoteProducto) {
      notifyError("No hay lote disponible para este producto en el almacen.");
      return;
    }
    if (!idUnidadMedida) {
      notifyError("Seleccione la unidad de medida.");
      return;
    }
    if (cantidadConsumoNum <= 0) {
      notifyError("Ingrese una cantidad valida.");
      return;
    }
    if (cppNum <= 0) {
      notifyError("El contenido por presentacion debe ser mayor a 0.");
      return;
    }

    const idActivoFinal =
      id_activo_fijo_inicial ??
      (idActivoFijoConsumidor ? Number(idActivoFijoConsumidor) : 0);

    setSubmitting(true);
    try {
      const resp = await ControlConsumoService.registrarConsumoDirecto({
        id_activo_fijo_consumidor: idActivoFinal,
        id_producto: Number(idProducto),
        id_almacen: Number(idAlmacen),
        id_lote_producto: Number(idLoteProducto),
        id_unidad_medida: Number(idUnidadMedida),
        cantidad_consumo: cantidadConsumoNum,
        contenido_por_presentacion: cppNum,
        cantidad_base: cantidadBaseCalc,
        uuid_control_uso_activo,
        comentario: comentario.trim() || null,
        estado: "Consumo Total",
      });
      if (resp.success) {
        notifySuccess("Consumo de combustible registrado correctamente.");
        if (onSuccess) onSuccess();
        close();
      } else {
        notifyError(resp.message || "Error al registrar el consumo.");
      }
    } catch (err) {
      console.error(err);
      notifyError("Error de conexion al registrar el consumo.");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    label: "text-zinc-300 mb-1 font-semibold text-xs ml-0.5",
    dropdown:
      "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
    option:
      "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors",
  };

  const hayLotes = lotes.length > 0;
  const productoLabel = productos.find((p) => p.value === idProducto)?.label ?? "";

  return (
    <Stack gap="md">
      {/* Resumen del grupo de control de uso */}
      <Card
        withBorder
        padding="sm"
        radius="lg"
        className="bg-indigo-950/20 border-indigo-500/30"
      >
        <Group gap={8} align="center">
          <BeakerIcon className="w-4 h-4 text-indigo-300" />
          <Text size="xs" fw={800} className="uppercase text-indigo-200">
            Registro de Consumo directo
          </Text>
          <Badge size="xs" color="indigo" variant="light" radius="sm">
            uuid {uuid_control_uso_activo.slice(0, 8)}...
          </Badge>
        </Group>
        {id_activo_fijo_inicial ? (
          <Text size="11px" c="indigo.3" mt={4}>
            Activo consumidor: #{id_activo_fijo_inicial}
          </Text>
        ) : null}
      </Card>

      {/* Activo fijo consumidor (solo si no se paso uno inicial) */}
      {!id_activo_fijo_inicial && (
        <Select
          label="Activo fijo consumidor *"
          placeholder="Seleccione activo"
          data={(() => {
            const groupsMap = new Map<
              string,
              Array<{ value: string; label: string }>
            >();
            activos.forEach((a) => {
              let arr = groupsMap.get(a.producto);
              if (!arr) {
                arr = [];
                groupsMap.set(a.producto, arr);
              }
              arr.push({
                value: String(a.id_activo),
                label: `${a.correlativo}${a.mina ? ` - ${a.mina}` : ""}`,
              });
            });
            return Array.from(groupsMap.entries()).map(([producto, items]) => ({
              group: producto,
              items,
            }));
          })()}
          value={idActivoFijoConsumidor}
          onChange={(val) => setIdActivoFijoConsumidor(val ?? null)}
          searchable
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
      )}

      {/* Mina (opcional) */}
      <Select
        label="Mina (opcional)"
        placeholder="Todas las minas"
        data={minas.map((m) => ({ value: String(m.id_mina), label: m.nombre }))}
        value={idMina}
        onChange={(val) => setIdMina(val ?? null)}
        searchable
        clearable
        classNames={fieldClasses}
        radius="lg"
        size="sm"
      />

      {/* Almacen */}
      <Select
        label="Almacen *"
        placeholder={
          loadingAlmacenes
            ? "Cargando almacenes..."
            : idMina
              ? "Seleccione almacen"
              : "Todas las minas (sin filtro)"
        }
        data={almacenes}
        value={idAlmacen}
        onChange={(val) => {
          setIdAlmacen(val ?? null);
          setIdLoteProducto(null);
        }}
        searchable
        disabled={loadingAlmacenes}
        required
        classNames={fieldClasses}
        radius="lg"
        size="sm"
      />

      {/* Producto */}
      <Select
        label="Producto *"
        placeholder="Seleccione producto"
        data={productos}
        value={idProducto}
        onChange={(val) => setIdProducto(val ?? null)}
        searchable
        required
        classNames={fieldClasses}
        radius="lg"
        size="sm"
      />

      {/* Cantidad */}
      <NumberInput
        label="Cantidad"
        placeholder="Ej: 5.5"
        value={cantidadConsumo}
        onChange={(val) => setCantidadConsumo(val as number | "")}
        min={0}
        decimalScale={6}
        required
        classNames={fieldClasses}
        radius="lg"
        size="sm"
      />

      {/* Unidad de Medida */}
      <Select
        label="Unidad de Medida *"
        placeholder="Seleccione unidad"
        data={unidades.map((u) => ({
          value: String(u.id_unidad_medida),
          label: `${u.nombre} (${u.abreviatura})`,
        }))}
        value={idUnidadMedida}
        onChange={(val) => setIdUnidadMedida(val ?? null)}
        searchable
        required
        classNames={fieldClasses}
        radius="lg"
        size="sm"
      />

      {/* Contenido por presentacion como display MT x CM */}
      <Card
        withBorder
        padding="sm"
        radius="lg"
        className="bg-zinc-900/50 border-zinc-800"
      >
        <Group justify="space-between" align="center" mb={4}>
          <Text
            size="9px"
            c="zinc.500"
            fw={900}
            tt="uppercase"
            lts="0.08em"
          >
            Contenido por presentacion (MT x CM)
          </Text>
          {productoLabel ? (
            <Badge size="xs" color="lime" variant="light" radius="sm">
              {productoLabel}
            </Badge>
          ) : null}
        </Group>
        <Group justify="center" gap="sm">
          <Text
            size="xl"
            fw={900}
            className="text-indigo-300 font-mono tracking-wide"
          >
            {contenidoDisplay}
          </Text>
        </Group>
        <Text
          size="9px"
          c="dimmed"
          ta="center"
          mt={4}
        >
          {unidadBase && unidadSel
            ? `1 ${unidadBase.abreviatura} = ${contenidoPorPresentacion || "?"} ${unidadSel.abreviatura}`
            : "MT = medida tanque (base), CM = consumo medido"}
        </Text>
      </Card>

      {/* Lote */}
      <Select
        label="Lote (Producto)"
        placeholder={
          !idAlmacen || !idProducto
            ? "Seleccione almacen y producto"
            : loadingLotes
              ? "Cargando lotes..."
              : hayLotes
                ? "Seleccione lote"
                : "Sin lotes disponibles para este producto en el almacen"
        }
        data={lotes.map((l) => ({
          value: String(l.id_lote),
          label: `${l.correlativo} - stock: ${l.stock_actual_base}`,
        }))}
        value={idLoteProducto}
        onChange={(val) => setIdLoteProducto(val ?? null)}
        searchable
        disabled={!idAlmacen || !idProducto || !hayLotes || loadingLotes}
        required
        classNames={fieldClasses}
        radius="lg"
        size="sm"
        rightSection={
          hayLotes ? null : (
            <Tooltip label="Sin lotes">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 mr-1" />
            </Tooltip>
          )
        }
      />

      {/* Comentario */}
      <Textarea
        label="Comentario (opcional)"
        placeholder="Notas del consumo..."
        value={comentario}
        onChange={(e) => setComentario(e.currentTarget.value)}
        classNames={fieldClasses}
        radius="lg"
        size="sm"
        minRows={2}
      />

      {/* Resumen calculo */}
      <Card
        withBorder
        padding="sm"
        radius="lg"
        className="bg-amber-950/10 border-amber-500/30"
      >
        <Group justify="space-between">
          <Text size="xs" fw={700} className="text-amber-300 uppercase">
            Cantidad base (descuento de stock)
          </Text>
          <Text size="md" fw={800} className="text-amber-200 font-mono">
            {cantidadBaseCalc.toFixed(6)}
          </Text>
        </Group>
        <Text size="9px" c="dimmed" mt={4}>
          cantidad_consumo x contenido_por_presentacion = {cantidadConsumoNum} x{" "}
          {cppNum || "?"}
        </Text>
      </Card>

      {/* Botones */}
      <Group justify="flex-end" gap="sm" mt="sm">
        <Button
          variant="default"
          size="sm"
          radius="lg"
          onClick={close}
          disabled={submitting}
          className="bg-zinc-800! text-zinc-300! border-zinc-700!"
        >
          Cancelar
        </Button>
        <Button
          color="indigo.6"
          size="sm"
          radius="lg"
          loading={submitting}
          onClick={submit}
          leftSection={<BeakerIcon className="w-4 h-4" />}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-900/20"
        >
          Registrar Consumo
        </Button>
      </Group>
    </Stack>
  );
};
