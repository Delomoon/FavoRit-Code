import { editor, editorRedo, editorUndo } from "../code.js";

const { ipcRenderer, app } = require("electron");
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
    
    const img = document.createElement('i');
    img.style.marginRight = '5px';
    img.style.width = '16px'; 
    img.style.height = '16px'; 

    switch (fileExtension) {
        case '.js':
        case '.jsx':
            img.innerHTML = '<i class="fa-brands fa-js-square" style="color: #f1e05a;"></i>';
            break;
        case '.py':
            img.innerHTML = '<i class="fa-brands fa-python" style="color: #3776ab;"></i>';
            break;
        case '.html':
        case '.htm':
            img.innerHTML = '<i class="fa-brands fa-html5" style="color: #e34c26;"></i>';
            break;
        case '.css':
            img.innerHTML = '<i class="fa-brands fa-css3-alt" style="color: #563d7c;"></i>';
            break;
        case '.json':
            img.innerHTML = '<i class="fa-code" style="color: #292929;"></i>';
            break;
        case '.md':
            img.innerHTML = '<i class="fa-regular fa-file-lines"></i>';
            break;
        case '.txt':
            img.innerHTML =  '<i class="fa-regular fa-file-lines"></i>';
            break;
        case '.svg':
        case '.png':
        case '.jpg':
        case '.jpeg':
        case '.gif':
            img.innerHTML = '<i class="fa-regular fa-image"></i>';
            break;
        default:
            img.innerHTML = '<i class="fa-regular fa-file"></i>';
    }

    const fileNameSpan = document.createElement('span');
    fileNameSpan.textContent = fileName;

    tabButton.appendChild(img);
    tabButton.appendChild(fileNameSpan);

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
    
    document.querySelectorAll('#tabMenu .tab-button').forEach(btn => {
        btn.classList.toggle('selected', btn.getAttribute('data-filepath') === filePath);
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
        const itemText = Array.from(item.childNodes).find(node => node.nodeType === 3)?.textContent?.trim() || '';
        if (itemText === 'Open File') {
            const result = await ipc.invoke("openFile");
            if (result) {
                addTab(result.filePath, result.content);
            }
        } else if (itemText === 'Save As...') {
            const result = await ipc.invoke('saveFile');
            if (result) {
                const content = editor.getValue();
                await fs.writeFile(result, content);
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
        } else if (itemText === 'Save File') {
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
        } else if (itemText === 'New File') {
            addTab('Untitled.txt', '');
            openTab('Untitled.txt');
        } else if (itemText == 'Undo') {
            editorUndo();
        } else if (itemText == 'Redo') {
            editorRedo();
        } else if (itemText == 'Close file') {
            closeTab(currentFile);
        } else if (itemText == 'Copy') {
            navigator.clipboard.writeText(editor.getSelection())
        } else if (itemText === 'Cut') {
            const selection = editor.getSelection();
            if (selection) {
                navigator.clipboard.writeText(selection);
                editor.replaceSelection('');
            }
        } else if (itemText === 'Paste') {
            navigator.clipboard.readText().then(text => {
                editor.replaceSelection(text);
            });
        } else if (itemText == 'Exit') {
            // Quit
        }
    });
});

// File Tree Functionality
let projectRoot = path.join(__dirname, '../../..');

async function readDirectory(dirPath) {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        return entries.sort((a, b) => {
            if (a.isDirectory() === b.isDirectory()) {
                return a.name.localeCompare(b.name);
            }
            return a.isDirectory() ? -1 : 1;
        });
    } catch (err) {
        console.error('Error reading directory:', err);
        return [];
    }
}

function getFileIcon(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);
    
    if (filename === 'package.json') return '<i class="fa-brands fa-npm" style="color: #cb3837;"></i>';
    if (filename === '.gitignore' || filename === '.git') return '<i class="fa-brands fa-git-alt" style="color: #f34f29;"></i>';
    if (filename === 'README.md') return '<i class="fa-regular fa-file-lines" style="color: #0366d6;"></i>';
    
    switch (ext) {
        case '.js':
        case '.jsx':
            return '<i class="fa-brands fa-js-square" style="color: #f1e05a;"></i>';
        case '.py':
            return '<i class="fa-brands fa-python" style="color: #3776ab;"></i>';
        case '.html':
        case '.htm':
            return '<i class="fa-brands fa-html5" style="color: #e34c26;"></i>';
        case '.css':
            return '<i class="fa-brands fa-css3-alt" style="color: #563d7c;"></i>';
        case '.json':
            return '<i class="fa-code" style="color: #292929;"></i>';
        case '.md':
            return '<i class="fa-regular fa-file-lines"></i>';
        case '.txt':
            return '<i class="fa-regular fa-file-lines"></i>';
        case '.svg':
        case '.png':
        case '.jpg':
        case '.jpeg':
        case '.gif':
            return '<i class="fa-regular fa-image"></i>';
        default:
            return '<i class="fa-regular fa-file"></i>';
    }
}

async function buildTreeItem(dirPath, parentElement, depth = 0) {
    const entries = await readDirectory(dirPath);
    
    if (entries.length === 0) return;

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'tree-items';

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const treeItem = document.createElement('div');
        treeItem.className = `tree-item ${entry.isDirectory() ? 'folder' : 'file'}`;

        const itemContent = document.createElement('div');
        itemContent.className = 'tree-item-content';

        if (entry.isDirectory()) {
            const dirEntries = await readDirectory(fullPath);
            
            if (dirEntries.length > 0) {
                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'tree-item-toggle';
                toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const childItems = treeItem.querySelector('.tree-items');
                    childItems.classList.toggle('open');
                    toggleBtn.innerHTML = childItems.classList.contains('open') 
                        ? '<i class="fa-solid fa-chevron-down"></i>' 
                        : '<i class="fa-solid fa-chevron-right"></i>';
                });
                itemContent.appendChild(toggleBtn);
            } else {
                const spacer = document.createElement('div');
                spacer.style.width = '20px';
                itemContent.appendChild(spacer);
            }
        } else {
            const spacer = document.createElement('div');
            spacer.style.width = '20px';
            itemContent.appendChild(spacer);
        }

        const icon = document.createElement('div');
        icon.className = 'tree-item-icon';
        icon.innerHTML = entry.isDirectory() ? '<i class="fa-solid fa-folder" style="color: #89a0b2;"></i>' : getFileIcon(fullPath);
        itemContent.appendChild(icon);

        const label = document.createElement('span');
        label.textContent = entry.name;
        itemContent.appendChild(label);

        itemContent.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            document.querySelectorAll('.tree-item-content.selected').forEach(el => {
                el.classList.remove('selected');
            });
            itemContent.classList.add('selected');

            if (entry.isDirectory()) {
                // Находим toggle кнопку и имитируем клик
                const toggleBtn = itemContent.querySelector('.tree-item-toggle');
                if (toggleBtn) {
                    const childItems = treeItem.querySelector('.tree-items');
                    if (childItems) {
                        childItems.classList.toggle('open');
                        toggleBtn.innerHTML = childItems.classList.contains('open') 
                            ? '<i class="fa-solid fa-chevron-down"></i>' 
                            : '<i class="fa-solid fa-chevron-right"></i>';
                    }
                }
            } else {
                try {
                    const content = await fs.readFile(fullPath, 'utf-8');
                    addTab(fullPath, content);
                } catch (err) {
                    console.error('Error reading file:', err);
                }
            }
        });

        treeItem.appendChild(itemContent);

        if (entry.isDirectory()) {
            const dirEntries = await readDirectory(fullPath);
            if (dirEntries.length > 0) {
                await buildTreeItem(fullPath, treeItem, depth + 1);
            }
        }

        itemsContainer.appendChild(treeItem);
    }

    parentElement.appendChild(itemsContainer);
}

async function initFileTree() {
    const fileTree = document.getElementById('fileTree');
    fileTree.innerHTML = '';
    
    const rootName = path.basename(projectRoot);
    
    const rootContainer = document.createElement('div');
    rootContainer.className = 'tree-item folder';
    
    const rootContent = document.createElement('div');
    rootContent.className = 'tree-item-content';
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'tree-item-toggle';
    toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    
    const icon = document.createElement('div');
    icon.className = 'tree-item-icon';
    icon.innerHTML = '<i class="fa-solid fa-folder" style="color: #89a0b2;"></i>';
    
    const label = document.createElement('span');
    label.textContent = rootName;
    
    rootContent.appendChild(toggleBtn);
    rootContent.appendChild(icon);
    rootContent.appendChild(label);
    
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const childItems = rootContainer.querySelector('.tree-items');
        if (childItems) {
            childItems.classList.toggle('open');
            toggleBtn.innerHTML = childItems.classList.contains('open') 
                ? '<i class="fa-solid fa-chevron-down"></i>' 
                : '<i class="fa-solid fa-chevron-right"></i>';
        }
    });
    
    rootContent.addEventListener('click', (e) => {
        e.stopPropagation();
        
        document.querySelectorAll('.tree-item-content.selected').forEach(el => {
            el.classList.remove('selected');
        });
        rootContent.classList.add('selected');
        
        const childItems = rootContainer.querySelector('.tree-items');
        if (childItems) {
            childItems.classList.toggle('open');
            toggleBtn.innerHTML = childItems.classList.contains('open') 
                ? '<i class="fa-solid fa-chevron-down"></i>' 
                : '<i class="fa-solid fa-chevron-right"></i>';
        }
    });
    
    rootContainer.appendChild(rootContent);
    fileTree.appendChild(rootContainer);
    
    await buildTreeItem(projectRoot, rootContainer);
}

// Sidebar Toggle
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarShowBtn = document.getElementById('sidebarShowBtn');
const sidebar = document.getElementById('sidebar');
const activityBar = document.getElementById('activityBar');
const openFolderBtn = document.getElementById('openFolderBtn');

const minimap = document.getElementById('minimap');
const minimapCanvas = document.getElementById('minimapCanvas');
const minimapViewport = document.getElementById('minimapViewport');
let minimapDragging = false;
let minimapDragOffset = 0;

const minimapKeywords = new Set([
    'and', 'as', 'assert', 'async', 'await', 'break', 'case', 'class', 'const', 'continue',
    'def', 'delete', 'elif', 'else', 'export', 'extends', 'finally', 'for', 'from', 'function',
    'if', 'import', 'in', 'is', 'let', 'new', 'not', 'of', 'or', 'pass', 'raise', 'return',
    'switch', 'throw', 'try', 'var', 'while', 'with', 'yield'
]);

const minimapBuiltins = new Set([
    'bool', 'dict', 'float', 'int', 'len', 'list', 'map', 'max', 'min', 'print', 'range',
    'self', 'str', 'super', 'this', 'true', 'false', 'None', 'True', 'False'
]);

function getMinimapTokenColor(token, previousToken) {
    if (/^(#|\/\/)/.test(token)) return '#808080';
    if (/^["'`]/.test(token)) return '#eaa25f';
    if (/^\d/.test(token)) return '#658bc4';
    if (minimapKeywords.has(token)) return '#ea5f5f';
    if (minimapBuiltins.has(token)) return '#02afff';
    if (previousToken === 'def' || previousToken === 'class' || previousToken === 'function') return '#02afff';
    return '#9aa8b8';
}

function drawMinimap() {
    if (!minimap || !minimapCanvas) return;

    const width = minimap.clientWidth;
    const height = minimap.clientHeight;
    const devicePixelRatio = window.devicePixelRatio || 1;
    minimapCanvas.width = width * devicePixelRatio;
    minimapCanvas.height = height * devicePixelRatio;

    const context = minimapCanvas.getContext('2d');
    context.scale(devicePixelRatio, devicePixelRatio);
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#1a1a1a';
    context.fillRect(0, 0, width, height);

    const lineCount = Math.max(editor.lineCount(), 1);
    const lineHeight = Math.max(2, Math.min(4, height / lineCount));
    const maxLineLength = Math.max(1, ...Array.from({ length: editor.lineCount() }, (_, index) => editor.getLine(index).length));
    const horizontalScale = (width - 12) / maxLineLength;

    for (let lineNumber = 0; lineNumber < editor.lineCount(); lineNumber++) {
        const line = editor.getLine(lineNumber);
        if (!line) continue;

        const tokenPattern = /#[^\n]*|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|[A-Za-z_$][\w$]*/g;
        let match;
        let previousToken = '';

        while ((match = tokenPattern.exec(line)) !== null) {
            const token = match[0];
            context.fillStyle = getMinimapTokenColor(token, previousToken);
            context.fillRect(
                6 + match.index * horizontalScale,
                lineNumber * lineHeight + 1,
                Math.max(1, token.length * horizontalScale),
                Math.max(1, lineHeight - 1)
            );
            previousToken = token;
        }
    }

    updateMinimapViewport();
}

function updateMinimapViewport() {
    if (!minimap || !minimapViewport) return;

    const scrollInfo = editor.getScrollInfo();
    const lineCount = Math.max(editor.lineCount(), 1);
    const visibleLines = Math.max(1, Math.ceil(scrollInfo.clientHeight / editor.defaultTextHeight()));
    const lineHeight = minimap.clientHeight / lineCount;
    const viewportHeight = Math.min(minimap.clientHeight, Math.max(18, visibleLines * lineHeight));
    const maxScrollTop = Math.max(1, scrollInfo.height - scrollInfo.clientHeight);
    const maxViewportTop = Math.max(0, minimap.clientHeight - viewportHeight);
    const viewportTop = Math.min(maxViewportTop, (scrollInfo.top / maxScrollTop) * maxViewportTop);

    minimapViewport.style.height = `${viewportHeight}px`;
    minimapViewport.style.top = `${viewportTop}px`;
}

function scrollFromMinimap(clientY) {
    const bounds = minimap.getBoundingClientRect();
    const scrollInfo = editor.getScrollInfo();
    const lineCount = Math.max(editor.lineCount(), 1);
    const visibleLines = Math.max(1, Math.ceil(scrollInfo.clientHeight / editor.defaultTextHeight()));
    const viewportHeight = Math.min(bounds.height, Math.max(18, visibleLines * bounds.height / lineCount));
    const maxViewportTop = Math.max(0, bounds.height - viewportHeight);
    const targetTop = Math.max(0, Math.min(maxViewportTop, clientY - bounds.top - minimapDragOffset));
    const maxScrollTop = Math.max(0, scrollInfo.height - scrollInfo.clientHeight);
    editor.scrollTo(null, maxViewportTop ? (targetTop / maxViewportTop) * maxScrollTop : 0);
}

if (minimap) {
    minimap.addEventListener('mousedown', (event) => {
        minimapDragging = true;
        const viewportBounds = minimapViewport.getBoundingClientRect();
        minimapDragOffset = event.target === minimapViewport ? event.clientY - viewportBounds.top : viewportBounds.height / 2;
        minimapViewport.classList.add('dragging');
        scrollFromMinimap(event.clientY);
        event.preventDefault();
    });

    document.addEventListener('mousemove', (event) => {
        if (minimapDragging) scrollFromMinimap(event.clientY);
    });

    document.addEventListener('mouseup', () => {
        minimapDragging = false;
        minimapViewport.classList.remove('dragging');
    });

    editor.on('scroll', updateMinimapViewport);
    editor.on('change', drawMinimap);
    window.addEventListener('resize', drawMinimap);
    setTimeout(drawMinimap, 0);
}

function setSidebarVisibility(isVisible) {
    sidebar.classList.toggle('hidden', !isVisible);
    activityBar.classList.toggle('sidebar-open', isVisible);
    sidebarShowBtn.title = isVisible ? 'Close Explorer' : 'Open Explorer';
    sidebarShowBtn.setAttribute('aria-label', isVisible ? 'Close Explorer' : 'Open Explorer');
}

if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
        const isVisible = sidebar.classList.contains('hidden');
        setSidebarVisibility(isVisible);
        const icon = sidebarToggle.querySelector('i');
        if (!isVisible) {
            icon.className = 'fa-solid fa-chevron-right';
            sidebarShowBtn.classList.add('visible');
        } else {
            icon.className = 'fa-solid fa-chevron-left';
            sidebarShowBtn.classList.remove('visible');
        }
    });
}

if (sidebarShowBtn) {
    sidebarShowBtn.addEventListener('click', () => {
        const isVisible = !sidebar.classList.contains('hidden');
        setSidebarVisibility(!isVisible);
        const icon = sidebarToggle.querySelector('i');
        icon.className = `fa-solid fa-chevron-${isVisible ? 'right' : 'left'}`;
        sidebarShowBtn.classList.toggle('visible', isVisible);
    });
}

if (openFolderBtn) {
    openFolderBtn.addEventListener('click', async () => {
        const result = await ipc.invoke('selectFolder');
        if (result) {
            projectRoot = result;
            await initFileTree();
        }
    });
}

// Sidebar Resizer
const sidebarResizer = document.getElementById('sidebarResizer');

if (sidebarResizer && sidebar) {
    // Restore saved width
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
        sidebar.style.width = savedWidth;
    }
    
    let isResizing = false;
    
    sidebarResizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.addEventListener('mousemove', resizeSidebar);
        document.addEventListener('mouseup', stopResize);
    });
    
    function resizeSidebar(e) {
        if (!isResizing) return;
        
        const newWidth = e.clientX;
        const minWidth = 150;
        const maxWidth = window.innerWidth * 0.5;
        
        if (newWidth >= minWidth && newWidth <= maxWidth) {
            sidebar.style.width = newWidth + 'px';
            localStorage.setItem('sidebarWidth', newWidth + 'px');
        }
    }
    
    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', resizeSidebar);
        document.removeEventListener('mouseup', stopResize);
    }
}

// Initialize file tree on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initFileTree().catch(err => console.error('Error initializing file tree:', err));
});
});