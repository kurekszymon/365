#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn area(&self) -> u32 {
        dbg!(self.width) * self.height
    }
    fn can_hold(&self, other_rect: &Rectangle) -> bool {
        other_rect.height < self.height && other_rect.width < self.width
    }
    fn square(size: u32) -> Rectangle {
        Rectangle {
            width: size,
            height: size,
        }
    }
}

fn main() {
    let rect = Rectangle {
        width: 40,
        height: 32,
    };
    let rect2 = Rectangle {
        width: 20,
        height: 16,
    };
    let rect3 = Rectangle {
        width: 50,
        height: 16,
    };

    println!(
        "The area of the rectangle is {} square pixels.",
        rect.area()
    );

    println!("rect is {rect:?}");
    dbg!(&rect);
    dbg!(&rect.can_hold(&rect2));
    dbg!(&rect.can_hold(&rect3));
    dbg!(Rectangle::square(40));
}
