import { addMonths, format } from 'date-fns';

const today = new Date();

export const mockUser = {
  id: 'user-demo',
  email: 'demo@finance.app',
};

export const mockCategories = [
  { id: 'c1', user_id: mockUser.id, name: 'Salário', tipo: 'receita' },
  { id: 'c2', user_id: mockUser.id, name: 'Freelance', tipo: 'receita' },
  { id: 'c3', user_id: mockUser.id, name: 'Moradia', tipo: 'despesa' },
  { id: 'c4', user_id: mockUser.id, name: 'Alimentação', tipo: 'despesa' },
  { id: 'c5', user_id: mockUser.id, name: 'Educação', tipo: 'despesa' },
  { id: 'c6', user_id: mockUser.id, name: 'Investimentos', tipo: 'despesa' },
  { id: 'c7', user_id: mockUser.id, name: 'Transporte', tipo: 'despesa' },
];

export const mockGoals = {
  monthlySavings: 3500,
  monthlyInvestment: 2000,
  categoryCaps: {
    Moradia: 2500,
    Alimentação: 1200,
    Transporte: 700,
  },
};

const base = [
  { m: -5, income: 8900, expenses: 6100 },
  { m: -4, income: 9200, expenses: 6400 },
  { m: -3, income: 9000, expenses: 6800 },
  { m: -2, income: 9400, expenses: 7100 },
  { m: -1, income: 9500, expenses: 6950 },
  { m: 0, income: 9800, expenses: 7350 },
];

export const monthlySeries = base.map((item) => ({
  month: format(addMonths(today, item.m), 'MMM/yy'),
  income: item.income,
  expenses: item.expenses,
}));

export const mockTransactions = [
  { id: 't1', user_id: mockUser.id, type: 'income', value: 8500, category_id: 'c1', strategic_classification: null, date: format(today, 'yyyy-MM-03'), description: 'Salário', recurring: true, satisfaction_score: null },
  { id: 't2', user_id: mockUser.id, type: 'income', value: 1300, category_id: 'c2', strategic_classification: null, date: format(today, 'yyyy-MM-12'), description: 'Projeto extra', recurring: false, satisfaction_score: null },
  { id: 't3', user_id: mockUser.id, type: 'expense', value: 2300, category_id: 'c3', strategic_classification: 'Manutenção', date: format(today, 'yyyy-MM-05'), description: 'Aluguel', recurring: true, satisfaction_score: 7 },
  { id: 't4', user_id: mockUser.id, type: 'expense', value: 1100, category_id: 'c4', strategic_classification: 'Passivo', date: format(today, 'yyyy-MM-09'), description: 'Supermercado + delivery', recurring: true, satisfaction_score: 6 },
  { id: 't5', user_id: mockUser.id, type: 'expense', value: 1700, category_id: 'c6', strategic_classification: 'Investimento', date: format(today, 'yyyy-MM-11'), description: 'Aporte ETF', recurring: true, satisfaction_score: 9 },
  { id: 't6', user_id: mockUser.id, type: 'expense', value: 850, category_id: 'c7', strategic_classification: 'Manutenção', date: format(today, 'yyyy-MM-14'), description: 'Combustível e app', recurring: true, satisfaction_score: 5 },
  { id: 't7', user_id: mockUser.id, type: 'expense', value: 1400, category_id: 'c5', strategic_classification: 'Alavancagem', date: format(today, 'yyyy-MM-16'), description: 'Curso de especialização', recurring: false, satisfaction_score: 10 },
];
