<script setup>
import SharedHeader from '../components/SharedHeader.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../supabase'
import { useRouter } from 'vue-router'

const router = useRouter()
const isMainMenuOpen = ref(false)
const isProfileMenuOpen = ref(false)
const activeTab = ref('walkable')
const keresettNev = ref('')
const valasztottSzint = ref('')
const valasztottMeret = ref('')
const kutyak = ref([])
const aktivSetak = ref([])
const hetiSetak = ref([])
const betoltes = ref(false)
const mentFolyamatban = ref(false)
const hiba = ref('')

const showModal = ref(false)
const KivalasztottKutya = ref(null)
const onkentesNev = ref('')
const onkentesSzint = ref('')
const kenneltarsValasztas = ref([])
const nyitottKenneltarsAdatlapok = ref([])
const eredetiKutyaAdatlapNyitva = ref(false)
const showCloseModal = ref(false)
const kivalasztottSetaCsoport = ref(null)
const walkNoteText = ref('')

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
function getStartOfWeekISO(now = new Date()) {
  const date = new Date(now)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}
function kennelErtek(kutya) {
  const value = kutya?.kennel
  return value === null || value === undefined || String(value).trim() === '' ? '' : String(value).trim()
}
function kennelFelirat(kutya) {
  return kennelErtek(kutya) ? `${kennelErtek(kutya)}. kennel` : 'Kennel nincs megadva'
}
function aktivKutya(kutyaId) {
  return aktivSetak.value.some(seta => String(seta.dog_id) === String(kutyaId))
}
const setaltathatoKutyak = computed(() => kutyak.value.filter(k => k.is_walkable !== false && k.active_flag !== false))
const nemSetaltathatoKutyak = computed(() => kutyak.value.filter(k => k.is_walkable === false))
const hetenSetaltKutyaIdk = computed(() => new Set(hetiSetak.value.map(s => String(s.dog_id))))
const hetenMarSetaltKutyak = computed(() => setaltathatoKutyak.value.filter(k => hetenSetaltKutyaIdk.value.has(String(k.id))))
const hetenMegNemSetaltKutyak = computed(() => setaltathatoKutyak.value.filter(k => !hetenSetaltKutyaIdk.value.has(String(k.id))))
const vanSzures = computed(() => Boolean(keresettNev.value.trim() || valasztottSzint.value || valasztottMeret.value))
function egyezikSzures(kutya) {
  return (!keresettNev.value || String(kutya.name || '').toLocaleLowerCase('hu-HU').includes(keresettNev.value.trim().toLocaleLowerCase('hu-HU')))
    && (!valasztottSzint.value || String(kutya.experience_required) === String(valasztottSzint.value))
    && (!valasztottMeret.value || String(kutya.size || '').toLocaleLowerCase('hu-HU') === valasztottMeret.value)
}
const szurtKutyak = computed(() => setaltathatoKutyak.value.filter(egyezikSzures))
const kijeloltKenneltarsak = computed(() => {
  if (!KivalasztottKutya.value || !kennelErtek(KivalasztottKutya.value)) return []
  return kutyak.value.filter(k => String(k.id) !== String(KivalasztottKutya.value.id)
    && kennelErtek(k) === kennelErtek(KivalasztottKutya.value))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'hu'))
})
const indithatoKenneltarsak = computed(() => kijeloltKenneltarsak.value.filter(k => k.is_walkable !== false && k.active_flag !== false && !aktivKutya(k.id)))
const kijeloltKutyak = computed(() => {
  if (!KivalasztottKutya.value) return []
  return [KivalasztottKutya.value, ...indithatoKenneltarsak.value.filter(k => kenneltarsValasztas.value.includes(String(k.id)))]
})
const maximalisKovetelmeny = computed(() => Math.max(1, ...kijeloltKutyak.value.map(k => Number(k.experience_required) || 1)))
const aktivCsoportok = computed(() => {
  const groups = new Map()
  for (const seta of aktivSetak.value) {
    const key = seta.walk_group_id || `single:${seta.id}`
    if (!groups.has(key)) groups.set(key, { key, walk_group_id: seta.walk_group_id, walks: [], start_time: seta.start_time })
    groups.get(key).walks.push(seta)
  }
  return Array.from(groups.values()).sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
})

async function adatokLekerese() {
  betoltes.value = true
  hiba.value = ''
  try {
    const [dogsResult, weeklyResult] = await Promise.all([
      supabase.from('dogs').select('*').order('name'),
      supabase.from('walks').select('dog_id, start_time, end_time')
        .gte('start_time', getStartOfWeekISO()).not('end_time', 'is', null)
    ])
    if (dogsResult.error) throw dogsResult.error
    // A kutyalistát akkor is mutassuk, ha a séták lekérdezése hibázik.
    kutyak.value = dogsResult.data || []
    if (weeklyResult.error) {
      hetiSetak.value = []
      hiba.value = 'A heti séták lekérdezése nem sikerült: ' + weeklyResult.error.message
    } else {
      hetiSetak.value = weeklyResult.data || []
    }
    const fullFields = 'id, dog_id, volunteer_id, start_time, end_time, walk_group_id, dogs(name), volunteers(full_name)'
    const legacyFields = 'id, dog_id, volunteer_id, start_time, end_time, dogs(name), volunteers(full_name)'
    let activeResult = await supabase.from('walks').select(fullFields)
      .is('end_time', null).order('start_time', { ascending: false })
    if (activeResult.error && /walk_group_id/i.test(activeResult.error.message)) {
      activeResult = await supabase.from('walks').select(legacyFields)
        .is('end_time', null).order('start_time', { ascending: false })
      if (!activeResult.error) {
        hiba.value = [hiba.value, 'A közös sétákhoz futtasd a mellékelt Supabase SQL-migrációt.'].filter(Boolean).join(' | ')
      }
    }
    if (activeResult.error) {
      aktivSetak.value = []
      hiba.value = [hiba.value, 'Az aktív séták lekérdezése nem sikerült: ' + activeResult.error.message].filter(Boolean).join(' | ')
    } else {
      aktivSetak.value = (activeResult.data || []).map(row => ({ ...row, walk_group_id: row.walk_group_id ?? null }))
    }
  } catch (error) {
    hiba.value = error.message
  } finally {
    betoltes.value = false
  }
}
function setaInditasModal(kutya) {
  if (aktivKutya(kutya.id)) return
  KivalasztottKutya.value = kutya
  kenneltarsValasztas.value = []
  nyitottKenneltarsAdatlapok.value = []
  eredetiKutyaAdatlapNyitva.value = false
  onkentesNev.value = ''
  onkentesSzint.value = ''
  showModal.value = true
}
function toggleKenneltarsAdatlap(kutyaId) {
  const id = String(kutyaId)
  if (nyitottKenneltarsAdatlapok.value.includes(id)) {
    nyitottKenneltarsAdatlapok.value = nyitottKenneltarsAdatlapok.value.filter(item => item !== id)
  } else {
    nyitottKenneltarsAdatlapok.value = [...nyitottKenneltarsAdatlapok.value, id]
  }
}
function kenneltarsAdatlapNyitva(kutyaId) {
  return nyitottKenneltarsAdatlapok.value.includes(String(kutyaId))
}
function kenneltarsValaszthato(kutya) {
  return kutya.is_walkable !== false && kutya.active_flag !== false && !aktivKutya(kutya.id)
}
function nemValaszthatoOka(kutya) {
  if (kutya.is_walkable === false) return 'Jelenleg nem sétáltatható'
  if (kutya.active_flag === false) return 'Nem aktív menhelyi lakos'
  if (aktivKutya(kutya.id)) return 'Már folyamatban lévő sétán van'
  return ''
}
function toggleOsszesKenneltars(checked) {
  kenneltarsValasztas.value = checked ? indithatoKenneltarsak.value.map(k => String(k.id)) : []
}
async function setaMentese() {
  if (mentFolyamatban.value || !KivalasztottKutya.value) return
  const nev = onkentesNev.value.trim()
  if (!nev) return alert('Kérlek, add meg az önkéntes nevét!')
  if (aktivKutya(KivalasztottKutya.value.id)) return alert('Ez a kutya már aktív sétán van. Frissítsd a listát!')
  const dogsToStart = kijeloltKutyak.value
  if (dogsToStart.some(k => k.is_walkable === false || k.active_flag === false || aktivKutya(k.id))) {
    return alert('Az egyik kiválasztott kutya nem sétáltatható, vagy már aktív sétán van.')
  }
  mentFolyamatban.value = true
  try {
    // Újra ellenőrizzük az aktív sétákat a mentés előtt.
    const ids = dogsToStart.map(k => k.id)
    const { data: activeRows, error: activeError } = await supabase.from('walks')
      .select('dog_id').in('dog_id', ids).is('end_time', null)
    if (activeError) throw activeError
    if (activeRows?.length) throw new Error('Legalább egy kiválasztott kutya időközben már sétára indult.')

    const { data: volunteerRows, error: volunteerError } = await supabase.from('volunteers')
      .select('id, experience_level').eq('full_name', nev).limit(2)
    if (volunteerError) throw volunteerError
    if ((volunteerRows || []).length > 1) throw new Error('Több önkéntes szerepel ezzel a névvel. Az azonosítást pontosítani kell.')
    let volunteerId = volunteerRows?.[0]?.id
    let level = volunteerRows?.[0]?.experience_level
    if (!volunteerId) {
      if (!onkentesSzint.value) throw new Error('Új önkéntesnél add meg a valódi tapasztalati szintet!')
      level = Number(onkentesSzint.value)
      if (level < maximalisKovetelmeny.value) {
        throw new Error(`A kijelölt kutyákhoz legalább ${maximalisKovetelmeny.value}. szint szükséges.`)
      }
      const { data: created, error: createError } = await supabase.from('volunteers')
        .insert([{ full_name: nev, experience_level: level }]).select('id').single()
      if (createError) throw createError
      volunteerId = created.id
    }
    if (level === null || level === undefined || Number(level) < maximalisKovetelmeny.value) {
      throw new Error(`A kijelölt kutyákhoz legalább ${maximalisKovetelmeny.value}. szint szükséges. Ellenőrizd az önkéntes besorolását!`)
    }
    const groupId = crypto.randomUUID()
    const startTime = new Date().toISOString()
    const { error: walkError } = await supabase.from('walks').insert(
      dogsToStart.map(k => ({ dog_id: k.id, volunteer_id: volunteerId, start_time: startTime, walk_group_id: groupId }))
    )
    if (walkError) {
      if (/walk_group_id/i.test(walkError.message)) {
        throw new Error('Hiányzik a walk_group_id adatbázisoszlop. Futtasd a mellékelt SQL-migrációt a Supabase SQL Editorban, majd próbáld újra.')
      }
      throw walkError
    }
    showModal.value = false
    KivalasztottKutya.value = null
    kenneltarsValasztas.value = []
    alert(dogsToStart.length > 1 ? `${dogsToStart.length} kutya közös sétája elindult.` : 'A séta elindult.')
    await adatokLekerese()
  } catch (error) {
    alert('Nem sikerült elindítani a sétát: ' + error.message)
  } finally {
    mentFolyamatban.value = false
  }
}
function setaLezarasModal(csoport) {
  kivalasztottSetaCsoport.value = csoport
  walkNoteText.value = ''
  showCloseModal.value = true
}
async function setaLezarasaMegerosites() {
  if (!kivalasztottSetaCsoport.value || mentFolyamatban.value) return
  mentFolyamatban.value = true
  try {
    const group = kivalasztottSetaCsoport.value
    const endTime = new Date().toISOString()
    const query = supabase.from('walks').update({ end_time: endTime })
    const { error: updateError } = group.walk_group_id
      ? await query.eq('walk_group_id', group.walk_group_id).is('end_time', null)
      : await query.eq('id', group.walks[0].id).is('end_time', null)
    if (updateError) throw updateError
    let warning = ''
    if (walkNoteText.value.trim()) {
      // A séma szerint a szöveges jegyzet oszlopa: description (nem note).
      const { error: noteError } = await supabase.from('walk_notes').insert([{
        walk_id: group.walks[0].id,
        description: walkNoteText.value.trim()
      }])
      if (noteError) warning = ` A megjegyzés mentése nem sikerült: ${noteError.message}`
    }
    showCloseModal.value = false
    kivalasztottSetaCsoport.value = null
    alert('A séta lezárult.' + warning)
    await adatokLekerese()
  } catch (error) {
    alert('Nem sikerült lezárni a sétát: ' + error.message)
  } finally {
    mentFolyamatban.value = false
  }
}
function getAgeDisplay(dog) {
  if (dog?.birthday) return `Születési idő: ${dog.birthday}`
  if (dog?.age_years) return `Kor: ${dog.age_years} év`
  return 'Nincs megadva kor'
}
function getKutyaHetiStatus(kutya) {
  if (aktivKutya(kutya.id)) return '🚶 Éppen sétán'
  return hetenSetaltKutyaIdk.value.has(String(kutya.id)) ? '✅ Ezen a héten már sétált' : '⏳ Ezen a héten még nem sétált'
}
async function handleLogout() {
  await supabase.auth.signOut()
  router.push('/')
}
onMounted(() => {
  adatokLekerese()
  window.addEventListener('click', handleClickOutside)
})
onUnmounted(() => window.removeEventListener('click', handleClickOutside))
</script>
<template>
  <div class="page-bg">
    <SharedHeader title="Séta rögzítése" />
    <div class="mobile-frame">
      <main class="content-container">
        <div v-if="hiba" class="status-error">Adatlekérdezési hiba: {{ hiba }} <button @click="adatokLekerese">Újra</button></div>
        <div v-if="betoltes" class="status-info">Adatok betöltése…</div>
        <div class="tab-buttons">
          <button class="tab-btn" :class="{ active: activeTab === 'walkable' }" @click="activeTab = 'walkable'">🐾 Sétáltatható kutyák</button>
          <button class="tab-btn" :class="{ active: activeTab === 'non_walkable' }" @click="activeTab = 'non_walkable'">🚫 Nem sétáltatható ({{ nemSetaltathatoKutyak.length }})</button>
        </div>
        <template v-if="activeTab === 'walkable'">
          <div v-if="aktivCsoportok.length" class="section-box active-walks-box">
            <h4 class="cat-title active-title">🚶 Folyamatban lévő séták</h4>
            <ul class="dog-list">
              <li v-for="csoport in aktivCsoportok" :key="csoport.key" class="dog-item">
                <span><strong>{{ csoport.walks.map(w => w.dogs?.name || 'Ismeretlen').join(', ') }}</strong>
                  <small class="dog-secondary">Önkéntes: {{ csoport.walks[0]?.volunteers?.full_name || 'Ismeretlen' }} · {{ csoport.walks.length }} kutya</small>
                </span>
                <button class="action-btn stop-btn" @click="setaLezarasModal(csoport)">Lezárás</button>
              </li>
            </ul>
          </div>
          <div class="filters-box">
            <h3>Kutyák keresése és szűrése</h3>
            <div class="filter-inputs">
              <input v-model="keresettNev" type="search" placeholder="Kutya neve…" class="filter-input" />
              <select v-model="valasztottSzint" class="filter-input">
                <option value="">Minden tapasztalati szint</option>
                <option v-for="level in [1, 2, 3, 4, 5]" :key="level" :value="String(level)">{{ level }}. szint</option>
              </select>
              <select v-model="valasztottMeret" class="filter-input">
                <option value="">Minden méret</option>
                <option value="kicsi">Kicsi</option>
                <option value="közepes">Közepes</option>
                <option value="nagy">Nagy</option>
              </select>
            </div>
          </div>
          <div v-if="vanSzures" class="section-box">
            <h4>Keresési találatok ({{ szurtKutyak.length }})</h4>
            <p v-if="!szurtKutyak.length" class="empty-text">Nincs a feltételeknek megfelelő kutya.</p>
            <ul v-else class="dog-list">
              <li v-for="kutya in szurtKutyak" :key="kutya.id" class="dog-item highlight-item">
                <span><strong>{{ kutya.name }}</strong> · {{ kennelFelirat(kutya) }} · {{ kutya.size || 'ismeretlen méret' }} · {{ kutya.experience_required }}. szint
                  <small class="dog-secondary">{{ getKutyaHetiStatus(kutya) }}</small>
                </span>
                <button class="action-btn" :disabled="aktivKutya(kutya.id)" @click="setaInditasModal(kutya)">Indítás</button>
              </li>
            </ul>
          </div>
          <div class="category-box">
            <h4 class="cat-title waiting">🐾 A héten még nem sétált kutyák ({{ hetenMegNemSetaltKutyak.length }})</h4>
            <p v-if="!hetenMegNemSetaltKutyak.length" class="empty-text">Minden sétáltatható kutyának van lezárt sétája ezen a héten.</p>
            <ul v-else class="dog-list">
              <li v-for="kutya in hetenMegNemSetaltKutyak" :key="kutya.id" class="dog-item">
                <span><strong>{{ kutya.name }}</strong> · {{ kennelFelirat(kutya) }} · {{ kutya.size || 'ismeretlen méret' }} · {{ kutya.experience_required }}. szint
                  <small v-if="aktivKutya(kutya.id)" class="dog-secondary">🚶 Éppen sétán</small>
                </span>
                <button class="action-btn" :disabled="aktivKutya(kutya.id)" @click="setaInditasModal(kutya)">Indítás</button>
              </li>
            </ul>
          </div>
          <div v-if="hetenMarSetaltKutyak.length" class="section-box">
            <h4>✅ A héten már sétált kutyák ({{ hetenMarSetaltKutyak.length }})</h4>
            <ul class="dog-list">
              <li v-for="kutya in hetenMarSetaltKutyak" :key="kutya.id" class="dog-item">
                <span><strong>{{ kutya.name }}</strong> · {{ kennelFelirat(kutya) }} <small class="dog-secondary">{{ getKutyaHetiStatus(kutya) }}</small></span>
                <button class="action-btn" :disabled="aktivKutya(kutya.id)" @click="setaInditasModal(kutya)">Indítás</button>
              </li>
            </ul>
          </div>
        </template>
        <template v-else>
          <div class="category-box">
            <h4 class="cat-title waiting">🚫 Nem sétáltatható kutyák</h4>
            <ul class="dog-list">
              <li v-for="kutya in nemSetaltathatoKutyak" :key="kutya.id" class="dog-item">
                <span><strong>{{ kutya.name }}</strong> · {{ kennelFelirat(kutya) }}
                  <small class="dog-secondary">Indok: {{ kutya.non_walkable_reason || 'Nincs megadva' }}</small>
                </span>
              </li>
            </ul>
          </div>
        </template>
      </main>
    </div>

    <div v-if="showModal" class="modal-overlay" role="dialog" aria-modal="true" aria-label="Séta indítása">
      <div class="modal-content enlarged-modal">
        <h3>Séta indítása: {{ KivalasztottKutya?.name }}</h3>
        <div v-if="KivalasztottKutya" class="dog-info-card primary-dog-card">
          <div class="mate-card-header">
            <div class="mate-summary">
              <strong>{{ KivalasztottKutya.name }}</strong>
              <small>{{ kennelFelirat(KivalasztottKutya) }} · {{ KivalasztottKutya.size || 'Ismeretlen méret' }} · {{ KivalasztottKutya.experience_required || 1 }}. tapasztalati szint</small>
              <small>{{ getKutyaHetiStatus(KivalasztottKutya) }}</small>
            </div>
            <button type="button" class="mate-details-button" :aria-expanded="eredetiKutyaAdatlapNyitva"
              @click="eredetiKutyaAdatlapNyitva = !eredetiKutyaAdatlapNyitva">
              {{ eredetiKutyaAdatlapNyitva ? 'Bezár ▲' : 'Adatok ▼' }}
            </button>
          </div>
          <div v-if="KivalasztottKutya.walking_restrictions" class="mate-quick-warning"><strong>⚠️ Korlátozás:</strong> {{ KivalasztottKutya.walking_restrictions }}</div>
          <div v-if="eredetiKutyaAdatlapNyitva" class="mate-details">
            <p><strong>Nem:</strong> {{ KivalasztottKutya.gender || 'Nincs megadva' }} · {{ getAgeDisplay(KivalasztottKutya) }}</p>
            <p><strong>Méret:</strong> {{ KivalasztottKutya.size || 'Nincs megadva' }}</p>
            <p><strong>Szükséges tapasztalati szint:</strong> {{ KivalasztottKutya.experience_required || 1 }}</p>
            <div v-if="KivalasztottKutya.special_notes" class="notes-box"><strong>Megjegyzés:</strong> {{ KivalasztottKutya.special_notes }}</div>
            <p v-if="!KivalasztottKutya.special_notes && !KivalasztottKutya.walking_restrictions" class="small-hint">Nincs további korlátozás vagy megjegyzés rögzítve.</p>
          </div>
        </div>
        <div v-if="kijeloltKenneltarsak.length" class="mates-box">
          <h4>🐕 Ugyanebben a kennelben élnek</h4>
          <p>Jelöld ki a közös sétához a megfelelő kutyákat. A korlátozások mindig látszanak; az „Adatok” gombbal a részletes adatlap is megnyitható.</p>
          <div v-for="kutya in kijeloltKenneltarsak" :key="kutya.id" class="mate-card" :class="{ 'mate-card-disabled': !kenneltarsValaszthato(kutya) }">
            <div class="mate-card-header">
              <label class="mate-select">
                <input v-model="kenneltarsValasztas" type="checkbox" :value="String(kutya.id)"
                  :disabled="!kenneltarsValaszthato(kutya)" :aria-label="`${kutya.name} közös sétára kijelölése`" />
                <span class="mate-summary">
                  <strong>{{ kutya.name }}</strong>
                  <small>{{ kutya.size || 'Ismeretlen méret' }} · {{ kutya.experience_required || 1 }}. tapasztalati szint</small>
                  <small :class="{ 'mate-status-warning': !kenneltarsValaszthato(kutya) }">{{ nemValaszthatoOka(kutya) || getKutyaHetiStatus(kutya) }}</small>
                </span>
              </label>
              <button type="button" class="mate-details-button"
                :aria-expanded="kenneltarsAdatlapNyitva(kutya.id)" @click="toggleKenneltarsAdatlap(kutya.id)">
                {{ kenneltarsAdatlapNyitva(kutya.id) ? 'Bezár ▲' : 'Adatok ▼' }}
              </button>
            </div>
            <div v-if="kutya.walking_restrictions" class="mate-quick-warning">
              <strong>⚠️ Korlátozás:</strong> {{ kutya.walking_restrictions }}
            </div>
            <div v-if="kenneltarsAdatlapNyitva(kutya.id)" class="mate-details">
              <p><strong>Kennel:</strong> {{ kennelFelirat(kutya) }}</p>
              <p><strong>Nem:</strong> {{ kutya.gender || 'Nincs megadva' }} · {{ getAgeDisplay(kutya) }}</p>
              <p><strong>Méret:</strong> {{ kutya.size || 'Nincs megadva' }}</p>
              <p><strong>Szükséges tapasztalati szint:</strong> {{ kutya.experience_required || 1 }}</p>
              <p v-if="kutya.non_walkable_reason"><strong>Nem sétáltathatóság oka:</strong> {{ kutya.non_walkable_reason }}</p>
              <div v-if="kutya.special_notes" class="notes-box"><strong>Megjegyzés:</strong> {{ kutya.special_notes }}</div>
              <p v-if="!kutya.special_notes && !kutya.walking_restrictions" class="small-hint">Nincs további korlátozás vagy megjegyzés rögzítve.</p>
            </div>
          </div>
          <div class="mate-actions"><button type="button" @click="toggleOsszesKenneltars(true)">Összes lehetséges kijelölése</button> <button type="button" @click="toggleOsszesKenneltars(false)">Kijelölés törlése</button></div>
        </div>
        <p v-else class="small-hint">Nincs további regisztrált kenneltárs, vagy a kennel nincs megadva.</p>
        <div class="selected-summary" aria-live="polite">
          <strong>Indítás előtti összefoglaló</strong>
          <p><strong>Kiválasztott kutyák ({{ kijeloltKutyak.length }}):</strong> {{ kijeloltKutyak.map(k => k.name).join(', ') }}</p>
          <p><strong>Az önkéntestől elvárt legmagasabb tapasztalati szint:</strong> {{ maximalisKovetelmeny }}.</p>
          <p v-if="kijeloltKutyak.some(k => k.walking_restrictions)" class="summary-warning">⚠️ A kijelölt kutyák között korlátozással rendelkező is van. Indítás előtt ellenőrizd a fenti figyelmeztetéseket.</p>
        </div>
        <label class="form-label">Önkéntes neve
          <input v-model="onkentesNev" class="modal-input" type="text" placeholder="Teljes név" />
        </label>
        <label class="form-label">Új önkéntes tapasztalati szintje (csak új személy esetén)
          <select v-model="onkentesSzint" class="modal-input"><option value="">Meglévő önkéntesnél automatikus</option><option v-for="level in [1,2,3,4,5]" :key="level" :value="String(level)">{{ level }}. szint</option></select>
        </label>
        <p class="small-hint">A közös séta azonos időponttal indul, és egy művelettel lezárható. Az önkéntes besorolását a rendszer ellenőrzi.</p>
        <div class="modal-buttons"><button class="action-btn cancel-btn" :disabled="mentFolyamatban" @click="showModal = false">Mégsem</button><button class="action-btn confirm-btn" :disabled="mentFolyamatban" @click="setaMentese">{{ mentFolyamatban ? 'Mentés…' : 'Séta indítása' }}</button></div>
      </div>
    </div>

    <div v-if="showCloseModal" class="modal-overlay" role="dialog" aria-modal="true" aria-label="Séta lezárása">
      <div class="modal-content enlarged-modal">
        <h3>Séta lezárása: {{ kivalasztottSetaCsoport?.walks.map(s => s.dogs?.name).join(', ') }}</h3>
        <p>A kijelölt kutyák sétája egyszerre zárul le.</p>
        <label class="form-label">Megjegyzés (opcionális)
          <textarea v-model="walkNoteText" class="modal-textarea" placeholder="Sétával kapcsolatos észrevétel…"></textarea>
        </label>
        <div class="modal-buttons"><button class="action-btn cancel-btn" :disabled="mentFolyamatban" @click="showCloseModal = false">Mégsem</button><button class="action-btn confirm-btn" :disabled="mentFolyamatban" @click="setaLezarasaMegerosites">{{ mentFolyamatban ? 'Mentés…' : 'Séta lezárása' }}</button></div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.page-bg {
  background-color: #ede8d6;
  min-height: 100vh;
  padding: 20px 12px;
  box-sizing: border-box;
}

/* Teljes szélességű fejléc, mint a Statisztikák oldalon */
.top-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #957a64;
  color: #ede8d6;
  padding: 12px 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  max-width: 1000px;
  margin-left: auto;
  margin-right: auto;
}

/* Telefonos méretű keret a tartalomnak */
.mobile-frame {
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
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
  gap: 16px;
}

/* Fülválasztó gombok */
.tab-buttons {
  display: flex;
  gap: 8px;
}

.tab-btn {
  flex: 1;
  padding: 10px 8px;
  border: 2px solid #957a64;
  border-radius: 10px;
  background-color: white;
  color: #957a64;
  font-weight: bold;
  font-size: 14px;
  cursor: pointer;
}

.tab-btn.active {
  background-color: #957a64;
  color: #ede8d6;
}

.filters-box, .section-box, .category-box {
  background-color: white;
  border: 2px solid #957a64;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  box-sizing: border-box;
}

.filters-box h3, .section-box h4, .category-box h4 {
  margin-top: 0;
  color: #957a64;
}

.filter-inputs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #957a64;
  border-radius: 8px;
  background-color: #faf8f5;
  outline: none;
  box-sizing: border-box;
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
  padding: 12px 10px;
  border-bottom: 1px solid #e0d8c3;
  gap: 10px;
}

.dog-item:last-child {
  border-bottom: none;
}

.empty-text {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.reason-tag {
  background-color: #f8d7da;
  color: #721c24;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: bold;
}

.action-btn {
  background-color: #957a64;
  color: #ede8d6;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  white-space: nowrap;
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

.status-error { background: #ffe6e2; border: 1px solid #bb3838; padding: 10px; border-radius: 8px; }
.status-info, .small-hint { color: #66574c; font-size: 13px; }
.dog-secondary { display: block; margin-top: 5px; font-size: 12px; color: #725c48; }
.dog-item { gap: 10px; }
.action-btn:disabled { opacity: .45; cursor: not-allowed; }
.enlarged-modal { max-height: 88vh; overflow-y: auto; width: min(94vw, 540px); box-sizing: border-box; }
.mates-box { margin: 15px 0; padding: 12px; border: 1px solid #cab8a4; background: #faf7f1; border-radius: 10px; text-align: left; }
.mates-box h4 { margin: 0 0 8px; }
.mate-card { background:#fff; border:1px solid #ddcfbf; border-radius:10px; padding:12px; margin:10px 0; }
.mate-card-disabled { background:#f9f6f2; }
.mate-card-header { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
.mate-select { display:flex; gap:9px; align-items:flex-start; min-width:0; flex:1; cursor:pointer; }
.mate-select input { margin-top:5px; width:18px; height:18px; flex:none; accent-color:#957a64; }
.mate-summary { min-width:0; overflow-wrap:anywhere; }
.mate-summary small { display:block; margin-top:3px; color:#6c5d52; font-size:12px; }
.mate-summary .mate-status-warning { color:#9c3b2b; font-weight:600; }
.mate-details-button { flex:none; border:1px solid #957a64; border-radius:8px; background:#fff; color:#6f503d; padding:8px 10px; cursor:pointer; font-size:13px; }
.mate-details-button:hover { background:#f2e9db; }
.mate-quick-warning { text-align:left; margin-top:10px; padding:9px 10px; background:#fff0ee; border:1px solid #e7b9b4; border-radius:8px; color:#842f26; font-size:13px; line-height:1.45; overflow-wrap:anywhere; }
.mate-details { text-align:left; border-top:1px solid #e1d6ca; margin-top:12px; padding-top:9px; }
.mate-details p { margin:5px 0; line-height:1.5; overflow-wrap:anywhere; }
.mate-details .notes-box { margin-top:10px; font-size:13px; line-height:1.5; }
.selected-summary { text-align:left; background:#fff; border:1px solid #cdb9a3; border-radius:10px; padding:13px; margin:14px 0; }
.selected-summary p { margin:7px 0 0; line-height:1.5; }
.selected-summary .summary-warning { color:#842f26; }
.mate-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.mate-actions button { padding: 8px; border: 1px solid #957a64; border-radius: 6px; background: white; cursor: pointer; }
.form-label { display: block; margin-top: 10px; font-weight: 600; text-align: left; }
.form-label input, .form-label select, .form-label textarea { width: 100%; box-sizing: border-box; margin-top: 5px; }

@media (min-width: 720px) {
  .filter-inputs { display:grid; grid-template-columns:1.5fr 1fr 1fr; align-items:center; }
}
@media (max-width: 600px) {
  .page-bg { padding:12px 10px 24px; }
  .tab-buttons { flex-wrap:wrap; }
  .tab-btn { min-width:140px; font-size:13px; }
  .filters-box,.section-box,.category-box { padding:12px; }
  .dog-item { flex-wrap:wrap; align-items:flex-start; }
  .dog-item .action-btn { min-height:40px; }
  .enlarged-modal { width:min(100%,540px); padding:14px; max-height:calc(100dvh - 28px); }
  .modal-overlay { padding:10px; align-items:center; }
  .modal-buttons { flex-wrap:wrap; }
  .mate-card-header { flex-wrap:wrap; }
  .mate-details-button { margin-left:27px; }
}
</style>

<style scoped>
.primary-dog-card {text-align:left;background:#fff;border-color:#d6c5b5;}
.primary-dog-card .mate-summary small {display:block;margin-top:4px;color:#6c5d52;font-size:12px;}
.primary-dog-card .mate-card-header {align-items:center;}
.primary-dog-card .mate-details-button {margin:0;}
</style>
