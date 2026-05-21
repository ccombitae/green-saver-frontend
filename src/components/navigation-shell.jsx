import { Colors } from "@/src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const normalizePath = (value) => (value && value !== "/" ? value.replace(/\/+$/, "") : value || "/");

export default function NavigationShell({
  children,
  title,
  rootPaths = [],
  backgroundColor = Colors.background,
  showFooter = false,
  footerItems = [],
}) {
  const router = useRouter();
  const pathname = normalizePath(usePathname());
  const normalizedRootPaths = rootPaths.map(normalizePath);
  const showBack = normalizedRootPaths.length > 0 && !normalizedRootPaths.includes(pathname);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {showBack ? (
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={Colors.dark} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.headerCenter}>
          {title ? <Text style={styles.headerTitle}>{title}</Text> : null}
        </View>

        <View style={styles.headerSide} />
      </View>

      <View style={styles.content}>{children}</View>

      {showFooter && Array.isArray(footerItems) && footerItems.length ? (
        <View style={styles.footer}>
          {footerItems.map((item) => {
            const isActive = normalizePath(item.href) === pathname;
            return (
              <Pressable
                key={item.href}
                style={[styles.footerItem, isActive ? styles.footerItemActive : null]}
                onPress={() => router.push(item.href)}
              >
                <Ionicons name={item.icon} size={20} color={isActive ? Colors.primary : Colors.dark} />
                <Text style={[styles.footerLabel, isActive ? styles.footerLabelActive : null]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  headerSide: {
    width: 48,
    alignItems: "flex-start",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: Colors.dark,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.6,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "#E4EEE8",
  },
  content: {
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    backgroundColor: Colors.surface,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 6,
  },
  footerItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    flex: 1,
  },
  footerItemActive: {},
  footerLabel: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.gray,
  },
  footerLabelActive: {
    color: Colors.primary,
  },
});