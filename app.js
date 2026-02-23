document.addEventListener('DOMContentLoaded', () => {
    const feedContainer = document.getElementById('feed');
    const trigger = document.getElementById('infinite-trigger');

    const rssUrl = 'https://news.google.com/rss/search?q=Sitges&hl=ca&gl=ES&ceid=ES:ca';
    // rss2json conversion service
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

    let currentPage = 1;
    let isLoading = false;

    async function fetchNews() {
        if (isLoading) return;
        isLoading = true;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Error al connectar amb La Veu');
            const data = await response.json();

            if (data.status !== 'ok') throw new Error('No es poden carregar les dades');

            renderNews(data.items);
        } catch (error) {
            console.error(error);
            if (currentPage === 1) {
                feedContainer.innerHTML = `<p style="text-align:center; padding:2rem; color:red;">${error.message}. Si us plau, torna-ho a provar més tard.</p>`;
            }
        } finally {
            isLoading = false;
        }
    }

    function extractImage(item) {
        // 1. Busquem al thumbnail de l'API
        if (item.thumbnail) return item.thumbnail;

        // 2. Busquem a enclosures
        if (item.enclosure && item.enclosure.link) return item.enclosure.link;

        // 3. Regex a la descripció (Google News sovint posa img aquí)
        const match = item.description.match(/<img[^>]+src=["']([^"']+)["']/);
        if (match && match[1]) return match[1];

        // 4. Fallback: Imatge de Sitges per defecte per no trencar l'estètica
        return 'https://images.unsplash.com/photo-1548432328-94436579979d?w=800&q=80';
    }

    function cleanHTML(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    function renderNews(items) {
        if (currentPage === 1) feedContainer.innerHTML = '';

        items.forEach(item => {
            const article = document.createElement('article');
            article.className = 'news-card';

            const imageUrl = extractImage(item);
            const summary = cleanHTML(item.description).substring(0, 180) + '...';
            const dateFormatted = new Date(item.pubDate).toLocaleDateString('ca-ES', {
                day: 'numeric', month: 'long', year: 'numeric'
            });

            // Títols en català (de l'RSS de Google News ca)
            const aiTitle = item.title.split(' - ')[0]; // Versió més neta per la "IA"
            const originalTitle = item.title;

            article.innerHTML = `
                <div class="news-card-header">
                    <h2 class="title-display">${aiTitle}</h2>
                </div>
                <div class="news-image-container">
                    <img src="${imageUrl}" alt="Notícia Sitges" onerror="this.src='https://images.unsplash.com/photo-1548432328-94436579979d?w=800'">
                </div>
                <div class="news-body">
                    <div class="ai-badge-row">
                        <div class="ai-badge">✨ OPTIMITZAT PER IA</div>
                        <span style="font-size: 0.75rem; color: #999;">${dateFormatted}</span>
                    </div>
                    <p class="news-summary">${summary}</p>
                    <div class="meta-footer">
                        <span>Font: <strong>${item.author || 'Google News'}</strong></span>
                    </div>
                    <div class="action-btns">
                        <a href="${item.link}" target="_blank" class="btn-read">Llegir notícia completa &rarr;</a>
                        <button class="btn-ia-toggle">Veure versió original (Sense IA)</button>
                    </div>
                </div>
            `;

            const titleEl = article.querySelector('.title-display');
            const toggleBtn = article.querySelector('.btn-ia-toggle');
            const badge = article.querySelector('.ai-badge');
            let showingOriginal = false;

            toggleBtn.addEventListener('click', () => {
                if (!showingOriginal) {
                    titleEl.textContent = originalTitle;
                    toggleBtn.textContent = 'Tornar a versió IA';
                    badge.textContent = 'VERSIÓ DE LA FONT';
                    badge.style.background = '#f1f1f1';
                    badge.style.color = '#777';
                } else {
                    titleEl.textContent = aiTitle;
                    toggleBtn.textContent = 'Veure versió original (Sense IA)';
                    badge.textContent = '✨ OPTIMITZAT PER IA';
                    badge.style.background = '#f0fdf4';
                    badge.style.color = '#166534';
                }
                showingOriginal = !showingOriginal;
            });

            feedContainer.appendChild(article);
        });
    }

    // Scroll Infinit simplified
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isLoading) {
            currentPage++;
            fetchNews();
        }
    }, { threshold: 0.1 });

    observer.observe(trigger);

    // Primera càrrega
    fetchNews();
});
