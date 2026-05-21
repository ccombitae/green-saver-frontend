import { useAuth } from "@/src/context/AuthContext";
import { Colors } from "@/src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const entryOpacity = useRef(new Animated.Value(0)).current;
  const entryTranslateY = useRef(new Animated.Value(18)).current;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [monthly, setMonthly] = useState("");
  const [showQuickCalc, setShowQuickCalc] = useState(false);

  const monthlyNumber = useMemo(() => {
    const n = Number(monthly);
    return Number.isFinite(n) ? n : 0;
  }, [monthly]);

  const panelsEstimate = useMemo(() => {
    // estimación simple: consumo diario = mensual / 30, salida diaria por panel ~4 kWh
    if (!monthlyNumber || monthlyNumber <= 0) return "-";
    const daily = monthlyNumber / 30;
    const panels = Math.max(1, Math.ceil(daily / 4));
    return String(panels);
  }, [monthlyNumber]);

  const estimateBase = useMemo(() => {
    if (!monthlyNumber || monthlyNumber <= 0) return null;

    const daily = monthlyNumber / 30;
    const kWp = Math.max(0.5, +(daily / 4).toFixed(2));

    let inverter = "Inversor Hibrido 3kW";
    if (kWp > 3 && kWp <= 5) {
      inverter = "Inversor Hibrido 5kW";
    } else if (kWp > 5 && kWp <= 8) {
      inverter = "Inversor Hibrido 8kW";
    } else if (kWp > 8) {
      inverter = "Inversor Hibrido 10kW";
    }

    return {
      kWp: `${kWp} kWp`,
      inverter,
    };
  }, [monthlyNumber]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entryOpacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(entryTranslateY, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [entryOpacity, entryTranslateY]);

  const handleHapticPress = async () => {
    await Haptics.selectionAsync();
  };

  const handleLogin = async () => {
    try {
      await login(email, password);
      router.replace("/");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGlowOne} />
      <View style={styles.backgroundGlowTwo} />
      <View style={styles.backgroundTextureOne} />
      <View style={styles.backgroundTextureTwo} />

      <View style={styles.heroCard}>
        <Text style={styles.kicker}>Solar inteligente</Text>
        <Text style={styles.title}>GREEN SAVER</Text>
        <Text style={styles.subtitle}>
          Ahorra energía y dinero: calcula tu sistema solar, recibe cotizaciones y gestiona instalaciones en minutos.
        </Text>
      </View>

      <Animated.View
        style={{
          opacity: entryOpacity,
          transform: [{ translateY: entryTranslateY }],
        }}
      >
        <Pressable
          onPress={() => {
            handleHapticPress();
            setShowQuickCalc((s) => !s);
          }}
          style={({ pressed }) => [styles.quickButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.primaryButtonText}>{showQuickCalc ? "Cerrar cálculo rápido" : "Cálculo rápido"}</Text>
        </Pressable>

        {showQuickCalc ? (
          <View style={styles.quickCalcCard}>
            <Text style={styles.demoTitle}>Cálculo rápido (sin registro)</Text>
            <Text style={styles.helperText}>Realiza un cálculo básico para ver estimaciones sin guardar datos.</Text>

            <View style={styles.inputGroupSmall}>
              <TextInput
                placeholder="Consumo mensual (kWh)"
                placeholderTextColor={Colors.gray}
                style={styles.input}
                keyboardType="numeric"
                value={monthly}
                onChangeText={(v) => setMonthly(v.replace(/[^0-9.]/g, ""))}
              />
            </View>

            <View style={styles.calcResultRow}>
              <Text style={styles.calcLabel}>Paneles estimados:</Text>
              <Text style={styles.calcValue}>{panelsEstimate}</Text>
            </View>
            <View style={styles.calcResultRow}>
              <Text style={styles.calcLabel}>Inversor recomendado:</Text>
              <Text style={styles.calcValue}>{estimateBase?.inverter || "-"}</Text>
            </View>
          </View>
        ) : null}
      </Animated.View>

      <Animated.View
        style={[
          styles.formCard,
          {
            opacity: entryOpacity,
            transform: [{ translateY: entryTranslateY }],
          },
        ]}
      >
        <Text style={styles.formTitle}>Iniciar sesión</Text>
        <Text style={styles.helperText}>
          Usa tu correo y contraseña para entrar al panel correspondiente.
        </Text>

        <View style={styles.inputGroup}>
          <Ionicons name="mail-outline" size={18} color={Colors.gray} style={styles.inputIcon} />
          <TextInput
            placeholder="Correo"
            placeholderTextColor={Colors.gray}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Ionicons name="lock-closed-outline" size={18} color={Colors.gray} style={styles.inputIcon} />
          <TextInput
            placeholder="Contraseña"
            placeholderTextColor={Colors.gray}
            secureTextEntry={!showPassword}
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowPassword((current) => !current)}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={Colors.gray}
            />
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          onPressIn={handleHapticPress}
          onPress={handleLogin}
        >
          <Text style={styles.primaryButtonText}>Entrar</Text>
        </Pressable>

        <Pressable
          onPressIn={handleHapticPress}
          onPress={() => router.push("/register")}
        >
          <Text style={styles.link}>Crear cuenta nueva</Text>
        </Pressable>

        <Pressable
          onPressIn={handleHapticPress}
          onPress={() => router.push("/recover-password")}
        >
          <Text style={styles.linkMuted}>Recuperar contraseña</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
    backgroundColor: Colors.background,
    padding: 30,
    justifyContent: "flex-start",
    paddingTop: 36,
    overflow: "hidden",
  },
  backgroundGlowOne: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: "rgba(0, 168, 89, 0.12)",
    top: -80,
    right: -110,
  },
  backgroundGlowTwo: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: "rgba(237, 50, 55, 0.08)",
    bottom: -90,
    left: -100,
  },
  backgroundTextureOne: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.38)",
    transform: [{ rotate: "18deg" }],
    top: 70,
    left: -30,
  },
  backgroundTextureTwo: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.26)",
    transform: [{ rotate: "-20deg" }],
    bottom: 140,
    right: -20,
  },
  heroCard: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E7EFE9",
  },
  kicker: {
    color: Colors.gray,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.dark,
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E7EFE9",
    gap: 14,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.dark,
  },
  helperText: {
    color: Colors.gray,
    lineHeight: 20,
    marginTop: -4,
    marginBottom: 2,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F8F7",
    borderColor: "#DCE7E1",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    color: Colors.dark,
    flex: 1,
  },
  eyeButton: {
    padding: 6,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  primaryButtonText: {
    color: Colors.surface,
    fontWeight: "700",
    fontSize: 16,
  },
  link: {
    textAlign: "center",
    color: Colors.primary,
    fontWeight: "600",
    marginTop: 4,
  },
  linkMuted: {
    textAlign: "center",
    color: Colors.gray,
    marginTop: 2,
  },
  demoCard: {
    backgroundColor: "rgba(243, 248, 244, 0.95)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCE7E1",
  },
  demoTitle: {
    fontWeight: "700",
    marginBottom: 6,
    color: Colors.dark,
  },
  demoText: {
    fontSize: 13,
    color: Colors.gray,
    marginTop: 2,
  },
  quickCalcCard: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4EEE8",
    padding: 16,
    gap: 8,
  },
  quickButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  inputGroupSmall: {
    backgroundColor: "#F6F8F7",
    borderColor: "#DCE7E1",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  calcResultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  calcLabel: {
    color: Colors.dark,
    fontWeight: "700",
  },
  calcValue: {
    color: Colors.primary,
    fontWeight: "700",
  },
});
