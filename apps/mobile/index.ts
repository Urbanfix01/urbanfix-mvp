import { registerRootComponent } from 'expo';

// Importamos el archivo que SÍ tiene los dibujos (.tsx)
import App from './App';

// registerRootComponent llama a AppRegistry.registerComponent('main', () => App);
// Esto asegura que el entorno esté configurado correctamente.
registerRootComponent(App);