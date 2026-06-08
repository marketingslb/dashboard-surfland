// Fixed Google Apps Script - Spotter API com Token na URL
// Solução: Token JWT movido para URL parameter em vez de header

const CONFIG = {
  SPOTTER_TOKEN: '9e5ba8ca-3c05-4c34-a951-9f7b9a0c18a4',
  SPOTTER_BASE_URL: 'https://api.exactspotter.com/v3/LeadsAndPersons',
  SHEETS_ID: '1Y46pVnjIP5y5YSx7u5h8HgKjW3s99uhApxzsX4sSaAg',
  META_ACCESS_TOKEN: 'EAAWHpLqmiEgBRnB3RIe908N19km0sJ6iX97V2dEny3DfZBb6k8FCsxRgBCNIfWKegd4IucK7b4XPs6tZAY47ZCRIrrauWkIlGXANpAVhGgCZCKME0KkBFvZARkvOITMqhmwda8RVSApJMPqrb8Ck0ZCbcgwE8VPHGz9L3xsyuExHe52Flaxs3ZBfssYlttvxYKjcePqGutfsoWfVnDFJ5AYmd3KZCgoQg7ZAc4xju6TwTadidZAvTw6ZB9vgpmDn7e373gZAlek8FRdscIO044nogAZDZD',
};

function getSpotterData() {
  try {
    const options = {
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
        'token_exact': CONFIG.SPOTTER_TOKEN
      },
      muteHttpExceptions: true
    };

    let allData = [];
    // SEM FILTRO DE DATA - pega TODOS os registros
    // MÁXIMO: $top=500 (API não aceita mais que isso)
    let nextUrl = CONFIG.SPOTTER_BASE_URL + '?$top=500';

    // 🔄 Paginação automática - pega TUDO
    let pageCount = 0;
    while (nextUrl) {
      pageCount++;
      Logger.log('📄 Página ' + pageCount + ': ' + nextUrl);
      const response = UrlFetchApp.fetch(nextUrl, options);
      const statusCode = response.getResponseCode();
      Logger.log('📍 HTTP Status: ' + statusCode);

      const content = response.getContentText();
      Logger.log('📦 Resposta bruta (primeiros 500 chars): ' + content.substring(0, 500));

      const data = JSON.parse(content);

      if (data.value && data.value.length > 0) {
        allData = allData.concat(data.value);
        Logger.log('📥 Página ' + pageCount + ': ' + data.value.length + ' registros | Total: ' + allData.length);
      } else {
        Logger.log('⚠️ Página ' + pageCount + ': nenhum registro encontrado');
      }

      nextUrl = data['@odata.nextLink'] || null;
    }

    Logger.log('✅ Spotter: Sucesso! ' + allData.length + ' registros totais em ' + pageCount + ' páginas');
    return allData;
  } catch (error) {
    Logger.log('❌ Erro Spotter: ' + error);
    Logger.log('❌ Stack: ' + error.stack);
    return [];
  }
}

function getSheetData() {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SHEETS_ID).getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
    Logger.log('✅ Sheets: ' + rows.length + ' registros');
    return rows;
  } catch (error) {
    Logger.log('❌ Erro Sheets: ' + error);
    return [];
  }
}

function getMetaData() {
  try {
    const url = `https://graph.instagram.com/v18.0/act_440489719855299/insights?fields=impressions,clicks,spend,actions&date_preset=last_30d&access_token=${CONFIG.META_ACCESS_TOKEN}`;
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const result = JSON.parse(response.getContentText());
    Logger.log('✅ Meta: ' + (result.data ? result.data.length : 0) + ' registros');
    return result.data || [];
  } catch (error) {
    Logger.log('❌ Erro Meta: ' + error);
    return [];
  }
}

// 🚀 ENDPOINT PARA O VERCEL
function doGet(e) {
  try {
    const spotter = getSpotterData();
    const sheets = getSheetData();
    const meta = getMetaData();

    const response = {
      status: 'ok',
      spotter: {
        Leads: spotter,
        total: spotter.length
      },
      sheets: {
        data: sheets,
        total: sheets.length
      },
      meta: {
        data: meta,
        total: meta.length
      },
      timestamp: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function testConnection() {
  Logger.log('🧪 Testando conexões...');
  const spotter = getSpotterData();
  const sheets = getSheetData();
  const meta = getMetaData();

  Logger.log('━━━━━━━━━━━━━━━━━━━━━━');
  Logger.log(spotter.length > 0 ? '✅ Spotter OK' : '❌ Spotter falha');
  Logger.log(sheets.length > 0 ? '✅ Sheets OK' : '❌ Sheets falha');
  Logger.log(meta.length > 0 ? '✅ Meta OK' : '❌ Meta falha');
}

function updateDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Lead");

  // Se aba "Lead" não existe, cria ou usa a primeira aba
  if (!sheet) {
    sheet = ss.getSheets()[0] || ss.insertSheet("Lead");
    Logger.log('⚠️ Aba "Lead" não encontrada, usando: ' + sheet.getName());
  }

  const data = getSpotterData();

  if (data.length > 0) {
    sheet.clearContents();
    const headers = Object.keys(data[0]);
    sheet.appendRow(headers);
    data.forEach(item => {
      const row = headers.map(h => item[h]);
      sheet.appendRow(row);
    });
    Logger.log('✅ Dashboard: ' + data.length + ' registros adicionados em "' + sheet.getName() + '"');
  } else {
    Logger.log('❌ Nenhum dado para atualizar');
  }
}
