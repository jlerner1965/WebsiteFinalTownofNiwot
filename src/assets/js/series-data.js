/* The event series are emitted into the page as JSON by the template, so the
   browser and the build read exactly the same data. */
export function readSeries() {
  const node = document.getElementById('niwot-series');
  if (!node) return [];
  try {
    return JSON.parse(node.textContent);
  } catch {
    return [];
  }
}

/* `data-today="YYYY-MM-DD"` on that element pins the date, for tests. */
export function today() {
  const node = document.getElementById('niwot-series');
  const iso = node && node.dataset.today;
  if (iso) {
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}
