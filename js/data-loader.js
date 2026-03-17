/**
 * WebWander - Data loader
 * Fetches sites from Supabase, falls back to local JSON
 */
import { SUPABASE } from './config.js';

function supabaseFetch(path, options = {}) {
    const url = `${SUPABASE.url}/rest/v1${path}`;
    const headers = {
        apikey: SUPABASE.anonKey,
        Authorization: `Bearer ${SUPABASE.anonKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
    };
    return fetch(url, { ...options, headers });
}

/**
 * Map Supabase row to our site format
 */
function mapRow(row) {
    return {
        id: row.id,
        name: row.label || row.name || 'Unknown',
        url: row.url || '#',
        category: (row.category || 'random').toLowerCase().trim(),
    };
}

/**
 * Fetch community sites (curated + approved, score >= 0)
 */
async function fetchCommunitySites() {
    const res = await supabaseFetch(
        '/community_sites?select=id,url,label,category,upvote_count,downvote_count'
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data || [])
        .filter((row) => (row.upvote_count || 0) >= (row.downvote_count || 0))
        .map(mapRow);
}

/**
 * Fetch approved suggestions (score >= 5)
 */
async function fetchApprovedSuggestions() {
    const res = await supabaseFetch(
        '/suggestions?select=id,url,label,category,upvote_count,downvote_count'
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data || [])
        .filter((s) => (s.upvote_count || 0) - (s.downvote_count || 0) >= 5)
        .map(mapRow);
}

/**
 * Load fallback sites from bundled data/sites.json when Supabase is unavailable
 */
async function loadFallbackSites() {
    try {
        const res = await fetch(new URL('data/sites.json', window.location.href).href);
        if (!res.ok) return { sites: [], categories: [] };
        const raw = await res.json();
        const sites = (Array.isArray(raw) ? raw : raw.sites || []).map((s, i) => ({
            id: s.id || `fallback-${i}`,
            name: s.name || s.label || 'Unknown',
            url: s.url || '#',
            category: (s.category || 'random').toLowerCase().trim(),
        })).filter((s) => s.url && s.url !== '#');
        const categories = [...new Set(sites.map((s) => s.category).filter(Boolean))].sort();
        return { sites, categories: categories.length ? categories : ['random'] };
    } catch (e) {
        console.warn('Fallback sites load failed:', e);
        return { sites: [], categories: [] };
    }
}

/**
 * Load sites and categories from Supabase, fallback to data/sites.json when unavailable
 */
export async function loadData() {
    try {
        const [community, suggestions] = await Promise.all([
            fetchCommunitySites(),
            fetchApprovedSuggestions(),
        ]);

        const byUrl = new Map();
        [...community, ...suggestions].forEach((s) => {
            const url = (s.url || '').replace(/\/$/, '').toLowerCase();
            if (url && s.name) byUrl.set(url, s);
        });

        const sites = Array.from(byUrl.values());
        const categories = [...new Set(sites.map((s) => (s.category || 'random').toLowerCase()).filter(Boolean))].sort();

        if (sites.length > 0) {
            return { sites, categories: categories.length ? categories : ['random'] };
        }
    } catch (e) {
        console.warn('Supabase fetch failed:', e);
    }

    return loadFallbackSites();
}

/**
 * Submit a site suggestion to Supabase
 */
export async function submitSuggestion({ url, name, category, description }) {
    const res = await supabaseFetch('/suggestions', {
        method: 'POST',
        body: JSON.stringify({
            url: (url || '').replace(/\/$/, '').trim(),
            label: (name || '').trim(),
            category: (category || 'random').toLowerCase().trim(),
            tags: description ? description.trim().split(/[\s,]+/).filter(Boolean) : [],
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.details || 'Failed to submit');
    }
    return res.json();
}
