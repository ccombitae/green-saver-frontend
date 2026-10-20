import { useAuth } from "@/src/context/AuthContext";
import { createRemoteCalculation } from "@/src/services/backend";
import {
  DEFAULT_CITY,
  buildCalculationResult,
  estimateSolarSystem,
  fallbackEstimate,
  formatCop,
  getMlCities,
} from "@/src/services/solarEstimate";
import { appendStoredCalculation } from "@/src/services/storage";
import { Colors } from "@/src/theme/colors";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

export default function Calculator() {
  const router = useRouter();
  const { user } = useAuth();
  const [consumption, setConsumption] = useState("");
  const [calculated, setCalculated] = useState(null);
  const [cities, setCities] = useState([DEFAULT_CITY]);
  const [city, setCity] = useState(DEFAULT_CITY);
  const [showCities, setShowCities] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);

  // Carga el catálogo de ciudades del modelo de ML al abrir la pantalla
  useEffect(() => {
    getMlCities().then(setCities);
  }, []);

  const filteredCities = useMemo(() => {
    const term = citySearch.trim().toLowerCase();
    if (!term) return cities;
    return cities.filter(
      (c) => c.nombre.toLowerCase().includes(term) || c.departamento.toLowerCase().includes(term)
    );
  }, [cities, citySearch]);

  const handleCalculate = async () => {
    const parsedConsumption = Number(consumption);

    if (!parsedConsumption || parsedConsumption <= 0) {
      Alert.alert("Dato inválido", "Ingresa un consumo mensual mayor a cero.");
      return;
    }

    setIsCalculating(true);
    let result;
    try {
      // 1. El backend predice las Horas Solares Pico de la ciudad con el modelo de ML
      const estimate = await estimateSolarSystem({ consumption: parsedConsumption, cityId: city.id });
      result = buildCalculationResult(estimate, { consumption: parsedConsumption, user });
    } catch {
      // 2. Sin conexión: fórmula aproximada para no bloquear al usuario
      result = fallbackEstimate({ consumption: parsedConsumption, user, cityName: city.nombre });
    }

    try {
      await createRemoteCalculation({
        email: user?.email || "cliente@correo.com",
        consumption: result.consumption,
        estimatedPanels: result.estimatedPanels,
        coverage: result.coverage,
        estimatedSavings: result.estimatedSavings,
        recommendation: result.recommendation,
      });
    } catch {
      // Si backend no está disponible, guardamos localmente
    }

    await appendStoredCalculation(result);
    setCalculated(result);
    setIsCalculating(false);
    router.push({ pathname: "/results", params: result });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />

      <View style={styles.heroCard}>
        <Text style={styles.kicker}>Simulación</Text>
        <Text style={styles.title}>Calculadora solar</Text>
        <Text style={styles.subtitle}>
          Elige tu ciudad y escribe tu consumo mensual. Un modelo de Machine Learning estima la radiación solar de
          tu zona mes a mes para dimensionar tu sistema.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Ciudad</Text>
        <Pressable style={styles.citySelector} onPress={() => setShowCities((v) => !v)}>
          <Text style={styles.cityName}>{city.nombre}</Text>
          <Text style={styles.cityDept}>{city.departamento} · {showCities ? "Cerrar" : "Cambiar"}</Text>
        </Pressable>

        {showCities ? (
          <View style={styles.cityList}>
            <TextInput
              value={citySearch}
              onChangeText={setCitySearch}
              placeholder="Buscar ciudad o departamento"
              placeholderTextColor={Colors.gray}
              style={styles.input}
            />
            <ScrollView style={styles.cityScroll} nestedScrollEnabled>
              {filteredCities.map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.cityOption, c.id === city.id && styles.cityOptionActive]}
                  onPress={() => {
                    setCity(c);
                    setShowCities(false);
                    setCitySearch("");
                  }}
                >
                  <Text style={styles.cityOptionText}>{c.nombre}</Text>
                  <Text style={styles.cityOptionDept}>{c.departamento}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <Text style={styles.label}>Consumo mensual (kWh)</Text>
        <Text style={styles.helper}>Ingresa tu promedio mensual para calcular una propuesta inicial.</Text>
        <TextInput
          value={consumption}
          onChangeText={setConsumption}
          placeholder="Ej. 320"
          placeholderTextColor={Colors.gray}
          keyboardType="numeric"
          style={styles.input}
        />

        <Pressable
          style={[styles.button, isCalculating && styles.buttonDisabled]}
          onPress={handleCalculate}
          disabled={isCalculating}
        >
          {isCalculating ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <Text style={styles.buttonText}>Calcular sistema</Text>
          )}
        </Pressable>
      </View>

      {calculated ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Último cálculo</Text>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Paneles</Text>
            <Text style={styles.resultValue}>{calculated.estimatedPanels}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Cobertura</Text>
            <Text style={styles.resultValue}>{calculated.coverage}%</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Ahorro</Text>
            <Text style={styles.resultValue}>
              {calculated.annualSavingsCop ? `${formatCop(calculated.annualSavingsCop)} / año` : `${calculated.estimatedSavings} kWh`}
            </Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    overflow: "hidden",
  },
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 24,
    position: "relative",
  },
  glowOne: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: "rgba(0, 168, 89, 0.10)",
    top: -70,
    right: -120,
  },
  glowTwo: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 170,
    backgroundColor: "rgba(237, 50, 55, 0.07)",
    bottom: 80,
    left: -90,
  },
  heroCard: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E4EEE8",
  },
  kicker: {
    color: Colors.gray,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 12,
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    color: Colors.primary,
    fontWeight: "700",
    marginBottom: 15,
  },
  subtitle: {
    color: Colors.dark,
    lineHeight: 21,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.94)",
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4EEE8",
    gap: 12,
  },
  label: {
    color: Colors.dark,
    fontWeight: "600",
  },
  helper: {
    color: Colors.gray,
    lineHeight: 20,
  },
  input: {
    backgroundColor: "#F6F8F7",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCE7E1",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.dark,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  citySelector: {
    backgroundColor: "#F2F8F3",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CFE5D8",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cityName: {
    color: Colors.dark,
    fontWeight: "700",
    fontSize: 16,
  },
  cityDept: {
    color: Colors.primary,
    fontSize: 13,
    marginTop: 2,
  },
  cityList: {
    gap: 8,
  },
  cityScroll: {
    maxHeight: 220,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4EEE8",
  },
  cityOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF3F0",
  },
  cityOptionActive: {
    backgroundColor: "#E6F6EE",
  },
  cityOptionText: {
    color: Colors.dark,
    fontWeight: "600",
  },
  cityOptionDept: {
    color: Colors.gray,
    fontSize: 12,
  },
  buttonText: {
    color: Colors.surface,
    fontWeight: "700",
  },
  resultCard: {
    backgroundColor: "#F2F8F3",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DCE7E1",
    padding: 18,
    gap: 6,
  },
  resultTitle: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 8,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(220, 231, 225, 0.7)",
  },
  resultLabel: {
    color: Colors.gray,
  },
  resultValue: {
    color: Colors.dark,
    fontWeight: "700",
  },
});
