<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'
import { useRouter } from 'vue-router'

const router = useRouter()

// Fő kategória: 'dogs' vagy 'workers'
const aktivTab = ref('dogs')

// Művelet típusa: 'create' (új) vagy 'update' (módosítás)
const muveletTipus = ref('create')

// --- KUTYA ADATOK ---
const kutyak = ref([])
const kivalasztottKutyaId = ref(null)
const ujKutya = ref({
  name: '',
  gender: '',
  experience_required: 1,
  birthday: '',
  age_years: null,
  walking_restrictions: '',
  special_notes: '',
  breed: '',
  size: '',
  active_flag: true,
  intake_date: '',
  image_url: ''
})

// --- DOLGOZÓ ADATOK ---
const dolgozok = ref([])
const kivalasztottDolgozoId = ref(null)
const ujDolgozo = ref({
  full_name: '',
  role: '',
  active_flag: true,
  phone: '',
  email: ''
})

// Képfeltöltéshez ideiglenes fájl
const kepFájl = ref(null)

// Adatok betöltése
async function adatokLekerese() {
  const { data: dogData } = await supabase.from('dogs').select('*').order('name')
  if (dogData) kutyak.value = dogData

  const { data: workerData } = await supabase.from('workers').select('*').order('full_name')
  if (workerData) dolgozok.value = workerData
}

onMounted(() => {
  adatokLekerese()
})

// Ha módosításra váltunk és kiválasztanak egy kutyát
function kutyaKivalasztva(event) {
  const id = event.target.value
  kivalasztottKutyaId.value = id
  const talalt = kutyak.value.find(k => k.id == id)
  if (talalt) {
    // Másolatot készítünk, hogy ne rontsa el azonnal a listát gépelés közben
    ujKutya.value = { ...talalt }
  }
}

// Ha módosításra váltunk és kiválasztanak egy dolgozót
function dolgozoKivalasztva(event) {
  const id = event.target.value
  kivalasztottDolgozoId.value = id
  const talalt = dolgozok.value.find(d => d.id == id)
  if (talalt) {
    ujDolgozo.value = { ...talalt }
  }
}

// Kép feltöltése a Supabase Storage-ba (vagy link kezelése)
async function kepFeltoltes(event) {
  const file = event.target.files[0]
  if (!file) return

  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random()}.${fileExt}`
  const filePath = `dog-images/${fileName}`

  // Megjegyzés: Szükséges, hogy legyen egy 'dog-photos' nevű nyilvános bucket a Supabase Storage-ban!
  const { error: uploadError } = await supabase.storage.from('dog-photos').upload(filePath, file)

  if (uploadError) {
    alert('Hiba a kép feltöltésekor: ' + uploadError.message)
    return
  }

  // Nyilvános URL lekérése
  const { data } = supabase.storage.from('dog-photos').getPublicUrl(filePath)
  ujKutya.value.image_url = data.publicUrl
  alert('Kép sikeresen feltöltve!')
}

// Mentés (Insert vagy Update)
async function mentoFuggveny() {
  if (aktivTab.value === 'dogs') {
    if (!ujKutya.value.name) {
      alert('A kutya neve kötelező!')
      return
    }

    if (muveletTipus.value === 'create') {
      const { error } = await supabase.from('dogs').insert([ujKutya.value])
      if (error) alert('Hiba: ' + error.message)
      else { alert('Kutya sikeresen feltöltve!'); alaphelyzet(); }
    } else {
      const { error } = await supabase.from('dogs').update({ ...ujKutya.value, updated_at: new Date().toISOString() }).eq('id', kivalasztottKutyaId.value)
      if (error) alert('Hiba: ' + error.message)
      else { alert('Kutya adatai frissítve!'); alaphelyzet(); }
    }
  } else {
    // Dolgozók mentése
    if (!ujDolgozo.value.full_name) {
      alert('A dolgozó neve kötelező!')
      return
    }

    if (muveletTipus.value === 'create') {
      const { error } = await supabase.from('workers').insert([ujDolgozo.value])
      if (error) alert('Hiba: ' + error.message)
      else { alert('Dolgozó sikeresen feltöltve!'); alaphelyzet(); }
    } else {
      const { error } = await supabase.from('workers').update({ ...ujDolgozo.value, updated_at: new Date().toISOString() }).eq('id', kivalasztottDolgozoId.value)
      if (error) alert('Hiba: ' + error.message)
      else { alert('Dolgozó adatai frissítve!'); alaphelyzet(); }
    }
  }
  adatokLekerese()
}

function alaphelyzet() {
  kivalasztottKutyaId.value = null
  kivalasztottDolgozoId.value = null
  ujKutya.value = { name: '', gender: '', experience_required: 1, birthday: '', age_years: null, walking_restrictions: '', special_notes: '', breed: '', size: '', active_flag: true, intake_date: '', image_url: '' }
  ujDolgozo.value = { full_name: '', role: '', active_flag: true, phone: '', email: '' }
}
</script>

<template>
  <div class="admin-bg">
    <header class="top-header">
      <h1>Adminisztrációs Vezérlőpult</h1>
      <router-link to="/walk" class="back-link">Vissza a sétákhoz</router-link>
    </header>

    <main class="admin-container">
      <!-- FŐ VÁLASZTÓ GOMBOK (Kutyák / Dolgozók) -->
      <div class="tab-selector">
        <button :class="['tab-btn', aktivTab === 'dogs' ? 'active' : '']" @click="aktivTab = 'dogs'; alaphelyzet()">🐶 Kutyák kezelése</button>
        <button :class="['tab-btn', aktivTab === 'workers' ? 'active' : '']" @click="aktivTab = 'workers'; alaphelyzet()">👩‍💼 Dolgozók kezelése</button>
      </div>

      <!-- MŰVELET VÁLASZTÓ (Új felvétele vagy Módosítás) -->
      <div class="card sub-card">
        <div class="action-selector">
          <label>
            <input type="radio" value="create" v-model="muveletTipus" @change="alaphelyzet" /> Új adat feltöltése
          </label>
          <label>
            <input type="radio" value="update" v-model="muveletTipus" /> Meglévő adat módosítása (Update)
          </label>
        </div>

        <!-- Ha update van, ki kell választani kit szerkesztünk -->
        <div v-if="muveletTipus === 'update'" class="select-target">
          <template v-if="aktivTab === 'dogs'">
            <label>Válaszd ki a szerkesztendő kutyát:</label>
            <select @change="kutyaKivalasztva" class="admin-input">
              <option value="">-- Válassz kutyát --</option>
              <option v-for="k in kutyak" :key="k.id" :value="k.id">{{ k.name }}</option>
            </select>
          </template>
          <template v-else>
            <label>Válaszd ki a szerkesztendő dolgozót:</label>
            <select @change="dolgozoKivalasztva" class="admin-input">
              <option value="">-- Válassz dolgozót --</option>
              <option v-for="d in dolgozok" :key="d.id" :value="d.id">{{ d.full_name }} ({{ d.role }})</option>
            </select>
          </template>
        </div>
      </div>

      <!-- ---------------- KUTYA ŰRLAP ---------------- -->
      <div v-if="aktivTab === 'dogs'" class="card">
        <h3>{{ muveletTipus === 'create' ? 'Új kutya rögzítése' : 'Kutya adatainak frissítése' }}</h3>
        <div class="form-grid">
          <input type="text" v-model="ujKutya.name" placeholder="Kutya neve *" class="admin-input" />
          <input type="text" v-model="ujKutya.breed" placeholder="Fajta" class="admin-input" />
          
          <select v-model="ujKutya.gender" class="admin-input">
            <option value="">-- Nem --</option>
            <option value="F">Kan</option>
            <option value="L">Szuka</option>
          </select>

          <select v-model="ujKutya.size" class="admin-input">
            <option value="">-- Méret --</option>
            <option value="kicsi">Kicsi</option>
            <option value="közepes">Közepes</option>
            <option value="nagy">Nagy</option>
          </select>

          <select v-model="ujKutya.experience_required" class="admin-input">
            <option :value="1">1. szintű tapasztalat</option>
            <option :value="2">2. szintű tapasztalat</option>
            <option :value="3">3. szintű tapasztalat</option>
            <option :value="4">4. szintű tapasztalat</option>
            <option :value="5">5. szintű tapasztalat</option>
          </select>

          <div class="full-width">
            <label class="small-label">Születési idő:</label>
            <input type="date" v-model="ujKutya.birthday" class="admin-input" />
          </div>

          <input type="number" v-model="ujKutya.age_years" placeholder="Vagy életkor (év)" class="admin-input" />

          <div class="full-width">
            <label class="small-label">Bekerülés dátuma:</label>
            <input type="date" v-model="ujKutya.intake_date" class="admin-input" />
          </div>

          <div class="checkbox-container">
            <label>
              <input type="checkbox" v-model="ujKutya.active_flag" /> Aktív menhelyi lakos
            </label>
          </div>

          <!-- Képfeltöltés -->
          <div class="full-width">
            <label class="small-label">Kutya fotója (Fájl feltöltése vagy URL):</label>
            <input type="file" @change="kepFeltoltes" class="admin-input" />
            <input type="textv" v-model="ujKutya.image_url" placeholder="Vagy illeszd be a kép URL-jét..." class="admin-input mt-2" />
          </div>

          <textarea v-model="ujKutya.walking_restrictions" placeholder="Séta korlátozások (pl. biciklinek támad)..." class="admin-textarea"></textarea>
          <textarea v-model="ujKutya.special_notes" placeholder="Speciális megjegyzések..." class="admin-textarea"></textarea>
        </div>

        <button class="save-btn" @click="mentoFuggveny">
          {{ muveletTipus === 'create' ? 'Kutya mentése' : 'Módosítások mentése' }}
        </button>
      </div>

      <!-- ---------------- DOLGOZÓ ŰRLAP ---------------- -->
      <div v-if="aktivTab === 'workers'" class="card">
        <h3>{{ muveletTipus === 'create' ? 'Új dolgozó rögzítése' : 'Dolgozó adatainak frissítése' }}</h3>
        <div class="form-grid">
          <input type="text" v-model="ujDolgozo.full_name" placeholder="Teljes név *" class="admin-input" />
          <input type="text" v-model="ujDolgozo.role" placeholder="Pozíció / Munkakör (pl. Gondozó)" class="admin-input" />
          <input type="text" v-model="ujDolgozo.phone" placeholder="Telefonszám" class="admin-input" />
          <input type="email" v-model="ujDolgozo.email" placeholder="E-mail cím" class="admin-input" />

          <div class="checkbox-container full-width">
            <label>
              <input type="checkbox" v-model="ujDolgozo.active_flag" /> Aktív dolgozó
            </label>
          </div>
        </div>

        <button class="save-btn" @click="mentoFuggveny">
          {{ muveletTipus === 'create' ? 'Dolgozó mentése' : 'Módosítások mentése' }}
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.admin-bg {
  background-color: #ede8d6;
  min-height: 100vh;
  padding: 15px;
  box-sizing: border-box;
}

.top-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #957a64;
  color: #ede8d6;
  padding: 12px 15px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.back-link {
  color: #ede8d6;
  text-decoration: underline;
  font-weight: bold;
  font-size: 14px;
}

.admin-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-width: 600px;
  margin: 0 auto;
}

.tab-selector {
  display: flex;
  gap: 10px;
}

.tab-btn {
  flex: 1;
  padding: 10px 8px;
  background-color: #d6ccb5;
  border: 2px solid #957a64;
  border-radius: 10px;
  font-weight: bold;
  cursor: pointer;
  color: #555;
  font-size: 13px;
  text-align: center;
}

.tab-btn.active {
  background-color: #957a64;
  color: #ede8d6;
}

.card {
  background-color: white;
  border: 2px solid #957a64;
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  box-sizing: border-box;
  width: 100%;
}

.sub-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-selector {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-weight: bold;
  color: #444;
  font-size: 14px;
}

.select-target {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 10px;
}

/* Mobilon szigorúan 1 oszlopos, minden elem teljes szélességű */
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 15px;
  margin-bottom: 15px;
  width: 100%;
  box-sizing: border-box;
}

.admin-input, .admin-textarea {
  padding: 10px;
  border: 1px solid #957a64;
  border-radius: 8px;
  background-color: #faf8f5;
  outline: none;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  font-size: 14px;
}

.admin-textarea {
  height: 70px;
  resize: none;
}

.small-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 3px;
  display: block;
}

.full-width {
  width: 100%;
  box-sizing: border-box;
}

.mt-2 {
  margin-top: 8px;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  font-size: 14px;
  width: 100%;
}

.save-btn {
  background-color: #957a64;
  color: #ede8d6;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  width: 100%;
  font-size: 16px;
  box-sizing: border-box;
}

.save-btn:hover {
  background-color: #7a624f;
}
</style>