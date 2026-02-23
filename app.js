window.onload = () => {
    const feed = document.getElementById('feed');
    const twitterFeed = document.getElementById('twitter-feed');
    const sentinel = document.getElementById('sentinel');
    const iaModal = document.getElementById('ia-modal');
    const modalClose = iaModal.querySelector('.modal-close');
    const modalTitleEs = document.getElementById('modal-title-es');
    const modalDescEs = document.getElementById('modal-desc-es');
    const modalLink = document.getElementById('modal-link');

    const brandLink = document.getElementById('brand-link');
    const linkGeneral = document.getElementById('link-general');
    const linkFestival = document.getElementById('link-festival');

    // Feeds Config
    const RSS_NEWS = [
        'https://news.google.com/rss/search?q=sitges&hl=es&gl=ES&ceid=ES%3Aes',
        'https://www.ccgarraf.cat/rss/11/0/',
        'https://www.ccgarraf.cat/rss/36/0/',
        'https://www.ccgarraf.cat/rss/12/0/',
        'https://www.ccgarraf.cat/rss/15/0/',
        'https://www.ccgarraf.cat/rss/14/0/'
    ];

    const RSS_X = 'https://nitter.net/search/rss?f=tweets&q=%23sitges';

    // Safe Images List (Curated)
    const SAFE_SITGES_IMAGES = [
        'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Sitges_-_Esgl%C3%A9sia_de_Sant_Bartomeu_i_Santa_Tecla.jpg/1200px-Sitges_-_Esgl%C3%A9sia_de_Sant_Bartomeu_i_Santa_Tecla.jpg&w=800&fit=cover',
        'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Sitges_%28Barcelona%29_-_Espanya.jpg/1200px-Sitges_%28Barcelona%29_-_Espanya.jpg&w=800&fit=cover',
        'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Sitges_carrer.jpg/1200px-Sitges_carrer.jpg&w=800&fit=cover',
        'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/8/87/Sitges_-_panoramio.jpg/1200px-Sitges_-_panoramio.jpg&w=800&fit=cover'
    ];

    let currentSection = 'general';
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
        if (url) {
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

            const urls = currentSection === 'festival'
                ? ['https://news.google.com/rss/search?q=festival%20cinema%20sitges&hl=es&gl=ES&ceid=ES%3Aes']
                : RSS_NEWS;

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
                if (uniqueTitles.has(item.title)) return false;
                uniqueTitles.add(item.title);
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
            const iaBtn = titleObj.translated ? '<button class="btn-ia">IA 🤖</button>' : '';

            card.innerHTML = `
                <div class="card-title">
                    <h2>${titleObj.text}</h2>
                    <span class="news-date">${date}</span>
                </div>
                <div class="img-container"><img src="${imgUrl}" alt="Sitges"></div>
                <div class="card-body">
                    <p>${summary}</p>
                    <div class="card-actions">
                        <a href="${item.link}" target="_blank" class="btn-read">Llegir notícia &rarr;</a>
                        ${iaBtn}
                    </div>
                </div>
            `;
            if (titleObj.translated) {
                card.querySelector('.btn-ia').onclick = () => {
                    modalTitleEs.textContent = item.title;
                    modalDescEs.textContent = tmp.textContent;
                    modalLink.href = item.link;
                    iaModal.style.display = 'flex';
                };
            }
            feed.appendChild(card);
        });
    }

    async function fetchX() {
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_X)}&t=${Date.now()}`;
        try {
            const res = await fetch(apiUrl);
            const data = await res.json();
            if (data.status === 'ok') renderX(data.items);
        } catch (e) { console.error(e); }
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

    function switchSection(section) {
        currentSection = section;
        linkGeneral.classList.toggle('active', section === 'general');
        linkFestival.classList.toggle('active', section === 'festival');
        window.scrollTo(0, 0);
        fetchNews(true);
    }

    brandLink.onclick = () => switchSection('general');
    linkGeneral.onclick = (e) => { e.preventDefault(); switchSection('general'); };
    linkFestival.onclick = (e) => { e.preventDefault(); switchSection('festival'); };
    modalClose.onclick = () => iaModal.style.display = 'none';

    const obs = new IntersectionObserver((es) => { if (es[0].isIntersecting) fetchNews(); }, { threshold: 0.1 });
    obs.observe(sentinel);

    // Init
    fetchNews(true);
    fetchX();
    setInterval(() => { fetchNews(true); fetchX(); }, 4 * 60 * 60 * 1000);
};
