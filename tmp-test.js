const { Country, State, City } = require('country-state-city');

const tr = Country.getCountryByCode('TR');
console.log('Country:', tr?.name);

const states = State.getStatesOfCountry('TR');
console.log(`Found ${states.length} states in TR`);
if (states.length > 0) {
    const istanbul = states.find(s => s.isoCode === '34');
    console.log('Istanbul state:', istanbul?.name);
    
    if (istanbul) {
        const cities = City.getCitiesOfState('TR', '34');
        console.log(`Found ${cities.length} cities in Istanbul:`);
        console.log(cities.slice(0, 5).map(c => c.name).join(', '));
    }
}
