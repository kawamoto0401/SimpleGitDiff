import * as path from 'path';
import internal = require('stream');
import * as vscode from 'vscode';
import { DecorationRangeBehavior, OverviewRulerLane, Uri, ExtensionContext } from "vscode";
import { TextEditorDecorationType } from "vscode";
import { Mutex } from "./oss/await-semaphore-master";

export class Util {

    private static instance: Util;
    private constructor() {
        this.gutterIconMap = new Map();        
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
    private rows: number[] | undefined = undefined;


    public init() {

        this.setDecorationType();

        this.activeEditor = vscode.window.activeTextEditor;
    }


    public readonly placeholderDecoration = vscode.window.createTextEditorDecorationType(
        {
        }
    );

    // 削除するためのTextEditorDecorationTypeをファイルパス：行番号で管理
    private gutterIconMap: Map<string, vscode.TextEditorDecorationType>;

    private async updateDecorations() {
        if (!this.activeEditor || !this.decorationType) {
            return;
        }

        if (!this.filePath || !this.rows || this.rows.length === 0) {
             const rangea: vscode.Range[] = [];
             this.activeEditor.setDecorations(this.decorationType, rangea);
             return;
        }

        if(this.filePath !== this.activeEditor.document.fileName) {
            const rangea: vscode.Range[] = [];
            this.activeEditor.setDecorations(this.decorationType, rangea);
            return;
        }

        // 

        console.log("updateDecorations");

        const text = this.activeEditor.document.getText();

        const rangea: vscode.Range[] = [];

        for (let index = 0; index < this.rows.length; index++) {
            
            const range = new vscode.Range(
                new vscode.Position(this.rows[index] - 1, 0), // 開始位置
                new vscode.Position(this.rows[index] - 1, Number.MAX_VALUE) // 終了位置
            );

            rangea.push(range);
        }
        
        const mutex = new Mutex();
        const release = await mutex.acquire();
        try {
            // 排他処理
            this.activeEditor.setDecorations(this.decorationType, rangea);
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
        this.rows = rows;

        this.triggerUpdateDecorations();
	}

    public clearRows() {
        console.log(`clearRows`);

        this.filePath = undefined;
        this.rows = undefined;

        this.triggerUpdateDecorations();
	}

    // 設定画面よりDecorationTypeを生成
    private setDecorationType() {
        const configuration = vscode.workspace.getConfiguration();

        let decorationRenderOptions: vscode.DecorationRenderOptions = {};

        decorationRenderOptions.backgroundColor = 'rgba(255, 0, 0, 0.5)';
        decorationRenderOptions.overviewRulerLane = vscode.OverviewRulerLane.Right;
        decorationRenderOptions.overviewRulerColor = 'rgba(255, 0, 0, 0.5)';

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
            this.decorationType = undefined;

            // 新規のDecorationTypeを設定
            this.setDecorationType();
        } finally {
            // release を呼び出さないとデットロックになる
            release();
        }

        this.triggerUpdateDecorations();
    }
}
