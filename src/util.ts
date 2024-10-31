import * as path from 'path';
import internal = require('stream');
import * as vscode from 'vscode';
import { DecorationRangeBehavior, OverviewRulerLane, Uri, ExtensionContext } from "vscode";
import { TextEditorDecorationType } from "vscode";
import { Mutex } from "./oss/await-semaphore-master";

export class Util {

    private static instance: Util;
    private constructor() {
        this.setDecorationType();
        this.activeEditor = vscode.window.activeTextEditor;
      }

    public static getInstance(): Util {
        if (!Util.instance) {
            Util.instance = new Util();
        }
        return Util.instance;
    }

    private decorationType: vscode.TextEditorDecorationType | undefined;
    private activeEditor: vscode.TextEditor | undefined;
    private timeout: NodeJS.Timeout | undefined = undefined;

    private filePath: string | undefined = undefined;
    private ranges: vscode.Range[] = [];
    

    private async updateDecorations() {
        if (!this.activeEditor || !this.decorationType) {
            return;
        }

        if (!this.filePath || !this.ranges || this.ranges.length === 0) {
            const ranges: vscode.Range[] = [];
            this.activeEditor.setDecorations(this.decorationType, ranges);
            return;
        }

        if(this.filePath !== this.activeEditor.document.fileName) {
            const ranges: vscode.Range[] = [];
            this.activeEditor.setDecorations(this.decorationType, ranges);
            return;
        }

        console.log("updateDecorations");

        const mutex = new Mutex();
        const release = await mutex.acquire();
        try {
            // 排他処理
            this.activeEditor.setDecorations(this.decorationType, this.ranges);
        } finally {
            // release を呼び出さないとデットロックになる
            release();
        }
    }

    public triggerUpdateDecorations(throttle = false) {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
        if (throttle) {
            // setTimeoutのthis問題を回避
            this.timeout = setTimeout(() => { this.updateDecorations(); }, 100);
        } else {
            this.updateDecorations();
        }
    }

    // タブ変更などのactiveEditorを変更時
    public setActiveEditor(activeEditor: vscode.TextEditor | undefined) {
        this.activeEditor = activeEditor;
    }


    public setRows(filePath: string, rows: number[]) {
        console.log(`setRows ${filePath} : ${rows}`);

        this.filePath = filePath;
        this.ranges.length = 0;
        
        let index = 0;
        while( index < rows.length ) {

            let endRow = rows[index];

            let index2 = index + 1;
            for (; index2 < rows.length; index2++) {
                if( rows[index] !== rows[index2] - 1 ) {
                    break;
                }
                endRow = rows[index2];
            }

            const range = new vscode.Range(
                new vscode.Position(rows[index] - 1, 0), // 開始位置
                new vscode.Position(endRow - 1, Number.MAX_VALUE) // 終了位置
            );

            this.ranges.push(range);

            index = index2;
        }
        
        this.triggerUpdateDecorations();
	}

    public clearRows() {
        console.log(`clearRows`);

        this.filePath = undefined;
        this.ranges.length = 0;

        this.triggerUpdateDecorations();
	}

    public getFilePath(): string | undefined {
        return this.filePath;
    }

    public upSelectLine(){
        // 
        if(!this.activeEditor) {
            return;
        }
    
        const doc = this.activeEditor.document;
        const curSelection = this.activeEditor.selection;
        const startLine = curSelection.start.line;
        let selectLine = 0;
        let isHit = false;
        
        for (let index = 0; index < this.ranges.length; index++) {
            if( startLine > this.ranges[index].start.line ) {
                selectLine = this.ranges[index].start.line;
                isHit = true;
            }
            else {
                break;
            }            
        }

        if(!isHit) {
            vscode.window.showInformationMessage('I couldn\'t find the next one.');
            return;
        }

        // カーソルを移動させる
        let pos = new vscode.Position(selectLine + 1, 0);
        this.activeEditor.selection = new vscode.Selection(pos, pos);

        // スクリーンを移動させる
        let range = new vscode.Range(pos, pos);
        this.activeEditor.revealRange(range);
    }

    public downSelectLine(){
        // 
        if(!this.activeEditor) {
            return;
        }
    
        const doc = this.activeEditor.document;
        const curSelection = this.activeEditor.selection;
        const startLine = curSelection.start.line;
        let selectLine = 0;
        let isHit = false;
        
        for (let index = this.ranges.length - 1; index >= 0; index--) {
            if( startLine < this.ranges[index].start.line ) {
                selectLine = this.ranges[index].start.line;
                isHit = true;
            }
            else {
                break;
            }          
        }

        if(!isHit) {
            vscode.window.showInformationMessage('I couldn\'t find the next one.');
            return;
        }

        // カーソルを移動させる
        let pos = new vscode.Position(selectLine, 0);
        this.activeEditor.selection = new vscode.Selection(pos, pos);

        // スクリーンを移動させる
        let range = new vscode.Range(pos, pos);
        this.activeEditor.revealRange(range);
    }

    // 設定画面よりDecorationTypeを生成
    private setDecorationType() {
        const configuration = vscode.workspace.getConfiguration();

        let decorationRenderOptions: vscode.DecorationRenderOptions = {};
 
        const color = configuration.get('conf.resource.backgroundColor', '');     
        decorationRenderOptions.backgroundColor = color;
        decorationRenderOptions.overviewRulerLane = vscode.OverviewRulerLane.Right;
        decorationRenderOptions.overviewRulerColor = color;

        this.decorationType = vscode.window.createTextEditorDecorationType(decorationRenderOptions);
    }

    // 設定変更通知を受信時
    public async configurationChanged() {
        console.log("configurationChanged");

        const mutex = new Mutex();
        const release = await mutex.acquire();
        try {
            // 排他処理

            // DecorationTypeを破棄
            this.decorationType?.dispose;

            // 新規のDecorationTypeを設定
            this.setDecorationType();
        } finally {
            // release を呼び出さないとデットロックになる
            release();
        }

        this.triggerUpdateDecorations();
    }
}
