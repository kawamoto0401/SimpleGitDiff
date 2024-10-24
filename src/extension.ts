// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { promises } from 'dns';
import path from 'path';
import SimpleGit  from 'simple-git';
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "simplegitdiff" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('simplegitdiff.helloWorld', async() => {

		const editor = vscode.window.activeTextEditor;

		if( editor ) {

			
			function splitFilePath(filePath: string): { dir: string, base: string } {
				const dir = path.dirname(filePath);
				const base = path.basename(filePath);
				return {dir, base};
			}

			// 現在のエディタのファイルパスを取得して、ディレクトリとファイルに分離する
			const filePath = editor.document.uri.fsPath;
			const result = splitFilePath(filePath);

			// コミット番号を取得する
			const commitId = await vscode.window.showInputBox({title: 'Commit No?'});
			if( commitId !== undefined ) {
				getSimpleGitDiff(result.dir, result.base, commitId);
			}else {
				getSimpleGitDiff(result.dir, result.base, "");
			}
		}
		else {
			vscode.window.showInformationMessage('activeTextEditor null');
		}
	});

	context.subscriptions.push(disposable);
}


async function getSimpleGitDiff(dir: string, fileName: string, commandId: string): Promise<void> {

	const git = SimpleGit(dir);

	try {

		let logVersion = await git.version();
		if(!logVersion.installed) {
			vscode.window.showInformationMessage('git no install');
			return;
		}

		let logLog;
		if( commandId.length === 0) {
			logLog = await git.log([fileName]);
			if( logLog.all.length === 0 ) {
				vscode.window.showInformationMessage('non log');
				return;
			}
		}
		else {
			logLog = await git.log([fileName, commandId]);
			if( logLog.all.length === 0 ) {
				vscode.window.showInformationMessage('non find');
				return;
			}
		}

		let logDiff;
		if( commandId.length === 0) {
			logDiff = await git.diff([fileName]);
		}
		else {
			logDiff = await git.diff([fileName, commandId]);
		}

		if( logDiff.length === 0 ) {
			vscode.window.showInformationMessage('non diff');
			return;
		}

		const regex = /@@(.*?)@@/g;
		let matches = logDiff.match(regex);
		
		vscode.window.showInformationMessage(`Diff: ${matches}`);
	}
	catch(error) {
		console.log(error);
	}	
}

// This method is called when your extension is deactivated
export function deactivate() {}
