/**
 * Strips any object key that starts with "$" or contains "." from req.body, req.query, and
 * req.params, recursively. Express's query-string parser (qs) turns bracket syntax like
 * `?category[$ne]=null` into a nested object, which — if passed straight into a Mongoose
 * filter — lets an attacker inject Mongo operators and bypass intended query logic. This
 * middleware runs before every route so controllers can trust that user input is plain data,
 * never operator syntax.
 */
const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    const clean = {};
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) continue; // drop dangerous keys entirely
      clean[key] = sanitizeValue(value[key]);
    }
    return clean;
  }
  return value;
};

const sanitizeInput = (req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.params) req.params = sanitizeValue(req.params);
  // req.query is a getter-only property on some Express/Node versions — mutate its contents
  // in place instead of reassigning the whole object.
  if (req.query) {
    const cleaned = sanitizeValue(req.query);
    for (const key of Object.keys(req.query)) delete req.query[key];
    Object.assign(req.query, cleaned);
  }
  next();
};

module.exports = sanitizeInput;
