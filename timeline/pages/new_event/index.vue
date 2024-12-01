<template>
  <div class="form_container">
    <h1>Add New Event</h1>
    <form class="" @submit.prevent="submitEvent">
      <p>I want to create a new event! Yay! What's the event type?</p>
      <!-- MOMENT OR RANGE EVENT -->
      <v-radio-group v-model="eventType" inline>
        <v-radio label="Moment" value="moment" />
        <v-radio label="Range" value="range" />
      </v-radio-group>

      <h2 class="section_title">Information</h2>
      <!-- EVENT NAME -->
      <div class="">
        <v-text-field id="name" v-model="formData.name" label="Event Name" name="name" required />
      </div>

      <!-- EVENT DESCRIPTION -->
      <div v-if="eventType === 'moment'">
        <v-text-field id="description" v-model="formData.description" label="Event Description" name="description" />
      </div>

      <h2 class="section_title">Dates</h2>
      <!-- DATES -->
      <div>
        <!-- MOMENT DATE -->
        <div v-if="eventType === 'moment'" class="moment_date">
          <v-date-input id="moment_date" v-model="formData.date" :max="today" required label="Date" width="20rem" name="moment_date" />
        </div>
        <!-- RANGE DATES -->
        <div v-else class="range_dates">
          <v-date-input id="start_date" v-model="formData.startDate" :max="today" required label="Start Date" width="20rem" name="start_date" />
          <v-date-input id="end_date" v-model="formData.endDate" :max="today" required label="End Date" width="20rem" name="end_date" />
        </div>
      </div>

      <h2 class="section_title">Tags</h2>
      <!-- TAGS -->
      <div class="tags_container">
        <!-- MAIN TAG -->
        <h3 class="subsection_title">Main Tag</h3>
        <div class="main_tag_container">
          <v-radio-group v-model="mainTagSelectionType" inline>
            <v-radio label="Select an existing tag" value="select" />
            <v-radio label="Create a new tag" value="create" />
          </v-radio-group>

          <div class="tag_content">
            <!-- SELECT MAIN TAG -->
            <v-select v-if="existingTags.length" id="main_tag" v-model="formData.selectedMainTag" :required="mainTagSelectionType === 'select'" :items="existingTags" label="Select an existing tag" :disabled="mainTagSelectionType === 'create'" />

            <p class="or">OR</p>
            <!-- CREATE MAIN TAG -->
            <v-text-field id="main_tag" v-model="formData.createdMainTag" :required="mainTagSelectionType === 'create'" label="Create a new tag" :disabled="mainTagSelectionType === 'select'" />
          </div>
        </div>
        <!-- OTHER TAGS -->
        <h3 class="subsection_title">Other Tags</h3>
        <div class="tags">
          <div class="tag_content">
            <!-- SELECT TAGS -->
            <v-select v-if="existingTags.length" v-model="formData.selectedTags" :items="existingTags" label="Tags" multiple />
            <div>
              <!-- CREATE TAGS -->
              <v-text-field id="new_tags" v-model="formData.createdTags" label="Add new tags" />
              <p>Add as many tags as you wish. Use a comma as a separator. For example: war, Germany, battle</p>
            </div>
          </div>
        </div>
      </div>

      <!-- SUBMIT -->
      <v-btn class="submit_btn" color="#5865f2" width="20rem" type="submit" block>Submit</v-btn>
    </form>
  </div>
</template>

<script>
export default {
  name: 'NewEvent',
  data() {
    return {
      existingTags: [],
      mainTagSelectionType: 'select',
      eventType: 'moment',
      today: new Date().toISOString(),
      formData: {
        name: '',
        description: '',
        date: null,
        startDate: null,
        endDate: null,
        selectedMainTag: '',
        createdMainTag: '',
        selectedTags: [],
        createdTags: ''
      }
    }
  },
  methods: {
    submitEvent() {
      const payload = this.getPayload()
      console.log('submitting event', payload)
    },
    getPayload() {
      const createdTags = this.formData.createdTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => !this.formData.selectedTags.includes(tag))

      const tags = this.formData.selectedTags.concat(createdTags)
      const mainTag = this.mainTagSelectionType === 'select' ? this.formData.selectedMainTag : this.formData.createdMainTag

      if (!tags.includes(mainTag)) {
        tags.push(mainTag)
      }

      if (this.eventType === 'moment') {
        return {
          name: this.formData.name,
          description: this.formData.description,
          date: this.formData.date,
          tags,
          mainTag
        }
      } else {
        return {
          name: this.formData.name,
          startDate: this.formData.startDate,
          endDate: this.formData.endDate,
          tags,
          mainTag
        }
      }
    },
    async getTags() {
      const response = await fetch('http://localhost:8787/')
      const events = await response.json()
      const tags = {}
      events.forEach(event => {
        tags[event.main_tag] = true
        event.tags.forEach(tag => (tags[tag] = true))
      })

      return Object.keys(tags)
    }
  },
  async created() {
    this.existingTags = await this.getTags()
  }
}
</script>

<style lang="scss" scoped>
.form_container {
  margin: 4rem 0;
  padding: 2rem;

  .section_title {
    margin: 2rem 0 1rem;
  }

  .subsection_title {
    margin: 1rem 0;
  }

  .tag_content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2rem;
  }

  .or {
    margin-top: 1rem;
  }

  .submit_btn {
    margin: 2rem auto 1rem;
    min-width: auto;
  }
}
</style>
