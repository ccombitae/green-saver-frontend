import { useAuth } from "@/src/context/AuthContext";
import { Colors } from "@/src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

export default function RecoverPassword() {
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRecover = async () => {
    if (!email || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Completa todos los campos");
      return;
    }

    if (newPassword.length < 4) {
      Alert.alert("Error", "La contraseña debe tener al menos 4 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }

    try {
      setSubmitting(true);
      await resetPassword({ email, newPassword });
      Alert.alert("Listo", "Contraseña actualizada. Ya puedes iniciar sesión.");
      router.replace("/login");
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo actualizar la contraseña");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Recuperar contraseña</Text>
        <Text style={styles.subtitle}>
          Ingresa tu correo y define una nueva contraseña para tu cuenta local.
        </Text>

        <View style={styles.inputGroup}>
          <Ionicons name="mail-outline" size={18} color={Colors.gray} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Correo"
            placeholderTextColor={Colors.gray}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputGroup}>
          <Ionicons name="lock-closed-outline" size={18} color={Colors.gray} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Nueva contraseña"
            placeholderTextColor={Colors.gray}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
        </View>

        <View style={styles.inputGroup}>
          <Ionicons name="shield-checkmark-outline" size={18} color={Colors.gray} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirmar contraseña"
            placeholderTextColor={Colors.gray}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed, submitting && styles.buttonDisabled]}
          onPress={handleRecover}
          disabled={submitting}
        >
          <Text style={styles.primaryButtonText}>
            {submitting ? "Actualizando..." : "Guardar nueva contraseña"}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.replace("/login")}>
          <Text style={styles.link}>Volver al inicio de sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: Colors.background,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E7EFE9",
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.primary,
  },
  subtitle: {
    color: Colors.gray,
    lineHeight: 20,
    marginBottom: 4,
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
    flex: 1,
    color: Colors.dark,
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: Colors.surface,
    fontWeight: "700",
    fontSize: 15,
  },
  link: {
    textAlign: "center",
    color: Colors.primary,
    fontWeight: "600",
    marginTop: 6,
  },
});