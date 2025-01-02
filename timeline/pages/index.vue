<template>
  <div class="hp_container">
    <!-- AUTOCOMPLETE -->
    <div class="autocomplete_container">
      <p class="instructions">Customize your timeline by selecting filters</p>
      <v-autocomplete v-model="activeFilters" label="Select Filter" class="autocomplete" dense rounded return-object multiple chips bg-color="white" closable-chips :items="filters">
        <template #prepend-item>
          <v-list-item title="Select All" @click="selectAll">
            <template v-slot:prepend>
              <v-checkbox-btn :model-value="allFiltersAreSelected" />
            </template>
          </v-list-item>
        </template>
      </v-autocomplete>
      <p v-if="!loading && activeFilters.length" class="filters_list">
        Active Filters: <span>{{ activeFiltersForDisplay }}</span>
      </p>
    </div>

    <!-- LOADER -->
    <div v-if="loading" class="loader" />

    <!-- TIMELINE -->
    <div ref="chartContainer" class="timeline_container" />

    <!-- MODAL -->
    <v-dialog v-if="activeEvent" v-model="modalIsOpen" persistent class="event_modal" max-width="600">
      <template #default>
        <div class="modal_content">
          <h2 class="modal_title">{{ activeEvent.y || activeEvent.name }}</h2>
          <p>{{ activeEvent.description }}</p>
          <img v-if="activeEvent.img" class="image" :src="`${this.fetchPrefix}image/${activeEvent.img}`" width="200" height="200" />
          <v-btn v-if="activeEvent.embed_link" class="map_btn" @click="toggleMap">{{ showMap ? 'Close Location' : 'See Location' }}</v-btn>
          <iframe v-if="activeEvent.embed_link && showMap" class="map" :src="activeEvent.embed_link" width="400" height="450" style="border: 0" allowfullscreen="true" loading="lazy" referrerpolicy="no-referrer-when-downgrade" />

          <v-chip class="tag_text" :color="tagColors[activeEvent.main_tag]" variant="elevated">Main Tag: {{ activeEvent.main_tag }}</v-chip>

          <v-card-actions>
            <v-spacer />
            <div>
              <v-btn v-if="loggedIn" :to="`/new-event?id=${activeEvent.id}`">Edit</v-btn>
              <v-btn text="Close" @click="closeModal" />
            </div>
          </v-card-actions>
        </div>
      </template>
    </v-dialog>
  </div>
</template>

<script>
import anychart from 'anychart'

export default {
  name: 'Timeline',
  data() {
    return {
      modalIsOpen: false,
      activeFilters: [],
      moments: [],
      ranges: [],
      activeEvent: null,
      chart: null,
      showMap: false,
      tagColors: {},
      filters: [],
      loading: false,
      fetchPrefix: '',
      loggedIn: false
    }
  },
  computed: {
    filteredMoments() {
      const filteredMoments = []

      this.activeFilters.forEach(filter => {
        const momentsPerFilter = this.moments.filter(moment => {
          const allTags = [moment.main_tag, ...moment.tags]
          return allTags.includes(filter.title)
        })
        momentsPerFilter.forEach(moment => {
          if (!filteredMoments.includes(moment)) {
            filteredMoments.push(moment)
          }
        })
      })

      return filteredMoments.flat()
    },
    filteredRanges() {
      const filteredRanges = []

      this.activeFilters.forEach(filter => {
        const rangesPerFilter = this.ranges.filter(range => {
          const allTags = [range.main_tag, ...range.tags]
          return allTags.includes(filter.title)
        })

        rangesPerFilter.forEach(range => {
          if (!filteredRanges.includes(range)) {
            filteredRanges.push(range)
          }
        })
      })

      return filteredRanges.flat()
    },
    allFiltersAreSelected() {
      return this.activeFilters.length === this.filters.length
    },
    activeFiltersForDisplay() {
      if (this.activeFilters.length === this.filters.length) {
        return 'All filters are active.'
      }
      return this.activeFilters.map(filter => filter.title).join(', ')
    }
  },
  watch: {
    activeFilters() {
      this.createChart()
    }
  },
  methods: {
    async setMomentsAndRanges() {
      const response = await fetch(`${this.fetchPrefix}events`)
      let events = await response.json()
      this.loading = false
      events = this.getFormattedEvents(events)

      // filter out ranges
      events.forEach(event => {
        if (event.end) {
          this.ranges.push(event)
        }
      })

      this.moments = events.filter(event => !event.end)

      this.setTagColors()
      this.selectAll()
      this.createChart()
      this.addClickListener()
    },
    getFormattedEvents(events) {
      return events.map(event => {
        return {
          id: event.id,
          name: event.name.toUpperCase(),
          start: event.start_date,
          end: event.end_date,
          img: event.image,
          embed_link: event.embed_link,
          description: event.description,
          y: event.name.toUpperCase(),
          x: event.start_date,
          main_tag: this.filters.find(filter => filter.value === event.main_tag_id.toString()).title,
          tags: event.tags ? event.tags.split(',').map(tagId => this.filters.find(filter => filter.value === tagId).title) : [],
          direction: Math.random() < 0.5 ? 'down' : 'up'
        }
      })
    },
    async setFilters() {
      await fetch(`${this.fetchPrefix}tags`)
        .then(response => response.json())
        .then(tags => {
          this.filters = tags.map(tag => {
            return {
              value: tag.id.toString(),
              title: tag.name
            }
          })
          this.setMomentsAndRanges()
        })
    },
    addClickListener() {
      this.chart.listen('pointClick', e => {
        const type = e.series.getType()
        this.openModal(e.pointIndex, type)
      })
    },
    setTagColors() {
      this.filters.forEach(filter => {
        this.tagColors[filter.title] = this.getRandomHexColor()
      })
    },
    getRandomHexColor() {
      const randomValue = () => Math.floor(Math.random() * 256) // Random value between 0 and 255
      const alpha = 0.5 // Fixed transparency (50%)
      return `rgba(${randomValue()}, ${randomValue()}, ${randomValue()}, ${alpha})`
    },
    selectAll() {
      if (this.activeFilters.length === this.filters.length) {
        this.activeFilters = []
      } else {
        this.activeFilters = this.filters.slice()
      }
    },
    toggleMap() {
      this.showMap = !this.showMap
    },
    openModal(index, eventType) {
      if (eventType === 'moment') {
        this.activeEvent = this.filteredMoments[index]
      } else {
        this.activeEvent = this.filteredRanges[index]
      }
      this.modalIsOpen = true
    },
    closeModal() {
      this.modalIsOpen = false
      this.activeEvent = null
    },
    createChart() {
      // if charts already have series, remove them
      if (this.chart) {
        this.chart.removeSeries(0)
        this.chart.removeSeries(1)
      }

      // Create a chart instance if necessary
      if (!this.chart) {
        this.chart = anychart.timeline()
      }

      // ADD DATA TO CHART
      //set moments
      const filteredMomentsWithColors = this.filteredMoments.map(moment => {
        return {
          ...moment,
          marker: {
            type: 'circle',
            size: 6,
            fill: this.tagColors[moment.main_tag],
            stroke: '1 black'
          }
        }
      })
      const moments = this.chart.moment(filteredMomentsWithColors)

      // set ranges
      const filteredRangesWithColors = this.filteredRanges.map(range => {
        return {
          ...range,
          fill: this.tagColors[range.main_tag],
          stroke: 'black'
        }
      })
      const ranges = this.chart.range(filteredRangesWithColors)

      // CHART CONFIGURATION

      // range labels
      ranges.labels().useHtml(true).fontColor('#fff').format('{%name}: from <span>{%start}{dateTimeFormat:YYYY}–{%end}{dateTimeFormat:YYYY}</span>')

      // moment tooltip
      var tooltip = moments.tooltip()
      tooltip.separator(false)
      this.chart.tooltip().fontFamily('Gill Sans').format('')

      // range tooltip
      const rangeTooltipFormat = 'From {%start}{dateTimeFormat:YYYY MMM dd} to {%end}{dateTimeFormat:YYYY MMM dd}</span>'
      ranges.tooltip().useHtml(true)
      ranges.tooltip().format(rangeTooltipFormat)
      ranges.tooltip().title().enabled(false)
      ranges.tooltip().separator().enabled(false)

      // scroll and interactivity
      this.chart.scroller(true)
      this.chart.interactivity().scrollOnMouseWheel(true)
      this.chart.interactivity().zoomOnMouseWheel(true)
      this.chart.interactivity({ selectionMode: 'none' })

      // x axis appearance
      this.chart.axis().labels().fontColor('black')
      this.chart.axis().labels().fontWeight('bold')
      this.chart.axis().labels().fontFamily('Gill Sans')
      this.chart.axis().labels().fontSize('1rem').position('center').anchor('center').padding(6, 0, 0, 0)
      this.chart.axis().height(30)

      // moments appearance
      moments.normal().stroke('black', 1)
      moments.hovered().stroke('black', 2)
      moments.labels().background().stroke('black').cornerType('round').corners(6)

      // years markers
      const colors = ['#6f97d1', '#9a75d1', '#345c2d', '#78cae3', '#3d1745', '#87f58c', '#4d2320']
      for (let i = 0; i < 7; i++) {
        const rangeMarker = this.chart.rangeMarker(i)
        rangeMarker.from(Date.UTC(1939 + i, 0, 1))
        rangeMarker.to(Date.UTC(1940 + 1, 0, 1))
        rangeMarker.fill(colors[i], 0.2)
        const textMarker = this.chart.textMarker(i)
        const rangeMarkerFromValue = rangeMarker.from()
        textMarker.value(rangeMarkerFromValue)
        textMarker.useHtml(true)
        textMarker.text(anychart.format.dateTime(rangeMarkerFromValue, 'y'))
        textMarker.fontColor('black')
        textMarker.fontWeight(600)
        textMarker.offsetX(-10)
        textMarker.offsetY(10)
      }

      // chart appearance
      this.chart.background().fill('transparent')
      this.chart.labels().fontFamily('Gill Sans').fontSize(14)

      // Set the container for the chart
      this.chart.container(this.$refs.chartContainer)

      // Draw the chart
      this.chart.draw()
    },
    isLoggedIn() {
      return localStorage.getItem('isLoggedInToTimeline') === 'true'
    }
  },
  created() {
    this.fetchPrefix = process.env.NODE_ENV === 'development' ? 'http://localhost:8787/' : '/'
    this.loading = true
    this.loggedIn = this.isLoggedIn()
    this.setFilters()
  }
}
</script>

<style lang="scss" scoped>
.hp_container {
  padding-top: 5rem;
  height: 100%;
  background-color: #c3c4c7;
}

.autocomplete_container {
  width: 24rem;
  margin: 3rem auto 2rem;
  display: flex;
  flex-direction: column;
  font-family: Gill Sans;

  .instructions {
    margin-bottom: 1.5rem;
    font-weight: bold;
    font-size: 16px;
    text-align: center;
  }

  :deep(.v-chip) {
    display: none;
  }

  :deep(.v-field__outline) {
    display: none;
  }

  .filters_list {
    color: black;
    font-family: Gill Sans;
    display: -webkit-box; /* Use a flex container with webkit box layout */
    -webkit-box-orient: vertical; /* Set the orientation to vertical */
    overflow: hidden; /* Hide overflow text */
    -webkit-line-clamp: 2; /* Limit to 2 lines */
    text-overflow: ellipsis;

    span {
      margin-left: 0.2rem;
    }
  }
}

.timeline_container {
  width: 90%;
  height: 500px;
  margin: auto auto;
}

.modal_content {
  font-family: Gill Sans;
  background-color: #fefefe;
  margin: 15% auto;
  padding: 20px;
  border: 1px solid #888;
  width: 100%;
  overflow-y: auto; /* Ensure the content area is scrollable */

  .modal_title {
    text-align: center;
  }
}

.map,
.map_btn {
  margin: 2rem auto;
  width: 100%;
}

.tag_text {
  font-size: 0.8rem !important;

  :deep(.v-chip__content) {
    color: black;
  }
}

.image {
  padding: 1.6rem 2.4rem;
  width: 100%;
  height: 100%;
  max-width: 45.2rem !important;
}

.loader {
  width: 200px;
  aspect-ratio: 1;
  display: grid;
  margin: 0 auto;
}
.loader::before,
.loader::after {
  content: '';
  grid-area: 1/1;
  --c: no-repeat radial-gradient(farthest-side, #25b09b 92%, #0000);
  background: var(--c) 50% 0, var(--c) 50% 100%, var(--c) 100% 50%, var(--c) 0 50%;
  background-size: 12px 12px;
  animation: l12 1s infinite;
}
.loader::before {
  margin: 4px;
  filter: hue-rotate(45deg);
  background-size: 8px 8px;
  animation-timing-function: linear;
}

@keyframes l12 {
  100% {
    transform: rotate(0.5turn);
  }
}

@media (max-width: 600px) {
  .autocomplete_container {
    padding-inline: 2rem;
  }
}
</style>
