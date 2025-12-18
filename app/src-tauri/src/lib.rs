use pdf_core::PdfError;
use std::path::PathBuf;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn split_pdf(
    input: String,
    start: u32,
    end: u32,
    output_dir: String,
) -> Result<Vec<String>, String> {
    let input_path = PathBuf::from(input);
    let output_path = PathBuf::from(output_dir);

    // Run blocking IO in a separate thread
    let result = tauri::async_runtime::spawn_blocking(move || {
        pdf_core::split(input_path, output_path, "split", start, end)
    })
    .await
    .map_err(|e: tauri::Error| e.to_string())?;

    match result {
        Ok(paths) => Ok(paths
            .into_iter()
            .map(|p| p.to_string_lossy().to_string())
            .collect()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn merge_pdf(inputs: Vec<String>, output: String) -> Result<(), String> {
    let input_paths: Vec<PathBuf> = inputs.into_iter().map(PathBuf::from).collect();
    let output_path = PathBuf::from(output);

    let result =
        tauri::async_runtime::spawn_blocking(move || pdf_core::merge(&input_paths, output_path))
            .await
            .map_err(|e: tauri::Error| e.to_string())?;

    result.map_err(|e: PdfError| e.to_string())
}

#[tauri::command]
async fn image_to_pdf(images: Vec<String>, output: String) -> Result<(), String> {
    let image_paths: Vec<PathBuf> = images.into_iter().map(PathBuf::from).collect();
    let output_path = PathBuf::from(output);

    let result = tauri::async_runtime::spawn_blocking(move || {
        pdf_core::engine::images_to_pdf(&image_paths, output_path)
    })
    .await
    .map_err(|e: tauri::Error| e.to_string())?;

    result.map_err(|e: PdfError| e.to_string())
}

#[tauri::command]
async fn get_pdf_page_count(input: String) -> Result<u32, String> {
    let input_path = PathBuf::from(input);
    let result = tauri::async_runtime::spawn_blocking(move || pdf_core::get_page_count(input_path))
        .await
        .map_err(|e: tauri::Error| e.to_string())?;

    result.map_err(|e: PdfError| e.to_string())
}

#[tauri::command]
async fn reorder_pdf(input: String, page_order: Vec<u32>, output: String) -> Result<(), String> {
    let input_path = PathBuf::from(input);
    let output_path = PathBuf::from(output);
    let result = tauri::async_runtime::spawn_blocking(move || {
        pdf_core::reorder_pages(input_path, &page_order, output_path)
    })
    .await
    .map_err(|e: tauri::Error| e.to_string())?;

    result.map_err(|e: PdfError| e.to_string())
}

#[tauri::command]
async fn pdf_to_word(input: String, output: String) -> Result<(), String> {
    let input_path = PathBuf::from(input);
    let output_path = PathBuf::from(output);
    let result = tauri::async_runtime::spawn_blocking(move || {
        pdf_core::pdf_to_word(input_path, output_path)
    })
    .await
    .map_err(|e: tauri::Error| e.to_string())?;
    result.map_err(|e: PdfError| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            split_pdf,
            merge_pdf,
            image_to_pdf,
            get_pdf_page_count,
            reorder_pdf,
            pdf_to_word
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
