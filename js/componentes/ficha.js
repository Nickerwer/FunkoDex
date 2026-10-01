// Ficha de un funko (sirve para lista y cuadrícula; el CSS cambia la disposición).
Funko.Ficha = {
  props: ['f', 'editable', 'activa'],
  emits: ['editar', 'borrar'],
  data: () => ({ roto: false, estados: Funko.estados }),
  watch: { 'f.foto'() { this.roto = false; } },
  template: `
  <article class="ficha" :class="[{activa}, 'e-' + f.estado]">
    <div class="num" :class="{vacio: !f.numero}">{{ f.numero ? '#' + f.numero : 'S/N' }}</div>
    <img v-if="f.foto && !roto" class="foto" :src="f.foto" :alt="f.nombre" loading="lazy" @error="roto = true">
    <div class="cuerpo">
      <h3>{{ f.nombre || '(sin nombre)' }}<span class="estado" v-if="f.estado !== 'tengo'">{{ estados[f.estado] }}</span></h3>
      <div class="coleccion">{{ f.coleccion || 'Sin colección' }}</div>
      <ul class="pegatinas" v-if="f.pegatinas.length" aria-label="Pegatinas">
        <li v-for="p in f.pegatinas" :key="p" class="peg" :style="color(p)">{{ p }}</li>
      </ul>
      <div class="rep" v-if="repetido">Número repetido en esta colección</div>
      <div class="compra" v-if="compra">{{ compra }}</div>
      <div class="nota" v-if="f.desc">{{ f.desc }}</div>
      <p class="coment" v-if="f.comentarios">{{ f.comentarios }}</p>
    </div>
    <div class="acciones" v-if="editable">
      <button class="btn pequeno" @click="$emit('editar')" :aria-label="'Editar ' + f.nombre">Editar</button>
      <button class="btn pequeno peligro" @click="$emit('borrar')" :aria-label="'Borrar ' + f.nombre">Borrar</button>
    </div>
  </article>`,
  computed: {
    repetido() { return Funko.esRepetido(this.f); },
    compra() {
      const f = this.f, fecha = f.fecha ? new Date(f.fecha + 'T00:00').toLocaleDateString('es-ES') : '';
      return [f.tienda, f.precio ? f.precio + ' €' : '', fecha].filter(Boolean).join(' · ');
    }
  },
  methods: { color: Funko.colorPegatina }
};
