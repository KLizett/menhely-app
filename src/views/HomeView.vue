<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '../supabase'
import { useRouter } from 'vue-router'

const router = useRouter()
// Ez a változó fogja tárolni a kutyák listáját
const kutyalista = ref([])

// Ez a függvény kéri le az adatokat a Supabase-ből
async function getKutyak() {
  const { data, error } = await supabase.from('dogs').select('*')
  
  if (error) {
    console.error("Hiba történt a lekérdezéskor:", error)
  } else {
    kutyalista.value = data
  }
}

// A menük nyitott/zárt állapotát kezelő reaktív változók
const isMainMenuOpen = ref(false)
const isProfileMenuOpen = ref(false)

function toggleMainMenu(event) {
  event.stopPropagation()
  isMainMenuOpen.value = !isMainMenuOpen.value
  if (isMainMenuOpen.value) isProfileMenuOpen.value = false // becsukja a másikat, ha ezt nyitjuk
}

function toggleProfileMenu(event) {
  event.stopPropagation()
  isProfileMenuOpen.value = !isProfileMenuOpen.value
  if (isProfileMenuOpen.value) isMainMenuOpen.value = false // becsukja a másikat, ha ezt nyitjuk
}

// Bárhová kattintva az oldalon, bezárjuk a menüket
function handleClickOutside() {
  isMainMenuOpen.value = false
  isProfileMenuOpen.value = false
}

// Amikor betölt az oldal, lefut a lekérdezés és regisztráljuk a kattintásfigyelőt
onMounted(() => {
  getKutyak()
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
    <!-- Sötétbarna fejléc a menü ikonokkal és lenyíló menükkel -->
    <header class="top-header">
      <div class="menu-wrapper">
        <button class="icon-btn" @click="toggleMainMenu">☰</button>
        
        <div v-if="isMainMenuOpen" class="dropdown-menu left-menu">
          <router-link to="/home" class="menu-item">Kutyáink</router-link>
          <router-link to="/walk" class="menu-item">Séta rögzítése</router-link>
          <router-link to="/admin" class="menu-item">Statisztikák</router-link>
        </div>
      </div>

      <h1 class="page-title">Kutyáink</h1>

      <div class="menu-wrapper">
        <button class="icon-btn" @click="toggleProfileMenu">👤</button>
        
        <div v-if="isProfileMenuOpen" class="dropdown-menu right-menu">
          <router-link to="/profile" class="menu-item">Személyes adatok</router-link>
          <button class="menu-item logout-btn" @click="handleLogout">Kijelentkezés</button>
        </div>
      </div>
    </header>

    <!-- Fő tartalom: Kutyák listázása képekkel -->
    <main class="content-container">
      <div class="dog-grid">
        <div v-for="kutya in kutyalista" :key="kutya.id" class="dog-card">
          <img v-if="kutya.image_url" :src="kutya.image_url" alt="Kutya képe" class="dog-image" />
          <div class="dog-info">
            <h3>{{ kutya.name }}</h3>
            <p>Szint: {{ kutya.experience_required }}</p>
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
  box-sizing: border-box;
}

.top-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #957a64;
  color: #ede8d6;
  padding: 12px 20px;
  border-radius: 12px;
  margin-bottom: 25px;
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
  max-width: 900px;
  margin: 0 auto;
}

/* Modern, reszponsív rács kártyáknak */
.dog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
  justify-content: center;
}

.dog-card {
  background-color: white;
  border: 2px solid #957a64;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s;
}

.dog-card:hover {
  transform: translateY(-3px);
}

/* Kép beállítása: cover-rel kitölti a keretet, így nem lesznek üres sávok */
.dog-image {
  width: 100%;
  height: 280px;
  object-fit: cover;
  background-color: #f4f1ea;
}

.dog-info {
  padding: 15px;
  text-align: left;
}

.dog-info h3 {
  color: #7c624d;
  font-size: 18px;
  margin: 0 0 5px 0;
}

.dog-info p {
  color: #555;
  font-size: 14px;
  margin: 0;
}
</style>