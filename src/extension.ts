/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	languages,
	workspace,
	CompletionItem,
	CompletionItemProvider,
	CompletionList,
	DefinitionProvider,
	DocumentFilter,
	ExtensionContext,
	Hover,
	HoverProvider,
	Location,
	Position,
	Range,
	TextDocument,
	Uri
} from 'vscode';

import { importFromFilePath } from './parser';

const CIMPL_MODE: DocumentFilter = { language: 'cimpl', scheme: 'file' };

export function activate(context: ExtensionContext) {

	context.subscriptions.push(languages.registerDefinitionProvider(CIMPL_MODE, new CimplDefinitionProvider()));
	context.subscriptions.push(languages.registerCompletionItemProvider(CIMPL_MODE, new CimplCompletionItemProvider(), "."));
	context.subscriptions.push(languages.registerHoverProvider(CIMPL_MODE, new CimplHoverProvider()));

}

class CimplDefinitionProvider implements DefinitionProvider {

	public provideDefinition(document: TextDocument, position: Position): Thenable<Location> {

		return new Promise((resolve, reject) => {
			try {
				const version: string = getVersion(document);
				const location: Location = getDefinitionLocation(document, position, version);
				resolve(location);
			} catch (e) {
				reject(e);
			}
		});

	}

}

class CimplCompletionItemProvider implements CompletionItemProvider {

	public provideCompletionItems(document: TextDocument, position: Position): Thenable<CompletionList> {

		return new Promise((resolve, reject) => {
			try {
				const version: string = getVersion(document);
				const completionList: CompletionList = getCompletionList(document, position, version);
				resolve(completionList);
			} catch(e) {
				reject(e);
			}
		});

	}

}

class CimplHoverProvider implements HoverProvider {

	public provideHover(document: TextDocument, position: Position): Thenable<Hover> {
		return new Promise((resolve, reject) => {
			try {
				const version: string = getVersion(document);
				const hover: Hover = getHover(document, position, version);
				resolve(hover);
			} catch(e) {
				reject(e);
			}
		});
	}
}

const getDefinitionLocation = (document: TextDocument, position: Position, version: string) => {

	if (!(workspace && workspace.workspaceFolders)) {
		return;
	}

	if (version === '6.0') {
		return getDefinitionLocationCimpl6(document, position);
	} else if (version === '5.0') {
		return getDefinitionLocationCimpl5(document, position);
	}

	return;

}

const getDefinitionLocationCimpl5 = (document: TextDocument, position: Position) => {

	const wordRange: Range = document.getWordRangeAtPosition(position);
	const word: string = wordRange ? document.getText(wordRange) : '';

	const parsedFiles = getParsedFiles(workspace, '5.0');

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

			if (simpleName && (simpleName.start.text === word)) {
				lineNumber = simpleName.start.line;
				return new Location(Uri.file(fileName), new Position(lineNumber - 1, 0));
			}
		};
	}

	return;

}

const getDefinitionLocationCimpl6 = (document: TextDocument, position: Position) => {

	const wordRange: Range = document.getWordRangeAtPosition(position);
	const word: string = wordRange ? document.getText(wordRange) : '';

	const parsedFiles = getParsedFiles(workspace, '6.0');

	for (const fileName in parsedFiles) {
		let lineNumber: number;
		
		const dataDefs = parsedFiles[fileName].dataDefs();
		if (!dataDefs.dataDef() || (dataDefs.dataDef().length <= 0)) {
			continue;
		}

		for (const dataDef of dataDefs.dataDef()) {
			const def = dataDef.elementDef() || dataDef.entryDef() || dataDef.groupDef() || dataDef.abstractDef();
			let header;
			if (def.elementHeader) {
				header = def.elementHeader();
			} else if (def.entryHeader) {
				header = def.entryHeader();
			} else if (def.groupHeader) {
				header = def.groupHeader();
			} else {
				header = def.abstractHeader();
			};
			const simpleName = header.simpleName();

			if (simpleName && (simpleName.start.text === word)) {
				lineNumber = simpleName.start.line;
				return new Location(Uri.file(fileName), new Position(lineNumber - 1, 0));
			}
		};
	}

	return;

}

const getCompletionList = (document: TextDocument, position: Position, version: string) => {

	if (!(workspace && workspace.workspaceFolders)) {
		return;
	}

	if (version !== '6.0' && version !== '5.0') {
		return;
	}

	const currentWordRange: Range = document.getWordRangeAtPosition(position);
	let previousWordRange: Range;
	if (currentWordRange) {
		previousWordRange = document.getWordRangeAtPosition(currentWordRange.start.translate(0, -2));
	} else {
		previousWordRange = document.getWordRangeAtPosition(position.translate(0, -1));
	}
	const word: string = document.getText(previousWordRange);

	const parsedFiles = getParsedFiles(workspace, version);

	let attributes = {};
	if (version === '6.0') {
		findInheritedAttributesCimpl6(attributes, word, parsedFiles);
	} else if (version === '5.0') {
		findInheritedAttributesCimpl5(attributes, word, parsedFiles);
	}

	const completionItems: CompletionItem[] = Object.keys(attributes).map((a) => {
		return new CompletionItem(a);
	});

	return new CompletionList(completionItems, false);

}

const getHover = (document: TextDocument, position: Position, version: string) => {

	if (!(workspace && workspace.workspaceFolders)) {
		return;
	}

	if (version !== '6.0' && version !== '5.0') {
		return;
	}

	const currentWordRange: Range = document.getWordRangeAtPosition(position);
	const word: string = document.getText(currentWordRange);

	const parsedFiles = getParsedFiles(workspace, version);

	let attributes = {};
	if (version === '6.0') {
		findInheritedAttributesCimpl6(attributes, word, parsedFiles);
	} else if (version === '5.0') {
		findInheritedAttributesCimpl5(attributes, word, parsedFiles);
	}

	const hoverText: string[] = Object.keys(attributes).map((a) => {
		return `${attributes[a]} ${a}`;
	});

	return new Hover(hoverText);

}

const findInheritedAttributesCimpl6 = (attributes, name, files) => {

	for (const fileName in files) {
		const dataDefs = files[fileName].dataDefs();
		if (!dataDefs.dataDef() || (dataDefs.dataDef().length <= 0)) {
			continue;
		}

		for (const dataDef of dataDefs.dataDef()) {
			const def = dataDef.elementDef() || dataDef.entryDef() || dataDef.groupDef() || dataDef.abstractDef();
			let header;
			if (def.elementHeader) {
				header = def.elementHeader();
			} else if (def.entryHeader) {
				header = def.entryHeader();
			} else if (def.groupHeader) {
				header = def.groupHeader();
			} else {
				header = def.abstractHeader();
			};
			const simpleName = header.simpleName();

			if (simpleName && (simpleName.start.text === name)) {
				const fields = def.values ? def.values().field() : def.field();

				for (const field of fields) {
					let propertyField;
					if (field.propertyField) {
						propertyField = field.propertyField();
					}

					let simpleOrFQName;
					let count;
					let withConstraint;
					if (!propertyField && field.elementWithConstraint) {
						withConstraint = field.elementWithConstraint();
						if (withConstraint && withConstraint.simpleOrFQName) {
							simpleOrFQName = withConstraint.simpleOrFQName();
						}

						if (withConstraint && withConstraint.elementPath && !simpleOrFQName) {
							simpleOrFQName = withConstraint.elementPath();
						}

						if (withConstraint && !simpleOrFQName) {
							simpleOrFQName = withConstraint.elementBracketPath().elementBracketPathFirstPart().simpleOrFQName();
						}

						if (withConstraint && withConstraint.count) {
							count = withConstraint.count();
						}
					}

					let propertyFieldType;
					if ((!simpleOrFQName) && propertyField) {
						propertyFieldType = propertyField.propertyFieldType();
					}

					if ((!count) && propertyField) {
						count = propertyField.count();
					}

					if (propertyFieldType) {
						if (propertyFieldType.simpleOrFQName) {
							simpleOrFQName = propertyFieldType.simpleOrFQName();
						}
	
						if (!simpleOrFQName) {
							let ref;
							if (propertyFieldType.ref) {
								ref = propertyFieldType.ref();
							}
							if (ref && ref.simpleOrFQName) {
								simpleOrFQName = ref.simpleOrFQName();
							}
						}
	
						if (!simpleOrFQName) {
							withConstraint = propertyFieldType.elementWithConstraint();
							if (withConstraint && withConstraint.simpleOrFQName) {
								simpleOrFQName = withConstraint.simpleOrFQName();
							}
	
							if (withConstraint && withConstraint.elementPath && !simpleOrFQName) {
								simpleOrFQName = withConstraint.elementPath();
							}

							if (withConstraint && !simpleOrFQName) {
								simpleOrFQName = withConstraint.elementBracketPath().elementBracketPathFirstPart().simpleOrFQName();
							}
						}
					}

					if (!simpleOrFQName) {
						console.log();
					}
					const attributeName = Array.isArray(simpleOrFQName.simpleName())
					? simpleOrFQName.simpleName()[simpleOrFQName.simpleName().length - 1]
					: simpleOrFQName.simpleName();
											
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
					const parent = prop.parentProp();
					if (parent) {
						parentName = parent.simpleOrFQName().simpleName().start.text;
						break;
					}
				}
				
				if (parentName) {
					findInheritedAttributesCimpl6(attributes, parentName, files);
				}

				break;
			}
		};
	}

}

const findInheritedAttributesCimpl5 = (attributes, name, files) => {

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
					findInheritedAttributesCimpl5(attributes, parentName, files);
				}

				break;
			}
		};
	}

}

const getParsedFiles = (workspace, version: string) => {

	let parsedFiles = {};

	workspace.workspaceFolders.forEach((folder) => {
		const folderPath = folder.uri.fsPath;
		const parsedFolder = importFromFilePath(folderPath, version);
		parsedFiles = Object.assign(parsedFolder, parsedFiles);
	});

	return parsedFiles;

}

const getVersion = (document: TextDocument) => {

	const re: RegExp = /^\s*Grammar:\s+([^\s]+)\s+([^\s]+)/;
	
	for (let i = 0; i < document.lineCount; i++) {
		const line = document.lineAt(i);
		const match = line.text.match(re);
		if (match != null && match.length >= 3) {
			return match[2];
		}
	}

	return;
	
}