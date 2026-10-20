// Gráficas livianas para el dashboard (react-native-svg + Views).
// Funcionan igual en Android y en web. Reglas de diseño:
// - Un solo eje Y por gráfica, cuadrícula tenue, trazos de 2 px.
// - El texto siempre en colores de texto; el color de la serie solo en la marca.
// - Al tocar una marca se muestra su valor (equivalente táctil del "hover").
import { Colors } from "@/src/theme/colors";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";

export const ChartColors = {
  grid: "#E5ECE8",
  axis: "#9CA3AF",
  muted: "#6B7280",
  highlight: Colors.secondary, // Girardot
  // Paleta categórica validada (orden fijo, nunca rotar): azul, naranja, aqua
  series: ["#2a78d6", "#eb6834", "#1baf7a"],
  neutral: "#9CA3AF",
};

const fmt = (value, digits = 2) =>
  Number(value).toLocaleString("es-CO", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// Paso "redondo" (0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10...) para que las marcas del eje sean legibles
const niceStep = (span, target = 4) => {
  const raw = span / target;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw);
  return step ?? 10 * power;
};

const niceDomain = (values) => {
  const finite = values.filter((v) => Number.isFinite(v));
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const step = niceStep(max - min || 1);
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step, step];
};

const ticks = ([min, max, step]) => {
  const out = [];
  for (let v = min; v <= max + step / 2; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
};

// Fuente del sistema para el texto dentro del SVG (en web el SVG usa serif por defecto)
const SVG_FONT = Platform.select({ web: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", default: undefined });

// Contenedor que mide su ancho para dibujar la gráfica a la medida
export function ChartFrame({ height, children }) {
  const [width, setWidth] = useState(0);
  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? children(width) : null}
    </View>
  );
}

// ------------------------------------------------------------------ Líneas
// series: [{ id, label, color, values: [12], dashed? }]
export function LineChart({
  labels,
  series,
  height = 210,
  unit = "",
  tickLabel = (label) => label.slice(0, 1),
  hint = "Toca un mes para ver los valores.",
}) {
  const [selected, setSelected] = useState(null);
  const pad = { top: 12, right: 12, bottom: 24, left: 36 };
  const domain = niceDomain(series.flatMap((s) => s.values));

  return (
    <View>
      <ChartFrame height={height}>
        {(width) => {
          const plotW = width - pad.left - pad.right;
          const plotH = height - pad.top - pad.bottom;
          const x = (i) => pad.left + (plotW * i) / (labels.length - 1);
          const y = (v) => pad.top + plotH * (1 - (v - domain[0]) / (domain[1] - domain[0]));
          return (
            <View>
              <Svg width={width} height={height}>
                {ticks(domain).map((t) => (
                  <Line key={`g${t}`} x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={ChartColors.grid} strokeWidth={1} />
                ))}
                {ticks(domain).map((t) => (
                  <SvgText key={`t${t}`} x={pad.left - 6} y={y(t) + 4} fontSize={10} fontFamily={SVG_FONT} fill={ChartColors.muted} textAnchor="end">
                    {fmt(t, domain[2] < 0.5 ? 2 : domain[2] < 1 ? 1 : 0)}
                  </SvgText>
                ))}
                {labels.map((label, i) => {
                  const text = tickLabel(label, i);
                  return text ? (
                    <SvgText key={label} x={x(i)} y={height - 6} fontSize={10} fontFamily={SVG_FONT} fill={ChartColors.muted} textAnchor="middle">
                      {text}
                    </SvgText>
                  ) : null;
                })}
                {selected !== null ? (
                  <Line x1={x(selected)} x2={x(selected)} y1={pad.top} y2={pad.top + plotH} stroke={ChartColors.axis} strokeWidth={1} />
                ) : null}
                {series.map((s) => (
                  <Polyline
                    key={s.id}
                    points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    strokeDasharray={s.dashed ? "5,4" : undefined}
                    strokeLinejoin="round"
                  />
                ))}
                {selected !== null
                  ? series.map((s) => (
                      <Circle key={`p${s.id}`} cx={x(selected)} cy={y(s.values[selected])} r={4.5} fill={s.color} stroke="#FFFFFF" strokeWidth={2} />
                    ))
                  : null}
              </Svg>
              {/* Zonas táctiles: una por mes, más anchas que la marca */}
              <View style={[StyleSheet.absoluteFill, { flexDirection: "row", left: pad.left - plotW / (labels.length - 1) / 2, right: pad.right - plotW / (labels.length - 1) / 2 }]}>
                {labels.map((label, i) => (
                  <Pressable
                    key={label}
                    style={{ flex: 1 }}
                    onPress={() => setSelected(i)}
                    onHoverIn={() => setSelected(i)}
                    accessibilityLabel={`Ver valores de ${label}`}
                  />
                ))}
              </View>
            </View>
          );
        }}
      </ChartFrame>
      <View style={styles.readout}>
        {selected === null ? (
          <Text style={styles.readoutHint}>{hint}</Text>
        ) : (
          <>
            <Text style={styles.readoutTitle}>{labels[selected]}</Text>
            {series.map((s) => (
              <View key={s.id} style={styles.readoutRow}>
                <View style={[styles.swatch, { backgroundColor: s.color }]} />
                <Text style={styles.readoutLabel}>{s.label}</Text>
                <Text style={styles.readoutValue}>
                  {fmt(s.values[selected])} {unit}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>
    </View>
  );
}

export function Legend({ items }) {
  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: item.color }, item.dashed && styles.swatchDashed]} />
          <Text style={styles.legendText}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ----------------------------------------------------- Barras horizontales
// items: [{ key, label, value, highlight? }]
export function HorizontalBars({ items, max, unit = "", digits = 2, color = Colors.primary, highlightColor = ChartColors.highlight }) {
  const top = max ?? Math.max(...items.map((i) => i.value));
  return (
    <View style={{ gap: 6 }}>
      {items.map((item) => (
        <View key={item.key} style={styles.hbarRow} accessibilityLabel={`${item.label}: ${fmt(item.value, digits)} ${unit}`}>
          <Text style={[styles.hbarLabel, item.highlight && styles.hbarLabelStrong]} numberOfLines={1}>
            {item.label}
          </Text>
          <View style={styles.hbarTrack}>
            <View
              style={[
                styles.hbar,
                { width: `${Math.max(2, (item.value / top) * 100)}%`, backgroundColor: item.highlight ? highlightColor : color },
              ]}
            />
          </View>
          <Text style={[styles.hbarValue, item.highlight && styles.hbarLabelStrong]}>{fmt(item.value, digits)}</Text>
        </View>
      ))}
    </View>
  );
}

// -------------------------------------------- Barras divergentes (correlación)
export function DivergingBars({ items }) {
  return (
    <View style={{ gap: 8 }}>
      {items.map((item) => {
        const width = `${Math.abs(item.value) * 50}%`;
        const positive = item.value >= 0;
        return (
          <View key={item.label} accessibilityLabel={`${item.label}: ${fmt(item.value)}`}>
            <View style={styles.divHeader}>
              <Text style={styles.hbarLabelWide}>{item.label}</Text>
              <Text style={styles.hbarValue}>{fmt(item.value)}</Text>
            </View>
            <View style={styles.divTrack}>
              <View style={styles.divMid} />
              <View
                style={[
                  styles.divBar,
                  positive
                    ? { left: "50%", width, backgroundColor: ChartColors.series[0], borderTopRightRadius: 4, borderBottomRightRadius: 4 }
                    : { right: "50%", width, backgroundColor: ChartColors.highlight, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
                ]}
              />
            </View>
          </View>
        );
      })}
      <View style={styles.divScale}>
        <Text style={styles.axisText}>−1 (menos sol)</Text>
        <Text style={styles.axisText}>0</Text>
        <Text style={styles.axisText}>+1 (más sol)</Text>
      </View>
    </View>
  );
}

// ------------------------------------------------------------- Dispersión
// points: [{ key, label, x, y, highlight? }]
export function ScatterChart({ points, xLabel, yLabel, height = 230 }) {
  const [selected, setSelected] = useState(null);
  const pad = { top: 12, right: 14, bottom: 34, left: 38 };
  const xDomain = niceDomain(points.map((p) => p.x));
  const yDomain = niceDomain(points.map((p) => p.y));
  const active = points.find((p) => p.key === selected);

  return (
    <View>
      <ChartFrame height={height}>
        {(width) => {
          const plotW = width - pad.left - pad.right;
          const plotH = height - pad.top - pad.bottom;
          const x = (v) => pad.left + plotW * ((v - xDomain[0]) / (xDomain[1] - xDomain[0]));
          const y = (v) => pad.top + plotH * (1 - (v - yDomain[0]) / (yDomain[1] - yDomain[0]));
          // Primero los puntos normales, luego el resaltado y el seleccionado encima
          const ordered = [...points].sort((a, b) => Number(!!a.highlight) - Number(!!b.highlight));
          return (
            <Svg width={width} height={height}>
              {ticks(yDomain).map((t) => (
                <Line key={`gy${t}`} x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={ChartColors.grid} strokeWidth={1} />
              ))}
              {ticks(yDomain).map((t) => (
                <SvgText key={`ty${t}`} x={pad.left - 6} y={y(t) + 4} fontSize={10} fontFamily={SVG_FONT} fill={ChartColors.muted} textAnchor="end">
                  {fmt(t, yDomain[2] < 0.5 ? 2 : yDomain[2] < 1 ? 1 : 0)}
                </SvgText>
              ))}
              {ticks(xDomain).map((t) => (
                <SvgText key={`tx${t}`} x={x(t)} y={pad.top + plotH + 14} fontSize={10} fontFamily={SVG_FONT} fill={ChartColors.muted} textAnchor="middle">
                  {fmt(t, 0)}
                </SvgText>
              ))}
              <SvgText x={pad.left + plotW / 2} y={height - 4} fontSize={10} fontFamily={SVG_FONT} fill={ChartColors.muted} textAnchor="middle">
                {xLabel}
              </SvgText>
              {ordered.map((p) => (
                <Circle
                  key={p.key}
                  cx={x(p.x)}
                  cy={y(p.y)}
                  r={p.highlight || p.key === selected ? 6 : 4.5}
                  fill={p.highlight ? ChartColors.highlight : Colors.primary}
                  fillOpacity={p.highlight || p.key === selected ? 1 : 0.7}
                  stroke="#FFFFFF"
                  strokeWidth={p.key === selected ? 2 : 1}
                />
              ))}
              {/* Zonas táctiles invisibles más grandes que el punto */}
              {points.map((p) => (
                <Circle
                  key={`hit${p.key}`}
                  cx={x(p.x)}
                  cy={y(p.y)}
                  r={11}
                  fill="transparent"
                  onPress={() => setSelected(selected === p.key ? null : p.key)}
                />
              ))}
            </Svg>
          );
        }}
      </ChartFrame>
      <View style={styles.readout}>
        {active ? (
          <Text style={styles.readoutLabel}>
            <Text style={styles.readoutTitle}>{active.label}</Text> · {xLabel}: {fmt(active.x, 1)} · {yLabel}: {fmt(active.y)}
          </Text>
        ) : (
          <Text style={styles.readoutHint}>Toca un punto para ver la ciudad. Rojo: Girardot.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: {
    minHeight: 36,
    marginTop: 6,
    gap: 4,
  },
  readoutHint: { color: ChartColors.muted, fontSize: 12 },
  readoutTitle: { color: Colors.dark, fontWeight: "700" },
  readoutRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  readoutLabel: { color: Colors.dark, flex: 1, fontSize: 13 },
  readoutValue: { color: Colors.dark, fontWeight: "700", fontVariant: ["tabular-nums"] },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  swatchDashed: { height: 3, borderRadius: 0, marginVertical: 4.5 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendText: { color: Colors.dark, fontSize: 12 },
  hbarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hbarLabel: { width: 108, color: Colors.dark, fontSize: 12 },
  hbarLabelWide: { color: Colors.dark, fontSize: 12, flex: 1 },
  hbarLabelStrong: { fontWeight: "700" },
  hbarTrack: { flex: 1, height: 12, justifyContent: "center" },
  hbar: { height: 12, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  hbarValue: { width: 40, textAlign: "right", color: Colors.dark, fontSize: 12, fontVariant: ["tabular-nums"] },
  divHeader: { flexDirection: "row", marginBottom: 3 },
  divTrack: { height: 12, position: "relative" },
  divMid: { position: "absolute", left: "50%", top: -2, bottom: -2, width: 1, backgroundColor: ChartColors.axis },
  divBar: { position: "absolute", top: 0, bottom: 0 },
  divScale: { flexDirection: "row", justifyContent: "space-between" },
  axisText: { color: ChartColors.muted, fontSize: 11 },
});
