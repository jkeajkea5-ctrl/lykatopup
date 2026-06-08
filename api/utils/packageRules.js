export const ITEM_PACKAGE_MIN_AMOUNT = 0;
export const MAX_ACTIVE_PACKAGE_PRICE_USD = 50;

export function itemPackageAmount(pkg = {}) {
  const source = [
    pkg.providerCatalogueName,
    pkg.amountLabel,
    pkg.name
  ].filter(Boolean).join(' ');

  const match = source.match(/(?:^|\s)(\d+(?:\.\d+)?)(?=\s|$)/);
  return match ? Number(match[1]) : null;
}

export function isItemPackageInActiveRange(pkg = {}) {
  const amount = itemPackageAmount(pkg);
  return amount !== null && amount >= ITEM_PACKAGE_MIN_AMOUNT;
}

export function activeForPackage(pkg = {}) {
  return pkg.active !== false && Number(pkg.priceUsd || 0) <= MAX_ACTIVE_PACKAGE_PRICE_USD;
}

export function packageAvailabilityFilter(includeDisabled = false) {
  if (includeDisabled) return {};

  return { active: true };
}
