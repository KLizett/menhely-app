<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
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

// Adatok
const keresettNev = ref('')
const valasztottSzint = ref('')
const kutyak = ref([])
const aktivSetak = ref([])

// Indítás modal
const showModal = ref(false)
const KivalasztottKutya = ref(null)
const onkentesNev = ref('')
const setaInditasModal = (kutya) => {
  KivalasztottKutya.value = kutya; // <-- Ez beállítja a kutyát?
  showModal.value = true;          // <-- Ez megnyitja a modalt?
}

// Lezárás modal
const showCloseModal = ref(false)
const kivalasztottSeta = ref(null)
const walkNoteText = ref('')

async function adatokLekerese() {
  const { data: kutyaData } = await supabase.from('dogs').select('*')
  if (kutyaData) kutyak.value = kutyaData

  const { data: setaData } = await supabase
    .from('walks')
    .select('*, dogs(name), volunteers(full_name)')
    .is('end_time', null)
  
  if (setaData) aktivSetak.value = setaData
}

onMounted(() => {
  adatokLekerese()
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})

const szurtKutyak = computed(() => {
  return kutyak.value.filter(kutya => {
    const egyezikNev = kutya.name.toLowerCase().includes(keresettNev.value.toLowerCase())
    const egyezikSzint = valasztottSzint.value === '' || String(kutya.experience_required) === String(valasztottSzint.value)
    return egyezikNev && egyezikSzint
  })
})

//function setaInditasModal(kutya) {
 // KivalasztottKutya.value = kutya
 // showModal.value = true
//}

async function setaMentese() {
  if (!onkentesNev.value.trim()) {
    alert('Kérlek add meg az önkéntes nevét!')
    return
  }

  const nev = onkentesNev.value.trim()
  const kutyaSzint = KivalasztottKutya.value.experience_required || 1
  const kutyaId = KivalasztottKutya.value.id

  let volunteerId = null
  const { data: meglevoOnkentes } = await supabase
    .from('volunteers')
    .select('id')
    .eq('full_name', nev)
    .single()

  if (meglevoOnkentes) {
    volunteerId = meglevoOnkentes.id
  } else {
    const { data: ujOnkentes, error: volError } = await supabase
      .from('volunteers')
      .insert([{ full_name: nev, experience_level: kutyaSzint }])
      .select('id')
      .single()

    if (volError) {
      alert('Hiba az önkéntes mentésekor: ' + volError.message)
      return
    }
    volunteerId = ujOnkentes.id
  }

  const { error: walkError } = await supabase.from('walks').insert([
    {
      dog_id: kutyaId,
      volunteer_id: volunteerId,
      start_time: new Date().toISOString()
    }
  ])

  if (walkError) {
    alert('Hiba történt a séta mentésekor: ' + walkError.message)
  } else {
    alert('Séta sikeresen elindítva!')
    showModal.value = false
    onkentesNev.value = ''
    KivalasztottKutya.value = null
    adatokLekerese()
  }
}

function setaLezarasModal(seta) {
  kivalasztottSeta.value = seta
  walkNoteText.value = ''
  showCloseModal.value = true
}

async function setaLezarasaMegerosites() {
  const mostaniIdo = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('walks')
    .update({ end_time: mostaniIdo })
    .eq('id', kivalasztottSeta.value.id)

  if (updateError) {
    alert('Hiba a séta lezárásakor: ' + updateError.message)
    return
  }

  if (walkNoteText.value.trim()) {
    const { error: noteError } = await supabase.from('walk_notes').insert([
      {
        walk_id: kivalasztottSeta.value.id,
        note: walkNoteText.value.trim()
      }
    ])
    if (noteError) {
      console.error('Hiba a jegyzet mentésekor:', noteError)
    }
  }

  alert('Séta sikeresen lezárva!')
  showCloseModal.value = false
  kivalasztottSeta.value = null
  walkNoteText.value = ''
  adatokLekerese()
}

async function handleLogout() {
  await supabase.auth.signOut() // Elfelejti a bejelentkezett felhasználót
  router.push('/')             // Visszadob a LoginView-ra
}

// Segédfüggvény a kor vagy születési idő megjelenítésére
const getAgeDisplay = (dog) => {
  if (dog.birthday) {
    return `Születési idő: ${dog.birthday}`;
  } else if (dog.age_years) {
    return `Kor: ${dog.age_years} év`;
  }
  return 'Nincs megadva kor';
}

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

      <h1 class="page-title">Séta rögzítése</h1>

      <div class="menu-wrapper">
        <button class="icon-btn" @click="toggleProfileMenu">👤</button>
        
        <div v-if="isProfileMenuOpen" class="dropdown-menu right-menu">
          <router-link to="/profile" class="menu-item">Személyes adatok</router-link>
          <button class="menu-item logout-btn" @click="handleLogout">Kijelentkezés</button>
        </div>
      </div>
    </header>

    <main class="content-container">
      <!-- AKTÍV SÉTÁK DOBOZ -->
      <div v-if="aktivSetak.length > 0" class="section-box active-walks-box">
        <h4 class="cat-title active-title">🚶 Jelenleg folyamatban lévő séták</h4>
        <ul class="dog-list">
          <li v-for="seta in aktivSetak" :key="seta.id" class="dog-item">
            <span><strong>{{ seta.dogs?.name }}</strong> – Önkéntes: {{ seta.volunteers?.full_name || 'Ismeretlen' }}</span>
            <button class="action-btn stop-btn" @click="setaLezarasModal(seta)">Séta leállítása</button>
          </li>
        </ul>
      </div>

      <div class="filters-box">
        <h3>Szűrés a mai sétára</h3>
        <div class="filter-inputs">
          <input 
            type="text" 
            v-model="keresettNev" 
            placeholder="Kutya neve (vagy böngéssz a listából)..." 
            class="filter-input"
          />
          <select v-model="valasztottSzint" class="filter-input">
            <option value="">Minden szint</option>
            <option value="1">1. szint</option>
            <option value="2">2. szint</option>
            <option value="3">3. szint</option>
          </select>
        </div>
      </div>

      <div v-if="keresettNev || valasztottSzint" class="section-box">
        <h4>Keresési / Szűrési találatok:</h4>
        <ul class="dog-list">
          <li v-for="kutya in szurtKutyak" :key="kutya.id" class="dog-item highlight-item">
            <span>{{ kutya.name }} (Szint: {{ kutya.experience_required }})</span>
            <button class="action-btn" @click="setaInditasModal(kutya)">Séta indítása</button>
          </li>
        </ul>
      </div>

      <div class="category-box">
        <h4 class="cat-title waiting">🐾 Sétára váró kutyák</h4>
        <ul class="dog-list">
          <li v-for="kutya in kutyak" :key="kutya.id" class="dog-item">
            <span>{{ kutya.name }} (Szint: {{ kutya.experience_required }})</span>
            <button class="action-btn" @click="setaInditasModal(kutya)">Indítás</button>
          </li>
        </ul>
      </div>
    </main>

<!-- SÉTA INDÍTÁSA MODAL -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Séta indítása: {{ KivalasztottKutya?.name }}</h3>

        <!-- KUTYA INFORMÁCIÓS FELUGRÓ / KÁRTYA -->
        <div v-if="KivalasztottKutya" class="dog-info-card">
          <h3>{{ KivalasztottKutya.name }} adatai</h3>
          
          <p class="dog-meta">
            <strong>Nem:</strong> {{ KivalasztottKutya.gender || 'Nincs megadva' }} | 
            <strong>{{ getAgeDisplay(KivalasztottKutya) }}</strong>
          </p>

          <!-- Piros kiemelés a séta korlátozásokra (Walking Restrictions) -->
          <div v-if="KivalasztottKutya.walking_restrictions" class="restriction-box">
            <strong>⚠️ Séta korlátozás / Figyelem:</strong>
            <p>{{ KivalasztottKutya.walking_restrictions }}</p>
          </div>

          <!-- Speciális megjegyzések (Special Notes) -->
          <div v-if="KivalasztottKutya.special_notes" class="notes-box">
            <strong>Megjegyzések:</strong>
            <p>{{ KivalasztottKutya.special_notes }}</p>
          </div>
        </div>

        <p>Add meg az önkéntes nevét:</p>
        
        <input 
          type="text" 
          v-model="onkentesNev" 
          placeholder="Pl. Kovács Anna" 
          class="modal-input"
        />

        <div class="modal-buttons">
          <button class="action-btn cancel-btn" @click="showModal = false">Mégsem</button>
          <button class="action-btn confirm-btn" @click="setaMentese">Indítás megerősítése</button>
        </div>
      </div>
    </div>

    <!-- SÉTA LEÁLLÍTÁSA + WALK NOTE MODAL -->
    <div v-if="showCloseModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Séta lezárása: {{ kivalasztottSeta?.dogs?.name }}</h3>
        <p>Biztosan leállítod a sétát?</p>
        
        <p class="note-label">Szeretnél megjegyzést (walk note) hozzáadni?</p>
        <textarea 
          v-model="walkNoteText" 
          placeholder="Pl. Nyugodt séta volt, minden rendben..." 
          class="modal-textarea"
        ></textarea>

        <div class="modal-buttons">
          <button class="action-btn cancel-btn" @click="showCloseModal = false">Mégsem</button>
          <button class="action-btn confirm-btn" @click="setaLezarasaMegerosites">Biztosan leállítom</button>
        </div>
      </div>
    </div>
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
  gap: 20px;
}

.filters-box, .section-box, .category-box {
  background-color: white;
  border: 2px solid #957a64;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}

.filters-box h3, .section-box h4, .category-box h4 {
  margin-top: 0;
  color: #957a64;
}

.filter-inputs {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.filter-input {
  flex: 1;
  min-width: 200px;
  padding: 10px 12px;
  border: 1px solid #957a64;
  border-radius: 8px;
  background-color: #faf8f5;
  outline: none;
}

.dog-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.dog-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  border-bottom: 1px solid #e0d8c3;
}

.dog-item:last-child {
  border-bottom: none;
}

.action-btn {
  background-color: #957a64;
  color: #ede8d6;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.action-btn:hover {
  background-color: #7a624f;
}

.active-walks-box {
  border: 2px solid #b8860b;
  background-color: #fcf9f0;
}

.active-title {
  color: #b8860b !important;
}

.stop-btn {
  background-color: #a33b3b !important;
}
.stop-btn:hover {
  background-color: #822e2e !important;
}

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: #ede8d6;
  border: 2px solid #957a64;
  padding: 30px 25px;
  border-radius: 12px;
  width: 90%;
  max-width: 380px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
  text-align: center;
  box-sizing: border-box;
}

.modal-content h3 {
  color: #957a64;
  margin-top: 0;
  margin-bottom: 10px;
}

.modal-content p {
  color: #555;
  font-size: 14px;
  margin-bottom: 15px;
}

.modal-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #957a64;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
  background-color: #faf8f5;
  box-sizing: border-box;
  margin-bottom: 20px;
}

.note-label {
  font-size: 13px;
  color: #666;
  margin-bottom: 5px;
  text-align: left;
}

.modal-textarea {
  width: 100%;
  height: 80px;
  padding: 8px 12px;
  border: 1px solid #957a64;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background-color: #faf8f5;
  box-sizing: border-box;
  margin-bottom: 15px;
  resize: none;
}

.modal-buttons {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.modal-buttons .action-btn {
  flex: 1;
  padding: 10px;
  font-size: 14px;
}

.cancel-btn {
  background-color: #a33b3b;
  color: white;
}
.cancel-btn:hover {
  background-color: #822e2e;
}

.confirm-btn {
  background-color: #957a64;
  color: #ede8d6;
}
.confirm-btn:hover {
  background-color: #7a624f;
}

.dog-info-card {
  background-color: #f8f9fa;
  border: 1px solid #ced4da;
  border-radius: 8px;
  padding: 16px;
  margin: 15px 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.dog-info-card h3 {
  margin-top: 0;
  margin-bottom: 8px;
  color: #333;
  font-size: 1.2rem;
}

.dog-meta {
  font-size: 0.95rem;
  color: #555;
  margin-bottom: 12px;
}

/* Piros kiemelés a walking restrictions-nek */
.restriction-box {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 10px;
}

.restriction-box p {
  margin: 4px 0 0 0;
  font-weight: 500;
}

/* Normál megjegyzés doboz */
.notes-box {
  background-color: #e2e3e5;
  border: 1px solid #d6d8db;
  color: #383d41;
  padding: 10px 12px;
  border-radius: 6px;
}

.notes-box p {
  margin: 4px 0 0 0;
}
</style>