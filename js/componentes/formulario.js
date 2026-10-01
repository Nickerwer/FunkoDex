// Formulario de alta/edición. El modo (nuevo o edición) se ve en el título, el aviso y el botón.
(function () {
  const vacio = () => ({ id: 0, numero: '', nombre: '', coleccion: '', nuevaColeccion: '', pegatinas: [], nuevaPegatina: '',
    precio: '', tienda: '', fecha: '', desc: '', comentarios: '', estado: 'tengo', foto: '' });
  Funko.Formulario = {
    data: () => ({ S: Funko.store, form: vacio(), estados: Funko.estados }),
    template: `
    <section class="panel" :class="{editando}">
      <div class="panel-cab">
        <strong>{{ editando ? 'Editar funko' : 'Añadir funko' }}</strong>
        <button type="button" class="btn fantasma pequeno" @click="plegar">Plegar ‹</button>
      </div>
      <p class="aviso" v-if="editando">Editando <b>{{ titulo }}</b>. Los cambios no se aplican hasta guardar.</p>
      <form @submit.prevent="guardar">
        <div class="fila">
          <label class="corto">Número<input v-model="form.numero" type="text" placeholder="1430"></label>
          <label>Nombre<input v-model="form.nombre" type="text" required placeholder="Nombre del Funko"></label>
        </div>
        <p class="aviso rojo" v-if="repetido">Ya hay otro funko con este número en la colección.</p>
        <label>Estado
          <select v-model="form.estado"><option v-for="(t, k) in estados" :key="k" :value="k">{{ t }}</option></select>
        </label>
        <label>Colección
          <select v-model="form.coleccion"><option value="">— Sin colección —</option><option v-for="c in S.colecciones" :key="c">{{ c }}</option></select>
        </label>
        <label>Nueva colección <input v-model="form.nuevaColeccion" type="text" placeholder="Si no está en la lista"></label>
        <fieldset>
          <legend>Pegatinas</legend>
          <div class="opciones">
            <label v-for="p in S.pegatinas" :key="p" class="opcion">
              <input type="checkbox" :value="p" v-model="form.pegatinas"><span class="peg" :style="color(p)">{{ p }}</span>
            </label>
            <span v-if="!S.pegatinas.length" class="suave">Aún no hay pegatinas.</span>
          </div>
          <div class="fila">
            <input v-model="form.nuevaPegatina" type="text" placeholder="Nueva pegatina" @keydown.enter.prevent="addPegatina">
            <button type="button" class="btn secundario" @click="addPegatina">Añadir</button>
          </div>
        </fieldset>
        <div class="fila">
          <label>Precio (€)<input v-model="form.precio" type="text" placeholder="15.99"></label>
          <label>Tienda<input v-model="form.tienda" type="text"></label>
        </div>
        <div class="fila">
          <label>Fecha de compra<input v-model="form.fecha" type="date"></label>
          <label>Nota de compra<input v-model="form.desc" type="text" placeholder="Oferta 3x2"></label>
        </div>
        <label>Foto (URL) <a href="https://pops.today/pops/" target="_blank" rel="noopener">buscar en pops.today</a>
          <input v-model="form.foto" type="text" placeholder="https://…">
        </label>
        <img v-if="form.foto" :src="form.foto" class="previa" alt="Vista previa" @error="$event.target.style.display='none'" @load="$event.target.style.display=''">
        <label>Comentarios<textarea v-model="form.comentarios" rows="3" placeholder="Sin caja, tamaño grande, dónde está…"></textarea></label>
        <div class="fila fin">
          <button class="btn" type="submit">{{ editando ? 'Guardar cambios' : 'Añadir funko' }}</button>
          <button type="button" class="btn secundario" @click="cancelar">{{ editando ? 'Cancelar edición' : 'Limpiar' }}</button>
        </div>
      </form>
    </section>`,
    computed: {
      editando() { return this.S.editandoId !== null; },
      titulo() { return (this.form.numero ? '#' + this.form.numero + ' ' : '') + this.form.nombre; },
      repetido() { return Funko.hayRepetido({ ...this.form, coleccion: this.form.nuevaColeccion.trim() || this.form.coleccion }); }
    },
    watch: {
      'S.editandoId'(id) {
        const f = this.S.funkos.find(x => x.id === id);
        this.form = f ? { ...vacio(), ...JSON.parse(JSON.stringify(f)) } : vacio();
      }
    },
    methods: {
      color: Funko.colorPegatina,
      plegar() { Funko.alternarPanel(); },
      addPegatina() {
        const n = Funko.nuevaPegatina(this.form.nuevaPegatina);
        if (n && !this.form.pegatinas.includes(n)) this.form.pegatinas.push(n);
        this.form.nuevaPegatina = '';
      },
      guardar() {
        this.addPegatina();
        Funko.guardarFunko({ ...this.form, coleccion: this.form.nuevaColeccion.trim() || this.form.coleccion });
        this.cancelar();
      },
      cancelar() { this.S.editandoId = null; this.form = vacio(); }
    }
  };
})();
