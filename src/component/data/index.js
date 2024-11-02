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
        return settings[key] || defaultSettings[key] || null;
    } catch (error) {
        console.error('Fehler beim Laden der Einstellungen vom Server:', error);
        return defaultSettings[key] || null;
    }
};

// Alle Einstellungen vom Server abrufen und mit Standardwerten kombinieren
data.getAll = async () => {
    try {
        const response = await fetch('http://10.10.0.111:3100/settings');
        
        if (!response.ok) {
            console.warn("Fehlerhafte Antwort vom Server:", response.status);
            return { ...defaultSettings };
        }

        const settings = await response.json();

        if (settings && typeof settings === "object" && !Array.isArray(settings)) {
            console.log('Alle Einstellungen vom Server erhalten (gültiges JSON):', settings);
            return { ...defaultSettings, ...settings };
        } else {
            console.warn("Ungültige JSON-Struktur erhalten, Rückgabe der Standardwerte.");
            return { ...defaultSettings };
        }
    } catch (error) {
        console.error('Fehler beim Abrufen aller Einstellungen vom Server:', error);
        return { ...defaultSettings };
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
    state.set.default();
  }
};

data.save = () => {
  data.set(APP_NAME, JSON.stringify({
    [APP_NAME]: true,
    version: version.number,
    state: state.get.current(),
    bookmark: bookmark.all
  }));
};

// Prüfen Sie, ob `data.load()` korrekt aufgelöst wird und keine Promise als JSON verarbeitet
data.load = async () => {
    try {
        const loadedData = await data.getAll();
        console.log("Initiale Einstellungen geladen:", loadedData);
        return loadedData;
    } catch (error) {
        console.error("Fehler beim Laden der initialen Einstellungen:", error);
        return { ...defaultSettings };
    }
};

data.wipe = {
  all: () => {
    data.remove(APP_NAME);
    data.reload.render();
  },
  partial: () => {
    bookmark.reset();
    data.set(APP_NAME, JSON.stringify({
      [APP_NAME]: true,
      version: version.number,
      state: state.get.default(),
      bookmark: bookmark.all
    }));
    data.reload.render();
  }
};

data.reload = {
  render: () => {
    window.location.reload();
  }
};

data.clear = {
  all: {
    render: () => {
      const clearModal = new Modal({
        heading: message.get('dataClearAllHeading'),
        content: node('div', [
          node(`p:${message.get('dataClearAllContentPara1')}`),
          node(`p:${message.get('dataClearAllContentPara2')}`)
        ]),
        successText: message.get('dataClearAllSuccessText'),
        cancelText: message.get('dataClearAllCancelText'),
        width: 'small',
        successAction: () => {
          data.wipe.all();
        }
      });

      clearModal.open();
    }
  },
  partial: {
    render: () => {
      const clearModal = new Modal({
        heading: message.get('dataClearPartialHeading'),
        content: node('div', [
          node(`p:${message.get('dataClearPartialContentPara1')}`),
          node(`p:${message.get('dataClearPartialContentPara2')}`)
        ]),
        successText: message.get('dataClearPartialSuccessText'),
        cancelText: message.get('dataClearPartialCancelText'),
        width: 35,
        successAction: () => {
          data.wipe.partial();
        }
      });

      clearModal.open();
    }
  }
};

data.feedback = {};

data.feedback.empty = {
  render: (feedback) => {
    feedback.appendChild(node(`p:${message.get('dataFeedbackEmpty') || 'Text'}|class:muted small`));
  }
};

data.feedback.clear = {
  render: (feedback) => {
    clearChildNode(feedback);
  }
};

data.feedback.success = {
  render: (feedback, filename, action) => {
    feedback.appendChild(node(`p:${message.get('dataFeedbackSuccess')}|class:muted small`));
    feedback.appendChild(node('p:' + filename));
    if (action) {
      data.feedback.animation.set.render(feedback, 'is-pop', action);
    }
  }
};

data.feedback.fail = {
  notJson: {
    render: (feedback, filename) => {
      feedback.appendChild(node(`p:${message.get('dataFeedbackFailNotJson')}|class:small muted`));
      feedback.appendChild(complexNode({ tag: 'p', text: filename }));
      data.feedback.animation.set.render(feedback, 'is-shake');
    }
  },
  notAppJson: {
    render: (feedback, filename) => {
      feedback.appendChild(node(`p:${message.get('dataFeedbackFailNotAppJson')}|class:small muted`));
      feedback.appendChild(complexNode({ tag: 'p', text: filename }));
      data.feedback.animation.set.render(feedback, 'is-shake');
    }
  },
  notClipboardJson: {
    render: (feedback, name) => {
      feedback.appendChild(node(`p:${message.get('dataFeedbackFailNotClipboardJson')}|class:small muted`));
      feedback.appendChild(node('p:' + name));
      data.feedback.animation.set.render(feedback, 'is-shake');
    }
  }
};

data.feedback.animation = {
  set: {
    render: (feedback, animationClass, action) => {
      feedback.classList.add(animationClass);

      const animationEndAction = () => {
        if (action) {
          action();
        }
        data.feedback.animation.reset.render(feedback);
      };

      feedback.addEventListener('animationend', animationEndAction);
    }
  },
  reset: {
    render: (feedback) => {
      feedback.classList.remove('is-shake');
      feedback.classList.remove('is-pop');
      feedback.classList.remove('is-jello');
      feedback.removeEventListener('animationend', data.feedback.animation.reset.render);
    }
  }
};

// Stellen Sie sicher, dass data.init() nur auf aufgelöste Daten zugreift
data.init = async () => {
    const initialData = await data.load();
    if (initialData) {
        console.log("Verwende initiale Daten zur Wiederherstellung:", initialData);
        data.restore(initialData);
    } else {
        console.warn("Keine gültigen Einstellungen gefunden, verwende Standardwerte.");
        state.set.default();
    }
};

export { data };
