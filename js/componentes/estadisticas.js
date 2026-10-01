// Estadísticas de lo que tienes (estado "Lo tengo"), por colección y por tienda.
Funko.Estadisticas = {
  data: () => ({ S: Funko.store }),
  template: `
  <section class="panel">
    <div class="kpis"><div v-for="k in kpis" :key="k.t" class="kpi"><b>{{ k.v }}</b><span>{{ k.t }}</span></div></div>
    <div class="grupos">
      <div v-for="g in grupos" :key="g.titulo"><h4>{{ g.titulo }}</h4>
        <div class="barra-fila" v-for="r in g.filas" :key="r.nombre">
          <div class="barra-t"><span>{{ r.nombre }}</span><span class="suave">{{ r.n }} · {{ r.gasto.toFixed(2) }} €</span></div>
          <div class="barra-b"><i :style="{width: r.pct + '%'}"></i></div>
        </div>
      </div>
    </div>
  </section>`,
  computed: {
    tengo() { return this.S.funkos.filter(f => f.estado === 'tengo'); },
    kpis() {
      const c = e => this.S.funkos.filter(f => f.estado === e).length;
      return [{ t: 'Los tengo', v: this.tengo.length }, { t: 'Lista de deseos', v: c('quiero') }, { t: 'Vendidos', v: c('vendido') },
        { t: 'Gastado en lo que tengo', v: this.tengo.reduce((s, f) => s + Funko.precioNum(f.precio), 0).toFixed(2) + ' €' }];
    },
    grupos() {
      const agrupar = (clave, vacio) => {
        const m = {};
        this.tengo.forEach(f => { const k = clave(f) || vacio, r = m[k] || (m[k] = { nombre: k, n: 0, gasto: 0 }); r.n++; r.gasto += Funko.precioNum(f.precio); });
        const filas = Object.values(m).sort((a, b) => b.n - a.n), max = filas.length ? filas[0].n : 1;
        filas.forEach(r => r.pct = r.n / max * 100);
        return filas;
      };
      return [{ titulo: 'Por colección', filas: agrupar(f => f.coleccion, 'Sin colección') }, { titulo: 'Por tienda', filas: agrupar(f => f.tienda, 'Sin tienda') }];
    }
  }
};
