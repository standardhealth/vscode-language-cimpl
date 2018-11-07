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
	Location,
	Position,
	Range,
	TextDocument,
	TextLine,
	Uri
} from 'vscode';

import { importFromFilePath } from './parser';

const CIMPL_MODE: DocumentFilter = { language: 'cimpl', scheme: 'file' };

export function activate(context: ExtensionContext) {

	context.subscriptions.push(languages.registerDefinitionProvider(CIMPL_MODE, new CimplDefinitionProvider()));
	context.subscriptions.push(languages.registerCompletionItemProvider(CIMPL_MODE, new CimplCompletionItemProvider()));

}

class CimplDefinitionProvider implements DefinitionProvider {

	public provideDefinition(document: TextDocument, position: Position): Thenable<Location> {

		return new Promise((resolve, reject) => {
			try {
				const location: Location = getDefinitionLocation(document, position);
				resolve(location);
			} catch(e) {
				reject(e);
			}
		});

	}

}

class CimplCompletionItemProvider implements CompletionItemProvider {

	public provideCompletionItems(document: TextDocument, position: Position): Thenable<CompletionList> {

		return new Promise((resolve, reject) => {
			try {
				const completionList: CompletionList = getCompletionList(document, position);
				resolve(completionList);
			} catch(e) {
				reject(e);
			}
		});

	}

}

const getDefinitionLocation = (document, position) => {

	if (!(workspace && workspace.workspaceFolders)) {
		return;
	}

	const wordRange: Range = document.getWordRangeAtPosition(position);
	const word: string = wordRange ? document.getText(wordRange) : '';

	const parsedFiles = getParsedFiles(workspace);

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
				return new Location(Uri.file(fileName), document.lineAt(lineNumber - 1).range);
			}
		};
	}

	return;

}

const getCompletionList = (document, position) => {

	if (!(workspace && workspace.workspaceFolders)) {
		return;
	}

	const currentWordRange: Range = document.getWordRangeAtPosition(position);
	const previousWordRange: Range = document.getWordRangeAtPosition(currentWordRange.start.translate(0, -2));
	const word: string = document.getText(previousWordRange);

	const parsedFiles = getParsedFiles(workspace);

	let attributes = {};
	findInheritedAttributes(attributes, word, parsedFiles);

	const completionItems: CompletionItem[] = Object.keys(attributes).map((a) => {
		return new CompletionItem(a);
	});

	return new CompletionList(completionItems, false);

}

const findInheritedAttributes = (attributes, name, files) => {

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
					findInheritedAttributes(attributes, parentName, files);
				}

				break;
			}
		};
	}

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