// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { promises } from 'dns';
import path from 'path';
import SimpleGit  from 'simple-git';
import * as vscode from 'vscode';
import { TextEditorDecorationType } from "vscode";
import { Util } from './util';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "simplegitdiff" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('simplegitdiff.makeSimpleGitDiff', async() => {

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

			let promiserows;

			// コミット番号を取得する
			const commitId = await vscode.window.showInputBox({title: 'Please specify the commitID'});
			if( commitId !== undefined ) {
				promiserows = makeSimpleGitDiff(result.dir, result.base, commitId);
			}else {
				promiserows = makeSimpleGitDiff(result.dir, result.base, "");
			}
			
			const rows = await promiserows; // Promise が解決されるまで待つ

			//
			let util = Util.getInstance();
			util.setRows(filePath, rows);
		}
		else {
			vscode.window.showInformationMessage('activeTextEditor null');
		}
	});

	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('simplegitdiff.makeSimpleGitDiffClear', () => {
		//
		let util = Util.getInstance();
		util.clearRows();
	});

	context.subscriptions.push(disposable);

	// 現在のTextEditorを取得
	let activeEditor = vscode.window.activeTextEditor;

	// 設定情報を取得
	let util = Util.getInstance();
	util.init();

	if (activeEditor) {
		// 現在のTextEditorを登録
		util.triggerUpdateDecorations();
	}

	// アクティブなエディタが変更されたときに発生するイベントです。このイベントは、アクティブなエディタが変更されたときにも発生することに注意してください
	vscode.window.onDidChangeActiveTextEditor(editor => {
		activeEditor = editor;
		if (editor) {
			util.setActiveEditor(activeEditor);
			util.triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

	// テキスト ドキュメントが変更されたときに発生するイベント。これは通常、発生します 内容が変わったときだけでなく、ダーティ状態など他のものも変わったとき。
	vscode.workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document) {
			util.triggerUpdateDecorations(true);
		}
	}, null, context.subscriptions);

	
	// 設定変更時のイベントハンドラ
	function onConfigurationChanged(e: vscode.ConfigurationChangeEvent) {
		// 排他して、createTextEditorDecorationTypeを更新する
		console.log("onConfigurationChanged");
		util.configurationChanged();
	}
}


async function makeSimpleGitDiff(dir: string, fileName: string, commandId: string): Promise<number[]> {

	console.log(`makeSimpleGitDiff: ${dir} ${fileName} ${commandId}`);

	let rows: number[] = [];
	const git = SimpleGit(dir);

	try {
	
		let logVersion = await git.version();
		if(!logVersion.installed) {
			vscode.window.showInformationMessage('git is not install');
			return rows;
		}

		let logLog;
		if( commandId.length === 0) {
			logLog = await git.log([fileName]);
			if( logLog.all.length === 0 ) {
				vscode.window.showInformationMessage('git log failed');
				return rows;
			}
		}
		else {
			logLog = await git.log([commandId, fileName]);
			if( logLog.all.length === 0 ) {
				vscode.window.showInformationMessage('I cannot find the commitID');
				return rows;
			}
		}

		let logDiff;
		if( commandId.length === 0) {
			logDiff = await git.diff([fileName]);
		}
		else {
			logDiff = await git.diff([commandId, fileName]);
		}

		if( logDiff.length === 0 ) {
			vscode.window.showInformationMessage('git diff failed');
			return rows;
		}

		console.log(`Diff: ${logDiff}`);

		const regex = /@@(.*?)@@/g;
		let matches = logDiff.match(regex);
		if(!matches) {
			vscode.window.showInformationMessage('git diff failed 2');
			return rows;			
		}

		const lines = logDiff.split('\n');
		for (let index = 0; index < lines.length; index++) {
			const line = lines[index];
			if( line.startsWith('@@')) {
				const regex = /@@ -(\d+),(\d+) \+(\d+),(\d+) @@/;;
				const match = line.match(regex);

				if( match?.length !== 5 ) {
					vscode.window.showInformationMessage('git diff failed 2');
					return rows;					
				}

				console.log(`Diff Line: ${line}`);

				let addIndex = 0;
				for (let index2 = index + 1; index2 < lines.length; index2++) {
					const line = lines[index2];

					if(line.startsWith('\+')) {
						rows.push( Number(match[3]) - 1 + addIndex );
						addIndex = addIndex + 1;
					}else if(!line.startsWith('\-')) {
						addIndex = addIndex + 1;
					}else {

					}

				}
			}
		}
	}
	catch(error) {
		console.log(error);
	}
	return rows;		
}

// This method is called when your extension is deactivated
export function deactivate() {}
