import { data } from './components/data'; // Sicherstellen, dass data.js importiert ist

// Initialisieren des Hintergrundes basierend auf der serverseitigen Einstellung
async function initializeBackground() {
  console.log("initializeBackground wird aufgerufen");  // Debug-Ausgabe
  try {
    const nightTabStyle = await data.get('themeStyle'); // Stil vom Server abrufen
    console.log('Hintergrundstil vom Server:', nightTabStyle);

    if (nightTabStyle) {
      const style = document.createElement('style');
      style.type = 'text/css';
      style.media = 'screen';

      switch (nightTabStyle) {
        case 'light':
          style.innerHTML = 'html, body {background-color: rgb(255, 255, 255);}';
          break;
        case 'dark':
          style.innerHTML = 'html, body {background-color: rgb(0, 0, 0);}';
          break;
      }
      document.querySelector('head').appendChild(style);
    }
  } catch (error) {
    console.error('Fehler beim Abrufen der Hintergrund-Einstellungen:', error);
  }
}

initializeBackground();
