// Mock weather data for demonstration (when API is unavailable)
// In production, this would be fetched from aviationweather.gov API

function getMockWeatherData() {
    const mockData = {};
    
    // Generate mock weather for each airport with realistic variation
    US_AIRPORTS.forEach((airport, index) => {
        const categories = ['VFR', 'MVFR', 'IFR', 'LIFR'];
        const category = categories[index % categories.length];
        
        // Generate realistic METAR data based on category
        let ceiling, visibility, temp, dewp, windDir, windSpd;
        
        switch(category) {
            case 'VFR':
                ceiling = 5000 + Math.floor(Math.random() * 3000);
                visibility = 8 + Math.floor(Math.random() * 2);
                break;
            case 'MVFR':
                ceiling = 1500 + Math.floor(Math.random() * 1500);
                visibility = 3 + Math.floor(Math.random() * 2);
                break;
            case 'IFR':
                ceiling = 600 + Math.floor(Math.random() * 400);
                visibility = 1.5 + Math.random() * 1.5;
                break;
            case 'LIFR':
                ceiling = 200 + Math.floor(Math.random() * 300);
                visibility = 0.5 + Math.random() * 0.5;
                break;
        }
        
        temp = 10 + Math.floor(Math.random() * 20);
        dewp = temp - Math.floor(Math.random() * 10);
        windDir = Math.floor(Math.random() * 360);
        windSpd = 5 + Math.floor(Math.random() * 20);
        
        const now = new Date();
        const obsTime = new Date(now.getTime() - Math.floor(Math.random() * 3600000));
        
        mockData[airport.icao] = {
            icao: airport.icao,
            reportTime: obsTime.toISOString(),
            temp: temp,
            dewp: dewp,
            wdir: windDir,
            wspd: windSpd,
            wgst: windSpd + 5,
            visib: visibility,
            altim: 29.92 + (Math.random() * 0.5 - 0.25),
            cover: ceiling < 3000 ? ['OVC'] : ['SCT', 'BKN'],
            base: [ceiling],
            flightCategory: category,
            ceilingFt: ceiling,
            visMi: visibility,
            rawOb: formatMockMetar(airport.icao, obsTime, windDir, windSpd, visibility, ceiling, temp, dewp),
            wxString: visibility < 3 ? 'BR' : ''
        };
    });
    
    return mockData;
}

// Helper function to format mock METAR string
function formatMockMetar(icao, obsTime, windDir, windSpd, visibility, ceiling, temp, dewp) {
    const timeStr = `${obsTime.toISOString().substring(11, 13)}${obsTime.toISOString().substring(14, 16)}Z`;
    const windStr = `${String(windDir).padStart(3, '0')}${String(windSpd).padStart(2, '0')}KT`;
    const visStr = `${visibility}SM`;
    const skyStr = ceiling < 3000 ? 'OVC' : 'SCT';
    const ceilingStr = String(Math.floor(ceiling/100)).padStart(3, '0');
    const tempStr = `${temp}/${dewp}`;
    const altimValue = (29.92 + (Math.random() * 0.5 - 0.25)).toFixed(2).replace('.', '');
    const altimStr = `A${altimValue}`;
    
    return `${icao} ${timeStr} AUTO ${windStr} ${visStr} ${skyStr}${ceilingStr} ${tempStr} ${altimStr}`;
}

// Mock TAF data
function getMockTafData(icao) {
    const now = new Date();
    const validFrom = new Date(now.getTime());
    const validTo = new Date(now.getTime() + 24 * 3600000);
    
    return {
        icao: icao,
        issueTime: now.toISOString(),
        validTimeFrom: validFrom.toISOString(),
        validTimeTo: validTo.toISOString(),
        rawTAF: `TAF ${icao} ${now.toISOString().substring(8, 10)}${now.toISOString().substring(11, 13)}${now.toISOString().substring(14, 16)}Z ${now.toISOString().substring(8, 10)}00/${validTo.toISOString().substring(8, 10)}24 27008KT P6SM FEW250 FM120000 27010KT P6SM SCT250 FM121200 28012KT P6SM BKN250`,
    };
}
