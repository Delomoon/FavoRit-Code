import { editor, editorRedo, editorUndo } from "../code.js";

const { ipcRenderer } = require("electron");
const fs = require('fs').promises;
const path = require('path'); 
const ipc = ipcRenderer;

let openedFile = '';
let openedFiles = new Map(); 
let currentFile = null; 

function addTab(filePath, content) {
    const fileName = path.basename(filePath);
    const fileExtension = path.extname(filePath).toLowerCase();
    
    const tabMenu = document.querySelector('#tabMenu');
    
    const existingTab = tabMenu ? Array.from(tabMenu.querySelectorAll('button')).find(btn => btn.getAttribute('data-filepath') === filePath) : null;
    console.log(existingTab)
    if (existingTab) {
        existingTab.click();
        return;
    }

    openedFiles.set(filePath, content);
    
    const tabButton = document.createElement('button');
    tabButton.setAttribute('data-filepath', filePath);
    tabButton.classList.add('tab-button'); 
    
    const img = document.createElement('img');
    img.style.marginRight = '5px';
    img.style.width = '16px'; 
    img.style.height = '16px'; 

     // region Change path for build
    switch (fileExtension) {
        case '.py':
            img.src = path.join(__dirname, 'lang-icons/python.svg');
            break;
        case '.txt':
            img.src = path.join(__dirname, 'lang-icons/document.svg');
            break;
        default:
            img.src = path.join(__dirname, 'lang-icons/other.svg');
            break;
    }

    tabButton.appendChild(img);
    tabButton.appendChild(document.createTextNode(fileName));
    // close button for the tab
    const closeBtn = document.createElement('button');

    closeBtn.classList.add('tab-close-btn');
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(filePath);
    });
    tabButton.appendChild(closeBtn);
    
    tabButton.addEventListener('click', () => {
        openTab(filePath);
    });
    
    tabMenu.appendChild(tabButton);
    
    openTab(filePath);
}

function openTab(filePath) {
    if (currentFile && openedFiles.has(currentFile)) {
        openedFiles.set(currentFile, editor.getValue());
    }
    
    currentFile = filePath;
    openedFile = filePath;
    
    document.querySelectorAll('#tabMenu button').forEach(btn => {
        btn.style.fontWeight = btn.getAttribute('data-filepath') === filePath ? 'bold' : 'normal';
        btn.style.borderBottom = btn.getAttribute('data-filepath') === filePath ? '2px solid #a90093' : 'none';
    });

    const content = openedFiles.get(filePath);
    editor.setValue(content || '');
}


function closeTab(filePath) {
    const tabMenu = document.querySelector('#tabMenu');
    const existingTab = tabMenu ? Array.from(tabMenu.querySelectorAll('button')).find(btn => btn.getAttribute('data-filepath') === filePath) : null;
    if (existingTab) {
        existingTab.remove();
        openedFiles.delete(filePath);
    } 
    
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
                    const tabMenu = document.querySelector('#tabMenu');
                    const existingTab = tabMenu ? Array.from(tabMenu.querySelectorAll('button')).find(btn => btn.getAttribute('data-filepath') === currentFile) : null;
                    if (existingTab) {
                        existingTab.remove();
                    }
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
            addTab('Untitled.txt', '');
            openTab('Untitled.txt');
        } else if (item.textContent == 'Undo') {
            editorUndo();
        } else if (item.textContent == 'Redo') {
            editorRedo();
        } else if (item.textContent == 'Close file') {
            closeTab(currentFile);
        }
    });
});
});