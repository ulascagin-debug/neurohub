export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

const NOM = 'https://nominatim.openstreetmap.org';
const HDR = { 'User-Agent': 'NeuroHub/1.0 (info@neurohub.life)', 'Accept-Language': 'tr,en' };

// Primary amenity value per category (Nominatim structured search)
const CAT_AMENITY: Record<string, string[]> = {
  'Kafe':          ['cafe'],
  'Bar/Lounge':    ['bar', 'pub', 'nightclub'],
  'Restoran':      ['restaurant', 'fast_food'],
  'Diş Kliniği':  ['dentist'],
  'Veteriner':     ['veterinary'],
  'Spor Salonu':   ['gym'],
  'Eczane':        ['pharmacy'],
  'Otel':          ['hotel'],
};

// Fallback: free-text queries for non-amenity types
const CAT_TEXT: Record<string, string[]> = {
  'Kuaför/Berber': ['kuaför', 'berber'],
  'Spa':           ['spa', 'masaj salonu'],
  'Market':        ['market', 'süpermarket'],
  'Pastane/Fırın': ['pastane', 'fırın'],
  'Spor Salonu':   ['spor salonu', 'fitness'],
  'Otel':          ['otel', 'pansiyon'],
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function toViewbox(lat: number, lng: number, radiusM: number) {
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
  return `${lng - dLng},${lat + dLat},${lng + dLng},${lat - dLat}`;
}

function parseNominatim(items: any[]): any[] {
  return items
    .filter(i => i.osm_id && (i.namedetails?.name || i.display_name))
    .map(i => ({
      place_id: `osm-${i.osm_type}-${i.osm_id}`,
      name: i.namedetails?.name || i.display_name.split(',')[0].trim(),
      formatted_address: i.display_name || '',
      types: [i.extratags?.amenity || i.extratags?.shop || i.extratags?.tourism || i.type || i.class].filter(Boolean),
      phone: i.extratags?.phone || i.extratags?.['contact:phone'] || '',
      website: i.extratags?.website || i.extratags?.['contact:website'] || '',
      maps_url: `https://www.google.com/maps/search/?api=1&query=${i.lat},${i.lon}`,
      lat: parseFloat(i.lat),
      lng: parseFloat(i.lon),
    }));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // ── Geocode ──
    if (action === 'geocode') {
      const { address } = body;
      const res = await fetch(
        `${NOM}/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`,
        { headers: HDR }
      );
      const data = await res.json();
      if (!data.length) return NextResponse.json({ error: 'Location not found', lat: null, lng: null });
      return NextResponse.json({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
    }

    // ── Search ──
    if (action === 'search') {
      const { lat, lng, radius = 5000, categories } = body;
      if (!lat || !lng) return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 });

      const cats: string[] = Array.isArray(categories) ? categories : [categories];
      const viewbox = toViewbox(lat, lng, radius);
      const base = `${NOM}/search?format=json&limit=40&bounded=1&addressdetails=1&extratags=1&namedetails=1&viewbox=${viewbox}`;

      const seen = new Set<string>();
      const results: any[] = [];

      const add = (items: any[]) => {
        parseNominatim(items).forEach(p => {
          if (!seen.has(p.place_id)) { seen.add(p.place_id); results.push(p); }
        });
      };

      for (const cat of cats) {
        // Amenity structured search
        for (const amenity of (CAT_AMENITY[cat] || [])) {
          try {
            const r = await fetch(`${base}&amenity=${encodeURIComponent(amenity)}`, { headers: HDR, signal: AbortSignal.timeout(6000) });
            add(await r.json());
          } catch {}
          await sleep(250);
        }
        // Text search for shop/tourism/leisure types
        for (const kw of (CAT_TEXT[cat] || [])) {
          try {
            const r = await fetch(`${base}&q=${encodeURIComponent(kw)}`, { headers: HDR, signal: AbortSignal.timeout(6000) });
            add(await r.json());
          } catch {}
          await sleep(250);
        }
      }

      return NextResponse.json({ results, total: results.length });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Places API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
