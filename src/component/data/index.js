import { message } from '../message';

import { state } from '../state';
import { bookmark } from '../bookmark';
import { menu } from '../menu';
import { version } from '../version';
import { update } from '../update';
import { APP_NAME } from '../../constant';

import { Modal } from '../modal';
import { ImportForm } from '../importForm';

import { dateTime } from '../../utility/dateTime';
import { node } from '../../utility/node';
import { complexNode } from '../../utility/complexNode';
import { isJson } from '../../utility/isJson';
import { clearChildNode } from '../../utility/clearChildNode';

const data = {};

// Standard-Settings-Objekt
const defaultSettings = {
    style: {
        // Definieren Sie hier die Standardwerte für "style"
    },
    language: 'en', // Standardwert für die Sprache
    // Fügen Sie weitere Standardwerte hier hinzu
};

// Speichern der Daten auf dem Server (via API)
data.set = async (key, value) => {
    try {
        console.log(`Speichern der Einstellung auf dem Server: ${key} = ${value}`);
        
        // Abrufen der aktuellen Einstellungen
        const currentSettings = await data.getAll();
        currentSettings[key] = value;

        // POST-Anfrage an die API, um die Daten zu speichern
        await fetch('http://10.10.0.111:3100/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentSettings),
        });

        console.log('Einstellungen wurden in settings.json auf dem Server gespeichert.');
    } catch (error) {
        console.error('Fehler beim Speichern der Einstellungen auf dem Server:', error);
    }
};

// Laden einer spezifischen Einstellung vom Server (via API)
data.get = async (key) => {
    try {
        const settings = await data.getAll();
        console.log(`Einstellung vom Server erhalten: ${key} = ${settings[key]}`);
        return settings[key] || null;
    } catch (error) {
        console.error('Fehler beim Laden der Einstellungen vom Server:', error);
        return null;
    }
};

// Alle Einstellungen vom Server abrufen
data.getAll = async () => {
    try {
        const response = await fetch('http://10.10.0.111:3100/settings');
        
        if (!response.ok) {
            console.warn("Fehlerhafte Antwort vom Server:", response.status);
            return {};
        }

        const settings = await response.json();

        // Sicherstellen, dass alle erforderlichen Felder existieren
        console.log('Erhaltene Einstellungen:', settings);
        
        return settings;
    } catch (error) {
        console.error('Fehler beim Abrufen aller Einstellungen vom Server:', error);
        return {};
    }
};

data.import = {
  state: {
    setup: { include: true },
    bookmark: { include: true, type: 'restore' },
    theme: { include: true }
  },
  reset: () => {
    data.import.state.setup.include = true;
    data.import.state.bookmark.include = true;
    data.import.state.bookmark.type = 'restore';
    data.import.state.theme.include = true;
  },
  file: ({
    fileList = false,
    feedback = false,
    input = false
  } = {}) => {
    if (fileList.length > 0) {
      data.validate.file({
        fileList: fileList,
        feedback: feedback,
        input: input
      });
    }
  },
  drop: ({
    fileList = false,
    feedback = false
  }) => {
    if (fileList.length > 0) {
      data.validate.file({
        fileList: fileList,
        feedback: feedback
      });
    }
  },
  paste: ({
    clipboardData = false,
    feedback = false
  }) => {
    data.validate.paste({
      clipboardData: clipboardData,
      feedback: feedback
    });
  },
  render: (dataToImport) => {
    let dataToCheck = JSON.parse(dataToImport);

    if (dataToCheck.version !== version.number) {
      dataToCheck = data.update(dataToCheck);
    }

    const importForm = new ImportForm({
      dataToImport: dataToCheck,
      state: data.import.state
    });

    const importModal = new Modal({
      heading: message.get('dataRestoreHeading'),
      content: importForm.form(),
      successText: message.get('dataRestoreSuccessText'),
      cancelText: message.get('dataRestoreCancelText'),
      width: 'small',
      successAction: () => {
        if (data.import.state.setup.include || data.import.state.theme.include || data.import.state.bookmark.include) {
          let dataToRestore = JSON.parse(dataToImport);

          if (dataToRestore.version !== version.number) {
            data.backup(dataToRestore);
            dataToRestore = data.update(dataToRestore);
          }

          data.restore(dataToRestore);
          data.save();
          data.reload.render();
        }
        data.import.reset();
      },
      cancelAction: () => { data.import.reset(); },
      closeAction: () => { data.import.reset(); }
    });

    importModal.open();
  }
};

data.validate = {
  paste: ({
    feedback = false
  } = {}) => {
    navigator.clipboard.readText().then(clipboardData => {
      if (isJson(clipboardData)) {
        if (JSON.parse(clipboardData)[APP_NAME] || JSON.parse(clipboardData)[APP_NAME.toLowerCase()]) {
          data.feedback.clear.render(feedback);
          data.feedback.success.render(feedback, 'Clipboard data', () => {
            menu.close();
            data.import.render(clipboardData);
          });
        } else {
          data.feedback.clear.render(feedback);
          data.feedback.fail.notClipboardJson.render(feedback, 'Clipboard data');
        }
      } else {
        data.feedback.clear.render(feedback);
        data.feedback.fail.notClipboardJson.render(feedback, 'Clipboard data');
      }
    }).catch(() => {
      data.feedback.clear.render(feedback);
      data.feedback.fail.notClipboardJson.render(feedback, 'Clipboard data');
    });
  },
  file: ({
    fileList = false,
    feedback = false,
    input = false
  } = {}) => {
    const reader = new window.FileReader();
    reader.onload = (event) => {
      if (isJson(event.target.result)) {
        if (JSON.parse(event.target.result)[APP_NAME] || JSON.parse(event.target.result)[APP_NAME.toLowerCase()]) {
          data.feedback.clear.render(feedback);
          data.feedback.success.render(feedback, fileList[0].name, () => {
            menu.close();
            data.import.render(event.target.result);
          });
          if (input) { input.value = ''; }
        } else {
          data.feedback.clear.render(feedback);
          data.feedback.fail.notAppJson.render(feedback, fileList[0].name);
          if (input) { input.value = ''; }
        }
      } else {
        data.feedback.clear.render(feedback);
        data.feedback.fail.notJson.render(feedback, fileList[0].name);
        if (input) { input.value = ''; }
      }
    };
    reader.readAsText(fileList.item(0));
  }
};

data.export = () => {
  let timestamp = dateTime();
  const leadingZero = (value) => value < 10 ? '0' + value : value;

  timestamp.hours = leadingZero(timestamp.hours);
  timestamp.minutes = leadingZero(timestamp.minutes);
  timestamp.seconds = leadingZero(timestamp.seconds);
  timestamp.date = leadingZero(timestamp.date);
  timestamp.month = leadingZero(timestamp.month + 1);
  timestamp.year = leadingZero(timestamp.year);
  timestamp = `${timestamp.year}.${timestamp.month}.${timestamp.date} - ${timestamp.hours} ${timestamp.minutes} ${timestamp.seconds}`;

  const fileName = `${APP_NAME} ${message.get('dataExportBackup')} - ${timestamp}.json`;
  const dataToExport = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data.load()));

  const link = document.createElement('a');
  link.setAttribute('href', dataToExport);
  link.setAttribute('download', fileName);
  link.addEventListener('click', () => { link.remove(); });
  document.querySelector('body').appendChild(link);
  link.click();
};

data.remove = (key) => {
  window.localStorage.removeItem(key);
};

data.backup = (dataToBackup) => {
  if (dataToBackup) {
    data.set(APP_NAME + 'Backup', JSON.stringify(dataToBackup));
    console.log('data version ' + dataToBackup.version + ' backed up');
  }
};

data.update = (dataToUpdate) => {
  if (dataToUpdate.version !== version.number) {
    dataToUpdate = update.run(dataToUpdate);
  } else {
    console.log('data version:', version.number, 'no need to run update');
  }
  return dataToUpdate;
};

data.restore = (dataToRestore) => {
  if (dataToRestore) {
    console.log('data found to load');
    if (data.import.state.setup.include) {
      state.set.restore.setup(dataToRestore);
    }
    if (data.import.state.theme.include) {
      state.set.restore.theme(dataToRestore);
    }
    if (data.import.state.bookmark.include) {
      switch (data.import.state.bookmark.type) {
        case 'restore':
          bookmark.restore(dataToRestore);
          break;
        case 'append':
          bookmark.append(dataToRestore);
          break;
      }
    }
  } else {
    console.log('no data found to load');
    state.set.default
