use pdf_core::{PdfError, merge, split};
use std::env;
use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        print_usage();
        return Ok(());
    }

    match args[1].as_str() {
        "split" => {
            if args.len() < 5 {
                println!("Usage: split <input> <start_page> <end_page> <output_dir>");
                return Ok(());
            }
            let input = PathBuf::from(&args[2]);
            let start: u32 = args[3].parse()?;
            let end: u32 = args[4].parse()?;
            let output_dir = PathBuf::from(&args[5]);

            if !output_dir.exists() {
                std::fs::create_dir_all(&output_dir)?;
            }

            println!(
                "Splitting {:?} pages {}-{} to {:?}",
                input, start, end, output_dir
            );
            let paths = split(&input, &output_dir, "split_output", start, end)?;
            for p in paths {
                println!("Created: {:?}", p);
            }
        }
        "merge" => {
            if args.len() < 4 {
                println!("Usage: merge <output_file> <input1> <input2> ...");
                return Ok(());
            }
            let output = PathBuf::from(&args[2]);
            let inputs: Vec<PathBuf> = args[3..].iter().map(PathBuf::from).collect();

            println!("Merging {:?} into {:?}", inputs, output);
            merge(&inputs, output)?;
            println!("Done.");
        }
        _ => print_usage(),
    }

    Ok(())
}

fn print_usage() {
    println!("PDF CLI Example");
    println!("Commands:");
    println!("  split <input> <start_page> <end_page> <output_dir>");
    println!("  merge <output_file> <input1> <input2> ...");
}
