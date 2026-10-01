// Listado con búsqueda, filtros, orden y resumen. Los botones de edición solo salen con el panel abierto.
Funko.Listado = {
  components: { Ficha: Funko.Ficha },
  data: () => ({ S: Funko.store, texto: '', coleccion: '', pegatina: '', orden: 'nombre', estado: '', estados: Funko.estados }),
  template: `
  <section class="panel">
    <div class="barra">
      <input v-model="texto" type="search" placeholder="Buscar por nombre, número, colección, tienda…">
      <select v-model="coleccion"><option value="">Todas las colecciones</option><option v-for="c in S.colecciones" :key="c">{{ c }}</option></select>
      <select v-model="pegatina"><option value="">Todas las pegatinas</option><option v-for="p in S.pegatinas" :key="p">{{ p }}</option></select>
      <select v-model="estado"><option value="">Todos los estados</option><option v-for="(t, k) in estados" :key="k" :value="k">{{ t }}</option></select>
      <select v-model="orden" aria-label="Ordenar">
        <option value="nombre">Ordenar: nombre</option><option value="numero">Ordenar: número</option>
        <option value="coleccion">Ordenar: colección</option><option value="reciente">Ordenar: añadidos último</option>
      </select>
      <button class="btn fantasma" @click="limpiar">Limpiar</button>
      <button v-if="!S.panelAbierto" class="btn" @click="alternar">＋ Añadir / editar</button>
    </div>
    <p class="resumen">{{ lista.length }} de {{ S.funkos.length }} funkos · {{ gastado }} € en lo mostrado (sin contar la lista de deseos)</p>
    <div class="lista" :class="{cuadricula: S.vista === 'cuadricula'}">
      <ficha v-for="f in lista" :key="f.id" :f="f" :editable="S.panelAbierto" :activa="S.editandoId === f.id"
        @editar="editar(f.id)" @borrar="borrar(f)"></ficha>
      <p v-if="!lista.length" class="vacio-lista">No hay funkos con estos filtros.</p>
    </div>
  </section>`,
  computed: {
    lista() {
      const t = Funko.sinAcentos(this.texto);
      const l = this.S.funkos.filter(f => {
        if (this.coleccion && f.coleccion !== this.coleccion) return false;
        if (this.pegatina && !f.pegatinas.includes(this.pegatina)) return false;
        if (this.estado && f.estado !== this.estado) return false;
        if (!t) return true;
        return Funko.sinAcentos([f.nombre, f.numero, f.coleccion, f.tienda, f.comentarios, f.pegatinas.join(' ')].join(' ')).includes(t);
      });
      const o = this.orden;
      if (o === 'reciente') return l.slice().sort((a, b) => b.id - a.id);
      return l.slice().sort((a, b) => o === 'numero'
        ? (parseInt(a.numero) || 1e9) - (parseInt(b.numero) || 1e9)
        : String(a[o]).localeCompare(b[o], 'es', { sensitivity: 'base' }));
    },
    gastado() { return this.lista.filter(f => f.estado !== 'quiero').reduce((s, f) => s + Funko.precioNum(f.precio), 0).toFixed(2); }
  },
  methods: {
    limpiar() { this.texto = ''; this.coleccion = ''; this.pegatina = ''; this.estado = ''; },
    alternar() { Funko.alternarPanel(); },
    editar(id) { this.S.editandoId = id; window.scrollTo({ top: 0, behavior: 'smooth' }); },
    borrar(f) { if (confirm('¿Borrar "' + f.nombre + '"?')) Funko.borrar(f.id); }
  }
};
