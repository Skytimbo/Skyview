// SkyBrief - Aviation Weather Application
// Main application logic (Canvas-based implementation)

let canvas, ctx;
let markers = {};
let weatherData = {};
const AUTO_REFRESH_INTERVAL = 300000; // 5 minutes

// Map projection and view state
let mapState = {
    centerLat: 39.8283,
    centerLon: -98.5795,
    zoom: 1.5,
    minZoom: 0.5,
    maxZoom: 5,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    loadAirportWeather();
    setupEventListeners();
    
    // Auto-refresh weather data
    setInterval(loadAirportWeather, AUTO_REFRESH_INTERVAL);
});

// Initialize canvas map
function initializeMap() {
    const mapContainer = document.getElementById('map');
    canvas = document.createElement('canvas');
    canvas.id = 'map-canvas';
    canvas.width = mapContainer.clientWidth;
    canvas.height = mapContainer.clientHeight;
    mapContainer.appendChild(canvas);
    ctx = canvas.getContext('2d');
    
    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = mapContainer.clientWidth;
        canvas.height = mapContainer.clientHeight;
        drawMap();
    });
    
    // Setup canvas interactions
    setupCanvasInteractions();
    
    // Initial draw
    drawMap();
}

// Setup canvas interactions
function setupCanvasInteractions() {
    // Mouse wheel for zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        mapState.zoom = Math.max(mapState.minZoom, Math.min(mapState.maxZoom, mapState.zoom * delta));
        drawMap();
    });
    
    // Mouse drag for pan
    canvas.addEventListener('mousedown', (e) => {
        mapState.isDragging = true;
        mapState.lastMouseX = e.clientX;
        mapState.lastMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (mapState.isDragging) {
            const dx = e.clientX - mapState.lastMouseX;
            const dy = e.clientY - mapState.lastMouseY;
            mapState.offsetX += dx;
            mapState.offsetY += dy;
            mapState.lastMouseX = e.clientX;
            mapState.lastMouseY = e.clientY;
            drawMap();
        } else {
            // Check if hovering over a marker
            const airport = getAirportAtPosition(e.offsetX, e.offsetY);
            canvas.style.cursor = airport ? 'pointer' : 'grab';
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        mapState.isDragging = false;
        canvas.style.cursor = 'grab';
    });
    
    canvas.addEventListener('mouseleave', () => {
        mapState.isDragging = false;
        canvas.style.cursor = 'grab';
    });
    
    // Click to show airport details
    canvas.addEventListener('click', (e) => {
        if (!mapState.isDragging) {
            const airport = getAirportAtPosition(e.offsetX, e.offsetY);
            if (airport) {
                showWeatherDetails(airport);
            }
        }
    });
    
    canvas.style.cursor = 'grab';
}

// Convert lat/lon to canvas coordinates
function latLonToCanvas(lat, lon) {
    const x = ((lon + 180) / 360) * canvas.width * mapState.zoom + mapState.offsetX;
    const y = ((90 - lat) / 180) * canvas.height * mapState.zoom + mapState.offsetY;
    return { x, y };
}

// Check if there's an airport at the given position
function getAirportAtPosition(x, y) {
    const threshold = 10; // pixels
    for (const airport of US_AIRPORTS) {
        const pos = latLonToCanvas(airport.lat, airport.lon);
        const dist = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
        if (dist < threshold) {
            return airport;
        }
    }
    return null;
}

// Draw the map
function drawMap() {
    // Clear canvas
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw US outline (simplified)
    drawUSOutline();
    
    // Draw state borders (simplified grid)
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.5;
    for (let lat = 25; lat <= 50; lat += 5) {
        drawLine(-125, lat, -65, lat);
    }
    for (let lon = -125; lon <= -65; lon += 5) {
        drawLine(lon, 25, lon, 50);
    }
    
    // Draw airports
    for (const airport of US_AIRPORTS) {
        drawAirport(airport);
    }
}

// Draw simplified US outline
function drawUSOutline() {
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    
    // Very simplified US border
    const usOutline = [
        [-125, 49], [-95, 49], [-95, 49], // Canada border
        [-67, 47], [-67, 45], // Northeast
        [-70, 41], [-74, 40], // Mid-Atlantic
        [-75, 35], [-81, 31], // Southeast
        [-97, 26], [-97, 26], // Texas
        [-117, 32], [-120, 34], // Southwest
        [-124, 42], [-125, 49] // West coast
    ];
    
    ctx.beginPath();
    let first = true;
    for (const [lon, lat] of usOutline) {
        const pos = latLonToCanvas(lat, lon);
        if (first) {
            ctx.moveTo(pos.x, pos.y);
            first = false;
        } else {
            ctx.lineTo(pos.x, pos.y);
        }
    }
    ctx.stroke();
}

// Draw a line between two lat/lon points
function drawLine(lon1, lat1, lon2, lat2) {
    const pos1 = latLonToCanvas(lat1, lon1);
    const pos2 = latLonToCanvas(lat2, lon2);
    ctx.beginPath();
    ctx.moveTo(pos1.x, pos1.y);
    ctx.lineTo(pos2.x, pos2.y);
    ctx.stroke();
}

// Draw an airport marker
function drawAirport(airport) {
    const pos = latLonToCanvas(airport.lat, airport.lon);
    
    // Skip if off-screen
    if (pos.x < -20 || pos.x > canvas.width + 20 || pos.y < -20 || pos.y > canvas.height + 20) {
        return;
    }
    
    const metar = weatherData[airport.icao];
    const category = getFlightCategory(metar);
    const color = getCategoryColor(category);
    
    // Draw circle
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    
    const radius = 6;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Store marker position for click detection
    markers[airport.icao] = { x: pos.x, y: pos.y, airport };
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
        centerOnAirport(airport);
        
        // Show weather for this airport
        showWeatherDetails(airport);
    } else {
        alert(`Airport ${icao} not found in database`);
    }
}

// Center map on airport
function centerOnAirport(airport) {
    const targetPos = latLonToCanvas(airport.lat, airport.lon);
    mapState.offsetX += (canvas.width / 2) - targetPos.x;
    mapState.offsetY += (canvas.height / 2) - targetPos.y;
    mapState.zoom = Math.min(3, mapState.zoom * 1.5);
    drawMap();
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
    drawMap(); // Redraw map with updated weather data
    console.log('Weather data loaded for all airports');
}

// Fetch weather data for a single airport
async function fetchAirportWeather(airport) {
    try {
        // Try to fetch METAR data from Aviation Weather API
        const metarUrl = `https://aviationweather.gov/api/data/metar?ids=${airport.icao}&format=json`;
        const response = await fetch(metarUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            const metarData = data[0];
            weatherData[airport.icao] = metarData;
        }
    } catch (error) {
        // If API fails, use mock data for demonstration
        if (!weatherData[airport.icao]) {
            const mockData = getMockWeatherData();
            weatherData[airport.icao] = mockData[airport.icao];
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

// Show weather details in panel
async function showWeatherDetails(airport) {
    const panel = document.getElementById('weather-panel');
    const content = document.getElementById('weather-content');
    
    panel.classList.remove('hidden');
    content.innerHTML = '<div class="loading">Loading weather data...</div>';
    
    try {
        let metarData = weatherData[airport.icao];
        let tafData = null;
        
        // Try to fetch fresh data
        try {
            const metarPromise = fetch(`https://aviationweather.gov/api/data/metar?ids=${airport.icao}&format=json`);
            const tafPromise = fetch(`https://aviationweather.gov/api/data/taf?ids=${airport.icao}&format=json`);
            
            const [metarResponse, tafResponse] = await Promise.all([metarPromise, tafPromise]);
            
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
        } catch (fetchError) {
            // Use cached or mock data
            if (!metarData) {
                const mockData = getMockWeatherData();
                metarData = mockData[airport.icao];
            }
            tafData = getMockTafData(airport.icao);
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
