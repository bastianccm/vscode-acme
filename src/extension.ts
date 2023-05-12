import { exec } from "child_process";
import { homedir } from "os";
import { openStdin } from "process";
import {
  commands,
  env,
  ExtensionContext,
  Position,
  Range,
  Selection,
  TextDocument,
  TextEditor,
  window,
  workspace,
} from "vscode";

let document: TextDocument | null = null;

export function activate(context: ExtensionContext) {
  const outputChannel = window.createOutputChannel("VSCode-Acme");
  let lastEditor: TextEditor | undefined = undefined;
  let currentEditor: TextEditor | undefined = window.activeTextEditor;

  window.onDidChangeActiveTextEditor((editor) => {
    lastEditor = currentEditor;
    currentEditor = editor;
  });

  let disposable = commands.registerCommand("vscode-acme.execute", async () => {
    let s = window.activeTextEditor?.selection;
    let d = window.activeTextEditor?.document;
    let t = d?.getText(s);

    if (s?.start.isEqual(s?.end)) {
      const start =
        s!.start.character > 0
          ? d?.getText(new Range(s!.start, s!.start.translate(0, -1)))
          : undefined;
      const end = d?.getText(new Range(s!.start, s!.start.translate(0, 1)));
      if (start && (start === '"' || start === "`" || start === "'")) {
        const text = d?.lineAt(s!.start.line).text;
        let idx = s!.start.character + 1;
        while (idx < text?.length! && text?.at(idx) !== start) {
          idx++;
        }
        console.log([s!.start, idx, text?.length!, text?.at(idx)]);
        t = d?.getText(new Range(s!.start, new Position(s!.start.line, idx)));
      } else if (end && (end === '"' || end === "`" || end === "'")) {
        const text = d?.lineAt(s!.start.line).text;
        let idx = s!.start.character - 1;
        while (idx >= 0 && text?.at(idx) !== end) {
          idx--;
        }
        t = d?.getText(
          new Range(new Position(s!.start.line, idx + 1), s!.start)
        );
      } else {
        const range = d?.getWordRangeAtPosition(s?.start);
        t = d?.getText(range);
        if (range!.start.character > 0) {
          let c = d?.getText(
            new Range(range!.start.translate(0, -1), range!.start)
          );
          if (c === "<" || c === ">" || c === "|") {
            t = c + t;
          }
        }
      }
    }

    if (!t || t.length < 1) {
      return;
    }

    let input: string | undefined = undefined;
    let out = false;

    console.log(t);

    switch (t[0]) {
      case "<":
        t = t.substring(1);
        out = true;
        break;
      case ">":
        t = t.substring(1);
        input = lastEditor?.document.getText();
        if (lastEditor?.selection) {
          lastEditor?.document.getText(lastEditor.selection);
        }
        break;
      case "|":
        out = true;
        t = t.substring(1);
        input = lastEditor?.document.getText();
        if (lastEditor?.selection) {
          lastEditor?.document.getText(lastEditor.selection);
        }
        break;
      case "-":
        t = t.substring(1);
        break;
    }

    const proc = exec(
      t,
      {
        cwd:
          workspace.workspaceFolders?.[0].uri.fsPath ||
          env.appRoot ||
          homedir(),
      },
      async (err, stdout, stderr) => {
        if (stderr !== "") {
          outputChannel.show(true);
          outputChannel.appendLine(stderr);
        }

        if (err !== null) {
          console.log(err);
          outputChannel.appendLine(stderr);
          window.showInformationMessage(err.message);
          return;
        }

        let curDoc = lastEditor;
        let pos: Position | Range | Selection;

        if (out) {
          pos = new Range(
            new Position(0, 0),
            new Position(
              lastEditor!.document.lineCount - 1,
              lastEditor!.document.lineAt(
                lastEditor!.document.lineCount - 1
              ).range.end.character
            )
          );
          if (lastEditor?.selection) {
            pos = lastEditor?.selection;
          }
        } else {
          if (document === null) {
            document = await workspace.openTextDocument({
              language: "shell",
              content: "",
            });
          }
          curDoc = await window.showTextDocument(document, {
            viewColumn: 2,
            preserveFocus: true,
            preview: false,
          });
          pos = new Position(
            document.lineCount - 1,
            document.lineAt(document.lineCount - 1).range.end.character
          );
          lastEditor = curDoc;
        }
        console.log([out, pos, curDoc]);
        if (!curDoc) {
          return;
        }
        curDoc.edit((edit) => {
          edit.replace(pos, stdout);
        });
        const endpos = new Position(document?.lineCount! - 1 + stdout.split("\n").length, 0);
        curDoc.revealRange(new Range(endpos, endpos));
      }
    );
    console.log([input, proc.stdin]);
    if (input && proc.stdin) {
      proc.stdin.write(input);
      proc.stdin.end();
    }
    setTimeout(() => {
      proc.kill("SIGKILL");
    }, 10_000);
  });

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
