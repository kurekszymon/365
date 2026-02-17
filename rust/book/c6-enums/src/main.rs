enum IpAddr {
    V4(String),
    V6(String),
}

fn main() {
    let home = IpAddr::V4(String::from("127.0.0.1"));
    match home {
        IpAddr::V4(str) => {
            println!(" Matched ipv4: {str}")
        }
        _ => (),
    }

    let home6 = IpAddr::V6(String::from("::1"));

    if let IpAddr::V6(addr) = home6 {
        println!("matched ipv6 {addr}")
    } else {
        println!("didnt match : (")
    }

    option_fn();
}

fn option_fn() -> Option<i32> {
    let home = IpAddr::V4(String::from("127.0.0.1"));

    let IpAddr::V6(_) = home else {
        println!("return early");
        return None;
    };

    return Some(5);
}
