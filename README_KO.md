<h1 align="center">AXQ PDF Tool</h1>

<div align="center">
    <a href="README.md">English</a> | <a href="README_CN.md">简体中文</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_RU.md">Русский</a>
</div>

<br />

**AXQ PDF Tool**은 **Tauri**와 **Rust**로 구축된 강력하고 안전하며 개인 정보를 최우선으로 하는 로컬 PDF 툴킷입니다.

모든 파일 처리는 사용자의 기기에서 로컬로 수행되므로 중요한 문서가 외부 서버로 전송되지 않아 안전합니다.

## ✨ 주요 기능

### PDF 분할
PDF 문서에서 특정 페이지 범위를 추출합니다.

![PDF 분할](images/split.png)

### PDF 병합
드래그 앤 드롭으로 순서를 조정하여 여러 PDF 파일을 하나로 합칩니다.

### 이미지 PDF 변환
이미지(JPG, PNG, BMP)를 PDF로 변환합니다. 모든 파일 지우기 기능을 지원합니다.

![이미지 PDF 변환](images/picture.png)

### PDF 편집
썸네일 미리보기를 통해 페이지 순서를 변경하거나 삭제할 수 있습니다.

![PDF 편집](images/edit.png)

### PDF Word 변환
PDF 문서를 Word(.docx) 형식으로 변환합니다.

## 🚀 주요 특징

- **개인 정보 보호**: 서버 업로드 없음. 모든 작업은 Rust 기반으로 로컬에서 처리됩니다.
- **고성능**: 가볍고 빠른 Tauri 기반 애플리케이션.
- **최신 UI**: React와 Tailwind CSS로 제작된 깔끔한 인터페이스.
- **다국어 지원**: 영어, 중국어, 일본어, 한국어, 러시아어 지원.

## 🛠️ 기술 스택

- **Core**: [Rust](https://www.rust-lang.org/) (Tauri v2)
- **Frontend**: [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)

## 📦 개발 설정

1. **사전 요구 사항**:
   - `Rust` 및 `Cargo` 설치.
   - `Node.js` 및 `npm` 설치.

2. **의존성 설치**:
   ```bash
   cd app
   npm install
   ```

3. **개발 서버 실행**:
   ```bash
   npm run tauri dev
   ```

4. **빌드**:
   ```bash
   npm run tauri build
   ```

## 📄 라이선스

[MIT License](LICENSE)
