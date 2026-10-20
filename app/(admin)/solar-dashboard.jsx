// Dashboard del Análisis Exploratorio de Datos (EDA) del recurso solar y
// del desempeño del modelo de Machine Learning.
// Datos: GET /ml/eda (agregados de NASA POWER 2005-2024) y GET /ml/modelo.
import {
  ChartColors,
  DivergingBars,
  HorizontalBars,
  Legend,
  LineChart,
  ScatterChart,
} from "@/src/components/charts";
import { apiRequest } from "@/src/services/apiClient";
import { Colors } from "@/src/theme/colors";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const HOME_CITY = "girardot";
const COMPARE_COLORS = [ChartColors.series[0], ChartColors.series[2]]; // azul, aqua
const NATIONAL_COLOR = "#6B7280";

const fmt = (value, digits = 2) =>
  Number(value).toLocaleString("es-CO", { minimumFractionDigits: digits, maximumFractionDigits: digits });

function Section({ title, subtitle, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function StatTile({ label, value, detail }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      {detail ? <Text style={styles.tileDetail}>{detail}</Text> : null}
    </View>
  );
}

function Chip({ label, active, onPress, color }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      {active && color ? <View style={[styles.chipDot, { backgroundColor: color }]} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function SolarDashboard() {
  const [eda, setEda] = useState(null);
  const [model, setModel] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [compare, setCompare] = useState(["riohacha", "quibdo"]);
  const [rankingView, setRankingView] = useState("top");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [edaData, modelData] = await Promise.all([apiRequest("/ml/eda"), apiRequest("/ml/modelo")]);
      setEda(edaData);
      setModel(modelData);
    } catch (e) {
      setError(e?.message || "No se pudieron cargar los datos del análisis.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cityName = useMemo(() => {
    const map = {};
    (eda?.ranking_ciudades || []).forEach((c) => {
      map[c.ciudad_id] = c.ciudad;
    });
    return map;
  }, [eda]);

  const toggleCompare = (id) => {
    setCompare((current) => {
      if (current.includes(id)) return current.filter((c) => c !== id);
      return current.length >= 2 ? [current[1], id] : [...current, id];
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.muted}>Cargando análisis…</Text>
      </View>
    );
  }

  if (error || !eda) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "Sin datos"}</Text>
        <Pressable style={styles.button} onPress={load}>
          <Text style={styles.buttonText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const { resumen } = eda;
  const girardot = resumen.girardot;
  const ranking = eda.ranking_ciudades;

  // --- Perfil mensual: Girardot + ciudades comparadas + promedio nacional
  const lineSeries = [
    { id: HOME_CITY, label: "Girardot", color: ChartColors.highlight, values: eda.perfil_mensual_por_ciudad[HOME_CITY] },
    ...compare.map((id, i) => ({
      id,
      label: cityName[id] || id,
      color: COMPARE_COLORS[i],
      values: eda.perfil_mensual_por_ciudad[id],
    })),
    { id: "nacional", label: "Promedio nacional", color: NATIONAL_COLOR, values: eda.perfil_mensual_nacional, dashed: true },
  ].filter((s) => Array.isArray(s.values));

  // --- Ranking
  const rankingItems = (() => {
    const toItem = (c) => ({ key: c.ciudad_id, label: c.ciudad, value: c.hsp_promedio, highlight: c.ciudad_id === HOME_CITY });
    if (rankingView === "all") return ranking.map(toItem);
    const slice = rankingView === "top" ? ranking.slice(0, 10) : ranking.slice(-10).reverse();
    const items = slice.map(toItem);
    if (!items.some((i) => i.highlight)) {
      const g = ranking.find((c) => c.ciudad_id === HOME_CITY);
      if (g) items.push(toItem(g));
    }
    return items;
  })();
  const rankingMax = ranking[0]?.hsp_promedio;

  // --- Modelos
  const metrics = model?.metricas_validacion || {};
  const modelItems = Object.entries(metrics)
    .map(([name, m]) => ({ key: name, label: name.replace(" (promedio del mes)", ""), value: m.mae, highlight: name === model?.modelo }))
    .sort((a, b) => b.value - a.value);
  const baseline = metrics["Línea base (promedio del mes)"];
  const best = metrics[model?.modelo];
  const reduction = baseline && best ? Math.round((1 - best.mae / baseline.mae) * 100) : null;

  // --- Tendencia anual
  const trendLabels = eda.tendencia_anual.anios.map(String);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Análisis exploratorio · NASA POWER {resumen.periodo}</Text>
        <Text style={styles.title}>Recurso solar en Colombia</Text>
        <Text style={styles.text}>
          {resumen.filas.toLocaleString("es-CO")} registros mensuales de {resumen.ciudades} ciudades. HSP = horas solares
          pico (kWh/m²/día): cuánta energía solar recibe un metro cuadrado en un día.
        </Text>
      </View>

      <View style={styles.tiles}>
        <StatTile label="HSP promedio nacional" value={fmt(resumen.estadisticas_hsp.mean)} detail={`rango ${fmt(resumen.estadisticas_hsp.min, 1)} – ${fmt(resumen.estadisticas_hsp.max, 1)}`} />
        {girardot ? (
          <StatTile label="HSP en Girardot" value={fmt(girardot.hsp_promedio)} detail={`puesto ${girardot.posicion_ranking} de ${girardot.de}`} />
        ) : null}
        {girardot ? <StatTile label="Mejor mes en Girardot" value={girardot.mejor_mes} detail={`peor: ${girardot.peor_mes}`} /> : null}
        {best ? <StatTile label="Error del modelo" value={`${fmt(best.mape_pct, 1)} %`} detail={reduction !== null ? `${reduction} % menos que sin ML` : model.modelo} /> : null}
      </View>

      <Section title="Radiación mes a mes" subtitle="Girardot comparada con otras ciudades. Elige hasta 2 para comparar.">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {ranking
            .filter((c) => c.ciudad_id !== HOME_CITY)
            .map((c) => (
              <Chip
                key={c.ciudad_id}
                label={c.ciudad}
                active={compare.includes(c.ciudad_id)}
                color={COMPARE_COLORS[compare.indexOf(c.ciudad_id)]}
                onPress={() => toggleCompare(c.ciudad_id)}
              />
            ))}
        </ScrollView>
        <Legend items={lineSeries.map((s) => ({ label: s.label, color: s.color, dashed: s.dashed }))} />
        <LineChart labels={eda.meses} series={lineSeries} unit="HSP" />
      </Section>

      <Section title="Ranking de ciudades" subtitle="HSP promedio anual. Girardot en rojo.">
        <View style={styles.segment}>
          {[
            ["top", "Más sol"],
            ["bottom", "Menos sol"],
            ["all", "Todas"],
          ].map(([key, label]) => (
            <Chip key={key} label={label} active={rankingView === key} onPress={() => setRankingView(key)} />
          ))}
        </View>
        <HorizontalBars items={rankingItems} max={rankingMax} />
      </Section>

      <Section title="Nubosidad vs. radiación" subtitle="Cada punto es una ciudad (promedio 2005-2024). A más nubes, menos sol.">
        <ScatterChart
          points={eda.nubosidad_vs_hsp.map((c) => ({
            key: c.ciudad_id,
            label: c.ciudad,
            x: c.CLOUD_AMT,
            y: c.hsp,
            highlight: c.ciudad_id === HOME_CITY,
          }))}
          xLabel="Nubosidad (%)"
          yLabel="HSP"
        />
      </Section>

      <Section title="¿Qué se relaciona con la radiación?" subtitle="Correlación de cada variable climática con las HSP (de −1 a +1).">
        <DivergingBars
          items={Object.entries(eda.correlacion_con_hsp)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => a.value - b.value)}
        />
      </Section>

      <Section title="Tendencia anual" subtitle="HSP promedio de todas las ciudades por año.">
        <LineChart
          labels={trendLabels}
          series={[{ id: "anual", label: "Promedio nacional", color: Colors.primary, values: eda.tendencia_anual.hsp }]}
          unit="HSP"
          height={180}
          tickLabel={(label, i) => (i % 4 === 0 || i === trendLabels.length - 1 ? label : null)}
          hint="Toca un año para ver el valor."
        />
      </Section>

      {modelItems.length > 0 ? (
        <Section
          title="Desempeño del modelo de Machine Learning"
          subtitle="Error absoluto medio (MAE, kWh/m²/día) en zonas que el modelo no vio al entrenar. Menor es mejor."
        >
          <HorizontalBars items={modelItems} digits={3} color={ChartColors.neutral} highlightColor={Colors.primary} />
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHead]}>
              <Text style={[styles.tableCell, styles.tableName]}>Modelo</Text>
              <Text style={styles.tableCell}>R²</Text>
              <Text style={styles.tableCell}>MAPE</Text>
            </View>
            {Object.entries(metrics).map(([name, m]) => (
              <View key={name} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tableName, name === model.modelo && styles.bold]}>
                  {name.replace(" (promedio del mes)", "")}
                  {name === model.modelo ? " ✓" : ""}
                </Text>
                <Text style={styles.tableCell}>{fmt(m.r2)}</Text>
                <Text style={styles.tableCell}>{fmt(m.mape_pct, 1)} %</Text>
              </View>
            ))}
          </View>
          <Text style={styles.note}>
            Modelo en uso: {model.modelo}. Validación: {model.validacion}. Entrenado con {model.filas_entrenamiento?.toLocaleString("es-CO")} registros.
          </Text>
        </Section>
      ) : null}

      <Text style={styles.note}>
        Limitación: los datos solares de NASA POWER tienen resolución de 1°×1° (~110 km); por eso varias ciudades de
        Cundinamarca y Tolima comparten el mismo valor histórico.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6FCF8" },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24, backgroundColor: "#F6FCF8" },
  muted: { color: Colors.gray },
  errorText: { color: Colors.secondary, textAlign: "center" },
  hero: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E4EEE8",
  },
  kicker: { color: Colors.gray, textTransform: "uppercase", letterSpacing: 1, fontSize: 11, marginBottom: 6 },
  title: { fontSize: 22, color: Colors.primary, fontWeight: "700", marginBottom: 8 },
  text: { color: Colors.dark, lineHeight: 20 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E4EEE8",
  },
  tileValue: { color: Colors.dark, fontSize: 24, fontWeight: "700", fontVariant: ["tabular-nums"] },
  tileLabel: { color: Colors.dark, fontSize: 12, marginTop: 2 },
  tileDetail: { color: Colors.gray, fontSize: 12, marginTop: 2 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E4EEE8",
    gap: 10,
  },
  cardTitle: { color: Colors.dark, fontWeight: "700", fontSize: 16 },
  cardSubtitle: { color: Colors.gray, fontSize: 12, lineHeight: 17, marginTop: -4 },
  chips: { gap: 8, paddingVertical: 2 },
  segment: { flexDirection: "row", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DCE7E1",
    backgroundColor: "#F6F8F7",
  },
  chipActive: { backgroundColor: "#E6F6EE", borderColor: Colors.primary },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { color: Colors.dark, fontSize: 12 },
  chipTextActive: { fontWeight: "700" },
  table: { marginTop: 6, borderTopWidth: 1, borderTopColor: "#EEF3F0" },
  tableRow: { flexDirection: "row", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#EEF3F0" },
  tableHead: { borderBottomColor: "#DCE7E1" },
  tableCell: { width: 64, textAlign: "right", color: Colors.dark, fontSize: 12, fontVariant: ["tabular-nums"] },
  tableName: { flex: 1, textAlign: "left" },
  bold: { fontWeight: "700" },
  note: { color: Colors.gray, fontSize: 12, lineHeight: 17 },
  button: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { color: Colors.surface, fontWeight: "700" },
});
