export function packageTypeLabel(value) {
  const labels = {
    'item-package': 'Item Package',
    pass: 'Pass',
    other: 'Other'
  };
  return labels[value] || value?.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Item Package';
}

