import NavigationShell from "@/src/components/navigation-shell";
import { useAuth } from "@/src/context/AuthContext";
import { Redirect, Slot } from "expo-router";

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    return <Redirect href={user.role === "admin" ? "/(admin)/dashboard" : "/(user)/dashboard"} />;
  }

  return (
    <NavigationShell title="GREEN SAVER" rootPaths={["/login"]} backgroundColor="#F7FAF8">
      <Slot />
    </NavigationShell>
  );
}