const M = window.__morada.M; M.ui.setMode('buy');
await new Promise(r => setTimeout(r, 600));
const d = document.getElementById('drawer');
return { hidden: d && d.hidden, cards: document.querySelectorAll('#drawer .card').length, anyCards: document.querySelectorAll('.card').length, html: d ? d.innerHTML.slice(0, 600) : null };
