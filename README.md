# vscode-acme

This vscode extension adds a acme-style execution of selected text to vscode.
vscode has does not support binding to middle-mouse-button, and does not allow managing text and selections like acme, so the behaviour is a little different.

Executing a command or selected range of text is done using `Alt+Enter`. The output will open in an empty file.
To redirect input or output, select a tab group, potentially marking text, and define the command in a second text window, such as a split window.
Then use a redirection:

`<command` redirect the output of `command` to the area or cursor of the last active window.

`>command` read the input to `command` fromt the area or cursor of the last active window.

`|command` read the input to `command` fromt the area or cursor of the last active window, then replace that with the output of `command`

vscode-acme takes `'`, `"` and ``` ` ``` into account when the selection cursor is placed right at on of the quotes.

## Installation

Run `vsce package` to create a new packaged file.
