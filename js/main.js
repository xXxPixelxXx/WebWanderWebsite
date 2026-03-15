/**
 * WebWander - Main JavaScript
 * Modular structure with galaxy visualization
 */
import galaxy, { getCategoryColorHex } from './galaxy.js';
import { loadData, submitSuggestion } from './data-loader.js';
import { checkSubmission } from './content-filter.js';
import { CHROME_WEB_STORE_URL } from './config.js';

const elements = {
    hero: document.getElementById('hero'),
    galaxyContainer: document.getElementById('web-galaxy-canvas'),
    wanderBtn: document.getElementById('wander-btn'),
    installBtn: document.getElementById('install-btn'),
    discoveryGrid: document.getElementById('discovery-grid'),
    submitForm: document.getElementById('submit-form'),
};

async function initGalaxy() {
    if (!elements.galaxyContainer) return;
    if (elements.discoveryGrid) elements.discoveryGrid.innerHTML = '<p class="discovery__loading">Loading sites…</p>';
    const { sites: siteData, categories } = await loadData();
    try {
        // Use placeholder data when Supabase returns no sites so the galaxy looks good
        galaxy.init(elements.galaxyContainer, {
            data: siteData?.length ? siteData : undefined,
            tripleView: false,
        });
    } catch (e) {
        console.error('Galaxy init failed:', e);
        const ph = elements.galaxyContainer?.querySelector('.hero__galaxy-placeholder .hero__galaxy-hint');
        if (ph) ph.textContent = 'Unable to load visualization. Check the console (F12) for details.';
        return;
    }
    initDiscoverySection(siteData);
    initCategoriesSection(categories);
    initSubmitFormCategories(categories);
    galaxy.onNodeHover((node) => {
            const tooltip = document.getElementById('galaxy-tooltip');
            if (node) {
                document.body.style.cursor = 'pointer';
                if (tooltip) {
                    const hint = node.category === 'hub' ? 'Center of the web' : node.category === 'text' ? 'You found it!' : 'Click to visit';
                    tooltip.innerHTML = `<span class="hero__tooltip-name">${escapeHtml(node.name || 'Unknown site')}</span><span class="hero__tooltip-hint">${hint}</span>`;
                    tooltip.classList.add('hero__tooltip--visible');
                }
            } else {
                document.body.style.cursor = '';
                if (tooltip) {
                    tooltip.innerHTML = '';
                    tooltip.classList.remove('hero__tooltip--visible');
                }
            }
        });

    const galaxyEl = document.getElementById('web-galaxy-canvas');
    if (galaxyEl) {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) {
                    const tooltip = document.getElementById('galaxy-tooltip');
                    if (tooltip) {
                        tooltip.classList.remove('hero__tooltip--visible');
                        tooltip.innerHTML = '';
                    }
                    document.body.style.cursor = '';
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(galaxyEl);
    }
}

function initDiscoverySection(sites) {
    const grid = elements.discoveryGrid;
    if (!grid) return;
    if (!sites?.length) {
        grid.innerHTML = '<p class="discovery__empty">Explore the galaxy above to discover sites, or install the extension to wander the web.</p>';
        return;
    }
    const sample = sites.slice(0, 6);
    grid.innerHTML = sample.map((site) => `
        <article class="site-card">
            <div class="site-card__icon">${getCategoryIcon(site.category)}</div>
            <h3 class="site-card__title">${escapeHtml(site.name)}</h3>
            <p class="site-card__desc">${escapeHtml(getCategoryLabel(site.category))}</p>
            <a href="${escapeHtml(site.url)}" class="site-card__link" target="_blank" rel="noopener">Visit</a>
        </article>
    `).join('');
}

function getCategoryLabel(cat) {
    if (!cat) return '';
    return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function initCategoriesSection(categories) {
    const grid = document.querySelector('.categories__grid');
    if (!grid || !categories?.length) return;
    grid.innerHTML = categories.map((cat) => {
        const color = getCategoryColorHex(cat);
        return `<a href="#" class="category-card" data-category="${escapeHtml(cat)}" style="--category-color: ${color}; border-left: 4px solid ${color}">${escapeHtml(getCategoryLabel(cat))}</a>`;
    }).join('');
}

function initSubmitFormCategories(categories) {
    const select = document.getElementById('site-category');
    if (!select) return;
    const options = categories.length
        ? categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(getCategoryLabel(c))}</option>`).join('')
        : '<option value="random">Random</option>';
    select.innerHTML = '<option value="">Select a category</option>' + options;
}

function getCategoryIcon(cat) {
    const icons = {
        tech: '🔧', learning: '📚', tools: '🛠️', entertainment: '🎬', deals: '💰', random: '✨',
        culture: '🎭', fun: '🎉', ideas: '💡', design: '✨', health: '❤️', gaming: '🎮',
        food: '🍽️', nature: '🌿', music: '🎵', finance: '💰', film: '🎬', books: '📖',
        travel: '✈️', cute: '🌸', handcraft: '🖌️',
    };
    return icons[cat] || '🌐';
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function handleWanderClick() {
    if (!elements.hero) return;
    if (galaxy && typeof galaxy.wander === 'function') {
        elements.hero.requestFullscreen?.() ||
            elements.hero.webkitRequestFullscreen?.() ||
            elements.hero.msRequestFullscreen?.();
    } else {
        document.getElementById('discovery')?.scrollIntoView({ behavior: 'smooth' });
    }
}

function enterFullscreenMode() {
    elements.hero?.classList.add('hero--wandering');
    const exitBtn = document.getElementById('exit-fullscreen-btn');
    if (exitBtn) exitBtn.style.display = 'block';
    if (galaxy?.wander) galaxy.wander();
    window.dispatchEvent(new Event('resize'));
}

function exitFullscreenMode() {
    elements.hero?.classList.remove('hero--wandering');
    const exitBtn = document.getElementById('exit-fullscreen-btn');
    if (exitBtn) exitBtn.style.display = 'none';
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
}

function handleFullscreenChange() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        enterFullscreenMode();
    } else {
        exitFullscreenMode();
    }
}

async function handleSubmitForm(e) {
    e.preventDefault();
    const form = e.target;
    const formData = {
        url: form.elements.url.value,
        name: form.elements.name.value,
        category: form.elements.category.value,
        description: form.elements.description?.value || '',
    };

    const { blocked } = checkSubmission({
        url: formData.url,
        name: formData.name,
        description: formData.description,
    });
    if (blocked) {
        alert('This submission cannot be accepted. Please ensure the URL, site name, and description do not contain inappropriate content.');
        return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';
    }
    try {
        await submitSuggestion(formData);
        form.reset();
        alert('Thanks! Your suggestion was submitted. It may appear in the galaxy once others upvote it.');
    } catch (err) {
        alert('Could not submit: ' + (err.message || 'Please try again.'));
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

function initEventListeners() {
    if (elements.wanderBtn) {
        elements.wanderBtn.addEventListener('click', handleWanderClick);
    }
    if (elements.installBtn) {
        if (CHROME_WEB_STORE_URL) {
            elements.installBtn.href = CHROME_WEB_STORE_URL;
            elements.installBtn.target = '_blank';
            elements.installBtn.rel = 'noopener noreferrer';
        } else {
            elements.installBtn.href = '#how-it-works';
            elements.installBtn.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
            });
        }
    }
    const exitFullscreenBtn = document.getElementById('exit-fullscreen-btn');
    if (exitFullscreenBtn) {
        exitFullscreenBtn.addEventListener('click', exitFullscreenMode);
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    if (elements.submitForm) {
        elements.submitForm.addEventListener('submit', handleSubmitForm);
    }
}

async function init() {
    initEventListeners();
    initSmoothScroll();
    await initGalaxy();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.webWander = { init };
