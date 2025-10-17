// LocalStorage-backed budget management for frontend-only demo

const BUDGETS_KEY = 'expenseai_budgets';
const EXPENSES_KEY = 'expenseai_expenses';
const GOALS_KEY = 'expenseai_goals';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getBudgets() {
  return readJson(BUDGETS_KEY, {
    overallMonthly: 0,
    categories: {}
  });
}

export function saveBudgets(budgets) {
  writeJson(BUDGETS_KEY, budgets);
  return budgets;
}

export function resetBudgets() {
  localStorage.removeItem(BUDGETS_KEY);
}

export function getMonthlySpendingSummary(referenceDate = new Date()) {
  const expenses = readJson(EXPENSES_KEY, []);
  const month = referenceDate.getMonth();
  const year = referenceDate.getFullYear();
  const monthExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const total = monthExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const byCategory = monthExpenses.reduce((acc, e) => {
    const cat = e.category || 'Other';
    acc[cat] = (acc[cat] || 0) + (Number(e.amount) || 0);
    return acc;
  }, {});

  return { total, byCategory, count: monthExpenses.length };
}

export function getRemainingByCategory(budgets, summary) {
  const remaining = {};
  Object.keys(summary.byCategory).forEach((cat) => {
    const spent = summary.byCategory[cat] || 0;
    const cap = budgets.categories?.[cat] || 0;
    remaining[cat] = Math.max(cap - spent, 0);
  });
  // Include categories that have a budget but no spend yet
  Object.keys(budgets.categories || {}).forEach((cat) => {
    if (!(cat in remaining)) {
      remaining[cat] = budgets.categories[cat];
    }
  });
  return remaining;
}

export function exportAllData() {
  const data = {
    budgets: getBudgets(),
    expenses: readJson(EXPENSES_KEY, []),
    goals: readJson(GOALS_KEY, [])
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expenseai-export-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function importAllData(json) {
  if (json?.budgets) writeJson(BUDGETS_KEY, json.budgets);
  if (Array.isArray(json?.expenses)) writeJson(EXPENSES_KEY, json.expenses);
  if (Array.isArray(json?.goals)) writeJson(GOALS_KEY, json.goals);
}

// Goals (local demo)
export function getGoals() {
  return readJson(GOALS_KEY, []);
}

export function saveGoal(goal) {
  const list = getGoals();
  const withId = goal.id ? goal : { ...goal, id: Date.now().toString() };
  const idx = list.findIndex((g) => g.id === withId.id);
  if (idx >= 0) list[idx] = withId; else list.unshift(withId);
  writeJson(GOALS_KEY, list);
  return withId;
}

export function deleteGoal(id) {
  const list = getGoals().filter((g) => g.id !== id);
  writeJson(GOALS_KEY, list);
}

export function resetGoals() {
  localStorage.removeItem(GOALS_KEY);
}


