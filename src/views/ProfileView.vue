<template>
  <div class="page-bg">
    <!-- Működő, teljes szélességű fejléc a WalkView alapján -->
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

    <!-- Profil kártya a pontos elrendezéssel -->
    <main class="content-container">
      <div class="card profile-card">
        <div class="avatar-container">
          <div class="avatar-circle">
            <span class="avatar-icon">🛠️</span>
          </div>
        </div>

        <h2 class="profile-name">{{ workerData.name || 'Ismeretlen felhasználó' }}</h2>


        <hr class="divider" />

        <div class="info-row">
          <span class="info-label">Szerepkör:</span>
          <span class="info-value"><strong>{{ workerData.role || '-' }}</strong></span>
        </div>


      </div>
    </main>
  </div>
</template>

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

const workerData = ref({
  name: '',
  role: '',
  permissions: ''
})

async function loadProfile() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError

    if (user) {
      // Lekérdezés e-mail alapján
      let { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('email', user.email)
        .maybeSingle()

      // Ha e-mail alapján nem lenne meg, próbáljuk ID alapján
      if (!data) {
        const res = await supabase
          .from('workers')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
        data = res.data
      }

      if (data) {
        workerData.value = {
          name: data.name || data.full_name || data.nev || '',
          role: data.role || data.szerepkor || 'Dolgozó',
          permissions: data.permissions || data.jogosultsag || 'Séták rögzítése'
        }
      }
    }
  } catch (err) {
    console.error('Hiba a profil betöltésekor:', err.message)
  }
}

async function handleLogout() {
  await supabase.auth.signOut()
  router.push('/')
}

onMounted(() => {
  loadProfile()
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.page-bg {
  background-color: #ede8d6;
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
}

/* Teljesen azonos fejléc stílus a WalkView-val */
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
  flex-direction: column;
  align-items: center;
}

.profile-card {
  background-color: white;
  border: 2px solid #957a64;
  border-radius: 16px;
  padding: 30px;
  width: 100%;
  max-width: 450px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
  box-sizing: border-box;
  text-align: center;
}

.avatar-container {
  display: flex;
  justify-content: center;
  margin-bottom: 15px;
}

.avatar-circle {
  width: 75px;
  height: 75px;
  border: 2px solid #957a64;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #faf8f5;
}

.avatar-icon {
  font-size: 32px;
}

.profile-name {
  font-size: 22px;
  font-weight: bold;
  color: #7a624f;
  margin: 5px 0;
}

.profile-subtitle {
  font-size: 14px;
  font-weight: 600;
  color: #b08d57;
  margin-bottom: 20px;
}

.divider {
  border: none;
  border-top: 1px solid #e0d6c3;
  margin: 20px 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 14px 0;
  font-size: 15px;
  color: #444;
}

.info-label {
  color: #666;
}
</style>