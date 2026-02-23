window.onload = () => {
    const feed = document.getElementById('feed');
    const sentinel = document.getElementById('sentinel');
    const iaModal = document.getElementById('ia-modal');
    const modalClose = iaModal.querySelector('.modal-close');
    const modalTitleEs = document.getElementById('modal-title-es');
    const modalDescEs = document.getElementById('modal-desc-es');
    const modalLink = document.getElementById('modal-link');

    const bannerTitle = document.getElementById('current-section-title');
    const linkGeneral = document.getElementById('link-general');
    const linkFestival = document.getElementById('link-festival');

    // Feeds
    const FEEDS = {
        general: {
            url: 'https://news.google.com/rss/search?q=sitges&hl=es&gl=ES&ceid=ES%3Aes',
            title: 'Cròniques de Sitges',
            theme: 'default'
        },
        festival: {
            url: 'https://news.google.com/rss/search?q=festival%20cinema%20sitges&hl=es&gl=ES&ceid=ES%3Aes',
            title: 'Sitges Film Festival',
            theme: 'festival'
        }
    };

    let currentSection = 'general';
    let isFetching = false;

    async function translateTitle(title) {
        try {
            const baseTitle = title.split(' - ')[0];
            const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(baseTitle)}&langpair=es|ca`);
            const data = await res.json();
            return data.responseData.translatedText || baseTitle;
        } catch (e) {
            return title.split(' - ')[0];
        }
    }

    async function fetchNews() {
        if (isFetching) return;
        isFetching = true;

        const config = FEEDS[currentSection];
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(config.url)}&t=${Date.now()}`;

        try {
            const res = await fetch(apiUrl);
            const data = await res.json();
            if (data.status !== 'ok') throw new Error('API Error');

            renderNews(data.items, config.theme);
        } catch (e) {
            console.error(e);
        } finally {
            isFetching = false;
        }
    }

    function extractImage(item, theme) {
        let url = '';
        if (item.enclosure && item.enclosure.link) {
            url = item.enclosure.link;
        } else {
            const match = item.description.match(/<img[^>]+src=["']([^"']+)["']/);
            if (match) url = match[1];
        }

        if (url) {
            const cleanUrl = url.replace(/^https?:\/\//, '');
            return `https://images.weserv.nl/?url=${cleanUrl}&w=800&fit=cover`;
        }

        // Fallback per tema
        const keyword = theme === 'festival' ? 'cinema,festival,red-carpet' : 'sitges,spain';
        return `https://loremflickr.com/800/400/${keyword}?random=${Math.random()}`;
    }

    async function renderNews(items, theme) {
        if (feed.innerHTML === '<div id="loading-msg">Carregant la Veu de Sitges...</div>') feed.innerHTML = '';

        const translatedTitles = await Promise.all(items.map(item => translateTitle(item.title)));

        items.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = `news-card ${theme === 'festival' ? 'festival' : ''}`;

            const imgUrl = extractImage(item, theme);
            const titleCa = translatedTitles[index];

            const tmp = document.createElement('div');
            tmp.innerHTML = item.description;
            const text = tmp.textContent || tmp.innerText || "";
            const summary = text.substring(0, 180) + "...";

            const badgeHtml = theme === 'festival' ? '<div class="festival-badge">✨ ESPECIAL FESTIVAL</div>' : '';

            card.innerHTML = `
                <div class="card-title">
                    <h2>${titleCa}</h2>
                </div>
                <div class="img-container">
                    <img src="${imgUrl}" alt="Notícia Sitges" onerror="this.src='https://loremflickr.com/800/400/sitges?random=${Math.random()}'">
                </div>
                <div class="card-body">
                    ${badgeHtml}
                    <p>${summary}</p>
                    <div class="card-actions">
                        <a href="${item.link}" target="_blank" class="btn-read">Llegir notícia completa &rarr;</a>
                        <button class="btn-ia" title="Veure original">IA 🤖</button>
                    </div>
                </div>
            `;

            card.querySelector('.btn-ia').onclick = () => {
                modalTitleEs.textContent = item.title;
                modalDescEs.textContent = text;
                modalLink.href = item.link;
                iaModal.style.display = 'flex';
            };

            feed.appendChild(card);
        });
    }

    function switchSection(section) {
        currentSection = section;
        feed.innerHTML = '<div id="loading-msg">Carregant la Veu de Sitges...</div>';
        bannerTitle.textContent = FEEDS[section].title;

        // Update nav links
        linkGeneral.classList.toggle('active', section === 'general');
        linkFestival.classList.toggle('active', section === 'festival');

        fetchNews();
    }

    linkGeneral.onclick = (e) => { e.preventDefault(); switchSection('general'); };
    linkFestival.onclick = (e) => { e.preventDefault(); switchSection('festival'); };

    modalClose.onclick = () => iaModal.style.display = 'none';
    window.onclick = (e) => { if (e.target == iaModal) iaModal.style.display = 'none'; };

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isFetching) fetchNews();
    }, { threshold: 0.1 });
    observer.observe(sentinel);

    // Initial load
    fetchNews();
};
