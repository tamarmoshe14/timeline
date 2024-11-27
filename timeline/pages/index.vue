<template>
  <div class="hp_container">
    <!-- FILTER -->
    <v-autocomplete v-model="filter" class="autocomplete" label="Search" :items="['germany', 'poland', 'war', 'warsaw', 'ghetto', 'jewish resistance', 'aweshwitz', 'holocaust']" />

    <!-- TIMELINE -->
    <v-timeline direction="horizontal">
      <v-timeline-item v-for="(event, index) in filteredEvents" :key="index" :dot-color="TAG_COLORS[event.main_tag]">
        <template #opposite>
          {{ event.date }}
        </template>
        <button class="btn_container" @click="openModal(event)">
          <p class="event_title">{{ event.title }}</p>
          <p class="description">{{ event.description }}</p>
          <p class="tags">Tags: {{ event.tags.join(', ') }}</p>
        </button>
      </v-timeline-item>
    </v-timeline>

    <!-- MODAL -->
    <v-dialog v-if="activeEvent" v-model="modalIsOpen" max-width="500">
      <template #default>
        <v-card :title="activeEvent.title">
          <v-card-text> {{ activeEvent.description }} </v-card-text>
          <img v-if="activeEvent.image" class="image" :src="activeEvent.image" />

          <v-card-actions>
            <v-spacer />
            <v-btn text="Close" @click="closeModal" />
          </v-card-actions>
        </v-card>
      </template>
    </v-dialog>
  </div>
</template>

<script>
const TAG_COLORS = {
  holocaust: 'red',
  war: 'blue',
  'jewish resistance': 'yellow'
}

export default {
  name: 'Timeline',
  data() {
    return {
      TAG_COLORS,
      modalIsOpen: false,
      filter: null,
      events: [],
      activeEvent: null
    }
  },
  computed: {
    filteredEvents() {
      if (!this.filter) {
        return this.events
      }
      return this.events.filter(event => {
        return event.tags.includes(this.filter)
      })
    }
  },
  methods: {
    async setEvents() {
      const response = await fetch('http://localhost:8787/')
      const events = await response.json()
      this.events = events.sort((a, b) => {
        return new Date(a.date) - new Date(b.date)
      })
    },
    openModal(event) {
      this.modalIsOpen = true
      this.activeEvent = event
    },
    closeModal() {
      this.modalIsOpen = false
      this.activeEvent = null
    }
  },
  created() {
    this.setEvents()
  }
}
</script>

<style lang="scss" scoped>
.hp_container {
  margin: auto 0;
}

.autocomplete {
  width: 20rem;
  margin: 0 auto 10rem;
}

.btn_container {
  display: inline-block;
  transition: transform 0.3s ease;
  &:hover {
    background: radial-gradient(#f1eaea 1rem, transparent);
    transform: scale(1.2);
    border-radius: 50%;
  }
}

.event_title {
  font-size: 1.8rem;
}

.description {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  -webkit-line-clamp: 2;
  text-overflow: ellipsis;
  max-width: 20rem;
}

.tags {
  font-size: 0.8rem;
}

.image {
  max-width: 30rem;
}
</style>
