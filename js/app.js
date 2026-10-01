(async function () {
  await Funko.init();
  Vue.createApp({
    components: { FormularioFunko: Funko.Formulario, DatosFunko: Funko.Datos, CatalogosFunko: Funko.Catalogos,
      ListadoFunkos: Funko.Listado, EstadisticasFunkos: Funko.Estadisticas },
    data: () => ({ S: Funko.store, vistas: [{ id: 'lista', t: 'Lista' }, { id: 'cuadricula', t: 'Cuadrícula' }, { id: 'stats', t: 'Estadísticas' }] }),
    computed: {
      textoSync() {
        return { local: 'Solo en este navegador', servidor: 'Guardado en el servidor', guardando: 'Guardando…', error: 'Error al guardar en el servidor' }[this.S.servidor];
      }
    },
    methods: { alternarTema() { this.S.tema = this.S.tema === 'oscuro' ? 'claro' : 'oscuro'; } }
  }).mount('#app');
})();
