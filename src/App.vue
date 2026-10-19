<template>
  <!-- Ide jönnek majd be az aloldalak, pl. a HomeView -->
  <RouterView />
</template>

<style>
nav {
  padding: 1rem;
  background-color: #f4f4f4;
  margin-bottom: 2rem;
  border-radius: 8px;
}
nav a {
  text-decoration: none;
  color: #2c3e50;
  font-weight: bold;
}
/* Globális alapbeállítások a felesleges margók és görgetés elkerülésére */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  overflow-x: hidden; /* Ezzel eltűnik a jobb oldali fehér sáv / vízszintes elcsúszás */
  background-color: #ede8d6; /* A háttérszíned */
}

*{
  box-sizing: border-box;
}
</style>