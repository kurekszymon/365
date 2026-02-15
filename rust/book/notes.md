# notes

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
