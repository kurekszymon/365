struct User {
    active: bool,
    username: String,
    email: String,
    sign_in_count: u64,
}

// tuple structs to not name each field but to give an insight on what's that.
struct Color(i32, i32, i32);
struct Point(f64, f64, f64);

fn main() {
    println!("Hello, world!");
    let mut user = create_user(String::from("username"), String::from("email"));

    user.sign_in_count = 1542;

    let user2 = spread_user(user);
    println!("user {0}", user2.email);

    let black = Color(0, 0, 0);
    let origin = Point(0.0, 0.0, 0.0);
}

fn spread_user(user: User) -> User {
    let local_user = User {
        email: String::from("email2"),
        ..user
    };

    local_user
}
fn create_user(username: String, email: String) -> User {
    let user = User {
        active: true,
        username,
        email,
        sign_in_count: 132,
    };

    user
}
