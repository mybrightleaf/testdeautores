const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzMC4Dlo_7zkSUx3DhFU_ebBk93SmJlKI8aFNuqRrac7pu2ILDWPT5KjENH1Wj2pnJEdA/exec';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, archetype } = req.body;

  if (!name || !email || !archetype) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  // Enviar a Google Sheets (siempre, sin depender de env vars)
  fetch(SHEETS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, archetype }),
  }).catch(err => console.error('Sheets error:', err));

  // Enviar a GetResponse
  const apiKey = process.env.GETRESPONSE_API_KEY;
  const listId = process.env.GETRESPONSE_LIST_ID;

  const tagMap = {
    creador:   process.env.GETRESPONSE_TAG_CREADOR,
    lanzador:  process.env.GETRESPONSE_TAG_LANZADOR,
    invisible: process.env.GETRESPONSE_TAG_INVISIBLE,
    artesano:  process.env.GETRESPONSE_TAG_ARTESANO,
  };

  if (!apiKey || !listId) {
    console.error('GetResponse env vars missing');
    return res.status(200).json({ ok: true, sheets: true, gr: false });
  }

  const body = {
    name,
    email,
    campaign: { campaignId: listId },
  };

  const tagId = tagMap[archetype];
  if (tagId) body.tags = [{ tagId }];

  try {
    const gr = await fetch('https://api.getresponse.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': `api-key ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (gr.ok || gr.status === 409) {
      return res.status(200).json({ ok: true });
    }

    const text = await gr.text();
    console.error('GetResponse error:', gr.status, text);
    return res.status(200).json({ ok: true, sheets: true, gr: false });

  } catch (err) {
    console.error('Fetch error:', err);
    return res.status(200).json({ ok: true, sheets: true, gr: false });
  }
}
