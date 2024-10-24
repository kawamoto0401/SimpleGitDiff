import * as path from 'path';
import internal = require('stream');
import * as vscode from 'vscode';
import { DecorationRangeBehavior, OverviewRulerLane, Uri, ExtensionContext } from "vscode";
import { TextEditorDecorationType } from "vscode";

export class Util {

    public readonly placeholderDecorationUri = Uri.file(
        path.join(__dirname, "..", "resources", "dark", "file_r.svg")
    );

    public readonly placeholderDecoration = vscode.window.createTextEditorDecorationType(
        {
            gutterIconPath: this.placeholderDecorationUri.fsPath,
            gutterIconSize: 'contain',
        }
    );

    // 削除するためのTextEditorDecorationTypeをファイルパス：行番号で管理
    private gutterIconMap: Map<string, vscode.TextEditorDecorationType>;

    // フォルダパスの設定とMapを設定
    // TODO:引数にした方が拡張性があるが放置
    constructor() {
        this.gutterIconMap = new Map();
	}


    // 引数にファイルパスと行数を設定
    // ハッシュに登録する
    setTextMng( editor: vscode.TextEditor, filename : string, rows : number[]) {

        const decorationOptions = {
            // todo
            rangeBehavior: DecorationRangeBehavior.ClosedClosed
        };

        const decorationType = vscode.window.createTextEditorDecorationType(decorationOptions);

        let ranges : vscode.Range[] = [];

        //
        for (const row of rows) {
            const pos = new vscode.Position( row, 0 );
            const range = new vscode.Range(pos, pos);

            ranges.push(range);

            const key = filename + "," + row;
            this.gutterIconMap.set( key, decorationType );
        }

        if( 0 === ranges.length ) {
            return;
        }

        editor.setDecorations(decorationType, ranges);

        return;
    }


    //
    public getDecorationsList(fsPath: string): Map<vscode.TextEditorDecorationType, Array<vscode.Range>> {

        let editorDecorations = new Map<TextEditorDecorationType, vscode.Range[]>();
        for (let [filePathLineNumber, decoration] of this.gutterIconMap) {

            let result = filePathLineNumber.split(',');

            let filePath = result[0];
            let lineNumber = Number(result[1]);


            let ranges = editorDecorations.get(decoration);
            if (typeof ranges === "undefined") {
                ranges = new Array<vscode.Range>();
                editorDecorations.set(decoration, ranges);
            }

            ranges.push(new vscode.Range(lineNumber, 0, lineNumber, 0));
        }

        return editorDecorations;
    }
}
