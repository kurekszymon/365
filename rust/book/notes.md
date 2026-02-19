# notes

## note on notes

instead of scrolling down to write a note i just write it on top (pushing it on the stack);
if it's desired to consume this section, mind that more complex things (furthr in book) will be on top.

## actual notes

- to propagate an error it is possible to use `?` operator (only in functions that return `Result<T, E>`) like

```rs
fn read_username_from_file() -> Result<String, io::Error> {
    let mut username = String::new();
    File::open("hello.txt")?.read_to_string(&mut username)?;
    Ok(username)
}
```

- there is an option to return (propagate) the error, similarly to `go` convention
- there is verbose error handling with i.e. `match` or easy, defaulting to `panic!` with `unwrap` or `expect` to provide custom erorr message
- rust distinguishes 2 types of errors - recoverable handled by `Result<T,E>` and unrecoverable with `panic!`
- it is possible to retrieve a value from hashmap or set it if it doesnt exist

```rs
let blue = scores.entry(String::from("Blue")).or_insert(20);
// this will return a mutable reference to an Entry that can be modified like
*blue += 2;

```

- HashMap needs to have same types for keys and same types for value `HashMap<K,V>;`
- creating string slices with ranges is dangereous, as String doesn't support indexes, rather it splits by _bytes_
- there are a lot of methods of string concatenation like

```rs
s.push('1');
s.push_str(" string ");
let s3 = s + &s2; // takes ownership of s, takes reference to s2
let s = format!("{s1}-{s2}-{s3}"); // doesn't take reference, easily tracable
```

- it's possible to reexport modules brought with `use` like `pub use std::collections::HashMap`
- marking `enum` as `pub` makes all it fields `pub`
- marking `struct` as `pub` only makes the `struct` public, all internal fields stay private. it's required to mark each field `pub`
- [read more on imports](rust/book/c7-crates-restaurant/src/lib.rs)
- it is possible to import from parent by prefixing an import with `super::`
- absolute paths for imports are prefixed with `crate`
- module contnts are _private_ by default - need to explicitly mark them as `pub`
- enums can hold data, for mental model it can be used instead of

```rs
enum IpAddrKind {
      V4,
      V6,
  }

struct IpAddr {
    kind: IpAddrKind,
    address: String,
}

// instead use
enum IpAddr {
    V4(String)
    V6(String)
}

// and then access with `match` or `if let`
 let home = IpAddr::V4(String::from("127.0.0.1"));
match home {
    IpAddr::V4(str) => {
        println!(" Matched ipv4: {str}")
    }
    _ => (), // exhaustive / catch - all
}

let home6 = IpAddr::V6(String::from("::1"));

if let IpAddr::V6(addr) = home6 {
    println!("matched ipv6 {addr}")
} else {
    println!("didnt match : (") // happens when home6 resolves to IpAddr::V4
}
// or return early with let else
fn option_fn() -> Option<i32> {
    let home = IpAddr::V4(String::from("127.0.0.1"));

    let IpAddr::V6(_) = home else {
        println!("return early");
        return None;
    };

    return Some(5);
}
```

- associated functions that don't take &self as first argument are most commonly used to create the instance
- `dbg!` macro takes ownership of an argument (as opposed to `println!` )
- it is possible to `pritnln!` structs if a struct `#[derives(Debug)]` trait
- in idiomatic Rust, functions do not take ownership of their arguments unless they need to
- rules of references
  - At any given time, you can have either one mutable reference or any number of immutable references.
  - References must always be valid.
- it is not possible to modify borrowed (like - const std::string& value?)
- unless it's marked as mutable like (some_string: &mut String), so opposite of cpp where you need to mark it as const
- unlike a pointer, a reference is guaranteed to point to a valid value of a particular type for the life of that reference
- you can use a value without transferring ownership by using a references
- it is possible to return more than one thing by using a tuple

```rs
fn calculate_length(s: String) -> (String, usize) {
    let length = s.len(); // len() returns the length of a String

    (s, length)
}
```

- variables on the stack are copied i.e.

```rs
let i = 8;
let i2 = i; // make a copy of i
```

but variables on the heap are being transferred

```rs
let d = String::from("hello");
let e = d;
// d is no longer valid here
// for easier mental memory (maybe i dont understand cpp to proper level, but I think of it as
// auto e = std::move(d))
```

it is possible to make a deep copy with

```rs
let d = String::from("Hello");
d.clone();
```

- ownership rules (seems like unique pointer?)
  - Each value in Rust has an owner.
  - There can only be one owner at a time.
  - When the owner goes out of scope, the value will be dropped.
- heap is slower than stack as you need to allocate data and follow the pointer
- data with _unknown size_ must be stored on the HEAP
- data stored on STACK must have _fixed size_
- machine code generated from for loops can be more efficient as well because the index doesn’t need to be compared to the length of the array at every iteration. (but it can)
- loops can be labeled (to distingiush which loop to break out from)
- `if` is an expression, so it can be used to assign values in `let` block (seems similar to ocaml?)

```rs
let number = if condition { 5 } else { 6 };
// assigning different types won't work
let number = if condition { 5 } else { "hello" };
```

- variables are not coerced, i.e.

```rs
let number = 3;
if number {
    // this fails to compile
}
// need to be explicit and do
//
if number != 0 {
    // this works
}
```

- expressions with semicolon become statement

```rs
  let y = {
        let x = 3;
        x + 1 // returns 4
        x + 1; // returns ()
        // If you add a semicolon to the end of an expression, you turn it into a statement,
        // and it will then not return a value.
    };
```

- stack (arr) v heap (vector)
- u8-u128; i8-i128;
- use [value; size]; to declare array (MIND THE ;)
- data types: `scalar` (int, float, bool, char) and `compound` (tuple, array)
- variables are shadowed
- const
  The type of constants must always be annotated, like `const NUMBER: i32 = 3`

- match:
  instead of crashing the program on unsuccessful operation with expect

```rs
let guess: u32 = guess.trim().parse().expect("Expect message");
```

it is possible to `match

```rs
loop {
    let guess: u32 = match guess.trim().parse() {
        Ok(num) => num,
        Err(_) => continue,
    }
}
```
