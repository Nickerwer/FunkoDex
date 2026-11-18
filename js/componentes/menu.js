// Menú desplegable de la cabecera: acceso, panel de edición y tema.
Funko.Menu = {
  data: () => ({ S: Funko.store, abierto: false, email: '', pass: '', error: '', cargando: false }),
  template: `
  <div class="menu" ref="raiz">
    <button class="btn fantasma menu-btn" @click="abierto = !abierto" aria-label="Menú" :aria-expanded="abierto">☰</button>
    <div class="menu-caja" v-show="abierto">
      <template v-if="S.admin">
        <div class="menu-usuario">{{ S.usuario }}</div>
        <button class="menu-item" @click="panel">{{ S.panelAbierto ? 'Ocultar panel de edición' : '＋ Añadir / editar' }}</button>
      </template>
      <form v-else class="menu-login" @submit.prevent="entrar">
        <input v-model="email" type="text" placeholder="Email" autocomplete="username" aria-label="Email">
        <input v-model="pass" type="password" placeholder="Contraseña" autocomplete="current-password" aria-label="Contraseña">
        <button class="btn" type="submit" :disabled="cargando">{{ cargando ? 'Entrando…' : 'Entrar' }}</button>
        <span class="menu-error" v-if="error">{{ error }}</span>
      </form>
      <button class="menu-item" @click="tema">{{ S.tema === 'oscuro' ? '☀ Modo claro' : '☾ Modo oscuro' }}</button>
      <button v-if="S.admin" class="menu-item" @click="salir">Cerrar sesión</button>
    </div>
  </div>`,
  mounted() {
    this._fuera = e => { if (this.abierto && !this.$refs.raiz.contains(e.target)) this.abierto = false; };
    this._esc = e => { if (e.key === 'Escape') this.abierto = false; };
    document.addEventListener('click', this._fuera);
    document.addEventListener('keydown', this._esc);
  },
  beforeUnmount() {
    document.removeEventListener('click', this._fuera);
    document.removeEventListener('keydown', this._esc);
  },
  methods: {
    panel() { Funko.alternarPanel(); this.abierto = false; },
    tema() { this.S.tema = this.S.tema === 'oscuro' ? 'claro' : 'oscuro'; },
    async entrar() {
      this.cargando = true; this.error = '';
      try { await Funko.Backend.login(this.email.trim(), this.pass); this.pass = ''; this.abierto = false; }
      catch (e) { this.error = 'Datos incorrectos'; }
      this.cargando = false;
    },
    async salir() { await Funko.Backend.logout(); this.abierto = false; }
  }
};