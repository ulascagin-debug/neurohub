import { NextResponse } from 'next/server';

// Google Places API proxy — keeps API key server-side
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, query, location, radius, keyword, type, pagetoken } = body;

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GOOGLE_PLACES_API_KEY is not set in .env" }, { status: 500 });
    }

    // ACTION: geocode — convert address to lat/lng
    if (action === 'geocode') {
      const { address } = body;
      if (!address) return NextResponse.json({ error: "Missing address" }, { status: 400 });
      
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== "OK" || !data.results?.length) {
        return NextResponse.json({ error: "Geocoding failed", status: data.status, details: data.error_message || null });
      }
      const loc = data.results[0].geometry.location;
      return NextResponse.json({ lat: loc.lat, lng: loc.lng });
    }

    // ACTION: textsearch
    if (action === 'textsearch') {
      let url: string;
      if (pagetoken) {
        url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${encodeURIComponent(pagetoken)}&key=${apiKey}`;
      } else {
        if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });
        url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=tr&key=${apiKey}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      return NextResponse.json(data);
    }

    // ACTION: nearbysearch
    if (action === 'nearbysearch') {
      let url: string;
      if (pagetoken) {
        url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${encodeURIComponent(pagetoken)}&key=${apiKey}`;
      } else {
        if (!location || !radius) return NextResponse.json({ error: "Missing location or radius" }, { status: 400 });
        url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${encodeURIComponent(location)}&radius=${radius}&language=tr&key=${apiKey}`;
        if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
        if (type) url += `&type=${encodeURIComponent(type)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Invalid action. Use: geocode, textsearch, nearbysearch" }, { status: 400 });

  } catch (error) {
    console.error("Places API proxy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
