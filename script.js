const feedBase = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/';
const hourMs = 60 * 60 * 1000;
const timeWindows = {
    day: { file: '2.5_day.geojson', duration: 24 * hourMs, start: '24 h ago', middle: '12 h ago', label: 'the past 24 hours' },
    week: { file: '2.5_week.geojson', duration: 7 * 24 * hourMs, start: '7 d ago', middle: '3.5 d ago', label: 'the past 7 days' }
};

const periodSelect = document.querySelector('#period');
const magnitudeFilter = document.querySelector('#magnitude-filter');
const refreshButton = document.querySelector('#refresh');
const statusText = document.querySelector('#data-status');
const dataNote = document.querySelector('#data-note');
const snapshotTime = document.querySelector('#snapshot-time');
const eventCount = document.querySelector('#event-count');
const largestMagnitude = document.querySelector('#largest-magnitude');
const deepestEvent = document.querySelector('#deepest-event');
const timeStart = document.querySelector('#time-start');
const timeMiddle = document.querySelector('#time-middle');
const depthAxis = document.querySelector('#depth-axis');
const gridLines = document.querySelector('#grid-lines');
const surfaceLine = document.querySelector('#surface-line');
const points = document.querySelector('#points');
const plotMessage = document.querySelector('#plot-message');
const detailMagnitude = document.querySelector('#detail-magnitude');
const magnitudeType = document.querySelector('#magnitude-type');
const eventPlace = document.querySelector('#event-place');
const eventDepth = document.querySelector('#event-depth');
const eventTime = document.querySelector('#event-time');
const eventStatus = document.querySelector('#event-status');
const negativeDepthNote = document.querySelector('#negative-depth-note');
const eventLink = document.querySelector('#event-link');
const olderButton = document.querySelector('#older-event');
const newerButton = document.querySelector('#newer-event');
const eventPosition = document.querySelector('#event-position');
const selectionUpdate = document.querySelector('#selection-update');

let feed = null;
let visibleEvents = [];
let pointButtons = [];
let selectedIndex = -1;
let requestNumber = 0;

function utcLabel(time) {
    // GeoJSON supplies milliseconds since the Unix epoch.
    const date = new Date(time).toISOString();
    return `${date.slice(0, 10)} · ${date.slice(11, 16)}`;
}

function validTimestamp(time) {
    return Number.isFinite(time) && time > 0 && time <= 8640000000000000;
}

function depthLabel(depth) {
    const rounded = Math.floor(depth * 100 + 0.5) / 100;
    if (depth < 0 && rounded === 0) return 'Just above 0 km';
    return `${rounded} km`;
}

function countLabel(count) {
    if (count === 1) return '1 USGS-reported earthquake';
    return `${count} USGS-reported earthquakes`;
}

function catalogEvent(feature) {
    const properties = feature.properties;
    const geometry = feature.geometry;
    if (!geometry || geometry.type !== 'Point' || !geometry.coordinates) return null;

    const depth = geometry.coordinates[2];
    if (!Number.isFinite(depth) || !Number.isFinite(properties.mag) || !validTimestamp(properties.time)) return null;

    return {
        id: feature.id,
        magnitude: properties.mag,
        magnitudeType: properties.magType,
        place: properties.place,
        status: properties.status,
        time: properties.time,
        depth: depth,
        url: properties.url
    };
}

function processFeed(data, period) {
    if (!data || !data.metadata || !validTimestamp(data.metadata.generated) || !Array.isArray(data.features)) {
        throw new Error('USGS feed did not contain a valid snapshot');
    }

    const endTime = data.metadata.generated;
    const startTime = endTime - timeWindows[period].duration;
    const events = [];
    let omitted = 0;
    let shallowest = 0;
    let deepest = 0;
    for (let i = 0; i < data.features.length; i++) {
        const feature = data.features[i];
        if (!feature || !feature.properties || feature.properties.type !== 'earthquake') continue;

        const earthquake = catalogEvent(feature);
        if (!earthquake) {
            omitted = omitted + 1;
            continue;
        }
        if (earthquake.time < startTime || earthquake.time > endTime) continue;

        events.push(earthquake);
        shallowest = Math.min(shallowest, earthquake.depth);
        deepest = Math.max(deepest, earthquake.depth);
    }

    events.sort(function (first, second) { return first.time - second.time; });

    const topDepth = Math.floor(shallowest / 10) * 10;
    let bottomDepth = Math.floor(deepest / 100) * 100;
    if (bottomDepth < deepest) bottomDepth = bottomDepth + 100;
    bottomDepth = Math.max(100, bottomDepth);
    return { period: period, startTime: startTime, endTime: endTime, events: events, omitted: omitted, topDepth: topDepth, bottomDepth: bottomDepth };
}

function depthPosition(depth, top, bottom) {
    return (depth - top) / (bottom - top) * 100;
}

function addDepthTick(depth, top, bottom, showLabel) {
    const position = `${depthPosition(depth, top, bottom)}%`;
    const line = document.createElement('div');
    line.className = 'grid-line';
    line.style.top = position;
    gridLines.appendChild(line);

    if (showLabel) {
        const label = document.createElement('span');
        label.className = 'depth-tick';
        label.style.top = position;
        label.textContent = depth;
        depthAxis.appendChild(label);
    }
}

function drawDepthScale(top, bottom) {
    gridLines.textContent = '';
    depthAxis.textContent = '';
    surfaceLine.style.top = `${depthPosition(0, top, bottom)}%`;

    if (top < 0) addDepthTick(top, top, bottom, true);
    for (let i = 0; i <= 4; i++) {
        const depth = bottom * i / 4;
        // At shallow negative values the line still labels zero inside the plot.
        const showLabel = depth > 0 || top === 0 || depthPosition(0, top, bottom) >= 7;
        addDepthTick(depth, top, bottom, showLabel);
    }
}

function renderDetails(earthquake) {
    detailMagnitude.textContent = '—';
    magnitudeType.textContent = '';
    eventPlace.textContent = 'Choose an event in the field';
    eventDepth.textContent = '—';
    eventTime.textContent = '—';
    eventStatus.textContent = '—';
    negativeDepthNote.hidden = true;
    eventLink.hidden = true;
    if (!earthquake) return;

    detailMagnitude.textContent = `M ${earthquake.magnitude}`;
    magnitudeType.textContent = earthquake.magnitudeType || '';
    eventPlace.textContent = earthquake.place || 'Location unavailable';
    eventDepth.textContent = depthLabel(earthquake.depth);
    eventTime.textContent = utcLabel(earthquake.time);
    eventStatus.textContent = earthquake.status || 'Unavailable';
    negativeDepthNote.hidden = earthquake.depth >= 0;
    if (typeof earthquake.url === 'string' && earthquake.url.startsWith('https://earthquake.usgs.gov/earthquakes/eventpage/')) {
        eventLink.href = earthquake.url;
        eventLink.hidden = false;
    }
}

function selectEvent(index) {
    if (index === selectedIndex || index < 0 || index >= visibleEvents.length) return;
    if (selectedIndex >= 0) {
        pointButtons[selectedIndex].tabIndex = -1;
        pointButtons[selectedIndex].setAttribute('aria-pressed', 'false');
    }

    selectedIndex = index;
    const selectedButton = pointButtons[index];
    selectedButton.tabIndex = 0;
    selectedButton.setAttribute('aria-pressed', 'true');
    renderDetails(visibleEvents[index]);
    eventPosition.textContent = `${index + 1} of ${visibleEvents.length}`;
    selectionUpdate.textContent = `Selected earthquake ${eventPosition.textContent}. ${selectedButton.getAttribute('aria-label')}.`;
    olderButton.disabled = index === 0;
    newerButton.disabled = index === visibleEvents.length - 1;
}

function selectPoint(event) {
    selectEvent(Number(event.currentTarget.value));
}

function handlePointKey(event) {
    let nextIndex = selectedIndex;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = selectedIndex - 1;
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = selectedIndex + 1;
    } else if (event.key === 'Home') {
        nextIndex = 0;
    } else if (event.key === 'End') {
        nextIndex = pointButtons.length - 1;
    } else {
        return;
    }
    event.preventDefault();
    if (nextIndex >= 0 && nextIndex < pointButtons.length) pointButtons[nextIndex].focus();
}

function drawPoint(earthquake, index) {
    const point = document.createElement('button');
    point.type = 'button';
    point.className = 'point';
    if (earthquake.depth >= 300) {
        point.className = 'point deep';
    } else if (earthquake.depth >= 70) {
        point.className = 'point middle';
    }
    point.value = index;
    point.tabIndex = -1;
    point.setAttribute('aria-pressed', 'false');
    const place = earthquake.place || 'Location unavailable';
    const label = `Magnitude ${earthquake.magnitude}, ${place}, catalog depth ${depthLabel(earthquake.depth)}, ${utcLabel(earthquake.time)} UTC`;
    point.setAttribute('aria-label', label);
    point.title = label;

    const timePosition = (earthquake.time - feed.startTime) / (feed.endTime - feed.startTime) * 100;
    const diameter = 9 + 4 * earthquake.magnitude;
    point.style.left = `${timePosition}%`;
    point.style.top = `${depthPosition(earthquake.depth, feed.topDepth, feed.bottomDepth)}%`;
    point.style.width = `${diameter}px`;
    point.style.height = `${diameter}px`;
    point.addEventListener('click', selectPoint);
    point.addEventListener('focus', selectPoint);
    point.addEventListener('keydown', handlePointKey);
    points.appendChild(point);
    pointButtons.push(point);
}

function resetPointSelection() {
    selectedIndex = -1;
    pointButtons = [];
    visibleEvents = [];
    points.textContent = '';
    renderDetails(null);
    eventPosition.textContent = '—';
    selectionUpdate.textContent = '';
    olderButton.disabled = true;
    newerButton.disabled = true;
    largestMagnitude.textContent = '—';
    deepestEvent.textContent = '—';
}

function renderField() {
    if (!feed) return;
    let previousEventId = '';
    if (selectedIndex >= 0) previousEventId = visibleEvents[selectedIndex].id;
    resetPointSelection();
    drawDepthScale(feed.topDepth, feed.bottomDepth);

    const threshold = Number(magnitudeFilter.value);
    let previousIndex = -1;
    let maxMagnitude = 0;
    let maxDepth = 0;
    for (let i = 0; i < feed.events.length; i++) {
        const earthquake = feed.events[i];
        if (earthquake.magnitude < threshold) continue;

        const index = visibleEvents.length;
        if (index === 0) maxDepth = earthquake.depth;
        if (previousEventId && earthquake.id === previousEventId) previousIndex = index;
        maxDepth = Math.max(maxDepth, earthquake.depth);
        maxMagnitude = Math.max(maxMagnitude, earthquake.magnitude);
        visibleEvents.push(earthquake);
        drawPoint(earthquake, index);
    }

    const count = visibleEvents.length;
    eventCount.textContent = count;
    plotMessage.hidden = count > 0;
    if (count === 0) {
        plotMessage.textContent = 'No earthquakes match this time window and magnitude filter.';
        return;
    }
    largestMagnitude.textContent = `M ${maxMagnitude}`;
    deepestEvent.textContent = depthLabel(maxDepth);
    if (previousIndex >= 0) {
        selectEvent(previousIndex);
    } else {
        selectEvent(count - 1);
    }
}

function updateMagnitudeFilter() {
    renderField();
    if (!feed || statusText.className === 'data-status error' || refreshButton.disabled) return;
    statusText.textContent = `Showing ${countLabel(visibleEvents.length)} at M ${magnitudeFilter.value}+.`;
}

async function loadFeed() {
    const period = periodSelect.value;
    const windowDetails = timeWindows[period];
    requestNumber = requestNumber + 1;
    const thisRequest = requestNumber;

    if (!feed || feed.period !== period) {
        feed = null;
        resetPointSelection();
        drawDepthScale(0, 100);
        eventCount.textContent = '—';
        snapshotTime.textContent = 'Waiting for the feed snapshot';
        plotMessage.hidden = false;
        plotMessage.textContent = 'Loading the earthquake field…';
        dataNote.textContent = '';
    }
    timeStart.textContent = windowDetails.start;
    timeMiddle.textContent = windowDetails.middle;
    refreshButton.disabled = true;
    statusText.className = 'data-status';
    statusText.textContent = `Loading USGS data for ${windowDetails.label}…`;

    try {
        const response = await fetch(feedBase + windowDetails.file);
        if (!response.ok) throw new Error('USGS request failed');
        const data = await response.json();
        if (thisRequest !== requestNumber) return;

        feed = processFeed(data, period);
        snapshotTime.textContent = `Snapshot ${utcLabel(feed.endTime)} UTC`;
        renderField();
        statusText.textContent = `Showing ${countLabel(visibleEvents.length)} at M ${magnitudeFilter.value}+.`;
        dataNote.textContent = '';
        if (feed.omitted === 1) {
            dataNote.textContent = 'One earthquake record has missing plotting values and does not appear in the field.';
        } else if (feed.omitted > 1) {
            dataNote.textContent = `${feed.omitted} earthquake records have missing plotting values and do not appear in the field.`;
        }
    } catch (error) {
        if (thisRequest !== requestNumber) return;
        statusText.className = 'data-status error';
        if (feed) {
            statusText.textContent = 'Refresh failed. The last available snapshot is still shown. Try Refresh feed again.';
        } else {
            statusText.textContent = 'Could not reach the USGS feed. Try Refresh feed again.';
            snapshotTime.textContent = 'Feed snapshot unavailable';
            plotMessage.textContent = 'The USGS earthquake feed is unavailable.';
        }
    }
    refreshButton.disabled = false;
}

olderButton.addEventListener('click', function () { selectEvent(selectedIndex - 1); });
newerButton.addEventListener('click', function () { selectEvent(selectedIndex + 1); });
periodSelect.addEventListener('change', loadFeed);
magnitudeFilter.addEventListener('change', updateMagnitudeFilter);
refreshButton.addEventListener('click', loadFeed);
loadFeed();
