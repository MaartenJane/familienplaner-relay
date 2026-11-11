// Holt wartende Push-Nachrichten beim Familienplaner-Worker ab und sendet sie über ntfy.sh.
// Dieses Repo ist öffentlich: es enthält keine Daten und gibt in den Logs nur Zahlen aus.
const WORKER = 'https://familienplaner.maarten0251.workers.dev';
const NTFY = 'https://ntfy.sh';

const { ACTIONS_ID_TOKEN_REQUEST_URL: tokenUrl, ACTIONS_ID_TOKEN_REQUEST_TOKEN: tokenAuth } = process.env;
const oidc = (await (await fetch(`${tokenUrl}&audience=familienplaner-relay`, { headers: { Authorization: `bearer ${tokenAuth}` } })).json()).value;
const auth = { Authorization: `Bearer ${oidc}` };

const res = await fetch(`${WORKER}/relay`, { headers: auth });
if (!res.ok) { console.log(`Worker antwortet ${res.status}`); process.exit(1); }
const { nachrichten } = await res.json();
console.log(`Wartend: ${nachrichten.length}`);

const gesendet = [];
for (const { key, body } of nachrichten) {
  const b = { ...body };
  if (b.delay && Number(b.delay) * 1000 < Date.now() + 60000) delete b.delay;
  const r = await fetch(NTFY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
  if (r.ok) gesendet.push(key);
  else console.log(`Ein Versand fehlgeschlagen (${r.status})`);
}
if (gesendet.length) {
  const r = await fetch(`${WORKER}/relay/erledigt`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ keys: gesendet }) });
  console.log(`Gesendet: ${gesendet.length}, abgemeldet: ${r.status}`);
}
