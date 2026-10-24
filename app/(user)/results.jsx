import { formatCop } from "@/src/services/solarEstimate";
import { Colors } from "@/src/theme/colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const SOURCE_LABEL = {
  modelo: "Radiación estimada con Machine Learning (datos NASA POWER)",
  historico: "Radiación según el promedio histórico de la ciudad",
  respaldo: "Radiación de referencia nacional (modelo no disponible)",
  sin_conexion: "Estimación aproximada sin conexión",
};

const parseMonthly = (value) => {
  try {
    const data = JSON.parse(value || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// Barras de generación mensual dibujadas con Views (sin librerías externas)
function MonthlyChart({ data, consumption }) {
  const max = Math.max(consumption, ...data.map((m) => m.gen)) || 1;
  // 18 px reservados para las etiquetas de los meses; 132 px para las barras
  const consumptionLine = 18 + (consumption / max) * 132;
  return (
    <View>
      <Text style={styles.sectionTitle}>Generación estimada por mes (kWh)</Text>
      <View style={styles.chart}>
        <View style={[styles.consumptionLine, { bottom: consumptionLine }]} />
        {data.map((m) => (
          <View key={m.mes} style={styles.barColumn}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  { height: `${(m.gen / max) * 100}%` },
                  m.cob < 100 && styles.barLow,
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{m.mes.slice(0, 1)}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.legend}>
        Línea roja: tu consumo ({consumption} kWh). Barras grises: meses en que el sistema no alcanza a cubrirlo.
      </Text>
    </View>
  );
}

const parseEquipment = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const fmt = (value, digits = 1) =>
  Number(value).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: digits });

function KeyValue({ label, value }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value}</Text>
    </View>
  );
}

function Equipment({ data }) {
  if (!data) return null;
  return (
    <View style={styles.equip}>
      <Text style={styles.sectionTitle}>Equipos e instalación recomendados</Text>

      <View style={styles.equipCard}>
        <Text style={styles.equipTitle}>Inversor</Text>
        <Text style={styles.equipBig}>{fmt(data.inverterKw)} kW</Text>
        <KeyValue label="Tipo" value={data.inverterType} />
        <KeyValue label="Conexión" value={data.inverterConnection} />
        <Text style={styles.equipNote}>{data.inverterAlternative}.</Text>
      </View>

      <View style={styles.equipCard}>
        <Text style={styles.equipTitle}>En tu techo</Text>
        <Text style={styles.equipBig}>{fmt(data.roofAreaM2)} m²</Text>
        <KeyValue label="Área de paneles" value={`${fmt(data.panelAreaM2)} m²`} />
        <KeyValue label="Inclinación" value={`${data.tiltDeg}°`} />
        <KeyValue label="Orientación" value={data.orientation} />
        <KeyValue label="Peso total" value={`${fmt(data.weightKg, 0)} kg (${fmt(data.loadKgM2)} kg/m²)`} />
        <KeyValue label="Producción al año" value={`${fmt(data.annualKwh, 0)} kWh`} />
      </View>

      <View style={styles.equipCard}>
        <Text style={styles.equipTitle}>Baterías (opcional)</Text>
        <Text style={styles.equipNote}>{data.batteryTech}</Text>
        <KeyValue
          label="Respaldo nocturno"
          value={`${data.batteryNightModules} módulo${data.batteryNightModules > 1 ? "s" : ""} · ${fmt(data.batteryNightKwh, 2)} kWh`}
        />
        <KeyValue
          label="Un día de autonomía"
          value={`${data.batteryDayModules} módulo${data.batteryDayModules > 1 ? "s" : ""} · ${fmt(data.batteryDayKwh, 2)} kWh`}
        />
        <Text style={styles.equipNote}>{data.batteryNote}</Text>
      </View>

      {(data.notes || []).map((n) => (
        <Text key={n} style={styles.legend}>
          • {n}
        </Text>
      ))}
    </View>
  );
}

function Costs({ data }) {
  if (!data) return null;
  const [pMin, pMax] = data.payback || [];
  return (
    <View style={styles.equip}>
      <Text style={styles.sectionTitle}>Costo estimado</Text>
      <View style={styles.equipCard}>
        <Text style={styles.equipBig}>{formatCop(data.total)}</Text>
        <Text style={styles.equipNote}>
          {formatCop(data.perKwp)} por kWp · Mercado: {formatCop(data.market[0])} a {formatCop(data.market[1])}
        </Text>
        <View style={{ marginTop: 8 }}>
          {data.detail.map(([rubro, valor]) => (
            <CostRow key={rubro} label={rubro} value={formatCop(valor)} />
          ))}
        </View>
        <View style={styles.costTotal}>
          <CostRow label="Total estimado" value={formatCop(data.total)} bold />
        </View>
        <CostRow label="Recuperas la inversión" value={pMin != null ? `${fmt(pMin)} a ${fmt(pMax)} años` : "N/D"} />
        <CostRow label="Con baterías de respaldo" value={`+ ${formatCop(data.batteryExtra)}`} />
        <CostRow label="Mantenimiento al año" value={`${formatCop(data.maintenance[0])} a ${formatCop(data.maintenance[1])}`} />
      </View>
      {(data.notes || []).map((n) => (
        <Text key={n} style={styles.legend}>
          • {n}
        </Text>
      ))}
      <Text style={styles.legend}>Precios de referencia del mercado colombiano ({data.date}).</Text>
    </View>
  );
}

function CostRow({ label, value, bold }) {
  return (
    <View style={styles.kvRow}>
      <Text style={[styles.costLabel, bold && styles.costLabelBold]}>{label}</Text>
      <Text style={styles.costValue}>{value}</Text>
    </View>
  );
}

export default function Results() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const monthly = useMemo(() => parseMonthly(params.monthly), [params.monthly]);
  const consumption = Number(params.consumption) || 0;
  const equipment = useMemo(() => parseEquipment(params.equipment), [params.equipment]);
  const costs = useMemo(() => parseEquipment(params.costs), [params.costs]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.kicker}>Resultado{params.city ? ` · ${params.city}` : ""}</Text>
        <Text style={styles.title}>Sistema solar estimado</Text>

        <View style={styles.statsGrid}>
          <Stat label="Paneles" value={params.estimatedPanels ?? "N/D"} />
          <Stat label="Cobertura anual" value={`${params.coverage ?? "N/D"}%`} />
          {params.powerKwp ? <Stat label="Potencia" value={`${params.powerKwp} kWp`} /> : null}
          {params.hspAverage ? <Stat label="Horas solares pico" value={params.hspAverage} /> : null}
          {params.annualSavingsCop ? <Stat label="Ahorro al año" value={formatCop(params.annualSavingsCop)} /> : null}
          {params.co2KgYear ? <Stat label="CO₂ evitado al año" value={`${params.co2KgYear} kg`} /> : null}
        </View>

        <Text style={styles.row}>Consumo: {params.consumption ?? "N/D"} kWh/mes</Text>
        {params.areaM2 ? <Text style={styles.row}>Área de techo recomendada: {fmt(params.areaM2)} m²</Text> : null}
        <Text style={styles.recommendation}>{params.recommendation ?? "Sin recomendación disponible"}</Text>

        {monthly.length === 12 ? <MonthlyChart data={monthly} consumption={consumption} /> : null}

        <Equipment data={equipment} />
        <Costs data={costs} />

        <Text style={styles.source}>{SOURCE_LABEL[params.source] ?? SOURCE_LABEL.sin_conexion}</Text>

        <Pressable style={styles.button} onPress={() => router.push("/history")}>
          <Text style={styles.buttonText}>Ir al historial</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E4EEE8",
    padding: 20,
  },
  kicker: {
    color: Colors.gray,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 12,
    marginBottom: 6,
  },
  title: {
    color: Colors.primary,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  stat: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: "#F2F8F3",
    borderRadius: 14,
    padding: 12,
  },
  statValue: {
    color: Colors.dark,
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    color: Colors.gray,
    fontSize: 12,
    marginTop: 2,
  },
  row: {
    color: Colors.dark,
    marginBottom: 8,
  },
  recommendation: {
    color: Colors.primary,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 21,
  },
  sectionTitle: {
    color: Colors.dark,
    fontWeight: "700",
    marginBottom: 10,
  },
  chart: {
    height: 150,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    position: "relative",
  },
  consumptionLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.secondary,
    zIndex: 1,
  },
  barColumn: {
    flex: 1,
    height: "100%",
    alignItems: "center",
  },
  barTrack: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLow: {
    backgroundColor: "#9CA3AF",
  },
  barLabel: {
    color: Colors.gray,
    fontSize: 11,
    height: 16,
    marginTop: 2,
  },
  legend: {
    color: Colors.gray,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17,
  },
  source: {
    color: Colors.gray,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 14,
    marginBottom: 16,
  },
  equip: {
    marginTop: 18,
  },
  equipCard: {
    backgroundColor: "#F2F8F3",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  equipTitle: {
    color: Colors.primary,
    fontWeight: "700",
    marginBottom: 2,
  },
  equipBig: {
    color: Colors.dark,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  equipNote: {
    color: Colors.gray,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  costTotal: {
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
    marginTop: 6,
    paddingTop: 4,
    marginBottom: 6,
  },
  costLabel: {
    color: Colors.gray,
    fontSize: 13,
    flex: 1,
  },
  costLabelBold: {
    color: Colors.dark,
    fontWeight: "700",
  },
  costValue: {
    color: Colors.dark,
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 0,
    textAlign: "right",
  },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 3,
  },
  kvLabel: {
    color: Colors.gray,
    fontSize: 13,
    flexShrink: 0,
  },
  kvValue: {
    color: Colors.dark,
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: Colors.surface,
    fontWeight: "700",
  },
});
