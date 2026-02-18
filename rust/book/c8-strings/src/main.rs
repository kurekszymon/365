fn main() {
    let mut s = String::new();
    s.push('1'); // vector of bytes accepts a byte
    s.push_str(" string "); // can do push str too
    let s2 = String::from("hello from s2");

    s.push_str(&s2);

    let s3 = s + &s2;

    println!("s3 is {s3}");
    let _s = "initial contents".to_string();

    let s1 = String::from("tic");
    let s2 = String::from("tac");
    let s3 = String::from("toe");

    let s = format!("{s1}-{s2}-{s3}");
    println!("tic tac toe: {s}");

    for i in s.chars() {
        println!("i is {i}");
    }
}
