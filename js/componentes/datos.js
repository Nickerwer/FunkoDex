// Importar y exportar (acepta el JSON antiguo y el nuevo, y también un JSON de pegatinas).
Funko.Datos = {
  template: `
  <section class="panel">
    <strong>Datos</strong>
    <div class="fila" style="margin-top:10px"><input type="file" ref="archivo" accept="application/json"><button class="btn" @click="importar">Importar</button></div>
    <div class="fila" style="margin-top:8px">
      <button class="btn secundario" @click="exp.exportarJSON()">JSON</button>
      <button class="btn secundario" @click="exp.exportarCSV()">CSV</button>
      <button class="btn secundario" @click="exp.exportarPegatinas()">Pegatinas</button>
    </div>
  
    <div class="fila" style="margin-top:8px" v-if="copias.length">
      <select v-model="sel"><option value="">Copias automáticas…</option><option v-for="c in copias" :key="c" :value="c">{{ c.replace('backup_', '') }}</option></select>
      <button class="btn secundario" :disabled="!sel" @click="restaurar">Restaurar</button>
    </div>
  </section>`,
  data: () => ({ exp: Funko, sel: '', copias: Funko.copiasLocales() }),
  methods: {
    restaurar() { if (confirm('Se reemplaza el listado actual por la copia del ' + this.sel.replace('backup_', '') + '.')) Funko.restaurarCopia(this.sel); },
    importar() {
      const file = this.$refs.archivo.files[0];
      if (!file) return alert('Selecciona un archivo JSON');
      const r = new FileReader();
      r.onload = () => {
        try {
          const datos = JSON.parse(r.result);
          if (!Array.isArray(datos)) return alert('El JSON debe ser una lista');
          const esPeg = datos.every(x => typeof x === 'string');
          const reemplazar = !esPeg && confirm('Aceptar = REEMPLAZAR el listado actual.\nCancelar = AÑADIR a lo que ya tienes.');
          const res = Funko.importar(datos, reemplazar);
          alert(res === 'pegatinas' ? 'Pegatinas importadas' : res + ' funkos importados');
        } catch (e) { alert('JSON no válido'); }
      };
      r.readAsText(file);
    }
  }
};
