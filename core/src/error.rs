use thiserror::Error;

#[derive(Error, Debug)]
pub enum PdfError {
    #[error("IO Error: {0}")]
    Io(#[from] std::io::Error),

    #[error("PDF Parse Error: {0}")]
    Parse(#[from] lopdf::Error),

    #[error("Invalid Page Number: {0}")]
    InvalidPage(u32),

    #[error("Operation Error: {0}")]
    Operation(String),
}
