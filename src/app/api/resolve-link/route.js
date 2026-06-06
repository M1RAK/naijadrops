import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { decodeWhatsAppUrl, isAllowedHost, extractCoordinates } from "@/utils/MapResolver";

export async function POST(request) {
  try {
    const { url: rawUrl } = await request.json();
    if (!rawUrl) return NextResponse.json({ error: "MISSING_URL" }, { status: 400 });

    const cleanUrl = decodeWhatsAppUrl(rawUrl);

    if (!isAllowedHost(cleanUrl)) {
      return NextResponse.json({ error: "UNSUPPORTED_DOMAIN" }, { status: 400 });
    }

    let supabase;
    try {
      supabase = await createClient();
    } catch {
      // If Supabase isn't available, skip cache and resolve directly
      supabase = null;
    }

    // 1. Cache Check (only if supabase available)
    if (supabase) {
      const { data: cached } = await supabase
        .from("resolved_links")
        .select("lat, lng")
        .eq("original_url", cleanUrl)
        .single();

      if (cached) {
        return NextResponse.json({ lat: cached.lat, lng: cached.lng, cached: true });
      }
    }

    // 2. Link Expansion
    let coords = extractCoordinates(cleanUrl);

    if (!coords) {
      try {
        const res = await fetch(cleanUrl, {
          method: "GET",
          headers: { "User-Agent": "curl/7.68.0", Accept: "*/*" },
        });
        const finalUrl = res.url;
        coords = extractCoordinates(finalUrl);

        if (!coords) {
          const text = await res.text();
          coords = extractCoordinates(text);

          if (!coords) {
            const metaRefreshMatch = text.match(/URL=['"]?(https:\/\/[^'"]+)['"]?/i);
            if (metaRefreshMatch?.[1]) {
              const metaUrl = metaRefreshMatch[1].replace(/&amp;/g, "&");
              coords = extractCoordinates(metaUrl);

              if (!coords) {
                const metaRes = await fetch(metaUrl, { headers: { "User-Agent": "curl/7.68.0" } });
                coords = extractCoordinates(metaRes.url) || extractCoordinates(await metaRes.text());
              }
            }
          }
        }
      } catch (err) {
        console.error("Fetch expansion error:", err);
      }
    }

    if (!coords) {
      return NextResponse.json({ error: "NO_COORDINATES_FOUND" }, { status: 404 });
    }

    // 3. Cache Success (only if supabase available)
    if (supabase) {
      await supabase.from("resolved_links").insert({
        original_url: cleanUrl,
        lat: coords.lat,
        lng: coords.lng,
      });
    }

    return NextResponse.json(coords);
  } catch (err) {
    console.error("Resolver Error:", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
