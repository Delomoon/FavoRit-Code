import { editor, editorRedo, editorUndo } from "../code.js";

const { ipcRenderer } = require("electron");
const fs = require('fs').promises;
const path = require('path'); 
const ipc = ipcRenderer;

let openedFile = '';

document.querySelector("#minimize").addEventListener("click", () => {
    ipc.send("manualMinimize");
})

document.querySelector("#maximize").addEventListener("click", () => {
    ipc.send("manualMaximize");
})

document.querySelector("#close").addEventListener("click", () => {
    ipc.send("manualClose");
})

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
            editor.setValue(result.content);
            openedFile = result.filePath;
        } else if (item.textContent === 'Save As...') {
            const result = await ipc.invoke('saveFile');
            fs.writeFile(result, editor.getValue())
            openedFile = result;
        } else if (item.textContent === 'Save File') {
            if (openedFile === '') {
                const result = await ipc.invoke('saveFile');
                fs.writeFile(result, editor.getValue())
                openedFile = result;
            } else {
                fs.writeFile(openedFile, editor.getValue())
            }
        } else if (item.textContent === 'New File') {
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