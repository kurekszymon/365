use std::cmp::Ordering;
use std::io;

mod guessing;

fn main() {
    println!("Guess the number!");
    let secret_number = rand::random_range(1..=100);

    dbg!(secret_number);
    loop {
        println!("Please input the number!");
        let mut guess = String::new();
        io::stdin()
            .read_line(&mut guess)
            .expect("Failed to read line");

        let guess: i32 = match guess.trim().parse() {
            Ok(num) => num,
            Err(_) => continue,
        };

        let guess = guessing::Guess::new(guess).value();
        println!("You guessed: {guess}");

        match guess.cmp(&secret_number) {
            Ordering::Less => println!("Too small!"),
            Ordering::Greater => println!("Too big!"),
            Ordering::Equal => {
                println!("You win!");
                break;
            }
        }
    }
}
