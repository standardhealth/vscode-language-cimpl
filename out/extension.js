/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var vscode_1 = require("vscode");
// import { importFromFilePath } from './parser';
function activate(context) {
    // context.subscriptions.push(commands.registerCommand('extension.parseFolders', () => {
    // 	let parsedFiles: any = {};
    // 	const regexp = /file:\/\/(.+)/;
    // 	workspace.workspaceFolders.forEach((folder) => {
    // 		console.log(folder);
    // 		const folderPath = regexp.exec(folder.uri.toString())[1];
    // 		const parsedFolder = importFromFilePath(folderPath);
    // 		parsedFiles = Object.assign(parsedFolder, parsedFiles);
    // 		console.log(parsedFiles);
    // 	});
    // }));
    context.subscriptions.push(vscode_1.commands.registerCommand('extension.selectNextCharacter', function () {
        var editor = vscode_1.window.activeTextEditor;
        var position = editor.selection.active;
        var newPosition = position.with(position.line, position.character + 1);
        var newSelection = new vscode_1.Selection(position, newPosition);
        editor.selection = newSelection;
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('extension.sayHello', function () {
        var editor = vscode_1.window.activeTextEditor;
        var position = editor.selection.active;
        editor.edit(function (editBuilder) {
            editBuilder.insert(position, "Hello");
        });
    }));
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map