window.onload = () => {
    const feed = document.getElementById('feed');
    const sentinel = document.getElementById('sentinel');
    const iaModal = document.getElementById('ia-modal');
    const modalClose = iaModal.querySelector('.modal-close');
    const modalTitleEs = document.getElementById('modal-title-es');
    const modalDescEs = document.getElementById('modal-desc-es');
    const modalLink = document.getElementById('modal-link');

    const rssUrl = 'https://news.google.com/rss/search?q=sitges&hl=ca&gl=ES&ceid=ES%3Aca';
    // Nota: Hem canviat l'RSS a hl=ca directament per estalviar traduccions pesades que causen errors.
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&t=${Date.now()}`;

    let isFetching = false;

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
        // En Google News RSS, la imatge pot estar en enclosures o descripció
        let url = '';
        if (item.enclosure && item.enclosure.link) url = item.enclosure.link;
        else {
            const match = item.description.match(/<img[^>]+src=["']([^"']+)["']/);
            if (match) url = match[1];
        }

        if (!url) return null;

        // Proxy robust: weserv.nl
        // Google News usa URLs tipus lh3.googleusercontent.com, que sovint funcionen sense proxy si les servim bé
        // però per CORS obligatori usarem el proxy com demana el client
        const cleanUrl = url.replace(/^https?:\/\//, '');
        return `https://images.weserv.nl/?url=${cleanUrl}&w=800&fit=cover`;
    }

    function renderNews(items) {
        if (feed.querySelector('#loading-msg')) feed.innerHTML = '';

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'news-card';

            const imgUrl = extractImage(item);
            const cleanTitle = item.title.split(' - ')[0]; // Treiem el nom del medi al final

            // Per la descripció, netegem el HTML
            const tmp = document.createElement('div');
            tmp.innerHTML = item.description;
            const text = tmp.textContent || tmp.innerText || "";
            const summary = text.substring(0, 180) + "...";

            const imgHtml = imgUrl
                ? `<div class="img-container"><img src="${imgUrl}" alt="Notícia" onerror="this.parentElement.style.display='none'"></div>`
                : '';

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

            // Modal IA
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

    // Scroll Infinit
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) fetchNews();
    }, { threshold: 0.1 });
    observer.observe(sentinel);

    fetchNews();
};
