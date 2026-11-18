(async function () {
  await Funko.init();
  Vue.createApp({
    components: { FormularioFunko: Funko.Formulario, DatosFunko: Funko.Datos, CatalogosFunko: Funko.Catalogos,
      ListadoFunkos: Funko.Listado, EstadisticasFunkos: Funko.Estadisticas, MenuFunko: Funko.Menu },
    data: () => ({ S: Funko.store, vistas: [{ id: 'lista', t: 'Lista' }, { id: 'cuadricula', t: 'Cuadrícula' }, { id: 'stats', t: 'Estadísticas' }] }),
    computed: {
      textoSync() {
        return { guardando: 'Guardando…', error: 'Error de conexión con el servidor' }[this.S.servidor] || ''; 
      }
    },
    methods: {}
  }).mount('#app');
  document.getElementById('cargando').remove();
})();
