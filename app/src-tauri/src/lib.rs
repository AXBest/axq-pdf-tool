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

#[tauri::command]
async fn pdf_to_image(app: tauri::AppHandle, input: String, output: String) -> Result<(), String> {
    use tauri::Manager;
    let input_path = std::path::PathBuf::from(input);
    let output_path = std::path::PathBuf::from(output);

    // 1. 定位 pdfium.dll
    let dll_name = if cfg!(windows) {
        "pdfium.dll"
    } else if cfg!(target_os = "macos") {
        "libpdfium.dylib"
    } else {
        "libpdfium.so"
    };

    let resource_dir = app.path().resource_dir().map_err(|e| e.to_string())?;
    let mut possible_dll_paths = vec![
        resource_dir.join(dll_name),
        resource_dir.join("resources").join(dll_name),
        resource_dir.join("bin").join(dll_name),
    ];

    // 开发环境路径
    if let Ok(cwd) = std::env::current_dir() {
        possible_dll_paths.push(cwd.join(dll_name));
        possible_dll_paths.push(cwd.join("resources").join(dll_name));
        possible_dll_paths.push(cwd.join("src-tauri").join(dll_name));
        possible_dll_paths.push(cwd.join("src-tauri").join("resources").join(dll_name));
        possible_dll_paths.push(cwd.join("..").join("src-tauri").join(dll_name));
        possible_dll_paths.push(
            cwd.join("..")
                .join("src-tauri")
                .join("resources")
                .join(dll_name),
        );
    }

    // 可执行文件所在目录
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            possible_dll_paths.push(exe_dir.join(dll_name));
            possible_dll_paths.push(exe_dir.join("resources").join(dll_name));
        }
    }

    let dll_path = possible_dll_paths.iter().find(|p| p.exists());

    if let Some(path) = dll_path {
        let path = path.clone();
        let result = tauri::async_runtime::spawn_blocking(move || {
            pdf_core::pdf_to_images(input_path, output_path, path)
        })
        .await
        .map_err(|e| e.to_string())?;

        return result.map_err(|e: PdfError| e.to_string());
    }

    // 找不到 DLL 的详细错误
    let mut err_msg = format!("找不到 {}。请下载并放置在以下任一位置：\n", dll_name);
    for p in possible_dll_paths {
        err_msg.push_str(&format!("- {:?}\n", p));
    }

    Err(err_msg)
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
            pdf_to_word,
            pdf_to_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
