(async function () {
  await Funko.init();
  Vue.createApp({
    components: { FormularioFunko: Funko.Formulario, DatosFunko: Funko.Datos, CatalogosFunko: Funko.Catalogos,
      ListadoFunkos: Funko.Listado, EstadisticasFunkos: Funko.Estadisticas },
    data: () => ({ S: Funko.store, vistas: [{ id: 'lista', t: 'Lista' }, { id: 'cuadricula', t: 'Cuadrícula' }, { id: 'stats', t: 'Estadísticas' }] }),
    methods: { alternarTema() { this.S.tema = this.S.tema === 'oscuro' ? 'claro' : 'oscuro'; } }
  }).mount('#app');
})();
