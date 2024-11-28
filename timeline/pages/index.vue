<template>
  <div class="hp_container">
    <!-- AUTOCOMPLETE -->
    <v-autocomplete v-model="filter" class="autocomplete" label="Search" :items="filters" />

    <!-- FILTERS -->
    <v-chip v-for="tag in activeFilters" :key="tag">
      {{ tag }}
      <v-icon icon="mdi-close" end @click="removeFilterFromActiveFilters(tag)" />
    </v-chip>

    <!-- TIMELINE -->
    <div ref="chartContainer" class="timeline_container" />

    <!-- MODAL -->
    <v-dialog v-if="activeEvent" v-model="modalIsOpen" max-width="500">
      <template #default>
        <v-card :title="activeEvent.title">
          <v-card-text> {{ activeEvent.description }} </v-card-text>
          <img v-if="activeEvent.img" class="image" :src="activeEvent.img" />
          <v-card-text class="tag_text"> Main Tag: {{ activeEvent.main_tag }}</v-card-text>

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
import anychart from 'anychart'

export default {
  name: 'Timeline',
  data() {
    return {
      modalIsOpen: false,
      filter: null,
      activeFilters: [],
      moments: [],
      ranges: [],
      activeEvent: null,
      chart: null
    }
  },
  computed: {
    filteredMoments() {
      if (!this.activeFilters.length) {
        return this.moments
      }

      const filteredMoments = []

      this.activeFilters.forEach(filter => {
        const momentsPerFilter = this.moments.filter(moment => {
          return moment.tags.includes(filter)
        })

        filteredMoments.push(momentsPerFilter)
      })

      return filteredMoments.flat()
    },
    filteredRanges() {
      if (!this.activeFilters.length) {
        return this.ranges
      }

      const filteredRanges = []

      this.activeFilters.forEach(filter => {
        const rangesPerFilter = this.ranges.filter(range => {
          return range.tags.includes(filter)
        })

        filteredRanges.push(rangesPerFilter)
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
    },
    tagColors() {
      const colorsObj = {}
      this.filters.forEach(filter => {
        colorsObj[filter] = this.getRandomHexColor()
      })
      return colorsObj
    }
  },
  watch: {
    filter(newVal) {
      this.addFilter(newVal)
      this.createChart()
    },
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

      this.createChart()

      // should this sit here? is the indexing after filtering correct?
      this.chart.listen('pointClick', e => {
        console.log('click', e)
        const type = e.series.getType()
        if (type === 'moment') {
          this.openModal(e.pointIndex)
        }
      })
    },
    getRandomHexColor() {
      const randomColor = Math.floor(Math.random() * 16777215).toString(16)
      return `#${randomColor.padStart(6, '0')}`
    },
    addFilter(newVal) {
      this.activeFilters.push(newVal)
    },
    removeFilterFromActiveFilters(tag) {
      this.activeFilters = this.activeFilters.filter(item => item !== tag)
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
      // Create a chart instance if necessary
      if (!this.chart) {
        this.chart = anychart.timeline()
      }

      if (this.chart) {
        this.chart.removeSeries(0)
        this.chart.removeSeries(1)
      }

      // Add data to the chart
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
      this.chart.range(this.filteredRanges)

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
}

.autocomplete {
  width: 20rem;
  margin: 0 auto 10rem;
}

.timeline_container {
  width: 100%;
  height: 400px;
  margin: auto auto;
}

// .btn_container {
//   display: inline-block;
//   transition: transform 0.3s ease;
//   &:hover {
//     background: radial-gradient(#f1eaea 1rem, transparent);
//     transform: scale(1.2);
//     border-radius: 50%;
//   }
// }

// .event_title {
//   font-size: 1.8rem;
// }

// .description {
//   display: -webkit-box;
//   -webkit-box-orient: vertical;
//   overflow: hidden;
//   -webkit-line-clamp: 2;
//   text-overflow: ellipsis;
//   max-width: 20rem;
// }

.tag_text {
  font-size: 0.8rem !important;
}

.image {
  max-width: 30rem;
}
</style>
