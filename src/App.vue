<script setup>
import { ref } from 'vue';
import Home from './components/Home.vue';
import Stats from './components/Stats.vue';

// Estado de navegación
const pantallaActual = ref('home');
const sesionActiva = ref({ jugadorId: '', nombre: '', formato: '' });

function navegarAStats(data) {
  sesionActiva.value = data;
  pantallaActual.value = 'stats';
}

function volverAlMenu() {
  pantallaActual.value = 'home';
}
</script>

<template>
  <div class="main-background">
    <Transition name="fade" mode="out-in">
      <Home v-if="pantallaActual === 'home'" @seleccionar="navegarAStats" />
      <Stats v-else :config="sesionActiva" @back="volverAlMenu" />
    </Transition>
  </div>
</template>

<style>
/* Aquí movemos el CSS base que comparten ambas: .main-background, .fade, .toast, etc. */
.main-background {
  min-height: 100vh;
  background: linear-gradient(rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.95)),
    url('./assets/Backgound.jpg') center/cover no-repeat fixed;
  color: #f8fafc;
  font-family: 'Inter', sans-serif;
}
</style>