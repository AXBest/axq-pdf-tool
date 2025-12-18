<h1 align="center">AXQ PDF Tool</h1>

<div align="center">
    <a href="README.md">English</a> | <a href="README_CN.md">简体中文</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_RU.md">Русский</a>
</div>

<br />

**AXQ PDF Tool** is a powerful, secure, and privacy-first local PDF toolkit built with **Tauri** and **Rust**.

Unlike online tools that upload your sensitive documents to the cloud, AXQ PDF Tool processes everything locally on your device, ensuring your data never leaves your computer.

## ✨ Features

### Split PDF
Extract specific page ranges from a PDF document.

![Split PDF](images/split.png)

### Merge PDF
Combine multiple PDF files into a single document with drag-and-drop reordering.

### Image to PDF
Convert images (JPG, PNG, BMP) to PDF. Features a "Clear All" button for easy management.

![Image to PDF](images/picture.png)

### Edit PDF
Reorder or delete specific pages within a PDF file. View thumbnail previews of pages.

![Edit PDF](images/edit.png)

### PDF to Word
Convert PDF documents to Word (.docx) format.

## 🚀 Key Highlights

- **Privacy First**: No server uploads. All operations are performed locally using Rust's high-performance native libraries.
- **Cross-Platform**: Built on Tauri, compatible with Windows, macOS, and Linux.
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS.
- **Multi-language Support**: Fully localized in English, Chinese, Japanese, Korean, and Russian.

## 🛠️ Tech Stack

- **Core**: [Rust](https://www.rust-lang.org/) (Tauri v2)
- **Frontend**: [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **PDF Engine**: `lopdf`, `pdfium-render` (via `pdf_core` crate)

## 📦 Development Setup

1. **Prerequisites**:
   - Install `Rust` and `Cargo`.
   - Install `Node.js` and `npm`.

2. **Install Dependencies**:
   ```bash
   cd app
   npm install
   ```

3. **Run Development Server**:
   ```bash
   npm run tauri dev
   ```

4. **Build for Production**:
   ```bash
   npm run tauri build
   ```

## 📄 License

[MIT License](LICENSE)
