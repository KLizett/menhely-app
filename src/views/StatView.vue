<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'

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

async function handleLogout() {
  await supabase.auth.signOut()
  router.push('/')
}

// Mai dátum megjelenítéséhez
const maiDatum = ref('')

// Statisztikai adatok
const statisztikak = ref({
  osszesKutya: 0,
  osszesOnkentes: 0,
  aktivSetakSzama: 0,
  osszesSeta: 0,
  maiSetak: 0
})

async function statisztikakLekerese() {
  // 1. Kutyák száma
  const { count: kutyaCount } = await supabase.from('dogs').select('*', { count: 'exact', head: true })
  statisztikak.value.osszesKutya = kutyaCount || 0

  // 2. Önkéntesek száma
  const { count: onkentesCount } = await supabase.from('volunteers').select('*', { count: 'exact', head: true })
  statisztikak.value.osszesOnkentes = onkentesCount || 0

  // 3. Jelenleg sétán lévők száma (ahol nincs end_time)
  const { count: aktivCount } = await supabase.from('walks').select('*', { count: 'exact', head: true }).is('end_time', null)
  statisztikak.value.aktivSetakSzama = aktivCount || 0

  // 4. Összes séta száma
  const { count: osszesSetaCount } = await supabase.from('walks').select('*', { count: 'exact', head: true })
  statisztikak.value.osszesSeta = osszesSetaCount || 0

  // 5. Mai séták száma (mai dátummal kezdődő séták)
  const todayStr = new Date().toISOString().split('T')[0] // 'YYYY-MM-DD' formátum
  const { data: maiSetakData } = await supabase
    .from('walks')
    .select('start_time')
    
  if (maiSetakData) {
    statisztikak.value.maiSetak = maiSetakData.filter(walk => walk.start_time && walk.start_time.startsWith(todayStr)).length
  }
}

onMounted(() => {
  // Dátum formázása magyarul (pl. 2026. október 14.)
  const options = { year: 'numeric', month: 'long', day: 'numeric' }
  maiDatum.value = new Date().toLocaleDateString('hu-HU', options)

  statisztikakLekerese()
  window.addEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="page-bg">
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

      <h1 class="page-title">Statisztikák</h1>

      <div class="menu-wrapper">
        <button class="icon-btn" @click="toggleProfileMenu">👤</button>
        
        <div v-if="isProfileMenuOpen" class="dropdown-menu right-menu">
          <router-link to="/profile" class="menu-item">Személyes adatok</router-link>
          <button class="menu-item logout-btn" @click="handleLogout">Kijelentkezés</button>
        </div>
      </div>
    </header>

    <main class="content-container">
      <div class="stats-grid">
        <!-- Mai dátum kártya -->
        <div class="stat-card date-card">
          <h3>Mai dátum</h3>
          <p class="stat-date">{{ maiDatum }}</p>
        </div>

        <div class="stat-card">
          <h3>Jelenleg sétán</h3>
          <p class="stat-number active-num">{{ statisztikak.aktivSetakSzama }}</p>
        </div>

        <div class="stat-card">
          <h3>Mai séták száma</h3>
          <p class="stat-number">{{ statisztikak.maiSetak }}</p>
        </div>

        <div class="stat-card">
          <h3>Regisztrált kutyák</h3>
          <p class="stat-number">{{ statisztikak.osszesKutya }}</p>
        </div>

        <div class="stat-card">
          <h3>Összes önkéntes</h3>
          <p class="stat-number">{{ statisztikak.osszesOnkentes }}</p>
        </div>

        <div class="stat-card">
          <h3>Összes séta</h3>
          <p class="stat-number">{{ statisztikak.osszesSeta }}</p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page-bg { background-color: #ede8d6; min-height: 100vh; padding: 20px; box-sizing: border-box; }
.top-header { display: flex; justify-content: space-between; align-items: center; background-color: #957a64; color: #ede8d6; padding: 12px 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
.page-title { font-size: 20px; font-weight: bold; margin: 0; }
.icon-btn { background: none; border: none; font-size: 24px; color: #ede8d6; cursor: pointer; }
.menu-wrapper { position: relative; }
.dropdown-menu { position: absolute; top: 55px; background-color: #ede8d6; border: 2px solid #957a64; border-radius: 10px; padding: 8px 0; min-width: 170px; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2); z-index: 999; display: flex; flex-direction: column; }
.left-menu { left: 0; } .right-menu { right: 0; }
.menu-item { background: none; border: none; padding: 10px 16px; text-align: left; font-size: 15px; color: #333; text-decoration: none; cursor: pointer; }
.menu-item:hover { background-color: rgba(149, 122, 100, 0.15); color: #957a64; }
.logout-btn { color: #a33b3b; font-weight: bold; }

.content-container { max-width: 500px; margin: 0 auto; }

/* Kártyák egymás alá rendezése (mobilbarát elrendezés) */
.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.stat-card {
  background-color: white;
  border: 2px solid #957a64;
  border-radius: 12px;
  padding: 18px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}

.stat-card h3 {
  color: #7c624d;
  font-size: 16px;
  margin: 0 0 8px 0;
}

.stat-number {
  color: #333;
  font-size: 24px;
  font-weight: bold;
  margin: 0;
}

.stat-date {
  color: #555;
  font-size: 18px;
  font-weight: bold;
  margin: 0;
}

.active-num {
  color: #8c6239;
}
</style>