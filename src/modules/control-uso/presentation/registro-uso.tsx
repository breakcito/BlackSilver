import {
  Button,
  Group,
  Grid,
  NumberInput,
  Stack,
  Textarea,
  Text,
  Badge,
  Card,
  SimpleGrid,
  Select,
  SegmentedControl,
  Center,
  Box,
  ActionIcon,
  Tooltip,
  Checkbox,
  Alert,
  Loader,
} from "@mantine/core";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useState, useEffect, useMemo, useRef } from "react";
import { useNotify } from "../../../hooks/useNotify";
import { ControlUsoService } from "../service/control-uso.service";
import { AuxService } from "../../../service/auxiliar.service";
import type { RES_LoteMineral } from "../../../service/responses/lote-mineral";
import { MinasService } from "../../../modules/minas-labores/service/minas.service";
import { ClientesService } from "../../../modules/clientes/service/clientes.service";
import type { RES_ControlUsoLog, RES_Tarifa } from "../service/control-uso.responses";
import type { RES_ActivoFijoDisponible } from "../../../service/responses/activo-fijo";
import type { RES_LoteDisponible } from "../../../service/responses/lote-producto";
import type { RES_Producto } from "../../../service/responses/producto";
import type { RES_UnidadMedida } from "../../../service/responses/unidad-medida";
import {
  Cog8ToothIcon,
  TruckIcon,
  ArrowPathRoundedSquareIcon,
  MapPinIcon,
  BriefcaseIcon,
  PlusIcon,
  QueueListIcon,
  PlusCircleIcon,
  TrashIcon,
   ClockIcon,
   BanknotesIcon,
   PencilSquareIcon,
   BeakerIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { TimeInput } from "@mantine/dates";
import "@mantine/dates/styles.css";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import { NuevaTarifaModal } from "./nueva-tarifa-modal";
import { CustomDatePicker } from "../../../presentation/utils/date-picker-input";
import { TipoTurno } from "../../../shared/enums/_generic/tipo-turno";
import { enPlural } from "../../../shared/functions/en-plural";
import { formatNumber } from "../../../shared/functions/formatNumber";

interface Props {
  asset: RES_ActivoFijoDisponible;
  tipoControl: "horometro" | "odometro" | "vueltas";
  onSuccess: (nuevosLogs: RES_ControlUsoLog[]) => void;
  onCancel: () => void;
}

interface ItemConsumoForm {
  id: string;
  idProducto: string | null;
  idAlmacen: string | null;
  idLoteProducto: string | null;
  idUnidadMedida: string | null;
  cantidadConsumo: number | "";
  contenidoPorPresentacion: number | "";
  idLoteMineral: string | null;
  idLaborDestino: string | null;
  paraProduccion: boolean;
  paraMantenimiento: boolean;
  comentario: string;
  estado: "Consumo Parcial" | "Consumo Total";
}

interface ItemForm {
  id: string;
  usarHoras: boolean;
  usarHorometro: boolean;
  horaInicioStr: string;
  horaFinStr: string;
  lecturaInicio: number | "";
  lecturaFin: number | "";
  tipoTurno: TipoTurno | "";
  observacion: string;
  /**
   * Antes cada Bloque tenia su propio `consumos[]`. Ahora los consumos
   * son COMPARTIDOS por todo el "Registrar Control por Horometro"
   * (representan salidas de stock del activo en general, no asociadas
   * a un tramo horario puntual). Ver `consumos` en el form raiz.
   */
}

interface ItemVueltasForm {
  id: string;
  idTarifa: string | null;
  cantidadVueltas: number | "";
  cantidadSacos: number | "";
  horometroInicio: number | "";
  horometroFin: number | "";
  tipoTurno: TipoTurno | "";
  /**
   * Fecha del trabajo por bloque (cada viaje puede caer en dia
   * distinto). Si esta vacio, el submit no envia el campo y el backend
   * devuelve error para ese item.
   */
  fechaTrabajo: string;
  observacion: string;
}

const generarIdItem = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 9);

export const RegistroUso = ({
  asset,
  tipoControl,
  onSuccess,
  onCancel,
}: Props) => {
  const { notifyError } = useNotify();
  const idActivoFijo = asset.id_activo;

  const fieldClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    label: "text-zinc-300 mb-1 font-medium",
  };

  // Cabecera compartida por todos los tipos de control
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tarifas, setTarifas] = useState<RES_Tarifa[]>([]);
const [minas, setMinas] = useState<{ value: string; label: string }[]>([]);
  const [labores, setLabores] = useState<{ value: string; label: string }[]>([]);
  const [lotesMineral, setLotesMineral] = useState<RES_LoteMineral[]>([]);
  const [clientes, setClientes] = useState<{ value: string; label: string }[]>([]);
  // Catálogos para consumos directos (solo horometro).
  // Guardamos el RES_Producto completo para tener acceso a
  // `id_unidad_medida_base`, `unidad_medida_base_abv`, etc.
  const [productos, setProductos] = useState<RES_Producto[]>([]);
  const [almacenesConsumo, setAlmacenesConsumo] = useState<
    { value: string; label: string }[]
  >([]);
  const [unidadesMedida, setUnidadesMedida] = useState<RES_UnidadMedida[]>([]);
  // Lotes que ve el modal actual (segun idAlmacen + idProducto del form).
  const [lotesModal, setLotesModal] = useState<RES_LoteDisponible[]>([]);
  const [loadingLotesModal, setLoadingLotesModal] = useState(false);

  const [loadingLabores, setLoadingLabores] = useState(false);

  const [esParaMina, setEsParaMina] = useState<boolean>(true);
  const [idMina, setIdMina] = useState<string | null>(null);
  const [idLabor, setIdLabor] = useState<string | null>(null);
  const [idLoteMineral, setIdLoteMineral] = useState<string | null>(null);
  const [idCliente, setIdCliente] = useState<string | null>(null);
  const [tipoCarga, setTipoCarga] = useState<string | null>(null);
  const [idTarifa, setIdTarifa] = useState<string | null>(null);

  const [modalTarifaOpened, setModalTarifaOpened] = useState(false);
  const [modalHistorialOpened, setModalHistorialOpened] = useState(false);
  const [erroresItems, setErroresItems] = useState<string[]>([]);

  /**
   * UUID unico por invocacion de "Registrar Control por Horometro".
   * Agrupa TODOS los items + consumos que nacen en este llamado y se
   * envia como `uuid_control_uso_activo` en cada consumo del payload
   * bulk. Asi el modulo de Listar Consumo puede agruparlos por la
   * sesion completa (un "Registrar Control" = un grupo). Se genera
   * una sola vez al montar el componente y se mantiene estable durante
   * toda la sesion de edicion.
   */
  const [uuidGrupoControlUso] = useState<string>(() => generarIdItem());

  // Modal para agregar/editar consumos directos por bloque.
  const [consumoModalOpen, setConsumoModalOpen] = useState(false);
  const [consumoEditId, setConsumoEditId] = useState<string | null>(null);
  /**
   * Consumos COMPARTIDOS por todo el "Registrar Control por Horometro".
   * Antes cada `ItemForm.consumos[]` cargaba su propia lista (asociada
   * al bloque); ahora la lista vive a nivel del formulario completo, ya
   * que un mismo consumo (p. ej. 50 galones de combustible) cubre a
   * todos los bloques horometrados del grupo UUID.
   */
  const [consumos, setConsumos] = useState<ItemConsumoForm[]>([]);
  const [consumoForm, setConsumoForm] = useState<{
    idProducto: string | null;
    idAlmacen: string | null;
    idLoteProducto: string | null;
    idUnidadMedida: string | null;
    cantidadConsumo: number | "";
    contenidoPorPresentacion: number | "";
    comentario: string;
  }>({
    idProducto: "12",
    idAlmacen: null,
    idLoteProducto: null,
    idUnidadMedida: null,
    cantidadConsumo: "",
    contenidoPorPresentacion: 1,
    comentario: "",
  });

  // ===== Estados single (odometro) =====
  const [fechaDia, setFechaDia] = useState<Date | null>(new Date());

  const [lecturaInicio, setLecturaInicio] = useState<number | "">(() =>
    tipoControl === "odometro" ? 0 : "",
  );
  const [lecturaFin, setLecturaFin] = useState<number | "">(() =>
    tipoControl === "odometro" ? 0 : "",
  );
  const [observacion, setObservacion] = useState("");

  // ===== Estados bulk (horometro, vueltas) =====
// Inicializamos con el primer bloque ya creado SEGÚN el tipoControl,
// para que el modal renderice inmediato sin esperar a la API de catalogos.
// Los catalogos y el pre-fill de ultima lectura se cargan en background.
  const [items, setItems] = useState<ItemForm[]>(() => {
    if (tipoControl === "horometro") {
      return [
        {
          id: generarIdItem(),
          usarHoras: false,
          usarHorometro: false,
          horaInicioStr: "",
          horaFinStr: "",
          lecturaInicio: "",
          lecturaFin: "",
          tipoTurno: "",
          observacion: "",
        },
      ];
    }
    return [];
  });
  const [itemsVueltas, setItemsVueltas] = useState<ItemVueltasForm[]>(() => {
    if (tipoControl === "vueltas") {
      const hoy = dayjs().format("YYYY-MM-DD");
      return [
        {
          id: generarIdItem(),
          idTarifa: null,
          cantidadVueltas: 0,
          cantidadSacos: "",
          horometroInicio: "",
          horometroFin: "",
          tipoTurno: "",
          fechaTrabajo: hoy,
          observacion: "",
        },
      ];
    }
    return [];
  });
  const refInicioRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const refFinRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const selectedTarifa = useMemo(() => {
    return tarifas.find((t) => t.id.toString() === idTarifa) || null;
  }, [idTarifa, tarifas]);

  const precioUnitario = selectedTarifa ? Number(selectedTarifa.precio_unitario) : 0;

  // Detecta si la tarifa seleccionada es de material Saco (sin precio) - usado en vueltas
  const esTarifaSaco = selectedTarifa
    ? (selectedTarifa.tipo_material || "").toLowerCase().includes("saco")
    : false;

  // Load initial data: cabecera + datos especificos segun tipoControl
  useEffect(() => {
    if (!idActivoFijo) return;

    const fetchData = async () => {
      setLoadingData(true);
      try {
        // Tarifas
        const respTarifas = await ControlUsoService.getTarifas(idActivoFijo);
        if (respTarifas.success) {
          setTarifas(respTarifas.data);

          const tarifasDeTipo = respTarifas.data.filter(
            (t) => t.tipo_control === tipoControl,
          );
          if (tarifasDeTipo.length > 0) {
            const lastTarifa = tarifasDeTipo.reduce((prev, current) =>
              prev.id > current.id ? prev : current,
            );
            setIdTarifa(lastTarifa.id.toString());
          } else {
            setIdTarifa(null);
          }
        }

        // Minas
        const respMinas = await AuxService.get_minas();
        if (respMinas.success) {
          setMinas(
            respMinas.data.map((m: { id_mina: string | number; nombre: string }) => ({
              value: m.id_mina.toString(),
              label: m.nombre,
            })),
          );
        }

        // Clientes
        const respClientes = await ClientesService.getClientes();
        if (Array.isArray(respClientes)) {
          setClientes(
            respClientes.map((c: { id_cliente: string | number; razon_social: string }) => ({
              value: c.id_cliente.toString(),
              label: c.razon_social,
            })),
          );
        }

        // Lotes Mineral
        const respLotes = await AuxService.get_lotes_mineral();
        if (respLotes.success) {
          setLotesMineral(respLotes.data);
        }

        // Catálogos para consumos directos (solo se usan si tipoControl = horometro)
        if (tipoControl === "horometro") {
          const [respProductos, respAlmacenes, respUnidades] =
            await Promise.all([
              AuxService.get_productos(),
              AuxService.get_almacenes(),
              // `incluir_conversiones: true` para que cada unidad_medida
              // traiga su array `conversiones` y podamos autocompletar
              // `contenido_por_presentacion` cuando la unidad solicitada
              // difiera de la base del producto.
              AuxService.get_unidades_medida({ incluir_conversiones: true }),
            ]);
          if (respProductos.success) {
            setProductos(respProductos.data);
          }
          if (respAlmacenes.success) {
            setAlmacenesConsumo(
              respAlmacenes.data.map((a) => ({
                value: String(a.id_almacen),
                label: a.nombre,
              })),
            );
          }
          if (respUnidades.success) {
            setUnidadesMedida(respUnidades.data);
          }
        }

        // Pre-fill no bloqueante de la última lectura (horometro / odometro).
        // El primer bloque ya está creado por useState initializer, así que la
        // llegada de la API solo rellenará el campo si el usuario no ha escrito
        // nada en él (no pisa edición manual).
        if (tipoControl === "horometro") {
          ControlUsoService.getUltimoHorometro(idActivoFijo)
            .then((resp) => {
              if (!resp.success) return;
              const raw = resp.data.ultimo_horometro;
              const sugerido = typeof raw === "number" ? raw : null;
              if (sugerido === null || sugerido === 0) return;
              setItems((prev) => {
                if (prev.length === 0) return prev;
                if (prev[0].lecturaInicio !== "") return prev;
                return [
                  { ...prev[0], lecturaInicio: sugerido },
                  ...prev.slice(1),
                ];
              });
            })
            .catch(() => undefined);
        } else if (tipoControl === "odometro") {
          ControlUsoService.getUltimoOdometro(idActivoFijo)
            .then((resp) => {
              if (!resp.success) return;
              const v = resp.data.ultimo_odometro;
              setLecturaInicio((curr) => (curr === 0 ? v : curr));
              setLecturaFin((curr) => (curr === 0 ? 0 : curr));
            })
            .catch(() => undefined);
        }
      } catch (err) {
        console.error(err);
        notifyError("Error cargando datos iniciales");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [idActivoFijo, tipoControl, notifyError]);

  // Cuando cambia la mina, cargar labores (con lock "cargando..." hasta que llegue la respuesta).
  // Usa cancelacion para evitar race conditions si el usuario cambia de mina rapido.
  useEffect(() => {
    if (!idMina) {
      setLabores([]);
      setIdLabor(null);
      setLoadingLabores(false);
      return;
    }
    let cancelado = false;
    setLoadingLabores(true);
    setLabores([]);
    MinasService.getLabores(Number(idMina))
      .then((resp) => {
        if (cancelado) return;
        if (resp.success) {
          setLabores(
            resp.data.map(
              (l: { id_labor: string | number; nombre: string | null }) => ({
                value: l.id_labor.toString(),
                label: l.nombre || "Sin nombre",
              }),
            ),
          );
        }
      })
      .catch((e) => {
        if (!cancelado) console.error(e);
      })
      .finally(() => {
        if (!cancelado) setLoadingLabores(false);
      });
    return () => {
      cancelado = true;
    };
  }, [idMina]);

  /**
   * Carga los lotes del modal segun (idAlmacen, idProducto) actuales del form.
   * Si solo hay una combinacion valida, autoselecciona el primer lote con
   * mayor stock_actual_base para que el usuario no tenga que adivinar.
   * Si NO hay lotes para el producto en ese almacen, deja `lotesModal` vacio
   * para que el modal muestre el mensaje "No disponible en almacen".
   */
  useEffect(() => {
    if (!consumoModalOpen) {
      setLotesModal([]);
      return;
    }
    const idAlm = consumoForm.idAlmacen ? Number(consumoForm.idAlmacen) : null;
    const idProd = consumoForm.idProducto
      ? Number(consumoForm.idProducto)
      : null;
    if (!idAlm || !idProd) {
      setLotesModal([]);
      setLoadingLotesModal(false);
      return;
    }
    let cancelado = false;
    setLoadingLotesModal(true);
    AuxService.get_lotes_disponibles(idAlm, [idProd])
      .then((resp) => {
        if (cancelado || !resp.success) return;
        const ordenados = [...resp.data].sort(
          (a, b) =>
            Number(b.stock_actual_base ?? 0) - Number(a.stock_actual_base ?? 0),
        );
        setLotesModal(ordenados);
        // Autoselecciona el primer lote (mayor stock) si el form aun no
        // tiene un idLoteProducto o si el actual ya no esta disponible.
        setConsumoForm((prev) => {
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
      })
      .catch(() => {
        if (!cancelado) setLotesModal([]);
      })
      .finally(() => {
        if (!cancelado) setLoadingLotesModal(false);
      });
    return () => {
      cancelado = true;
    };
  }, [
    consumoForm.idAlmacen,
    consumoForm.idProducto,
    consumoModalOpen,
  ]);

  /**
* Auto-completar `contenidoPorPresentacion` cuando cambia el producto
    * o la unidad de medida en el modal del consumo directo.
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
    * MISMO lookup que `useRegistroRequerimiento.ts` ("Nuevo Requerimiento").
    * La convencion del backend es:
    * - "1 destino = factor origens"  =>  "1 origen = 1/factor destinos".
    * - En la respuesta de `get_unidades_medida({incluir_conversiones})`,
    *   la unidad consultada aparece como `id_unidad_origen` y la
    *   relacionada como `id_unidad_destino`.
    *
    * Solo aplica cuando el modal esta abierto. Ademas solo "tocamos"
    * el campo si su valor previo es "" o 1 (defaults), para no pisar
    * lo que el usuario haya tipeado a mano.
    */
  useEffect(() => {
    if (!consumoModalOpen) return;
    if (!consumoForm.idProducto || !consumoForm.idUnidadMedida) return;
    const prod = productos.find(
      (p) => String(p.id_producto) === String(consumoForm.idProducto),
    );
    if (!prod) return;
    const baseId = String(prod.id_unidad_medida_base);
    const selId = String(consumoForm.idUnidadMedida);
    // Unidades identicas -> contenido = 1 (siempre)
    if (baseId === selId) {
      setConsumoForm((prev) =>
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
    setConsumoForm((prev) => {
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
    consumoForm.idProducto,
    consumoForm.idUnidadMedida,
    consumoModalOpen,
    productos,
    unidadesMedida,
  ]);

  /**
   * Al cambiar de producto en el modal, autocompletar la unidad base del
   * producto seleccionado (el usuario la puede cambiar despues). Solo aplica
   * cuando el modal esta abierto.
   */
  useEffect(() => {
    if (!consumoModalOpen) return;
    if (!consumoForm.idProducto) return;
    const prod = productos.find(
      (p) => String(p.id_producto) === String(consumoForm.idProducto),
    );
    if (!prod) return;
    const baseStr = String(prod.id_unidad_medida_base);
    // Solo si la unidad actual no es la base ni una conversion valida,
    // forzamos la base. Esto evita pisar la seleccion manual del usuario.
    if (
      consumoForm.idUnidadMedida === null ||
      consumoForm.idUnidadMedida === baseStr
    ) {
      setConsumoForm((prev) =>
        prev.idUnidadMedida === baseStr
          ? prev
          : { ...prev, idUnidadMedida: baseStr },
      );
    }
  }, [
    consumoForm.idProducto,
    consumoForm.idUnidadMedida,
    consumoModalOpen,
    productos,
  ]);

  /**
   * Sincroniza el `idAlmacen` del modal con `almacenesConsumo` (que
   * refleja la mina actualmente seleccionada en el form padre). Reglas:
   * - Si el idAlmacen actualmente seleccionado ya NO esta en la lista
   *   (la mina cambio y ese almacen pertenece a otra mina), se limpia
   *   para forzar al usuario a re-seleccionar uno valido.
   * - Si el idAlmacen es null y solo hay UN almacen disponible para la
   *   mina actual, se auto-selecciona para mantener la consistencia
   *   mina -> almacen (igual que `openConsumoModal` al abrir el modal).
   * - Si hay varios almacenes, el usuario elige manualmente.
   */
  useEffect(() => {
    if (!consumoModalOpen) return;

    // Caso 1: el seleccionado quedo invalido por un cambio de mina ->
    // limpiar para forzar al usuario a re-seleccionar.
    if (
      consumoForm.idAlmacen !== null &&
      !almacenesConsumo.some((a) => a.value === consumoForm.idAlmacen)
    ) {
      setConsumoForm((prev) => ({ ...prev, idAlmacen: null }));
      return;
    }

    // Caso 2: no hay seleccionado y solo hay un almacen -> auto-seleccionar
    // para mantener la consistencia con la mina elegida.
    if (consumoForm.idAlmacen === null && almacenesConsumo.length === 1) {
      const unico = almacenesConsumo[0].value;
      setConsumoForm((prev) =>
        prev.idAlmacen === unico ? prev : { ...prev, idAlmacen: unico },
      );
    }
  }, [almacenesConsumo, consumoModalOpen, consumoForm.idAlmacen]);

  /**
   * Defaults de los checks segun la mina (solo horometro).
   * - Algamarca → autocompletar Usar Horas
   * - Sayapullo → autocompletar Usar Horometro
   * - Otra mina → ninguno autocompletado
   * Comparacion case-insensitive sobre el nombre de la mina.
   * El usuario puede togglear manualmente, los defaults se reaplican
   * si cambia la mina.
   */
  const getDefaultsForMina = (
    nombreMina: string | null | undefined,
  ): { usarHoras: boolean; usarHorometro: boolean } => {
    if (!nombreMina) return { usarHoras: false, usarHorometro: false };
    const n = nombreMina.trim().toLowerCase();
    if (n === "algamarca") return { usarHoras: true, usarHorometro: false };
    if (n === "sayapullo") return { usarHoras: false, usarHorometro: true };
    return { usarHoras: false, usarHorometro: false };
  };

  // Aplica los defaults segun la mina seleccionada a TODOS los bloques existentes.
  // Solo aplica a horometro y solo cuando hay bloques ya creados (no en init vacio).
  useEffect(() => {
    if (tipoControl !== "horometro") return;
    if (!idMina) return;
    if (items.length === 0) return;
    const nombre = minas.find((m) => m.value === idMina)?.label ?? null;
    const defaults = getDefaultsForMina(nombre);
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        usarHoras: defaults.usarHoras,
        usarHorometro: defaults.usarHorometro,
        // Si el default apaga un check, limpia sus valores para no enviar basura.
        horaInicioStr: defaults.usarHoras ? it.horaInicioStr : "",
        horaFinStr: defaults.usarHoras ? it.horaFinStr : "",
        lecturaInicio: defaults.usarHorometro ? it.lecturaInicio : "",
        lecturaFin: defaults.usarHorometro ? it.lecturaFin : "",
      })),
    );
    setErroresItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idMina, tipoControl]);

  /**
   * Recarga los almacenes para el select de consumos cuando cambia la mina.
   * Si solo hay un almacen asociado a la mina, lo autoselecciona (el usuario
   * puede cambiarlo manualmente). Como los consumos ahora son compartidos,
   * actualizamos la lista `consumos` raiz (no por bloque).
   */
  useEffect(() => {
    if (tipoControl !== "horometro") return;
    if (!idMina) {
      setAlmacenesConsumo([]);
      return;
    }
    let cancelado = false;
    AuxService.get_almacenes({ id_mina: Number(idMina) })
      .then((resp) => {
        if (cancelado || !resp.success) return;
        const opts = resp.data.map((a) => ({
          value: String(a.id_almacen),
          label: a.nombre,
        }));
        setAlmacenesConsumo(opts);
        // Autoselecciona si solo hay un almacen y el front no tiene uno ya.
        // No pisamos la seleccion manual del usuario.
        if (opts.length === 1) {
          setConsumos((prev) =>
            prev.map((cs) =>
              cs.idAlmacen ? cs : { ...cs, idAlmacen: opts[0].value },
            ),
          );
        }
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [idMina, tipoControl]);

  // Dynamic naming segun tipo (single)
  const labelLectura = tipoControl === "horometro" ? "Horometro" : tipoControl === "odometro" ? "Odometro" : "Vueltas";
  const labelDiferencia = tipoControl === "vueltas" ? "Vueltas" : tipoControl === "horometro" ? "Horas" : "Km";
  const unitMeasure = tipoControl === "vueltas" ? "vuelta(s)" : tipoControl === "horometro" ? "hrs" : "Km";

  /**
   * Formatea horas totales para el display:
   * - Trunca a 2 decimales (no redondea), de modo que el valor mostrado
   *   refleja el piso real, no un redondeo al alza.
   * - Si el valor crudo tiene precision mas alla del 2do decimal, agrega
   *   "…" para avisar al usuario que hay mas detalle sin saturar la pantalla.
   * - Si el valor cabe exacto en 2 decimales, lo muestra limpio.
   */
  const formatHorasDisplay = (v: number): string => {
    if (!Number.isFinite(v) || v === 0) return "0.00";
    const trunc = Math.trunc(v * 100) / 100;
    const remainder = Math.abs(v - trunc);
    const hayMas = remainder > 1e-9;
    let s = trunc.toFixed(2);
    if (hayMas) s += "\u2026";
    return s;
  };

  // Calculo totalUso single (solo se usa para odometro; las ramas bulk calculan por item)
  const totalUso = useMemo(() => {
    if (tipoControl === "odometro") {
      return Math.max(0, (Number(lecturaFin) || 0) - (Number(lecturaInicio) || 0));
    }
    return 0;
  }, [
    tipoControl,
    lecturaInicio,
    lecturaFin,
  ]);

  const costoTotal = useMemo(() => {
    return totalUso * precioUnitario;
  }, [totalUso, precioUnitario]);

  // Calculos por item (bulk horometro)
  // Prioridad: si usarHoras está activo y los campos están completos, usa Horas.
  // Si no, si usarHorometro está activo y los campos están completos, usa Horometro.
  // Si ninguno aplica, totalHoras = 0.
  const calculosPorItem = useMemo(() => {
    return items.map((it) => {
      const usarHoras =
        it.usarHoras && !!it.horaInicioStr && !!it.horaFinStr;
      const usarHorometro =
        it.usarHorometro &&
        it.lecturaInicio !== "" &&
        it.lecturaFin !== "";

      if (usarHoras && fechaDia) {
        const baseDate = dayjs(fechaDia).format("YYYY-MM-DD");
        const dtInicio = dayjs(`${baseDate} ${it.horaInicioStr}`);
        let dtFin = dayjs(`${baseDate} ${it.horaFinStr}`);
        if (!dtInicio.isValid() || !dtFin.isValid()) {
          return { totalHoras: 0, costoTotal: 0 };
        }
        if (dtFin.isBefore(dtInicio) || dtFin.isSame(dtInicio)) {
          dtFin = dtFin.add(1, "day");
        }
        const diffSecs = dtFin.diff(dtInicio, "second");
        if (diffSecs <= 0) {
          return { totalHoras: 0, costoTotal: 0 };
        }
        // Sin redondeo prematuro: el float crudo viaja al backend (precision
        // DECIMAL(13,6)) y el display redondea via toLocaleString. Asi el costo
        // se calcula exacto (1 min a 60 -> S/ 1.00, no S/ 1.20).
        const totalHoras = diffSecs / 3600;
        const costoTotalCalc = totalHoras * (precioUnitario || 0);
        return { totalHoras, costoTotal: costoTotalCalc };
      }

      if (usarHorometro) {
        const totalHoras = Math.max(
          0,
          Number(it.lecturaFin) - Number(it.lecturaInicio),
        );
        const costoTotalCalc = totalHoras * (precioUnitario || 0);
        return { totalHoras, costoTotal: costoTotalCalc };
      }

      return { totalHoras: 0, costoTotal: 0 };
    });
  }, [items, fechaDia, precioUnitario]);

  const totalGeneral = useMemo(() => {
    return calculosPorItem.reduce(
      (acc, c) => ({
        horas: acc.horas + (c.totalHoras || 0),
        costo: acc.costo + (c.costoTotal || 0),
      }),
      { horas: 0, costo: 0 },
    );
  }, [calculosPorItem]);

  // Handlers bulk horometro
  const formatHora = (val: string): string => {
    const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(val ?? "");
    return match ? `${match[1]}:${match[2]}` : "";
  };

  const actualizarItem = (
    id: string,
    campo: keyof Omit<ItemForm, "id">,
    valor: string | number | "" | boolean,
  ) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [campo]: valor } : it)),
    );
  };

  const agregarItem = () => {
    const ultimo = items[items.length - 1];
    const horometroSugerido: number | "" =
      ultimo && ultimo.lecturaFin !== "" ? Number(ultimo.lecturaFin) : "";
    const nombreMina = minas.find((m) => m.value === idMina)?.label ?? null;
    const defaults = getDefaultsForMina(nombreMina);
    setItems((prev) => [
      ...prev,
      {
        id: generarIdItem(),
        usarHoras: defaults.usarHoras,
        usarHorometro: defaults.usarHorometro,
        horaInicioStr: defaults.usarHoras ? "" : "",
        horaFinStr: defaults.usarHoras ? "" : "",
        lecturaInicio: defaults.usarHorometro ? horometroSugerido : "",
        lecturaFin: "",
        tipoTurno: "",
        observacion: "",
      },
    ]);
  };

  const openConsumoModal = (consumo?: ItemConsumoForm) => {
    if (consumo) {
      setConsumoEditId(consumo.id);
      setConsumoForm({
        idProducto: consumo.idProducto,
        idAlmacen: consumo.idAlmacen,
        idLoteProducto: consumo.idLoteProducto,
        idUnidadMedida: consumo.idUnidadMedida,
        cantidadConsumo: consumo.cantidadConsumo,
        contenidoPorPresentacion: consumo.contenidoPorPresentacion,
        comentario: consumo.comentario,
      });
    } else {
      setConsumoEditId(null);
      // Auto-selecciona el unico almacen disponible para la mina actual,
      // para evitar inconsistencias (mina y almacen desalineados). Si
      // hay varios, el usuario elige. Si no hay ninguno todavia
      // (catalogos cargando), queda en null y se actualiza reactivamente
      // via el useEffect de sincronizacion de abajo.
      const idAlmacenAuto =
        almacenesConsumo.length === 1 ? almacenesConsumo[0].value : null;
      setConsumoForm({
        idProducto: "12",
        idAlmacen: idAlmacenAuto,
        idLoteProducto: null,
        idUnidadMedida: null,
        cantidadConsumo: "",
        contenidoPorPresentacion: 1,
        comentario: "",
      });
    }
    setConsumoModalOpen(true);
  };

  const guardarConsumoModal = () => {
    if (!consumoForm.idProducto) {
      notifyError("Seleccione un producto.");
      return;
    }
    if (!consumoForm.idAlmacen) {
      notifyError("Seleccione un almacen.");
      return;
    }
    if (!consumoForm.idLoteProducto) {
      notifyError("Seleccione un lote.");
      return;
    }
    if (!consumoForm.idUnidadMedida) {
      notifyError("Seleccione una unidad de medida.");
      return;
    }
    if (
      consumoForm.cantidadConsumo === "" ||
      Number(consumoForm.cantidadConsumo) <= 0
    ) {
      notifyError("Ingrese una cantidad valida.");
      return;
    }
    if (
      consumoForm.contenidoPorPresentacion === "" ||
      Number(consumoForm.contenidoPorPresentacion) <= 0
    ) {
      notifyError("El contenido por presentacion debe ser mayor a 0.");
      return;
    }
    const idConsumo = consumoEditId ?? generarIdItem();
    const nuevoConsumo: ItemConsumoForm = {
      id: idConsumo,
      idProducto: consumoForm.idProducto,
      idAlmacen: consumoForm.idAlmacen,
      idLoteProducto: consumoForm.idLoteProducto,
      idUnidadMedida: consumoForm.idUnidadMedida,
      cantidadConsumo: consumoForm.cantidadConsumo,
      contenidoPorPresentacion: consumoForm.contenidoPorPresentacion,
      idLoteMineral: null,
      idLaborDestino: null,
      paraProduccion: false,
      paraMantenimiento: false,
      comentario: consumoForm.comentario,
      estado: "Consumo Total",
    };
    if (consumoEditId) {
      setConsumos((prev) =>
        prev.map((c) => (c.id === consumoEditId ? nuevoConsumo : c)),
      );
    } else {
      setConsumos((prev) => [...prev, nuevoConsumo]);
    }
    setConsumoModalOpen(false);
  };

  const quitarConsumo = (consumoId: string) => {
    setConsumos((prev) => prev.filter((c) => c.id !== consumoId));
  };

  const quitarItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  };

  // Calculos por item (bulk vueltas)
  const calculosPorItemVueltas = useMemo(() => {
    return itemsVueltas.map((it) => {
      const vueltas = Number(it.cantidadVueltas) || 0;
      const sacos = Number(it.cantidadSacos) || 0;
      const costo = vueltas * (precioUnitario || 0);
      return { vueltas, sacos, costo };
    });
  }, [itemsVueltas, precioUnitario]);

  const totalGeneralVueltas = useMemo(() => {
    return calculosPorItemVueltas.reduce(
      (acc, c) => ({
        vueltas: acc.vueltas + (c.vueltas || 0),
        sacos: acc.sacos + (c.sacos || 0),
        costo: acc.costo + (c.costo || 0),
      }),
      { vueltas: 0, sacos: 0, costo: 0 },
    );
  }, [calculosPorItemVueltas]);

  const actualizarItemVueltas = (
    id: string,
    campo: keyof Omit<ItemVueltasForm, "id">,
    valor: number | "" | string | boolean | null,
  ) => {
    setItemsVueltas((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [campo]: valor } : it)),
    );
  };

  const agregarItemVueltas = () => {
    // Heredamos la fecha del ultimo item para no obligar al usuario a
    // re-tipearla cuando registra varios viajes el mismo dia.
    const ultimo = itemsVueltas[itemsVueltas.length - 1];
    const fechaHeredada = ultimo?.fechaTrabajo || dayjs().format("YYYY-MM-DD");
    setItemsVueltas((prev) => [
      ...prev,
      {
        id: generarIdItem(),
        idTarifa: null,
        cantidadVueltas: 0,
        cantidadSacos: "",
        horometroInicio: "",
        horometroFin: "",
        tipoTurno: "",
        fechaTrabajo: fechaHeredada,
        observacion: "",
      },
    ]);
  };

  const quitarItemVueltas = (id: string) => {
    setItemsVueltas((prev) =>
      prev.length > 1 ? prev.filter((it) => it.id !== id) : prev,
    );
  };

  // Enriquecer un log nuevo con los labels locales de catalogos
  const enriquecerLog = (log: RES_ControlUsoLog): RES_ControlUsoLog => {
    const e = { ...log };
    if (idMina) e.mina = minas.find((m) => m.value === String(idMina))?.label || null;
    if (idLabor) e.labor = labores.find((l) => l.value === String(idLabor))?.label || null;
    if (idLoteMineral)
      e.lote_mineral =
        lotesMineral.find((lm) => String(lm.id_lote_mineral) === String(idLoteMineral))?.codigo || null;
    if (idCliente)
      e.cliente = clientes.find((c) => c.value === String(idCliente))?.label || null;
    return e;
  };

  // Enriquecido adicional para vueltas (tarifa_desc, tipo_material, etc.)
  const enriquecerLogVueltas = (log: RES_ControlUsoLog): RES_ControlUsoLog => {
    const e = { ...log };
    if (idTarifa) {
      const t = tarifas.find((tar) => tar.id === Number(idTarifa));
      if (t) {
        e.tarifa_desc = t.descripcion;
        e.tipo_material = t.tipo_material;
        e.tarifa_material = t.tipo_material;
        e.tarifa_distancia_metros = t.distancia_metros;
      }
    }
    return e;
  };

  // Submit: ramifica segun tipoControl
  const handleSubmit = async () => {
    setErroresItems([]);
    if (!idActivoFijo) {
      notifyError("Por favor seleccione un activo fijo.");
      return;
    }

    // ===== Validaciones comunes =====
    if (tipoControl === "vueltas" && !idMina) {
      notifyError("La mina es obligatoria para registrar un control por vueltas.");
      return;
    }
    if (tipoControl === "vueltas" && !idLabor) {
      notifyError("La labor es obligatoria para registrar un control por vueltas.");
      return;
    }
    // Lote de mineral: OPCIONAL. Ya no se valida aca.

    if (tipoControl === "horometro") {
      if (!fechaDia) {
        notifyError("Por favor seleccione la fecha del trabajo.");
        return;
      }
      // Validacion de cada item. Acumula errores para mostrar todos en un Alert arriba.
      const errores: string[] = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const idx = i + 1;
        if (!it.usarHoras && !it.usarHorometro) {
          errores.push(
            `Bloque #${idx}: active "Usar Horas" o "Usar Horometro" (al menos uno).`,
          );
        }
        if (it.usarHoras) {
          if (!it.horaInicioStr || !it.horaFinStr) {
            errores.push(
              `Bloque #${idx}: complete las horas de inicio y fin.`,
            );
          } else if (calculosPorItem[i].totalHoras <= 0) {
            errores.push(
              `Bloque #${idx}: la hora de fin debe ser posterior a la hora de inicio.`,
            );
          }
        }
        if (it.usarHorometro) {
          if (it.lecturaInicio === "" || it.lecturaFin === "") {
            errores.push(
              `Bloque #${idx}: complete el horometro inicial y final.`,
            );
          } else if (Number(it.lecturaFin) <= Number(it.lecturaInicio)) {
            errores.push(
              `Bloque #${idx}: el horometro final no puede ser menor o igual al inicial.`,
            );
          }
        }
      }
      if (errores.length > 0) {
        setErroresItems(errores);
        notifyError(`Hay ${errores.length} error(es) en los bloques.`);
        return;
      }
      setErroresItems([]);
    }

    if (tipoControl === "vueltas") {
      // Validacion cabecera
      if (!idMina) {
        notifyError("La mina es obligatoria para registrar un control por vueltas.");
        return;
      }
      if (!idLabor) {
        notifyError("La labor es obligatoria para registrar un control por vueltas.");
        return;
      }
      if (!idLoteMineral) {
        notifyError(
          "El lote de mineral en producción es obligatorio para registrar un control por vueltas.",
        );
        return;
      }
      // Validacion por item
      for (let i = 0; i < itemsVueltas.length; i++) {
        const it = itemsVueltas[i];
        const idx = i + 1;
        if (!it.idTarifa) {
          notifyError(`Bloque #${idx}: debe seleccionar una Tarifa de Uso.`);
          return;
        }
        if (Number(it.cantidadVueltas) <= 0) {
          notifyError(`Bloque #${idx}: la cantidad de vueltas debe ser mayor a cero.`);
          return;
        }
        if (!it.fechaTrabajo) {
          notifyError(`Bloque #${idx}: la fecha del trabajo es obligatoria.`);
          return;
        }
        const tarifaItem = tarifas.find(
          (t) => t.id.toString() === it.idTarifa,
        );
        const esSacoItem = tarifaItem
          ? (tarifaItem.tipo_material || "")
              .toLowerCase()
              .includes("saco")
          : false;
        if (
          esSacoItem &&
          (it.cantidadSacos === "" || Number(it.cantidadSacos) <= 0)
        ) {
          notifyError(`Bloque #${idx}: la cantidad de sacos es obligatoria.`);
          return;
        }
        if (
          it.horometroInicio !== "" &&
          it.horometroFin !== "" &&
          Number(it.horometroFin) <= Number(it.horometroInicio)
        ) {
          notifyError(
            `Bloque #${idx}: el horometro final no puede ser menor o igual al inicial.`,
          );
          return;
        }
      }
    }

    if (
      tipoControl === "odometro" &&
      (Number(lecturaFin) || 0) < (Number(lecturaInicio) || 0)
    ) {
      notifyError(
        `La lectura final del ${labelLectura} no puede ser menor a la lectura inicial.`,
      );
      return;
    }

    setSaving(true);
    try {
      // ===== Bulk horometro =====
      if (tipoControl === "horometro") {
        const payload = {
          id_activo_fijo: idActivoFijo,
          fecha_trabajo: dayjs(fechaDia).format("YYYY-MM-DD"),
          id_tarifa: idTarifa ? Number(idTarifa) : null,
          precio_unitario: precioUnitario,
          es_para_mina: esParaMina,
          id_mina: esParaMina && idMina ? Number(idMina) : null,
          id_labor: esParaMina && idLabor ? Number(idLabor) : null,
          id_cliente: !esParaMina && idCliente ? Number(idCliente) : null,
          id_lote_mineral: idLoteMineral ? Number(idLoteMineral) : null,
          tipo_carga: tipoCarga || null,
          items: items.map((it) => ({
            hora_inicio: it.horaInicioStr === "" ? null : it.horaInicioStr,
            hora_fin: it.horaFinStr === "" ? null : it.horaFinStr,
            horometro_inicio:
              it.lecturaInicio === "" || it.lecturaInicio === null
                ? null
                : Number(it.lecturaInicio),
            horometro_fin:
              it.lecturaFin === "" || it.lecturaFin === null
                ? null
                : Number(it.lecturaFin),
            tipo_turno: it.tipoTurno === "" ? null : it.tipoTurno,
            observacion: it.observacion.trim() ? it.observacion.trim() : null,
          })),
          // Consumos compartidos por TODO el grupo UUID: ya no van por
          // item. El backend los aplica una sola vez (kardex SALIDA).
          consumos: consumos.map((cs) => ({
            id_producto: Number(cs.idProducto),
            id_almacen: Number(cs.idAlmacen),
            id_lote_producto: Number(cs.idLoteProducto),
            id_unidad_medida: Number(cs.idUnidadMedida),
            cantidad_consumo: cs.cantidadConsumo === "" ? 0 : Number(cs.cantidadConsumo),
            contenido_por_presentacion:
              cs.contenidoPorPresentacion === "" ? 0 : Number(cs.contenidoPorPresentacion),
            // Activo fijo consumidor: la maquina que se esta controlando
            // (siempre la misma para todos los consumos de este modal).
            id_activo_fijo_consumidor: idActivoFijo,
            // Un mismo UUID para todos los consumos de este "Registrar
            // Control por Horometro" -> el backend los asocia al GRUPO
            // uuid_grupo (no a un item puntual).
            uuid_control_uso_activo: uuidGrupoControlUso,
            id_lote_mineral: cs.idLoteMineral ? Number(cs.idLoteMineral) : null,
            id_labor_destino: cs.idLaborDestino ? Number(cs.idLaborDestino) : null,
            para_produccion: cs.paraProduccion,
            para_mantenimiento: cs.paraMantenimiento,
            comentario: cs.comentario.trim() ? cs.comentario.trim() : null,
            estado: cs.estado,
          })),
        };

        const resp = await ControlUsoService.registrarUsoBulk(payload);
        if (resp.success) {
          const enriched = (resp.data as RES_ControlUsoLog[]).map(enriquecerLog);
          onSuccess(enriched);
        } else {
          notifyError(resp.message || "Error al registrar los controles de uso");
        }
        return;
      }

      // ===== Bulk vueltas =====
      if (tipoControl === "vueltas") {
        const payload = {
          id_activo_fijo: idActivoFijo,
          id_mina: Number(idMina),
          id_labor: Number(idLabor),
          // Lote de mineral ahora es OPCIONAL.
          id_lote_mineral: idLoteMineral ? Number(idLoteMineral) : null,
          items: itemsVueltas.map((it) => {
            const tarifaItem = tarifas.find(
              (t) => t.id.toString() === it.idTarifa,
            );
            const esSacoItem = tarifaItem
              ? (tarifaItem.tipo_material || "")
                  .toLowerCase()
                  .includes("saco")
              : false;
            return {
              id_tarifa: it.idTarifa ? Number(it.idTarifa) : null,
              precio_unitario: tarifaItem
                ? Number(tarifaItem.precio_unitario)
                : 0,
              cantidad_vueltas: Number(it.cantidadVueltas),
              cantidad_sacos:
                esSacoItem &&
                it.cantidadSacos !== "" &&
                it.cantidadSacos !== null
                  ? Number(it.cantidadSacos)
                  : null,
              horometro_inicio:
                it.horometroInicio === "" || it.horometroInicio === null
                  ? null
                  : Number(it.horometroInicio),
              horometro_fin:
                it.horometroFin === "" || it.horometroFin === null
                  ? null
                  : Number(it.horometroFin),
              tipo_turno: it.tipoTurno === "" ? null : it.tipoTurno,
              // Fecha del trabajo: por bloque (cada viaje puede caer en
              // dia distinto). El submit ya valida que `fechaTrabajo`
              // no este vacio, asi que el fallback solo aplica si por
              // algun motivo llega vacio.
              fecha_trabajo:
                it.fechaTrabajo || dayjs().format("YYYY-MM-DD"),
              observacion: it.observacion.trim()
                ? it.observacion.trim()
                : null,
            };
          }),
        };

        const resp = await ControlUsoService.registrarUsoBulkVueltas(payload);
        if (resp.success) {
          const enriched = (resp.data as RES_ControlUsoLog[]).map((l) =>
            enriquecerLogVueltas(enriquecerLog(l)),
          );
          onSuccess(enriched);
        } else {
          notifyError(resp.message || "Error al registrar los controles de uso");
        }
        return;
      }

      // ===== Single (odometro) =====
      const dtInicioStr = dayjs().format("YYYY-MM-DD HH:mm:ss");
      const dtFinStr: string | null = null;

      const resp = await ControlUsoService.registrarUso({
        id_activo_fijo: idActivoFijo,
        fecha_hora_inicio_control: dtInicioStr,
        fecha_hora_fin_control: dtFinStr,

        horometro_inicio: undefined,
        horometro_fin: undefined,
        odometro_inicio: Number(lecturaInicio) || 0,
        odometro_fin: Number(lecturaFin) || 0,
        cantidad_vueltas: undefined,
        cantidad_sacos: undefined,

        precio_unitario: precioUnitario,
        id_tarifa: idTarifa ? Number(idTarifa) : undefined,

        es_para_mina: undefined,
        id_mina: undefined,
        id_labor: undefined,
        id_lote_mineral: undefined,
        id_cliente: undefined,
        tipo_carga: undefined,

        observacion: observacion ? observacion.trim() : null,
      });

      if (resp.success) {
        onSuccess([enriquecerLog(resp.data)]);
      } else {
        notifyError(resp.message || "Error al registrar el control de uso");
      }
    } catch (err) {
      notifyError("Error de conexion al guardar los registros.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="md" className="p-1">
      {tipoControl === "horometro" && erroresItems.length > 0 && (
        <Alert
          variant="light"
          color="red"
          radius="lg"
          icon={<ExclamationTriangleIcon className="w-5 h-5 text-red-400" />}
          className="bg-red-500/10 border border-red-500/30"
          classNames={{ message: "text-zinc-200 text-sm leading-relaxed" }}
          title="Revisa los bloques antes de guardar"
        >
          <Stack gap={4}>
            {erroresItems.map((msg, i) => (
              <Text key={i} size="sm" className="text-zinc-200">
                {msg}
              </Text>
            ))}
          </Stack>
        </Alert>
      )}
      {/* Asset card (cabecera) */}
      <div className="relative overflow-hidden bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex gap-3.5 transition-all">
        <div className="absolute -right-8 -top-8 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-center shrink-0 w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          {tipoControl === "horometro" ? (
            <Cog8ToothIcon className="w-5 h-5 text-indigo-400" />
          ) : tipoControl === "odometro" ? (
            <TruckIcon className="w-5 h-5 text-indigo-400" />
          ) : (
            <ArrowPathRoundedSquareIcon className="w-5 h-5 text-indigo-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">
              Activo Fijo
            </span>
            <Badge size="xs" color="pink" variant="light" className="font-bold shrink-0 border border-pink-500/10">
              {asset.correlativo}
            </Badge>
          </div>
          <Text size="sm" fw={800} className="text-white leading-snug truncate">
            {asset.producto}
          </Text>
          {(asset.almacen || asset.mina) && (
            <Text size="10px" className="text-zinc-500 mt-1.5 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" />
              <span className="font-medium">Ubicacion:</span>
              <span className="text-zinc-400 font-semibold truncate">
                {asset.almacen || asset.mina}
              </span>
            </Text>
          )}
        </div>
      </div>

      {/* Cabecera por modo:
          - horometro: Tarifa + Fecha (cols=2).
          - odometro: Tarifa sola (cols=1).
          - vueltas: NO se muestra Tarifa aqui (cada item tiene su Tarifa propia). */}
      {tipoControl !== "vueltas" && (
        <SimpleGrid cols={tipoControl === "horometro" ? 2 : 1} spacing="md">
          <Group gap={6} align="flex-end" wrap="nowrap">
            <Select
              className="flex-1"
              label="Tarifa de Uso"
              placeholder="Seleccione tarifa..."
              data={tarifas
                .filter((t) => t.tipo_control === tipoControl)
                .map((t) => {
                  // NOTA: para vueltas este Select NO se renderiza
                  // (cada item tiene su Tarifa propia). Este bloque queda
                  // solo para horometro / odometro.
                  return {
                    value: t.id.toString(),
                    label: [
                      `S/. ${Number(t.precio_unitario).toFixed(2)}`,
                      t.tipo_material ? `x ${t.tipo_material}` : null,
                      t.descripcion ? `- ${t.descripcion}` : null,
                    ]
                      .filter(Boolean)
                      .join(" "),
                  };
                })}
              classNames={fieldClasses}
              value={idTarifa}
              onChange={setIdTarifa}
              searchable
              clearable
              radius="lg"
              size="xs"
            />
            <Tooltip label="Historial de Tarifas">
              <ActionIcon
                onClick={() => setModalHistorialOpened(true)}
                variant="light"
                color="zinc.4"
                size={32}
                radius="lg"
                className="mb-[3px] border border-zinc-700/50"
              >
                <QueueListIcon className="w-4 h-4" />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Nueva Tarifa">
              <ActionIcon
                onClick={() => setModalTarifaOpened(true)}
                variant="filled"
                color="indigo.6"
                size={32}
                radius="lg"
                className="mb-[3px]"
              >
                <PlusIcon className="w-4 h-4" />
              </ActionIcon>
            </Tooltip>
          </Group>
          {tipoControl === "horometro" && (
            <CustomDatePicker
              label="Fecha del Trabajo"
              placeholder="Seleccione fecha"
              value={fechaDia}
              onChange={(val) => setFechaDia(val as Date | null)}
              radius="lg"
              size="xs"
            />
          )}
        </SimpleGrid>
      )}

      {/* Cabecera ESPECIFICA de vueltas: Mina, Labor y Lote de Mineral
          (OPCIONAL). La Fecha del Trabajo pasa a vivir dentro de cada
          Bloque #N, no aqui, porque cada viaje puede caer en dia
          distinto. */}
      {tipoControl === "vueltas" &&
        (() => {
          const lotesFiltrados = idLabor
            ? lotesMineral.filter((lm) => lm.id_labor === Number(idLabor))
            : [];
          return (
            <Card
              withBorder
              padding="md"
              radius="lg"
              className="bg-zinc-950/20 border-zinc-800/60"
            >
              <SimpleGrid cols={2} spacing="md">
                <Select
                  label="Mina"
                  placeholder="Seleccione mina"
                  data={minas}
                  value={idMina}
                  onChange={setIdMina}
                  searchable
                  required
                  classNames={fieldClasses}
                  radius="lg"
                  size="xs"
                />
                <Select
                  label="Labor"
                  placeholder="Seleccione labor"
                  data={labores}
                  value={idLabor}
                  onChange={setIdLabor}
                  searchable
                  disabled={!idMina}
                  classNames={fieldClasses}
                  radius="lg"
                  size="xs"
                />
              </SimpleGrid>
              <Select
                mt="md"
                label="Lote de Mineral (Opcional)"
                placeholder={
                  idLabor
                    ? "Seleccione lote de la labor (opcional)..."
                    : "Seleccione primero una labor"
                }
                data={lotesFiltrados.map((lm) => ({
                  value: String(lm.id_lote_mineral),
                  label: `${lm.contratista ? `${lm.contratista.split(" ")[0]} - ` : ""}${lm.codigo}`,
                }))}
                value={idLoteMineral}
                onChange={setIdLoteMineral}
                searchable
                clearable
                disabled={!idLabor}
                classNames={fieldClasses}
                radius="lg"
                size="xs"
              />
            </Card>
          );
        })()}

      {/* Bloque Horometro: Bulk (N items) */}
      {tipoControl === "horometro" ? (
        <Stack gap="sm">
          {/* Lote Mineral + Tipo de Carga (Opc.) en la misma fila */}
          <SimpleGrid cols={2} spacing="md">
              <Select
                label="Lote Mineral (Opc.)"
                placeholder="Seleccione lote de mineral..."
                data={lotesMineral.map((lm) => ({
                  value: String(lm.id_lote_mineral),
                  label: `${lm.contratista ? `${lm.contratista.split(" ")[0]} - ` : ""}${lm.codigo}`,
                }))}
                value={idLoteMineral}
                onChange={setIdLoteMineral}
                searchable
                clearable
                classNames={fieldClasses}
                radius="lg"
                size="xs"
              />
            <Select
              label="Tipo de Carga (Opc.)"
              placeholder="Seleccione..."
              data={["Arrumaje de Mineral", "Carguio de Mineral"]}
              value={tipoCarga}
              onChange={setTipoCarga}
              clearable
              classNames={fieldClasses}
              radius="lg"
              size="xs"
            />
          </SimpleGrid>

          {/* Destino del Trabajo (cabecera del bulk) */}
          <Card withBorder padding="md" radius="lg" className="bg-zinc-950/20 border-zinc-800/60">
            <Group justify="flex-start" align="center" mb="sm" gap="xs">
              <Text size="xs" fw={600} className="text-zinc-300">
                Destino del Trabajo:
              </Text>
              <SegmentedControl
                value={esParaMina ? "mina" : "terceros"}
                onChange={(value) => setEsParaMina(value === "mina")}
                data={[
                  {
                    value: "mina",
                    label: (
                      <Center style={{ gap: 6 }}>
                        <MapPinIcon className="w-4 h-4" />
                        <Box>En Mina</Box>
                      </Center>
                    ),
                  },
                  {
                    value: "terceros",
                    label: (
                      <Center style={{ gap: 6 }}>
                        <BriefcaseIcon className="w-4 h-4" />
                        <Box>Para Terceros</Box>
                      </Center>
                    ),
                  },
                ]}
                radius="md"
                size="xs"
                classNames={{
                  root: "bg-zinc-900/50 border border-zinc-800",
                  control: "border-none",
                  indicator: "bg-indigo-600",
                  label: "text-zinc-400 data-[active]:text-white font-bold",
                }}
              />
            </Group>

            <SimpleGrid cols={esParaMina ? 2 : 1} spacing="md" mt="md">
              {esParaMina ? (
                <>
                  <Select
                    label="Mina"
                    placeholder="Seleccione mina"
                    data={minas}
                    value={idMina}
                    onChange={setIdMina}
                    searchable
                    required
                    classNames={fieldClasses}
                    radius="lg"
                    size="xs"
                  />
                  <Select
                    label="Labor (Opcional)"
                    placeholder={
                      loadingLabores ? "Cargando labores..." : "Seleccione labor"
                    }
                    data={labores}
                    value={idLabor}
                    onChange={setIdLabor}
                    searchable
                    clearable
                    disabled={!idMina || loadingLabores}
                    rightSection={loadingLabores ? <Loader size={12} color="indigo" /> : undefined}
                    classNames={fieldClasses}
                    radius="lg"
                    size="xs"
                  />
                </>
              ) : (
                <Select
                  label="Cliente"
                  placeholder="Seleccione cliente"
                  data={clientes}
                  value={idCliente}
                  onChange={setIdCliente}
                  searchable
                  required
                  classNames={fieldClasses}
                  radius="lg"
                  size="xs"
                />
              )}
            </SimpleGrid>
          </Card>

          {/* Consumos asociados (compartidos por todo el grupo UUID).
              Antes vivia DENTRO de cada Bloque #1; ahora va aqui, debajo
              de los selects de mina/labor. Un mismo consumo (p. ej. 50
              galones de combustible) cubre a todos los bloques horometrados
              del grupo, no a uno puntual. */}
          <Card withBorder padding="md" radius="lg" className="bg-amber-950/10 border-amber-500/30">
            <Group justify="space-between" align="center" mb="sm" wrap="nowrap">
              <Group gap="xs" wrap="nowrap">
                <BeakerIcon className="w-4 h-4 text-amber-400" />
                <Text size="xs" fw={800} className="text-amber-200 uppercase tracking-wider">
                  Consumos asociados
                </Text>
                {consumos.length > 0 && (
                  <Badge size="xs" color="amber" variant="filled" radius="sm">
                    {consumos.length} consumo{consumos.length === 1 ? "" : "s"}
                  </Badge>
                )}
              </Group>
              <Button
                variant="light"
                color="amber.5"
                size="xs"
                radius="md"
                leftSection={<PlusCircleIcon className="w-4 h-4" />}
                onClick={() => openConsumoModal()}
                className="font-bold"
              >
                Agregar Consumo
              </Button>
            </Group>

            {consumos.length === 0 ? (
              <Text size="11px" c="dimmed" fs="italic">
                Sin consumos asociados. Si este control representa salida directa de
                stock (p. ej. combustible gastado por el activo), agrega un consumo.
              </Text>
            ) : (
              <Stack gap={6} mt={4}>
                {consumos.map((cs) => {
                  const prodSel =
                    productos.find(
                      (p) =>
                        String(p.id_producto) === String(cs.idProducto),
                    ) ?? null;
                  const prodLabel = prodSel?.nombre ?? "Producto";
                  const almLabel =
                    almacenesConsumo.find((a) => a.value === cs.idAlmacen)?.label ??
                    "Almacen";
                  const cantNum = cs.cantidadConsumo === "" ? 0 : Number(cs.cantidadConsumo);
                  const cppNum =
                    cs.contenidoPorPresentacion === ""
                      ? 1
                      : Number(cs.contenidoPorPresentacion);
                  const baseNum = cantNum * cppNum;
                  const baseAbbr =
                    prodSel?.unidad_medida_base_abv ||
                    unidadesMedida.find(
                      (u) =>
                        String(u.id_unidad_medida) ===
                        String(prodSel?.id_unidad_medida_base ?? ""),
                    )?.abreviatura ||
                    "--";
                  const baseNombre =
                    prodSel?.unidad_medida_base ||
                    unidadesMedida.find(
                      (u) =>
                        String(u.id_unidad_medida) ===
                        String(prodSel?.id_unidad_medida_base ?? ""),
                    )?.nombre ||
                    "--";
                  const unidadSelObj = unidadesMedida.find(
                    (u) =>
                      String(u.id_unidad_medida) ===
                      String(cs.idUnidadMedida ?? ""),
                  );
                  const selAbbr = unidadSelObj?.abreviatura || "--";
                  const selNombre = unidadSelObj?.nombre || "--";
                  const tieneCantidad = cantNum > 0 && cppNum > 0;
                  return (
                    <Card
                      key={cs.id}
                      withBorder
                      padding="sm"
                      radius="lg"
                      className="bg-zinc-950/40 border-amber-500/20"
                    >
                      <Group
                        justify="space-between"
                        align="center"
                        wrap="nowrap"
                        mb={6}
                      >
                        <Group gap={6} wrap="nowrap" className="min-w-0">
                          <Badge
                            size="xs"
                            color="amber"
                            variant="filled"
                            radius="sm"
                          >
                            #{cs.id.slice(0, 4)}
                          </Badge>
                          <Text
                            size="11px"
                            c="amber.3"
                            fw={700}
                            className="truncate"
                          >
                            {prodLabel} - {almLabel}
                          </Text>
                        </Group>
                        <Group gap={4} wrap="nowrap">
                          <Tooltip label="Editar">
                            <ActionIcon
                              onClick={() => openConsumoModal(cs)}
                              variant="subtle"
                              color="indigo.4"
                              size="sm"
                              radius="xl"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Quitar">
                            <ActionIcon
                              onClick={() => quitarConsumo(cs.id)}
                              variant="subtle"
                              color="red"
                              size="sm"
                              radius="xl"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Group>
                      <Group gap="lg" wrap="nowrap">
                        <Stack gap={2}>
                          <Text
                            size="9px"
                            c="amber.4"
                            fw={700}
                            className="uppercase"
                          >
                            {`En ${selNombre !== "--" ? enPlural(selNombre) : "---"}`}
                          </Text>
                          <Group gap={4} align="baseline" wrap="nowrap">
                            <Text
                              fw={800}
                              size="md"
                              className={
                                tieneCantidad ? "text-white" : "text-zinc-700"
                              }
                            >
                              {formatNumber(cantNum)}
                            </Text>
                            <Text
                              size="xs"
                              fw={700}
                              c="amber.4"
                              className="uppercase tracking-wider"
                            >
                              {selAbbr}
                            </Text>
                          </Group>
                        </Stack>
                        <div className="h-8 w-px bg-amber-500/30" />
                        <Stack gap={2}>
                          <Text
                            size="9px"
                            c="amber.4"
                            fw={700}
                            className="uppercase"
                          >
                            {`En ${baseNombre !== "--" ? enPlural(baseNombre) : "---"}`}
                          </Text>
                          <Group gap={4} align="baseline" wrap="nowrap">
                            <Text
                              fw={800}
                              size="md"
                              className={
                                tieneCantidad ? "text-emerald-400" : "text-zinc-700"
                              }
                            >
                              {formatNumber(baseNum)}
                            </Text>
                            <Text
                              size="xs"
                              fw={700}
                              c="emerald.4"
                              className="uppercase tracking-wider"
                            >
                              {baseAbbr}
                            </Text>
                          </Group>
                        </Stack>
                      </Group>
                      <Text
                        size="10px"
                        c="dimmed"
                        ta="center"
                        mt={6}
                      >
                        {tieneCantidad
                          ? `${formatNumber(cantNum)} ${selAbbr} × ${cppNum} = ${formatNumber(baseNum)} ${baseAbbr}`
                          : "Complete los datos para ver la equivalencia."}
                      </Text>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Card>

          {/* Items: N bloques de horario */}
          <Stack gap="sm">
            {items.map((it, idx) => (
              <Card
                key={it.id}
                withBorder
                padding="md"
                radius="lg"
                className="bg-zinc-950/40 border-zinc-800"
              >
                <Group justify="space-between" align="center" mb="sm" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap">
                    <Badge color="indigo" variant="light" size="sm" radius="sm">
                      Bloque #{idx + 1}
                    </Badge>
                    <Text size="xs" c="zinc.500" fw={600}>
                      Horario independiente
                    </Text>
                  </Group>
                  <Group gap="md" align="center" wrap="nowrap">
                    <Checkbox
                      label="Usar Horas"
                      checked={it.usarHoras}
                      onChange={(event) => {
                        const value = event.currentTarget.checked;
                        actualizarItem(it.id, "usarHoras", value);
                        if (!value) {
                          actualizarItem(it.id, "horaInicioStr", "");
                          actualizarItem(it.id, "horaFinStr", "");
                        }
                      }}
                      radius="sm"
                      size="xs"
                      color="indigo"
                    />
                    <Checkbox
                      label="Usar Horometro"
                      checked={it.usarHorometro}
                      onChange={(event) => {
                        const value = event.currentTarget.checked;
                        actualizarItem(it.id, "usarHorometro", value);
                        if (!value) {
                          actualizarItem(it.id, "lecturaInicio", "");
                          actualizarItem(it.id, "lecturaFin", "");
                        }
                      }}
                      radius="sm"
                      size="xs"
                      color="indigo"
                    />
                    {items.length > 1 && (
                      <Tooltip label="Quitar bloque">
                        <ActionIcon
                          onClick={() => quitarItem(it.id)}
                          variant="subtle"
                          color="red"
                          size="sm"
                          radius="xl"
                          aria-label={`Quitar bloque ${idx + 1}`}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Group>

                <SimpleGrid cols={2} spacing="md">
                  <div>
                    <TimeInput
                      ref={(el) => {
                        refInicioRefs.current[it.id] = el;
                      }}
                      label={it.usarHoras ? "Hora Inicio" : "Hora Inicio (no aplica)"}
                      placeholder="08:00"
                      value={it.horaInicioStr}
                      onChange={(event) => {
                        actualizarItem(it.id, "horaInicioStr", formatHora(event.currentTarget.value));
                      }}
                      onClick={() => it.usarHoras && refInicioRefs.current[it.id]?.showPicker?.()}
                      classNames={fieldClasses}
                      size="xs"
                      radius="lg"
                      required={it.usarHoras}
                      disabled={!it.usarHoras}
                    />
                    {it.horaInicioStr && it.usarHoras && (
                      <Text size="10px" c="blue.4" fw={700} mt={3} className="ml-1">
                        ({dayjs(`2000-01-01 ${it.horaInicioStr}`).format("hh:mm A")})
                      </Text>
                    )}
                  </div>

                  <div>
                    <TimeInput
                      ref={(el) => {
                        refFinRefs.current[it.id] = el;
                      }}
                      label={it.usarHoras ? "Hora Fin" : "Hora Fin (no aplica)"}
                      placeholder="10:00"
                      value={it.horaFinStr}
                      onChange={(event) => {
                        actualizarItem(it.id, "horaFinStr", formatHora(event.currentTarget.value));
                      }}
                      onClick={() => it.usarHoras && refFinRefs.current[it.id]?.showPicker?.()}
                      classNames={fieldClasses}
                      size="xs"
                      radius="lg"
                      required={it.usarHoras}
                      disabled={!it.usarHoras}
                    />
                    {it.horaFinStr && it.usarHoras && (
                      <Text size="10px" c="blue.4" fw={700} mt={3} className="ml-1">
                        ({dayjs(`2000-01-01 ${it.horaFinStr}`).format("hh:mm A")})
                        {it.horaInicioStr &&
                          it.horaFinStr &&
                          dayjs(`2000-01-01 ${it.horaFinStr}`).isBefore(
                            dayjs(`2000-01-01 ${it.horaInicioStr}`),
                          ) && (
                            <span className="text-amber-400 font-bold ml-1">(Dia siguiente)</span>
                          )}
                      </Text>
                    )}
                  </div>
                </SimpleGrid>

                <Select
                  label="Turno (opcional)"
                  placeholder="Seleccione turno..."
                  data={[
                    { value: TipoTurno.Dia, label: "Día" },
                    { value: TipoTurno.Noche, label: "Noche" },
                  ]}
                  value={it.tipoTurno === "" ? null : it.tipoTurno}
                  onChange={(val) =>
                    actualizarItem(it.id, "tipoTurno", (val ?? "") as TipoTurno | "")
                  }
                  clearable
                  classNames={fieldClasses}
                  radius="lg"
                  size="xs"
                  mt="sm"
                />

                <SimpleGrid cols={2} spacing="md" mt="sm" className="opacity-85">
                  <NumberInput
                    label={
                      it.usarHorometro
                        ? "Horometro Inicial"
                        : "Horometro Inicial (no aplica)"
                    }
                    placeholder="Ej: 1250.00"
                    value={it.lecturaInicio}
                    onChange={(val) => actualizarItem(it.id, "lecturaInicio", val as number | "")}
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    classNames={fieldClasses}
                    size="xs"
                    radius="lg"
                    required={it.usarHorometro}
                    disabled={!it.usarHorometro || loadingData}
                  />
                  <NumberInput
                    label={
                      it.usarHorometro
                        ? "Horometro Final"
                        : "Horometro Final (no aplica)"
                    }
                    placeholder="Ej: 1252.00"
                    value={it.lecturaFin}
                    onChange={(val) => actualizarItem(it.id, "lecturaFin", val as number | "")}
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    classNames={fieldClasses}
                    size="xs"
                    radius="lg"
                    required={it.usarHorometro}
                    disabled={!it.usarHorometro || loadingData}
                  />
                </SimpleGrid>

                <Textarea
                  label="Observacion"
                  placeholder="Notas u observaciones de este bloque (opcional)..."
                  value={it.observacion}
                  onChange={(e) => actualizarItem(it.id, "observacion", e.currentTarget.value)}
                  classNames={fieldClasses}
                  size="xs"
                  radius="lg"
                  minRows={2}
                  mt="sm"
                />

                {/* NOTA: los consumos ya NO son por bloque. La seccion
                    "Consumos asociados" se movio abajo de los selects de
                    mina/labor (compartida por todo el grupo UUID). */}

                <SimpleGrid cols={2} spacing="md" mt="md">
                  <Group gap={6} align="center" wrap="nowrap">
                    <ClockIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div className="min-w-0">
                      <Text size="9px" c="zinc.500" fw={900} tt="uppercase" lts="0.08em">
                        Total Horas
                      </Text>
                      <Text size="md" fw={800} className="text-indigo-300">
                        {formatHorasDisplay(calculosPorItem[idx]?.totalHoras ?? 0)}{" "}
                        <span className="text-[10px] text-zinc-500 italic font-medium">hrs</span>
                      </Text>
                    </div>
                  </Group>
                  <Group gap={6} align="center" wrap="nowrap" justify="flex-end">
                    <BanknotesIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0 text-right">
                      <Text size="9px" c="zinc.500" fw={900} tt="uppercase" lts="0.08em">
                        Costo Operativo
                      </Text>
                      <Text size="md" fw={800} className="text-emerald-300">
                        S/.{" "}
                        {calculosPorItem[idx]?.costoTotal?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) ?? "0.00"}
                      </Text>
                    </div>
                  </Group>
                </SimpleGrid>
              </Card>
            ))}

            <Button
              variant="light"
              color="indigo"
              size="sm"
              radius="lg"
              leftSection={<PlusCircleIcon className="w-5 h-5" />}
              onClick={agregarItem}
              disabled={saving}
              className="border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-300 font-bold"
            >
              Anadir control
            </Button>
          </Stack>

          {items.length > 1 && (
            <Card withBorder padding="sm" radius="lg" className="bg-zinc-950/60 border-indigo-500/30">
              <Group justify="space-between" align="center" wrap="wrap">
                <Group gap="xs">
                  <Badge size="sm" color="indigo" variant="filled" radius="sm">
                    {items.length} controles
                  </Badge>
                  <Text size="xs" c="zinc.400" fw={600}>
                    Total general
                  </Text>
                </Group>
                <Group gap="lg">
                  <Group gap={6}>
                    <Text size="10px" c="zinc.500" tt="uppercase" fw={900}>
                      Horas
                    </Text>
                    <Text size="sm" fw={800} className="text-indigo-300">
                      {formatHorasDisplay(totalGeneral.horas)}{" "}
                      <span className="text-[10px] text-zinc-500 italic">hrs</span>
                    </Text>
                  </Group>
                  <Group gap={6}>
                    <Text size="10px" c="zinc.500" tt="uppercase" fw={900}>
                      Costo
                    </Text>
                    <Text size="sm" fw={800} className="text-emerald-300">
                      S/.{" "}
                      {totalGeneral.costo.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </Group>
                </Group>
              </Group>
            </Card>
          )}
        </Stack>
      ) : tipoControl === "odometro" ? (
        // ===== Single: Odometro (intacto, original) =====
        <SimpleGrid cols={2} spacing="md">
          <NumberInput
            label={`${labelLectura} Inicial`}
            value={lecturaInicio}
            onChange={(val) => setLecturaInicio(val as number | "")}
            min={0}
            decimalScale={2}
            fixedDecimalScale
            required
            size="xs"
            radius="lg"
            disabled={loadingData}
          />
          <NumberInput
            label={`${labelLectura} Final`}
            value={lecturaFin}
            onChange={(val) => setLecturaFin(val as number | "")}
            min={0}
            decimalScale={2}
            fixedDecimalScale
            required
            size="xs"
            radius="lg"
            disabled={loadingData}
          />
        </SimpleGrid>
      ) : (
        // ===== Bulk: Vueltas (N items; cada uno con su Tarifa) =====
        <Stack gap="sm">
          {/* Items: N bloques de vueltas */}
          <Stack gap="sm">
            {itemsVueltas.map((it, idx) => {
              // Tarifa del item (cada bloque puede ser independiente)
              const tarifaItem = tarifas.find(
                (t) => t.id.toString() === it.idTarifa,
              );
              const esSacoItem = tarifaItem
                ? (tarifaItem.tipo_material || "")
                    .toLowerCase()
                    .includes("saco")
                : false;
              return (
              <Card
                key={it.id}
                withBorder
                padding="md"
                radius="lg"
                className="bg-zinc-950/40 border-zinc-800"
              >
                <Group justify="space-between" align="center" mb="sm" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap">
                    <Badge color="indigo" variant="light" size="sm" radius="sm">
                      Bloque #{idx + 1}
                    </Badge>
                    <Text size="xs" c="zinc.500" fw={600}>
                      Viaje independiente
                    </Text>
                  </Group>
                  {itemsVueltas.length > 1 && (
                    <Tooltip label="Quitar bloque">
                      <ActionIcon
                        onClick={() => quitarItemVueltas(it.id)}
                        variant="subtle"
                        color="red"
                        size="sm"
                        radius="xl"
                        aria-label={`Quitar bloque ${idx + 1}`}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>

                {/* Fila 1: Tarifa de Uso | Cantidad de Vueltas | Fecha del Trabajo.
                    Los tres al mismo ancho (Cantidad y Fecha ambos span=3)
                    para que se vean cuadrados. Turno y Cantidad de Sacos
                    viven en la Fila 2 con los horometros. */}
                <Grid align="flex-end" gutter="md">
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Group gap={6} align="flex-end" wrap="nowrap">
                      <Select
                        label="Tarifa de Uso"
                        placeholder="Seleccione tarifa..."
                        data={tarifas
                          .filter((t) => t.tipo_control === "vueltas")
                          .map((t) => {
                            const esSaco = (t.tipo_material || "")
                              .toLowerCase()
                              .includes("saco");
                            const parts = [
                              esSaco
                                ? "Sin precio"
                                : `S/. ${Number(t.precio_unitario).toFixed(2)}`,
                              t.distancia_metros ? `x ${t.distancia_metros}m` : null,
                              t.tipo_material ? `x ${t.tipo_material}` : null,
                            ].filter(Boolean);
                            return { value: t.id.toString(), label: parts.join(" ") };
                          })}
                        value={it.idTarifa}
                        onChange={(val) =>
                          actualizarItemVueltas(it.id, "idTarifa", val ?? null)
                        }
                        searchable
                        clearable
                        required
                        className="flex-1"
                        classNames={fieldClasses}
                        radius="lg"
                        size="xs"
                      />
                      <Tooltip label="Historial de Tarifas">
                        <ActionIcon
                          onClick={() => setModalHistorialOpened(true)}
                          variant="light"
                          color="zinc.4"
                          size={32}
                          radius="lg"
                          className="mb-[3px] border border-zinc-700/50"
                        >
                          <QueueListIcon className="w-4 h-4" />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Nueva Tarifa">
                        <ActionIcon
                          onClick={() => setModalTarifaOpened(true)}
                          variant="filled"
                          color="indigo.6"
                          size={32}
                          radius="lg"
                          className="mb-[3px]"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Grid.Col>

                  {/* Cantidad de Vueltas: mismo ancho que Fecha del Trabajo
                      (span=3) para que se vean cuadrados en la fila. */}
                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <NumberInput
                      label="Cantidad de Vueltas"
                      placeholder="Ej: 3"
                      value={it.cantidadVueltas}
                      onChange={(val) =>
                        actualizarItemVueltas(
                          it.id,
                          "cantidadVueltas",
                          val as number | "",
                        )
                      }
                      min={0}
                      decimalScale={0}
                      fixedDecimalScale
                      required
                      classNames={fieldClasses}
                      size="xs"
                      radius="lg"
                    />
                  </Grid.Col>

                  {/* Fecha del Trabajo: al final del row, span=3 (igual que
                      Cantidad de Vueltas). */}
                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <CustomDatePicker
                      label="Fecha del Trabajo"
                      placeholder="Seleccione fecha"
                      value={
                        it.fechaTrabajo
                          ? dayjs(it.fechaTrabajo).toDate()
                          : null
                      }
                      onChange={(val) =>
                        actualizarItemVueltas(
                          it.id,
                          "fechaTrabajo",
                          val ? dayjs(val as Date).format("YYYY-MM-DD") : "",
                        )
                      }
                      radius="lg"
                      size="xs"
                      required
                    />
                  </Grid.Col>
                </Grid>

                {/* Fila 2: Turno (opcional) | Horometro Inicial (Opc.) |
                    Horometro Final (Opc.) | Cantidad de Sacos (solo si
                    la tarifa es Saco, al lado de Horometro Final).
                    Sin sacos: 3 cols de span=4 cada una.
                    Con sacos: 4 cols de span=3 cada una (mismo tamano). */}
                <Grid align="flex-end" gutter="md" mt="sm">
                  <Grid.Col span={esSacoItem ? 3 : 4}>
                    <Select
                      label="Turno (opcional)"
                      placeholder="Seleccione turno..."
                      data={[
                        { value: TipoTurno.Dia, label: "Día" },
                        { value: TipoTurno.Noche, label: "Noche" },
                      ]}
                      value={it.tipoTurno === "" ? null : it.tipoTurno}
                      onChange={(val) =>
                        actualizarItemVueltas(
                          it.id,
                          "tipoTurno",
                          (val ?? "") as TipoTurno | "",
                        )
                      }
                      clearable
                      classNames={fieldClasses}
                      radius="lg"
                      size="xs"
                    />
                  </Grid.Col>
                  <Grid.Col span={esSacoItem ? 3 : 4}>
                    <NumberInput
                      label="Horometro Inicial (Opc.)"
                      placeholder="Ej: 1250.00"
                      value={it.horometroInicio}
                      onChange={(val) =>
                        actualizarItemVueltas(
                          it.id,
                          "horometroInicio",
                          val as number | "",
                        )
                      }
                      min={0}
                      decimalScale={2}
                      fixedDecimalScale
                      classNames={fieldClasses}
                      size="xs"
                      radius="lg"
                    />
                  </Grid.Col>
                  <Grid.Col span={esSacoItem ? 3 : 4}>
                    <NumberInput
                      label="Horometro Final (Opc.)"
                      placeholder="Ej: 1252.00"
                      value={it.horometroFin}
                      onChange={(val) =>
                        actualizarItemVueltas(
                          it.id,
                          "horometroFin",
                          val as number | "",
                        )
                      }
                      min={0}
                      decimalScale={2}
                      fixedDecimalScale
                      classNames={fieldClasses}
                      size="xs"
                      radius="lg"
                    />
                  </Grid.Col>
                  {esSacoItem && (
                    <Grid.Col span={3}>
                      <NumberInput
                        label="Cantidad de Sacos"
                        placeholder="Ej: 30"
                        value={it.cantidadSacos}
                        onChange={(val) =>
                          actualizarItemVueltas(
                            it.id,
                            "cantidadSacos",
                            val as number | "",
                          )
                        }
                        min={0}
                        allowDecimal={false}
                        required
                        classNames={fieldClasses}
                        size="xs"
                        radius="lg"
                      />
                    </Grid.Col>
                  )}
                </Grid>

                <Textarea
                  label="Observacion"
                  placeholder="Notas u observaciones de este bloque (opcional)..."
                  value={it.observacion}
                  onChange={(e) => actualizarItemVueltas(it.id, "observacion", e.currentTarget.value)}
                  classNames={fieldClasses}
                  size="xs"
                  radius="lg"
                  minRows={2}
                  mt="sm"
                />

                <SimpleGrid cols={2} spacing="md" mt="md">
                  <Group gap={6} align="center" wrap="nowrap">
                    <ArrowPathRoundedSquareIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div className="min-w-0">
                      <Text size="9px" c="zinc.500" fw={900} tt="uppercase" lts="0.08em">
                        Total Vueltas
                      </Text>
                      <Text size="md" fw={800} className="text-indigo-300">
                        {calculosPorItemVueltas[idx]?.vueltas?.toLocaleString() ?? "0"}{" "}
                        <span className="text-[10px] text-zinc-500 italic font-medium">vuelta(s)</span>
                      </Text>
                    </div>
                  </Group>
                  <Group gap={6} align="center" wrap="nowrap" justify="flex-end">
                    <BanknotesIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0 text-right">
                      <Text size="9px" c="zinc.500" fw={900} tt="uppercase" lts="0.08em">
                        Costo Operativo
                      </Text>
                      <Text size="md" fw={800} className="text-emerald-300">
                        S/.{" "}
                        {calculosPorItemVueltas[idx]?.costo?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) ?? "0.00"}
                      </Text>
                    </div>
                  </Group>
                </SimpleGrid>
              </Card>
            );})}

            <Button
              variant="light"
              color="indigo"
              size="sm"
              radius="lg"
              leftSection={<PlusCircleIcon className="w-5 h-5" />}
              onClick={agregarItemVueltas}
              disabled={saving}
              className="border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-300 font-bold"
            >
              Anadir control
            </Button>
          </Stack>

          {itemsVueltas.length > 1 && (
            <Card withBorder padding="sm" radius="lg" className="bg-zinc-950/60 border-indigo-500/30">
              <Group justify="space-between" align="center" wrap="wrap">
                <Group gap="xs">
                  <Badge size="sm" color="indigo" variant="filled" radius="sm">
                    {itemsVueltas.length} controles
                  </Badge>
                  <Text size="xs" c="zinc.400" fw={600}>
                    Total general
                  </Text>
                </Group>
                <Group gap="lg">
                  <Group gap={6}>
                    <Text size="10px" c="zinc.500" tt="uppercase" fw={900}>
                      Vueltas
                    </Text>
                    <Text size="sm" fw={800} className="text-indigo-300">
                      {totalGeneralVueltas.vueltas.toLocaleString()}{" "}
                      <span className="text-[10px] text-zinc-500 italic">vlts</span>
                    </Text>
                  </Group>
                  {esTarifaSaco && (
                    <Group gap={6}>
                      <Text size="10px" c="zinc.500" tt="uppercase" fw={900}>
                        Sacos
                      </Text>
                      <Text size="sm" fw={800} className="text-amber-300">
                        {totalGeneralVueltas.sacos.toLocaleString()}
                      </Text>
                    </Group>
                  )}
                  <Group gap={6}>
                    <Text size="10px" c="zinc.500" tt="uppercase" fw={900}>
                      Costo
                    </Text>
                    <Text size="sm" fw={800} className="text-emerald-300">
                      S/.{" "}
                      {totalGeneralVueltas.costo.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </Group>
                </Group>
              </Group>
            </Card>
          )}
        </Stack>
      )}

      {/* Tarjeta de total y costo (solo single: odometro) */}
      {tipoControl === "odometro" && (
        <Card
          withBorder
          padding="sm"
          radius="lg"
          className="bg-zinc-950/40 border-zinc-800"
        >
          <Group justify="space-between" align="center">
            <Stack gap={2}>
              <Text size="xs" c="zinc.400" fw={600}>
                Total {labelDiferencia}
              </Text>
              <Group gap={6}>
                <Text size="xl" fw={800} className="text-indigo-400">
                  {totalUso.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <Text size="xs" c="zinc.500" className="mt-1.5 italic">
                  {unitMeasure}
                </Text>
              </Group>
            </Stack>

            <Stack gap={2} align="flex-end">
              <Text size="xs" c="zinc.400" fw={600}>
                Costo Operativo Total
              </Text>
              <Badge
                size="lg"
                variant="gradient"
                gradient={{ from: "indigo.5", to: "indigo.8" }}
                radius="lg"
                fw={800}
                h={32}
                className="px-4"
              >
                S/.{" "}
                {costoTotal.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Badge>
            </Stack>
          </Group>
        </Card>
      )}

      {/* Observacion (solo single: odometro; la rama bulk de vueltas tiene observacion por bloque) */}
      {tipoControl === "odometro" && (
        <Textarea
          label="Observacion"
          placeholder="Ingrese notas u observaciones..."
          value={observacion}
          onChange={(e) => setObservacion(e.currentTarget.value)}
          classNames={fieldClasses}
          size="xs"
          radius="lg"
          minRows={2}
        />
      )}

      {/* Acciones */}
      <Group justify="flex-end" mt="lg" gap="xs">
        <Button variant="subtle" color="zinc.5" onClick={onCancel} disabled={saving} size="xs" radius="lg">
          Cancelar
        </Button>
        <Button color="indigo" onClick={handleSubmit} loading={saving} size="xs" radius="lg">
          {tipoControl === "horometro" && items.length > 1
            ? `Guardar ${items.length} Controles`
            : tipoControl === "vueltas" && itemsVueltas.length > 1
              ? `Guardar ${itemsVueltas.length} Controles`
              : "Guardar Control"}
        </Button>
      </Group>

      {/* Modal tarifas (intacto) */}
      <ModalEstandar
        opened={modalTarifaOpened}
        close={() => setModalTarifaOpened(false)}
        title={`Tarifas por uso - ${tipoControl.charAt(0).toUpperCase() + tipoControl.slice(1)}`}
        size="sm"
      >
        <NuevaTarifaModal
          asset={asset}
          initialTipoControl={tipoControl}
          onCancel={() => setModalTarifaOpened(false)}
          onSuccess={async (nuevaTarifa) => {
            try {
              const respTarifas = await ControlUsoService.getTarifas(idActivoFijo);
              if (respTarifas.success) {
                setTarifas(respTarifas.data);
              } else {
                setTarifas((prev) => [...prev, nuevaTarifa]);
              }
            } catch {
              setTarifas((prev) => [...prev, nuevaTarifa]);
            }
            setIdTarifa(nuevaTarifa.id.toString());
            setModalTarifaOpened(false);
          }}
        />
      </ModalEstandar>

      {/* Historial de Tarifas Modal (intacto) */}
      <ModalEstandar
        opened={modalHistorialOpened}
        close={() => setModalHistorialOpened(false)}
        title={`Historial de Tarifas - ${tipoControl.charAt(0).toUpperCase() + tipoControl.slice(1)}`}
        size="xl"
      >
        <div className="mt-2 h-[350px]">
          <DataTableEstandar
            idAccessor="id"
            loading={false}
            records={tarifas
              .filter((t) => t.tipo_control === tipoControl)
              .sort((a, b) => b.id - a.id)}
            columns={[
              {
                accessor: "id",
                title: "#",
                width: 50,
                render: (_record, index) => (
                  <span className="text-zinc-500 text-xs font-mono">{(index ?? 0) + 1}</span>
                ),
              },
              {
                accessor: "precio_unitario",
                title: "Precio Unit.",
                render: (record) => {
                  if (Number(record.precio_unitario) === 0) {
                    return <span className="text-zinc-600 text-xs italic">Sin precio</span>;
                  }
                  return (
                    <Badge color="violet" variant="filled" size="sm" radius="sm">
                      S/. {Number(record.precio_unitario).toFixed(2)}
                    </Badge>
                  );
                },
              },
              // Columna Distancia: solo en Vueltas
              ...(tipoControl === "vueltas"
                ? [
                    {
                      accessor: "distancia_metros",
                      title: "Distancia hasta",
                      render: (record: (typeof tarifas)[0]) =>
                        record.distancia_metros ? (
                          <Badge size="xs" color="teal" variant="filled">
                            {record.distancia_metros} m.
                          </Badge>
                        ) : (
                          <span className="text-zinc-600 text-xs italic">-</span>
                        ),
                    },
                  ]
                : []),
              // Columna Material: solo en Vueltas
              ...(tipoControl === "vueltas"
                ? [
                    {
                      accessor: "tipo_material",
                      title: "Material",
                      render: (record: (typeof tarifas)[0]) =>
                        record.tipo_material ? (
                          <Badge size="xs" color="pink" variant="filled">
                            {record.tipo_material}
                          </Badge>
                        ) : (
                          <span className="text-zinc-600 text-xs italic">-</span>
                        ),
                    },
                  ]
                : []),
              {
                accessor: "descripcion",
                title: "Descripcion",
                render: (record) =>
                  record.descripcion ? (
                    <span className="text-zinc-400 text-xs">{record.descripcion}</span>
                  ) : (
                    <span className="text-zinc-600 text-xs italic">Sin descripcion</span>
                  ),
              },
              {
                accessor: "created_at",
                title: "Fecha Creacion",
                render: (record) => (
                  <span className="text-zinc-400 text-xs">
                    {dayjs(record.created_at).format("DD MMM YYYY, HH:mm")}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </ModalEstandar>

{/* Modal de Consumo directo (se abre desde el boton "Agregar Consumo" del bloque) */}
      <ModalEstandar
        opened={consumoModalOpen}
        close={() => setConsumoModalOpen(false)}
        title={consumoEditId ? "Editar Consumo" : "Registrar Consumo"}
        size="xl"
      >
        <Stack gap="md">
          {/* Fila 1: Almacén | Producto | Cantidad */}
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
            <Select
              label="Almacén"
              placeholder="Seleccione almacen"
              data={almacenesConsumo}
              value={consumoForm.idAlmacen}
              onChange={(val) =>
                setConsumoForm((prev) => ({
                  ...prev,
                  idAlmacen: val ?? null,
                  idLoteProducto: null,
                }))
              }
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

            <Select
              label="Producto"
              placeholder="Seleccione producto"
              data={productos.map((p) => ({
                value: String(p.id_producto),
                label: p.nombre,
              }))}
              value={consumoForm.idProducto}
              onChange={(val) =>
                setConsumoForm((prev) => ({
                  ...prev,
                  idProducto: val ?? null,
                  idLoteProducto: null,
                }))
              }
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

            <NumberInput
              label="Cantidad"
              placeholder="Ej: 5.5"
              value={consumoForm.cantidadConsumo}
              onChange={(val) =>
                setConsumoForm((prev) => ({
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

          {/* Fila 2: (UND x UND) | Unidad de Medida */}
          {/* El primer input muestra solo las abreviaturas de las unidades
              (base x seleccionada) y se bloquea segun la conversion:
              - Si la unidad seleccionada es la base => factor = 1.
              - Si difiere y EXISTE conversion automatica => factor.
              - Si difiere y NO hay conversion => queda editable. */}
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
            {(() => {
              const prodSel = productos.find(
                (p) =>
                  String(p.id_producto) === String(consumoForm.idProducto),
              );
              const baseAbbr =
                prodSel?.unidad_medida_base_abv ||
                unidadesMedida.find(
                  (u) =>
                    String(u.id_unidad_medida) ===
                    String(prodSel?.id_unidad_medida_base ?? ""),
                )?.abreviatura ||
                "--";
              const selAbbr =
                unidadesMedida.find(
                  (u) =>
                    String(u.id_unidad_medida) ===
                    String(consumoForm.idUnidadMedida ?? ""),
                )?.abreviatura || "--";
              const unidadesIdenticas =
                baseAbbr !== "--" &&
                selAbbr !== "--" &&
                baseAbbr === selAbbr;
              // Misma logica que `useRegistroRequerimiento.ts`:
              // buscar en `selected.conversiones` el entry donde
              // `id_unidad_destino === baseId`, y devolver 1/factor.
              let conversionAutomatica: number | null = null;
              if (
                !unidadesIdenticas &&
                prodSel &&
                consumoForm.idUnidadMedida
              ) {
                const baseId = String(prodSel.id_unidad_medida_base);
                const selId = String(consumoForm.idUnidadMedida);
                const unidadSel = unidadesMedida.find(
                  (u) => String(u.id_unidad_medida) === selId,
                );
                const conv =
                  unidadSel?.conversiones?.find(
                    (c) => String(c.id_unidad_destino) === baseId,
                  ) ?? null;
                if (conv) {
                  const factor = Number(conv.factor_conversion);
                  if (Number.isFinite(factor) && factor > 0) {
                    conversionAutomatica = 1 / factor;
                  }
                }
              }
              const inputBloqueado =
                unidadesIdenticas || conversionAutomatica !== null;
              return (
                <NumberInput
                  label={`(${baseAbbr} x ${selAbbr})`}
                  placeholder={
                    unidadesIdenticas
                      ? "1"
                      : !consumoForm.idUnidadMedida
                        ? "--x--"
                        : conversionAutomatica !== null
                          ? ""
                          : "Sin conversion automatica - ingrese factor"
                  }
                  value={consumoForm.contenidoPorPresentacion}
                  onChange={(val) =>
                    setConsumoForm((prev) => ({
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
              );
            })()}

            <Select
              label="Unidad de Medida"
              placeholder="Seleccione unidad"
              data={unidadesMedida.map((u) => ({
                value: String(u.id_unidad_medida),
                label: `${u.nombre} (${u.abreviatura})`,
              }))}
              value={consumoForm.idUnidadMedida}
              onChange={(val) =>
                setConsumoForm((prev) => ({
                  ...prev,
                  idUnidadMedida: val ?? null,
                }))
              }
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
          </SimpleGrid>

          {/* Fila 3: Lote (izquierda) | Resumen del consumo (derecha) */}
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
            {/* Lote */}
            {(() => {
              const hayLotes = lotesModal.length > 0;
              const placeholderLote = !consumoForm.idAlmacen
                ? "Seleccione almacen"
                : !consumoForm.idProducto
                  ? "Seleccione producto"
                  : loadingLotesModal
                    ? "Cargando lotes..."
                    : hayLotes
                      ? "Seleccione lote"
                      : "No disponible en almacen";
              return (
                <Stack gap={4}>
                  <Select
                    label="Lote (Producto)"
                    placeholder={placeholderLote}
                    data={lotesModal.map((l) => ({
                      value: String(l.id_lote),
                      label: `${l.correlativo} - stock: ${l.stock_actual_base}`,
                    }))}
                    value={consumoForm.idLoteProducto}
                    onChange={(val) =>
                      setConsumoForm((prev) => ({
                        ...prev,
                        idLoteProducto: val ?? null,
                      }))
                    }
                    searchable
                    disabled={
                      !consumoForm.idAlmacen ||
                      !consumoForm.idProducto ||
                      !consumoForm.idUnidadMedida ||
                      !hayLotes ||
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
                  {!hayLotes &&
                    consumoForm.idAlmacen &&
                    consumoForm.idProducto &&
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
              );
            })()}

            {/* Resumen del consumo */}
            {(() => {
              const prodSelResumen = productos.find(
                (p) =>
                  String(p.id_producto) === String(consumoForm.idProducto),
              );
              const baseNombre =
                prodSelResumen?.unidad_medida_base ||
                unidadesMedida.find(
                  (u) =>
                    String(u.id_unidad_medida) ===
                    String(prodSelResumen?.id_unidad_medida_base ?? ""),
                )?.nombre ||
                "--";
              const baseAbbrResumen =
                prodSelResumen?.unidad_medida_base_abv ||
                unidadesMedida.find(
                  (u) =>
                    String(u.id_unidad_medida) ===
                    String(prodSelResumen?.id_unidad_medida_base ?? ""),
                )?.abreviatura ||
                "--";
              const unidadSel = unidadesMedida.find(
                (u) =>
                  String(u.id_unidad_medida) ===
                  String(consumoForm.idUnidadMedida ?? ""),
              );
              const selNombre = unidadSel?.nombre || "--";
              const selAbbrResumen = unidadSel?.abreviatura || "--";

              const cantConsumoNum =
                consumoForm.cantidadConsumo === ""
                  ? 0
                  : Number(consumoForm.cantidadConsumo);
              const cppNum =
                consumoForm.contenidoPorPresentacion === ""
                  ? 0
                  : Number(consumoForm.contenidoPorPresentacion);
              const cantBaseNum = cantConsumoNum * cppNum;
              const tieneCantidad = cantConsumoNum > 0 && cppNum > 0;

              return (
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
                    {prodSelResumen?.nombre ? (
                      <Badge
                        size="xs"
                        color="indigo"
                        variant="light"
                        radius="sm"
                      >
                        {prodSelResumen.nombre}
                      </Badge>
                    ) : null}
                  </Group>
                  <Group gap="lg" wrap="nowrap">
                    <Stack gap={2}>
                      <Text
                        size="10px"
                        c="zinc.5"
                        fw={700}
                        className="uppercase"
                      >
                        {`En ${selNombre !== "--" ? enPlural(selNombre) : "---"}`}
                      </Text>
                      <Group gap={6} align="baseline" wrap="nowrap">
                        <Text
                          fw={800}
                          size="xl"
                          className={
                            tieneCantidad ? "text-white" : "text-zinc-700"
                          }
                        >
                          {formatNumber(cantConsumoNum)}
                        </Text>
                        <Text
                          size="xs"
                          fw={700}
                          c="zinc.5"
                          className="uppercase tracking-wider"
                        >
                          {selAbbrResumen}
                        </Text>
                      </Group>
                    </Stack>
                    <div className="h-10 w-px bg-indigo-500/20" />
                    <Stack gap={2}>
                      <Text
                        size="10px"
                        c="zinc.5"
                        fw={700}
                        className="uppercase"
                      >
                        {`En ${baseNombre !== "--" ? enPlural(baseNombre) : "---"}`}
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
                          {formatNumber(cantBaseNum)}
                        </Text>
                        <Text
                          size="xs"
                          fw={700}
                          c="zinc.5"
                          className="uppercase tracking-wider"
                        >
                          {baseAbbrResumen}
                        </Text>
                      </Group>
                    </Stack>
                  </Group>
                  <Text size="9px" c="dimmed" mt={6} ta="center">
                    {tieneCantidad
                      ? `${formatNumber(cantConsumoNum)} ${selAbbrResumen} × ${cppNum} = ${formatNumber(cantBaseNum)} ${baseAbbrResumen}`
                      : "Complete cantidad y contenido para ver la equivalencia."}
                  </Text>
                </Card>
              );
            })()}
          </SimpleGrid>

          {/* Fila 4: Comentario (full width) */}
          <Textarea
            label="Comentario (opcional)"
            placeholder="Notas del consumo..."
            value={consumoForm.comentario}
            onChange={(e) =>
              setConsumoForm((prev) => ({
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
              onClick={() => setConsumoModalOpen(false)}
              className="bg-zinc-800! text-zinc-300! border-zinc-700!"
            >
              Cancelar
            </Button>
            <Button
              color="amber.6"
              size="xs"
              radius="lg"
              onClick={guardarConsumoModal}
              leftSection={<BeakerIcon className="w-4 h-4" />}
              className="bg-amber-600! hover:bg-amber-700! text-white! font-bold"
            >
              {consumoEditId ? "Guardar Cambios" : "Anadir Consumo"}
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>
    </Stack>
  );
};

export default RegistroUso;