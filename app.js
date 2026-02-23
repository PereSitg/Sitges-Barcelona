window.onload = () => {
    const feed = document.getElementById('feed');
    const twitterFeed = document.getElementById('twitter-feed');
    const sentinel = document.getElementById('sentinel');
    const iaModal = document.getElementById('ia-modal');
    const modalClose = iaModal.querySelector('.modal-close');
    const modalTitleEs = document.getElementById('modal-title-es');
    const modalDescEs = document.getElementById('modal-desc-es');
    const modalLink = document.getElementById('modal-link');

    // Detectem la secció segons l'atribut de la pàgina
    const currentSection = document.body.getAttribute('data-section') || 'general';

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
        restaurants: ['https://news.google.com/rss/search?q=donde+comer+en+sitges&hl=es&gl=ES&ceid=ES%3Aes']
    };

    // Llista d'instàncies Nitter per seguretat (fallback)
    const NITTER_INSTANCES = [
        'https://nitter.net',
        'https://nitter.poast.org',
        'https://nitter.cz',
        'https://nitter.privacydev.net'
    ];

    // Imatges de Sitges realment estables (Unsplash i Wikimedia directes)
    const SAFE_SITGES_IMAGES = [
        'https://images.unsplash.com/photo-1548175114-61c0bd664653?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1582260600171-89771ba0df8b?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1544919982-b61976f0ba43?q=80&w=800&auto=format&fit=crop',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Sitges_-_Esgl%C3%A9sia_de_Sant_Bartomeu_i_Santa_Tecla.jpg/800px-Sitges_-_Esgl%C3%A9sia_de_Sant_Bartomeu_i_Santa_Tecla.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Sitges_01.jpg/800px-Sitges_01.jpg'
    ];

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

    function extractImage(item) {
        let url = '';
        if (item.enclosure && item.enclosure.link) url = item.enclosure.link;
        else {
            const match = item.description.match(/<img[^>]+src=["']([^"']+)["']/);
            if (match) url = match[1];
        }
        // Evitem proxies que fallen, intentem weserv només si és segur
        if (url && !url.includes('google.com')) {
            const cleanUrl = url.replace(/^https?:\/\//, '');
            return `https://images.weserv.nl/?url=${cleanUrl}&w=800&fit=cover`;
        }
        return SAFE_SITGES_IMAGES[Math.floor(Math.random() * SAFE_SITGES_IMAGES.length)];
    }

    async function fetchNews(isInitial = false) {
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

            const iaBtnHtml = '<button class="btn-ia">IA 🤖</button>';
            const badgeCa = titleObj.translated ? '' : '<span class="translation-badge">Pendent de traducció</span>';

            card.innerHTML = `
                <div class="card-title">
                    ${badgeCa}
                    <h2>${titleObj.text}</h2>
                    <span class="news-date">${date}</span>
                </div>
                <div class="img-container">
                    <img src="${imgUrl}" alt="Sitges" onerror="this.src='${SAFE_SITGES_IMAGES[Math.floor(Math.random() * SAFE_SITGES_IMAGES.length)]}'">
                </div>
                <div class="card-body">
                    <p>${summary}</p>
                    <div class="card-actions">
                        <a href="${item.link}" target="_blank" class="btn-read">Llegir notícia &rarr;</a>
                        ${iaBtnHtml}
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

    async function fetchX(instanceIdx = 0) {
        if (!twitterFeed) return;
        if (instanceIdx >= NITTER_INSTANCES.length) {
            twitterFeed.innerHTML = '<div style="padding:1.2rem; color:#888; text-align:center;">Xarxes no disponibles temporalment.</div>';
            return;
        }

        const instance = NITTER_INSTANCES[instanceIdx];
        const rssUrl = `${instance}/search/rss?f=tweets&q=%23sitges`;

        // Utilitzem rss2json per saltar CORS tal com demana l'expert
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

        try {
            const res = await fetch(apiUrl);
            const data = await res.json();
            if (data.status === 'ok' && data.items && data.items.length > 0) {
                renderX(data.items);
            } else {
                fetchX(instanceIdx + 1);
            }
        } catch (e) {
            fetchX(instanceIdx + 1);
        }
    }

    function renderX(items) {
        twitterFeed.innerHTML = '';
        items.slice(0, 10).forEach(item => {
            const card = document.createElement('div');
            card.className = 'news-card x-card';
            const date = new Date(item.pubDate).toLocaleDateString();

            card.innerHTML = `
                <div class="card-title">
                    <h2>@${item.author || 'Sitges'}</h2>
                    <span class="news-date">${date}</span>
                </div>
                <div class="card-body">
                    <p>${item.description}</p>
                    <a href="${item.link}" target="_blank" class="btn-read">Veure a X</a>
                </div>
            `;
            twitterFeed.appendChild(card);
        });
    }

    modalClose.onclick = () => iaModal.style.display = 'none';
    window.onclick = (e) => { if (e.target == iaModal) iaModal.style.display = 'none'; };

    const obs = new IntersectionObserver((es) => { if (es[0].isIntersecting) fetchNews(); }, { threshold: 0.1 });
    obs.observe(sentinel);

    if (currentSection !== 'restaurants') {
        fetchNews(true);
    }
    fetchX();
    setInterval(() => { fetchNews(true); fetchX(); }, 4 * 60 * 60 * 1000);
};
