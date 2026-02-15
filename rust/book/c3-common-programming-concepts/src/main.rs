fn main() {
    let x = 5;

    let x = x + 1;

    {
        let x = x * 2;
        println!("The value of x in the inner scope is: {x}");
    }

    println!("The value of x is: {x}");

    let x = 2.0; // f64
    println!("The value of x is: {x}");

    let y: f32 = 3.0; // f32
    println!("The value of y is: {y}");

    // addition
    let sum = 5 + 10;
    println!("The value of  5 + 10; is: {sum}");

    // subtraction
    let difference = 95.5 - 4.3;
    println!("The value of 95.5 - 4.3 is: {difference}");

    // multiplication
    let product = 4 * 30;
    println!("The value of 4 * 30 is: {product}");

    // division
    let quotient = 56.7 / 32.2;
    println!("The value of 56.7 / 32.2; is: {quotient}");

    let truncated = -5 / 3; // Results in -1
    println!("The value of -5 / 3; is: {truncated}");

    // remainder
    let remainder = 43 % 5;
    println!("The value of 43 % 5; is: {remainder}");

    let _t = true;
    let _f: bool = false; // with explicit type annotation

    let _c = 'z';
    let _z: char = 'ℤ'; // with explicit type annotation
    let _heart_eyed_cat = '😻';

    let tup = (500, 6.4, 1);
    // tup.1 = 6.5; -> if marked with mut. tuples can't shrink or grow, but can be mutated if marked accordingly
    let (x, y, z) = tup;

    println!("The value of x, y, z  is: {x} {y} {z}");

    let a = [1, 2, 3, 4, 5];
    println!("value of arr {0}", a[1]);

    // functions
    print_labeled_measurement(1, 'h');
    print_expr();
    // control flow
    branches();
    // loops
    loops();
}

fn print_labeled_measurement(value: i32, unit_label: char) {
    println!("The measurement is: {value}{unit_label}");
}

fn print_expr() {
    let y = {
        let x = 3;
        x + 1
        // If you add a semicolon to the end of an expression, you turn it into a statement,
        // and it will then not return a value.
    };

    println!("expression of y is {y}")
}

fn branches() {
    let number = 3;

    if number < 5 {
        println!("condition was true");
    } else {
        println!("condition was false");
    }

    let _number = if number == 3 { 5 } else { 6 };
}

fn loops() {
    let mut counter = 0;

    let result = loop {
        counter += 1;

        if counter == 10 {
            break counter * 2;
        }
    };

    println!("`loop` result is {result}");

    let mut number = 3;

    while number != 0 {
        println!("{number}!");

        number -= 1;
    }
    println!("countdown finished!");

    // use for in range.rev() instead of while
    for number in (1..4).rev() {
        println!("{number}!");
    }
    println!("LIFTOFF!!!");

    let a = [10, 20, 30, 40, 50];

    for element in a {
        println!("the value in arr is: {element}");
    }

    for idx in 0..a.len() {
        println!("access array index {idx} and element: {0}", a[idx]);
    }

    for n in 1..=5 {
        println!("for {n} in range 1..=5");
    }
}
