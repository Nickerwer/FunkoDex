// Único archivo que conoce Supabase. Contrato: cargar, guardar, sesion, login, logout, onSesion.
Funko.Backend = (function () {
  const db = supabase.createClient('https://ynyhmahabdltukyznasa.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueWhtYWhhYmRsdHVreXpuYXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNzE3NTAsImV4cCI6MjEwMDc0Nzc1MH0.bVdNy0Dq-jA26yvIR5Mbth3HBNC2cdOCZHlNOuuiMX0');
  const usuario = s => (s ? { email: s.user.email } : null);
  return {
    async cargar() {
      const [f, a] = await Promise.all([db.from('funkos').select('id,datos'), db.from('ajustes').select('clave,valor')]);
      if (f.error) throw f.error;
      const aj = {}; (a.data || []).forEach(r => aj[r.clave] = r.valor);
      return { funkos: f.data.map(r => ({ ...r.datos, id: r.id })), pegatinas: aj.pegatinas || [], colecciones: aj.colecciones || [] };
    },
    async guardar(d) {
      if (!d.funkos.length) return; // protección: nunca vaciar la tabla por accidente
      let r = await db.from('funkos').upsert(d.funkos.map(f => ({ id: f.id, datos: f })));
      if (r.error) throw r.error;
      r = await db.from('funkos').delete().not('id', 'in', '(' + d.funkos.map(f => f.id).join(',') + ')');
      if (r.error) throw r.error;
      r = await db.from('ajustes').upsert([{ clave: 'pegatinas', valor: d.pegatinas }, { clave: 'colecciones', valor: d.colecciones }]);
      if (r.error) throw r.error;
    },
    async sesion() { return usuario((await db.auth.getSession()).data.session); },
    async login(email, pass) { const r = await db.auth.signInWithPassword({ email, password: pass }); if (r.error) throw r.error; },
    logout() { return db.auth.signOut(); },
    onSesion(cb) { db.auth.onAuthStateChange((_e, s) => cb(usuario(s))); }
  };
})();