
// Netlify serverless function — proxies scan requests to Google Gemini API
// Free tier: no credit card needed. Get key at aistudio.google.com
// Set env var GEMINI_API_KEY in Netlify → Site Settings → Environment Variables

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'GEMINI_API_KEY not set in Netlify environment variables' }),
    };
  }

  try {
    const { prompt, imageBase64, mimeType } = JSON.parse(event.body);

    // Build Gemini request — inline image + text prompt
    const parts = [];
    if (imageBase64) {
      parts.push({
        inline_data: {
          mime_type: mimeType || 'image/png',
          data: imageBase64,
        },
      });
    }
    parts.push({ text: prompt });

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        }),
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return {
        statusCode: geminiRes.status,
        body: JSON.stringify({ error: data.error?.message || 'Gemini API error' }),
      };
    }

    // Extract text from Gemini response and return it
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

