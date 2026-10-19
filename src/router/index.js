import { createRouter, createWebHistory } from 'vue-router'
// 1. Lépés: Importáljuk a létrehozott Kezdőlap komponenst
import HomeView from '../views/HomeView.vue'
import AdminView from '../views/AdminView.vue'
import WalkView from '../views/WalkView.vue'
import ProfileView from '../views/ProfileView.vue'
import LoginView from '../views/LoginView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // 2. Lépés: Megmondjuk a routernek, hogy melyik útvonalhoz melyik nézet tartozik
  routes: [
    {
      path: '/home',
      name: 'home',
      component: HomeView
    },
    {
      path: '/admin', // <-- Ez lesz az új útvonal
      name: 'admin',
      component: AdminView
    },
    {
      path: '/walk',
      name: 'walk',
      component: WalkView
    },
    {
    path: '/profile',
    name: 'profile',
    component: ProfileView
    },
    {
      path: '/',
      name: 'login',
      component: LoginView
    }
  ],
})

export default router