const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3100; // oder der Port, den Sie festgelegt haben
const DATA_PATH = path.join(__dirname, 'data/settings.json');
const cors = require('cors');
app.use(cors());

app.use(express.json());

// Prüfen, ob settings.json existiert und initialisieren, falls nicht
if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify({}), 'utf8');
}

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
