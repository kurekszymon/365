# notes

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
