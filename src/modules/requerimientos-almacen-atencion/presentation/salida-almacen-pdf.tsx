import { Document, Page, View, Text } from "@react-pdf/renderer";
import dayjs from "dayjs";
import { createTw } from "react-pdf-tailwind";
import { formatNumber } from "../../../shared/functions/formatNumber";

const tw = createTw({});

/**
 * Línea de detalle que se imprimirá en el PDF de Salida de Almacén.
 * Construida a partir de los datos en memoria al momento de registrar la
 * entrega, por lo que no depende de endpoints adicionales.
 */
export interface SalidaAlmacenItem {
  id_detalle: number;
  producto: string;
  unidad_medida_abv: string;
  unidad_medida_base_abv: string;
  cantidad: number;
  cantidad_base: number;
  /** Correlativo del lote (cuando se entrega desde un lote) */
  lote_correlativo?: string | null;
  /** Correlativo del activo fijo (cuando se entrega un activo) */
  activo_correlativo?: string | null;
  destino_tipo?: "mantenimiento" | "produccion" | null;
  destino_detalle?: string | null;
  comentario?: string | null;
  es_auditable: boolean;
}

export interface SalidaAlmacenPDFProps {
  /** 'normal' imprime "SALIDA DE ALMACÉN"; 'auditable' agrega sufijo */
  tipo: "normal" | "auditable";
  correlativo_requerimiento: string;
  correlativo_entrega?: string | null;
  fecha_hora: string;
  almacen: string;
  solicitante: string;
  receptor: string;
  almacenero: string;
  observacion?: string | null;
  evidencias_nombres?: string[];
  items: SalidaAlmacenItem[];
}

export const SalidaAlmacenPDF = ({
  tipo,
  correlativo_requerimiento,
  correlativo_entrega,
  fecha_hora,
  almacen,
  solicitante,
  receptor,
  almacenero,
  observacion,
  evidencias_nombres,
  items,
}: SalidaAlmacenPDFProps) => {
  const titulo =
    tipo === "auditable"
      ? "SALIDA DE ALMACÉN - AUDITABLES"
      : "SALIDA DE ALMACÉN";

  const tituloColor =
    tipo === "auditable" ? tw("bg-red-600") : tw("bg-indigo-600");

  return (
    <Document title={`${titulo} - ${correlativo_requerimiento}`}>
      <Page size="A4" style={tw("p-8 text-[10pt] text-zinc-800 bg-white")}>
        {/* Cabecera Principal */}
        <View
          style={tw(
            "flex-row justify-between items-end border-b pb-2 mb-4 border-zinc-400",
          )}
        >
          <View style={tw("flex-1 pr-4")}>
            <Text style={tw("text-[12pt] font-bold text-zinc-900")}>
              {almacen}
            </Text>
            <Text style={tw("text-[9pt] text-zinc-600 mt-1")}>{titulo}</Text>
          </View>
          <View style={tw("items-end")}>
            <Text style={tw("text-[14pt] font-bold text-zinc-900")}>
              Ref. Req. {correlativo_requerimiento}
            </Text>
            {correlativo_entrega && (
              <Text style={tw("text-[10pt] font-bold text-zinc-700 mt-1")}>
                Ent. N° {correlativo_entrega}
              </Text>
            )}
            <Text style={tw("text-[8pt] text-zinc-600 mt-1")}>
              Generado: {dayjs(fecha_hora).format("DD/MM/YYYY HH:mm")}
            </Text>
          </View>
        </View>

        {/* Banda con el tipo de documento */}
        <View style={tw("mb-4")}>
          <View style={[tw("self-start px-3 py-1 rounded"), tituloColor]}>
            <Text
              style={tw(
                "text-white text-[9pt] font-bold uppercase tracking-wider",
              )}
            >
              {titulo}
            </Text>
          </View>
        </View>

        {/* Panel de Información Básica */}
        <View style={tw("flex-col bg-zinc-100 p-3 rounded-lg mb-5")}>
          <View style={tw("flex-row")}>
            <View style={tw("flex-1 pr-3")}>
              <Text
                style={tw("text-[8pt] font-bold text-zinc-500 mb-1 uppercase")}
              >
                Solicitante
              </Text>
              <Text style={tw("text-[10pt] font-bold text-zinc-900")}>
                {solicitante || "---"}
              </Text>
            </View>
            <View style={tw("flex-1 pr-3")}>
              <Text
                style={tw("text-[8pt] font-bold text-zinc-500 mb-1 uppercase")}
              >
                Receptor
              </Text>
              <Text style={tw("text-[10pt] font-bold text-zinc-900")}>
                {receptor || "---"}
              </Text>
            </View>
            <View style={tw("flex-1")}>
              <Text
                style={tw("text-[8pt] font-bold text-zinc-500 mb-1 uppercase")}
              >
                Almacenero
              </Text>
              <Text style={tw("text-[10pt] font-bold text-zinc-900")}>
                {almacenero || "---"}
              </Text>
            </View>
          </View>
          {observacion && observacion.trim() !== "" && (
            <View style={tw("mt-3 pt-3 border-t border-zinc-200")}>
              <Text style={tw("text-[8pt] font-bold text-zinc-500 mb-1")}>
                OBSERVACIÓN
              </Text>
              <Text style={tw("text-[9pt] text-zinc-900")}>{observacion}</Text>
            </View>
          )}
        </View>

        {/* Tabla de Artículos Entregados */}
        <View style={tw("mt-2 mb-5")}>
          <View style={tw("flex-row bg-zinc-700 py-2 px-1 rounded-t-md")}>
            <Text
              style={tw("w-[5%] text-center text-[9pt] font-bold text-white")}
            >
              #
            </Text>
            <Text
              style={tw(
                "w-[35%] text-left pl-2 text-[9pt] font-bold text-white",
              )}
            >
              PRODUCTO
            </Text>
            {/* <Text
              style={tw("w-[15%] text-center text-[9pt] font-bold text-white")}
            >
              LOTE / ACTIVO
            </Text> */}
            <Text
              style={tw("w-[10%] text-center text-[9pt] font-bold text-white")}
            >
              UNIDAD
            </Text>
            <Text
              style={tw("w-[10%] text-center text-[9pt] font-bold text-white")}
            >
              CANT.
            </Text>
            <Text
              style={tw(
                "w-[25%] text-left pl-2 text-[9pt] font-bold text-white",
              )}
            >
              DESTINO / OBS.
            </Text>
          </View>

          {items.length > 0 ? (
            items.map((it, idx) => {
              const isEquivalencia =
                it.unidad_medida_abv !== it.unidad_medida_base_abv;
              return (
                <View
                  key={`${it.id_detalle}-${idx}`}
                  style={tw(
                    "flex-row border-b border-zinc-200 py-2 px-1 items-center",
                  )}
                >
                  <Text
                    style={tw("w-[5%] text-center text-[9pt] text-zinc-500")}
                  >
                    {idx + 1}
                  </Text>
                  <View style={tw("w-[35%] text-left pl-2 pr-2")}>
                    <Text style={tw("font-bold text-[9pt] text-zinc-900")}>
                      {it.producto}
                    </Text>
                    {it.es_auditable && (
                      <Text
                        style={tw(
                          "text-[8pt] text-red-600 mt-0.5 font-bold uppercase",
                        )}
                      >
                        Auditable
                      </Text>
                    )}
                    {isEquivalencia && (
                      <Text style={tw("text-[8pt] text-zinc-500 mt-0.5")}>
                        Equiv: {formatNumber(it.cantidad_base)}{" "}
                        {it.unidad_medida_base_abv} / {it.cantidad}{" "}
                        {it.unidad_medida_abv}
                      </Text>
                    )}
                  </View>
                  {/* <Text
                    style={tw("w-[15%] text-center text-[8pt] text-zinc-700")}
                  >
                    {it.lote_correlativo || it.activo_correlativo || "---"}
                  </Text> */}
                  <Text style={tw("w-[10%] text-center text-[9pt]")}>
                    {it.unidad_medida_abv}
                  </Text>
                  <Text style={tw("w-[10%] text-center text-[10pt] font-bold")}>
                    {formatNumber(it.cantidad)}
                  </Text>
                  <View style={tw("w-[25%] text-left pl-2 pr-1")}>
                    {it.destino_detalle && (
                      <Text style={tw("text-[8pt] text-zinc-700")}>
                        {it.destino_tipo === "mantenimiento"
                          ? "Mantto: "
                          : "Prod: "}
                        {it.destino_detalle}
                      </Text>
                    )}
                    {it.comentario && (
                      <Text style={tw("text-[8pt] text-zinc-500 italic")}>
                        {it.comentario}
                      </Text>
                    )}
                    {!it.destino_detalle && !it.comentario && (
                      <Text style={tw("text-[8pt] text-zinc-400")}>---</Text>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={tw("p-5 items-center")}>
              <Text style={tw("text-[10pt] text-zinc-400 italic")}>
                No hay artículos en esta entrega.
              </Text>
            </View>
          )}
        </View>

        {/* Evidencias (lista de nombres) */}
        {evidencias_nombres && evidencias_nombres.length > 0 && (
          <View style={tw("mb-5")}>
            <Text
              style={tw("text-[8pt] font-bold text-zinc-500 mb-1 uppercase")}
            >
              Evidencias adjuntas ({evidencias_nombres.length})
            </Text>
            <View style={tw("bg-zinc-50 border border-zinc-200 rounded p-2")}>
              {evidencias_nombres.map((n, i) => (
                <Text key={i} style={tw("text-[8pt] text-zinc-700")}>
                  • {n}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Zona Inferior: Firmas y Footer */}
        <View style={tw("absolute bottom-8 left-8 right-8")}>
          {/* Firmas */}
          <View style={tw("flex-row justify-center gap-12 mb-8 px-6")}>
            <View style={tw("w-[40%] items-center")}>
              <View style={tw("w-full border-b border-zinc-600 mb-1")} />
              <Text style={tw("text-[10pt] font-bold")}>
                {solicitante || "Solicitante"}
              </Text>
              <Text style={tw("text-[8pt] text-zinc-500")}>
                FIRMA DEL SOLICITANTE
              </Text>
            </View>
            <View style={tw("w-[40%] items-center")}>
              <View style={tw("w-full border-b border-zinc-600 mb-1")} />
              <Text style={tw("text-[10pt] font-bold")}>
                {almacenero || "Almacenero"}
              </Text>
              <Text style={tw("text-[8pt] text-zinc-500")}>
                FIRMA DEL ALMACENERO
              </Text>
            </View>
          </View>

          {/* Footer Text */}
          <View
            style={tw(
              "text-center text-zinc-400 text-[8pt] border-t border-zinc-200 pt-2",
            )}
          >
            <Text>
              CONSORCIO MINERO Cupper & Hannia SAC - RUC NRO: 20604004005
            </Text>
            <Text>
              DIRECCION CAL.ASOC/ EL DORADO MZA. F1 A LOTE. 7 APV. EL DORADO
              LIMA - LIMA - PUENTE PIEDRA
            </Text>
            <Text style={tw("mt-1")}>
              Documento impreso el {dayjs().format("DD/MM/YYYY HH:mm")}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
