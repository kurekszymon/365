fn main() {
    let mut v: Vec<u8> = Vec::new();

    v.push(255);

    let mut v = vec![1, 2, 3];

    println!("V is {v:?}");

    let third: &i32 = &v[2];
    println!("The third element is {third}");

    let third: Option<&i32> = v.get(2);
    match third {
        Some(third) => println!("The third element is {third}"),
        None => println!("There is no third element."),
    }

    if let Some(s) = &v.get(5) {
        println!("Hello! {s}");
    } else {
        println!("out of range");
    }

    for i in &v {
        println!("{i}");
    }

    for i in &mut v {
        *i += 50;
    }

    for i in &v {
        println!("{i}");
    }

    #[derive(Debug)]
    enum SpreadsheetCell {
        Int(i32),
        Float(f64),
        Text(String),
    }

    // use Enum variants to define different typs in vector
    let row = vec![
        SpreadsheetCell::Int(3),
        SpreadsheetCell::Text(String::from("blue")),
        SpreadsheetCell::Float(10.12),
    ];

    for i in &row {
        println!("-- {i:?}");
        match i {
            SpreadsheetCell::Int(n) => println!("Int: {}", n),
            SpreadsheetCell::Float(f) => println!("Float: {}", f),
            SpreadsheetCell::Text(s) => println!("Text: {}", s), // `s` is owned
        }
    }
}
