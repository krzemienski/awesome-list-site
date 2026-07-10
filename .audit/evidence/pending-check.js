const pendingItems = Array.from(document.querySelectorAll('table tbody tr')).map(row => {
  const cells = Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim());
  return cells;
});
JSON.stringify({pendingCount: pendingItems.length, sample: pendingItems.slice(0, 3)}, null, 2);