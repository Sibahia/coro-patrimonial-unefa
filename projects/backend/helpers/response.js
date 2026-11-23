export function ok(res, data, status = 200) {
  return res.status(status).json({ ok: true, data });
}

export function fail(res, status, code, message, details) {
  return res.status(status).json({
    ok: false,
    error: { code, message, ...(details ? { details } : {}) }
  });
}
