import dayjs from 'dayjs';

const currency = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
});

export function formatCurrency(value) {
  if (value === null || value === undefined) return '—';
  return currency.format(Number(value));
}

export function formatDate(value) {
  if (!value) return '—';
  return dayjs(value).format('DD MMM YYYY');
}
