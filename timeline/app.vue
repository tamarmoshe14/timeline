<template>
  <client-only>
    <v-app>
      <NuxtLayout>
        <v-app-bar>
          <a href="/" class="app_header">Holocaust Timeline</a>
          <v-spacer />
          <v-btn class="btn" to="about">About</v-btn>
          <v-btn class="btn" to="new_event">Add Event</v-btn>
          <v-btn v-if="loggedIn" class="btn" @click="logoutClicked">Log Out</v-btn>
        </v-app-bar>
        <nuxtPage @loggedInChanged="loggedInChanged" />
      </NuxtLayout>
    </v-app>
  </client-only>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      loggedIn: false
    }
  },
  computed: {
    loggedOut() {
      return false
    }
  },
  methods: {
    isLoggedIn() {
      if (window) {
        return localStorage.getItem('isLoggedInToTimeline') === 'true'
      }
    },
    logoutClicked() {
      localStorage.setItem('isLoggedInToTimeline', 'false')
      this.loggedIn = false
      this.$router.push('/')
    },
    loggedInChanged(loginState) {
      this.loggedIn = loginState
    }
  },
  created() {
    this.loggedIn = this.isLoggedIn()
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
  font-family: Gill Sans;
}

.btn {
  margin-inline: 1rem;
  margin-inline-end: 1rem !important;
  font-family: Gill Sans;
}

@media (max-width: 600px) {
  .app_header {
    font-size: 1rem;
  }

  .btn {
    margin-inline: 0.5rem;
    padding-inline: 0;
    margin-right: 0.5rem;
  }
}
</style>
