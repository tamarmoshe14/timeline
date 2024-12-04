<template>
  <div class="hp_container">
    <!-- AUTOCOMPLETE -->
    <div class="autocomplete_container">
      <div class="select_btn_container">
        <v-btn @click="selectAll">Select All</v-btn>
        <v-btn @click="deselectAll">Deselect All</v-btn>
      </div>
      <v-autocomplete v-model="activeFilters" label="Search" return-object multiple chips closable-chips :items="filters" />
      <p class="filters_list">Tags: {{ activeFiltersForDisplay }}</p>
    </div>

    <!-- TIMELINE -->
    <div ref="chartContainer" class="timeline_container" />

    <!-- MODAL -->
    <v-dialog v-if="activeEvent" v-model="modalIsOpen" class="event_modal" max-width="500">
      <template #default>
        <div class="modal_content">
          <h2>{{ activeEvent.y || activeEvent.name }}</h2>
          <p>{{ activeEvent.description }}</p>
          <img v-if="activeEvent.img" class="image" :src="`http://localhost:8787/image/${activeEvent.img}`" width="200" height="200" />
          <v-btn v-if="activeEvent.embed_link" class="map_btn" @click="toggleMap">{{ showMap ? 'Close Location' : 'See Location' }} -></v-btn>
          <iframe v-if="activeEvent.embed_link && showMap" class="map" :src="activeEvent.embed_link" width="400" height="450" style="border: 0" allowfullscreen="true" loading="lazy" referrerpolicy="no-referrer-when-downgrade" />

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
      tagColors: {},
      filters: []
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
          name: event.name,
          start: event.start_date,
          end: event.end_date,
          img: event.image,
          embed_link: event.embed_link,
          description: event.description,
          y: event.name,
          x: event.start_date,
          main_tag: this.filters.find(filter => filter.value === event.main_tag_id.toString()).title,
          tags: event.tags ? event.tags.split(',').map(tagId => this.filters.find(filter => filter.value === tagId).title) : []
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

      // range labels
      ranges.labels().useHtml(true).fontColor('#fff').format('{%name}: from <span>{%start}{dateTimeFormat:YYYY}–{%end}{dateTimeFormat:YYYY}</span>')

      // range tooltip
      const rangeTooltipFormat = 'From {%start}{dateTimeFormat:YYYY MMM dd} to {%end}{dateTimeFormat:YYYY MMM dd}</span>'
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
    this.setFilters()
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
