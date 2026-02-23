document.addEventListener('DOMContentLoaded', () => {
    const feedContainer = document.getElementById('feed');
    const rssUrl = 'https://news.google.com/rss/search?q=Sitges&hl=ca&gl=ES&ceid=ES:ca';
    // Utilitzem rss2json per convertir l'RSS a JSON de forma gratuïta al client
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

    async function fetchNews() {
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Error al connectar amb el servei de notícies');

            const data = await response.json();

            if (data.status !== 'ok') {
                throw new Error('No es han pogut carregar les notícies del servidor');
            }

            renderNews(data.items);
        } catch (error) {
            console.error('Error:', error);
            feedContainer.innerHTML = `
                <div style="text-align:center; padding:2rem; border: 2px solid var(--burgundy); border-radius: 8px;">
                    <h2 style="color: var(--burgundy);">⚠️ Problema amb la Veu</h2>
                    <p style="margin-top: 1rem;">Ho sentim, no s'han pogut carregar les notícies en aquest moment.</p>
                    <p style="font-size: 0.8rem; color: #666;">${error.message}</p>
                </div>
            `;
        }
    }

    function renderNews(items) {
        feedContainer.innerHTML = ''; // Netegem el contenidor

        if (items.length === 0) {
            feedContainer.innerHTML = '<p style="text-align:center;">No hi ha notícies recents de Sitges.</p>';
            return;
        }

        items.forEach(item => {
            const article = document.createElement('article');
            article.className = 'news-card';

            // Formatem la data
            const dateParams = { day: 'numeric', month: 'long', year: 'numeric' };
            const dateFormatted = new Date(item.pubDate).toLocaleDateString('ca-ES', dateParams);

            article.innerHTML = `
                <div class="news-card-title">
                    <h2>${item.title}</h2>
                </div>
                <div class="news-content">
                    <p>${item.description || 'Consulta els detalls complets d\'aquesta crònica a la font original.'}</p>
                    <div class="news-meta-box">
                        <span class="source">Font: <strong>${item.author || 'Google News'}</strong></span>
                        <span class="date">Publicat: ${dateFormatted}</span>
                    </div>
                    <a href="${item.link}" target="_blank" class="read-more-link">Llegir notícia completa &rarr;</a>
                </div>
            `;
            feedContainer.appendChild(article);
        });
    }

    fetchNews();
});
