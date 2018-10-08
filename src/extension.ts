/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	commands, window, workspace, Selection, Position, TextEditor, TextEditorEdit, TextLine, ExtensionContext
} from 'vscode';

import { importFromFilePath } from './parser';

export function activate(context: ExtensionContext) {

	context.subscriptions.push(commands.registerCommand('extension.parseFolders', () => {
		let parsedFiles: any = {};
		const regexp = /file:\/\/(.+)/;
		
		const editor: TextEditor = window.activeTextEditor;
		const selection: Selection = editor.selection;
		const position: Position = selection.active;
		let elementName: string;
		let selectedText: string;

		for (let i: number = position.line; i >= 0; i--) {
			const currentLine: TextLine = editor.document.lineAt(i);
			if (currentLine.text.includes("Element:") && !currentLine.text.includes("//")) {
				const currentLineArray: string[] = currentLine.text.replace(/\t/g, " ").split(" ");
				elementName = currentLineArray[currentLineArray.length - 1];
				break;
			}
		}

		if (!selection.isEmpty) {
			selectedText = editor.document.getText(selection);
			window.showInformationMessage(`Selected Text: ${selectedText}`);
		} else {
			window.showErrorMessage("No text selected.");
		}

		if (elementName) {
			window.showInformationMessage(`Current Element: ${elementName}`);
		} else {
			window.showErrorMessage("Not editing Element.");
		}

		workspace.workspaceFolders.forEach((folder) => {
			const folderPath = regexp.exec(folder.uri.toString())[1];
			const parsedFolder = importFromFilePath(folderPath);
			parsedFiles = Object.assign(parsedFolder, parsedFiles);
		});

		const parsedActiveFile = parsedFiles[editor.document.fileName];
		if (parsedActiveFile) {
			window.showInformationMessage(`File ${editor.document.fileName} parsed.`);
		} else {
			window.showErrorMessage(`Could not parse file ${editor.document.fileName}.`)
		}
	}));
}
