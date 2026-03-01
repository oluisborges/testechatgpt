export const strategicBuckets = ['Passivo', 'Manutenção', 'Alavancagem', 'Investimento'];

export function calcMonthlyGrowth(current, previous) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

export function calcDailyTicket(totalExpenses, dayCount = 30) {
  return totalExpenses / dayCount;
}

export function calcAnnualProjection(monthlyExpense) {
  return monthlyExpense * 12;
}

export function calcNeededIncome(income, expense) {
  if (income >= expense) return 0;
  return expense - income;
}

export function summarizeMonth(transactions, categories) {
  const expenses = transactions.filter((t) => t.type === 'expense');
  const incomes = transactions.filter((t) => t.type === 'income');

  const totals = {
    income: incomes.reduce((acc, t) => acc + t.value, 0),
    expense: expenses.reduce((acc, t) => acc + t.value, 0),
  };

  const byCategory = expenses.reduce((acc, tx) => {
    const category = categories.find((c) => c.id === tx.category_id)?.name || 'Outros';
    acc[category] = (acc[category] || 0) + tx.value;
    return acc;
  }, {});

  const byClassification = expenses.reduce((acc, tx) => {
    const key = tx.strategic_classification || 'Não classificado';
    acc[key] = (acc[key] || 0) + tx.value;
    return acc;
  }, {});

  return {
    totals,
    byCategory,
    byClassification,
    invested: byClassification.Investimento || 0,
    available: totals.income - totals.expense,
    committedPct: totals.income ? (totals.expense / totals.income) * 100 : 0,
  };
}

export function createInsights({ summary, previousExpense, goals }) {
  const growth = calcMonthlyGrowth(summary.totals.expense, previousExpense);
  const annual = calcAnnualProjection(summary.totals.expense);
  const investmentPct = summary.totals.expense
    ? ((summary.byClassification.Investimento || 0) / summary.totals.expense) * 100
    : 0;

  return [
    investmentPct < 10
      ? 'Você está destinando menos de 10% para investimento.'
      : 'Ótimo: sua parcela de investimento está acima de 10%.',
    `Se mantiver esse padrão, seu consumo anual será R$ ${annual.toLocaleString('pt-BR')}.`,
    `Seu gasto com passivos variou ${growth.toFixed(1)}% em relação ao mês anterior.`,
    summary.available < goals.monthlySavings
      ? 'Seu saldo atual está abaixo da meta de economia mensal.'
      : 'Você está no caminho para bater sua meta de economia mensal.',
  ];
}
