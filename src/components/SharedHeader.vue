<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'

defineProps({ title: { type: String, required: true } })
const router = useRouter()
const openMenu = ref(null)
const root = ref(null)
function toggle(name) { openMenu.value = openMenu.value === name ? null : name }
function closeOnOutside(event) {
  if (root.value && !root.value.contains(event.target)) openMenu.value = null
}
async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) { alert('Nem sikerült kijelentkezni: ' + error.message); return }
  await router.push('/')
}
onMounted(() => document.addEventListener('pointerdown', closeOnOutside))
onUnmounted(() => document.removeEventListener('pointerdown', closeOnOutside))
</script>

<template>
  <header ref="root" class="app-header">
    <div class="header-slot">
      <button class="header-icon" type="button" aria-label="Főmenü" :aria-expanded="openMenu === 'main'" @click="toggle('main')">☰</button>
      <nav v-if="openMenu === 'main'" class="header-menu menu-left" aria-label="Főmenü">
        <router-link to="/home" @click="openMenu = null">Kutyáink</router-link>
        <router-link to="/walk" @click="openMenu = null">Séta rögzítése</router-link>
        <router-link to="/stat" @click="openMenu = null">Statisztikák</router-link>
        <router-link to="/admin" @click="openMenu = null">Admin felület</router-link>
      </nav>
    </div>
    <h1 class="header-title">{{ title }}</h1>
    <div class="header-slot end-slot">
      <button class="header-icon" type="button" aria-label="Profilmenü" :aria-expanded="openMenu === 'profile'" @click="toggle('profile')">👤</button>
      <nav v-if="openMenu === 'profile'" class="header-menu menu-right" aria-label="Profilmenü">
        <router-link to="/profile" @click="openMenu = null">Személyes adatok</router-link>
        <button type="button" class="logout" @click="logout">Kijelentkezés</button>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-header { box-sizing:border-box; width:100%; max-width:1100px; margin:0 auto 24px; padding:12px 19px; min-height:68px; display:grid; grid-template-columns:48px minmax(0,1fr) 48px; align-items:center; gap:8px; background:#957a64; color:#fffaf0; border-radius:13px; box-shadow:0 4px 10px #0002; position:relative; z-index:20; }
.header-title { margin:0; text-align:center; font-size:clamp(19px,2.3vw,24px); font-family:Georgia,'Times New Roman',serif; line-height:1.2; overflow-wrap:anywhere; }
.header-slot { position:relative; display:flex; justify-content:flex-start; }
.end-slot { justify-content:flex-end; }
.header-icon { width:44px; min-height:44px; border:0; background:transparent; color:inherit; font-size:25px; display:flex; align-items:center; justify-content:center; border-radius:9px; cursor:pointer; }
.header-icon:hover,.header-icon:focus-visible { background:#fff2; outline-offset:2px; }
.header-menu { display:flex; flex-direction:column; position:absolute; top:48px; min-width:185px; max-width:min(86vw,275px); border:1px solid #b39b85; background:#fffaf4; box-shadow:0 12px 30px #0002; border-radius:11px; padding:7px; z-index:60; }
.menu-left { left:0; }.menu-right { right:0; }
.header-menu a,.header-menu button { appearance:none; border:0; background:transparent; font:inherit; font-size:15px; color:#493a31; text-align:left; text-decoration:none; border-radius:6px; cursor:pointer; padding:11px 12px; white-space:normal; }
.header-menu a:hover,.header-menu button:hover { background:#efe5d8; }
.header-menu .logout { color:#9d3838; }
@media(max-width:480px) { .app-header { grid-template-columns:42px minmax(0,1fr) 42px; min-height:62px; margin-bottom:16px; padding:9px 10px; border-radius:10px; } .header-icon { width:40px; min-height:40px; font-size:23px; } .header-menu { top:43px; } }
</style>
