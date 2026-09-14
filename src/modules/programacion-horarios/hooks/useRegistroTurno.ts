import { useState } from "react";
import { TurnoLaboralService } from "../service/turnos.service";
import {
  Schema_CrearTurno,
  Schema_ActualizarTurno,
  type DTO_ActualizarTurno,
  type DTO_CrearTurno,
} from "../service/turnos.requests";
import { useNotify } from "../../../hooks/useNotify";
import type { RES_TurnoLaboral } from "../service/turnos.responses";
import { TipoTurno } from "../../../shared/enums/_generic/tipo-turno";

/**
 * Calcula la duración en horas entre dos strings "HH:mm".
 * Si `salida <= ingreso`, asume que la salida es al día siguiente.
 * Devuelve 0 si alguno de los strings es inválido.
 */
const calcTotalHoras = (ingreso: string, salida: string): number => {
  if (!ingreso || !salida) return 0;
  const matchIn = /^(\d{1,2}):(\d{2})$/.exec(ingreso);
  const matchOut = /^(\d{1,2}):(\d{2})$/.exec(salida);
  if (!matchIn || !matchOut) return 0;
  const minutosIn = Number(matchIn[1]) * 60 + Number(matchIn[2]);
  const minutosOut = Number(matchOut[1]) * 60 + Number(matchOut[2]);
  const diff = minutosOut <= minutosIn
    ? 24 * 60 - minutosIn + minutosOut
    : minutosOut - minutosIn;
  return Math.round((diff / 60) * 100) / 100;
};

const initialForm = (): DTO_CrearTurno => ({
  tipo_turno: TipoTurno.Dia,
  hora_ingreso: "08:00",
  hora_salida: "17:00",
  minutos_tolerancia: null,
  total_horas: 9.0,
  estado: "Activo",
});

export const useRegistroTurno = (
  onSuccess?: (turno: RES_TurnoLaboral) => void,
) => {
  const { notifySuccess, notifyError } = useNotify();
  const [form, setForm] = useState<DTO_CrearTurno>(initialForm());
  const [loading, setLoading] = useState(false);

  const setField = <K extends keyof DTO_CrearTurno>(
    field: K,
    value: DTO_CrearTurno[K],
  ) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "hora_ingreso" || field === "hora_salida") {
        next.total_horas = calcTotalHoras(
          next.hora_ingreso ?? "",
          next.hora_salida ?? "",
        );
      }

      return next;
    });
  };

  const reset = () => setForm(initialForm());

  const precargar = (turno: RES_TurnoLaboral) => {
    const horaIngreso = (turno.hora_ingreso ?? "").slice(0, 5);
    const horaSalida = (turno.hora_salida ?? "").slice(0, 5);
    setForm({
      tipo_turno: (turno.tipo_turno as DTO_CrearTurno["tipo_turno"]) ?? "Dia",
      hora_ingreso: horaIngreso,
      hora_salida: horaSalida,
      minutos_tolerancia: turno.minutos_tolerancia ?? null,
      total_horas:
        typeof turno.total_horas === "number"
          ? turno.total_horas
          : calcTotalHoras(horaIngreso, horaSalida),
      estado: (turno.estado as DTO_CrearTurno["estado"]) ?? "Activo",
    });
  };

  const handleSubmitCrear = async () => {
    const validation = Schema_CrearTurno.safeParse(form);
    if (!validation.success) {
      notifyError(validation.error.issues[0].message);
      return null;
    }
    setLoading(true);
    try {
      const resp = await TurnoLaboralService.crear_turno(validation.data);
      if (resp.success) {
        notifySuccess(resp.message ?? "Turno registrado correctamente");
        const turno = resp.data as RES_TurnoLaboral;
        onSuccess?.(turno);
        reset();
        return turno;
      }
      notifyError(resp.message ?? "Error al registrar el turno");
      return null;
    } catch (err) {
      console.error(err);
      notifyError("Error inesperado al registrar el turno");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEditar = async (idTurno: number) => {
    const payload: Partial<DTO_ActualizarTurno> = {};
    if (form.tipo_turno) payload.tipo_turno = form.tipo_turno;
    if (form.hora_ingreso) payload.hora_ingreso = form.hora_ingreso;
    if (form.hora_salida) payload.hora_salida = form.hora_salida;
    payload.minutos_tolerancia = form.minutos_tolerancia ?? null;
    payload.total_horas = form.total_horas;

    const validation = Schema_ActualizarTurno.safeParse(payload);
    if (!validation.success) {
      notifyError(validation.error.issues[0].message);
      return null;
    }
    setLoading(true);
    try {
      const resp = await TurnoLaboralService.actualizar_turno(
        idTurno,
        validation.data,
      );
      if (resp.success) {
        notifySuccess(resp.message ?? "Turno actualizado");
        const turno = resp.data as RES_TurnoLaboral;
        onSuccess?.(turno);
        reset();
        return turno;
      }
      notifyError(resp.message ?? "Error al actualizar el turno");
      return null;
    } catch (err) {
      console.error(err);
      notifyError("Error inesperado al actualizar el turno");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    setField,
    reset,
    precargar,
    loading,
    handleSubmitCrear,
    handleSubmitEditar,
    calcTotalHoras,
  };
};