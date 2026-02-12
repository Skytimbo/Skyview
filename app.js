// SkyBrief - Aviation Weather Application
// Main application logic

let map;
let markers = {};
let weatherData = {};
const AUTO_REFRESH_INTERVAL = 300000; // 5 minutes

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    loadAirportWeather();
    setupEventListeners();
    
    // Auto-refresh weather data
    setInterval(loadAirportWeather, AUTO_REFRESH_INTERVAL);
});

// Initialize Leaflet map
function initializeMap() {
    map = L.map('map', {
        zoomControl: true,
        scrollWheelZoom: true
    }).setView([39.8283, -98.5795], 5); // Center of continental US
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
}

// Setup event listeners
function setupEventListeners() {
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');
    const closePanel = document.getElementById('close-panel');
    
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    closePanel.addEventListener('click', closeWeatherPanel);
}

// Handle airport search
function handleSearch() {
    const searchInput = document.getElementById('search-input');
    const icao = searchInput.value.trim().toUpperCase();
    
    if (icao.length !== 4) {
        alert('Please enter a valid 4-letter ICAO code (e.g., KJFK)');
        return;
    }
    
    const airport = US_AIRPORTS.find(a => a.icao === icao);
    
    if (airport) {
        // Center map on airport
        map.setView([airport.lat, airport.lon], 10);
        
        // Show weather for this airport
        if (markers[icao]) {
            markers[icao].fire('click');
        } else {
            // If marker doesn't exist yet, fetch and display weather
            fetchAirportWeather(airport);
        }
    } else {
        alert(`Airport ${icao} not found in database`);
    }
}

// Close weather panel
function closeWeatherPanel() {
    const panel = document.getElementById('weather-panel');
    panel.classList.add('hidden');
}

// Load weather for all airports
async function loadAirportWeather() {
    console.log('Loading weather data for all airports...');
    
    for (const airport of US_AIRPORTS) {
        try {
            await fetchAirportWeather(airport);
            // Add small delay to avoid overwhelming the API
            await sleep(100);
        } catch (error) {
            console.error(`Error fetching weather for ${airport.icao}:`, error);
        }
    }
    
    updateLastUpdateTime();
    console.log('Weather data loaded for all airports');
}

// Fetch weather data for a single airport
async function fetchAirportWeather(airport) {
    try {
        // Fetch METAR data from Aviation Weather API
        const metarUrl = `https://aviationweather.gov/api/data/metar?ids=${airport.icao}&format=json`;
        const response = await fetch(metarUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            const metarData = data[0];
            weatherData[airport.icao] = metarData;
            
            // Update or create marker
            updateAirportMarker(airport, metarData);
        }
    } catch (error) {
        console.error(`Error fetching METAR for ${airport.icao}:`, error);
        // Create marker with unknown status if it doesn't exist
        if (!markers[airport.icao]) {
            createAirportMarker(airport, null);
        }
    }
}

// Determine flight category from METAR data
function getFlightCategory(metar) {
    if (!metar) return 'UNKNOWN';
    
    // Use flight category if provided
    if (metar.flightCategory) {
        return metar.flightCategory;
    }
    
    // Calculate from ceiling and visibility
    const ceiling = metar.ceilingFt;
    const visibility = metar.visMi;
    
    if (!ceiling && !visibility) return 'UNKNOWN';
    
    // VFR: Ceiling > 3000 ft and visibility > 5 miles
    // MVFR: Ceiling 1000-3000 ft or visibility 3-5 miles  
    // IFR: Ceiling 500-1000 ft or visibility 1-3 miles
    // LIFR: Ceiling < 500 ft or visibility < 1 mile
    
    if (ceiling !== null && ceiling < 500 || visibility !== null && visibility < 1) {
        return 'LIFR';
    } else if (ceiling !== null && ceiling < 1000 || visibility !== null && visibility < 3) {
        return 'IFR';
    } else if (ceiling !== null && ceiling < 3000 || visibility !== null && visibility < 5) {
        return 'MVFR';
    } else {
        return 'VFR';
    }
}

// Get color for flight category
function getCategoryColor(category) {
    const colors = {
        'VFR': '#22c55e',
        'MVFR': '#3b82f6',
        'IFR': '#ef4444',
        'LIFR': '#ec4899',
        'UNKNOWN': '#9ca3af'
    };
    return colors[category] || colors['UNKNOWN'];
}

// Update or create airport marker
function updateAirportMarker(airport, metar) {
    const category = getFlightCategory(metar);
    const color = getCategoryColor(category);
    
    if (markers[airport.icao]) {
        // Update existing marker
        const marker = markers[airport.icao];
        const icon = createCustomIcon(color);
        marker.setIcon(icon);
    } else {
        // Create new marker
        createAirportMarker(airport, metar);
    }
}

// Create custom icon for airport marker
function createCustomIcon(color) {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid rgba(0,0,0,0.3);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });
}

// Create airport marker on map
function createAirportMarker(airport, metar) {
    const category = getFlightCategory(metar);
    const color = getCategoryColor(category);
    const icon = createCustomIcon(color);
    
    const marker = L.marker([airport.lat, airport.lon], {
        icon: icon,
        title: `${airport.icao} - ${airport.name}`
    }).addTo(map);
    
    marker.on('click', () => {
        showWeatherDetails(airport);
    });
    
    markers[airport.icao] = marker;
}

// Show weather details in panel
async function showWeatherDetails(airport) {
    const panel = document.getElementById('weather-panel');
    const content = document.getElementById('weather-content');
    
    panel.classList.remove('hidden');
    content.innerHTML = '<div class="loading">Loading weather data...</div>';
    
    try {
        // Fetch fresh METAR and TAF data
        const metarPromise = fetch(`https://aviationweather.gov/api/data/metar?ids=${airport.icao}&format=json`);
        const tafPromise = fetch(`https://aviationweather.gov/api/data/taf?ids=${airport.icao}&format=json`);
        
        const [metarResponse, tafResponse] = await Promise.all([metarPromise, tafPromise]);
        
        let metarData = null;
        let tafData = null;
        
        if (metarResponse.ok) {
            const metarJson = await metarResponse.json();
            if (metarJson && metarJson.length > 0) {
                metarData = metarJson[0];
            }
        }
        
        if (tafResponse.ok) {
            const tafJson = await tafResponse.json();
            if (tafJson && tafJson.length > 0) {
                tafData = tafJson[0];
            }
        }
        
        content.innerHTML = generateWeatherHTML(airport, metarData, tafData);
    } catch (error) {
        console.error('Error fetching weather details:', error);
        content.innerHTML = `<div class="error">Error loading weather data. Please try again.</div>`;
    }
}

// Generate HTML for weather details
function generateWeatherHTML(airport, metar, taf) {
    const category = getFlightCategory(metar);
    
    let html = `
        <div class="airport-header">
            <h2>${airport.icao}</h2>
            <div class="airport-name">${airport.name}</div>
            <span class="flight-category ${category}">${category}</span>
        </div>
    `;
    
    if (metar) {
        html += `
            <div class="weather-section">
                <h3>METAR</h3>
                <div class="raw-data">${metar.rawOb || 'No raw METAR available'}</div>
                <div class="decoded">
                    ${decodeMetar(metar)}
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="weather-section">
                <h3>METAR</h3>
                <p>No METAR data available</p>
            </div>
        `;
    }
    
    if (taf) {
        html += `
            <div class="weather-section">
                <h3>TAF (Terminal Aerodrome Forecast)</h3>
                <div class="raw-data">${taf.rawTAF || taf.rawOb || 'No raw TAF available'}</div>
                <div class="decoded">
                    ${decodeTaf(taf)}
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="weather-section">
                <h3>TAF (Terminal Aerodrome Forecast)</h3>
                <p>No TAF data available for this airport</p>
            </div>
        `;
    }
    
    return html;
}

// Decode METAR into plain English
function decodeMetar(metar) {
    let decoded = [];
    
    if (metar.reportTime) {
        const reportTime = new Date(metar.reportTime);
        decoded.push(`<p><strong>Observation Time:</strong> ${reportTime.toLocaleString()}</p>`);
    }
    
    if (metar.temp !== undefined) {
        decoded.push(`<p><strong>Temperature:</strong> ${metar.temp}°C (${celsiusToFahrenheit(metar.temp)}°F)</p>`);
    }
    
    if (metar.dewp !== undefined) {
        decoded.push(`<p><strong>Dew Point:</strong> ${metar.dewp}°C (${celsiusToFahrenheit(metar.dewp)}°F)</p>`);
    }
    
    if (metar.wdir !== undefined && metar.wspd !== undefined) {
        let windStr = `${metar.wdir}° at ${metar.wspd} knots`;
        if (metar.wgst !== undefined) {
            windStr += ` gusting to ${metar.wgst} knots`;
        }
        decoded.push(`<p><strong>Wind:</strong> ${windStr}</p>`);
    }
    
    if (metar.visib !== undefined) {
        decoded.push(`<p><strong>Visibility:</strong> ${metar.visib} statute miles</p>`);
    }
    
    if (metar.altim !== undefined) {
        decoded.push(`<p><strong>Altimeter:</strong> ${metar.altim} inHg</p>`);
    }
    
    if (metar.cover && metar.cover.length > 0) {
        const skyConditions = metar.cover.map((cond, idx) => {
            let height = metar.base && metar.base[idx] ? ` at ${metar.base[idx]} ft` : '';
            return `${cond}${height}`;
        }).join(', ');
        decoded.push(`<p><strong>Sky Conditions:</strong> ${skyConditions}</p>`);
    }
    
    if (metar.wxString) {
        decoded.push(`<p><strong>Weather:</strong> ${decodeWxString(metar.wxString)}</p>`);
    }
    
    if (metar.flightCategory) {
        const categoryDescriptions = {
            'VFR': 'Visual Flight Rules - Good flying conditions',
            'MVFR': 'Marginal VFR - Acceptable conditions, some restrictions',
            'IFR': 'Instrument Flight Rules - Poor visibility or low ceilings',
            'LIFR': 'Low IFR - Very poor conditions, significant restrictions'
        };
        decoded.push(`<p><strong>Flight Category:</strong> ${categoryDescriptions[metar.flightCategory] || metar.flightCategory}</p>`);
    }
    
    return decoded.join('') || '<p>Unable to decode METAR data</p>';
}

// Decode TAF into plain English
function decodeTaf(taf) {
    let decoded = [];
    
    if (taf.issueTime) {
        const issueTime = new Date(taf.issueTime);
        decoded.push(`<p><strong>Issued:</strong> ${issueTime.toLocaleString()}</p>`);
    }
    
    if (taf.validTimeFrom && taf.validTimeTo) {
        const validFrom = new Date(taf.validTimeFrom);
        const validTo = new Date(taf.validTimeTo);
        decoded.push(`<p><strong>Valid Period:</strong> ${validFrom.toLocaleString()} to ${validTo.toLocaleString()}</p>`);
    }
    
    decoded.push(`<p><strong>Forecast:</strong> This is a terminal aerodrome forecast providing expected weather conditions for the next 24-30 hours. Review the raw TAF above for detailed forecast periods and conditions.</p>`);
    
    return decoded.join('');
}

// Decode weather string
function decodeWxString(wxString) {
    const wxCodes = {
        'RA': 'Rain',
        'SN': 'Snow',
        'FG': 'Fog',
        'BR': 'Mist',
        'HZ': 'Haze',
        'TS': 'Thunderstorm',
        'DZ': 'Drizzle',
        'SH': 'Showers',
        'FZ': 'Freezing',
        'BL': 'Blowing',
        'MI': 'Shallow',
        'BC': 'Patches',
        'PR': 'Partial',
        'DR': 'Low Drifting',
        'IC': 'Ice Crystals',
        'GR': 'Hail',
        'GS': 'Small Hail',
        'PL': 'Ice Pellets',
        'UP': 'Unknown Precipitation'
    };
    
    let decoded = wxString;
    for (const [code, description] of Object.entries(wxCodes)) {
        decoded = decoded.replace(new RegExp(code, 'g'), description);
    }
    
    return decoded;
}

// Convert Celsius to Fahrenheit
function celsiusToFahrenheit(celsius) {
    return Math.round((celsius * 9/5) + 32);
}

// Update last update time
function updateLastUpdateTime() {
    const timeElement = document.getElementById('last-update-time');
    const now = new Date();
    timeElement.textContent = now.toLocaleTimeString();
}

// Sleep utility function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
