# Below the Surface

Kevin and Michael, CCT 360, Designing With Data

We built an interactive time-and-depth view of recent earthquakes. We wanted visitors to see how earthquakes differ in magnitude and how far below the catalog's reference level they occur. Each circle represents one reported earthquake, with the occurrence time along the horizontal axis and the catalog depth along the vertical axis.

[Explore the live project](https://kai667788.github.io/below-the-surface/)

## Exploring the experience

1. Choose **Past 24 hours** or **Past 7 days** to request a USGS GeoJSON feed.
2. Choose a **Minimum magnitude** to focus the field on M2.5+ or M4.5+ earthquakes.
3. Select an event circle to see its details and hear a short rumble. Use **Older** and **Newer** to browse events even where circles overlap. Use Tab to enter the field and the arrow keys to move between events.
4. Use **Refresh feed** to request the latest available snapshot.

To run the project locally, open `index.html` in a browser while connected to the internet. The site uses plain HTML, CSS, and JavaScript.

## How data shapes the interface

| USGS field | Visual or interactive result |
| --- | --- |
| `properties.time` | Horizontal position within the selected time window |
| `geometry.coordinates[2]` | Vertical position and color according to the depth ranges in the plot key |
| `properties.mag` | Circle size, shake distance, minimum-magnitude filtering, and rumble volume and playback speed |
| `properties.place`, `magType`, `status` | The selected event's details |
| `metadata.generated` | The displayed feed snapshot time and the right edge of the time window |

The depth scale fits the valid events in the selected time window and stays stable while filtering by magnitude. We preserve reported negative depth values. Larger magnitudes make circles shake farther and make the rumble louder and faster, up to limits set in the script.

## Source files and course techniques

- `index.html` structures the controls, plot, event details, and audio element.
- `styles.css` sets the responsive layout and defines the CSS shake animation.
- `script.js` fetches JSON and uses conditions, loops, and click listeners to update the plot. It sets the audio element's volume and playback rate using the approach from Class 8.
- `rumble.wav` contains the original synthesized sound used when visitors activate a circle.

## Data and interpretation

We use two USGS M2.5+ feeds. The documentation defines the fields and update cadence. Each event's own USGS page provides its source record. [Past-day feed](https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson), [past-week feed](https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson), [GeoJSON documentation](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php)

The field combines worldwide events on a time-and-depth display. Catalog measurements and review status can change as USGS revises events. Detection coverage varies by region. Events with missing essential plotting values are excluded and counted in the interface.

## Credits

The U.S. Geological Survey provides the earthquake data and explains the depth reference. [USGS Earthquake Hazards Program](https://earthquake.usgs.gov/), [USGS depth documentation](https://www.usgs.gov/faqs/what-reference-datum-used-earthquake-depths)

Rumble audio synthesized for this project.

The interface uses DM Sans from Google Fonts under the SIL Open Font License. [DM Sans license](https://github.com/google/fonts/blob/main/ofl/dmsans/OFL.txt)
