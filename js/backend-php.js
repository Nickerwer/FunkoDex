Funko.Backend = (function () {
  const oyentes = [];
  const avisar = s => oyentes.forEach(cb => cb(s));
  async function llamar(a, cuerpo) {
    const r = await fetch('api.php?a=' + a, {
      method: cuerpo === undefined ? 'GET' : 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  return {
    cargar: () => llamar('cargar'),
    guardarFunkos: lista => lista.length ? llamar('funkos', { guardar: lista, borrar: [] }) : null,
    borrarFunkos: ids => ids.length ? llamar('funkos', { guardar: [], borrar: ids }) : null,
    guardarAjustes: a => llamar('ajustes', a),
    sesion: () => llamar('sesion'),
    async login(email, pass) { const s = await llamar('login', { email, pass }); avisar(s); },
    async logout() { await llamar('logout', {}); avisar(null); },
    onSesion: cb => oyentes.push(cb)
  };
})();