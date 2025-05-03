let portfolio = JSON.parse(localStorage.getItem('portfolio')) || [
  { id: 'bitcoin', symbol: 'BTC', quantity: 0.5 },
  { id: 'ethereum', symbol: 'ETH', quantity: 2 },
  { id: 'solana', symbol: 'SOL', quantity: 10 },
  { id: 'tether', symbol: 'USDT', quantity: 1000 },
];

function savePortfolio() {
  localStorage.setItem('portfolio', JSON.stringify(portfolio));
}

function updateTokenList() {
  const container = document.getElementById('tokenList');
  container.innerHTML = '';
  portfolio.forEach((token, index) => {
    const div = document.createElement('div');
    div.innerHTML = `
      <strong>${token.symbol}</strong> — ${token.quantity} 
      <button onclick="editToken(${index})">Editar</button>
      <button onclick="removeToken(${index})">Remover</button>
    `;
    container.appendChild(div);
  });
}

window.editToken = function (index) {
  const token = portfolio[index];
  const newQty = prompt(`Nova quantidade para ${token.symbol}:`, token.quantity);
  if (newQty !== null && !isNaN(parseFloat(newQty))) {
    portfolio[index].quantity = parseFloat(newQty);
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
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=brl`);
  return await res.json();
}

async function updateChart() {
  const prices = await fetchPrices();
  const labels = [];
  const values = [];
  let total = 0;

  portfolio.forEach(coin => {
    const price = prices[coin.id]?.brl || 0;
    const value = coin.quantity * price;
    labels.push(coin.symbol);
    values.push(value);
    total += value;
  });

  document.getElementById('totalValue').textContent = `Valor total: R$ ${total.toFixed(2)}`;
  updateTokenList();

  const data = [{
    values: values,
    labels: labels,
    type: 'pie',
    hole: 0.4,
    textinfo: 'label+percent',
    textposition: 'outside',
    marker: {
      colors: ['#f4b183', '#d9d9d9', '#6f42c1', '#a9d18e', '#5b9bd5', '#ff6384', '#36a2eb', '#ffcd56']
    }
  }];

  const layout = {
    paper_bgcolor: '#111',
    font: { color: '#f1f1f1' },
    showlegend: true
  };

  Plotly.newPlot('chart', data, layout, { responsive: true });
}

document.getElementById('addTokenForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('tokenId').value.trim().toLowerCase();
  const symbol = document.getElementById('tokenSymbol').value.trim().toUpperCase();
  const quantity = parseFloat(document.getElementById('tokenQty').value);

  if (!id || !symbol || isNaN(quantity)) return alert('Preencha todos os campos corretamente.');
  if (portfolio.find(t => t.id === id)) return alert('Esse token já está na lista.');

  const check = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=brl`);
  const data = await check.json();
  if (!data[id]) return alert('ID de token inválido.');

  portfolio.push({ id, symbol, quantity });
  savePortfolio();
  updateChart();
  e.target.reset();
});

window.addEventListener("load", updateChart);
