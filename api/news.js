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
        const response = await axios.get(GOOGLE_NEWS_RSS);
        const parser = new XMLParser();
        const jsonObj = parser.parse(response.data);
        const items = jsonObj.rss.channel.item.slice(0, 10); // Agafem les 10 primeres

        // 2. Traduir títols amb Groq (en paral·lel per velocitat)
        const translatedItems = await Promise.all(items.map(async (item) => {
            try {
                const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        {
                            role: "system",
                            content: "Ets un traductor expert al català. Tradueix el següent títol de notícia al català de forma natural i periodística. Només retorna el títol traduït."
                        },
                        {
                            role: "user",
                            content: item.title
                        }
                    ],
                    temperature: 0.3
                }, {
                    headers: {
                        'Authorization': `Bearer ${GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });

                const translatedTitle = groqRes.data.choices[0].message.content.trim();

                // Intentem buscar una imatge genèrica o extreure-la si fos possible (simplificat aquí)
                // Pel RSS de Google News, les imatges sovint no venen directament.
                const imagePlaceholder = `https://source.unsplash.com/featured/?sitges,landscape,${Math.random()}`;

                return {
                    id: item.guid['#text'] || item.guid,
                    originalTitle: item.title,
                    title: translatedTitle,
                    link: item.link,
                    pubDate: item.pubDate,
                    source: item.source['#text'] || item.source,
                    image: imagePlaceholder // Placeholder modern mentre no tinguem crawling real
                };
            } catch (error) {
                console.error('Error traduint notícia:', error);
                return {
                    id: item.guid['#text'] || item.guid,
                    originalTitle: item.title,
                    title: item.title, // Fallback a original
                    link: item.link,
                    pubDate: item.pubDate,
                    source: item.source['#text'] || item.source
                };
            }
        }));

        res.status(200).json(translatedItems);
    } catch (error) {
        console.error('Error general:', error);
        res.status(500).json({ error: 'Error recollint notícies' });
    }
};
