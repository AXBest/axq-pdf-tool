use crate::error::PdfError;
use lopdf::content::Content;
use lopdf::dictionary;
use lopdf::{Document, Object, ObjectId, Stream};
use std::collections::BTreeMap;
use std::path::Path;

/// Merges multiple PDF files into one.
/// Merges multiple PDF files into one.
pub fn merge_pdf<P: AsRef<Path>>(documents: &[P], output: P) -> Result<(), PdfError> {
    let mut documents_loaded = Vec::new();
    for path in documents {
        documents_loaded.push(Document::load(path.as_ref())?);
    }

    let mut max_id = 1;
    let mut final_objects = BTreeMap::new();
    let mut final_page_ids = Vec::new();

    for mut doc in documents_loaded {
        doc.renumber_objects_with(max_id);
        max_id = doc.max_id + 1;

        let pages = doc.get_pages();
        let mut doc_page_ids: Vec<ObjectId> = pages.into_values().collect();
        doc_page_ids.sort(); // Ensure order

        for id in &doc_page_ids {
            final_page_ids.push(*id);
        }

        for (id, object) in doc.objects {
            // We keep the object if it's NOT the catalog or pages root of this sub-doc
            // But identifying them is hard without traversing.
            // EASIER: Just add everything, and we construct a NEW Catalog and NEW Pages root that only points to the Page objects we collected.
            // The old Catalog/Pages objects will just be "floating" unreferenced garbage, which `save` might prune or we can prune.
            final_objects.insert(id, object);
        }
    }

    let mut result = Document::with_version("1.5");
    result.objects = final_objects;
    result.max_id = max_id;

    let pages_root_id = result.new_object_id();
    let catalog_id = result.new_object_id();

    // Update all pages to point to new parent
    for page_id in &final_page_ids {
        if let Some(Object::Dictionary(dict)) = result.objects.get_mut(page_id) {
            dict.set(b"Parent".to_vec(), Object::Reference(pages_root_id));
        }
    }

    // Create Pages Dictionary
    use lopdf::dictionary;
    let pages_dict = dictionary! {
        "Type" => "Pages",
        "Count" => final_page_ids.len() as i32,
        "Kids" => final_page_ids.into_iter().map(Object::Reference).collect::<Vec<_>>(),
    };
    result
        .objects
        .insert(pages_root_id, Object::Dictionary(pages_dict));

    // Create Catalog
    let catalog_dict = dictionary! {
        "Type" => "Catalog",
        "Pages" => Object::Reference(pages_root_id),
    };
    result
        .objects
        .insert(catalog_id, Object::Dictionary(catalog_dict));

    result
        .trailer
        .set(b"Root".to_vec(), Object::Reference(catalog_id));

    // Prune unreferenced objects (Garbage Collection)
    result.prune_objects();

    // Save
    let mut file = std::io::BufWriter::new(std::fs::File::create(output)?);
    result.save_to(&mut file)?;

    Ok(())
}

/// Splits a PDF into chunks of `pages_per_file`.
/// `output_prefix`: e.g. "output_part" -> "output_part_1.pdf", "output_part_2.pdf"
pub fn split_pdf<P: AsRef<Path>>(
    input: P,
    output_dir: P,
    output_prefix: &str,
    start_page: u32,
    end_page: u32,
) -> Result<Vec<std::path::PathBuf>, PdfError> {
    let doc = Document::load(input.as_ref())?;

    // Validate range
    let pages = doc.get_pages();
    let mut sorted_pages: Vec<ObjectId> = pages.into_values().collect();
    sorted_pages.sort();

    if start_page == 0 || end_page as usize > sorted_pages.len() || start_page > end_page {
        return Err(PdfError::InvalidPage(start_page));
    }

    let range_indices = (start_page as usize - 1)..(end_page as usize);
    let target_page_ids = &sorted_pages[range_indices];

    // Create a new document containing only these pages.
    // We can Clone the doc, retain only selected pages, and prune.
    // Cloning the whole doc structure is cheap (objects).

    // We need to rewrite the Pages tree to only include target_page_ids.
    // High-level:
    // 1. Get Catalog -> Pages.
    // 2. Set "Kids" to only our target pages.
    // 3. Update "Count".
    // 4. Update "Parent" of those pages (if we created a new Pages root, but here we reuse).

    // Simplified approach used in lopdf examples:
    // "compress" or "delete_pages".
    // lopdf doesn't have a direct "keep_only_pages" method, but we can construct one.

    // Let's go with the "Create New Doc" approach similar to merge, but from same source.
    let mut result = doc.clone();

    // doc.objects are already in result because of clone.
    // result.max_id is correct.

    // But we need to fix the Pages Tree.
    // The easiest way is to build a new Pages Root and Catalog, point to the selected Page IDs, and Prune.
    let pages_root_id = result.new_object_id();
    let catalog_id = result.new_object_id();

    // Update Parents
    for page_id in target_page_ids {
        if let Some(Object::Dictionary(dict)) = result.objects.get_mut(page_id) {
            dict.set(b"Parent".to_vec(), Object::Reference(pages_root_id));
        }
    }

    let pages_dict = dictionary! {
        "Type" => "Pages",
        "Count" => target_page_ids.len() as i32,
        "Kids" => target_page_ids.iter().map(|&id| Object::Reference(id)).collect::<Vec<_>>(),
    };
    result
        .objects
        .insert(pages_root_id, Object::Dictionary(pages_dict));

    let catalog_dict = dictionary! {
        "Type" => "Catalog",
        "Pages" => Object::Reference(pages_root_id),
    };
    result
        .objects
        .insert(catalog_id, Object::Dictionary(catalog_dict));
    result
        .trailer
        .set(b"Root".to_vec(), Object::Reference(catalog_id));

    result.prune_objects(); // Critical: Remove all the other pages and resources not used by our selected pages.

    let output_filename = format!("{}_{}-{}.pdf", output_prefix, start_page, end_page);
    let output_path = output_dir.as_ref().join(output_filename);

    let mut file = std::io::BufWriter::new(std::fs::File::create(&output_path)?);
    result.save_to(&mut file)?;

    Ok(vec![output_path])
}

// Wrapper for public export that matches the plan better if needed,
// for now I'll redirect the public functions to these implementations.

pub use merge_pdf as merge;
pub use split_pdf as split;

pub fn images_to_pdf(
    image_paths: &[std::path::PathBuf],
    output_path: std::path::PathBuf,
) -> Result<(), PdfError> {
    let mut doc = Document::with_version("1.5");
    let pages_id = doc.new_object_id();
    let mut pages = dictionary! {
        "Type" => "Pages",
        "Count" => image_paths.len() as i32,
        "Kids" => Vec::<Object>::new(),
    };

    let mut page_ids = Vec::new();

    for path in image_paths {
        // Load image
        let img = image::open(path)
            .map_err(|e| PdfError::Operation(format!("Failed to open image {:?}: {}", path, e)))?;
        let (width, height) = (img.width(), img.height());

        // Convert to JPEG buffer for PDF embedding
        let mut jpeg_data = Vec::new();
        let mut encoder = image::codecs::jpeg::JpegEncoder::new(&mut jpeg_data);
        encoder.encode_image(&img).map_err(|e| {
            PdfError::Operation(format!("Failed to encode image {:?}: {}", path, e))
        })?;

        // Create Image XObject
        let image_stream = Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => width as i32,
                "Height" => height as i32,
                "ColorSpace" => "DeviceRGB",
                "BitsPerComponent" => 8,
                "Filter" => "DCTDecode",
            },
            jpeg_data,
        );
        let image_id = doc.add_object(image_stream);

        // Create Page
        // Content stream to draw image filling the page: q width 0 0 height 0 0 cm /Im1 Do Q
        let content_stream = Stream::new(
            dictionary! {},
            format!("q {} 0 0 {} 0 0 cm /Im1 Do Q", width, height)
                .as_bytes()
                .to_vec(),
        );
        let content_id = doc.add_object(content_stream);

        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "MediaBox" => vec![0.into(), 0.into(), width.into(), height.into()],
            "Contents" => content_id,
            "Resources" => dictionary! {
                "XObject" => dictionary! {
                    "Im1" => image_id,
                },
            },
        });

        page_ids.push(Object::Reference(page_id));
    }

    pages.set("Kids", page_ids);
    doc.objects.insert(pages_id, Object::Dictionary(pages));

    let catalog_id = doc.add_object(dictionary! {
        "Type" => "Catalog",
        "Pages" => pages_id,
    });

    doc.trailer.set("Root", catalog_id);
    doc.max_id = doc.objects.keys().max().copied().unwrap_or((0, 0)).0; // Update max_id

    doc.save(output_path).map(|_| ()).map_err(|e| e.into())
}

pub fn get_page_count<P: AsRef<Path>>(input: P) -> Result<u32, PdfError> {
    let doc = Document::load(input).map_err(PdfError::Parse)?;
    Ok(doc.get_pages().len() as u32)
}

pub fn reorder_pages<P: AsRef<Path>>(
    input: P,
    page_order: &[u32],
    output: P,
) -> Result<(), PdfError> {
    let doc = Document::load(input).map_err(PdfError::Parse)?;
    let pages = doc.get_pages();
    let mut page_map = BTreeMap::new();
    for (i, (_page_num, object_id)) in pages.iter().enumerate() {
        page_map.insert(i as u32 + 1, *object_id);
    }

    // Create a new list of page ObjectIds based on input order
    let mut new_pages = Vec::new();
    for &page_num in page_order {
        if let Some(&object_id) = page_map.get(&page_num) {
            new_pages.push(object_id);
        }
    }

    if new_pages.is_empty() {
        return Err(PdfError::Operation("No valid pages selected".to_string()));
    }

    // Create new document strategy:
    // 1. Clone doc (expensive but safe) or manipulate in place?
    // split_pdf approach: clone doc, then prune.
    let mut result = doc.clone();

    // Map old page IDs to new pages array
    let catalog = result.catalog_mut().map_err(PdfError::Parse)?;
    let pages_id = catalog
        .get(b"Pages")
        .and_then(|o| o.as_reference())
        .map_err(PdfError::Parse)?;

    // We need to rebuild the page tree. For simplicity in lopdf (and this specific task),
    // we can often get away with just replacing the "Kids" of the root Pages object
    // if the original PDF structure isn't too complex (nested page trees).
    // However, split_pdf does a deep copy and prune.

    // Let's try the simpler approach first: Re-assigning the whole Page Tree is hard.
    // Instead, let's just make a new document from the selected pages.
    // Actually, lopdf's `doc.extract_pages` is relevant if we had it, but we don't.
    // Let's stick to the split_pdf logic: clone and modify.

    // Core logic:
    // 1. We have `new_pages` (ObjectIds).
    // 2. We need to reset the `Pages` dictionary to point to these.

    let pages_dict = result
        .get_object_mut(pages_id)
        .and_then(|o| o.as_dict_mut())
        .map_err(PdfError::Parse)?;
    pages_dict.set("Count", new_pages.len() as i32);
    pages_dict.set(
        "Kids",
        new_pages
            .iter()
            .map(|&id| Object::Reference(id))
            .collect::<Vec<_>>(),
    ); // Assuming flat tree for simplicity or that we just updated the root.
       // Note: If the original PDF has a nested page tree, this simply updating "Kids" on the root node
       // might break navigation if the Kids were intermediate nodes.
       // A robust solution is complex.
       // BUT, `lopdf` Documentation says `get_pages` returns all page objects.
       // If we just set "Kids" to all leaf page objects, we flatten the tree. This is valid PDF (mostly).

    // Update Parent reference for all pages to point to the root Pages object
    for page_id in &new_pages {
        if let Ok(page) = result.get_object_mut(*page_id) {
            if let Ok(dict) = page.as_dict_mut() {
                dict.set("Parent", Object::Reference(pages_id));
                // Also remove "Next", "Prev" if they exist?? Not usually strict for pages.
            }
        }
    }

    // Important: We need to remove pages that are NOT in `new_pages`?
    // `prune_objects` will remove objects not reachable from Catalog.
    // Since we updated Pages root to only point to `new_pages`, the others are now orphans.
    result.prune_objects();

    // Fix object renumbering (optional but good)
    result.save(output).map(|_| ()).map_err(PdfError::Io)
}

pub fn pdf_to_word<P: AsRef<Path>>(input: P, output: P) -> Result<(), PdfError> {
    use docx_rs::{Docx, Paragraph, Run};
    use std::fs::File;

    let doc = Document::load(input).map_err(PdfError::Parse)?;
    let mut docx = Docx::new();

    for page_id in doc.get_pages().values() {
        let content_data = doc
            .get_page_content(*page_id)
            .unwrap_or_else(|_| Vec::new());
        let content = Content::decode(&content_data).unwrap_or(Content { operations: vec![] });

        let mut text_buffer = String::new();

        for operation in content.operations {
            match operation.operator.as_str() {
                "Tj" | "TJ" | "'" | "\"" => {
                    // Collect text from operands
                    for operand in operation.operands {
                        if let Ok(text) = extract_text_from_object(&operand) {
                            text_buffer.push_str(&text);
                        }
                    }
                }
                "ET" => {
                    // End of text object, could add a newline or space
                    text_buffer.push(' ');
                }
                _ => {}
            }
        }

        // Add text to docx as a paragraph (very simple mapping)
        // Split by newlines to create separate paragraphs if needed,
        // but PDF text is often fragmented.
        if !text_buffer.trim().is_empty() {
            docx = docx.add_paragraph(Paragraph::new().add_run(Run::new().add_text(text_buffer)));
        }
        // Add a page break? docx-rs doesn't easily support page breaks in this simple API manner
        // without more verbose code, but separate paragraphs are a start.
    }

    let file = File::create(output).map_err(|e| PdfError::Io(e.into()))?;
    docx.build()
        .pack(file)
        .map_err(|e| PdfError::Operation(format!("Docx Error: {}", e)))?;

    Ok(())
}

pub fn pdf_to_images<P: AsRef<Path>>(
    input: P,
    output_dir: P,
    pdfium_path: P,
) -> Result<(), PdfError> {
    use pdfium_render::prelude::*;

    let input_path = input.as_ref();
    let output_base = output_dir.as_ref();

    // 1. Determine output sub-directory name
    let file_stem = input_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let target_dir = output_base.join(file_stem);

    if !target_dir.exists() {
        std::fs::create_dir_all(&target_dir)
            .map_err(|e| PdfError::Operation(format!("Failed to create output dir: {}", e)))?;
    }

    // 2. Initialize Pdfium
    let pdfium = Pdfium::new(
        Pdfium::bind_to_library(pdfium_path.as_ref().to_str().ok_or_else(|| PdfError::Operation("Invalid PDFium path".to_string()))?)
            .or_else(|_| Pdfium::bind_to_system_library())
            .map_err(|e| PdfError::Operation(format!("Failed to bind Pdfium at {:?}: {}. Please ensure pdfium.dll is correct and has required runtime dependencies.", pdfium_path.as_ref(), e)))?,
    );

    // 3. Load Document
    let document = pdfium
        .load_pdf_from_file(input_path, None)
        .map_err(|e| PdfError::Operation(format!("Failed to load PDF: {}", e)))?;

    // 4. Render Pages
    let render_config = PdfRenderConfig::new()
        .set_target_width(2000) // Set a reasonable high width for "HD" quality, aspect ratio preserved
        .set_maximum_height(2000)
        .rotate_if_landscape(PdfPageRenderRotation::None, true); // Auto rotate if needed? Maybe no, let's keep original

    for (i, page) in document.pages().iter().enumerate() {
        let bitmap = page
            .render_with_config(&render_config)
            .map_err(|e| PdfError::Operation(format!("Failed to render page {}: {}", i, e)))?;

        let image = bitmap.as_image(); // RgbaImage

        // 5. Save Image
        let image_filename = format!("{}_page_{:03}.png", file_stem, i + 1);
        let image_path = target_dir.join(image_filename);

        image
            .save_with_format(&image_path, image::ImageFormat::Png)
            .map_err(|e| PdfError::Operation(format!("Failed to save image: {}", e)))?;
    }

    Ok(())
}

fn extract_text_from_object(obj: &Object) -> Result<String, ()> {
    match obj {
        Object::String(bytes, _) => Ok(String::from_utf8_lossy(bytes).to_string()),
        Object::Array(arr) => {
            let mut s = String::new();
            for item in arr {
                if let Ok(text) = extract_text_from_object(item) {
                    s.push_str(&text);
                }
            }
            Ok(s)
        }
        _ => Err(()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use lopdf::content::{Content, Operation};
    use lopdf::{dictionary, Stream};

    fn create_dummy_pdf(path: &Path, pages: u32) -> Result<(), Box<dyn std::error::Error>> {
        let mut doc = Document::with_version("1.5");
        let pages_id = doc.new_object_id();
        let font_id = doc.add_object(dictionary! {
            "Type" => "Font",
            "Subtype" => "Type1",
            "BaseFont" => "Courier",
        });
        let resources_id = doc.add_object(dictionary! {
            "Font" => dictionary! {
                "F1" => Object::Reference(font_id),
            },
        });

        let mut page_ids = Vec::new();

        for i in 1..=pages {
            let content = Content {
                operations: vec![
                    Operation::new("BT", vec![]),
                    Operation::new("Tf", vec!["F1".into(), 48.into()]),
                    Operation::new("Td", vec![100.into(), 600.into()]),
                    Operation::new(
                        "Tj",
                        vec![Object::String(
                            format!("Page {}", i).into_bytes(),
                            lopdf::StringFormat::Literal,
                        )],
                    ),
                    Operation::new("ET", vec![]),
                ],
            };
            let stream = Stream::new(dictionary! {}, content.encode().unwrap());
            let stream_id = doc.add_object(stream);

            let page_id = doc.add_object(dictionary! {
                "Type" => "Page",
                "Parent" => Object::Reference(pages_id),
                "MediaBox" => vec![0.into(), 0.into(), 595.into(), 842.into()],
                "Contents" => Object::Reference(stream_id),
                "Resources" => Object::Reference(resources_id),
            });
            page_ids.push(Object::Reference(page_id));
        }

        let pages_dict = dictionary! {
            "Type" => "Pages",
            "Kids" => page_ids,
            "Count" => pages as i32,
        };
        doc.objects.insert(pages_id, Object::Dictionary(pages_dict));

        let catalog_id = doc.add_object(dictionary! {
            "Type" => "Catalog",
            "Pages" => Object::Reference(pages_id),
        });
        doc.trailer
            .set(b"Root".to_vec(), Object::Reference(catalog_id));

        let mut file = std::io::BufWriter::new(std::fs::File::create(path)?);
        doc.save_to(&mut file)?;
        Ok(())
    }

    #[test]
    fn test_split_pdf() {
        let dir = std::env::temp_dir().join("rust_pdf_test_split");
        if !dir.exists() {
            std::fs::create_dir(&dir).unwrap();
        }
        let input_path = dir.join("input.pdf");
        create_dummy_pdf(&input_path, 5).unwrap();

        let result = split_pdf(&input_path, &dir, "split", 1, 2).unwrap();
        assert_eq!(result.len(), 1);
        assert!(result[0].exists());

        // Verify page count of split result
        let doc = Document::load(&result[0]).unwrap();
        assert_eq!(doc.get_pages().len(), 2);
    }

    #[test]
    fn test_merge_pdf() {
        let dir = std::env::temp_dir().join("rust_pdf_test_merge");
        if !dir.exists() {
            std::fs::create_dir(&dir).unwrap();
        }
        let p1 = dir.join("p1.pdf");
        let p2 = dir.join("p2.pdf");
        create_dummy_pdf(&p1, 1).unwrap();
        create_dummy_pdf(&p2, 2).unwrap();

        let output = dir.join("merged.pdf");
        merge_pdf(&[p1, p2], output.clone()).unwrap();

        assert!(output.exists());
        let doc = Document::load(&output).unwrap();
        assert_eq!(doc.get_pages().len(), 3);
    }
}
