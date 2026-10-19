import { createRouter, createWebHistory } from 'vue-router'
// 1. Lépés: Importáljuk a létrehozott Kezdőlap komponenst
import HomeView from '../views/HomeView.vue'
import StatView from '../views/StatView.vue'
import WalkView from '../views/WalkView.vue'
import ProfileView from '../views/ProfileView.vue'
import LoginView from '../views/LoginView.vue'
import AdminView from '../views/AdminView.vue'

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
      path: '/stat', // <-- Ez lesz az új útvonal
      name: 'stat',
      component: StatView
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
    },
        {
      path: '/admin',
      name: 'admin',
      component: AdminView
    }
  ],
})

export default router