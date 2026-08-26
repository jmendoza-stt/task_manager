import { Routes, Route, Navigate } from "react-router";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { AppShell } from "@/app/AppShell";
import { WelcomePage } from "@/pages/WelcomePage";
import SignInPage from "@/pages/auth/sign-in/SignInPage";
import SignUpPage from "@/pages/auth/sign-up/SignUpPage";
import VerifyPage from "@/pages/auth/verify/VerifyPage";
import { authStore } from "@/stores/auth-store";

/**
 * App - Clean starter application with minimal shell
 * 
 * This is the clean version for starting new applications.
 * Run with: npm run dev
 * 
 * For the full-featured demo, run: npm run demo
 * 
 * @agents Arquitectura de Rutas
 * 
 * Este archivo define todas las rutas de la aplicación. Las rutas se organizan
 * en dos categorías:
 * 
 * ## 1. Rutas con Shell
 * 
 * Las rutas que comparten el layout común (sidebar + header) van dentro de
 * `<Route element={<AppShell />}>`. El shell renderiza las rutas hijas usando
 * `<Outlet />`.
 * 
 * ```tsx
 * <Route element={<AppShell />}>
 *   <Route path="/" element={<Dashboard />} />
 *   <Route path="/users" element={<Users />} />
 *   <Route path="/settings" element={<Settings />} />
 * </Route>
 * ```
 * 
 * Para agregar una nueva página con shell:
 * 1. Crear el componente en `src/pages/`
 * 2. Importarlo aquí
 * 3. Agregar `<Route path="/ruta" element={<Componente />} />` dentro del shell
 * 4. Actualizar el menú en `AppSidebar.tsx`
 * 
 * ## 2. Rutas Standalone
 * 
 * Las rutas que NO usan el shell van fuera. Útil para:
 * - Login/Registro
 * - Landing pages
 * - Páginas de error
 * - Cualquier página con layout diferente
 * 
 * ```tsx
 * <Route path="/login" element={<LoginPage />} />
 * ```
 * 
 * ## Múltiples Shells (Micrositios)
 * 
 * Si necesitas diferentes layouts para diferentes secciones:
 * 
 * ```tsx
 * <Routes>
 *   <Route element={<AdminShell />}>
 *     <Route path="/admin/*" element={...} />
 *   </Route>
 *   <Route element={<PublicShell />}>
 *     <Route path="/public/*" element={...} />
 *   </Route>
 * </Routes>
 * ```
 * 
 * Ver `demo/DemoApp.tsx` para un ejemplo completo con documentación extendida.
 * 
 * ## Archivos Relacionados
 * 
 * - `AppShell.tsx` - Layout wrapper (sidebar + header + Outlet)
 * - `AppSidebar.tsx` - Menú de navegación (personalizar aquí)
 * - `../pages/` - Componentes de página
 * @kgId d91162d0d213
 */
export default observer(function App() {
  useEffect(() => {
    authStore.checkSession();
  }, []);

  // Show nothing while checking session
  if (authStore.state === "idle" || authStore.state === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <Routes>
      {/* ════════════════════════════════════════════════════════════════════
          RUTAS CON SHELL (requieren autenticación)
          ════════════════════════════════════════════════════════════════════ */}
      <Route element={authStore.isAuthenticated ? <AppShell /> : <Navigate to="/signin" />}>
        <Route path="/" element={<WelcomePage />} />
      </Route>

      {/* ════════════════════════════════════════════════════════════════════
          RUTAS STANDALONE — Auth pages
          ════════════════════════════════════════════════════════════════════ */}
      <Route path="/signin" element={authStore.isAuthenticated ? <Navigate to="/" /> : <SignInPage />} />
      <Route path="/signup" element={authStore.isAuthenticated ? <Navigate to="/" /> : <SignUpPage />} />
      <Route path="/verify" element={<VerifyPage />} />
    </Routes>
  );
});
