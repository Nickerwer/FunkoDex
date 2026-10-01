// Gestión de colecciones y pegatinas: renombrar, fusionar (renombrando a un nombre existente) y borrar.
Funko.Catalogos = {
  data: () => ({ S: Funko.store, tipo: 'coleccion' }),
  template: `
  <details class="panel">
    <summary><strong>Colecciones y pegatinas</strong></summary>
    <div class="fila" style="margin:10px 0">
      <button class="btn pequeno" :class="{secundario: tipo !== 'coleccion'}" @click="tipo = 'coleccion'">Colecciones</button>
      <button class="btn pequeno" :class="{secundario: tipo !== 'pegatina'}" @click="tipo = 'pegatina'">Pegatinas</button>
    </div>
    <ul class="cat">
      <li v-for="n in items" :key="n">
        <span>{{ n }} <small class="suave">{{ uso(n) }}</small></span>
        <span class="fila">
          <button class="btn pequeno secundario" @click="renombrar(n)">Renombrar</button>
          <button class="btn pequeno peligro" @click="eliminar(n)" :aria-label="'Eliminar ' + n">×</button>
        </span>
      </li>
    </ul>
  </details>`,
  computed: { items() { return this.tipo === 'coleccion' ? this.S.colecciones : this.S.pegatinas; } },
  methods: {
    uso(n) { return Funko.uso(this.tipo, n); },
    renombrar(n) {
      const nuevo = (prompt('Nuevo nombre para "' + n + '".\nSi ya existe, se fusionarán:', n) || '').trim();
      if (!nuevo || nuevo === n) return;
      if (this.items.includes(nuevo) && !confirm('"' + nuevo + '" ya existe. ¿Fusionar "' + n + '" en él?')) return;
      Funko.renombrar(this.tipo, n, nuevo);
    },
    eliminar(n) {
      const u = this.uso(n);
      if (this.tipo === 'coleccion' && u) return alert('Tiene ' + u + ' funkos. Renómbrala o fusiónala con otra.');
      if (confirm('¿Eliminar "' + n + '"' + (u ? ' de ' + u + ' funkos' : '') + '?')) Funko.eliminar(this.tipo, n);
    }
  }
};
