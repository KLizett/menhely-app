<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'

const router = useRouter()
const email = ref('')
const password = ref('')
const errorMessage = ref('')

async function handleLogin() {
  errorMessage.value = ''
  
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })

  if (error) {
    errorMessage.value = 'Hiba a bejelentkezéskor: ' + error.message
  } else {
    router.push('/home')
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <h1 class="login-title">Üdv menhelyünknél!</h1>

      <form @submit.prevent="handleLogin" class="login-form">
        <input 
          type="email" 
          v-model="email" 
          placeholder="email" 
          required 
          class="login-input"
        />
        
        <input 
          type="password" 
          v-model="password" 
          placeholder="jelszó" 
          required 
          class="login-input"
        />

        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

        <button type="submit" class="login-btn">BEJELENTKEZÉS</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  background-color: #ede8d6;
  /* Helyette fix alsó elhelyezés, ami nem nyúlik szét aránytalanul */
  background-image: url('/háttér_version1.jpg');
  background-repeat: no-repeat;
  background-position: bottom center;
  background-size: contain; /* Így arányos marad és nem nagyítja fel óriásira */
  
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start; /* Fentre húzza a címet és mezőket, hogy ne a kutyák hátán legyenek */
  padding-top: 60px;
  box-sizing: border-box;
  overflow: hidden;
}

.login-box {
  width: 100%;
  max-width: 320px;
  text-align: center;
  z-index: 2;
  padding: 20px;
  background-color: rgba(237, 232, 214, 0.85); /* Enyhe háttér, hogy ha mégis érintené a képet, olvasható maradjon */
  border-radius: 12px;
}

.login-title {
  color: #7c624d;
  font-size: 26px;
  font-family: serif;
  margin-bottom: 25px;
  font-weight: bold;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.login-input {
  width: 100%;
  padding: 10px 14px;
  background-color: #ffffff;
  border: 1px solid #957a64;
  border-radius: 6px;
  text-align: center;
  font-size: 14px;
  color: #333;
  outline: none;
  box-sizing: border-box;
}

.login-input::placeholder {
  color: #a89f91;
}

.login-btn {
  background-color: #957a64;
  color: #ede8d6;
  border: none;
  border-radius: 20px;
  padding: 9px 22px;
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 1px;
  cursor: pointer;
  margin-top: 8px;
  transition: background-color 0.2s;
}

.login-btn:hover {
  background-color: #7c624d;
}

.error-text {
  color: #a33b3b;
  font-size: 12px;
  margin: 0;
}

.page-bg {
  background-color: #ede8d6;
  width: 100vw;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between; /* Szépen elosztja a elemeket függőlegesen */
  align-items: center;
  padding: 20px;
  overflow-x: hidden;
}
</style>