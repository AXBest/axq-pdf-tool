<h1 align="center">AXQ PDF Tool</h1>

<div align="center">
    <a href="README.md">English</a> | <a href="README_CN.md">简体中文</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_RU.md">Русский</a>
</div>

<br />

**AXQ PDF Tool** は、**Tauri** と **Rust** で構築された、強力で安全、かつプライバシーを重視したローカル PDF ツールキットです。

クラウドにファイルをアップロードするオンラインツールとは異なり、すべての処理はお使いのデバイス上でローカルに行われるため、重要なドキュメントのセキュリティが確保されます。

## ✨ 主な機能

### PDF 分割
指定したページ範囲で PDF ドキュメントを分割します。

![PDF 分割](images/split.png)

### PDF 結合
複数の PDF ファイルをドラッグ＆ドロップで並べ替えて結合します。

### 画像 PDF 変換
画像 (JPG, PNG, BMP) を PDF に変換します。「すべてクリア」ボタンで簡単に管理できます。

![画像 PDF 変換](images/picture.png)

### PDF 編集
PDF 内のページの順序変更や削除が可能です。ページのサムネイルプレビューもサポートしています。

![PDF 編集](images/edit.png)

### PDF Word 変換
PDF ドキュメントを Word (.docx) 形式に変換します。

## 🚀 ハイライト

- **プライバシーファースト**: サーバーへのアップロードは不要です。Rust のネイティブライブラリを使用してローカルで処理されます。
- **クロスプラットフォーム**: Windows、macOS、Linux で動作します。
- **モダン UI**: React と Tailwind CSS で構築された使いやすいインターフェース。
- **多言語サポート**: 英語、中国語、日本語、韓国語、ロシア語に対応。

## 🛠️ 技術スタック

- **Core**: [Rust](https://www.rust-lang.org/) (Tauri v2)
- **Frontend**: [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)

## 📦 開発セットアップ

1. **前提条件**:
   - `Rust` と `Cargo` のインストール。
   - `Node.js` と `npm` のインストール。

2. **依存関係のインストール**:
   ```bash
   cd app
   npm install
   ```

3. **開発サーバーの起動**:
   ```bash
   npm run tauri dev
   ```

4. **ビルド**:
   ```bash
   npm run tauri build
   ```

## 📄 ライセンス

[MIT License](LICENSE)
