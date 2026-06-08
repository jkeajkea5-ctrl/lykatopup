function clean(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clean);

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !key.startsWith('$') && !key.includes('.'))
      .map(([key, nested]) => [key, clean(nested)])
  );
}

export function sanitizeMongoOperators(req, _res, next) {
  req.body = clean(req.body);
  req.params = clean(req.params);
  next();
}
