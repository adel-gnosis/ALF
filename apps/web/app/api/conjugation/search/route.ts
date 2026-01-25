import { NextResponse } from 'next/server';

// Import the JSON file directly - this is the correct way!
// @ts-ignore
const Lefff = require('french-verbs-lefff/dist/conjugations.json');

// Simple in-memory cache for search results
const searchCache = new Map<string, string[]>();

// Validate on module load
if (!Lefff || typeof Lefff !== 'object' || Object.keys(Lefff).length === 0) {
    console.error('[SearchAPI INIT] Failed to load Lefff dictionary');
} else {
    console.log(`[SearchAPI INIT] Successfully loaded ${Object.keys(Lefff).length} verbs`);
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase();

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    try {
        console.log(`[SearchAPI] Querying: "${query}"`);

        // Check cache first
        if (searchCache.has(query)) {
            const cached = searchCache.get(query)!;
            console.log(`[SearchAPI] Cache hit for "${query}": ${cached.length} results`);
            return NextResponse.json({ results: cached });
        }

        // Validate library load
        if (!Lefff || typeof Lefff !== 'object') {
            console.error('[SearchAPI] Lefff dictionary not available');
            return NextResponse.json({ 
                error: 'Dictionary unavailable - Package not properly loaded' 
            }, { status: 500 });
        }

        // Get all verbs from Lefff dictionary
        const allVerbs = Object.keys(Lefff);
        console.log(`[SearchAPI] Total verbs in dictionary: ${allVerbs.length}`);

        // Filter verbs starting with query (case-insensitive)
        // Limit to 20 results for performance
        const results = allVerbs
            .filter(v => v.toLowerCase().startsWith(query))
            .slice(0, 20);

        console.log(`[SearchAPI] Found ${results.length} matches for "${query}"`);

        // Cache the results
        searchCache.set(query, results);

        return NextResponse.json({ results });

    } catch (e) {
        console.error('[SearchAPI] Error processing search:', e);
        return NextResponse.json({ 
            error: 'Internal Server Error', 
            details: String(e) 
        }, { status: 500 });
    }
}