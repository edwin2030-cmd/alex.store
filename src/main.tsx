import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './navidad.css';
import './tema-oscuro.css';
import { aplicarTema, leerTema } from './lib/tema';

aplicarTema(leerTema());

createRoot(document.getElementById('root')!).render(<App />);
