<script setup>
import SharedHeader from '../components/SharedHeader.vue'
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
  image_url: '',
  kennel: '',
  is_walkable: true,
  non_walkable_reason: ''
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
const kepFeltoltesFolyamatban = ref(false)
const kepHiba = ref('')
const kepSiker = ref('')
const kepInputKey = ref(0)

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
  kepHiba.value = ''
  kepSiker.value = ''
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
// A kiválasztott képet egyedi fájlnévvel töltjük fel (nincs gyorsítótárazott régi kép).
// Meglévő kutya esetén a képhivatkozást azonnal elmentjük a kutya rekordjához is.
async function kepFeltoltes(event) {
  const file = event.target.files?.[0]
  if (!file) return
  kepHiba.value = ''
  kepSiker.value = ''
  if (!file.type.startsWith('image/')) {
    kepHiba.value = 'Csak képfájlt válassz (JPG, PNG, WEBP).'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    kepHiba.value = 'A kép legfeljebb 5 MB lehet.'
    return
  }
  kepFeltoltesFolyamatban.value = true
  try {
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif']
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!allowed.includes(ext)) throw new Error('Nem támogatott képformátum. JPG, PNG vagy WEBP ajánlott.')
    const unique = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const path = `dog-images/${unique}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('dog-photos').upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) throw new Error('A fájl feltöltése sikertelen: ' + uploadError.message)
    const { data } = supabase.storage.from('dog-photos').getPublicUrl(path)
    if (!data?.publicUrl) throw new Error('Nem sikerült lekérni a kép nyilvános címét.')
    const newUrl = data.publicUrl

    if (muveletTipus.value === 'update') {
      if (!kivalasztottKutyaId.value) {
        throw new Error('A kép cseréje előtt válassz ki egy meglévő kutyát!')
      }
      // A PostgREST .single() egyetlen visszaadott sor nélkül PGRST116 hibát ad.
      // Tömböt kérünk vissza, és külön ellenőrizzük, valóban frissült-e a rekord.
      const { data: updatedRows, error: saveError } = await supabase.from('dogs')
        .update({ image_url: newUrl })
        .eq('id', kivalasztottKutyaId.value)
        .select('id, image_url')
      if (saveError) throw new Error('A kép feltöltődött, de az adatbázis-frissítés hibázott: ' + saveError.message)
      if (!Array.isArray(updatedRows) || updatedRows.length !== 1) {
        throw new Error('A kép feltöltődött a tárhelyre, de a kutya rekordjának módosítása nem igazolható. Lehetséges, hogy a dogs tábla UPDATE/SELECT RLS-jogosultsága hiányzik, vagy a kutyaazonosító nem egyezik. A képhivatkozást nem állítottam be sikeresként.')
      }
      kutyak.value = kutyak.value.map(k => String(k.id) === String(kivalasztottKutyaId.value) ? { ...k, image_url: newUrl } : k)
      kepSiker.value = 'A kép feltöltve és a kiválasztott kutyához mentve. A többi adat módosításához használd a Mentés gombot.'
    } else {
      kepSiker.value = 'A kép feltöltve. Új kutyánál a Kutya mentése gombbal rögzítsd az adatlapot is.'
    }
    ujKutya.value.image_url = newUrl
  } catch (error) {
    kepHiba.value = error?.message || String(error)
  } finally {
    kepFeltoltesFolyamatban.value = false
    kepInputKey.value += 1 // Ugyanaz a fájl is újra kiválasztható
  }
}

function kutyaMentendoAdatok() {
  const { name, gender, experience_required, birthday, age_years, walking_restrictions, special_notes,
    breed, size, active_flag, intake_date, image_url, kennel, is_walkable, non_walkable_reason } = ujKutya.value
  return { name: name?.trim(), gender: gender || null, experience_required: Number(experience_required) || 1,
    birthday: birthday || null, age_years: age_years === '' ? null : age_years,
    walking_restrictions, special_notes, breed, size, active_flag, intake_date: intake_date || null,
    image_url: image_url || null, kennel: kennel || null, is_walkable,
    non_walkable_reason: is_walkable ? null : non_walkable_reason }
}
function dolgozoMentendoAdatok() {
  const { full_name, role, active_flag, phone, email } = ujDolgozo.value
  return { full_name: full_name?.trim(), role, active_flag, phone, email }
}
// Mentés (Insert vagy Update)
async function mentoFuggveny() {
  if (kepFeltoltesFolyamatban.value) return alert('Várd meg a kép feltöltésének végét!')
  if (aktivTab.value === 'dogs') {
    if (!ujKutya.value.name) {
      alert('A kutya neve kötelező!')
      return
    }

    if (muveletTipus.value === 'create') {
      const { error } = await supabase.from('dogs').insert([kutyaMentendoAdatok()])
      if (error) alert('Hiba: ' + error.message)
      else { alert('Kutya sikeresen feltöltve!'); alaphelyzet(); }
    } else {
      const { data: savedRows, error } = await supabase.from('dogs')
        .update({ ...kutyaMentendoAdatok(), updated_at: new Date().toISOString() })
        .eq('id', kivalasztottKutyaId.value)
        .select('id')
      if (error) alert('Hiba a kutya adatainak mentésekor: ' + error.message)
      else if (!savedRows?.length) {
        alert('Nem sikerült igazolni a kutya adatainak frissítését. Ellenőrizd a dogs tábla UPDATE/SELECT RLS-szabályait és a kutya azonosítóját.')
      } else { alert('Kutya adatai frissítve!'); alaphelyzet(); }
    }
  } else {
    // Dolgozók mentése
    if (!ujDolgozo.value.full_name) {
      alert('A dolgozó neve kötelező!')
      return
    }

    if (muveletTipus.value === 'create') {
      const { error } = await supabase.from('workers').insert([dolgozoMentendoAdatok()])
      if (error) alert('Hiba: ' + error.message)
      else { alert('Dolgozó sikeresen feltöltve!'); alaphelyzet(); }
    } else {
      const { error } = await supabase.from('workers').update({ ...dolgozoMentendoAdatok(), updated_at: new Date().toISOString() }).eq('id', kivalasztottDolgozoId.value)
      if (error) alert('Hiba: ' + error.message)
      else { alert('Dolgozó adatai frissítve!'); alaphelyzet(); }
    }
  }
  adatokLekerese()
}

function alaphelyzet() {
  kepHiba.value = ''
  kepSiker.value = ''
  kepInputKey.value += 1
  kivalasztottKutyaId.value = null
  kivalasztottDolgozoId.value = null
  ujKutya.value = { name: '', gender: '', experience_required: 1, birthday: '', age_years: null, walking_restrictions: '', special_notes: '', breed: '', size: '', active_flag: true, intake_date: '', image_url: '', kennel: '', is_walkable: true, non_walkable_reason: '' }
  ujDolgozo.value = { full_name: '', role: '', active_flag: true, phone: '', email: '' }
}
</script>

<template>
  <div class="admin-bg">
    <SharedHeader title="Adminisztráció" />

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
            <input type="radio" value="update" v-model="muveletTipus" /> Meglévő adat módosítása
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

          <label class="small-label">Kennel száma vagy azonosítója:
            <input type="text" v-model.trim="ujKutya.kennel" placeholder="Pl. 12 vagy B/3" class="admin-input" />
          </label>
          <div class="checkbox-container">
            <label><input type="checkbox" v-model="ujKutya.is_walkable" /> Jelenleg sétáltatható</label>
          </div>
          <textarea v-if="!ujKutya.is_walkable" v-model="ujKutya.non_walkable_reason" placeholder="Miért nem sétáltatható?" class="admin-textarea"></textarea>

          <!-- Születési idő -->
          <div class="date-field">
            <label class="small-label">Születési idő:</label>
            <input type="date" v-model="ujKutya.birthday" class="admin-input" />
          </div>

          <!-- Életkor mező -->
          <input type="number" v-model="ujKutya.age_years" placeholder="Vagy életkor (év)" class="admin-input" />

          <!-- Bekerülés dátuma -->
          <div class="date-field">
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
            <input :key="kepInputKey" type="file" accept="image/jpeg,image/png,image/webp,image/gif" :disabled="kepFeltoltesFolyamatban || (muveletTipus === 'update' && !kivalasztottKutyaId)" @change="kepFeltoltes" class="admin-input" />
            <p v-if="kepFeltoltesFolyamatban" class="photo-status" role="status">Kép feltöltése folyamatban…</p>
            <p v-if="kepHiba" class="photo-error" role="alert">{{ kepHiba }}</p>
            <p v-if="kepSiker" class="photo-success" role="status">{{ kepSiker }}</p>
            <input type="url" v-model="ujKutya.image_url" placeholder="Vagy illeszd be a kép URL-jét..." class="admin-input mt-2" />
            <div v-if="ujKutya.image_url" class="photo-preview">
              <img :key="ujKutya.image_url" :src="ujKutya.image_url" alt="A kiválasztott kutya fényképének előnézete" />
              <small>Jelenlegi kép előnézete</small>
            </div>
            <p class="photo-hint">Meglévő kutyánál a feltöltött kép azonnal mentésre kerül. Új kutyánál az adatlapot külön mentsd el.</p>
          </div>

          <textarea v-model="ujKutya.walking_restrictions" placeholder="Séta korlátozások (pl. biciklinek támad)..." class="admin-textarea"></textarea>
          <textarea v-model="ujKutya.special_notes" placeholder="Speciális megjegyzések..." class="admin-textarea"></textarea>
        </div>

        <button class="save-btn" :disabled="kepFeltoltesFolyamatban" @click="mentoFuggveny">
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

        <button class="save-btn" :disabled="kepFeltoltesFolyamatban" @click="mentoFuggveny">
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
  padding: 20px 12px;
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
  min-width: 0;
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
  min-width: 0;
  box-sizing: border-box;
  font-size: 14px;
}

.admin-textarea {
  height: 70px;
  resize: none;
}

/* iOS Safari: a natív dátumbeviteli mező nagyobb minimális szélességet
   kaphat, mint a szülő űrlap. A flex-elemnek és az inputnak is engedjük
   a zsugorodást, és a teljes elérhető szélességhez igazítjuk őket. */
.date-field {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.date-field input[type="date"] {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-inline-size: 0;
  box-sizing: border-box;
  font-size: 16px;
}
@media (max-width: 600px) {
  .admin-container, .card, .form-grid, .date-field { min-width: 0; max-width: 100%; }
  .admin-input, .admin-textarea { min-width: 0; }
}

.small-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 3px;
  display: block;
}

.full-width {
  min-width: 0;
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
<style scoped>
.photo-preview { display:flex; flex-direction:column; align-items:flex-start; gap:5px; margin-top:12px; }
.photo-preview img { width:min(220px,100%); max-height:180px; object-fit:cover; border-radius:10px; border:1px solid #cdbba7; }
.photo-status,.photo-hint {font-size:13px;color:#6d5747;}
.photo-error {font-size:13px;color:#a52828;background:#ffebeb;padding:9px;border-radius:8px;}
.photo-success {font-size:13px;color:#216039;background:#eaf6ec;padding:9px;border-radius:8px;}
.save-btn:disabled {opacity:.5;cursor:wait;}
</style>
