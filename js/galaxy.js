/**
 * WebWander Galaxy - Interactive 3D web visualization
 * Inspired by 3d-force-graph, particles.js, threejs-galaxy
 * Uses Three.js - vanilla, no dependencies beyond Three.js
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

/**
     * Create a circular/star-like texture for soft round points
     */
    function createCircleTexture() {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.2, 'rgba(255,255,255,0.9)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
        gradient.addColorStop(0.8, 'rgba(255,255,255,0.15)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
    }

    /** Softer texture for nebulous cloud glow */
    function createCloudTexture() {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        g.addColorStop(0, 'rgba(255,255,255,0.4)');
        g.addColorStop(0.4, 'rgba(255,255,255,0.15)');
        g.addColorStop(0.7, 'rgba(255,255,255,0.05)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
    }

    const CIRCLE_TEX = createCircleTexture();
    const CLOUD_TEX = createCloudTexture();

    const CATEGORY_COLORS = {
        tech: 0x6b8cff, learning: 0x6bffb8, tools: 0xffb86b, entertainment: 0xff6bb8,
        deals: 0xb86bff, random: 0x6bffff, hub: 0xffffff, text: 0x88aaff, culture: 0xe8a87c,
        fun: 0xff6bb8, ideas: 0x6bffff, design: 0xf38b8b, health: 0x7bff7b,
        handcraft: 0xdaa520, books: 0xcd853f, travel: 0x87ceeb, gaming: 0x9370db,
        food: 0xffa07a, nature: 0x3cb371, music: 0xff69b4, finance: 0x32cd32,
        film: 0xdc143c, cute: 0xffb6c1,
    };
    const COLOR_PALETTE = [0x6b8cff, 0x6bffb8, 0xffb86b, 0xff6bb8, 0xb86bff, 0x6bffff, 0xe8a87c, 0xf38b8b, 0x7bff7b, 0x9370db, 0xffa07a, 0x3cb371];
    function getCategoryColor(cat) {
        return CATEGORY_COLORS[cat] || COLOR_PALETTE[hashStr(cat || '') * COLOR_PALETTE.length | 0];
    }

    /**
     * Simple deterministic hash for consistent positioning
     */
    function hashStr(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i) | 0;
        return Math.abs(h) / 2147483647;
    }

    /** Sample points along a line segment */
    function sampleStroke(ax, ay, bx, by, n) {
        const pts = [];
        for (let i = 0; i <= n; i++) {
            const t = i / n;
            pts.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
        }
        return pts;
    }

    /** Simple stroke font: each letter is array of [ax,ay,bx,by] segments (0-1, y down) */
    const STROKE_FONT = {
        W: [[0,0,0.15,1],[0.15,1,0.5,0.4],[0.5,0.4,0.85,1],[0.85,1,1,0]],
        E: [[0,0,0,1],[0,0,1,0],[0,0.5,0.75,0.5],[0,1,1,1]],
        B: [[0,0,0,1],[0,0,0.65,0],[0,0.5,0.65,0.5],[0,1,0.65,1],[0.65,0,0.65,0.5],[0.65,0.5,0.65,1]],
        A: [[0,1,0.5,0],[0.5,0,1,1],[0.25,0.55,0.75,0.55]],
        N: [[0,0,0,1],[0,1,1,0],[1,0,1,1]],
        D: [[0,0,0,1],[0,0,0.6,0],[0,1,0.6,1],[0.6,0,0.6,1]],
        R: [[0,0,0,1],[0,0,0.65,0],[0,0.5,0.65,0.5],[0.65,0,0.65,0.5],[0.55,0.5,1,1]],
    };

    function textToPoints(text, scaleX, scaleY, ox, oy) {
        const pts = [];
        const letterW = 1.1;
        const letters = text.toUpperCase().replace(/[^A-Z]/g, '');
        for (let li = 0; li < letters.length; li++) {
            const segs = STROKE_FONT[letters[li]];
            if (!segs) continue;
            const lox = li * letterW;
            for (const s of segs) {
                const n = Math.max(2, Math.floor(5 * Math.hypot(s[2] - s[0], s[3] - s[1])));
                const sampled = sampleStroke(s[0], s[1], s[2], s[3], n);
                for (let i = 0; i < sampled.length; i++) {
                    pts.push([ox + (lox + sampled[i][0]) * scaleX, oy + (1 - sampled[i][1]) * scaleY]);
                }
            }
        }
        return pts;
    }

    /**
     * Triple-view layout: one 3D structure that forms WebWander | spider web | spider
     * when viewed from three orthogonal directions (Z, Y, X respectively).
     * Planes: WebWander in XY (z=0), spider web in XZ (y=0), spider in YZ (x=0).
     */
    function processSiteDataTripleView(sites) {
        const nodes = [];
        const links = [];
        let nodeId = 0;
        const hubId = 'hub-center';
        const scale = 200;

        const siteQueue = [...(sites || [])];
        function nextSite() {
            const s = siteQueue.shift();
            return s ? { name: s.name || 'Site', url: s.url || '#', category: s.category || 'random' } : { name: '', url: '#', category: 'structure' };
        }

        nodes.push({ id: hubId, name: 'Web Core', url: '#', category: 'hub', x: 0, y: 0, z: 0 });
        nodeId++;

        // --- WebWander text: XY plane (z=0), view from +Z ---
        const textPts = textToPoints('WebWander', 28, 32, -120, -18);
        const textNodes = [];
        for (let i = 0; i < textPts.length; i++) {
            const s = nextSite();
            const id = `text-${i}`;
            textNodes.push(id);
            nodes.push({
                id,
                name: s.name || (i === 0 ? 'W' : ''),
                url: s.url,
                category: s.category,
                x: textPts[i][0],
                y: textPts[i][1],
                z: 0,
                _view: 'text',
            });
        }
        const getNode = (id) => nodes.find((n) => n.id === id);
        for (let i = 0; i < textNodes.length - 1; i++) {
            const a = getNode(textNodes[i]);
            const b = getNode(textNodes[i + 1]);
            if (a && b && Math.hypot(a.x - b.x, a.y - b.y) < 40) links.push({ source: textNodes[i], target: textNodes[i + 1] });
        }
        const midText = getNode(textNodes[Math.floor(textNodes.length / 2)]);
        if (midText) links.push({ source: hubId, target: textNodes[Math.floor(textNodes.length / 2)] });

        // --- Spider web: XZ plane (y=0), view from +Y ---
        const numRays = 12;
        const numRings = 4;
        const webNodes = [hubId];
        const ringNodes = [[]];
        for (let r = 1; r <= numRings; r++) {
            const ringRadius = (scale * r) / numRings;
            const n = numRays * r;
            const ring = [];
            for (let i = 0; i < n; i++) {
                const angle = (2 * Math.PI * i) / n;
                const s = nextSite();
                const id = `web-${r}-${i}`;
                webNodes.push(id);
                ring.push(id);
                nodes.push({
                    id,
                    name: s.name,
                    url: s.url,
                    category: s.category,
                    x: Math.cos(angle) * ringRadius,
                    y: 0,
                    z: Math.sin(angle) * ringRadius,
                    _view: 'web',
                });
            }
            ringNodes.push(ring);
        }
        for (let r = 1; r <= numRings; r++) {
            const ring = ringNodes[r];
            for (let i = 0; i < ring.length; i++) {
                links.push({ source: r === 1 ? hubId : ringNodes[r - 1][Math.floor(i * (r - 1) / r)], target: ring[i] });
                links.push({ source: ring[i], target: ring[(i + 1) % ring.length] });
            }
        }

        // --- Spider: YZ plane (x=0), view from +X ---
        const bodyPts = [];
        for (let i = 0; i < 8; i++) {
            const t = (i / 8) * Math.PI * 2;
            bodyPts.push([Math.cos(t) * 25, Math.sin(t) * 35]);
        }
        const spiderNodes = [];
        bodyPts.forEach((pt, i) => {
            const s = nextSite();
            const id = `spider-body-${i}`;
            spiderNodes.push(id);
            nodes.push({ id, name: s.name, url: s.url, category: s.category, x: 0, y: pt[0], z: pt[1], _view: 'spider' });
        });
        bodyPts.forEach((_, i) => links.push({ source: spiderNodes[i], target: spiderNodes[(i + 1) % spiderNodes.length] }));
        links.push({ source: hubId, target: spiderNodes[0] });

        const legAngles = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (i / 8) * Math.PI * 2);
        const legLen = 70;
        legAngles.forEach((angle, legIdx) => {
            const base = bodyPts[legIdx];
            const outwardY = Math.cos(angle);
            const outwardZ = Math.sin(angle);
            const segs = 3;
            let prevId = spiderNodes[legIdx];
            for (let s = 1; s <= segs; s++) {
                const t = s / segs;
                const ly = base[0] + outwardY * legLen * t;
                const lz = base[1] + outwardZ * legLen * t;
                const nid = `spider-leg-${legIdx}-${s}`;
                const site = nextSite();
                nodes.push({ id: nid, name: site.name, url: site.url, category: site.category, x: 0, y: ly, z: lz, _view: 'spider' });
                links.push({ source: prevId, target: nid });
                prevId = nid;
            }
        });

        return { nodes, links };
    }

    /**
     * Spherical galaxy layout: central hub with cluster arms radiating outward in 3D
     * Categories are distributed on a sphere; nodes spread along each arm
     */
    function processSiteData(sites) {
        if (!sites || !sites.length) return { nodes: [], links: [] };
        const catsFromSites = [...new Set(sites.map((s) => (s.category || 'random').toLowerCase()).filter(Boolean))];
        const categories = catsFromSites.length ? catsFromSites.sort() : ['random'];
        const innerRadius = 80;
        const outerRadius = 520;
        const K = categories.length;

        // Group sites by category
        const byCat = {};
        categories.forEach((c) => (byCat[c] = []));
        sites.forEach((site) => {
            const cat = site.category && categories.includes(site.category) ? site.category : (categories[0] || 'random');
            byCat[cat] = byCat[cat] || [];
            byCat[cat].push(site);
        });

        const nodes = [];
        const links = [];
        const hubId = 'hub-center';
        nodes.push({ id: hubId, name: 'Web Core', url: '#', category: 'hub', x: 0, y: 0, z: 0 });

        // Arm directions: distribute uniformly on sphere (golden spiral)
        const armDirs = [];
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < K; i++) {
            const y = 1 - (2 * i + 1) / K;
            const r = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;
            armDirs.push({
                x: Math.cos(theta) * r,
                y,
                z: Math.sin(theta) * r,
            });
        }

        function cross(a, b) {
            return {
                x: a.y * b.z - a.z * b.y,
                y: a.z * b.x - a.x * b.z,
                z: a.x * b.y - a.y * b.x,
            };
        }
        function normalize(v) {
            const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
            return len > 1e-6 ? { x: v.x / len, y: v.y / len, z: v.z / len } : v;
        }

        categories.forEach((cat, ci) => {
            const dir = armDirs[ci];
            const prevDir = armDirs[(ci - 1 + K) % K];
            const nextDir = armDirs[(ci + 1) % K];
            const up = Math.abs(dir.y) > 0.99 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
            const perp1 = normalize(cross(dir, up));
            const perp2 = normalize(cross(dir, perp1));

            const armLen = outerRadius - innerRadius;
            const twistRate = 0.024 + hashStr(cat) * 0.016;
            const phaseOffset = hashStr(cat + 'p') * Math.PI * 2;
            const curlStrength = 0.75 + hashStr(cat + 'c') * 0.5;
            const wobbleRate = 0.028 + hashStr(cat + 'w') * 0.015;
            const wobblePhase = hashStr(cat + 'wp') * Math.PI * 2;
            const interlaceStr = 0.3 + hashStr(cat + 'i') * 0.25;

            const sitesInCat = byCat[cat];
            sitesInCat.forEach((site, i) => {
                const id = site.id || `site-${nodes.length}`;
                const t = (i + 1) / (sitesInCat.length + 1);
                const r = innerRadius + t * armLen;
                const distFromCenter = r - innerRadius;
                const normDist = distFromCenter / armLen;

                const phase = distFromCenter * twistRate + phaseOffset;
                const wobble = distFromCenter * wobbleRate + wobblePhase;
                const curlRadius = curlStrength * distFromCenter * (0.5 + 0.45 * Math.sin(wobble));
                const curlX = curlRadius * (Math.cos(phase) * perp1.x + Math.sin(phase) * perp2.x);
                const curlY = curlRadius * (Math.cos(phase) * perp1.y + Math.sin(phase) * perp2.y);
                const curlZ = curlRadius * (Math.cos(phase) * perp1.z + Math.sin(phase) * perp2.z);

                const midDir = { x: (prevDir.x + nextDir.x) * 0.5, y: (prevDir.y + nextDir.y) * 0.5, z: (prevDir.z + nextDir.z) * 0.5 };
                const awayFromDir = { x: midDir.x - dir.x, y: midDir.y - dir.y, z: midDir.z - dir.z };
                const il = normalize(awayFromDir);
                const driftMag = r * normDist * interlaceStr * (0.7 + 0.6 * Math.sin(wobble * 1.3));
                const driftX = il.x * driftMag * (hashStr(site.id + 'dx') < 0.5 ? 1 : -1);
                const driftY = il.y * driftMag * (hashStr(site.id + 'dy') < 0.5 ? 1 : -1);
                const driftZ = il.z * driftMag * (hashStr(site.id + 'dz') < 0.5 ? 1 : -1);

                const spread = 0.6 * r;
                const s1 = (hashStr(site.name) - 0.5) * spread;
                const s2 = (hashStr(site.url) - 0.5) * spread;

                const x = dir.x * r + curlX + perp1.x * s1 + perp2.x * s2 + driftX;
                const y = dir.y * r + curlY + perp1.y * s1 + perp2.y * s2 + driftY;
                const z = dir.z * r + curlZ + perp1.z * s1 + perp2.z * s2 + driftZ;

                nodes.push({
                    id,
                    name: site.name || 'Unknown',
                    url: site.url || '#',
                    category: cat,
                    x, y, z,
                    _armIndex: i,
                    _catIndex: ci,
                });
            });
        });

        const nodeList = nodes.filter((n) => n.id !== hubId);
        const byCatNodes = {};
        categories.forEach((c) => (byCatNodes[c] = nodeList.filter((n) => n.category === c)));

        const linkExists = (a, b) => links.some((l) => (l.source === a && l.target === b) || (l.source === b && l.target === a));
        const addLink = (src, tgt) => {
            if (!linkExists(src, tgt)) links.push({ source: src, target: tgt });
        };

        // Spider web: hub to innermost, chain along arm, branching (1→2-3 links outward), lateral + cross-links
        categories.forEach((cat) => {
            const armNodes = byCatNodes[cat].sort((a, b) => (a._armIndex || 0) - (b._armIndex || 0));
            armNodes.forEach((n, i) => {
                if (i === 0) addLink(hubId, n.id);
                else addLink(armNodes[i - 1].id, n.id);
                // Branching: from this node, add 1–2 links to nodes further out (creates fork effect)
                if (i < armNodes.length - 2) {
                    const branchCount = hashStr(n.id + 'b') < 0.55 ? 1 : (hashStr(n.id + 'b2') < 0.4 ? 2 : 1);
                    const steps = [2, 3, 4];
                    const used = new Set();
                    for (let b = 0; b < branchCount; b++) {
                        const k = Math.floor(hashStr(n.id + 's' + b) * steps.length);
                        const j = i + steps[k];
                        if (j < armNodes.length && !used.has(j)) {
                            addLink(n.id, armNodes[j].id);
                            used.add(j);
                        }
                    }
                }
            });
        });

        // Cross-cluster links (spiral web) - connect adjacent arms for interweaving
        categories.forEach((cat, ci) => {
            const armNodes = byCatNodes[cat];
            const nextCat = categories[(ci + 1) % categories.length];
            const nextArm = byCatNodes[nextCat];
            if (!armNodes.length || !nextArm?.length) return;
            const numCross = hashStr(cat + 'x') < 0.55 ? 2 : (hashStr(cat + 'x2') < 0.5 ? 1 : 0);
            for (let k = 0; k < numCross; k++) {
                const ai = Math.floor(hashStr(cat + 'xa' + k) * armNodes.length);
                const bi = Math.floor(hashStr(nextCat + 'xb' + k) * nextArm.length);
                const a = armNodes[ai];
                const b = nextArm[bi];
                if (a && b) addLink(a.id, b.id);
            }
        });

        return { nodes, links };
    }

    /**
     * Generate placeholder graph data - spherical galaxy layout
     */
    function generatePlaceholderData() {
        const nodes = [];
        const links = [];
        const categories = ['tech', 'learning', 'tools', 'entertainment', 'deals', 'random'];
        const nodesPerArm = 5;
        const innerRadius = 50;
        const outerRadius = 350;
        const K = categories.length;

        const armDirs = [];
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < K; i++) {
            const y = 1 - (2 * i + 1) / K;
            const r = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;
            armDirs.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
        }
        function cross(a, b) {
            return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
        }
        function norm(v) {
            const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
            return len > 1e-6 ? { x: v.x / len, y: v.y / len, z: v.z / len } : v;
        }

        const hubId = 'hub-center';
        nodes.push({ id: hubId, name: 'Web Core', url: '#', category: 'hub', x: 0, y: 0, z: 0 });

        categories.forEach((cat, ci) => {
            const dir = armDirs[ci];
            const prevDir = armDirs[(ci - 1 + K) % K];
            const nextDir = armDirs[(ci + 1) % K];
            const up = Math.abs(dir.y) > 0.99 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
            const perp1 = norm(cross(dir, up));
            const perp2 = norm(cross(dir, perp1));
            const armLen = outerRadius - innerRadius;
            const twistRate = 0.024 + (ci * 0.137) % 0.016;
            const phaseOffset = (ci * 0.73) % (Math.PI * 2);
            const curlStrength = 0.75 + (ci * 0.11) % 0.5;
            const wobbleRate = 0.028 + (ci * 0.07) % 0.015;
            const wobblePhase = (ci * 0.5) % (Math.PI * 2);
            const interlaceStr = 0.3 + (ci * 0.13) % 0.25;

            for (let i = 0; i < nodesPerArm; i++) {
                const id = `${cat}-${i}`;
                const t = (i + 1) / (nodesPerArm + 1);
                const r = innerRadius + t * armLen;
                const distFromCenter = r - innerRadius;
                const normDist = distFromCenter / armLen;

                const phase = distFromCenter * twistRate + phaseOffset;
                const wobble = distFromCenter * wobbleRate + wobblePhase;
                const curlRadius = curlStrength * distFromCenter * (0.5 + 0.45 * Math.sin(wobble));
                const curlX = curlRadius * (Math.cos(phase) * perp1.x + Math.sin(phase) * perp2.x);
                const curlY = curlRadius * (Math.cos(phase) * perp1.y + Math.sin(phase) * perp2.y);
                const curlZ = curlRadius * (Math.cos(phase) * perp1.z + Math.sin(phase) * perp2.z);

                const midDir = { x: (prevDir.x + nextDir.x) * 0.5, y: (prevDir.y + nextDir.y) * 0.5, z: (prevDir.z + nextDir.z) * 0.5 };
                const awayFromDir = { x: midDir.x - dir.x, y: midDir.y - dir.y, z: midDir.z - dir.z };
                const il = norm(awayFromDir);
                const driftMag = r * normDist * interlaceStr * (0.7 + 0.6 * Math.sin(wobble * 1.3));
                const driftX = il.x * driftMag * (Math.random() < 0.5 ? 1 : -1);
                const driftY = il.y * driftMag * (Math.random() < 0.5 ? 1 : -1);
                const driftZ = il.z * driftMag * (Math.random() < 0.5 ? 1 : -1);

                const spread = 0.6 * r;
                const s1 = (Math.random() - 0.5) * spread;
                const s2 = (Math.random() - 0.5) * spread;

                nodes.push({
                    id,
                    name: `Site ${ci * nodesPerArm + i + 1}`,
                    url: 'https://example.com',
                    category: cat,
                    x: dir.x * r + curlX + perp1.x * s1 + perp2.x * s2 + driftX,
                    y: dir.y * r + curlY + perp1.y * s1 + perp2.y * s2 + driftY,
                    z: dir.z * r + curlZ + perp1.z * s1 + perp2.z * s2 + driftZ,
                    _armIndex: i,
                });
            }
        });

        const byCat = {};
        categories.forEach((c) => (byCat[c] = nodes.filter((n) => n.category === c)));

        const linkExists = (a, b) => links.some((l) => (l.source === a && l.target === b) || (l.source === b && l.target === a));
        const addLink = (src, tgt) => {
            if (!linkExists(src, tgt)) links.push({ source: src, target: tgt });
        };

        categories.forEach((cat) => {
            const armNodes = byCat[cat].sort((a, b) => a._armIndex - b._armIndex);
            armNodes.forEach((n, i) => {
                if (i === 0) addLink(hubId, n.id);
                else addLink(armNodes[i - 1].id, n.id);
                if (i < armNodes.length - 2) {
                    const branchCount = Math.random() < 0.55 ? 1 : (Math.random() < 0.4 ? 2 : 1);
                    const steps = [2, 3, 4];
                    const used = new Set();
                    for (let b = 0; b < branchCount; b++) {
                        const j = i + steps[Math.floor(Math.random() * steps.length)];
                        if (j < armNodes.length && !used.has(j)) {
                            addLink(n.id, armNodes[j].id);
                            used.add(j);
                        }
                    }
                }
            });
        });

        categories.forEach((cat, ci) => {
            const numCross = Math.random() < 0.6 ? 2 : (Math.random() < 0.5 ? 1 : 0);
            for (let k = 0; k < numCross; k++) {
                const nextCat = categories[(ci + 1) % categories.length];
                const a = byCat[cat][Math.floor(Math.random() * byCat[cat].length)];
                const b = byCat[nextCat][Math.floor(Math.random() * byCat[nextCat].length)];
                if (a && b) addLink(a.id, b.id);
            }
        });

        return { nodes, links };
    }

    const FONT_URL = './fonts/helvetiker_regular.typeface.json';

    /**
     * WebWanderGalaxy - main class
     */
    class WebWanderGalaxy {
        constructor() {
            this.container = null;
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.controls = null;
            this.nodes = [];
            this.links = [];
            this.nodeMeshes = new Map();
            this.linkLines = [];
            this.raycaster = null;
            this.mouse = { x: 0, y: 0 };
            this.hoveredNode = null;
            this.hoverCallbacks = [];
            this.clickCallbacks = [];
            this.animationId = null;
            this._time = 0;
        }

        init(container, options = {}) {
            if (!container) return;
            this.container = container;
            this._useTripleView = options.tripleView === true;

            let data = options.data;
            if (!data) {
                data = this._useTripleView ? processSiteDataTripleView([]) : generatePlaceholderData();
            } else if (Array.isArray(data)) {
                data = this._useTripleView ? processSiteDataTripleView(data) : processSiteData(data);
            } else if (data.nodes?.length && data.nodes[0]?.name && data.nodes[0]?.url && data.nodes[0]?.x === undefined) {
                data = this._useTripleView ? processSiteDataTripleView(data.nodes) : processSiteData(data.nodes);
            }
            this.nodes = data.nodes || [];
            this.links = data.links || [];

            // Hide placeholder overlay
            const placeholder = container.querySelector('.hero__galaxy-placeholder');
            if (placeholder) placeholder.style.display = 'none';

            const width = container.clientWidth;
            const height = container.clientHeight;

            // Scene - deep space
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x050508);
            this.scene.fog = new THREE.FogExp2(0x080a12, 0.0008);

            // Camera
            this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
            this.camera.position.set(0, 0, 500);
            this.camera.lookAt(0, 0, 0);

            // Renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.setClearColor(0x050508, 1);
            container.appendChild(this.renderer.domElement);

            // Distant starfield - multiple layers for depth
            this._starLayers = [];
            const layerConfigs = [
                { count: 600, spread: 1400, size: 0.8, opacity: 0.4, color: 0xffffff },
                { count: 300, spread: 1000, size: 1.2, opacity: 0.6, color: 0xe8eaff },
                { count: 150, spread: 600, size: 2, opacity: 0.5, color: 0xd0d8ff },
            ];
            layerConfigs.forEach((cfg) => {
                const geo = new THREE.BufferGeometry();
                const pos = new Float32Array(cfg.count * 3);
                for (let i = 0; i < cfg.count * 3; i += 3) {
                    pos[i] = (Math.random() - 0.5) * cfg.spread;
                    pos[i + 1] = (Math.random() - 0.5) * cfg.spread;
                    pos[i + 2] = (Math.random() - 0.5) * cfg.spread;
                }
                geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
                const mat = new THREE.PointsMaterial({
                    color: cfg.color,
                    size: cfg.size,
                    map: CIRCLE_TEX,
                    transparent: true,
                    opacity: cfg.opacity,
                    sizeAttenuation: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                });
                this.scene.add(new THREE.Points(geo, mat));
                this._starLayers.push({ geo, mat });
            });

            // Lights - soft cosmic glow
            const ambient = new THREE.AmbientLight(0x202840, 0.4);
            this.scene.add(ambient);
            const dirLight = new THREE.DirectionalLight(0x6b8cff, 0.3);
            dirLight.position.set(50, 80, 100);
            this.scene.add(dirLight);
            const fillLight = new THREE.DirectionalLight(0xff88aa, 0.15);
            fillLight.position.set(-80, -50, 50);
            this.scene.add(fillLight);

            // Build graph inside a group so we can rotate the whole web
            this.webGroup = new THREE.Group();
            this.scene.add(this.webGroup);
            this._buildNebula();
            this._buildNodes();
            this._buildLinks();
            if (!this._useTripleView) this._buildNeonText();

            // Controls (OrbitControls)
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.08;
            this.controls.minDistance = 60;
            this.controls.maxDistance = 900;
            this.controls.enablePan = true;

            // Raycaster for hover/click
            this.raycaster = new THREE.Raycaster();
            this.mouse = new THREE.Vector2();
            this._mouseDownPos = null;
            this._dragThreshold = 8;

            this._boundMouseMove = this._onMouseMove.bind(this);
            this._boundMouseDown = this._onMouseDown.bind(this);
            this._boundClick = this._onClick.bind(this);
            this._boundKeyDown = this._onKeyDown.bind(this);
            this._boundKeyUp = this._onKeyUp.bind(this);
            this._boundBlur = () => { this._keys.w = this._keys.a = this._keys.s = this._keys.d = this._keys.q = this._keys.e = false; };
            container.addEventListener('mousemove', this._boundMouseMove);
            container.addEventListener('mousedown', this._boundMouseDown);
            container.addEventListener('click', this._boundClick);
            window.addEventListener('keydown', this._boundKeyDown);
            window.addEventListener('keyup', this._boundKeyUp);
            window.addEventListener('blur', this._boundBlur);
            window.addEventListener('resize', this._onResize.bind(this));

            this._keys = { w: false, a: false, s: false, d: false, q: false, e: false };
            this._keyPanSpeed = 8;

            this._animate();
            return this;
        }

        _buildNebula() {
            const count = this._useTripleView ? 120 : 550;
            const spread = 600;
            const geo = new THREE.BufferGeometry();
            const pos = new Float32Array(count * 3);
            const cols = new Float32Array(count * 3);
            const cloudColors = [0x6b8cff, 0x8a6bff, 0xff6bb8, 0x6bffff, 0xb86bff, 0x88aaff];
            for (let i = 0; i < count * 3; i += 3) {
                pos[i] = (Math.random() - 0.5) * spread * 2;
                pos[i + 1] = (Math.random() - 0.5) * spread * 2;
                pos[i + 2] = (Math.random() - 0.5) * spread * 2;
                const c = new THREE.Color(cloudColors[Math.floor(Math.random() * cloudColors.length)]);
                cols[i] = c.r * 0.7;
                cols[i + 1] = c.g * 0.7;
                cols[i + 2] = c.b * 0.7;
            }
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
            const mat = new THREE.PointsMaterial({
                size: 48,
                map: CLOUD_TEX,
                vertexColors: true,
                transparent: true,
                opacity: 0.12,
                sizeAttenuation: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const nebula = new THREE.Points(geo, mat);
            this.webGroup.add(nebula);
            this._nebulaPoints = nebula;
        }

        _buildNodes() {
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];
            const sizes = [];

            this.nodes.forEach((node) => {
                positions.push(node.x || 0, node.y || 0, node.z || 0);
                const color = getCategoryColor(node.category);
                const c = new THREE.Color(color);
                colors.push(c.r, c.g, c.b);
                sizes.push(node.category === 'hub' ? 12 : 4 + Math.random() * 3);
            });

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

            const material = new THREE.PointsMaterial({
                size: 14,
                map: CIRCLE_TEX,
                vertexColors: true,
                transparent: true,
                opacity: 1,
                sizeAttenuation: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });

            const points = new THREE.Points(geometry, material);
            points.userData = { type: 'nodes', nodes: this.nodes };
            this.webGroup.add(points);
            this.nodePoints = points;
            this.nodeMaterial = material;

            // Glow halos - multiple layers for stronger star glow
            const haloGeo = new THREE.BufferGeometry();
            haloGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions.slice(), 3));
            const haloMat = new THREE.PointsMaterial({
                size: 42,
                map: CIRCLE_TEX,
                vertexColors: true,
                transparent: true,
                opacity: 0.35,
                sizeAttenuation: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            this.webGroup.add(new THREE.Points(haloGeo, haloMat));
            this.nodeHalos = haloMat;

            // Outer glow - softest halo layer
            const outerHaloGeo = new THREE.BufferGeometry();
            outerHaloGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions.slice(), 3));
            const outerHaloMat = new THREE.PointsMaterial({
                size: 72,
                map: CLOUD_TEX,
                vertexColors: true,
                transparent: true,
                opacity: 0.18,
                sizeAttenuation: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            this.webGroup.add(new THREE.Points(outerHaloGeo, outerHaloMat));
            this.nodeOuterHalos = outerHaloMat;

            // Individual spheres for raycasting (invisible but hittable)
            this.nodeSpheres = [];
            this.nodes.forEach((node, i) => {
                const geom = new THREE.SphereGeometry(18, 8, 8);
                const mat = new THREE.MeshBasicMaterial({ visible: false });
                const mesh = new THREE.Mesh(geom, mat);
                mesh.position.set(node.x, node.y, node.z);
                mesh.userData = { node, index: i };
                this.webGroup.add(mesh);
                this.nodeSpheres.push(mesh);
            });
        }

        _buildLinks() {
            this.linkLines = [];
            this.linkMaterials = [];
            this.linkParticles = [];

            this.links.forEach((link, idx) => {
                const src = this.nodes.find((n) => n.id === link.source || n.id === link.source?.id);
                const tgt = this.nodes.find((n) => n.id === link.target || n.id === link.target?.id);
                if (!src || !tgt) return;

                const start = new THREE.Vector3(src.x, src.y, src.z);
                const end = new THREE.Vector3(tgt.x, tgt.y, tgt.z);

                const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
                const dir = new THREE.Vector3().subVectors(end, start);
                const len = dir.length();
                const curveAmount = Math.min(len * 0.25, 70);
                const up = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
                const perp = new THREE.Vector3().crossVectors(dir, up).normalize();
                const seed = ((idx * 127) % 1000) / 1000;
                perp.multiplyScalar(curveAmount * (seed < 0.5 ? 1 : -1));
                const ctrl = mid.clone().add(perp);

                const curve = new THREE.QuadraticBezierCurve3(start, ctrl, end);
                const curvePts = curve.getPoints(16);

                const geom = new THREE.BufferGeometry().setFromPoints(curvePts);
                const material = new THREE.LineBasicMaterial({
                    color: 0x6b8cff,
                    transparent: true,
                    opacity: 0.35,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                });
                const line = new THREE.Line(geom, material);
                this.webGroup.add(line);
                this.linkLines.push(line);
                this.linkMaterials.push({ mat: material, phase: Math.random() * Math.PI * 2 });

                const p0 = curvePts[0];
                const particleGeo = new THREE.BufferGeometry();
                particleGeo.setAttribute('position', new THREE.Float32BufferAttribute([p0.x, p0.y, p0.z], 3));
                const particleMat = new THREE.PointsMaterial({
                    color: 0x88aaff,
                    size: 4,
                    map: CIRCLE_TEX,
                    transparent: true,
                    opacity: 0.8,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    sizeAttenuation: true,
                });
                const particles = new THREE.Points(particleGeo, particleMat);
                particles.userData = { curve, phase: Math.random() };
                this.webGroup.add(particles);
                this.linkParticles.push(particles);
            });
        }

        _buildNeonText() {
            const loader = new FontLoader();
            const fontUrl = FONT_URL + (FONT_URL.includes('?') ? '&' : '?') + 'v=2';
            loader.load(fontUrl, (font) => {
                if (!this.webGroup) return;
                const geo = new TextGeometry('WebWander', {
                    font,
                    size: 28,
                    height: 5,
                    curveSegments: 8,
                    bevelEnabled: false,
                    bevelThickness: 0,
                    bevelSize: 0,
                });
                geo.computeBoundingBox();
                const c = geo.boundingBox.getCenter(new THREE.Vector3());
                geo.translate(-c.x, -c.y, -c.z);
                geo.computeBoundingBox();

                // Vertex colors from category palette - gradient left to right
                const pos = geo.attributes.position;
                const colors = new Float32Array(pos.count * 3);
                const minX = geo.boundingBox.min.x;
                const rangeX = geo.boundingBox.max.x - minX || 1;
                const palette = COLOR_PALETTE;
                for (let i = 0; i < pos.count; i++) {
                    const t = rangeX > 0 ? (pos.getX(i) - minX) / rangeX : 0;
                    const idx = t * (palette.length - 1);
                    const i0 = Math.floor(idx) % palette.length;
                    const i1 = Math.min(i0 + 1, palette.length - 1);
                    const f = idx - Math.floor(idx);
                    const c0 = new THREE.Color(palette[i0]);
                    const c1 = new THREE.Color(palette[i1]);
                    c0.lerp(c1, f);
                    colors[i * 3] = c0.r;
                    colors[i * 3 + 1] = c0.g;
                    colors[i * 3 + 2] = c0.b;
                }
                geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

                const mat = new THREE.MeshBasicMaterial({
                    vertexColors: true,
                    transparent: true,
                    opacity: 0.9,
                });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.scale.set(1.5, 1, 1);
                this.webGroup.add(mesh);
                this._neonTextMesh = mesh;
                this._neonTextMinX = geo.boundingBox.min.x;
                this._neonTextRangeX = geo.boundingBox.max.x - geo.boundingBox.min.x || 1;

                // Particles flowing along the text outline (like link particles)
                const shapes = font.generateShapes('WebWander', 28);
                const outlinePoints = [];
                shapes.forEach((shape) => {
                    const pts = shape.getPoints ? shape.getPoints(6) : [];
                    pts.forEach((p) => {
                        outlinePoints.push(new THREE.Vector3(
                            (p.x - c.x) * 1.5, p.y - c.y, -c.z
                        ));
                    });
                });
                if (outlinePoints.length > 2) {
                    const textCurve = new THREE.CatmullRomCurve3(outlinePoints, true);
                    this._neonTextParticles = [];
                    const count = 14;
                    for (let i = 0; i < count; i++) {
                        const phase = i / count;
                        const pt = textCurve.getPoint(phase);
                        const particleGeo = new THREE.BufferGeometry();
                        particleGeo.setAttribute('position', new THREE.Float32BufferAttribute([pt.x, pt.y, pt.z], 3));
                        const particleMat = new THREE.PointsMaterial({
                            color: 0xffffff,
                            size: 3,
                            map: CIRCLE_TEX,
                            transparent: true,
                            opacity: 0.9,
                            blending: THREE.AdditiveBlending,
                            depthWrite: false,
                            sizeAttenuation: true,
                        });
                        const particles = new THREE.Points(particleGeo, particleMat);
                        particles.userData = { curve: textCurve, phase };
                        this.webGroup.add(particles);
                        this._neonTextParticles.push(particles);
                    }
                }
            }, undefined, (err) => {
                console.warn('[WebWander] Font load failed:', err?.message || err);
            });
        }

        _isWandering() {
            return this.container?.closest('.hero')?.classList.contains('hero--wandering') ?? false;
        }

        _onKeyDown(event) {
            if (!this._isWandering() || !this.controls) return;
            const k = this._keys;
            if (event.code === 'KeyW') { k.w = true; event.preventDefault(); }
            else if (event.code === 'KeyS') { k.s = true; event.preventDefault(); }
            else if (event.code === 'KeyA') { k.a = true; event.preventDefault(); }
            else if (event.code === 'KeyD') { k.d = true; event.preventDefault(); }
            else if (event.code === 'KeyQ') { k.q = true; event.preventDefault(); }
            else if (event.code === 'KeyE') { k.e = true; event.preventDefault(); }
        }

        _onKeyUp(event) {
            const k = this._keys;
            if (event.code === 'KeyW') k.w = false;
            else if (event.code === 'KeyS') k.s = false;
            else if (event.code === 'KeyA') k.a = false;
            else if (event.code === 'KeyD') k.d = false;
            else if (event.code === 'KeyQ') k.q = false;
            else if (event.code === 'KeyE') k.e = false;
        }

        _applyKeyPan() {
            if (!this.controls || !this.camera || !this.container || !this._isWandering()) return;
            const k = this._keys;
            if (!k.w && !k.s && !k.a && !k.d && !k.q && !k.e) return;
            const cam = this.camera;
            const target = this.controls.target;
            const targetDistance = cam.position.distanceTo(target);
            const h = this.container.clientHeight || 1;
            const speed = 2 * (this._keyPanSpeed || 8) * targetDistance / h;
            const forward = new THREE.Vector3();
            const right = new THREE.Vector3();
            cam.getWorldDirection(forward);
            forward.y = 0;
            forward.normalize();
            right.setFromMatrixColumn(cam.matrix, 0);
            right.y = 0;
            right.normalize();
            const move = new THREE.Vector3(0, 0, 0);
            if (k.w) move.add(forward);
            if (k.s) move.sub(forward);
            if (k.a) move.sub(right);
            if (k.d) move.add(right);
            if (move.lengthSq() > 0) {
                move.normalize().multiplyScalar(speed);
                target.add(move);
                cam.position.add(move);
            }
            const rollSpeed = 0.025;
            if (k.q || k.e) {
                const forward = new THREE.Vector3().subVectors(target, cam.position).normalize();
                const up = cam.up.clone();
                const angle = k.q ? rollSpeed : -rollSpeed;
                up.applyAxisAngle(forward, angle);
                cam.up.copy(up);
            }
        }

        _onMouseMove(event) {
            if (!this.container) return;
            const rect = this.container.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        }

        _onMouseDown(event) {
            if (event.button === 0) this._mouseDownPos = { x: event.clientX, y: event.clientY };
        }

        _onClick(event) {
            if (event.button !== 0) return;
            if (this._mouseDownPos) {
                const dx = event.clientX - this._mouseDownPos.x;
                const dy = event.clientY - this._mouseDownPos.y;
                if (dx * dx + dy * dy > this._dragThreshold * this._dragThreshold) {
                    this._mouseDownPos = null;
                    return;
                }
            }
            this._mouseDownPos = null;

            const hit = this._pickNode();
            if (hit) {
                this.clickCallbacks.forEach((cb) => cb(hit.node));
                if (hit.node.url && hit.node.url !== '#' && hit.node.category !== 'hub') {
                    window.open(hit.node.url, '_blank');
                }
            }
        }

        _pickNode() {
            if (!this.raycaster || !this.camera || !this.nodeSpheres.length) return null;
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.nodeSpheres);
            if (intersects.length) return intersects[0].object.userData;
            return null;
        }

        _animate() {
            this.animationId = requestAnimationFrame(this._animate.bind(this));
            this._time += 0.016;

            if (this.controls) {
                this._applyKeyPan();
                this.controls.update();
            }
            if (this.webGroup && !this._useTripleView) this.webGroup.rotation.z -= 0.00025;

            // Animate web threads - subtle pulse
            if (this.linkMaterials) {
                this.linkMaterials.forEach(({ mat, phase }) => {
                    mat.opacity = 0.25 + 0.2 * Math.sin(this._time * 1.2 + phase);
                });
            }

            // Animate flowing colors along neon text - loops around the word
            if (this._neonTextMesh) {
                const geo = this._neonTextMesh.geometry;
                const pos = geo.attributes.position;
                const colors = geo.attributes.color;
                if (pos && colors) {
                    const minX = this._neonTextMinX;
                    const rangeX = this._neonTextRangeX;
                    const palette = COLOR_PALETTE;
                    const offset = (this._time * 0.2) % 1;
                    for (let i = 0; i < pos.count; i++) {
                        const tBase = rangeX > 0 ? (pos.getX(i) - minX) / rangeX : 0;
                        const t = ((tBase + offset) % 1 + 1) % 1;
                        const idx = t * (palette.length - 0.001);
                        const i0 = Math.floor(idx) % palette.length;
                        const i1 = (i0 + 1) % palette.length;
                        const f = idx - Math.floor(idx);
                        const c0 = new THREE.Color(palette[i0]);
                        const c1 = new THREE.Color(palette[i1]);
                        c0.lerp(c1, f);
                        colors.array[i * 3] = c0.r;
                        colors.array[i * 3 + 1] = c0.g;
                        colors.array[i * 3 + 2] = c0.b;
                    }
                    colors.needsUpdate = true;
                }
            }

            // Animate particles flowing along neon text outline
            if (this._neonTextParticles) {
                this._neonTextParticles.forEach((pts) => {
                    const u = pts.userData;
                    const t = ((this._time * 0.25 + u.phase) % 1 + 1) % 1;
                    const pt = u.curve.getPoint(t);
                    const pos = pts.geometry.attributes.position;
                    pos.array[0] = pt.x;
                    pos.array[1] = pt.y;
                    pos.array[2] = pt.z;
                    pos.needsUpdate = true;
                });
            }

            // Animate flowing particles along links
            if (this.linkParticles) {
                this.linkParticles.forEach((pts) => {
                    const u = pts.userData;
                    const t = ((this._time * 0.3 + u.phase) % 1);
                    const pt = u.curve.getPoint(t);
                    const pos = pts.geometry.attributes.position;
                    pos.array[0] = pt.x;
                    pos.array[1] = pt.y;
                    pos.array[2] = pt.z;
                    pos.needsUpdate = true;
                });
            }

            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }

            // Hover check
            const hit = this._pickNode();
            const prevIndex = this.hoveredNode?.index;
            const currIndex = hit?.index;
            if (currIndex !== prevIndex) {
                this.hoveredNode = hit;
                this.hoverCallbacks.forEach((cb) => cb(hit ? hit.node : null));
                this._updateHoverStyle(hit);
            }
        }

        _updateHoverStyle(hit) {
            this.nodeSpheres.forEach((mesh) => {
                const scale = hit && mesh.userData.index === hit.index ? 1.4 : 1;
                mesh.scale.setScalar(scale);
            });
            if (this.nodeMaterial) {
                this.nodeMaterial.size = hit ? 20 : 14;
                this.nodeMaterial.opacity = hit ? 1 : 1;
            }
            if (this.nodeHalos) {
                this.nodeHalos.size = hit ? 55 : 42;
                this.nodeHalos.opacity = hit ? 0.5 : 0.35;
            }
            if (this.nodeOuterHalos) {
                this.nodeOuterHalos.size = hit ? 90 : 72;
                this.nodeOuterHalos.opacity = hit ? 0.28 : 0.18;
            }
        }

        _onResize() {
            if (!this.container || !this.camera || !this.renderer) return;
            const w = this.container.clientWidth;
            const h = this.container.clientHeight;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        }

        onNodeHover(callback) {
            if (typeof callback === 'function') this.hoverCallbacks.push(callback);
        }

        onNodeClick(callback) {
            if (typeof callback === 'function') this.clickCallbacks.push(callback);
        }

        setView(viewName) {
            if (!this.camera || !this.controls) return;
            const dist = 450;
            const views = {
                text: { pos: [0, 0, dist], look: [0, 0, 0] },
                web: { pos: [0, dist, 0], look: [0, 0, 0] },
                spider: { pos: [dist, 0, 0], look: [0, 0, 0] },
            };
            const v = views[viewName] || views.text;
            this._animateCameraTo(
                { x: v.pos[0], y: v.pos[1], z: v.pos[2] },
                { x: v.look[0], y: v.look[1], z: v.look[2] },
                800
            );
        }

        wander() {
            const hub = this.nodes.find((n) => n.category === 'hub' || n.id === 'hub-center');
            const center = hub ? { x: hub.x || 0, y: hub.y || 0, z: hub.z || 0 } : { x: 0, y: 0, z: 0 };
            const camPos = { x: center.x, y: center.y, z: center.z + 280 };
            if (this.camera && this.controls) {
                this._animateCameraTo(camPos, center, 1200);
            }
            const hubIndex = this.nodes.findIndex((n) => n.id === 'hub-center' || n.category === 'hub');
            if (hubIndex >= 0) {
                this.hoveredNode = { node: this.nodes[hubIndex], index: hubIndex };
                this._updateHoverStyle(this.hoveredNode);
                this.hoverCallbacks.forEach((cb) => cb(this.nodes[hubIndex]));
            }
        }

        _animateCameraTo(toPos, lookAt, duration) {
            const startPos = this.camera.position.clone();
            const endPos = new THREE.Vector3(toPos.x, toPos.y, toPos.z);
            const startLookAt = this.controls.target.clone();
            const endLookAt = new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z);
            const startTime = performance.now();

            const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

            const tick = () => {
                const t = Math.min((performance.now() - startTime) / duration, 1);
                const eased = easeOutCubic(t);
                this.camera.position.lerpVectors(startPos, endPos, eased);
                this.controls.target.copy(startLookAt).lerp(endLookAt, eased);
                if (t < 1) requestAnimationFrame(tick);
            };
            tick();
        }

        setData(data) {
            if (!data || !data.nodes) return;
            this.destroy();
            this.nodes = data.nodes;
            this.links = data.links || [];
            if (this.container) this.init(this.container, { data: { nodes: this.nodes, links: this.links } });
        }

        destroy() {
            if (this.animationId) cancelAnimationFrame(this.animationId);
            if (this.container) {
                if (this._boundMouseMove) this.container.removeEventListener('mousemove', this._boundMouseMove);
                if (this._boundMouseDown) this.container.removeEventListener('mousedown', this._boundMouseDown);
                if (this._boundClick) this.container.removeEventListener('click', this._boundClick);
                if (this.renderer && this.renderer.domElement) this.container.removeChild(this.renderer.domElement);
            }
            window.removeEventListener('keydown', this._boundKeyDown);
            window.removeEventListener('keyup', this._boundKeyUp);
            window.removeEventListener('blur', this._boundBlur);
            window.removeEventListener('resize', this._onResize);
            this.nodeSpheres = [];
            this.linkLines = [];
            this.linkMaterials = [];
            this.linkParticles = [];
            this._neonTextMesh = null;
            this._neonTextParticles = [];
        }
    }

    const instance = new WebWanderGalaxy();
    window.webWanderGalaxy = instance;

    export function getCategoryColorHex(cat) {
        const n = getCategoryColor(cat);
        return '#' + n.toString(16).padStart(6, '0');
    }
    export default instance;
