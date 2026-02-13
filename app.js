const REFRESH_MS = 5 * 60 * 1000;
const FEED_REFRESH_MS = 3 * 60 * 1000;
const MINI_CRYPTO_LIMIT = 120;
const STOCK_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AMD', 'NFLX', 'JPM', 'V', 'MA', 'UNH', 'XOM', 'WMT', 'COST', 'BAC', 'KO', 'DIS', 'ORCL', 'CRM', 'INTC', 'QCOM', 'PLTR'];

const sources = [
  { name: 'IntoTheCryptoverse', type: 'Market-cycle & risk charts', url: 'https://intothecryptoverse.com/', status: 'warn', message: 'No public API docs; keep as manual/partner integration.' },
  { name: 'DeFiLlama', type: 'TVL + protocol flows', url: 'https://defillama.com/', status: 'ok', message: 'Live endpoint integrated for chain TVL.' },
  { name: 'Token Terminal', type: 'Protocol fundamentals', url: 'https://tokenterminal.com/', status: 'warn', message: 'API key required for production.' },
  { name: 'CoinMarketCap', type: 'News + market directory', url: 'https://coinmarketcap.com/', status: 'warn', message: 'Public site link active; API requires key.' },
  { name: 'CoinGecko', type: 'Coin market + sparkline', url: 'https://www.coingecko.com/', status: 'ok', message: 'Live public API used for 120 coin charts.' },
  { name: 'Yahoo Finance', type: 'Stocks chart data', url: 'https://finance.yahoo.com/', status: 'ok', message: 'Live chart endpoint used for stock minis.' }
];

const palette = { gold: '#d4af37', goldSoft: '#f4e6b0', line2: '#9cc7ff', line3: '#42d392', line4: '#f97316', red: '#ef4444' };
const charts = [];
let latestCoins = [];

initRedirect();
renderSources();
refreshAll();
refreshFeeds();
setInterval(refreshAll, REFRESH_MS);
setInterval(refreshFeeds, FEED_REFRESH_MS);

function initRedirect() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  if (!redirect) return;
  try {
    const target = decodeURIComponent(redirect);
    document.body.innerHTML = `<div style="font-family:Inter,sans-serif;padding:2rem;background:#0b0b0b;color:#f5f5f5"><h2 style="color:#f4e6b0">Golden Signal Redirect Router</h2><p>Opening source post in 1.5s…</p><p><a style="color:#d4af37" href="${target}">Open now</a></p></div>`;
    setTimeout(() => { window.location.href = target; }, 1500);
  } catch {}
}

function renderSources() {
  const container = document.getElementById('source-grid');
  container.innerHTML = '';
  sources.forEach((source) => {
    const div = document.createElement('div');
    div.className = 'source-card';
    div.innerHTML = `<h3>${source.name}</h3><p>${source.type}</p><p class="status ${source.status}">${source.status === 'ok' ? 'CONNECTED / READY' : 'AUTH / MANUAL STEP'}</p><p>${source.message}</p><a class="source-link" target="_blank" rel="noreferrer" href="${source.url}">Open source ↗</a>`;
    container.appendChild(div);
  });
}

async function refreshAll() {
  destroyCharts();
  const [coins, tvl, stocks] = await Promise.all([fetchCoins(), fetchTvl(), fetchStocks()]);
  latestCoins = coins;
  renderMacroCharts(coins, tvl, stocks);
  renderCryptoMiniCharts(coins);
  renderStockMiniCharts(stocks);
  document.getElementById('last-refresh').textContent = `Last refresh: ${new Date().toLocaleString()}`;
}

async function refreshFeeds() {
  await Promise.all([renderInfluencerFeed(), renderNewsFeed()]);
}

function destroyCharts() {
  while (charts.length) charts.pop().destroy();
}

async function fetchCoins() {
  try {
    const u = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=120&page=1&sparkline=true&price_change_percentage=24h';
    const res = await fetch(u, { cache: 'no-store' });
    if (!res.ok) throw new Error('coins failed');
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchTvl() {
  const fallback = [{ name: 'Ethereum', tvl: 62 }, { name: 'Solana', tvl: 12 }, { name: 'Tron', tvl: 9 }, { name: 'BSC', tvl: 5 }, { name: 'Arbitrum', tvl: 3 }];
  try {
    const res = await fetch('https://api.llama.fi/v2/chains', { cache: 'no-store' });
    if (!res.ok) return fallback;
    const chains = await res.json();
    return [...chains].sort((a, b) => b.tvl - a.tvl).slice(0, 5).map((x) => ({ name: x.name, tvl: +(x.tvl / 1e9).toFixed(2) }));
  } catch {
    return fallback;
  }
}

async function fetchStocks() {
  const results = await Promise.all(STOCK_SYMBOLS.map(async (symbol) => {
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1mo&interval=1d`, { cache: 'no-store' });
      if (!res.ok) throw new Error('stock');
      const json = await res.json();
      const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter((x) => typeof x === 'number') || [];
      const last = closes[closes.length - 1] || 0;
      const first = closes[0] || last;
      const change = first ? ((last - first) / first) * 100 : 0;
      return { symbol, prices: closes, last, change: +change.toFixed(2) };
    } catch {
      return { symbol, prices: [100, 101, 99, 103, 102], last: 102, change: 2 };
    }
  }));
  return results;
}

function renderMacroCharts(coins, tvl, stocks) {
  const labels = ['-6d', '-5d', '-4d', '-3d', '-2d', '-1d', 'Now'];
  const btc = coins.find((c) => c.symbol === 'btc');
  const hist = btc?.sparkline_in_7d?.price?.slice(-7).map((x) => +(x / 1e9).toFixed(3)) || [1.6, 1.65, 1.7, 1.72, 1.75, 1.78, 1.8];
  charts.push(lineChart('cryptoMarketChart', labels, hist, 'BTC Proxy (B$)'));
  charts.push(barChart('tvlChart', tvl.map((x) => x.name), tvl.map((x) => x.tvl), 'TVL (B$)'));

  const topStocks = stocks.slice(0, 2);
  const datasetMap = {};
  topStocks.forEach((s) => { datasetMap[s.symbol] = s.prices.slice(-7); });
  charts.push(multiLineChart('stockChart', labels, datasetMap));

  const topMovers = coins.slice(0, 8);
  charts.push(barChart('revenueChart', topMovers.map((x) => x.symbol.toUpperCase()), topMovers.map((x) => x.price_change_percentage_24h || 0), '24h %'));
}

function renderCryptoMiniCharts(coins) {
  const grid = document.getElementById('crypto-grid');
  grid.innerHTML = '';
  const subset = coins.slice(0, MINI_CRYPTO_LIMIT);
  subset.forEach((coin, idx) => {
    const id = `coin-${idx}`;
    const card = document.createElement('div');
    card.className = 'mini-chart-card';
    card.innerHTML = `<div class="mini-title"><span>${coin.symbol.toUpperCase()}</span><small>${(coin.price_change_percentage_24h || 0).toFixed(2)}%</small></div><canvas id="${id}"></canvas>`;
    grid.appendChild(card);
    const data = coin.sparkline_in_7d?.price?.slice(-25) || [1, 1.1, 1.05, 1.2, 1.15];
    charts.push(miniLineChart(id, data, (coin.price_change_percentage_24h || 0) >= 0));
  });
  document.getElementById('crypto-count').textContent = `${subset.length} charts loaded`;
}

function renderStockMiniCharts(stocks) {
  const grid = document.getElementById('stocks-grid');
  grid.innerHTML = '';
  stocks.forEach((stock, idx) => {
    const id = `stock-${idx}`;
    const card = document.createElement('div');
    card.className = 'mini-chart-card';
    card.innerHTML = `<div class="mini-title"><span>${stock.symbol}</span><small>${stock.change.toFixed(2)}%</small></div><canvas id="${id}"></canvas>`;
    grid.appendChild(card);
    charts.push(miniLineChart(id, stock.prices.slice(-25), stock.change >= 0));
  });
  document.getElementById('stocks-count').textContent = `${stocks.length} charts loaded`;
}

async function renderInfluencerFeed() {
  const feeds = [
    { name: 'Benjamin Cowen', rss: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCRvqjQPSeaWn-uEx-w0XOIg' },
    { name: 'Coin Bureau', rss: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCqK_GSMbpiV8spgD3ZGloSw' },
    { name: 'Altcoin Daily', rss: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCt_oB8F_xu8PP_hJQXhL0sg' }
  ];
  const list = await Promise.all(feeds.map(async (f) => {
    try {
      const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(f.rss)}`;
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      const item = json.items?.[0];
      return { title: item?.title || `${f.name} update`, link: item?.link || f.rss, source: f.name, pubDate: item?.pubDate || '' };
    } catch {
      return { title: `${f.name} feed unavailable`, link: f.rss, source: f.name, pubDate: '' };
    }
  }));
  const container = document.getElementById('influencer-feed');
  container.innerHTML = '';
  list.forEach((item) => {
    const redirect = `${location.origin}${location.pathname}?redirect=${encodeURIComponent(item.link)}`;
    const el = document.createElement('article');
    el.className = 'feed-item';
    el.innerHTML = `<h3>${item.source}</h3><p>${item.title}</p><small class="muted">${item.pubDate || 'live feed'}</small><br/><a class="action-link" href="${redirect}">Open on Golden Signal ↗</a>`;
    container.appendChild(el);
  });
}

async function renderNewsFeed() {
  const feeds = [
    { source: 'CoinDesk', rss: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
    { source: 'The Block', rss: 'https://www.theblock.co/rss.xml' },
    { source: 'Cointelegraph', rss: 'https://cointelegraph.com/rss' }
  ];
  const items = await Promise.all(feeds.map(async (f) => {
    try {
      const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(f.rss)}`;
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      const it = json.items?.[0];
      return { source: f.source, title: it?.title || `${f.source} latest`, link: it?.link || f.rss };
    } catch {
      return { source: f.source, title: `${f.source} feed unavailable`, link: f.rss };
    }
  }));
  const container = document.getElementById('news-feed');
  container.innerHTML = '';
  items.forEach((item) => {
    const el = document.createElement('article');
    el.className = 'feed-item';
    el.innerHTML = `<h3>${item.source}</h3><p>${item.title}</p><a class="action-link" target="_blank" rel="noreferrer" href="${item.link}">Open article ↗</a>`;
    container.appendChild(el);
  });
}

function lineChart(id, labels, values, label) {
  return new Chart(document.getElementById(id), { type: 'line', data: { labels, datasets: [{ label, data: values, borderColor: palette.gold, backgroundColor: 'rgba(212,175,55,.2)', fill: true, tension: .25 }] }, options: baseOptions() });
}
function barChart(id, labels, values, label) {
  return new Chart(document.getElementById(id), { type: 'bar', data: { labels, datasets: [{ label, data: values, backgroundColor: values.map((v) => v >= 0 ? '#d4af37' : '#ef4444') }] }, options: baseOptions() });
}
function multiLineChart(id, labels, datasetMap) {
  const colors = [palette.gold, palette.line2, palette.line3, palette.line4];
  const datasets = Object.entries(datasetMap).map(([label, data], i) => ({ label, data, borderColor: colors[i % colors.length], tension: 0.3 }));
  return new Chart(document.getElementById(id), { type: 'line', data: { labels, datasets }, options: baseOptions() });
}
function miniLineChart(id, data, up = true) {
  return new Chart(document.getElementById(id), {
    type: 'line',
    data: { labels: data.map((_, i) => i + 1), datasets: [{ data, borderColor: up ? palette.line3 : palette.red, borderWidth: 1.5, pointRadius: 0, tension: .3 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }
  });
}
function baseOptions() {
  return { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: palette.goldSoft } } }, scales: { x: { ticks: { color: '#ddd' }, grid: { color: 'rgba(255,255,255,.08)' } }, y: { ticks: { color: '#ddd' }, grid: { color: 'rgba(255,255,255,.08)' } } } };
}
