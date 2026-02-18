use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();

    scores.insert(String::from("Blue"), 10);
    scores.insert(String::from("Yellow"), 50);
    let blue = scores.entry(String::from("Blue")).or_insert(20);
    *blue += 2; // dereference pointer to existing key `Blue`

    println!("scores: {scores:?}");
    println!("score: {0:?}", scores["Blue"]);
    let scores = dbg!(scores);

    let team_name = String::from("Blue");
    let score = scores.get(&team_name).copied().unwrap_or(0);

    dbg!(score);

    for (key, value) in &scores {
        println!("{key}: {value}");
    }
}
