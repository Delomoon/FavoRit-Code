export var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    lineNumbers: true,
    autocorrect: true,
    dragDrop: true,
    tabSize: 4,
    mode: "python",
    theme: "default",
    extraKeys: {
        "Ctrl-Space": "autocomplete"
    },
});

// Автокомплит при любом вводе символа (без автоматического дополнения)
editor.on('inputRead', (instance, changeObj) => {
    if (changeObj.text[0] !== ' ' && changeObj.text[0] !== '\n' && changeObj.text[0] !== '\t') {
        editor.showHint({ 
            hint: CodeMirror.hint.python,
            completeSingle: false // Не автоматически дополнять при одном совпадении
        });
    }
});

editor.on('beforeChange', (instance, change) => {
    if (change.origin === '+input' && change.text.length === 1) {
        const char = change.text[0];
        const pairs = {
            '(': ')',
            '[': ']',
            '{': '}',
            '"': '"',
            "'": "'",
            '`': '`',
            "<": ">",
        };
        
        if (pairs[char]) {
            // Проверяем, что закрывающий символ ещё не добавлен
            const nextChar = instance.getRange(change.from, {line: change.from.line, ch: change.from.ch + 1});
            if (nextChar !== pairs[char]) {
                change.text = [char + pairs[char]];
                // Смещаем курсор на один символ назад (между скобками)
                setTimeout(() => {
                    const cur = instance.getCursor();
                    instance.setCursor({line: cur.line, ch: cur.ch - 1});
                }, 0);
            }
        }
    }
});

export function editorUndo() {
    editor.undo()
}

export function editorRedo() {
    editor.redo()
}

editor.setSize("100%", "100%");