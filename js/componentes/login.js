Funko.Login = {
  data: () => ({ S: Funko.store, abierto: false, email: '', pass: '', error: '' }),
  template: `
  <span class="login">
    <template v-if="S.admin">
      <small>{{ S.usuario }}</small>
      <button class="btn fantasma pequeno" @click="salir">Salir</button>
    </template>
    <template v-else>
      <button v-if="!abierto" class="btn fantasma pequeno" @click="abierto = true">Acceder</button>
      <form v-else @submit.prevent="entrar" style="display:inline-flex;gap:6px;align-items:center">
        <input v-model="email" type="text" placeholder="Email" autocomplete="username" style="width:150px;margin:0">
        <input v-model="pass" type="password" placeholder="Contraseña" autocomplete="current-password" style="width:120px;margin:0">
        <button class="btn pequeno" type="submit">Entrar</button>
        <small v-if="error" style="color:var(--peligro)">{{ error }}</small>
      </form>
    </template>
  </span>`,
  methods: {
    async entrar() {
      try { await Funko.Backend.login(this.email.trim(), this.pass); this.abierto = false; this.pass = ''; this.error = ''; }
      catch (e) { this.error = 'Datos incorrectos'; }
    },
    salir() { Funko.Backend.logout(); }
  }
};