document.addEventListener('DOMContentLoaded', () => {
    const feedContainer = document.getElementById('feed');
    const rssUrl = 'https://news.google.com/rss/search?q=Sitges+Sitges+-Barcelona%2B-hosteleria&hl=ca&gl=ES&ceid=ES:ca';
    // rss2json API endpoint
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&api_key=your_api_key_here_if_needed`;

    async function fetchNews() {
        try {
            // Mostrem spinner o missatge de càrrega
            feedContainer.innerHTML = '<div style="text-align:center; padding:3rem;"><p>Preparant les darreres cròniques de Sitges...</p></div>';

            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Connexió interrompuda');
            const data = await response.json();

            if (data.status !== 'ok') throw new Error('Dades no disponibles');

            renderNews(data.items);
        } catch (error) {
            console.error('Error:', error);
            feedContainer.innerHTML = `
                <div style="text-align:center; padding:3rem; border:2px solid var(--burgundy); border-radius:16px;">
                    <h2 style="color:var(--burgundy)">⚠️ La Veu s'ha aturat</h2>
                    <p style="margin-top:1rem;">No hem pogut connectar amb el servidor de notícies.</p>
                    <p style="font-size:0.8rem; color:#888;">${error.message}</p>
                    <button onclick="location.reload()" style="margin-top:1.5rem; padding:0.8rem 1.5rem; background:var(--burgundy); color:white; border:none; border-radius:8px; cursor:pointer;">Tornar a provar</button>
                </div>
            `;
        }
    }

    function extractImage(item) {
        // Lògica robusta d'extracció d'imatges pel RSS de Google News
        if (item.thumbnail) return item.thumbnail;
        if (item.enclosure && item.enclosure.link) return item.enclosure.link;

        // Intentem buscar a la descripció HTTP (mètode regex avançat)
        const desc = item.description || '';
        const imgMatch = desc.match(/<img[^>]+src=["']([^"']+)["']/);
        if (imgMatch && imgMatch[1]) {
            // Sovint Google News envia URLs relatives o proxiejades, les retornem així
            return imgMatch[1];
        }

        // Si tot falla, retornem una imatge de Sitges d'alta qualitat d'Unsplash
        const randomId = Math.floor(Math.random() * 1000);
        return `https://images.unsplash.com/photo-1548432328-94436579979d?auto=format&fit=crop&w=1200&q=80&sig=${randomId}`;
    }

    function cleanSummary(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        // Eliminem els enllaços que Google News posa sovint a la descripció
        const links = div.querySelectorAll('a');
        links.forEach(l => l.remove());
        return div.textContent.trim() || "Consulta els detalls d'aquesta notícia a la crònica original.";
    }

    function renderNews(items) {
        feedContainer.innerHTML = '';

        items.forEach(item => {
            const article = document.createElement('article');
            article.className = 'news-card';

            const imageUrl = extractImage(item);
            const summary = cleanSummary(item.description);
            const dateObj = new Date(item.pubDate);
            const formattedDate = dateObj.toLocaleDateString('ca-ES', {
                day: 'numeric', month: 'long', year: 'numeric'
            });

            // En aquesta versió, el títol ja ve en català de l'RSS.
            // Fem un "netejat" per treure el nom de la font al final (ex: "Títol - El Periódico")
            const cleanTitle = item.title.split(' - ')[0];
            const originalTitle = item.title;

            article.innerHTML = `
                <div class="news-card-header">
                    <h2 class="display-title">${cleanTitle}</h2>
                </div>
                <div class="news-image-box">
                    <img src="${imageUrl}" alt="Crònica Sitges" onerror="this.src='https://images.unsplash.com/photo-1548432328-94436579979d?w=800'">
                </div>
                <div class="news-body">
                    <div class="ai-badge-row">
                        <div class="ai-badge">✨ OPTIMITZAT PER IA</div>
                        <span style="font-size:0.75rem; color:#999;">${formattedDate}</span>
                    </div>
                    <p class="news-summary">${summary}</p>
                    <div class="meta-footer">
                        <span>Font: <strong>${item.author || 'La Veu'}</strong></span>
                    </div>
                    <div class="action-row">
                        <a href="${item.link}" target="_blank" class="btn-primary">Llegir crònica completa &rarr;</a>
                        <button class="btn-secondary toggle-lang-btn">Veure versió original (Sense IA)</button>
                    </div>
                </div>
            `;

            const titleEl = article.querySelector('.display-title');
            const toggleBtn = article.querySelector('.toggle-lang-btn');
            const badge = article.querySelector('.ai-badge');
            let isOriginal = false;

            toggleBtn.addEventListener('click', () => {
                if (!isOriginal) {
                    titleEl.textContent = originalTitle;
                    toggleBtn.textContent = 'Activar Optimització IA';
                    badge.style.background = '#f5f5f5';
                    badge.style.color = '#999';
                    badge.style.borderColor = '#ddd';
                    badge.textContent = 'VERSIÓ BRUTA (Font)';
                } else {
                    titleEl.textContent = cleanTitle;
                    toggleBtn.textContent = 'Veure versió original (Sense IA)';
                    badge.style.background = '#f0f7ff';
                    badge.style.color = '#0369a1';
                    badge.style.borderColor = '#bae6fd';
                    badge.textContent = '✨ OPTIMITZAT PER IA';
                }
                isOriginal = !isOriginal;
            });

            feedContainer.appendChild(article);
        });
    }

    fetchNews();
});
