window.onload = () => {
    const feed = document.getElementById('feed');
    const twitterFeed = document.getElementById('twitter-feed');
    const sentinel = document.getElementById('sentinel');
    const iaModal = document.getElementById('ia-modal');
    const modalClose = iaModal.querySelector('.modal-close');
    const modalTitleEs = document.getElementById('modal-title-es');
    const modalDescEs = document.getElementById('modal-desc-es');
    const modalLink = document.getElementById('modal-link');

    const currentSection = document.body.getAttribute('data-section') || 'general';

    // Official developer placeholder (guaranteed stable)
    const PLACEHOLDER_IMAGE = "https://placehold.jp/800020/ffffff/800x600.png?text=LA%20VEU%20DE%20SITGES";

    const FEEDS_CONFIG = {
        general: [
            'https://news.google.com/rss/search?q=sitges&hl=es&gl=ES&ceid=ES%3Aes',
            'https://www.ccgarraf.cat/rss/11/0/',
            'https://www.ccgarraf.cat/rss/36/0/',
            'https://www.ccgarraf.cat/rss/12/0/',
            'https://www.ccgarraf.cat/rss/15/0/',
            'https://www.ccgarraf.cat/rss/14/0/'
        ],
        festival: ['https://news.google.com/rss/search?q=festival%20cinema%20sitges&hl=es&gl=ES&ceid=ES%3Aes'],
        restaurants: [] // Clean section (no news)
    };

    let isFetchingNews = false;
    let allNewsItems = [];
    let itemsShown = 0;

    async function translateTitle(title) {
        const baseTitle = title.split(' - ')[0];
        try {
            const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(baseTitle)}&langpair=es|ca`);
            const data = await res.json();
            const translatedText = data.responseData.translatedText;
            if (!translatedText || translatedText.includes("MYMEMORY WARNING")) return { text: baseTitle, translated: false };
            return { text: translatedText, translated: true };
        } catch (e) { return { text: baseTitle, translated: false }; }
    }

    // Expert Image Extraction with Fallback
    function extractImage(item) {
        let url = '';
        if (item.enclosure && item.enclosure.link) url = item.enclosure.link;
        if (!url && item.thumbnail) url = item.thumbnail;
        if (!url && item.description) {
            const match = item.description.match(/<img[^>]+src=["']([^"']+)["']/);
            if (match) url = match[1];
        }

        if (url && !url.includes('google.com')) {
            // Using wsrv.nl as it's the most reliable public image proxy
            return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=800&fit=cover`;
        }
        return PLACEHOLDER_IMAGE;
    }

    async function fetchNews(isInitial = false) {
        if (currentSection === 'restaurants') return;
        if (isFetchingNews) return;
        isFetchingNews = true;

        if (isInitial) {
            allNewsItems = [];
            itemsShown = 0;
            feed.innerHTML = '<div id="loading-msg">Carregant la Veu de Sitges...</div>';

            const urls = FEEDS_CONFIG[currentSection] || FEEDS_CONFIG.general;
            const fetchPromises = urls.map(url => {
                const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&t=${Date.now()}`;
                return fetch(apiUrl).then(res => res.json()).catch(() => null);
            });

            const responses = await Promise.all(fetchPromises);
            let merged = [];
            responses.forEach(data => { if (data && data.status === 'ok') merged = merged.concat(data.items); });
            merged.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
            const uniqueTitles = new Set();
            allNewsItems = merged.filter(item => {
                const cleanTitle = item.title.trim();
                if (uniqueTitles.has(cleanTitle)) return false;
                uniqueTitles.add(cleanTitle);
                return true;
            });
        }

        const nextSub = allNewsItems.slice(itemsShown, itemsShown + 10);
        if (nextSub.length > 0) {
            await renderNews(nextSub);
            itemsShown += nextSub.length;
        }
        isFetchingNews = false;
    }

    async function renderNews(items) {
        if (feed.querySelector('#loading-msg')) feed.innerHTML = '';
        const translated = await Promise.all(items.map(i => translateTitle(i.title)));

        items.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'news-card';
            const imgUrl = extractImage(item);
            const titleObj = translated[idx];
            const date = new Date(item.pubDate).toLocaleDateString('ca-ES', { day: '2-digit', month: 'long', year: 'numeric' });

            const tmp = document.createElement('div');
            tmp.innerHTML = item.description;
            const summary = (tmp.textContent || tmp.innerText || "").substring(0, 150) + "...";

            card.innerHTML = `
                <div class="card-title">
                    ${titleObj.translated ? '' : '<span class="translation-badge">Pendent de traducció</span>'}
                    <h2>${titleObj.text}</h2>
                    <span class="news-date">${date}</span>
                </div>
                <div class="img-container">
                    <img src="${imgUrl}" alt="Sitges" onerror="this.onerror=null; this.src='${PLACEHOLDER_IMAGE}'">
                </div>
                <div class="card-body">
                    <p>${summary}</p>
                    <div class="card-actions">
                        <a href="${item.link}" target="_blank" class="btn-read">Llegir notícia &rarr;</a>
                        <button class="btn-ia">IA 🤖</button>
                    </div>
                </div>
            `;

            card.querySelector('.btn-ia').onclick = () => {
                modalTitleEs.textContent = item.title;
                modalDescEs.textContent = tmp.textContent;
                modalLink.href = item.link;
                iaModal.style.display = 'flex';
            };

            feed.appendChild(card);
        });
    }

    modalClose.onclick = () => iaModal.style.display = 'none';
    window.onclick = (e) => { if (e.target == iaModal) iaModal.style.display = 'none'; };

    const obs = new IntersectionObserver((es) => { if (es[0].isIntersecting) fetchNews(); }, { threshold: 0.1 });
    obs.observe(sentinel);

    fetchNews(true);
    // Note: Twitter Widget is handled by the static script in HTML for official support
};
