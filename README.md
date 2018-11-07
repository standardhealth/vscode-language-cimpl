# CIMPL Language Support for VS Code

A language support extension for the CIMPL language. More details about CIMPL at this
tutorial.
https://github.com/standardhealth/shr-cli/wiki/Tutorial

## Language Features

### Syntax Highlighting

This extension provides syntax highlighting for CIMPL. When editing a CIMPL file,
the syntax should be automatically highlighted.

### Go to Definition and Peek

This extension provides support for Go to Definition and Peek in CIMPL, as described
in the VS Code documentation at the links below.
https://code.visualstudio.com/docs/editor/editingevolved#_go-to-definition
https://code.visualstudio.com/docs/editor/editingevolved#_peek

### Get Inherited Attributes

This extension provides a "Get Inherited Attributes" command at
`extension.getInheritedAttributes` in the command palette. Activating this command while
selecting the name of a data element will list its inherited attributes and their
cardinalites. Selecting an attribute from this list will insert it into the current editor.

## Compile and Run

- run `npm install` in this folder. This installs all necessary npm modules in both the
client and server folder
- open VS Code on this folder.
- Press Ctrl+Shift+B to compile the extension
- Switch to the Debug viewlet
- Select `Launch Extension` from the drop down

