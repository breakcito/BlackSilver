import type ExcelJS from "exceljs";
import dayjs from "dayjs";
import type { RES_ControlUsoLog } from "../service/control-uso.responses";
import { MESES } from "../../../shared/variables/meses";
import { Estado_ControlUso } from "../../../shared/enums/control-uso/estadoControlUso";

// Paleta rotativa de cabeceras laterales de ÁREA (LABOR)
// cicla: verde → amarillo → rosa → verde → amarillo → rosa → ...
const COLOR_AREA_BG = ["FF16A34A", "FFEAB308", "FFEC4899"];

const styleDataCell = (cell: ExcelJS.Cell, colorBorder: string) => {
  cell.font = { size: 9, name: "Arial" };
  cell.alignment = { vertical: "middle", horizontal: "center" };
  cell.border = {
    top: { style: "thin", color: { argb: colorBorder } },
    bottom: { style: "thin", color: { argb: colorBorder } },
    left: { style: "thin", color: { argb: colorBorder } },
    right: { style: "thin", color: { argb: colorBorder } },
  };
};

const styleDataRow = (row: ExcelJS.Row, colorBorder: string) => {
  row.eachCell({ includeEmpty: true }, (cell) => {
    styleDataCell(cell, colorBorder);
  });
  row.height = 19;
};

// A → Z → AA → AB (1-indexed)
const colLetter = (idx: number): string => {
  let letter = "";
  let n = idx;
  while (n > 0) {
    const r = (n - 1) % 26;
    letter = String.fromCharCode(65 + r) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
};

const HEADER_BG = "FF1E3A8A";
const HEADER_TEXT = "FFFFFFFF";
const BORDER = "FF000000";

export const buildControlVueltasExcel = async (
  workbook: ExcelJS.Workbook,
  logs: RES_ControlUsoLog[],
  mes: number,
  anio: number
) => {
  const mesNombre = (MESES.find((m) => m.value === String(mes))?.label || String(mes)).toUpperCase();

  const daysInMonth = dayjs(`${anio}-${mes}-01`).daysInMonth();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Solo logs con vueltas y NO anulados (los anulados se excluyen del
  // Excel principal).
  const vueltasLogs = logs.filter((l) => {
    if (
      (l.estado ?? Estado_ControlUso.Activo).toString().toLowerCase() ===
      Estado_ControlUso.Anulado.toLowerCase()
    ) {
      return false;
    }
    return l.cantidad_vueltas !== null && l.cantidad_vueltas !== undefined;
  });

  if (vueltasLogs.length === 0) {
    const sheet = workbook.addWorksheet("Sin Registros", { views: [{ showGridLines: true }] });
    sheet.addRow(["No existen registros por vueltas para el período seleccionado."]);
    return;
  }

  // ------------------------------------------------------------------
  // Agrupación principal: 1 hoja por (id_activo_fijo × lugar de trabajo)
  // Misma lógica de prioridad que excel-control-horas.ts
  //   mina > cliente > ubicacion_activo > "TERCEROS"
  // ------------------------------------------------------------------
  const gruposMap = new Map<string, RES_ControlUsoLog[]>();
  vueltasLogs.forEach((l) => {
    let lugarKey = "TERCEROS";
    if (l.es_para_mina && l.mina) lugarKey = l.mina.toUpperCase();
    else if (l.cliente) lugarKey = l.cliente.toUpperCase();
    else if (l.ubicacion_activo) lugarKey = l.ubicacion_activo.toUpperCase();

    const groupKey = `${l.id_activo_fijo}_${lugarKey}`;
    const list = gruposMap.get(groupKey) || [];
    list.push(l);
    gruposMap.set(groupKey, list);
  });

  for (const activoLogs of gruposMap.values()) {
    const primerLog = activoLogs[0];
    const nombreActivo = (primerLog.producto || primerLog.categoria || "EQUIPO").toUpperCase();
    const codigoActivo = (primerLog.codigo || primerLog.correlativo || "").toUpperCase();

    let lugarTrabajo = "GENERAL";
    if (primerLog.es_para_mina && primerLog.mina) lugarTrabajo = primerLog.mina.toUpperCase();
    else if (primerLog.cliente) lugarTrabajo = primerLog.cliente.toUpperCase();
    else if (primerLog.ubicacion_activo) lugarTrabajo = primerLog.ubicacion_activo.toUpperCase();

    const rawTitle = `${nombreActivo} | ${codigoActivo} - ${lugarTrabajo}`;
    const sheetTitle = rawTitle.slice(0, 30).replace(/[:\\/?*[\]]/g, "_");
    const sheet = workbook.addWorksheet(sheetTitle, { views: [{ showGridLines: true }] });

    // ----------------------------------------------------------------
    // Columnas (orden de la imagen)
    //   item | area | detalle | centro_costo | saldos_iniciales |
    //   d1..dN | total_vueltas | p_unit | total_s | total_s_acum
    // `total_s_acum` es el acumulado de `total_s` por labor (area):
    // cada fila suma su costo al running total del area actual.
    // ----------------------------------------------------------------
    const columns: Partial<ExcelJS.Column>[] = [
      { header: "", key: "item", width: 6 },
      { header: "", key: "area", width: 14 },
      { header: "", key: "detalle", width: 22 },
      { header: "", key: "centro_costo", width: 16 },
      { header: "", key: "saldos_iniciales", width: 14 },
    ];
    for (let d = 1; d <= daysInMonth; d++) {
      columns.push(       { header: "", key: `d${d}`, width: 6 });
    }
    columns.push({ header: "", key: "total_vueltas", width: 14 });
    columns.push({ header: "", key: "p_unit", width: 12 });
    columns.push({ header: "", key: "total_s", width: 14 });
    columns.push({ header: "", key: "total_s_acum", width: 14 });
    sheet.columns = columns;

    const lastColLetter = colLetter(columns.length);

    // ----------------------------------------------------------------
    // Cabecera principal (Fila 1-2)
    // ----------------------------------------------------------------
    let rowIdx = 1;
    sheet.mergeCells(`A${rowIdx}:${lastColLetter}${rowIdx + 1}`);
    const titleCell = sheet.getCell(`A${rowIdx}`);
    titleCell.value = `REGISTRO DE VUELTAS - ${nombreActivo} | ${codigoActivo} - ${lugarTrabajo} ${anio}`;
    titleCell.font = { bold: true, size: 14, color: { argb: "FF0F172A" }, name: "Arial" };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    rowIdx += 3;

    // ----------------------------------------------------------------
    // Subtítulo metadata (LABOR / MES) — solo referencia, las áreas reales
    // se renderizan en el cuerpo de la tabla con su etiqueta coloreada
    // ----------------------------------------------------------------
    sheet.getCell(`A${rowIdx}`).value = "MES:";
    sheet.getCell(`A${rowIdx}`).font = { bold: true, size: 9 };
    sheet.getCell(`B${rowIdx}`).value = `${mesNombre} ${anio}`;
    sheet.getCell(`B${rowIdx}`).font = { size: 9 };
    rowIdx += 2;

    // ----------------------------------------------------------------
    // Header de la tabla
    //   ITEM | ÁREA | DETALLE | CENTRO DE COSTO | SALDOS INICIALES |
    //   d1..dN | TOTAL DE VUELTAS | P.UNIT | TOTAL S/. | ACUM.
    // (ACUM. = acumulado del `TOTAL S/.` por labor/area; se resetea al
    // cambiar de area.)
    // ----------------------------------------------------------------
    const headerValues: Record<string, string | number> = {
      item: "ITEM",
      area: "ÁREA",
      detalle: "DETALLE",
      centro_costo: "CENTRO DE COSTO",
      saldos_iniciales: "SALDOS INICIALES",
      total_vueltas: "TOTAL DE VUELTAS",
      p_unit: "P.UNIT",
      total_s: "TOTAL S/.",
      total_s_acum: "ACUM.",
    };
    daysArray.forEach((d) => {
      headerValues[`d${d}`] = String(d);
    });

    const headerRow = sheet.getRow(rowIdx);
    headerRow.values = headerValues;
    headerRow.height = 22;
    headerRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
      cell.font = { bold: true, color: { argb: HEADER_TEXT }, size: 9, name: "Arial" };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: BORDER } },
        bottom: { style: "thin", color: { argb: BORDER } },
        left: { style: "thin", color: { argb: BORDER } },
        right: { style: "thin", color: { argb: BORDER } },
      };
    });
    rowIdx++;

    // ----------------------------------------------------------------
    // Cuerpo: agrupar por ÁREA (labor)
    //   dentro de cada área, agrupar por (DETALLE/material, P.UNIT)
    //   - Si el grupo NO es HOROMETRO → 1 fila por grupo
    //   - Si el grupo ES HOROMETRO → 2 sub-filas (INICIO / TERMINADO)
    //   - Mismo día + mismo (área, detalle, p_unit) → se suman las vueltas
    //   - Material distinto o P.UNIT distinto → filas separadas (independientes)
    // ----------------------------------------------------------------
    const areaMap = new Map<string, RES_ControlUsoLog[]>();
    activoLogs.forEach((l) => {
      const areaKey = (l.labor || "GENERAL").toUpperCase();
      const list = areaMap.get(areaKey) || [];
      list.push(l);
      areaMap.set(areaKey, list);
    });

    let itemCounter = 0;
    let areaColorIdx = 0;
    let grandTotalVueltas = 0;
    let grandTotalCosto = 0;
    const preciosUnitarios: number[] = [];

    // Helper: el material del grupo se considera SACOS si su nombre
    // contiene "saco" (case-insensitive). En ese caso las celdas diarias
    // deben mostrar `cantidad_sacos` (no `cantidad_vueltas`) y el
    // `TOTAL DE VUELTAS` queda vacio (los sacos no son vueltas).
    const esMaterialSacos = (material: string): boolean => {
      return material.trim().toLowerCase().includes("saco");
    };

    for (const [areaName, areaLogs] of areaMap.entries()) {
      const areaColor = COLOR_AREA_BG[areaColorIdx % COLOR_AREA_BG.length];
      areaColorIdx++;

      // Acumulado del TOTAL S/. dentro de esta area. Se resetea a 0 al
      // entrar en cada nueva labor.
      let acumAreaS = 0;

      // Agrupación dentro del ÁREA por (DETALLE, P_UNIT).
      // - material efectivo: tarifa_material ?? tipo_material ?? ""  (fallback)
      // - key de agr.: UPPERCASE(material efectivo, trimmed) + p_unit (case-insensitive)
      // - display: el detalle original del primer log encontrado (o "HOROMETRO" si es grupo sin material)
      // - esHorometro (a nivel GRUPO): todos los logs del grupo son HOROMETRO,
      //   lo cual ocurre cuando:
      //     (a) todos tienen material "HOROMETRO",  o
      //     (b) todos NO tienen material definido pero sí tienen datos de horómetro (horometro_inicio/fin no nulos).
      //   Los grupos con material real (DESMONTE/MINERAL/etc.) NUNCA son HOROMETRO,
      //   aunque el log tenga datos de horómetro (esos se ignoran en este reporte de vueltas).
      const materialEfectivo = (l: RES_ControlUsoLog): string =>
        (l.tarifa_material ?? l.tipo_material ?? "").trim();

      const logEsHorometro = (l: RES_ControlUsoLog): boolean => {
        const mat = materialEfectivo(l).toUpperCase();
        if (mat === "HOROMETRO") return true;
        if (mat !== "") return false;
        // Sin material definido → es HOROMETRO si hay lecturas de horómetro en el log
        return (
          l.control_por_horometro === 1 ||
          l.horometro_inicio !== null ||
          l.horometro_fin !== null
        );
      };

      type DetalleGroup = {
        logs: RES_ControlUsoLog[];
        displayDetalle: string;
        pUnit: number;
      };

      const detalleMap = new Map<string, DetalleGroup>();
      areaLogs.forEach((l) => {
        const matTrim = materialEfectivo(l);
        const matUpper = matTrim.toUpperCase();
        const pUnitStr = String(l.precio_unitario ?? "");
        const key = `${matUpper}|${pUnitStr}`;

        if (!detalleMap.has(key)) {
          detalleMap.set(key, {
            logs: [],
            // Si el log no tiene material, pero el GRUPO va a renderizarse como
            // HOROMETRO, el display placeholder será "HOROMETRO". Aquí dejamos ""
            // provisional; se sobreescribe después si el grupo termina siendo HOROMETRO.
            displayDetalle: matTrim,
            pUnit: Number(l.precio_unitario ?? 0),
          });
        }
        detalleMap.get(key)!.logs.push(l);
      });

      const logsConHorometro = areaLogs.filter(
        (l) => l.horometro_inicio !== null || l.horometro_fin !== null
      );
      if (logsConHorometro.length > 0) {
        detalleMap.set("HOROMETRO|", {
          logs: logsConHorometro,
          displayDetalle: "HOROMETRO",
          pUnit: 0,
        });
      }

      // Orden: materiales alfabéticamente, HOROMETRO al final
      const orderedKeys = Array.from(detalleMap.keys()).sort((a, b) => {
        const da = a.split("|")[0];
        const db = b.split("|")[0];
        if (da === "HOROMETRO") return 1;
        if (db === "HOROMETRO") return -1;
        return da.localeCompare(db);
      });

      // Filas del área (necesitamos el rango para merge de la col ÁREA)
      const areaRowRange: number[] = [];

      for (const key of orderedKeys) {
        const group = detalleMap.get(key)!;
        const logsK = group.logs;
        const pUnit = group.pUnit;

        // HOROMETRO solo si TODOS los logs del grupo califican como horometro.
        // Si en el grupo hay logs con material real (DESMONTE, MINERAL, ...),
        // se renderiza como fila material normal aunque alguno tenga horometro.
        const allHoro = logsK.every(logEsHorometro);
        const esHorometro = key === "HOROMETRO|" || allHoro;

        // Display DETALLE:
        //   - Si es HOROMETRO y no hay material literal → "HOROMETRO"
        //   - Si hay un log con material real → ese material (del primero no-vacío)
        //   - Si es HOROMETRO y TODOS dicen "HOROMETRO" literal → "HOROMETRO"
        const firstWithMat = logsK.find((l) => materialEfectivo(l) !== "");
        let detalleText = group.displayDetalle;
        if (esHorometro) {
          const tieneHoroLiteral = logsK.some(
            (l) => (l.tarifa_material ?? "").trim().toUpperCase() === "HOROMETRO"
          );
          detalleText = key === "HOROMETRO|" || tieneHoroLiteral || !firstWithMat
            ? "HOROMETRO"
            : materialEfectivo(firstWithMat!);
        } else if (firstWithMat) {
          detalleText = materialEfectivo(firstWithMat);
        }
        // Si detalleText sigue vacío (caso: log con tarifa_material null y sin datos horometro),
        // queda "" como pediste ("si no tiene quedaria en blanco").

        // Agrupar logs por día
        const dayMap = new Map<number, RES_ControlUsoLog[]>();
        logsK.forEach((l) => {
          const d = dayjs(l.fecha_hora_inicio_control).date();
          const arr = dayMap.get(d) || [];
          arr.push(l);
          dayMap.set(d, arr);
        });

        if (!esHorometro) {
          // ────────────────────────────────────────────────
          // Caso NORMAL: una sola fila por (detalle, p_unit)
          // ────────────────────────────────────────────────
          itemCounter++;
          areaRowRange.push(rowIdx);

          const row = sheet.getRow(rowIdx);
          const data: Record<string, string | number> = {
            item: itemCounter,
            area: "",
            detalle: detalleText,
            centro_costo: "",
            saldos_iniciales: "",
          };

          // Si el material del grupo es "sacos", las celdas diarias muestran
          // `cantidad_sacos` (no vueltas) y el TOTAL DE VUELTAS queda vacio.
          const grupoEsSacos = esMaterialSacos(detalleText);

          let totalVueltas = 0;
          daysArray.forEach((d) => {
            const logsDay = dayMap.get(d);
            if (logsDay && logsDay.length > 0) {
              if (grupoEsSacos) {
                // En el reporte de vueltas los sacos NO cuentan como
                // vueltas: pintamos la cantidad de sacos en su celda.
                const sumSacos = logsDay.reduce(
                  (s, l) => s + Number(l.cantidad_sacos || 0),
                  0
                );
                data[`d${d}`] = sumSacos;
              } else {
                // Caso normal: suma de vueltas del dia.
                const sumV = logsDay.reduce(
                  (s, l) => s + Number(l.cantidad_vueltas || 0),
                  0
                );
                data[`d${d}`] = sumV;
                totalVueltas += sumV;
              }
            } else {
              data[`d${d}`] = "";
            }
          });

          // Si el grupo es sacos, el TOTAL DE VUELTAS queda vacio (los
          // sacos no son vueltas). Si no, mostramos el total acumulado.
          data.total_vueltas = grupoEsSacos ? "" : totalVueltas;
          data.p_unit = pUnit;
          const costoFila = totalVueltas * pUnit;
          data.total_s = costoFila;
          // Acumulado por area: solo aplica a filas con costo (pUnit > 0).
          // Si no hay vueltas/costo, no acumula (mantiene el ultimo valor
          // util? No, mejor lo dejamos en blanco para no sumar basura).
          if (costoFila > 0) {
            acumAreaS += costoFila;
            data.total_s_acum = acumAreaS;
          } else {
            data.total_s_acum = "";
          }
          grandTotalVueltas += totalVueltas;
          grandTotalCosto += costoFila;
          if (pUnit > 0) preciosUnitarios.push(pUnit);

          row.values = data;
          styleDataRow(row, BORDER);
          row.getCell("total_vueltas").numFmt = "0";
          row.getCell("p_unit").numFmt = '"S/."#,##0.00';
          row.getCell("total_s").numFmt = '"S/."#,##0.00';
          row.getCell("total_s_acum").numFmt = '"S/."#,##0.00';
          for (let d = 1; d <= daysInMonth; d++) {
            row.getCell(`d${d}`).numFmt = "0";
          }

          rowIdx++;
        } else {
          // ────────────────────────────────────────────────
          // Caso HOROMETRO: 2 sub-filas (INICIO / TERMINADO)
          // ────────────────────────────────────────────────
          itemCounter++;
          areaRowRange.push(rowIdx); // INICIO

          // Sub-fila 1: INICIO
          const rowIni = sheet.getRow(rowIdx);
          const dataIni: Record<string, string | number> = {
            item: itemCounter,
            area: "",
            detalle: detalleText,
            centro_costo: "INICIO",
            saldos_iniciales: "",
            total_vueltas: "",
            p_unit: "",
            total_s: "",
          };
          daysArray.forEach((d) => {
            const logsDay = dayMap.get(d);
            if (logsDay && logsDay.length > 0) {
              const ini = logsDay.find((l) => l.horometro_inicio !== null);
              dataIni[`d${d}`] =
                ini && ini.horometro_inicio !== null ? Number(ini.horometro_inicio) : "";
            } else {
              dataIni[`d${d}`] = "";
            }
          });
          rowIni.values = dataIni;
          styleDataRow(rowIni, BORDER);
          for (let d = 1; d <= daysInMonth; d++) {
            rowIni.getCell(`d${d}`).numFmt = "0.00";
          }
          rowIdx++;

          // Sub-fila 2: TERMINADO
          areaRowRange.push(rowIdx); // TERMINADO
          const rowFin = sheet.getRow(rowIdx);
          const dataFin: Record<string, string | number> = {
            item: "",
            area: "",
            detalle: "",
            centro_costo: "TERMINADO",
            saldos_iniciales: "",
            total_vueltas: "",
            p_unit: "",
            total_s: "",
          };
          daysArray.forEach((d) => {
            const logsDay = dayMap.get(d);
            if (logsDay && logsDay.length > 0) {
              const fin = logsDay.find((l) => l.horometro_fin !== null);
              dataFin[`d${d}`] =
                fin && fin.horometro_fin !== null ? Number(fin.horometro_fin) : "";
            } else {
              dataFin[`d${d}`] = "";
            }
          });
          rowFin.values = dataFin;
          styleDataRow(rowFin, BORDER);
          for (let d = 1; d <= daysInMonth; d++) {
            rowFin.getCell(`d${d}`).numFmt = "0.00";
          }
          rowIdx++;
        }
      }

      // ──────────────────────────────────────────────────────────
      // Merge + estilado de la celda ÁREA para este grupo
      // (etiqueta vertical coloreada, igual que la imagen)
      // ──────────────────────────────────────────────────────────
      if (areaRowRange.length > 0) {
        const firstR = areaRowRange[0];
        const lastR = areaRowRange[areaRowRange.length - 1];
        const areaCellRef = `B${firstR}`;
        if (lastR > firstR) {
          sheet.mergeCells(`${areaCellRef}:B${lastR}`);
        }
        const areaCell = sheet.getCell(areaCellRef);
        areaCell.value = areaName;
        areaCell.font = {
          bold: true,
          size: 10,
          name: "Arial",
          color: { argb: "FFFFFFFF" },
        };
        areaCell.alignment = {
          vertical: "middle",
          horizontal: "center",
          textRotation: 90,
          wrapText: true,
        };
        areaCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: areaColor },
        };
        areaCell.border = {
          top: { style: "thin", color: { argb: BORDER } },
          bottom: { style: "thin", color: { argb: BORDER } },
          left: { style: "thin", color: { argb: BORDER } },
          right: { style: "thin", color: { argb: BORDER } },
        };
      }
    }

    const totalRow = sheet.getRow(rowIdx);
    totalRow.values = {
      detalle: "",
      total_vueltas: grandTotalVueltas,
      p_unit: preciosUnitarios.length > 0
        ? preciosUnitarios.reduce((sum, precio) => sum + precio, 0) / preciosUnitarios.length
        : "",
      total_s: grandTotalCosto,
      total_s_acum: grandTotalCosto, // Al final, el acumulado del grupo = total general.
    };
    styleDataRow(totalRow, BORDER);
    totalRow.font = { bold: true, size: 10, name: "Arial" };
    totalRow.getCell("total_vueltas").numFmt = "0.00";
    totalRow.getCell("p_unit").numFmt = '"S/."#,##0.00';
    totalRow.getCell("total_s").numFmt = '"S/."#,##0.00';
    totalRow.getCell("total_s_acum").numFmt = '"S/."#,##0.00';
  }
};
