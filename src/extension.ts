/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	commands, window, workspace, Selection, Position, TextEditor, ExtensionContext, TextEditorEdit
} from 'vscode';

import { importFromFilePath } from './parser';
import { Socket } from 'net';

export function activate(context: ExtensionContext) {

	context.subscriptions.push(commands.registerCommand('extension.goToDefinition', () => {
		const editor: TextEditor = window.activeTextEditor;
		if (!editor) {
			window.showErrorMessage("No active editor.");
			return;
		}

		const selectedText: string = getSelectedText(editor);
		if (!selectedText) {
			window.showErrorMessage('No text selected.');
			return;
		}

		if (!(workspace && workspace.workspaceFolders)) {
			window.showErrorMessage("No files in workspace.");
			return;
		}

		const parsedFiles = getParsedFiles(workspace);

		let definitionFound: boolean = false;

		for (const fileName in parsedFiles) {
			let lineNumber: number;
			
			const dataDefs = parsedFiles[fileName].dataDefs();
			if (!dataDefs.dataDef() || (dataDefs.dataDef().length <= 0)) {
				continue;
			}

			for (const dataDef of dataDefs.dataDef()) {
				const def = dataDef.elementDef() || dataDef.entryDef();
				const header = def.elementHeader ? def.elementHeader() : def.entryHeader();
				const simpleName = header.simpleName();

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

	context.subscriptions.push(commands.registerCommand('extension.getInheritedAttributes', async () => {		
		const editor: TextEditor = window.activeTextEditor;
		if (!editor) {
			window.showErrorMessage("No active editor.");
			return;
		}

		const selectedText: string = getSelectedText(editor);
		if (!selectedText) {
			window.showErrorMessage('No text selected.');
			return;
		}

		if (!(workspace && workspace.workspaceFolders)) {
			window.showErrorMessage("No files in workspace.");
			return;
		}

		const parsedFiles = getParsedFiles(workspace);

		let attributes = {};
		getInheritedAttributes(attributes, selectedText, parsedFiles);

		if (Object.keys(attributes).length <= 0) {
			window.showInformationMessage("No inherited attributes.");
			return;
		}

		const attribute = await window.showQuickPick(Object.keys(attributes).map((a) => {
			return {
				label: a,
				detail: attributes[a]
			};
		}));

		if (attribute) {
			const wordEndPosition: Position = getWordEndPosition(editor);

			await editor.edit((editBuilder : TextEditorEdit) => {
				editBuilder.insert(wordEndPosition, `.${attribute.label}`);
			});

			const endOfLinePosition: Position = editor.document.lineAt(wordEndPosition).range.end;
			editor.selection = new Selection(endOfLinePosition, endOfLinePosition);
		}
	}));
}

const getInheritedAttributes = (attributes, name, files) => {
	for (const fileName in files) {			
		const dataDefs = files[fileName].dataDefs();
		if (!dataDefs.dataDef() || (dataDefs.dataDef().length <= 0)) {
			continue;
		}

		for (const dataDef of dataDefs.dataDef()) {
			const def = dataDef.elementDef() || dataDef.entryDef();
			const header = def.elementHeader ? def.elementHeader() : def.entryHeader();
			const simpleName = header.simpleName();

			if (simpleName && (simpleName.start.text === name)) {
				const values = def.values();
				const fields = values.field();

				for (const field of fields) {
					const fieldType = field.fieldType()[0];
					
					let simpleOrFQName;
					if (fieldType.simpleOrFQName) {
						simpleOrFQName = fieldType.simpleOrFQName();
					}

					if (!simpleOrFQName) {
						let ref;
						if (fieldType.ref) {
							ref = fieldType.ref();
						}
						if (ref && ref.simpleOrFQName) {
							simpleOrFQName = ref.simpleOrFQName();
						}
					}

					if (!simpleOrFQName) {
						const withConstraint = fieldType.elementWithConstraint() || fieldType.entryWithConstraint();
						if (withConstraint && withConstraint.simpleOrFQName) {
							simpleOrFQName = withConstraint.simpleOrFQName();
						}

						if (withConstraint && !simpleOrFQName) {
							simpleOrFQName = withConstraint.elementPath();
						}
					}

					const attributeName = Array.isArray(simpleOrFQName.simpleName())
					? simpleOrFQName.simpleName()[simpleOrFQName.simpleName().length - 1]
					: simpleOrFQName.simpleName();
					const count = field.count();
											
					if (attributeName && attributeName.start.text && count && count.start.text && count.stop.text) {
						if (!attributes[attributeName.start.text]) {
							attributes[attributeName.start.text] = `${count.start.text}..${count.stop.text}`;
						}
					}
				}

				const props = def.elementProps ? def.elementProps() : def.entryProps();
				const propsList = props.elementProp ? props.elementProp() : props.entryProp();

				let parentName: string;

				for (const prop of propsList) {
					const basedOn = prop.basedOnProp();
					if (basedOn) {
						parentName = basedOn.simpleOrFQName().simpleName().start.text;
						break;
					}
				}
				
				if (parentName) {
					getInheritedAttributes(attributes, parentName, files);
				}

				break;
			}
		};
	}
}

const getSelectedText = (editor) => {
	if (!editor.selection.isEmpty) {
		return editor.document.getText(editor.selection).trim();
	}

	return editor.document.getText(editor.document.getWordRangeAtPosition(editor.selection.active)).trim();
}

const getWordEndPosition = (editor) => {
	if (!editor.selection.isEmpty) {
		return editor.selection.end;
	}

	return editor.document.getWordRangeAtPosition(editor.selection.active).end;
}

const getParsedFiles = (workspace) => {
	let parsedFiles = {};

	workspace.workspaceFolders.forEach((folder) => {
		const folderPath = folder.uri.fsPath;
		const parsedFolder = importFromFilePath(folderPath);
		parsedFiles = Object.assign(parsedFolder, parsedFiles);
	});

	return parsedFiles;
}