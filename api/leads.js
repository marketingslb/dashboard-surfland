// Serverless Function - Vercel API
const CONFIG = {
  SPOTTER_TOKEN: '9e5ba8ca-3c05-4c34-a951-9f7b9a0c18a4',
  SPOTTER_BASE_URL: 'https://api.exactspotter.com/v3/LeadsAndPersons',
};

async function getSpotterData() {
  try {
    let allData = [];
    let nextUrl = CONFIG.SPOTTER_BASE_URL + '?$top=500';

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'token_exact': CONFIG.SPOTTER_TOKEN
        }
      });

      if (!response.ok) break;

      const data = await response.json();
      if (data.value && data.value.length > 0) {
        allData = allData.concat(data.value);
      }
      nextUrl = data['@odata.nextLink'] || null;
    }

    return allData;
  } catch (error) {
    console.error('Erro Spotter:', error);
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const spotter = await getSpotterData();

    res.status(200).json({
      status: 'ok',
      spotter: {
        Leads: spotter,
        total: spotter.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
}
