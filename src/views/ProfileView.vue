<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '../supabase'
import { useRouter } from 'vue-router'

const router = useRouter()
const isMainMenuOpen = ref(false)
const isProfileMenuOpen = ref(false)

function toggleMainMenu(event) {
  event.stopPropagation()
  isMainMenuOpen.value = !isMainMenuOpen.value
  if (isMainMenuOpen.value) isProfileMenuOpen.value = false
}

function toggleProfileMenu(event) {
  event.stopPropagation()
  isProfileMenuOpen.value = !isProfileMenuOpen.value
  if (isProfileMenuOpen.value) isMainMenuOpen.value = false
}

function handleClickOutside() {
  isMainMenuOpen.value = false
  isProfileMenuOpen.value = false
}

// Dolgozó / Admin adatok a Supabase workers táblájából
const dolgozoAdatok = ref({
  full_name: 'Betöltés...',
  role: 'Dolgozó / Admin'
})

async function dolgozoLekerese() {
  // Példaként lekérjük az első dolgozót a workers táblából (később ez a bejelentkezett user ID-ja lesz)
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .limit(1)
    .single()

  if (data) {
    dolgozoAdatok.value = data
  } else {
    // Ha üres a tábla, írjunk ki egy alapértelmezettet
    dolgozoAdatok.value = {
      full_name: 'Menhelyi Dolgozó',
      role: 'Adminisztrátor'
    }
  }
}

onMounted(() => {
  dolgozoLekerese()
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})

async function handleLogout() {
  await supabase.auth.signOut() // Elfelejti a bejelentkezett felhasználót
  router.push('/')             // Visszadob a LoginView-ra
}
</script>

<template>
  <div class="page-bg">
    <!-- Fejléc -->
    <header class="top-header">
      <div class="menu-wrapper">
        <button class="icon-btn" @click="toggleMainMenu">☰</button>
        
        <div v-if="isMainMenuOpen" class="dropdown-menu left-menu">
          <router-link to="/home" class="menu-item">Kutyáink</router-link>
          <router-link to="/walk" class="menu-item">Séta rögzítése</router-link>
          <router-link to="/stat" class="menu-item">Statisztikák</router-link>
          <router-link to="/admin" class="menu-item">Admin felület</router-link>
        </div>
      </div>

      <h1 class="page-title">Személyes adatok</h1>

      <div class="menu-wrapper">
        <button class="icon-btn" @click="toggleProfileMenu">👤</button>
        
        <div v-if="isProfileMenuOpen" class="dropdown-menu right-menu">
          <router-link to="/profile" class="menu-item">Személyes adatok</router-link>
          <button class="menu-item logout-btn" @click="handleLogout">Kijelentkezés</button>
        </div>
      </div>
    </header>

    <!-- Tartalom -->
    <main class="content-container">
      <div class="profile-card">
        <div class="profile-avatar">🛠️</div>
        <h2>{{ dolgozoAdatok.full_name || dolgozoAdatok.name }}</h2>
        <p class="role-badge">Menhelyi Dolgozó / Admin</p>

        <div class="profile-details">
          <div class="detail-row">
            <span>Szerepkör:</span>
            <strong>Adminisztrátor</strong>
          </div>
          <div class="detail-row">
            <span>Jogosultság:</span>
            <strong>Séták rögzítése és jóváhagyása</strong>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page-bg {
  background-color: #ede8d6;
  min-height: 100vh;
  padding: 20px;
}

.top-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #957a64;
  color: #ede8d6;
  padding: 12px 20px;
  border-radius: 12px;
  margin-bottom: 30px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.page-title {
  font-size: 20px;
  font-weight: bold;
  margin: 0;
}

.icon-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #ede8d6;
  cursor: pointer;
}

.menu-wrapper {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 55px;
  background-color: #ede8d6;
  border: 2px solid #957a64;
  border-radius: 10px;
  padding: 8px 0;
  min-width: 170px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  z-index: 999;
  display: flex;
  flex-direction: column;
}

.left-menu { left: 0; }
.right-menu { right: 0; }

.menu-item {
  background: none;
  border: none;
  padding: 10px 16px;
  text-align: left;
  font-size: 15px;
  color: #333;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background-color: rgba(149, 122, 100, 0.15);
  color: #957a64;
}

.logout-btn {
  color: #a33b3b;
  font-weight: bold;
}

.content-container {
  display: flex;
  justify-content: center;
}

.profile-card {
  background-color: white;
  border: 2px solid #957a64;
  border-radius: 16px;
  padding: 30px;
  width: 100%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 6px 12px rgba(0,0,0,0.08);
}

.profile-avatar {
  font-size: 40px;
  background-color: #fcf9f0;
  border: 2px solid #957a64;
  width: 90px;
  height: 90px;
  line-height: 90px;
  border-radius: 50%;
  margin: 0 auto 15px auto;
}

.profile-card h2 {
  color: #957a64;
  margin: 0 0 5px 0;
}

.role-badge {
  color: #b8860b;
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 25px;
}

.profile-details {
  border-top: 1px solid #e0d8c3;
  padding-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 15px;
  color: #444;
}
</style>