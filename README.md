# simplegitdiff README

簡単に現在の状態と指定のコミットIDを比較して、表示するプログラム

## Features

VSCodeで開いている状態のパスを取得して

  git diff [コミットID] ファイルパス

を行い編集履歴を取得

それを画面に反映させます

単体テストをするときに、変更箇所を探すのが面倒(コミット結合。。。比較画面があってもブレークを置けなかったので)だったので作りました

コマンド

  SimpleGitDiff                 表示
  SimpleGitDiffClear            非表示
