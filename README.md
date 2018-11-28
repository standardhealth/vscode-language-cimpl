# CIMPL Language Support for VS Code

A language support extension for the CIMPL language. More details about CIMPL at this
tutorial.
https://github.com/standardhealth/shr-cli/wiki/Tutorial

## How to Download

In Visual Studio Code, go to the VS Code Extension Marketplace and download the
`vscode-language-cimpl` extension. Once activated, this extension's features should
be automatically implemented.

## Language Features

### Syntax Highlighting

This extension provides syntax highlighting for CIMPL. When editing a CIMPL file,
the syntax should be automatically highlighted.

### Go to Definition and Peek

This extension provides support for Go to Definition and Peek in CIMPL, as described
in the VS Code documentation at the links below.
https://code.visualstudio.com/docs/editor/editingevolved#_go-to-definition
https://code.visualstudio.com/docs/editor/editingevolved#_peek

### Code Completion Suggestions

When editing CIMPL, the extension will provide suggestions for inherited attributes of elements while typing, automatically.

### Hover Provider

When hovering over a CIMPL element, a hover provider will display all inherited attributes
of that element, and their constraints.

## Compile and Run (for Developers)

- run `npm install` in this folder. This installs all necessary npm modules in both the
client and server folder
- open VS Code on this folder.
- Press Ctrl+Shift+B to compile the extension
- Switch to the Debug viewlet
- Select `Launch Extension` from the drop down

