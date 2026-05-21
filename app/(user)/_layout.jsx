import NavigationShell from "@/src/components/navigation-shell";
import { useAuth } from "@/src/context/AuthContext";
import { Redirect, Slot } from "expo-router";

export default function UserLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role === "admin") {
    return <Redirect href="/(admin)/dashboard" />;
  }

  return (
    <NavigationShell
      title="GREEN SAVER"
      rootPaths={["/dashboard"]}
      backgroundColor={"#F7FAF8"}
    >
      <Slot />
    </NavigationShell>
  );
}