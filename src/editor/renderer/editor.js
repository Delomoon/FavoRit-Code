import { editor, editorRedo, editorUndo } from "../code.js";

const { ipcRenderer } = require("electron");
const fs = require('fs').promises;
const path = require('path'); 
const ipc = ipcRenderer;

let openedFile = '';
let openedFiles = new Map(); // Сохраняем открытые файлы
let currentFile = null; // Текущий файл

// Функция для добавления вкладки
function addTab(filePath, content) {
    const fileName = path.basename(filePath);
    
    // Сохраняем файл в Map
    openedFiles.set(filePath, content);
    
    const tabMenu = document.querySelector('#tabMenu');
    
    // Проверяем, есть ли уже такая вкладка
    const existingTab = tabMenu.querySelector(`button[data-filepath="${filePath}"]`);
    if (existingTab) {
        existingTab.click();
        return;
    }
    
    const tabButton = document.createElement('button');
    tabButton.textContent = fileName;
    tabButton.setAttribute('data-filepath', filePath);
    tabButton.addEventListener('click', () => {
        openTab(filePath);
    });
    
    tabMenu.appendChild(tabButton);
    
    // Открываем файл
    openTab(filePath);
}

// Функция для открытия вкладки
function openTab(filePath) {
    // Сохраняем содержимое предыдущего файла перед переключением
    if (currentFile && openedFiles.has(currentFile)) {
        openedFiles.set(currentFile, editor.getValue());
    }
    
    currentFile = filePath;
    openedFile = filePath;
    
    // Обновляем визуальное состояние кнопок
    document.querySelectorAll('#tabMenu button').forEach(btn => {
        btn.style.fontWeight = btn.getAttribute('data-filepath') === filePath ? 'bold' : 'normal';
        btn.style.borderBottom = btn.getAttribute('data-filepath') === filePath ? '2px solid #a90093' : 'none';
    });
    
    // Показываем содержимое файла в редакторе
    const content = openedFiles.get(filePath);
    editor.setValue(content || '');
}

// Функция для закрытия вкладки
function closeTab(filePath) {
    openedFiles.delete(filePath);
    const tabButton = document.querySelector(`#tabMenu button[data-filepath="${filePath}"]`);
    if (tabButton) {
        tabButton.remove();
    }
    
    // Если закрыли текущий файл, открываем другой
    if (currentFile === filePath) {
        const remainingTabs = document.querySelectorAll('#tabMenu button');
        if (remainingTabs.length > 0) {
            remainingTabs[0].click();
        } else {
            currentFile = null;
            openedFile = '';
            editor.setValue('');
        }
    }
}

document.querySelector("#minimize").addEventListener("click", () => {
    ipc.send("manualMinimize");
})

document.querySelector("#maximize").addEventListener("click", () => {
    ipc.send("manualMaximize");
})

document.querySelector("#close").addEventListener("click", () => {
    ipc.send("manualClose");
})

// Отслеживаем изменения в редакторе и сохраняем в Map
editor.on('change', () => {
    if (currentFile) {
        openedFiles.set(currentFile, editor.getValue());
    }
});

let DecoMenuBoolean = true;
document.querySelector('#titleBarModeChange').addEventListener('click', function (e) {
    var decoMenu = document.querySelector('#decoMode')
    var fsMenu = document.querySelector('#fsMode')
    var changerBtn = document.querySelector('#titleBarModeChange')
    if (DecoMenuBoolean) {
        decoMenu.style.display = 'none'
        fsMenu.style.display = 'flex'
        changerBtn.innerHTML = '<i class="fa-solid fa-backward"></i>'
    } else {
        fsMenu.style.display = 'none'
        decoMenu.style.display = 'flex'
        changerBtn.innerHTML = '<i class="fa-regular fa-folder"></i>'
    }
    DecoMenuBoolean = !DecoMenuBoolean
})

document.addEventListener('DOMContentLoaded', () => {
    const menuBtns = document.querySelectorAll('.menuBtn');

    menuBtns.forEach(btn => {
        btn.addEventListener('click', (event) => {
            const dropdown = event.target.nextElementSibling;

            document.querySelectorAll('.dropdown-content').forEach(content => {
                if (content !== dropdown) {
                    content.style.display = 'none';
                }
            });
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });
    });

    window.addEventListener('click', (event) => {
        if (!event.target.classList.contains('menuBtn')) {
            document.querySelectorAll('.dropdown-content').forEach(content => {
                content.style.display = 'none';
            });
        }
    });

    const dropdownItems = document.querySelectorAll('.dropdown-item');
    
    dropdownItems.forEach(item => {
    item.addEventListener('click', async () => {
        if (item.textContent === 'Open File') {
            const result = await ipc.invoke("openFile");
            if (result) {
                addTab(result.filePath, result.content);
            }
        } else if (item.textContent === 'Save As...') {
            const result = await ipc.invoke('saveFile');
            if (result) {
                const content = editor.getValue();
                await fs.writeFile(result, content);
                
                // Обновляем информацию о файле
                if (currentFile && openedFiles.has(currentFile)) {
                    openedFiles.delete(currentFile);
                    document.querySelector(`#tabMenu button[data-filepath="${currentFile}"]`)?.remove();
                }
                
                addTab(result, content);
            }
        } else if (item.textContent === 'Save File') {
            if (!currentFile) {
                const result = await ipc.invoke('saveFile');
                if (result) {
                    const content = editor.getValue();
                    await fs.writeFile(result, content);
                    addTab(result, content);
                }
            } else {
                const content = editor.getValue();
                await fs.writeFile(currentFile, content);
                openedFiles.set(currentFile, content);
            }
        } else if (item.textContent === 'New File') {
            currentFile = null;
            openedFile = '';
            editor.setValue('');
        } else if (item.textContent == 'Undo') {
            editorUndo();
        } else if (item.textContent == 'Redo') {
            editorRedo();
        }
    });
});
});