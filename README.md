# Skyview - SkyBrief

A free aviation weather web app modeled after Windy.com for pilots. Get real-time weather conditions for US airports at a glance.

![SkyBrief Main View](https://github.com/user-attachments/assets/61b7bf61-b2a8-4dd8-9ffb-5fd68add6cf7)

## Features

- **Interactive Map**: Canvas-based map showing all major US airports
- **Color-Coded Airports**: Instant visual indication of flight conditions
  - 🟢 **Green (VFR)**: Visual Flight Rules - Good flying conditions
  - 🔵 **Blue (MVFR)**: Marginal VFR - Acceptable conditions with some restrictions
  - 🔴 **Red (IFR)**: Instrument Flight Rules - Poor visibility or low ceilings
  - 🟣 **Magenta (LIFR)**: Low IFR - Very poor conditions with significant restrictions
- **Detailed Weather Information**: Click any airport to see:
  - Raw METAR (Meteorological Aerodrome Report)
  - Decoded weather in plain English
  - TAF (Terminal Aerodrome Forecast) when available
  - Temperature, wind, visibility, sky conditions, and more
- **ICAO Search**: Quick search by 4-letter ICAO airport code
- **Auto-Refresh**: Weather data updates automatically every 5 minutes
- **Pan & Zoom**: Interactive map controls for easy navigation

![Weather Detail Panel](https://github.com/user-attachments/assets/6e0ccd36-a58d-4441-9261-bdba99193ec0)

## Usage

### Viewing Weather

1. Open `index.html` in a modern web browser
2. The map loads showing 98+ major US airports
3. Each airport is displayed as a colored dot indicating current flight category
4. Pan the map by clicking and dragging
5. Zoom in/out using the mouse wheel

### Searching for an Airport

1. Enter a 4-letter ICAO code in the search box (e.g., KJFK, KLAX, KORD)
2. Click "Search" or press Enter
3. The map will center on the airport and display its weather

### Viewing Detailed Weather

1. Click on any airport dot on the map
2. A side panel opens showing:
   - Airport name and ICAO code
   - Current flight category
   - Raw METAR data
   - Decoded weather information
   - TAF forecast (when available)
3. Click the × button to close the panel

## Technical Details

### Architecture

- **Frontend Only**: Pure HTML, CSS, and JavaScript - no build tools required
- **No Dependencies**: Self-contained with canvas-based map rendering
- **API Integration**: Connects to aviationweather.gov API for real-time data
- **Fallback Data**: Includes mock data for demonstration when API is unavailable

### Files

- `index.html` - Main HTML structure
- `styles.css` - Application styling
- `app.js` - Core application logic and map rendering
- `airports.js` - Database of US airports with coordinates
- `mockData.js` - Mock weather data for demonstration

### Data Sources

Weather data is fetched from the free [Aviation Weather Center API](https://aviationweather.gov/):
- METAR: `https://aviationweather.gov/api/data/metar?ids={ICAO}&format=json`
- TAF: `https://aviationweather.gov/api/data/taf?ids={ICAO}&format=json`

### Flight Categories

Flight categories are determined by ceiling and visibility:

| Category | Ceiling | Visibility |
|----------|---------|------------|
| VFR | > 3,000 ft | > 5 miles |
| MVFR | 1,000-3,000 ft | 3-5 miles |
| IFR | 500-1,000 ft | 1-3 miles |
| LIFR | < 500 ft | < 1 mile |

## Deployment

### Local Development

Simply open `index.html` in a web browser or serve with any HTTP server:

```bash
# Python 3
python3 -m http.server 8080

# Node.js
npx http-server

# PHP
php -S localhost:8080
```

Then navigate to `http://localhost:8080`

### Production Deployment

Deploy to any static hosting service:
- GitHub Pages
- Netlify
- Vercel
- AWS S3
- Any web server

No server-side processing required - all logic runs in the browser.

## Browser Compatibility

Works on all modern browsers that support:
- HTML5 Canvas
- ES6 JavaScript
- Fetch API
- CSS Grid/Flexbox

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Future Enhancements

Potential improvements:
- Add more airports (complete FAA database)
- Show radar overlay
- Display winds aloft
- Add NOTAMs (Notices to Airmen)
- Flight planning features
- Mobile app version
- User preferences (units, themes)

## Credits

- Weather data: [Aviation Weather Center](https://aviationweather.gov/)
- Airport database: FAA
- Inspired by [Windy.com](https://windy.com)

## License

This project is open source and available for educational purposes.

