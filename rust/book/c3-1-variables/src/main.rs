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
    println!("value of arr {0}", a[1])
}
