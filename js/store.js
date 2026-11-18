// Estado global, persistencia (localStorage + servidor PHP opcional), migración, catálogos e import/export.
window.Funko = {};
(function (F) {
  const { reactive, watch, computed } = Vue;
  const L = localStorage;
  const leer = (k, d) => { try { const v = JSON.parse(L.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const txt = v => (v == null ? '' : String(v)).trim();
  const lista = v => [...new Set((Array.isArray(v) ? v : txt(v).split('/')).map(txt).filter(Boolean))];
  const orden = (a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' });
  F.estados = { tengo: 'Lo tengo', quiero: 'Lo quiero', vendido: 'Vendido' };

  F.normalizar = d => ({
    id: d.id || 0,
    numero: txt(d.numero ?? d.Numero), nombre: txt(d.nombre ?? d.Nombre),
    coleccion: txt(d.coleccion ?? d.Coleccion),
    pegatinas: lista(d.pegatinas ?? d.especial ?? d.Especial),
    precio: txt(d.precio ?? d.Precio), tienda: txt(d.tienda ?? d.Tienda),
    fecha: txt(d.fecha ?? d.Fecha), desc: txt(d.desc ?? d.Desc),
    comentarios: txt(d.comentarios ?? d.Comentarios),
    estado: F.estados[txt(d.estado)] ? txt(d.estado) : 'tengo', foto: txt(d.foto ?? d.Foto),
  });

  const S = F.store = reactive({
    admin: false, usuario: '',
    funkos: [], pegatinas: [], colecciones: [],
    tema: L.getItem('tema') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'),
    panelAbierto: false, editandoId: null,
    vista: leer('vista', 'lista'), servidor: 'local' // local | servidor | guardando | error
  });

  const nuevoId = () => Math.max(0, ...S.funkos.map(f => f.id)) + 1;
  function sync() {
    S.funkos.forEach(f => { if (!f.id) f.id = nuevoId(); });
    S.colecciones = [...new Set([...S.colecciones, ...S.funkos.map(f => f.coleccion)].filter(Boolean))].sort(orden);
    S.pegatinas = [...new Set([...S.pegatinas, ...S.funkos.flatMap(f => f.pegatinas)].filter(Boolean))].sort(orden);
  }

  // --- Copia local diaria (se conservan 7) ---
  function copiaDiaria() {
    const k = 'backup_' + new Date().toISOString().slice(0, 10);
    if (L.getItem(k) || !S.funkos.length) return;
    L.setItem(k, JSON.stringify({ funkos: S.funkos, pegatinas: S.pegatinas }));
    F.copiasLocales().slice(7).forEach(x => L.removeItem(x));
  }
  F.copiasLocales = () => Object.keys(L).filter(k => k.startsWith('backup_')).sort().reverse();
  F.restaurarCopia = k => {
    const c = leer(k, null); if (!c) return;
    S.funkos = c.funkos.map(F.normalizar); S.pegatinas = c.pegatinas; S.colecciones = []; sync();
  };
  
  F.init = async function () {
    const B = F.Backend;
    try {
      const d = await B.cargar();
      S.funkos = d.funkos.map(F.normalizar); S.pegatinas = d.pegatinas; S.colecciones = d.colecciones;
    } catch (e) { S.servidor = 'error'; console.warn('No se pudo cargar del servidor', e); }
    sync(); if (S.admin) copiaDiaria(); 

    // Foto del último estado guardado, para saber qué ha cambiado
    let previo = new Map(), ajPrevio = '', cola = Promise.resolve(), t;
    const foto = () => {
      previo = new Map(S.funkos.map(f => [f.id, JSON.stringify(f)]));
      ajPrevio = JSON.stringify([S.pegatinas, S.colecciones]);
    };
    foto();

    async function guardarCambios() {
      const actual = new Map(S.funkos.map(f => [f.id, JSON.stringify(f)]));
      const cambiados = S.funkos.filter(f => previo.get(f.id) !== actual.get(f.id));
      const borrados = [...previo.keys()].filter(id => !actual.has(id));
      const aj = JSON.stringify([S.pegatinas, S.colecciones]);
      if (!cambiados.length && !borrados.length && aj === ajPrevio) return;
      S.servidor = 'guardando';
      try {
        await B.guardarFunkos(cambiados);
        await B.borrarFunkos(borrados);
        if (aj !== ajPrevio) await B.guardarAjustes({ pegatinas: S.pegatinas, colecciones: S.colecciones });
        previo = actual; ajPrevio = aj;     // solo se da por guardado si todo fue bien
        S.servidor = 'servidor';
      } catch (e) { S.servidor = 'error'; console.warn(e); }
    }

    watch(() => [S.funkos, S.pegatinas, S.colecciones], () => {
      if (!S.admin) return;
      clearTimeout(t);
      t = setTimeout(() => { cola = cola.then(guardarCambios); }, 600);
    }, { deep: true });

    const poner = s => { S.admin = !!s; S.usuario = s ? s.email : ''; if (!s) { S.panelAbierto = false; S.editandoId = null; } };
    poner(await B.sesion()); B.onSesion(poner);
    S.servidor = S.servidor === 'error' ? 'error' : 'servidor';

    watch(() => S.tema, t => { document.documentElement.dataset.tema = t; localStorage.setItem('tema', t); }, { immediate: true });
    watch(() => S.vista, v => L.setItem('vista', JSON.stringify(v)));
  };

  F.alternarPanel = () => { if (!S.admin) return; S.panelAbierto = !S.panelAbierto; if (!S.panelAbierto) S.editandoId = null; };
  F.guardarFunko = d => {
    const n = F.normalizar(d), i = S.funkos.findIndex(f => f.id === n.id);
    if (i >= 0) S.funkos[i] = n; else { n.id = nuevoId(); S.funkos.push(n); }
    sync();
  };
  F.borrar = id => { S.funkos = S.funkos.filter(f => f.id !== id); if (S.editandoId === id) S.editandoId = null; };
  F.nuevaPegatina = n => { n = txt(n); if (n && !S.pegatinas.includes(n)) { S.pegatinas.push(n); S.pegatinas.sort(orden); } return n; };

  // --- Catálogos: renombrar (si el nombre nuevo ya existe, se fusionan), usos y borrado ---
  F.uso = (tipo, n) => S.funkos.filter(f => tipo === 'coleccion' ? f.coleccion === n : f.pegatinas.includes(n)).length;
  F.renombrar = (tipo, viejo, nuevo) => {
    nuevo = txt(nuevo); if (!nuevo || nuevo === viejo) return;
    if (tipo === 'coleccion') {
      S.funkos.forEach(f => { if (f.coleccion === viejo) f.coleccion = nuevo; });
      S.colecciones = S.colecciones.filter(c => c !== viejo);
    } else {
      S.funkos.forEach(f => { if (f.pegatinas.includes(viejo)) f.pegatinas = lista(f.pegatinas.map(p => p === viejo ? nuevo : p)); });
      S.pegatinas = S.pegatinas.filter(p => p !== viejo);
    }
    sync();
  };
  F.eliminar = (tipo, n) => {
    if (tipo === 'coleccion') S.colecciones = S.colecciones.filter(c => c !== n);
    else { S.funkos.forEach(f => { f.pegatinas = f.pegatinas.filter(p => p !== n); }); S.pegatinas = S.pegatinas.filter(p => p !== n); }
  };

  // --- Números repetidos dentro de la misma colección ---
  F.sinAcentos = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const clave = f => f.numero ? F.sinAcentos(f.coleccion).replace(/\s+/g, '') + '#' + f.numero.replace(/^0+/, '') : '';
  const conteo = computed(() => { const m = {}; S.funkos.forEach(f => { const k = clave(f); if (k) m[k] = (m[k] || 0) + 1; }); return m; });
  F.esRepetido = f => (conteo.value[clave(f)] || 0) > 1;
  F.hayRepetido = d => !!clave(d) && S.funkos.some(o => o.id !== d.id && clave(o) === clave(d));

  F.importar = (datos, reemplazar) => {
    if (datos.every(x => typeof x === 'string')) { datos.forEach(F.nuevaPegatina); return 'pegatinas'; }
    const n = datos.filter(d => d && typeof d === 'object').map(F.normalizar);
    const base = reemplazar ? [] : S.funkos;
    let id = Math.max(0, ...base.map(f => f.id));
    S.funkos = [...base, ...n.map(f => ({ ...f, id: ++id }))];
    sync(); return n.length;
  };
  const bajar = (nombre, contenido, tipo) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([contenido], { type: tipo })); a.download = nombre; a.click();
  };
  F.exportarJSON = () => bajar('funkos.json', JSON.stringify(S.funkos, null, 2), 'application/json');
  F.exportarPegatinas = () => bajar('pegatinas.json', JSON.stringify(S.pegatinas, null, 2), 'application/json');
  F.exportarCSV = () => {
    const cols = ['numero', 'nombre', 'coleccion', 'pegatinas', 'estado', 'precio', 'tienda', 'fecha', 'desc', 'comentarios', 'foto'];
    const celda = v => '"' + String(Array.isArray(v) ? v.join(' / ') : (v ?? '')).replace(/"/g, '""') + '"';
    bajar('funkos.csv', '\ufeff' + [cols.join(','), ...S.funkos.map(f => cols.map(c => celda(f[c])).join(','))].join('\n'), 'text/csv');
  };
  F.precioNum = p => parseFloat(String(p).replace(',', '.')) || 0;
  F.colorPegatina = n => { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360; return { '--h': h }; };
})(window.Funko);