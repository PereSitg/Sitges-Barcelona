document.addEventListener('DOMContentLoaded', () => {
    const feedContainer = document.getElementById('feed');
    const rssUrl = 'https://news.google.com/rss/search?q=Sitges&hl=ca&gl=ES&ceid=ES:ca';
    // Utilitzem rss2json per convertir l'RSS a JSON
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

    async function fetchNews() {
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Error de connexió');
            const data = await response.json();
            if (data.status !== 'ok') throw new Error('Dades no disponibles');

            renderNews(data.items);
        } catch (error) {
            console.error('Error fetching news:', error);
            feedContainer.innerHTML = `
                <div style="text-align:center; padding:3rem; border:1px solid var(--burgundy); border-radius:12px;">
                    <h2 style="color:var(--burgundy)">⚠️ Error de connexió</h2>
                    <p>No s'han pogut carregar les dades de la Veu en aquest moment.</p>
                </div>
            `;
        }
    }

    function extractImage(description) {
        // Busquem la primera etiqueta <img> dins de la descripció HTML que envia Google News
        const match = description.match(/<img[^>]+src="([^">]+)"/);
        return match ? match[1] : 'https://images.unsplash.com/photo-1548432328-94436579979d?w=800&q=80';
    }

    function cleanDescription(description) {
        // Eliminem el contingut HTML de la descripció per quedar-nos amb el text net
        const div = document.createElement('div');
        div.innerHTML = description;
        return div.textContent || div.innerText || 'Clica per llegir la crònica completa d\'aquesta notícia de Sitges.';
    }

    function renderNews(items) {
        feedContainer.innerHTML = '';

        items.forEach(item => {
            const article = document.createElement('article');
            article.className = 'news-card';

            const imageUrl = extractImage(item.description);
            const pureDescription = cleanDescription(item.description);
            const dateStr = new Date(item.pubDate).toLocaleDateString('ca-ES', {
                day: 'numeric', month: 'long', year: 'numeric'
            });

            // Simulació de títol traduit per IA (en aquesta versió estàtica el títol ja sol venir en català de la font)
            const aiTitle = item.title;
            const originalTitle = item.title; // Per al toggle

            article.innerHTML = `
                <div class="news-card-header">
                    <h2 class="title-text">${aiTitle}</h2>
                </div>
                <div class="news-image-container">
                    <img src="${imageUrl}" alt="Imatge notícia">
                </div>
                <div class="news-body">
                    <div class="ai-badge">✨ Traducció IA (Optimitzada)</div>
                    <p class="news-description">${pureDescription}</p>
                    <div class="news-meta-row">
                        <span>Font: <strong>${item.author || 'Google News'}</strong></span>
                        <span>${dateStr}</span>
                    </div>
                    <a href="${item.link}" target="_blank" class="read-more-btn">Llegir notícia completa &rarr;</a>
                    <button class="ia-toggle-btn">Veure títol original</button>
                </div>
            `;

            const titleEl = article.querySelector('.title-text');
            const toggleBtn = article.querySelector('.ia-toggle-btn');
            let showingOriginal = false;

            toggleBtn.addEventListener('click', () => {
                if (!showingOriginal) {
                    titleEl.textContent = originalTitle;
                    toggleBtn.textContent = 'Tornar a traducció IA';
                } else {
                    titleEl.textContent = aiTitle;
                    toggleBtn.textContent = 'Veure títol original';
                }
                showingOriginal = !showingOriginal;
            });

            feedContainer.appendChild(article);
        });
    }

    fetchNews();
});
