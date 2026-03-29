// ui.js — DOM rendering helpers

export function $(sel, parent = document) {
  return parent.querySelector(sel);
}

export function $$(sel, parent = document) {
  return [...parent.querySelectorAll(sel)];
}

export function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') e.className = v;
    else if (k === 'textContent') e.textContent = v;
    else if (k === 'innerHTML') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else e.setAttribute(k, v);
  }
  for (const child of children) {
    if (typeof child === 'string') e.appendChild(document.createTextNode(child));
    else if (child) e.appendChild(child);
  }
  return e;
}

// ── Progress Bar ──

export function renderProgressBar(current, goal, label, unit = '') {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const over = current > goal;
  const colorClass = over ? 'over' : pct > 85 ? 'near' : 'good';

  return el('div', { className: 'progress-row' }, [
    el('div', { className: 'progress-label' }, [
      el('span', { textContent: label }),
      el('span', { textContent: `${current}${unit ? unit : ''} / ${goal}${unit}` }),
    ]),
    el('div', { className: 'progress-track' }, [
      el('div', { className: `progress-fill ${colorClass}`, style: `width:${pct}%` }),
    ]),
  ]);
}

// ── Meal Section ──

export function renderMealSection(mealType, foods, { onAdd, onRemove, onToggleFav }) {
  const icons = { breakfast: '☀', lunch: '☼', dinner: '☾', snacks: '○' };
  const mealCals = foods.reduce((sum, f) => sum + (f.calories || 0) * (f.servings || 1), 0);

  const foodItems = foods.map(food => {
    const cals = Math.round((food.calories || 0) * (food.servings || 1));
    const servLabel = food.servings && food.servings !== 1
      ? `${food.servings} × ${food.servingSize || ''}${food.servingUnit || ''}`
      : `${food.servingSize || ''}${food.servingUnit || ''}`;

    return el('div', { className: 'food-item' }, [
      el('div', { className: 'food-info' }, [
        el('span', { className: 'food-name', textContent: food.name }),
        el('span', { className: 'food-detail', textContent: `${servLabel} — ${cals} cal` }),
      ]),
      el('div', { className: 'food-actions' }, [
        el('button', {
          className: 'btn-icon btn-fav',
          textContent: '★',
          title: 'Add to favorites',
          onClick: () => onToggleFav(food),
        }),
        el('button', {
          className: 'btn-icon btn-remove',
          textContent: '×',
          onClick: () => onRemove(mealType, food.id),
        }),
      ]),
    ]);
  });

  const emptyMsg = foods.length === 0
    ? [el('div', { className: 'empty-meal', textContent: 'No foods logged' })]
    : [];

  return el('div', { className: 'meal-section' }, [
    el('div', { className: 'meal-header' }, [
      el('span', { className: 'meal-title' }, [
        el('span', { className: 'meal-icon', textContent: icons[mealType] || '○' }),
        el('span', { textContent: ` ${capitalize(mealType)}` }),
        el('span', { className: 'meal-cals', textContent: ` — ${Math.round(mealCals)} cal` }),
      ]),
      el('button', {
        className: 'btn-add',
        textContent: '+ Add',
        onClick: () => onAdd(mealType),
      }),
    ]),
    ...foodItems,
    ...emptyMsg,
  ]);
}

// ── Weight Chart (simple SVG) ──

export function renderWeightChart(history) {
  if (history.length < 2) {
    return el('div', { className: 'weight-chart-empty', textContent: 'Log at least 2 weights to see a chart.' });
  }

  const W = 320, H = 140, PAD = 30;
  const weights = history.map(e => e.weight);
  const min = Math.min(...weights) - 1;
  const max = Math.max(...weights) + 1;
  const range = max - min || 1;

  const points = history.map((e, i) => {
    const x = PAD + (i / (history.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((e.weight - min) / range) * (H - PAD * 2);
    return { x, y, ...e };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');

  // Date labels (first and last)
  const firstDate = formatShortDate(history[0].date);
  const lastDate = formatShortDate(history[history.length - 1].date);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'weight-chart');
  svg.innerHTML = `
    <polyline points="${polyline}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
    ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="var(--accent)"><title>${p.date}: ${p.weight} lbs</title></circle>`).join('')}
    <text x="${PAD}" y="${H - 5}" class="chart-label">${firstDate}</text>
    <text x="${W - PAD}" y="${H - 5}" class="chart-label" text-anchor="end">${lastDate}</text>
    <text x="5" y="${PAD}" class="chart-label">${max.toFixed(1)}</text>
    <text x="5" y="${H - PAD}" class="chart-label">${min.toFixed(1)}</text>
  `;
  return svg;
}

// ── Helpers ──

export function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
