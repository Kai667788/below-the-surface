# Below the Surface

Kevin and Michael · CCT 360 · Designing With Data

We built an interactive time-and-depth view of recent earthquakes. We wanted visitors to see how earthquakes differ in magnitude and how far below the catalog's reference level they occur. Each circle represents one reported earthquake, with the occurrence time along the horizontal axis and the catalog depth along the vertical axis.

[Explore the live project](https://kai667788.github.io/below-the-surface/)

## Exploring the experience

1. Choose **Past 24 hours** or **Past 7 days** to request a USGS GeoJSON feed.
2. Choose a **Minimum magnitude** to focus the field on M2.5+ or M4.5+ earthquakes.
3. Select an event circle to see its place, magnitude, time, depth, and catalog status. Keyboard users can focus the event buttons and activate them with Enter or Space.
4. Use **Refresh feed** to request the latest available snapshot.

To run the project locally, open `index.html` in a browser while connected to the internet. The site uses plain HTML, CSS, and JavaScript.

## How data shapes the interface

| USGS field | Visual or interactive result |
| --- | --- |
| `properties.time` | Horizontal position within the selected time window |
| `geometry.coordinates[2]` | Vertical position on the depth axis and depth-based symbol color |
| `properties.mag` | Symbol diameter and magnitude-filter inclusion |
| `properties.place`, `magType`, `status` | The selected event's details |
| `metadata.generated` | The displayed feed snapshot time and the right edge of the time window |

The depth scale fits the valid events in the selected time window and stays stable while filtering by magnitude. We preserve reported negative depth values. Circle sizes use a visual scale so events remain selectable.

## Source files and course techniques

- `index.html` structures the controls, plot, event details, and explanation.
- `styles.css` sets the visual language and responsive layout.
- `script.js` fetches JSON, processes the event array with conditions and loops, and updates DOM elements and CSS. Functions share the same calculations across the controls.

## Data and interpretation

We use the USGS M2.5+ [past-day feed](https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson) and [past-week feed](https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson). The [GeoJSON documentation](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php) defines the fields and feed update cadence. Each event's own USGS page provides its source record.

The field combines worldwide events on a time-and-depth display. Catalog measurements and review status can change as USGS revises events. Detection coverage varies by region. Events with missing essential plotting values are excluded and counted in the interface.

## Credits

Earthquake data and documentation by the [U.S. Geological Survey](https://earthquake.usgs.gov/). Depth references and depth reporting are explained in [USGS depth documentation](https://www.usgs.gov/faqs/what-reference-datum-used-earthquake-depths).

We use [DM Sans](https://fonts.google.com/specimen/DM+Sans) and [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) from Google Fonts. Both use the SIL Open Font License ([DM Sans license](https://github.com/google/fonts/blob/main/ofl/dmsans/OFL.txt), [Instrument Serif license](https://github.com/google/fonts/blob/main/ofl/instrumentserif/OFL.txt)).

