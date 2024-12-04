<template>
  <div class="hp_container">
    <!-- AUTOCOMPLETE -->
    <div class="autocomplete_container">
      <div class="select_btn_container">
        <v-btn class="btn" rounded @click="selectAll">Select All</v-btn>
        <v-btn class="btn" rounded @click="deselectAll">Deselect All</v-btn>
      </div>
      <v-autocomplete v-model="activeFilters" label="Search" class="autocomplete" dense rounded return-object multiple chips bg-color="white" closable-chips :items="filters" />
      <p class="filters_list">Tags: {{ activeFiltersForDisplay }}</p>
    </div>

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

          <v-chip class="tag_text">Main Tag: {{ activeEvent.main_tag }}</v-chip>

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

      // Add data to the chart
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

      this.chart.axis().labels().fontColor('black')
      this.chart.axis().labels().fontWeight('bold')
      moments.normal().stroke('black', 1)

      // create two range markers
      var rangeMarker1 = this.chart.rangeMarker(0)
      var rangeMarker2 = this.chart.rangeMarker(1)
      var rangeMarker3 = this.chart.rangeMarker(2)
      var rangeMarker4 = this.chart.rangeMarker(3)
      var rangeMarker5 = this.chart.rangeMarker(4)
      var rangeMarker6 = this.chart.rangeMarker(5)
      var rangeMarker7 = this.chart.rangeMarker(6)

      // set the range of the markers
      rangeMarker1.from(Date.UTC(1939, 0, 1))
      rangeMarker1.to(Date.UTC(1940, 0, 1))
      rangeMarker2.from(Date.UTC(1940, 0, 1))
      rangeMarker2.to(Date.UTC(1941, 0, 1))
      rangeMarker3.from(Date.UTC(1941, 0, 1))
      rangeMarker3.to(Date.UTC(1942, 0, 1))
      rangeMarker4.from(Date.UTC(1942, 0, 1))
      rangeMarker4.to(Date.UTC(1943, 0, 1))
      rangeMarker5.from(Date.UTC(1943, 0, 1))
      rangeMarker5.to(Date.UTC(1944, 0, 1))
      rangeMarker6.from(Date.UTC(1944, 0, 1))
      rangeMarker6.to(Date.UTC(1945, 0, 1))
      rangeMarker7.from(Date.UTC(1945, 0, 1))
      rangeMarker7.to(Date.UTC(1946, 0, 1))

      // set the fill of markers
      rangeMarker1.fill('#6f97d1', 0.2)
      rangeMarker2.fill('#9a75d1', 0.2)
      rangeMarker3.fill('#345c2d', 0.2)
      rangeMarker4.fill('#78cae3', 0.2)
      rangeMarker5.fill('#3d1745', 0.2)
      rangeMarker6.fill('#87f58c', 0.2)
      rangeMarker7.fill('#4d2320', 0.2)

      var textMarker1 = this.chart.textMarker(0)
      var textMarker2 = this.chart.textMarker(1)
      var textMarker3 = this.chart.textMarker(2)
      var textMarker4 = this.chart.textMarker(3)
      var textMarker5 = this.chart.textMarker(4)
      var textMarker6 = this.chart.textMarker(5)
      var textMarker7 = this.chart.textMarker(6)

      // get the 'from' values of line markers
      var rangeMarker1FromValue = rangeMarker1.from()
      var rangeMarker2FromValue = rangeMarker2.from()
      var rangeMarker3FromValue = rangeMarker3.from()
      var rangeMarker4FromValue = rangeMarker4.from()
      var rangeMarker5FromValue = rangeMarker5.from()
      var rangeMarker6FromValue = rangeMarker6.from()
      var rangeMarker7FromValue = rangeMarker7.from()

      // set the values of text markers
      textMarker1.value(rangeMarker1FromValue)
      textMarker2.value(rangeMarker2FromValue)
      textMarker3.value(rangeMarker3FromValue)
      textMarker4.value(rangeMarker4FromValue)
      textMarker5.value(rangeMarker5FromValue)
      textMarker6.value(rangeMarker6FromValue)
      textMarker7.value(rangeMarker7FromValue)

      textMarker1.useHtml(true)
      textMarker1.text(anychart.format.dateTime(rangeMarker1FromValue, 'y'))
      textMarker2.useHtml(true)
      textMarker2.text(anychart.format.dateTime(rangeMarker2FromValue, 'y'))
      textMarker3.useHtml(true)
      textMarker3.text(anychart.format.dateTime(rangeMarker3FromValue, 'y'))
      textMarker4.useHtml(true)
      textMarker4.text(anychart.format.dateTime(rangeMarker4FromValue, 'y'))
      textMarker5.useHtml(true)
      textMarker5.text(anychart.format.dateTime(rangeMarker5FromValue, 'y'))
      textMarker6.useHtml(true)
      textMarker6.text(anychart.format.dateTime(rangeMarker6FromValue, 'y'))
      textMarker7.useHtml(true)
      textMarker7.text(anychart.format.dateTime(rangeMarker7FromValue, 'y'))

      this.chart.axis().labels().fontFamily('Gill Sans')

      var tooltip = moments.tooltip()
      tooltip.separator(false)
      this.chart.tooltip().fontFamily('Gill Sans').format('')
      this.chart.background().fill('transparent')
      this.chart.labels().fontFamily('Gill Sans').fontSize(14)

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
</style>
