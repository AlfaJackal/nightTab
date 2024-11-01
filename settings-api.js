const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3100; // Neuer API-Port für den Container
const DATA_PATH = path.join(__dirname, 'data/settings.json');

app.use(cors());
app.use(express.json());

// Endpunkt zum Abrufen der Einstellungen
app.get('/settings', (req, res) => {
    if (fs.existsSync(DATA_PATH)) {
        const settings = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
        res.json(settings);
    } else {
        res.json({}); // Rückgabe leerer Einstellungen, falls keine Datei vorhanden ist
    }
});

// Endpunkt zum Speichern der Einstellungen
app.post('/settings', (req, res) => {
    fs.writeFileSync(DATA_PATH, JSON.stringify(req.body, null, 2));
    res.status(200).send('Settings saved.');
});

app.listen(PORT, () => {
    console.log(`Settings API listening on port ${PORT}`);
});
