<template>
  <v-app>
    <NuxtLayout>
      <v-app-bar>
        <v-app-bar-title>Holocaust Timeline</v-app-bar-title>
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
      return true
    },
    loggedIn() {
      return false
    }
  }
}
</script>
