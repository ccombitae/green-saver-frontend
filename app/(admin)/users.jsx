import { useAuth } from "@/src/context/AuthContext";
import { assignRemoteSystemToUser, deleteRemoteUser, getRemoteUsers } from "@/src/services/backend";
import { Colors } from "@/src/theme/colors";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

export default function Users() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;
  const [addingFor, setAddingFor] = useState("");
  const [systemForm, setSystemForm] = useState({
    capacity: "",
    panels: "",
    inverter: "",
    battery: "",
    installDate: "",
  });

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const registeredUsers = await getRemoteUsers();
        setUsers(Array.isArray(registeredUsers) ? registeredUsers : []);
      } catch (error) {
        Alert.alert("Error", error.message || "No fue posible cargar usuarios.");
      }
    };

    if (user?.role === "admin") {
      loadUsers();
    }
  }, [user?.role]);

  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const pageUsers = users.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDelete = (email) => {
    Alert.alert("Eliminar usuario", "¿Deseas eliminar esta cuenta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            const target = users.find((item) => item.email === email);
            if (!target?.id) {
              throw new Error("No se encontró el usuario en el backend");
            }

            await deleteRemoteUser(target.id);
            const refreshedUsers = await getRemoteUsers();
            setUsers(Array.isArray(refreshedUsers) ? refreshedUsers : []);
            setCurrentPage((page) => Math.min(page, Math.max(1, Math.ceil((refreshedUsers || []).length / pageSize))));
          } catch (error) {
            Alert.alert("Error", error.message || "No fue posible eliminar el usuario.");
          }
        },
      },
    ]);
  };

  const handleAssignSystem = async (email) => {
    try {
      const payload = {
        capacity: systemForm.capacity,
        panels: systemForm.panels,
        inverter: systemForm.inverter,
        battery: systemForm.battery,
        installDate: systemForm.installDate,
      };

      await assignRemoteSystemToUser({ email, system: payload });
      Alert.alert("Sistema asignado", "El sistema fue asignado al cliente.");
      setAddingFor("");
      setSystemForm({ capacity: "", panels: "", inverter: "", battery: "", installDate: "" });
    } catch (error) {
      Alert.alert("Error", error.message || "No fue posible asignar el sistema.");
    }
  };

  const handleRefreshUsers = async () => {
    try {
      const refreshedUsers = await getRemoteUsers();
      setUsers(Array.isArray(refreshedUsers) ? refreshedUsers : []);
      setCurrentPage(1);
    } catch (error) {
      Alert.alert("Error", error.message || "No fue posible recargar usuarios.");
    }
  };

  if (loading) return null;

  if (!user) return <Redirect href="/login" />;

  if (user.role !== "admin") return <Redirect href="/(user)/dashboard" />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />

      <View style={styles.heroCard}>
        <Text style={styles.kicker}>Administración</Text>
        <Text style={styles.title}>Gestión de usuarios</Text>
        <Text style={styles.subtitle}>Revisa las cuentas registradas y elimina las que ya no deban tener acceso.</Text>
      </View>

      <Pressable style={styles.refreshButton} onPress={handleRefreshUsers}>
        <Text style={styles.refreshButtonText}>Recargar usuarios</Text>
      </Pressable>

      {users.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No hay usuarios registrados</Text>
          <Text style={styles.emptyText}>Cuando alguien se registre, aparecerá aquí.</Text>
        </View>
      ) : (
        pageUsers.map((item) => (
          <View key={item.email} style={styles.card}>
            <Text style={styles.cardTitle}>{item.name || item.email}</Text>
            <Text style={styles.cardText}>{item.email}</Text>
            <Text style={styles.cardRole}>Rol: {item.role}</Text>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable style={styles.deleteButton} onPress={() => handleDelete(item.email)}>
                <Text style={styles.deleteText}>Eliminar</Text>
              </Pressable>

              <Pressable
                style={[styles.secondaryButton]}
                onPress={() => {
                  setAddingFor((prev) => (prev === item.email ? "" : item.email));
                  setSystemForm({ capacity: "", panels: "", inverter: "", battery: "", installDate: "" });
                }}
              >
                <Text style={styles.secondaryButtonText}>Asignar sistema</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      {users.length > pageSize ? (
        <View style={styles.paginationRow}>
          <Pressable
            style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
            disabled={currentPage === 1}
            onPress={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            <Text style={styles.pageButtonText}>Anterior</Text>
          </Pressable>

          <Text style={styles.pageInfo}>Página {currentPage} de {totalPages}</Text>

          <Pressable
            style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
            disabled={currentPage === totalPages}
            onPress={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          >
            <Text style={styles.pageButtonText}>Siguiente</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={Boolean(addingFor)} transparent animationType="fade" onRequestClose={() => setAddingFor("") }>
        <Pressable style={styles.modalBackdrop} onPress={() => setAddingFor("")}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Asignar sistema</Text>
            <Text style={styles.modalSubtitle}>
              {users.find((item) => item.email === addingFor)?.name || addingFor}
            </Text>

            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <TextInput
                style={styles.input}
                placeholder="Capacidad (kWp)"
                placeholderTextColor={Colors.gray}
                value={systemForm.capacity}
                onChangeText={(v) => setSystemForm((p) => ({ ...p, capacity: v }))}
              />
              <TextInput
                style={styles.input}
                placeholder="# Paneles"
                placeholderTextColor={Colors.gray}
                value={systemForm.panels}
                onChangeText={(v) => setSystemForm((p) => ({ ...p, panels: v }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Inversor"
                placeholderTextColor={Colors.gray}
                value={systemForm.inverter}
                onChangeText={(v) => setSystemForm((p) => ({ ...p, inverter: v }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Batería"
                placeholderTextColor={Colors.gray}
                value={systemForm.battery}
                onChangeText={(v) => setSystemForm((p) => ({ ...p, battery: v }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Fecha instalación (dd mm aaaa)"
                placeholderTextColor={Colors.gray}
                value={systemForm.installDate}
                onChangeText={(v) => setSystemForm((p) => ({ ...p, installDate: v }))}
              />

              <Pressable style={styles.primaryButton} onPress={() => handleAssignSystem(addingFor)}>
                <Text style={styles.primaryButtonText}>Confirmar asignación</Text>
              </Pressable>

              <Pressable style={styles.cancelButton} onPress={() => setAddingFor("") }>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
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
    gap: 14,
    paddingBottom: 24,
    position: "relative",
    overflow: "hidden",
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
    color: Colors.primary,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.dark,
    lineHeight: 21,
  },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4EEE8",
    padding: 18,
  },
  emptyTitle: {
    color: Colors.dark,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyText: {
    color: Colors.gray,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4EEE8",
    padding: 18,
    gap: 6,
  },
  cardTitle: {
    color: Colors.dark,
    fontWeight: "700",
    fontSize: 16,
  },
  cardText: {
    color: Colors.gray,
  },
  cardRole: {
    color: Colors.primary,
    fontWeight: "600",
  },
  deleteButton: {
    marginTop: 10,
    backgroundColor: Colors.secondary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  deleteText: {
    color: Colors.surface,
    fontWeight: "700",
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: Colors.surface,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontWeight: "700",
  },
  cardInner: {
    marginTop: 10,
    gap: 8,
  },
  input: {
    backgroundColor: "#F6F8F7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCE7E1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.dark,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    maxHeight: "85%",
  },
  modalTitle: {
    color: Colors.dark,
    fontSize: 18,
    fontWeight: "700",
  },
  modalSubtitle: {
    color: Colors.gray,
  },
  modalContent: {
    gap: 10,
  },
  cancelButton: {
    backgroundColor: "#F2F4F3",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    color: Colors.dark,
    fontWeight: "700",
  },
  refreshButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0EEE4",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  refreshButtonText: {
    color: Colors.primary,
    fontWeight: "700",
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    marginBottom: 12,
  },
  pageButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    color: Colors.primary,
    fontWeight: "700",
  },
  pageInfo: {
    color: Colors.gray,
    fontSize: 12,
  },
});