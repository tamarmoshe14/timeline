<template>
  <div class="hp_container">
    <!-- AUTOCOMPLETE -->
    <div class="autocomplete_container">
      <div class="select_btn_container">
        <v-btn @click="selectAll">Select All</v-btn>
        <v-btn @click="deselectAll">Deselect All</v-btn>
      </div>
      <v-autocomplete v-model="activeFilters" label="Search" multiple chips closable-chips :items="filters" />
      <p class="filters_list">Tags: {{ activeFilters.join(', ') }}</p>
    </div>

    <!-- TIMELINE -->
    <div ref="chartContainer" class="timeline_container" />

    <!-- MODAL -->
    <v-dialog v-if="activeEvent" v-model="modalIsOpen" class="event_modal" max-width="500">
      <template #default>
        <div class="modal_content">
          <h2>{{ activeEvent.y }}</h2>
          <p>{{ activeEvent.description }}</p>
          <img v-if="activeEvent.img" class="image" :src="activeEvent.img" width="200" height="200" />
          <v-btn v-if="activeEvent.location" class="map_btn" @click="toggleMap">{{ showMap ? 'Close Location' : 'See Location' }} -></v-btn>
          <iframe v-if="activeEvent.location && showMap" class="map" :src="activeEvent.location" width="400" height="450" style="border: 0" allowfullscreen="true" loading="lazy" referrerpolicy="no-referrer-when-downgrade" />

          <p class="tag_text">Main Tag: {{ activeEvent.main_tag }}</p>

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
      tagColors: {}
    }
  },
  computed: {
    filteredMoments() {
      const filteredMoments = []

      this.activeFilters.forEach(filter => {
        const momentsPerFilter = this.moments.filter(moment => {
          return moment.tags.includes(filter)
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
          return range.tags.includes(filter)
        })

        rangesPerFilter.forEach(range => {
          if (!filteredRanges.includes(range)) {
            filteredRanges.push(range)
          }
        })
      })

      return filteredRanges.flat()
    },
    filters() {
      const filtersWithDuplicates = []
      const filtersObj = {}

      this.moments.forEach(moment => filtersWithDuplicates.push(...moment.tags))
      this.ranges.forEach(range => filtersWithDuplicates.push(...range.tags))

      filtersWithDuplicates.forEach(filter => (filtersObj[filter] = true))

      return Object.keys(filtersObj).sort()
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
      const events = await response.json()

      // filter out ranges
      events.forEach(event => {
        if (event.start) {
          this.ranges.push(event)
        }
      })

      this.moments = events.filter(event => !event.start)

      this.setTagColors()
      this.selectAll()
      this.createChart()
      this.addClickListener()
    },
    addClickListener() {
      this.chart.listen('pointClick', e => {
        const type = e.series.getType()
        if (type === 'moment') {
          this.openModal(e.pointIndex)
        }
      })
    },
    setTagColors() {
      this.filters.forEach(filter => {
        this.tagColors[filter] = this.getRandomHexColor()
      })
    },
    getRandomHexColor() {
      const randomColor = Math.floor(Math.random() * 16777215).toString(16)
      return `#${randomColor.padStart(6, '0')}`
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
    addFilter(newVal) {
      this.activeFilters.push(newVal)
    },
    openModal(index) {
      this.modalIsOpen = true
      this.activeEvent = this.filteredMoments[index]
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

      // Add data to the chart

      //set moments
      const filteredMomentsWithColors = this.filteredMoments.map(moment => {
        return {
          ...moment,
          marker: {
            type: 'circle',
            size: 8,
            fill: this.tagColors[moment.main_tag],
            stroke: '1 #000'
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

      // range tooltip
      const rangeTooltipFormat = "<span style='font-weight:600;font-size:10pt'>" + '{%name}</span><br><br>From ' + '{%start}{dateTimeFormat:YYYY MMM dd} to ' + '{%end}{dateTimeFormat:YYYY MMM dd}</span>'
      ranges.tooltip().useHtml(true)
      ranges.tooltip().format(rangeTooltipFormat)
      ranges.tooltip().title().enabled(false)
      ranges.tooltip().separator().enabled(false)

      // add more configuration to the chart
      this.chart.scroller(true)
      this.chart.interactivity({ selectionMode: 'none' })
      var tooltip = moments.tooltip()
      tooltip.separator(false)
      this.chart.tooltip().format('')

      // Set the container for the chart
      this.chart.container(this.$refs.chartContainer)

      // Draw the chart
      this.chart.draw()
    }
  },
  created() {
    this.setMomentsAndRanges()
  }
}
</script>

<style lang="scss" scoped>
.hp_container {
  margin: auto 0;
  padding: 2rem;
}

.autocomplete_container {
  width: 20rem;
  margin: 3rem auto 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  ::v-deep .v-chip {
    display: none;
  }

  .select_btn_container {
    display: flex;
    justify-content: space-between;
    width: 100%;
  }

  .filters_list {
    display: -webkit-box; /* Use a flex container with webkit box layout */
    -webkit-box-orient: vertical; /* Set the orientation to vertical */
    overflow: hidden; /* Hide overflow text */
    -webkit-line-clamp: 2; /* Limit to 2 lines */
    text-overflow: ellipsis;
  }
}

.timeline_container {
  width: 100%;
  height: 400px;
  margin: auto auto;
}

.modal_content {
  background-color: #fefefe;
  margin: 15% auto;
  padding: 20px;
  border: 1px solid #888;
  width: 100%;
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
</style>
