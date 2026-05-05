export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

// OSM category → Overpass tags mapping (no API key needed)
const OSM_CATEGORY_TAGS: Record<string, string[]> = {
  "Kafe":          ["amenity=cafe", "amenity=coffee_shop"],
  "Bar/Lounge":    ["amenity=bar", "amenity=pub", "amenity=nightclub"],
  "Restoran":      ["amenity=restaurant", "amenity=fast_food"],
  "Kuaför/Berber": ["shop=hairdresser", "shop=beauty"],
  "Diş Kliniği":  ["amenity=dentist"],
  "Veteriner":     ["amenity=veterinary"],
  "Spor Salonu":   ["leisure=fitness_centre", "amenity=gym"],
  "Spa":           ["leisure=spa", "leisure=sauna"],
  "Otel":          ["tourism=hotel", "tourism=hostel", "tourism=guest_house", "tourism=motel"],
  "Eczane":        ["amenity=pharmacy"],
  "Market":        ["shop=supermarket", "shop=convenience"],
  "Pastane/Fırın": ["shop=bakery", "shop=pastry"],
};

function buildOverpassQuery(tags: string[], lat: number, lng: number, radius: number): string {
  const parts = tags.map(tag => {
    const [k, v] = tag.split('=');
    return `node["${k}"="${v}"](around:${radius},${lat},${lng});\nway["${k}"="${v}"](around:${radius},${lat},${lng});`;
  }).join('\n');
  return `[out:json][timeout:25];\n(\n${parts}\n);\nout center tags 60;`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // ── Geocode: address → lat/lng via Nominatim ──
    if (action === 'geocode') {
      const { address } = body;
      if (!address) return NextResponse.json({ error: 'Missing address' }, { status: 400 });

      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'NeuroHub/1.0 (info@neurohub.life)', 'Accept-Language': 'tr' }
      });
      const data = await res.json();

      if (!data.length) return NextResponse.json({ error: 'Location not found', lat: null, lng: null });
      return NextResponse.json({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
    }

    // ── Search: lat/lng + categories → businesses via Overpass ──
    if (action === 'search') {
      const { lat, lng, radius = 5000, categories } = body;
      if (!lat || !lng) return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 });

      const catArray: string[] = Array.isArray(categories) ? categories : [categories];
      const tags: string[] = [...new Set(
        catArray.flatMap(cat => OSM_CATEGORY_TAGS[cat] ?? [`amenity=${cat.toLowerCase()}`])
      )];

      const query = buildOverpassQuery(tags, lat, lng, radius);
      const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`
      });

      const osmData = await overpassRes.json();
      const elements: any[] = osmData.elements || [];

      const results = elements
        .filter(el => el.tags?.name)
        .map(el => {
          const elLat = el.lat ?? el.center?.lat;
          const elLng = el.lon ?? el.center?.lon;
          const addrParts = [
            el.tags['addr:street'] ? `${el.tags['addr:street']} ${el.tags['addr:housenumber'] || ''}`.trim() : null,
            el.tags['addr:district'] || el.tags['addr:city'] || null,
          ].filter(Boolean);
          return {
            place_id: `osm-${el.type}-${el.id}`,
            name: el.tags.name,
            formatted_address: addrParts.join(', ') || el.tags['addr:full'] || '',
            types: ['amenity', 'shop', 'tourism', 'leisure']
              .filter(k => el.tags[k])
              .map(k => el.tags[k]),
            phone: el.tags.phone || el.tags['contact:phone'] || '',
            website: el.tags.website || el.tags['contact:website'] || '',
            maps_url: elLat && elLng ? `https://www.google.com/maps/search/?api=1&query=${elLat},${elLng}` : '',
            lat: elLat,
            lng: elLng,
          };
        });

      return NextResponse.json({ results, total: results.length });
    }

    return NextResponse.json({ error: 'Invalid action. Use: geocode, search' }, { status: 400 });

  } catch (error) {
    console.error('OSM API proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
