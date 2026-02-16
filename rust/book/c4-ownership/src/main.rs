fn main() {
    let (s1, length) = gives_ownership(); // gives_ownership moves its return value into s1
    println!("length is {length}");

    let s2 = String::from(s1); // s2 comes into scope

    let s3 = takes_and_gives_back(s2); // s2 is moved into
    // takes_and_gives_back, which also
    // moves its return value into s3
    //
    let x = 5;
    makes_copy(x);

    println!("s3 {s3}");

    let s4 = String::from("hello");

    let len = calculate_length(&s4);

    println!("The length of '{s4}' is {len}.");

    let (sliced, sliced2) = slices(&s4);
    println!("sliced {sliced} sliced2 {sliced2}")
} // Here, s3 goes out of scope and is dropped. s2 was moved, so nothing s1 goes out of scope and is dropped.

fn _strings_and_slices() {
    let my_string = String::from("hello world");

    // `first_word` works on slices of `String`s, whether partial or whole.
    let word = first_word(&my_string[0..6]);
    println!("word {word}");
    let word = first_word(&my_string[..]);
    println!("word {word}");
    // `first_word` also works on references to `String`s, which are equivalent
    // to whole slices of `String`s.
    let word = first_word(&my_string);
    println!("word {word}");

    let my_string_literal = "hello world";

    // `first_word` works on slices of string literals, whether partial or
    // whole.
    let word = first_word(&my_string_literal[0..6]);
    println!("word {word}");
    let word = first_word(&my_string_literal[..]);

    println!("word {word}");
    // Because string literals *are* string slices already,
    // this works too, without the slice syntax!
    let word = first_word(my_string_literal);

    println!("word {word}");
}

fn first_word(s: &str) -> &str {
    s
}

fn slices(s: &String) -> (&str, &str) {
    let hello = &s[0..=3];
    let entire = &s[..];

    (hello, entire)
}

fn calculate_length(s: &String) -> usize {
    s.len()
}

fn gives_ownership() -> (String, usize) {
    // gives_ownership will move its
    // return value into the function
    // that calls it

    let some_string = String::from("yours"); // some_string comes into scope
    let length = some_string.len();

    (some_string, length) // some_string is returned and  moves out to the calling function
}

// This function takes a String and returns a String.
fn takes_and_gives_back(a_string: String) -> String {
    // a_string comes into
    // scope

    a_string // a_string is returned and moves out to the calling function
}
fn makes_copy(some_integer: i32) {
    // some_integer comes into scope
    println!("{some_integer}");
} // Here, some_integer goes out of scope. Nothing special happens.
