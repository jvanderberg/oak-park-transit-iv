import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App';

// StrictMode is omitted: react-leaflet's MapContainer double-initializes under its dev double-mount.
createRoot(document.getElementById('root')!).render(<App />);
