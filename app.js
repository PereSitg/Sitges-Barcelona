window.onload = () => {
    const feed = document.getElementById('feed');
    const sentinel = document.getElementById('sentinel');
    const iaModal = document.getElementById('ia-modal');
    const modalClose = iaModal.querySelector('.modal-close');
    const modalTitleEs = document.getElementById('modal-title-es');
    const modalDescEs = document.getElementById('modal-desc-es');
    const modalLink = document.getElementById('modal-link');

    // Feed in Catalan to avoid translation issues
    const rssUrl = 'https://news.google.com/rss/search?q=sitges&hl=ca&gl=ES&ceid=ES%3Aca';
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&t=${Date.now()}`;

    let isFetching = false;

    async function fetchNews() {
        if (isFetching) return;
        isFetching = true;

        try {
            const res = await fetch(apiUrl);
            const data = await res.json();
            if (data.status !== 'ok') throw new Error('API Error');

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
            // Regex to find img src in description
            const match = item.description.match(/<img[^>]+src=["']([^"']+)["']/);
            if (match) url = match[1];
        }

        if (!url) return null;

        // Requirement: Serve via https://images.weserv.nl/?url= removing "https://"
        const cleanUrl = url.replace(/^https?:\/\//, '');
        return `https://images.weserv.nl/?url=${cleanUrl}`;
    }

    function renderNews(items) {
        if (feed.querySelector('#loading-msg')) feed.innerHTML = '';

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'news-card';

            const cleanTitle = item.title.split(' - ')[0];
            const imgUrl = extractImage(item);

            const tmp = document.createElement('div');
            tmp.innerHTML = item.description;
            const text = tmp.textContent || tmp.innerText || "";
            const summary = text.substring(0, 180) + "...";

            const imgHtml = imgUrl
                ? `<div class="img-container"><img src="${imgUrl}" alt="Notícia" onerror="this.parentElement.innerHTML='<div class=\"placeholder-logo\">LA VEU DE SITGES</div>'"></div>`
                : `<div class="img-container"><div class="placeholder-logo">LA VEU DE SITGES</div></div>`;

            card.innerHTML = `
                <div class="card-title">
                    <h2>${cleanTitle}</h2>
                </div>
                ${imgHtml}
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
