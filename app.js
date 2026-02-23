window.onload = () => {
    const feedContainer = document.getElementById('feed');
    const loader = document.getElementById('loader');

    // Configuració RSS -> JSON via rss2json
    const rssUrl = 'https://news.google.com/rss/search?q=Sitges&hl=ca&gl=ES&ceid=ES:ca';
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

    async function cargarNoticias() {
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Error al connectar amb el servidor');

            const data = await response.json();
            if (data.status !== 'ok') throw new Error('No es poden carregar les dades');

            inyectarNoticias(data.items);
            loader.style.display = 'none';
        } catch (error) {
            console.error(error);
            feedContainer.innerHTML = `
                <div style="text-align:center; padding:3rem; border:1px solid #ccc; border-radius:8px;">
                    <p>Ho sentim, hi ha hagut un problema al carregar la Veu de Sitges.</p>
                    <p style="font-size:0.8rem; color:red; margin-top:1rem;">${error.message}</p>
                </div>
            `;
            loader.style.display = 'none';
        }
    }

    function inyectarNoticias(items) {
        items.forEach(item => {
            const article = document.createElement('article');
            article.className = 'news-card';

            // Extracció d'imatges: enclosure o regex a la descripció
            let imageUrl = '';
            if (item.enclosure && item.enclosure.link) {
                imageUrl = item.enclosure.link;
            } else {
                const imgMatch = item.description.match(/<img[^>]+src=["']([^"']+)["']/);
                if (imgMatch) imageUrl = imgMatch[1];
            }

            // Sanititzem la descripció (treiem el HTML)
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = item.description;
            const pureText = tempDiv.textContent || tempDiv.innerText || "";

            // Estructura de la targeta
            let imageHtml = imageUrl ? `
                <div class="news-image">
                    <img src="${imageUrl}" alt="Imatge notícia" onerror="this.parentElement.style.display='none'">
                </div>
            ` : '';

            article.innerHTML = `
                <div class="news-card-header">
                    <h2>${item.title}</h2>
                </div>
                ${imageHtml}
                <div class="news-card-body">
                    <p>${pureText.substring(0, 180)}...</p>
                    <div class="news-meta">
                        <span>Font: <strong>${item.author || 'Google News'}</strong></span>
                        <a href="${item.link}" target="_blank" class="read-more-link">Llegir crònica &rarr;</a>
                    </div>
                </div>
            `;

            feedContainer.appendChild(article);
        });
    }

    cargarNoticias();
};
