import { Redirect } from "expo-router";

// Ruta antigua del panel del usuario: ahora el inicio es la pestaña "Inicio".
// Se conserva para que los enlaces y redirecciones a /(user)/dashboard sigan funcionando.
export default function UserDashboard() {
  return <Redirect href="/(user)/(tabs)" />;
}
