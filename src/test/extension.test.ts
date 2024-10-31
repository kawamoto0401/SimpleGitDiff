import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { Util } from '../util';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('SimpleGitDiff test', async() => {

		let filePathInput = '';

		// 準備
		let doc = await vscode.workspace.openTextDocument(filePathInput);

		let editor = await vscode.window.showTextDocument(doc);

		const filePath = editor.document.fileName;
		assert.strictEqual(0, filePath.length);

		let rows: number[] = [1, 3, 4, 5, 6, 7, 8, 10];
		//
		let util = Util.getInstance();
		util.setRows(filePath, rows);

		await new Promise(resolve => setTimeout(resolve, 3000));


		
	});

});
