<template>
  <div>
    <!-- LOGIN FORM -->
    <form @submit.prevent="loginClicked">
      <div v-if="!loggedIn" class="login_container">
        <div class="login_box">
          <v-text-field id="username" v-model="username" width="20rem" label="Username" name="username" />
          <v-text-field id="password" v-model="password" width="20rem" label="Password" type="password" name="password" />
          <v-btn class="submit_btn" color="#5865f2" width="8rem" type="submit" block>Submit</v-btn>
        </div>
      </div>
    </form>

    <!-- EVENT FORM -->
    <div v-if="loggedIn" class="form_container">
      <h1>Add New Event</h1>
      <form @submit.prevent="submitEvent">
        <p>I want to create a new event! Yay! What's the event type?</p>
        <!-- MOMENT OR RANGE EVENT -->
        <v-radio-group v-model="eventType" inline>
          <v-radio label="Moment (an event that points to a specific date)" value="moment" />
          <v-radio label="Range (an event that has different start and end dates)" value="range" />
        </v-radio-group>

        <h2 class="section_title">Information</h2>
        <!-- EVENT NAME -->
        <div class="">
          <v-text-field id="name" v-model="formData.name" label="Event Name" max-width="30rem" name="name" required />
        </div>

        <!-- EVENT DESCRIPTION -->
        <div>
          <v-text-field id="description" v-model="formData.description" label="Event Description" name="description" />
        </div>

        <h3 class="subsection_title">Optional Information</h3>
        <div class="optional_information_container">
          <!-- EVENT IMAGE -->
          <v-file-input id="image" v-model="formData.image" class="file_input" label="Optional: Image" name="image" />

          <!-- EVENT MAP -->
          <div class="map_container">
            <v-text-field id="map_link" v-model="formData.mapLink" label="Optional: Map Link" name="map_link" />
            <p>If you want the event to include a google map, please go to google maps and search for the location. Then click the 'share' icon and go to the 'Embed a map' tab. Copy the provided link and paste it here.</p>
          </div>
        </div>

        <!-- DATES -->
        <h2 class="section_title">Dates</h2>
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

        <!-- TAGS -->
        <h2 class="section_title">Tags</h2>
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
              <v-autocomplete v-if="existingTags.length" id="main_tag" v-model="formData.selectedMainTag" :required="mainTagSelectionType === 'select'" label="Select an existing tag" :disabled="mainTagSelectionType === 'create'" :items="existingTags" />

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
              <v-autocomplete v-if="existingTags.length" v-model="formData.selectedTags" class="tags_selection" :items="existingTags" label="Tags" multiple />
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
  </div>
</template>

<script>
export default {
  name: 'NewEvent',
  data() {
    return {
      loggedIn: false,
      username: '',
      password: '',
      correctUsername: 'timeline-admin',
      correctPassword: '19391945',
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
        createdTags: '',
        mapLink: '',
        image: null
      }
    }
  },
  methods: {
    submitEvent() {
      const payload = this.getPayload()

      console.log('submitting event', payload)
    },
    getPayload() {
      // main tag
      const mainTag = this.mainTagSelectionType === 'select' ? this.formData.selectedMainTag.toLowerCase() : this.formData.createdMainTag.trim().toLowerCase()

      // other tags
      const tagsObject = {}
      const createdTags = this.formData.createdTags.split(',').map(tag => tag.trim().toLowerCase())
      const selectedTagsLowerCase = this.formData.selectedTags.map(selectedTag => selectedTag.toLowerCase())
      const tagsWithDuplicates = selectedTagsLowerCase.concat(createdTags).filter(tag => tag !== '')
      // add main tag to tags array
      tagsWithDuplicates.push(mainTag)

      // tags without duplicates
      tagsWithDuplicates.forEach(tag => {
        tagsObject[tag] = true
      })

      const tags = Object.keys(tagsObject)

      const payload = {
        name: this.formData.name,
        description: this.formData.description,
        img: this.formData.image,
        location: this.formData.mapLink ? this.formData.mapLink.split('"')[1] : '',
        tags,
        mainTag
      }

      if (this.eventType === 'moment') {
        payload.date = this.formData.date
      } else {
        payload.startDate = this.formData.startDate
        payload.endDate = this.formData.endDate
      }

      return payload
    },
    loginClicked() {
      if (this.username === this.correctUsername && this.password === this.correctPassword) {
        localStorage.setItem('isLoggedInToTimeline', 'true')
        this.loggedIn = this.isLoggedIn()
        this.$emit('loggedInChanged', this.loggedIn)
      } else {
        alert('Incorrect username or password')
      }
    },
    isLoggedIn() {
      return localStorage.getItem('isLoggedInToTimeline') === 'true'
    },
    async getTags() {
      const response = await fetch('http://localhost:8787/')
      const events = await response.json()
      const tags = {}
      events.forEach(event => {
        tags[event.main_tag] = true
        event.tags.forEach(tag => (tags[tag] = true))
      })

      return Object.keys(tags).sort()
    }
  },

  async created() {
    this.existingTags = await this.getTags()
    this.loggedIn = this.isLoggedIn()
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

    .tags_selection {
      width: 50%;
    }
  }

  .or {
    margin-top: 1rem;
  }

  .submit_btn {
    margin: 2rem auto 1rem;
    min-width: auto;
  }

  .optional_information_container {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .file_input,
  .map_container {
    width: 50%;
  }
}

.login_container {
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  min-height: 100vh;

  .login_box {
    width: 30rem;
    padding: 4rem;
    box-shadow: 10px 5px 5px grey;
    border: 3px solid #5865f2;
    border-radius: 6px;
  }

  .submit_btn {
    margin: 2rem auto 1rem;
    min-width: auto;
  }
}
</style>
