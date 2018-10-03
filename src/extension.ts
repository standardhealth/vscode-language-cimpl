/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	commands, window, workspace, Selection, TextEditorEdit, ExtensionContext
} from 'vscode';

import { importFromFilePath } from './parser';

export function activate(context: ExtensionContext) {

	context.subscriptions.push(commands.registerCommand('extension.parseFolders', () => {
		let parsedFiles: any = {};
		const regexp = /file:\/\/(.+)/;
		workspace.workspaceFolders.forEach((folder) => {
			const folderPath = regexp.exec(folder.uri.toString())[1];
			const parsedFolder = importFromFilePath(folderPath);
			parsedFiles = Object.assign(parsedFolder, parsedFiles);
		});
	}));
}
