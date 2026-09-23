import { useState } from "react";
import { ClientesService } from "../service/clientes.service";
import { useNotify } from "../../../hooks/useNotify";
import {
  Schema_CrearCliente,
  type CrearAlmacenCarbonClienteRequest,
  type CrearClienteRequest,
} from "../service/clientes.requests";
import { TipoEntidad } from "../../../shared/enums/_generic/tipo-entidad";
import type { ClienteResponse } from "../service/clientes.responses";

/**
 * Almacen de carbon capturado en el formulario de registro antes de
 * persistir. Cada almacen es propio del cliente (1:N), asi que el
 * backend lo crea con el `id_cliente` devuelto por el POST de crear
 * cliente. `tempId` solo es la clave local para React (no viaja al
 * backend). Tras `crearAlmacenCarbonPorCliente` la fila queda
 * refrescada con el `id_almacen` real (ver `submit`).
 */
export interface AlmacenCarbonClienteTemporal
  extends CrearAlmacenCarbonClienteRequest {
  tempId: string;
  departamento_nombre?: string | null;
  provincia_nombre?: string | null;
  distrito_nombre?: string | null;
}

/**
 * Hook para registrar un cliente del modulo carbon.
 *
 * Espejo del `useRegistroProveedorCarbon` reducido a lo que el modulo
 * clientes necesita: solo la seccion de almacenes de carbon (sin
 * personal, tipos de carbon, lugares de extraccion ni contratos).
 * El submit hace:
 *   1) POST /clientes (con para_carbon=true forzado)
 *   2) por cada almacen local, POST /clientes/{id_cliente}/almacenes-carbon
 *
 * Patrones copiados literalmente del modulo gemelo de proveedores
 * (deduplicacion por direccion+ubigeo, tempId via crypto.randomUUID,
 * commit en bucle con manejo de fallos por fila).
 */
export const useRegistroClienteCarbon = (
  onSuccess: (c: ClienteResponse) => void,
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notifySuccess, notifyError } = useNotify();

  const [payload, setPayload] = useState<CrearClienteRequest>({
    tipo_entidad: TipoEntidad.Juridica,
    dni: "",
    ruc: "",
    razon_social: "",
    direccion: "",
    telefono: "",
    correo: "",
    para_carbon: true, // forzado: este hook solo se usa en el modulo carbon
  });

  const [almacenesCarbon, setAlmacenesCarbon] = useState<
    AlmacenCarbonClienteTemporal[]
  >([]);

  const handleChange = (field: keyof CrearClienteRequest, value: string) => {
    setPayload((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSelectChange = (value: string | null) => {
    if (value) {
      setPayload((prev) => ({
        ...prev,
        tipo_entidad: value as TipoEntidad,
      }));
      if (error) setError(null);
    }
  };

  /**
   * Documento unificado (RUC o DNI). Mapeo por largo:
   *  - 8 digitos -> DNI (siempre valido, no depende del tipo)
   *  - cualquier otro largo -> RUC (11 digitos + prefijo segun tipo lo valida Zod)
   *  - vacio -> ambos en ""
   * El payload conserva `ruc` y `dni` separados para no tocar el backend.
   */
  const documento = payload.dni || payload.ruc || "";
  const setDocumento = (value: string) => {
    const limpio = value.replace(/\D/g, "");
    if (limpio.length === 8) {
      setPayload((prev) => ({ ...prev, dni: limpio, ruc: "" }));
    } else {
      setPayload((prev) => ({ ...prev, dni: "", ruc: limpio }));
    }
    if (error) setError(null);
  };

  /**
   * Anade un almacen al array local. Si ya hay uno identico (misma
   * direccion), se ignora para evitar duplicados visuales antes de
   * guardar. El backend no impone UNIQUE (es 1:N libre).
   */
  const addAlmacenCarbon = (payload: CrearAlmacenCarbonClienteRequest) => {
    setAlmacenesCarbon((prev) => {
      const dup = prev.some(
        (a) =>
          a.direccion.trim().toLowerCase() ===
            payload.direccion.trim().toLowerCase() &&
          (a.id_departamento ?? null) === (payload.id_departamento ?? null) &&
          (a.id_provincia ?? null) === (payload.id_provincia ?? null) &&
          (a.id_distrito ?? null) === (payload.id_distrito ?? null),
      );
      if (dup) return prev;
      return [
        ...prev,
        {
          ...payload,
          tempId:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `tmp-${Date.now()}-${prev.length}`,
        },
      ];
    });
  };

  const removeAlmacenCarbon = (tempId: string) => {
    setAlmacenesCarbon((prev) => prev.filter((a) => a.tempId !== tempId));
  };

  const updateAlmacenCarbon = (
    tempId: string,
    payload: CrearAlmacenCarbonClienteRequest,
  ) => {
    setAlmacenesCarbon((prev) =>
      prev.map((a) =>
        a.tempId === tempId ? { ...payload, tempId: a.tempId } : a,
      ),
    );
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const validation = Schema_CrearCliente.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      // 1) crear cliente (forzamos para_carbon=true aqui tambien por si
      //    el payload lo mutaron fuera del hook).
      const created = await ClientesService.crearCliente({
        ...validation.data,
        para_carbon: true,
      });

      // 2) crear los almacenes de carbon del cliente. Cada uno es una
      //    fila nueva en `almacen_carbon_cliente` con su propio
      //    `direccion`. Un fallo aqui no revierte el cliente; avisamos
      //    y dejamos pendientes.
      const almacenesFallados: string[] = [];
      for (const a of almacenesCarbon) {
        try {
          const respAlmacen =
            await ClientesService.crearAlmacenCarbonPorCliente(
              created.id_cliente,
              {
                id_departamento: a.id_departamento ?? null,
                id_provincia: a.id_provincia ?? null,
                id_distrito: a.id_distrito ?? null,
                direccion: a.direccion,
              },
            );
          if (!respAlmacen.success) {
            almacenesFallados.push(a.direccion);
          }
        } catch (err) {
          console.error(err);
          almacenesFallados.push(a.direccion);
        }
      }

      if (almacenesFallados.length > 0) {
        notifyError(
          `Cliente guardado, pero no se pudieron registrar almacenes de carbon: ${almacenesFallados.join(", ")}.`,
        );
      } else {
        notifySuccess(
          almacenesCarbon.length > 0
            ? "Cliente y almacenes de carbon registrados correctamente"
            : "Cliente registrado correctamente",
        );
      }

      onSuccess(created);
    } catch (e) {
      console.error(e);
      notifyError("Ocurrio un error al registrar el cliente de carbon");
    } finally {
      setLoading(false);
    }
  };

  return {
    payload,
    documento,
    setDocumento,
    almacenesCarbon,
    addAlmacenCarbon,
    removeAlmacenCarbon,
    updateAlmacenCarbon,
    loading,
    error,
    handleChange,
    handleSelectChange,
    submit,
  };
};