<h1 align="center">AXQ PDF Tool</h1>

<div align="center">
    <a href="README.md">English</a> | <a href="README_CN.md">简体中文</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_RU.md">Русский</a>
</div>

<br />

**AXQ PDF Tool** 是一个基于 **Tauri** 和 **Rust** 构建的强大、安全且注重隐私的本地 PDF 工具箱。

通过利用 Rust 的高性能，本工具所有操作均在本地完成，无需将文件上传至云端，确保您的文档安全无虞。

## ✨ 主要功能

### PDF 分割
按页面范围将 PDF 文件拆分为多个文件。

![PDF 分割](images/split.png)

### PDF 合并
将多个 PDF 文件合并为一个，支持拖拽排序。

### 图片转 PDF
将多种格式图片（JPG, PNG, BMP）转换为 PDF 文档，支持一键清空。

![图片转 PDF](images/picture.png)

### PDF 编辑
直观地查看页面缩略图，支持重新排序或删除指定页面。

![PDF 编辑](images/edit.png)

### PDF 转 Word
将 PDF 文档转换为可编辑的 Word (.docx) 格式。

## 🚀 核心亮点

- **隐私优先**：无需服务器上传。所有处理均在本地使用 Rust 原生库完成。
- **高性能**：基于 Tauri 构建，轻量且快速。
- **现代界面**：使用 React 和 Tailwind CSS 构建的现代化响应式界面。
- **多语言支持**：内置英文、中文、日文、韩文和俄语支持。

## 🛠️ 技术栈

- **核心架构**: [Rust](https://www.rust-lang.org/) (Tauri v2)
- **前端框架**: [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **样式库**: [Tailwind CSS](https://tailwindcss.com/)
- **PDF 引擎**: `lopdf`, `pdfium-render`

## 📦 开发指南

1. **环境准备**:
   - 安装 `Rust` 和 `Cargo`。
   - 安装 `Node.js` 和 `npm`。

2. **安装依赖**:
   ```bash
   cd app
   npm install
   ```

3. **启动开发环境**:
   ```bash
   npm run tauri dev
   ```

4. **构建生产版本**:
   ```bash
   npm run tauri build
   ```

## 📄 许可证

[MIT License](LICENSE)
