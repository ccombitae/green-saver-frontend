import NavigationShell from "@/src/components/navigation-shell";
import { useAuth } from "@/src/context/AuthContext";
import { Redirect, Slot } from "expo-router";

export default function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== "admin") {
    return <Redirect href="/(user)/dashboard" />;
  }

  return (
    <NavigationShell
      title="ADMINISTRADOR"
      rootPaths={["/dashboard"]}
      backgroundColor="#F7FAF8"
      showFooter
      footerItems={[
        { label: "Inicio", icon: "grid", href: "/dashboard" },
        { label: "Usuarios", icon: "people", href: "/users" },
        { label: "Cotizaciones", icon: "document-text", href: "/quotes" },
        { label: "Estadísticas", icon: "stats-chart", href: "/statistics" },
      ]}
    >
      <Slot />
    </NavigationShell>
  );
}