import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "../supabaseClient";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/LoginView.vue"),
    meta: { requiresAuth: false }, // Claridad absoluta
  },
  {
    path: "/register",
    name: "Register",
    component: () => import("../views/RegisterView.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/",
    name: "Home",
    component: () => import("../views/HomeView.vue"),
    meta: { requiresAuth: true, showNav: true },
  },
  {
    path: "/partida/nueva",
    name: "NuevaPartida",
    component: () => import("../views/NewMatchView.vue"),
    meta: { requiresAuth: true, showNav: true },
  },
  {
    path: "/historial",
    name: "Historial",
    component: () => import("../views/HistoryView.vue"),
    meta: { requiresAuth: true, showNav: true },
  },
  {
    path: "/ranking",
    name: "Ranking",
    component: () => import("../views/RankingView.vue"),
    meta: { requiresAuth: true, showNav: true },
  },
  {
    path: "/partida/:id",
    name: "PartidaDetalles",
    component: () => import("../views/PartidaDetalles.vue"),
    props: true, // Esto permite recibir el ID como prop
    meta: { requiresAuth: true, showNav: true },
  },
  {
    path: "/jugadores",
    name: "Jugadores",
    component: () => import("../views/PlayersView.vue"),
    meta: { requiresAuth: true, showNav: true },
  },
  {
    path: "/profile/:username",
    name: "Profile",
    component: () => import("../views/UserProfileView.vue"),
    meta: { requiresAuth: true, showNav: true }, // Asumo que prefieres que estén logueados
  },
  {
    path: "/mi-perfil",
    name: "MiPerfil",
    component: () => import("../views/MyProfileView.vue"),
    meta: { requiresAuth: true, showNav: true },
  },
  // RUTA DE CAPTURA DE ERRORES (Evita el 404 si el router se pierde)
  {
    path: "/:pathMatch(.*)*",
    redirect: { name: "Home" },
  },
];

const router = createRouter({
  // Aseguramos que el history tome correctamente la base de GitHub Pages
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

/**
 * GUARDIA DE SEGURIDAD CORREGIDA
 */
router.beforeEach(async (to, from, next) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

  // 1. Si la ruta requiere auth y NO hay sesión
  if (requiresAuth && !session) {
    // Usamos el path exacto para evitar problemas de resolución de nombres en subcarpetas
    next("/login");
  }
  // 2. Si hay sesión e intenta ir a login/register
  else if (session && (to.name === "Login" || to.name === "Register")) {
    next("/");
  }
  // 3. En cualquier otro caso, adelante
  else {
    next();
  }
});

export default router;
