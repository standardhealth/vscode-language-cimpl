/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	commands, window, workspace, Selection, Position, TextEditor, ExtensionContext, TextEditorEdit
} from 'vscode';

import { importFromFilePath } from './parser';

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
		const dataDefs = files[fileName].children.find((c) => {
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

			if (simpleName && (simpleName.start.text === name)) {
				const values = def.children.find((c) => {
					return c.constructor.name === 'ValuesContext';
				});

				let fields = [];
				if (values.children) {
					fields = values.children.filter((c) => {
						return c.constructor.name === 'FieldContext';
					});
				}

				for (const field of fields) {
					const fieldType = field.children.find((c) => {
						return c.constructor.name === 'FieldTypeContext';
					});
					
					let simpleOrFQName = fieldType.children.find((c) => {
						return c.constructor.name === 'SimpleOrFQNameContext';
					});

					if (!simpleOrFQName) {
						const ref = fieldType.children.find((c) => {
							return c.constructor.name === 'RefContext';
						});

						if (ref) {
							simpleOrFQName = ref.children.find((c) => {
								return c.constructor.name === 'SimpleOrFQNameContext';
							});
						}
					}

					if (!simpleOrFQName) {
						const withConstraint = fieldType.children.find((c) => {
							return c.constructor.name === 'ElementWithConstraintContext'
							|| c.constructor.name === 'EntryWithConstraintContext';
						});

						if (withConstraint) {
							simpleOrFQName = withConstraint.children.find((c) => {
								return c.constructor.name === 'SimpleOrFQNameContext';
							});
						}

						if (!simpleOrFQName) {
							simpleOrFQName = withConstraint.children.find((c) => {
								return c.constructor.name === 'ElementPathContext'
								|| c.constructor.name === 'EntryPathContext';
							});
						}
					}

					const attributeName = simpleOrFQName.children.find((c) => {
						return c.constructor.name === 'SimpleNameContext';
					});

					const count = field.children.find((c) => {
						return c.constructor.name === 'CountContext';
					});

					if (attributeName && attributeName.start.text && count && count.start.text && count.stop.text) {
						if (!attributes[attributeName.start.text]) {
							attributes[attributeName.start.text] = `${count.start.text}..${count.stop.text}`;
						}
					}
				}

				const props = def.children.find((c) => {
					return c.constructor.name === 'ElementPropsContext'
					|| c.constructor.name === 'EntryPropsContext';
				});

				const propsList = props.children.filter((c) => {
					return c.constructor.name === 'ElementPropContext'
					|| c.constructor.name === 'EntryPropContext';
				})

				let parentName: string;

				for (const prop of propsList) {
					const basedOn = prop.children.find((c) => {
						return c.constructor.name === 'BasedOnPropContext';
					});
					if (basedOn) {
						parentName = basedOn.children.find((c) => {
							return c.constructor.name === 'SimpleOrFQNameContext';
						}).children.find((c) => {
							return c.constructor.name === 'SimpleNameContext';
						}).start.text;
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
	const regexp = /file:\/\/(.+)/;
	let parsedFiles = {};

	workspace.workspaceFolders.forEach((folder) => {
		const folderPath = regexp.exec(folder.uri.toString())[1];
		const parsedFolder = importFromFilePath(folderPath);
		parsedFiles = Object.assign(parsedFolder, parsedFiles);
	});

	return parsedFiles;
}