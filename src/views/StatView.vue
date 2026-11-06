<script setup>
import SharedHeader from '../components/SharedHeader.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'

const router = useRouter()
const isMainMenuOpen = ref(false)
const isProfileMenuOpen = ref(false)
const betoltes = ref(false)
const hiba = ref('')
const kutyak = ref([])
const volunteersCount = ref(0)
const walks = ref([])
const selectedDetail = ref(null)
const referenceDate = ref(new Date())

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
function localDayStart(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}
function weekStart(date) {
  const d = localDayStart(date)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}
function nextDay(date) { const d = new Date(date); d.setDate(d.getDate() + 1); return d }
function nextWeek(date) { const d = new Date(date); d.setDate(d.getDate() + 7); return d }
const todayStart = computed(() => localDayStart(referenceDate.value))
const tomorrowStart = computed(() => nextDay(todayStart.value))
const mondayStart = computed(() => weekStart(referenceDate.value))
const nextMonday = computed(() => nextWeek(mondayStart.value))
const todayText = computed(() => referenceDate.value.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }))
const weekText = computed(() => `${mondayStart.value.toLocaleDateString('hu-HU', {month:'short',day:'numeric'})} – ${new Date(nextMonday.value.getTime() - 1).toLocaleDateString('hu-HU', {month:'short',day:'numeric'})}`)
function inRange(row, start, end) {
  const ts = Date.parse(row.start_time)
  return ts >= start.getTime() && ts < end.getTime()
}
function groupKey(walk) {
  return walk.walk_group_id || `legacy:${walk.id}`
}
function uniqueEvents(rows) {
  return new Set(rows.map(groupKey)).size
}
function uniqueDogs(rows) {
  return new Set(rows.map(r => String(r.dog_id))).size
}
function minutes(row) {
  if (!row.end_time) return null
  const diff = (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 60000
  return diff >= 0 && Number.isFinite(diff) ? Math.round(diff) : null
}
function durationText(row) {
  const mins = minutes(row)
  if (mins === null) return 'Folyamatban'
  return `${Math.floor(mins / 60) ? `${Math.floor(mins / 60)} ó ` : ''}${mins % 60} perc`
}
function timeText(value) { return value ? new Date(value).toLocaleTimeString('hu-HU', {hour:'2-digit',minute:'2-digit'}) : '–' }
function dateText(value) { return value ? new Date(value).toLocaleDateString('hu-HU') : '–' }
function dogName(row) { return row.dogs?.name || kutyak.value.find(k => String(k.id) === String(row.dog_id))?.name || 'Ismeretlen kutya' }
function dogKennel(row) { return row.dogs?.kennel || kutyak.value.find(k => String(k.id) === String(row.dog_id))?.kennel || '–' }
function dogVolunteer(row) { return row.volunteers?.full_name || 'Ismeretlen' }
const todayRows = computed(() => walks.value.filter(w => inRange(w, todayStart.value, tomorrowStart.value)))
const weeklyRows = computed(() => walks.value.filter(w => inRange(w, mondayStart.value, nextMonday.value)))
const activeRows = computed(() => walks.value.filter(w => !w.end_time))
const allCompletedWalks = computed(() => walks.value.filter(w => Boolean(w.end_time)))
const completedWeekly = computed(() => weeklyRows.value.filter(w => w.end_time))
const eligibleDogs = computed(() => kutyak.value.filter(k => k.is_walkable !== false && k.active_flag !== false))
const weeklyCompletedDogIds = computed(() => new Set(completedWeekly.value.map(w => String(w.dog_id))))
const weeklyRemaining = computed(() => eligibleDogs.value.filter(d => !weeklyCompletedDogIds.value.has(String(d.id))))
const weeklyCoverage = computed(() => eligibleDogs.value.length ? Math.round(100 * (eligibleDogs.value.length - weeklyRemaining.value.length) / eligibleDogs.value.length) : 0)
const weeklyDuration = computed(() => completedWeekly.value.reduce((sum, w) => sum + (minutes(w) || 0), 0))
const statistics = computed(() => ({
  dogCount: kutyak.value.length,
  volunteers: volunteersCount.value,
  activeDogs: activeRows.value.length,
  activeEvents: uniqueEvents(activeRows.value),
  todayDogs: uniqueDogs(todayRows.value),
  todayEvents: uniqueEvents(todayRows.value),
  weekDogs: uniqueDogs(weeklyRows.value),
  weekEvents: uniqueEvents(weeklyRows.value),
  weekCompletedDogs: weeklyCompletedDogIds.value.size,
  allEvents: uniqueEvents(walks.value),
  durationMinutes: weeklyDuration.value
}))
// A részletes táblák egy kutyát egy sorban mutatnak, nem minden séta külön sort kap.
const detailTitle = computed(() => selectedDetail.value === 'today' ? 'Ma sétáltatott kutyák' : selectedDetail.value === 'week' ? 'Heti sétáltatott kutyák' : 'Jelenleg aktív séták')
function groupByDog(rows) {
  const groups = new Map()
  for (const row of rows) {
    const key = String(row.dog_id)
    if (!groups.has(key)) groups.set(key, { id:key, name:dogName(row), rows:[] })
    groups.get(key).rows.push(row)
  }
  return [...groups.values()].sort((a,b) => a.name.localeCompare(b.name,'hu'))
}
function uniqueDates(rows) {
  const dates = new Map()
  for (const row of rows) {
    if (!row.start_time) continue
    const localKey = new Date(row.start_time).toLocaleDateString('sv-SE')
    dates.set(localKey, dateText(row.start_time))
  }
  return [...dates.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(entry=>entry[1]).join(', ')
}
const todayDetailRows = computed(() => groupByDog(todayRows.value).map(g => {
  const completed = g.rows.filter(w => w.end_time)
  const total = completed.reduce((sum, w) => sum + (minutes(w) || 0), 0)
  return { ...g, duration: completed.length ? `${total} perc` : 'Folyamatban' }
}))
const weekDetailRows = computed(() => groupByDog(weeklyRows.value).map(g => ({
  ...g, count: g.rows.length, dates: uniqueDates(g.rows)
})))
const activeDetailRows = computed(() => [...activeRows.value].sort((a,b) => new Date(b.start_time) - new Date(a.start_time)))
const weeklyDogRows = computed(() => {
  return eligibleDogs.value.map(dog => {
    const rows = completedWeekly.value.filter(w => String(w.dog_id) === String(dog.id))
    return { dog, count: rows.length, dates: uniqueDates(rows) }
  }).sort((a,b) => a.count - b.count || (a.dog.name || '').localeCompare(b.dog.name || '', 'hu'))
})
const weekDays = computed(() => Array.from({ length: 7 }, (_, idx) => {
  const date = new Date(mondayStart.value)
  date.setDate(date.getDate() + idx)
  const end = nextDay(date)
  const rows = weeklyRows.value.filter(w => inRange(w, date, end))
  return { label: date.toLocaleDateString('hu-HU', {weekday:'short',day:'numeric'}), dogs: uniqueDogs(rows), events: uniqueEvents(rows) }
}))
async function statisztikakLekerese() {
  betoltes.value = true
  hiba.value = ''
  referenceDate.value = new Date()
  // A részletes listához a mai és a heti adatokon túl a korábbi sétákat is lekérjük.
  // A Supabase alapértelmezett max. 1000 sorát lapozással kerüljük meg.
  try {
    const [dogResult, volunteerResult] = await Promise.all([
      supabase.from('dogs').select('id, name, kennel, is_walkable, active_flag').order('name'),
      supabase.from('volunteers').select('*', {count:'exact',head:true})
    ])
    if (dogResult.error) throw dogResult.error
    if (volunteerResult.error) throw volunteerResult.error
    kutyak.value = dogResult.data || []
    volunteersCount.value = volunteerResult.count || 0
    const all = []
    const pageSize = 500
    for (let from = 0; from < 100000; from += pageSize) {
      const fullFields = 'id, dog_id, volunteer_id, start_time, end_time, walk_group_id, dogs(name, kennel), volunteers(full_name)'
      const legacyFields = 'id, dog_id, volunteer_id, start_time, end_time, dogs(name, kennel), volunteers(full_name)'
      let result = await supabase.from('walks').select(fullFields)
        .order('start_time', {ascending:false}).range(from, from + pageSize - 1)
      if (result.error && /walk_group_id/i.test(result.error.message)) {
        // Még nem futott le a SQL-migráció: a régi séták így is megjelennek.
        result = await supabase.from('walks').select(legacyFields)
          .order('start_time', {ascending:false}).range(from, from + pageSize - 1)
      }
      if (result.error) throw result.error
      const rows = (result.data || []).map(row => ({ ...row, walk_group_id: row.walk_group_id ?? null }))
      all.push(...rows)
      if (rows.length < pageSize) break
    }
    walks.value = all
  } catch (err) {
    hiba.value = err.message
  } finally { betoltes.value = false }
}
onMounted(() => {
  statisztikakLekerese()
  window.addEventListener('click', handleClickOutside)
})
onUnmounted(() => window.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div class="page-bg">
    <SharedHeader title="Statisztikák" />
    <main class="content-container">
      <div class="heading-row"><div><h2>Heti sétáltatási áttekintés</h2><p>{{ weekText }} · {{ todayText }}</p></div><button class="refresh-btn" :disabled="betoltes" @click="statisztikakLekerese">↻ Frissítés</button></div>
      <p v-if="hiba" class="error">Hiba az adatok betöltésekor: {{ hiba }}</p>
      <p v-if="betoltes">Statisztikák frissítése…</p>
      <section class="stats-grid" aria-label="Statisztikai összesítések">
        <div class="stat-card emphasized"><h3>Heti teljesítés</h3><p class="stat-number">{{ weeklyCoverage }}%</p><p class="detail-caption">{{ statistics.weekCompletedDogs }} / {{ eligibleDogs.length }} sétáltatható kutya lezárt sétával</p></div>
        <button class="stat-card clickable" @click="selectedDetail = 'week'"><h3>Heti sétáltatott kutyák</h3><p class="stat-number">{{ statistics.weekDogs }}</p><p class="detail-caption">{{ statistics.weekEvents }} sétaesemény · Kattints a listához</p></button>
        <button class="stat-card clickable" @click="selectedDetail = 'today'"><h3>Mai sétáltatott kutyák</h3><p class="stat-number">{{ statistics.todayDogs }}</p><p class="detail-caption">{{ statistics.todayEvents }} sétaesemény · Kattints a listához</p></button>
        <button class="stat-card clickable" @click="selectedDetail = 'active'"><h3>Jelenleg sétán</h3><p class="stat-number">{{ statistics.activeDogs }}</p><p class="detail-caption">{{ statistics.activeEvents }} sétaesemény · Kattints a listához</p></button>
        <div class="stat-card"><h3>Heti sétával töltött idő</h3><p class="stat-number">{{ Math.floor(statistics.durationMinutes / 60) }} ó {{ statistics.durationMinutes % 60 }} p</p><p class="detail-caption">Kutyánként összeadott lezárt időtartamok</p></div>
        <div class="stat-card"><h3>Összes adat</h3><p class="summary-line">{{ statistics.dogCount }} kutya · {{ statistics.volunteers }} önkéntes</p><p class="summary-line">{{ statistics.allEvents }} rögzített sétaesemény</p></div>
      </section>
      <section class="panel"><h3>A hét napjai</h3><div class="weekday-grid"><div v-for="day in weekDays" :key="day.label" class="day-item"><strong>{{ day.label }}</strong><span>{{ day.dogs }} kutya</span><small>{{ day.events }} séta</small></div></div></section>
      <section class="panel"><h3>Kutyánkénti heti teljesítés</h3><p class="muted">A heti sétaszám a lezárt sétarészvételek számát jelenti.</p>
        <div class="scroll-table"><table><thead><tr><th>Kutya</th><th>Lezárt séták</th><th>Dátum(ok)</th></tr></thead>
          <tbody><tr v-for="entry in weeklyDogRows" :key="entry.dog.id"><td>{{ entry.dog.name }}</td><td>{{ entry.count }}</td><td class="dates-cell">{{ entry.dates || '–' }}</td></tr></tbody></table></div>
      </section>
    </main>
    <div v-if="selectedDetail" class="modal-overlay" role="dialog" aria-modal="true" :aria-label="detailTitle">
      <div class="modal-content detail-modal"><div class="detail-header"><h3>{{ detailTitle }}</h3><button class="close-btn" @click="selectedDetail = null">✕</button></div>
        <div v-if="selectedDetail === 'active'" class="scroll-table">
          <table><thead><tr><th>Kutya</th><th>Dátum</th><th>Kezdés</th></tr></thead>
            <tbody><tr v-for="row in activeDetailRows" :key="row.id"><td>{{ dogName(row) }}</td><td>{{ dateText(row.start_time) }}</td><td>{{ timeText(row.start_time) }}</td></tr>
              <tr v-if="!activeDetailRows.length"><td colspan="3">Jelenleg nincs aktív séta.</td></tr></tbody></table>
        </div>
        <div v-else-if="selectedDetail === 'today'" class="scroll-table">
          <table><thead><tr><th>Kutya</th><th>Összesített időtartam</th></tr></thead>
            <tbody><tr v-for="row in todayDetailRows" :key="row.id"><td>{{ row.name }}</td><td>{{ row.duration }}</td></tr>
              <tr v-if="!todayDetailRows.length"><td colspan="2">Ma még nincs rögzített séta.</td></tr></tbody></table>
          <p class="muted">Az időtartam az adott kutya mai, lezárt sétáinak összegét mutatja. Folyamatban lévő sétát nem számolunk bele.</p>
        </div>
        <div v-else-if="selectedDetail === 'week'" class="scroll-table">
          <table><thead><tr><th>Kutya</th><th>Séták száma</th><th>Dátum(ok)</th></tr></thead>
            <tbody><tr v-for="row in weekDetailRows" :key="row.id"><td>{{ row.name }}</td><td>{{ row.count }}</td><td class="dates-cell">{{ row.dates }}</td></tr>
              <tr v-if="!weekDetailRows.length"><td colspan="3">Ezen a héten még nincs rögzített séta.</td></tr></tbody></table>
          <p class="muted">A lista a héten elkezdett sétákat tartalmazza. Egy kutya több séta esetén is egy sorban szerepel.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-bg { background:#ede8d6; min-height:100vh; padding:20px 12px; box-sizing:border-box; }
.top-header { display:flex; justify-content:space-between; align-items:center; background:#957a64; color:#ede8d6; padding:12px 20px; border-radius:12px; margin:0 auto 22px; max-width:1000px; box-shadow:0 4px 6px rgba(0,0,0,.1); }
.page-title { font-size:20px; font-weight:bold; margin:0; }
.icon-btn { border:0; background:transparent; color:#ede8d6; font-size:23px; cursor:pointer; }
.menu-wrapper { position:relative; }
.dropdown-menu { position:absolute; top:50px; z-index:20; min-width:170px; display:flex; flex-direction:column; background:#ede8d6; border:2px solid #957a64; border-radius:10px; padding:8px 0; box-shadow:0 8px 16px #0003; }
.left-menu { left:0; } .right-menu { right:0; }
.menu-item { background:transparent; border:0; text-align:left; color:#333; font-size:14px; padding:10px 16px; text-decoration:none; cursor:pointer; }
.menu-item:hover { background:#dfd2bd; } .logout-btn { color:#a33b3b; }
.content-container { max-width:1000px; margin:0 auto; }
.heading-row { display:flex; gap:12px; justify-content:space-between; align-items:center; flex-wrap:wrap; }
.heading-row h2 { color:#6d5747; margin:0 0 4px; } .heading-row p { color:#6d5747; margin:0 0 16px; }
.refresh-btn, .close-btn { border:1px solid #957a64; background:white; color:#795f4c; border-radius:8px; padding:10px 13px; cursor:pointer; }
.stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(205px,1fr)); gap:12px; }
.stat-card { background:white; color:#40352d; border:2px solid #ccb8a4; border-radius:12px; padding:18px 12px; text-align:center; box-shadow:0 3px 5px #0001; }
.stat-card h3 { font-size:15px; margin:0 0 10px; color:#7c624d; } .stat-number { font-size:30px; font-weight:700; margin:0; }
.stat-card.emphasized { border-color:#957a64; } .stat-card.clickable { cursor:pointer; font:inherit; } .stat-card.clickable:hover { background:#faf7f2; border-color:#957a64; }
.detail-caption { font-size:12px; margin:10px 0 0; color:#6e625a; } .summary-line { margin:6px 0; font-weight:600; }
.panel { background:white; border:1px solid #d5c5b4; border-radius:12px; padding:16px; margin-top:16px; }
.panel h3 { margin:0 0 12px; color:#705642; } .muted { color:#71645b; font-size:13px; }
.weekday-grid { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:6px; }
.day-item { border:1px solid #d6c5b7; border-radius:9px; padding:10px 3px; text-align:center; display:flex; flex-direction:column; gap:5px; font-size:13px; }
.day-item small { color:#65574f; } .remaining-list { display:flex; flex-wrap:wrap; gap:8px; }
.dog-chip { background:#f4eee6; border:1px solid #decfbe; border-radius:18px; padding:7px 10px; font-size:13px; }
.dog-chip small { color:#7e6d61; } .scroll-table { width:100%; overflow-x:auto; }
table { width:100%; border-collapse:collapse; font-size:13px; } th,td { text-align:left; padding:9px 11px; border-bottom:1px solid #e6ded5; white-space:nowrap; } th { color:#6e5642; background:#faf7f3; }
.modal-overlay { position:fixed; inset:0; z-index:99; background:#0008; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box; }
.modal-content { background:white; border-radius:14px; padding:20px; max-width:100%; box-sizing:border-box; }
.detail-modal { width:min(960px,100%); max-height:85vh; overflow:auto; } .detail-header { display:flex; justify-content:space-between; align-items:center; gap:15px; }
.detail-header h3 { margin:0; } .error { color:#a52828; background:#ffe8e8; padding:10px; border-radius:8px; }
@media(max-width:700px) { .weekday-grid { grid-template-columns:repeat(4,minmax(0,1fr)); } .stat-number { font-size:25px; } }

@media (max-width: 600px) {
  .page-bg { padding:12px 10px 24px; }
  .stats-grid { grid-template-columns: repeat(2,minmax(0,1fr)); gap:9px; }
  .stat-card { padding:14px 8px; min-width:0; }
  .stat-card h3 { font-size:13px; }
  .stat-number { font-size:25px; }
  .detail-caption { font-size:11px; }
  .panel { padding:12px; }
  .weekday-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .detail-modal { max-height:calc(100dvh - 24px); padding:12px; }
}
@media (max-width:360px) { .stats-grid { grid-template-columns: 1fr; } }
</style>

<style scoped>
.dates-cell { white-space:normal;min-width:135px;line-height:1.5; }
.detail-modal {width:min(650px,100%);}
@media(max-width:600px) { .detail-modal table {font-size:12px;} .detail-modal th,.detail-modal td {padding:9px 7px;} }
</style>
