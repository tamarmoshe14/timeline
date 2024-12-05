<template>
  <div class="hp_container">
    <!-- AUTOCOMPLETE -->
    <div class="autocomplete_container">
      <div class="select_btn_container">
        <v-btn class="btn" rounded @click="selectAll">Select All</v-btn>
        <v-btn class="btn" rounded @click="deselectAll">Deselect All</v-btn>
      </div>
      <v-autocomplete v-model="activeFilters" label="Search" class="autocomplete" dense rounded return-object multiple chips bg-color="white" closable-chips :items="filters" />
      <p v-if="!loading" class="filters_list">Tags: {{ activeFiltersForDisplay }}</p>
    </div>

    <!-- LOADER -->
    <div v-if="loading" class="loader" />

    <!-- TIMELINE -->
    <div ref="chartContainer" class="timeline_container" />

    <!-- MODAL -->
    <v-dialog v-if="activeEvent" v-model="modalIsOpen" class="event_modal" max-width="600">
      <template #default>
        <div class="modal_content">
          <h2 class="modal_title">{{ activeEvent.y || activeEvent.name }}</h2>
          <p>{{ activeEvent.description }}</p>
          <img v-if="activeEvent.img" class="image" :src="`http://localhost:8787/image/${activeEvent.img}`" width="200" height="200" />
          <v-btn v-if="activeEvent.embed_link" class="map_btn" @click="toggleMap">{{ showMap ? 'Close Location' : 'See Location' }} -></v-btn>
          <iframe v-if="activeEvent.embed_link && showMap" class="map" :src="activeEvent.embed_link" width="400" height="450" style="border: 0" allowfullscreen="true" loading="lazy" referrerpolicy="no-referrer-when-downgrade" />

          <v-chip class="tag_text" :color="tagColors[activeEvent.main_tag]" variant="flat">Main Tag: {{ activeEvent.main_tag }}</v-chip>

          <v-card-actions>
            <v-spacer />
            <v-btn text="Close" @click="closeModal" />
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
      loading: false
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
    activeFiltersForDisplay() {
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
      const response = await fetch('http://localhost:8787/')
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
      await fetch('http://localhost:8787/tags')
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
      this.activeFilters = [...this.filters]
    },
    deselectAll() {
      this.activeFilters = []
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
    }
  },
  created() {
    this.loading = true
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
  width: 20rem;
  margin: 3rem auto 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  font-family: Gill Sans;

  ::v-deep .v-chip {
    display: none;
  }

  ::v-deep .v-label {
    font-size: 1.6rem;
  }

  ::v-deep .v-field__outline {
    display: none;
  }

  .select_btn_container {
    display: flex;
    justify-content: space-between;
    width: 100%;
  }

  .filters_list {
    color: white;
    font-family: Gill Sans;
    display: -webkit-box; /* Use a flex container with webkit box layout */
    -webkit-box-orient: vertical; /* Set the orientation to vertical */
    overflow: hidden; /* Hide overflow text */
    -webkit-line-clamp: 2; /* Limit to 2 lines */
    text-overflow: ellipsis;
  }
}

.btn {
  font-family: Gill Sans;
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
</style>
