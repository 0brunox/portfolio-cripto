let portfolio = JSON.parse(localStorage.getItem('portfolio')) || [];
let history = JSON.parse(localStorage.getItem('history')) || [];
let selectedCurrency = localStorage.getItem('currency') || 'brl';

document.getElementById('currencySelector').value = selectedCurrency;
document.getElementById('currencySelector').addEventListener('change', (e) => {
  selectedCurrency = e.target.value;
  localStorage.setItem('currency', selectedCurrency);
  updateChart();
});

function savePortfolio() {
  localStorage.setItem('portfolio', JSON.stringify(portfolio));
}

function saveHistory(entry) {
  history.push(entry);
  localStorage.setItem('history', JSON.stringify(history));
}

function updateTokenList(prices) {
  const container = document.getElementById('tokenList');
  container.innerHTML = '';
  portfolio.forEach((token, index) => {
    const price = prices[token.id]?.[selectedCurrency] || 0;
    const currentValue = token.quantity * price;
    const investedValue = token.quantity * token.avgPrice;
    const pnl = currentValue - investedValue;
    const pnlPercent = ((pnl / investedValue) * 100).toFixed(2);
    const pnlColor = pnl >= 0 ? '#00e676' : '#ff5252';
    const symbol = selectedCurrency === 'usd' ? '$' : 'R$';

    const div = document.createElement('div');
    div.innerHTML = `
      <strong>${token.symbol}</strong> — ${token.quantity} (Preço médio: ${symbol}${token.avgPrice})
      <br>📈 PnL: <span style="color:${pnlColor}">${symbol}${pnl.toFixed(2)} (${pnlPercent}%)</span>
      <br><button onclick="editToken(${index})">Editar</button>
      <button onclick="removeToken(${index})">Remover</button>
    `;
    container.appendChild(div);
  });
}

window.editToken = function (index) {
  const token = portfolio[index];
  const newQty = prompt(`Nova quantidade para ${token.symbol}:`, token.quantity);
  const newAvg = prompt(`Novo preço médio para ${token.symbol}:`, token.avgPrice);
  if (newQty !== null && !isNaN(parseFloat(newQty)) && newAvg !== null && !isNaN(parseFloat(newAvg))) {
    portfolio[index].quantity = parseFloat(newQty);
    portfolio[index].avgPrice = parseFloat(newAvg);
    savePortfolio();
    updateChart();
  }
};

window.removeToken = function (index) {
  if (confirm(`Deseja remover ${portfolio[index].symbol}?`)) {
    portfolio.splice(index, 1);
    savePortfolio();
    updateChart();
  }
};

async function fetchPrices() {
  const ids = portfolio.map(coin => coin.id).join(',');
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=brl,usd`);
  return await res.json();
}

async function updateChart() {
  const prices = await fetchPrices();
  const labels = [];
  const values = [];
  let total = 0;
  const currencySymbol = selectedCurrency === 'usd' ? '$' : 'R$';

  portfolio.forEach(coin => {
    const price = prices[coin.id]?.[selectedCurrency] || 0;
    const value = coin.quantity * price;
    labels.push(coin.symbol);
    values.push(value);
    total += value;
  });

  document.getElementById('totalValue').textContent = `Valor total: ${currencySymbol} ${total.toFixed(2)}`;
  updateTokenList(prices);
  saveHistory({ date: new Date().toLocaleDateString(), total: total });

  Plotly.newPlot('chart', [{
    values: values,
    labels: labels,
    type: 'pie',
    hole: 0.4,
    marker: {
      colors: ['#f4b183', '#d9d9d9', '#6f42c1', '#a9d18e', '#5b9bd5', '#ff6384', '#36a2eb', '#ffcd56']
    }
  }], {
    paper_bgcolor: '#111',
    font: { color: '#f1f1f1' },
    showlegend: true
  }, { responsive: true });

  const historyLabels = history.map(entry => entry.date);
  const historyValues = history.map(entry => entry.total);

  Plotly.newPlot('historyChart', [{
    x: historyLabels,
    y: historyValues,
    type: 'bar',
    marker: { color: '#00e676' }
  }], {
    title: 'Histórico do Valor Total da Carteira',
    paper_bgcolor: '#111',
    plot_bgcolor: '#111',
    font: { color: '#f1f1f1' }
  }, { responsive: true });
}

document.getElementById('addTokenForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('tokenId').value.trim().toLowerCase();
  const symbol = document.getElementById('tokenSymbol').value.trim().toUpperCase();
  const quantity = parseFloat(document.getElementById('tokenQty').value);
  const avgPrice = parseFloat(document.getElementById('tokenAvg').value);

  if (!id || !symbol || isNaN(quantity) || isNaN(avgPrice)) return alert('Preencha todos os campos corretamente.');
  if (portfolio.find(t => t.id === id)) return alert('Esse token já está na lista.');

  const check = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=brl,usd`);
  const data = await check.json();
  if (!data[id]) return alert('ID de token inválido.');

  portfolio.push({ id, symbol, quantity, avgPrice });
  savePortfolio();
  updateChart();
  e.target.reset();
});

window.addEventListener("load", updateChart);

document.getElementById('exportBtn').addEventListener('click', async () => {
  const prices = await fetchPrices();
  const currencySymbol = selectedCurrency === 'usd' ? '$' : 'R$';

  let csv = 'Token,Quantidade,Preço Médio,Valor Atual,PnL,PnL (%)\n';
  portfolio.forEach(token => {
    const price = prices[token.id]?.[selectedCurrency] || 0;
    const currentValue = token.quantity * price;
    const investedValue = token.quantity * token.avgPrice;
    const pnl = currentValue - investedValue;
    const pnlPercent = ((pnl / investedValue) * 100).toFixed(2);
    csv += `${token.symbol},${token.quantity},${token.avgPrice},${price.toFixed(2)},${pnl.toFixed(2)},${pnlPercent}%\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'portfolio_cripto.csv';
  link.click();
});
