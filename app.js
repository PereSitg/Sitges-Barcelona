// Configuració
const feedContainer = document.getElementById('feed');
const loadingTrigger = document.getElementById('loading');

const CACHE_KEY = 'la_veu_noticies_v2';
const CACHE_TIME = 4 * 60 * 60 * 1000; // 4 hores

const fetchNews = async () => {
    loadingTrigger.style.display = 'block';

    // 1. Comprovar cache
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
        const { timestamp, news } = JSON.parse(cachedData);
        if (new Date().getTime() - timestamp < CACHE_TIME) {
            renderNews(news);
            loadingTrigger.style.display = 'none';
            return;
        }
    }

    try {
        const response = await fetch('/api/news');
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        const news = await response.json();

        localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: new Date().getTime(),
            news: news
        }));

        renderNews(news);
    } catch (error) {
        console.error('Error fetching news:', error);
        feedContainer.innerHTML = `
            <div style="text-align:center; padding:2rem;">
                <p>No s'han pogut carregar les notícies reals.</p>
                <p style="font-size: 0.8rem; color: #cc0000; margin-top: 1rem;">Detalls: ${error.message}</p>
                <button onclick="localStorage.removeItem('${CACHE_KEY}'); location.reload();" style="margin-top: 1rem; border: none; background: var(--burgundy); color: white; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Tornar a provar</button>
            </div>
        `;
    } finally {
        loadingTrigger.style.display = 'none';
    }
};

const renderNews = (newsItems) => {
    feedContainer.innerHTML = '';
    newsItems.forEach(item => {
        const card = createNewsCard(item);
        feedContainer.appendChild(card);
    });
};

const createNewsCard = (item) => {
    const card = document.createElement('article');
    card.className = 'news-card';
    let isTranslated = true;

    card.innerHTML = `
        <div class="news-image" style="height: 220px; background: url('${item.image}') center/cover no-repeat; border-bottom: 4px solid var(--burgundy);"></div>
        <h2 class="title-el">${item.title}</h2>
        <div class="news-content">
            <div class="ai-badge">✨ Traducció IA (Llama 3)</div>
            <p>Font original: <strong>${item.source}</strong></p>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <a href="${item.link}" target="_blank" class="read-more-btn">Llegir notícia completa &rarr;</a>
                <button class="translation-toggle">Original: ${item.originalTitle.substring(0, 30)}...</button>
            </div>
            <span class="news-meta">Publicat el ${new Date(item.pubDate).toLocaleDateString('ca-ES')}</span>
        </div>
    `;

    const titleEl = card.querySelector('.title-el');
    const toggleBtn = card.querySelector('.translation-toggle');
    const aiBadge = card.querySelector('.ai-badge');

    toggleBtn.addEventListener('click', () => {
        if (isTranslated) {
            titleEl.textContent = item.originalTitle;
            toggleBtn.textContent = 'Veure traducció al català';
            aiBadge.style.opacity = '0.3';
        } else {
            titleEl.textContent = item.title;
            toggleBtn.textContent = `Original: ${item.originalTitle.substring(0, 30)}...`;
            aiBadge.style.opacity = '1';
        }
        isTranslated = !isTranslated;
    });

    return card;
};

fetchNews();
setInterval(fetchNews, 10 * 60 * 1000); // Check cache every 10 mins
