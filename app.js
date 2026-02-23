window.onload = () => {
    const feed = document.getElementById('feed');
    const sentinel = document.getElementById('sentinel');
    const iaModal = document.getElementById('ia-modal');
    const modalClose = iaModal.querySelector('.modal-close');
    const modalTitleEs = document.getElementById('modal-title-es');
    const modalDescEs = document.getElementById('modal-desc-es');
    const modalLink = document.getElementById('modal-link');

    // Tornem al feed en Castellà per tenir totes les notícies
    const rssUrl = 'https://news.google.com/rss/search?q=sitges&hl=es&gl=ES&ceid=ES%3Aes';
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&t=${Date.now()}`;

    let isFetching = false;

    async function translateTitle(title) {
        try {
            // Netegem el títol d'extensió de font "- La Vanguardia", etc
            const baseTitle = title.split(' - ')[0];
            const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(baseTitle)}&langpair=es|ca`);
            const data = await res.json();
            return data.responseData.translatedText || baseTitle;
        } catch (e) {
            return title.split(' - ')[0]; // Fallback al títol net en castellà
        }
    }

    async function fetchNews() {
        if (isFetching) return;
        isFetching = true;

        try {
            const res = await fetch(apiUrl);
            const data = await res.json();
            if (data.status !== 'ok') throw new Error('API sanchat');

            renderNews(data.items);
        } catch (e) {
            console.error(e);
        } finally {
            isFetching = false;
        }
    }

    function extractImage(item) {
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

        // --- REQUISIT: Si no hi ha imatge, en busquem una del tema ---
        // Usem LoremFlickr amb el tag "sitges,spain" per garantir una foto d'acord amb el tema
        return `https://loremflickr.com/800/400/sitges,spain?random=${Math.random()}`;
    }

    async function renderNews(items) {
        if (feed.querySelector('#loading-msg')) feed.innerHTML = '';

        // Traduccions en paral·lel dels títols (només títols per no saturar l'API MyMemory)
        const translatedTitles = await Promise.all(items.map(item => translateTitle(item.title)));

        items.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'news-card';

            const imgUrl = extractImage(item);
            const titleCa = translatedTitles[index];

            const tmp = document.createElement('div');
            tmp.innerHTML = item.description;
            const text = tmp.textContent || tmp.innerText || "";
            const summary = text.substring(0, 180) + "...";

            card.innerHTML = `
                <div class="card-title">
                    <h2>${titleCa}</h2>
                </div>
                <div class="img-container">
                    <img src="${imgUrl}" alt="Notícia Sitges" onerror="this.src='https://loremflickr.com/800/400/sitges?random=${Math.random()}'">
                </div>
                <div class="card-body">
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

    modalClose.onclick = () => iaModal.style.display = 'none';
    window.onclick = (e) => { if (e.target == iaModal) iaModal.style.display = 'none'; };

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) fetchNews();
    }, { threshold: 0.1 });
    observer.observe(sentinel);

    fetchNews();
};
