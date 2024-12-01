<template>
  <v-app>
    <NuxtLayout>
      <v-app-bar>
        <a href="/" class="app_header">Holocaust Timeline</a>
        <v-spacer />
        <v-btn to="about">About</v-btn>
        <v-btn v-if="loggedOut" to="sign_up">Sign Up</v-btn>
        <v-btn v-if="loggedIn" to="new_event">Add Event</v-btn>
      </v-app-bar>
      <nuxtPage />
    </NuxtLayout>
  </v-app>
</template>

<script>
export default {
  name: 'App',
  computed: {
    loggedOut() {
      return false
    },
    loggedIn() {
      return true
    }
  }
}
</script>

<style scoped lang="scss">
.app_header {
  font-size: 1.5rem;
  font-weight: bold;
  color: black;
  text-decoration: none;
  margin-left: 1rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
</style>
