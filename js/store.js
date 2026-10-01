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
    estado: F.estados[txt(d.estado)] ? txt(d.estado) : 'tengo', foto: txt(d.foto ?? d.Foto)
  });

  const S = F.store = reactive({
    funkos: [], pegatinas: [], colecciones: [],
    tema: L.getItem('tema') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'),
    panelAbierto: leer('panel_abierto', true), editandoId: null,
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
    let f = leer('funkos_v2', null);
    if (!f) { const viejo = leer('funkos', null); if (viejo) f = viejo.map(F.normalizar); }
    S.pegatinas = leer('pegatinas_v2', []);
    S.colecciones = leer('colecciones_v2', leer('colecciones', []));

    // Si no hay funkos guardados en localStorage, intenta cargar data/funkos.json
    if (!f || !f.length) {
      try {
        const res = await fetch('data/funkos.json');
        if (res.ok) {
          const datos = await res.json();
          f = datos.map(F.normalizar);
        }
      } catch (e) {
        console.warn('No se pudo cargar data/funkos.json', e);
      }

      // Opcionalmente carga las pegatinas si no había ninguna guardada
      if (!S.pegatinas.length) {
        try {
          const resP = await fetch('data/pegatinas.json');
          if (resP.ok) {
            S.pegatinas = await resP.json();
          }
        } catch (e) {}
      }
    }

    S.funkos = f || []; sync(); copiaDiaria();
    watch(() => [S.funkos, S.pegatinas, S.colecciones], () => {
      L.setItem('funkos_v2', JSON.stringify(S.funkos));
      L.setItem('pegatinas_v2', JSON.stringify(S.pegatinas));
      L.setItem('colecciones_v2', JSON.stringify(S.colecciones));
    }, { deep: true });
    watch(() => S.tema, t => { document.documentElement.dataset.tema = t; L.setItem('tema', t); }, { immediate: true });
    watch(() => S.panelAbierto, v => L.setItem('panel_abierto', JSON.stringify(v)));
    watch(() => S.vista, v => L.setItem('vista', JSON.stringify(v)));
  };

  F.alternarPanel = () => { S.panelAbierto = !S.panelAbierto; if (!S.panelAbierto) S.editandoId = null; };
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