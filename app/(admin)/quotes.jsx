import { useAuth } from "@/src/context/AuthContext";
import {
    acceptRemoteQuote,
    getRemoteQuoteCalculations,
    getRemoteQuoteOptions,
    getRemoteSentQuotes,
    sendRemoteQuote,
} from "@/src/services/backend";
import { Colors } from "@/src/theme/colors";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Redirect } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

export default function Quotes() {
  const { user, loading } = useAuth();
  const [selectedCalculationId, setSelectedCalculationId] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [acceptingQuote, setAcceptingQuote] = useState(null);
  const [acceptInstallDate, setAcceptInstallDate] = useState(new Date());
  const [calculations, setCalculations] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const [sentQuotes, setSentQuotes] = useState([]);
  const [quoteOptions, setQuoteOptions] = useState({
    panelTypes: [],
    inverterTypes: [],
    batteryTypes: [],
    structureTypes: [],
  });
  const [materialSelection, setMaterialSelection] = useState({
    panelType: "",
    inverterType: "",
    batteryType: "",
    structureType: "",
  });
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsBootstrapping(true);

      try {
        const [remoteCalculations, remoteOptions, remoteQuotes] = await Promise.all([
          getRemoteQuoteCalculations(),
          getRemoteQuoteOptions(),
          getRemoteSentQuotes(),
        ]);

        // ordenar por fecha (desc) y almacenar
        const sorted = (remoteCalculations || []).slice().sort((a, b) => {
          const da = new Date(a.createdAt || a.date || 0).getTime();
          const db = new Date(b.createdAt || b.date || 0).getTime();
          return db - da;
        });

        setCalculations(sorted);
        setQuoteOptions(remoteOptions);
        setSentQuotes(remoteQuotes);

        setMaterialSelection({
          panelType: remoteOptions.panelTypes[0] || "",
          inverterType: remoteOptions.inverterTypes[0] || "",
          batteryType: remoteOptions.batteryTypes[0] || "",
          structureType: remoteOptions.structureTypes[0] || "",
        });
      } catch (error) {
        Alert.alert("Error", error.message || "No fue posible cargar cotizaciones.");
      } finally {
        setIsBootstrapping(false);
      }
    };

    if (user?.role === "admin") {
      loadData();
    }
  }, [user?.role]);

  const selectedCalculation = useMemo(() => {
    return calculations.find((item) => item.id === selectedCalculationId) || null;
  }, [calculations, selectedCalculationId]);

  const selectedClientEmail = selectedCalculation?.email?.toLowerCase() || "";

  const visibleSentQuotes = useMemo(() => {
    if (!selectedClientEmail) {
      return [];
    }

    return sentQuotes.filter((quote) => quote.clientEmail?.toLowerCase() === selectedClientEmail);
  }, [sentQuotes, selectedClientEmail]);

  const updateMaterialSelection = (key, value) => {
    setMaterialSelection((prev) => ({ ...prev, [key]: value }));
  };

  const allMaterialsSelected = useMemo(() => {
    return (
      materialSelection.panelType &&
      materialSelection.inverterType &&
      materialSelection.batteryType &&
      materialSelection.structureType
    );
  }, [materialSelection]);

  const formatDate = (value) => {
    if (!value) {
      return "Sin fecha";
    }

    return new Date(value).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (value) => {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      return "USD 0.00";
    }

    return `USD ${numeric.toFixed(2)}`;
  };

  const formatInstallDate = (value) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      return "Selecciona una fecha";
    }

    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(value);
  };

  const handleSendQuote = async () => {
    if (!selectedCalculation || !price || !allMaterialsSelected) {
      Alert.alert(
        "Campos requeridos",
        "Selecciona cálculo, precio y todos los materiales de la cotización."
      );
      return;
    }

    const normalizedPrice = Number(price);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      Alert.alert("Precio inválido", "Ingresa un precio total válido mayor a cero.");
      return;
    }

    setIsSending(true);

    try {
      const response = await sendRemoteQuote({
        calculationId: selectedCalculation.id,
        clientEmail: selectedCalculation.email,
        clientName: selectedCalculation.clientName,
        totalPrice: normalizedPrice,
        notes,
        materials: materialSelection,
      });

      if (response?.success === false) {
        throw new Error(response?.message || "No se pudo enviar la cotización.");
      }

      const refreshedQuotes = await getRemoteSentQuotes();
      setSentQuotes(refreshedQuotes);
      setPrice("");
      setNotes("");

      Alert.alert("Cotización enviada", "La propuesta fue enviada por correo y guardada.");
    } catch (error) {
      console.error("QUOTE_SEND_ERROR", error);
      Alert.alert("Error", error.message || "No se pudo enviar la cotización.");
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenAcceptQuote = (quote) => {
    setAcceptingQuote(quote);
    setAcceptInstallDate(new Date());
  };

  const handleAcceptQuote = async () => {
    if (!acceptingQuote) {
      return;
    }

    if (!(acceptInstallDate instanceof Date) || Number.isNaN(acceptInstallDate.getTime())) {
      Alert.alert("Fecha requerida", "Ingresa la fecha de instalación para continuar.");
      return;
    }

    setIsAccepting(true);

    try {
      await acceptRemoteQuote({
        quoteId: acceptingQuote.id,
        installDate: acceptInstallDate.toISOString().slice(0, 10),
      });

      const refreshedQuotes = await getRemoteSentQuotes();
      setSentQuotes(refreshedQuotes);
      setAcceptingQuote(null);
      setAcceptInstallDate(new Date());

      Alert.alert("Cotización aceptada", "El sistema quedó guardado automáticamente en el cliente.");
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo aceptar la cotización.");
    } finally {
      setIsAccepting(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!user) return <Redirect href="/login" />;

  if (user.role !== "admin") return <Redirect href="/(user)/dashboard" />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />

      <View style={styles.heroCard}>
        <Text style={styles.kicker}>Gestión comercial</Text>
        <Text style={styles.title}>Enviar cotización</Text>
        <Text style={styles.subtitle}>
          Selecciona un cálculo específico, define materiales y envía la propuesta real por correo.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cálculos disponibles</Text>

        {isBootstrapping ? (
          <ActivityIndicator color={Colors.primary} />
        ) : calculations.length === 0 ? (
          <Text style={styles.emptyText}>Aún no hay cálculos listos para cotizar.</Text>
        ) : (
          calculations.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((calc) => (
            <Pressable
              key={calc.id}
              style={[
                styles.clientItem,
                selectedCalculationId === calc.id && styles.clientItemSelected,
              ]}
              onPress={() => setSelectedCalculationId(calc.id)}
            >
              <Text style={styles.clientName}>{calc.clientName}</Text>
              <Text style={styles.clientInfo}>{calc.email}</Text>
              <Text style={styles.clientInfo}>
                Cálculo #{calc.id} · {calc.estimatedPanels ?? "-"} paneles · {calc.consumption ?? "-"} kWh
              </Text>
              <Text style={styles.clientInfo}>Fecha: {formatDate(calc.createdAt)}</Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.paginationRow}>
        <Pressable
          style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
          disabled={currentPage === 1}
          onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
        >
          <Text style={styles.pageButtonText}>Anterior</Text>
        </Pressable>

        <Text style={{ alignSelf: "center", color: Colors.gray }}>Página {currentPage}</Text>

        <Pressable
          style={[
            styles.pageButton,
            currentPage * pageSize >= calculations.length && styles.pageButtonDisabled,
          ]}
          disabled={currentPage * pageSize >= calculations.length}
          onPress={() => setCurrentPage((p) => p + 1)}
        >
          <Text style={styles.pageButtonText}>Siguiente</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Materiales predefinidos</Text>

        <Text style={styles.groupLabel}>Paneles</Text>
        <View style={styles.optionWrap}>
          {quoteOptions.panelTypes.map((item) => (
            <Pressable
              key={`panel-${item}`}
              style={[
                styles.optionChip,
                materialSelection.panelType === item && styles.optionChipSelected,
              ]}
              onPress={() => updateMaterialSelection("panelType", item)}
            >
              <Text style={styles.optionChipText}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.groupLabel}>Inversores</Text>
        <View style={styles.optionWrap}>
          {quoteOptions.inverterTypes.map((item) => (
            <Pressable
              key={`inverter-${item}`}
              style={[
                styles.optionChip,
                materialSelection.inverterType === item && styles.optionChipSelected,
              ]}
              onPress={() => updateMaterialSelection("inverterType", item)}
            >
              <Text style={styles.optionChipText}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.groupLabel}>Baterías</Text>
        <View style={styles.optionWrap}>
          {quoteOptions.batteryTypes.map((item) => (
            <Pressable
              key={`battery-${item}`}
              style={[
                styles.optionChip,
                materialSelection.batteryType === item && styles.optionChipSelected,
              ]}
              onPress={() => updateMaterialSelection("batteryType", item)}
            >
              <Text style={styles.optionChipText}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.groupLabel}>Estructuras</Text>
        <View style={styles.optionWrap}>
          {quoteOptions.structureTypes.map((item) => (
            <Pressable
              key={`structure-${item}`}
              style={[
                styles.optionChip,
                materialSelection.structureType === item && styles.optionChipSelected,
              ]}
              onPress={() => updateMaterialSelection("structureType", item)}
            >
              <Text style={styles.optionChipText}>{item}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nueva cotización</Text>

        {selectedCalculation ? (
          <View style={styles.selectedBox}>
            <Text style={styles.selectedTitle}>Cálculo seleccionado: #{selectedCalculation.id}</Text>
            <Text style={styles.selectedText}>{selectedCalculation.clientName} · {selectedCalculation.email}</Text>
            <Text style={styles.selectedText}>Cobertura estimada: {selectedCalculation.coverage ?? "-"}%</Text>
            <Text style={styles.selectedText}>
              Ahorro estimado: {selectedCalculation.estimatedSavings ?? "-"}
            </Text>
          </View>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Precio total (USD)"
          placeholderTextColor={Colors.gray}
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Notas técnicas y alcance"
          placeholderTextColor={Colors.gray}
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
        />

        <Pressable
          style={[styles.primaryButton, isSending && styles.primaryButtonDisabled]}
          onPress={handleSendQuote}
          disabled={isSending}
        >
          <Text style={styles.primaryButtonText}>
            {isSending ? "Enviando..." : "Enviar cotización"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cotizaciones enviadas</Text>
        {!selectedCalculation ? (
          <Text style={styles.emptyText}>Selecciona un cálculo para ver solo las cotizaciones de ese cliente.</Text>
        ) : visibleSentQuotes.length === 0 ? (
          <Text style={styles.emptyText}>No hay cotizaciones enviadas para este cliente.</Text>
        ) : (
          visibleSentQuotes.slice(0, 5).map((quote) => (
            <View key={quote.id} style={styles.quoteItem}>
              <Text style={styles.quoteTitle}>{quote.clientName}</Text>
              <Text style={styles.quoteText}>{quote.clientEmail}</Text>
              <Text style={styles.quoteText}>Cálculo #{quote.calculationId}</Text>
              <Text style={styles.quoteText}>Precio: {formatCurrency(quote.totalPrice)}</Text>
              <Text style={styles.quoteStatus}>{quote.status} - {formatDate(quote.sentAt)}</Text>
              {quote.installationDate ? (
                <Text style={styles.quoteText}>Instalación: {quote.installationDate}</Text>
              ) : null}

              <Pressable
                style={[
                  styles.acceptButton,
                  quote.status === "accepted" && styles.acceptButtonDisabled,
                ]}
                disabled={quote.status === "accepted"}
                onPress={() => handleOpenAcceptQuote(quote)}
              >
                <Text style={styles.acceptButtonText}>
                  {quote.status === "accepted" ? "Aceptada" : "Aceptar cotización"}
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <Modal
        visible={Boolean(acceptingQuote)}
        transparent
        animationType="fade"
        onRequestClose={() => setAcceptingQuote(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setAcceptingQuote(null)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Aceptar cotización</Text>
            <Text style={styles.modalSubtitle}>
              {acceptingQuote ? `${acceptingQuote.clientName} · ${acceptingQuote.clientEmail}` : ""}
            </Text>

            <View style={styles.datePickerBox}>
              <Text style={styles.datePickerLabel}>Fecha de instalación</Text>
              <DateTimePicker
                value={acceptInstallDate}
                mode="date"
                display="default"
                onChange={(_, selectedDate) => {
                  if (selectedDate) {
                    setAcceptInstallDate(selectedDate);
                  }
                }}
              />
              <Text style={styles.datePickerValue}>{formatInstallDate(acceptInstallDate)}</Text>
            </View>

            <Pressable
              style={[styles.primaryButton, isAccepting && styles.primaryButtonDisabled]}
              onPress={handleAcceptQuote}
              disabled={isAccepting}
            >
              <Text style={styles.primaryButtonText}>
                {isAccepting ? "Guardando..." : "Confirmar y guardar sistema"}
              </Text>
            </Pressable>

            <Pressable style={styles.cancelButton} onPress={() => setAcceptingQuote(null)}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
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
    bottom: 70,
    left: -90,
  },
  heroCard: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E4EEE8",
    padding: 18,
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
  card: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4EEE8",
    padding: 18,
    gap: 10,
  },
  cardTitle: {
    color: Colors.dark,
    fontWeight: "700",
    fontSize: 16,
  },
  groupLabel: {
    marginTop: 4,
    color: Colors.dark,
    fontWeight: "700",
    fontSize: 13,
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: "#DCE7E1",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#F6F8F7",
  },
  optionChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: "#EAF6EE",
  },
  optionChipText: {
    color: Colors.dark,
    fontSize: 12,
  },
  clientItem: {
    borderWidth: 1,
    borderColor: "#DCE7E1",
    borderRadius: 12,
    padding: 12,
    gap: 3,
  },
  clientItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: "#F3F8F4",
  },
  clientName: {
    color: Colors.dark,
    fontWeight: "700",
  },
  clientInfo: {
    color: Colors.gray,
    fontSize: 13,
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
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  selectedBox: {
    borderWidth: 1,
    borderColor: "#DCE7E1",
    borderRadius: 12,
    padding: 10,
    gap: 2,
    backgroundColor: "#F6F8F7",
  },
  selectedTitle: {
    color: Colors.dark,
    fontWeight: "700",
  },
  selectedText: {
    color: Colors.gray,
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.75,
  },
  primaryButtonText: {
    color: Colors.surface,
    fontWeight: "700",
  },
  refreshQuotesButton: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCE7E1",
    paddingVertical: 12,
    alignItems: "center",
  },
  refreshQuotesText: {
    color: Colors.primary,
    fontWeight: "700",
  },
  emptyText: {
    color: Colors.gray,
  },
  quoteItem: {
    borderWidth: 1,
    borderColor: "#DCE7E1",
    borderRadius: 12,
    padding: 12,
    gap: 2,
  },
  quoteTitle: {
    color: Colors.dark,
    fontWeight: "700",
  },
  quoteText: {
    color: Colors.gray,
  },
  quoteStatus: {
    marginTop: 4,
    color: Colors.primary,
    fontWeight: "700",
  },
  acceptButton: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  acceptButtonDisabled: {
    opacity: 0.7,
  },
  acceptButtonText: {
    color: Colors.surface,
    fontWeight: "700",
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 6,
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
  },
  modalTitle: {
    color: Colors.dark,
    fontSize: 18,
    fontWeight: "700",
  },
  modalSubtitle: {
    color: Colors.gray,
  },
  datePickerBox: {
    gap: 10,
    backgroundColor: "#F7FAF8",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DDE9E3",
  },
  datePickerLabel: {
    color: Colors.dark,
    fontSize: 14,
    fontWeight: "700",
  },
  datePickerValue: {
    color: Colors.gray,
    fontSize: 13,
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
});
