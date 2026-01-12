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

export function editorUndo() {
    editor.undo()
}

export function editorRedo() {
    editor.redo()
}

editor.setSize("100%", "100%");