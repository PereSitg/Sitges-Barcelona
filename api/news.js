const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

module.exports = async (req, res) => {
    // Permetre CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const GOOGLE_NEWS_RSS = 'https://news.google.com/rss/search?q=sitges&hl=es&gl=ES&ceid=ES%3Aes';

    try {
        // 1. Fetch Google News RSS
        const response = await axios.get(GOOGLE_NEWS_RSS, { timeout: 5000 });
        const parser = new XMLParser();
        const jsonObj = parser.parse(response.data);

        // Validació d'estructura del RSS
        const rawItems = jsonObj.rss?.channel?.item;
        if (!rawItems) {
            return res.status(200).json([]); // No hi ha notícies
        }

        const items = Array.isArray(rawItems) ? rawItems.slice(0, 10) : [rawItems];

        // 2. Si no hi ha clau, retornem les originals directament
        if (!GROQ_API_KEY) {
            const basicItems = items.map(item => ({
                id: item.guid?.['#text'] || item.guid || Math.random(),
                originalTitle: item.title,
                title: item.title, // Sense traducció
                link: item.link,
                pubDate: item.pubDate,
                source: item.source?.['#text'] || item.source || 'Font desconeguda',
                image: `https://images.unsplash.com/photo-1548432328-94436579979d?w=800&q=80` // Imatge de Sitges més estable
            }));
            return res.status(200).json(basicItems);
        }

        // 3. Traduir títols amb Groq (en paral·lel per velocitat)
        const translatedItems = await Promise.all(items.map(async (item) => {
            const originalTitle = item.title || 'Sense títol';
            try {
                const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        {
                            role: "system",
                            content: "Ets un traductor expert al català. Tradueix el següent títol de notícia al català de forma natural i periodística. Només retorna el títol traduït."
                        },
                        { role: "user", content: originalTitle }
                    ],
                    temperature: 0.3
                }, {
                    headers: {
                        'Authorization': `Bearer ${GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 4000 // Evitem llargues esperes
                });

                const translatedTitle = groqRes.data.choices[0].message.content.trim();

                return {
                    id: item.guid?.['#text'] || item.guid || Math.random(),
                    originalTitle: originalTitle,
                    title: translatedTitle,
                    link: item.link,
                    pubDate: item.pubDate,
                    source: item.source?.['#text'] || item.source || 'Font desconeguda',
                    image: `https://images.unsplash.com/photo-1548432328-94436579979d?w=800&q=80`
                };
            } catch (error) {
                console.error('Error traduint notícia individual:', error.message);
                return {
                    id: item.guid?.['#text'] || item.guid || Math.random(),
                    originalTitle: originalTitle,
                    title: originalTitle, // Fallback
                    link: item.link,
                    pubDate: item.pubDate,
                    source: item.source?.['#text'] || item.source || 'Font desconeguda',
                    image: `https://images.unsplash.com/photo-1548432328-94436579979d?w=800&q=80`
                };
            }
        }));

        res.status(200).json(translatedItems);
    } catch (error) {
        console.error('Error general API:', error.message);
        res.status(500).json({
            error: 'Error recollint notícies',
            details: error.message
        });
    }
};
