/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	commands, window, workspace, Selection, TextEditor, ExtensionContext
} from 'vscode';

import { importFromFilePath } from './parser';

export function activate(context: ExtensionContext) {

	context.subscriptions.push(commands.registerCommand('extension.goToDefinition', () => {
		let parsedFiles: any = {};
		const regexp = /file:\/\/(.+)/;
		
		let editor: TextEditor = window.activeTextEditor;

		if (!editor) {
			window.showErrorMessage("No active editor.");
			return;
		}

		if (!(workspace && workspace.workspaceFolders)) {
			window.showErrorMessage("No files in workspace.");
			return;
		}

		const selection: Selection = editor.selection;
		let selectedText: string;

		if (!selection.isEmpty) {
			selectedText = editor.document.getText(selection);
		} else {
			window.showErrorMessage("No text selected.");
			return;
		}

		workspace.workspaceFolders.forEach((folder) => {
			const folderPath = regexp.exec(folder.uri.toString())[1];
			const parsedFolder = importFromFilePath(folderPath);
			parsedFiles = Object.assign(parsedFolder, parsedFiles);
		});

		let definitionFound: boolean = false;

		for (const fileName in parsedFiles) {
			let lineNumber: number;
			
			const dataDefs = parsedFiles[fileName].children.find((c) => {
				return c.constructor.name === 'DataDefsContext';
			});

			if (!dataDefs.children || (dataDefs.children.length <= 0)) {
				continue;
			}

			for (const dataDef of dataDefs.children) {
				const def = dataDef.children.find((c) => {
					return c.constructor.name === 'ElementDefContext'
					|| c.constructor.name === 'EntryDefContext';
				});

				const header = def.children.find((c) => {
					return c.constructor.name === 'ElementHeaderContext'
					|| c.constructor.name === 'EntryHeaderContext';
				});

				const simpleName = header.children.find((c) => {
					return c.constructor.name === 'SimpleNameContext';
				});

				if (simpleName && (simpleName.start.text === selectedText)) {
					lineNumber = simpleName.start.line;
					break;
				}
			};

			if (lineNumber != null) {
				workspace.openTextDocument(fileName).then((doc) => {
					window.showTextDocument(doc).then((e) => {
						const range = e.document.lineAt(lineNumber - 1).range;
						e.selection = new Selection(range.start, range.end);
						e.revealRange(range);
					});
				});

				definitionFound = true;
				break;
			}
		}

		if (!definitionFound) {
			window.showInformationMessage("Definition not found in workspace.");
		}
	}));

	context.subscriptions.push(commands.registerCommand('extension.getInheritedAttributes', () => {
		let parsedFiles: any = {};
		const regexp = /file:\/\/(.+)/;
		
		let editor: TextEditor = window.activeTextEditor;

		if (!editor) {
			window.showErrorMessage("No active editor.");
			return;
		}

		if (!(workspace && workspace.workspaceFolders)) {
			window.showErrorMessage("No files in workspace.");
			return;
		}

		const selection: Selection = editor.selection;
		let selectedText: string;

		if (!selection.isEmpty) {
			selectedText = editor.document.getText(selection);
		} else {
			window.showErrorMessage("No text selected.");
			return;
		}

		workspace.workspaceFolders.forEach((folder) => {
			const folderPath = regexp.exec(folder.uri.toString())[1];
			const parsedFolder = importFromFilePath(folderPath);
			parsedFiles = Object.assign(parsedFolder, parsedFiles);
		});

		for (const fileName in parsedFiles) {			
			const dataDefs = parsedFiles[fileName].children.find((c) => {
				return c.constructor.name === 'DataDefsContext';
			});

			if (!dataDefs.children || (dataDefs.children.length <= 0)) {
				continue;
			}

			for (const dataDef of dataDefs.children) {
				const def = dataDef.children.find((c) => {
					return c.constructor.name === 'ElementDefContext'
					|| c.constructor.name === 'EntryDefContext';
				});

				const header = def.children.find((c) => {
					return c.constructor.name === 'ElementHeaderContext'
					|| c.constructor.name === 'EntryHeaderContext';
				});

				const simpleName = header.children.find((c) => {
					return c.constructor.name === 'SimpleNameContext';
				});

				if (simpleName && (simpleName.start.text === selectedText)) {
					const values = def.children.find((c) => {
						return c.constructor.name === 'ValuesContext';
					});

					const fields = values.children.filter((c) => {
						return c.constructor.name === 'FieldContext';
					});

					let attributes = {};

					for (const field of fields) {
						const fieldType = field.children.find((c) => {
							return c.constructor.name === 'FieldTypeContext';
						});

						const simpleOrFQName = fieldType.children.find((c) => {
							return c.constructor.name === 'SimpleOrFQNameContext';
						});

						const attributeName = simpleOrFQName.children.find((c) => {
							return c.constructor.name === 'SimpleNameContext';
						});

						const count = field.children.find((c) => {
							return c.constructor.name === 'CountContext';
						});

						if (attributeName && attributeName.start.text && count && count.start.text && count.stop.text) {
							attributes[attributeName.start.text] = `${count.start.text}..${count.stop.text}`;
						}
					}
					
					window.showQuickPick(Object.keys(attributes));
					break;
				}
			};
		}
	}));
}
