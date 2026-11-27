---
title: "05: one commit at a time 🚧 -- WIP"
description: "what I learned through forcing myself to think of programming every day"
pubDate: "Dec 31, 2026"
---

Last year I was playing one of my favorite games a little bit too much.

It's an MMORPG, so you can basically do whatever you want. Powerlevel, explore the lore, dig into some secrets and unsolved mysteries (highly recommend some you could find on fanpages, like [469 by Antonio Stradivarius](https://tibiasecrets.com/article160), or [Serpentine Tower by Meadek](https://tibiasecrets.com/article141)) - for me the most interesting thing was completing a bestiary.

Bestiary is not something unique to this game, and for those who don't know it's basically an encyclopedia in which you unlock entries by repeatedly killing a monster. Every monster has 3 stages, and depending on the difficulty, you'd need to kill between 25 and 5000 creatures of the same type. Seems boring, but I found it somewhat fascinating.

Every day before work, I found myself playing this game just to progress with the bestiary. When I got to top 100, I had already unlocked all the harmless, trivial and easy monsters, so each entry started to be more tedious and time consuming.

![top 100 bestiary on Antica](../../assets/top100-bestiary.png)

I thought to myself that if I spent this hour focusing on programming related activities I would be even better than I was. And so I decided that before playing a game I would make at least one commit.

Rules are simple:

- it doesn't have to be big,
- it just has to make me sit down and think about what I want to do

It can be anything: a project change, some API / programming language I want to try, writing a blog post, or reading something interesting that I want to save somewhere I can find (because my notetaking is really shitty).

## December and January

I started 8th of December 2025, and on 1st of January I created [365](https://github.com/kurekszymon/365). A repo I've committed to every day since. And oh boy, was it worth it.

![github contribution chart](../../assets/github-contribution.png)

At first it didn't look like much. I wanted to give Bun a try, because of their [single-file executable](https://bun.com/docs/compiler/executables). I have a weird love for the single file entry, and it felt like _57MB Hello World_ magic. Started to port my existing project I'd built in C++, then rebuilt in Go, to TypeScript.

![57 MB magic](../../assets/57MB-magic.png)

I would drop Bun after [their agentic migration to Rust](https://bun.com/blog/bun-in-rust) later in 2026, but that's beside the point.

![rewrite bun in rust PR](../../assets/rewrite-bun-in-rust.png)

I realized that everything feels like magic if you don't understand it enough. I thought that the engineer that designed the system I worked on through 2025 was a genius, I couldn't understand how they got a C++ WASM app to communicate over something called `InterTabCommunication` between two instances of the app. I imagined some super complex, custom written C++ protocol to solve this unimaginably hard (for me) problem.

And when you are working to make your target platform better and within deadlines, there is a tradeoff between understanding and delivery, so I didn't have the time to properly investigate it on my own.

Then at the end of the year, I needed to make some changes to a WebRTC + Java Backend project and stumbled upon this sprinkle of magic, which is [BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel).

The whole year I thought I was just following some genius's footsteps and then poof - it's just a builtin Web API. I felt so dumb and so empowered at the same time. You don't need a genius. You need someone who knows what to look for. _Even if it's something obscure_.

<!-- ![some bc img]() -->

And so I started to dig into Web APIs:

- BroadcastChannel
- WebRTC
- WebGL
- Canvas
- OffscreenCanvas
- localStorage
- IndexedDB
- etc.

...and also to better align with my work profile

- C++ and emscripten

Work projects change, and once again I was left without a reason to study for work.

But hey, besides all that I was able to score my first OSS contributions to [electron/electron](https://github.com/electron/electron/commit/24526ccd390664a005a93dd464cc774e6a868977) and [electron/packager](https://github.com/electron/packager/commit/13d93d35415b37045121fb42cd15a75d23e60a68), giving it a go to better understand so-called InterProcessCommunication and stuff around desktop apps and webviews. I think it's cool.

## February - March

I spent my time checking out Rust: reading [the Rust Book](https://doc.rust-lang.org/book/), doing rustlings, trying out code editors since I was annoyed with VS Code and even trying to write my own in Rust!

Not because I'm good enough to write my own editor, but because it was right around the [Opus 4.6 release](https://www.anthropic.com/news/claude-opus-4-6).

![claude opus 4.6 release headline](../../assets/claude-opus-4.6.png)

I remember sitting on the train to Warsaw for the WarsawJS conference, with [Zed](https://zed.dev) open and just being amazed by how good this model was. At the same time I was vibing my code editor, creating _this page_ (still manually, with Astro, since my attention span back then limited me to only one agent) and writing my first blog post [git got good](/01-git-got-good).

I was comparing Rust to C++ I worked with in 2025, learned some new data structures, and even made a working ~~code~~ text editor.

That's when I decided to put real time into learning to work with agents. Until then I was either too ignorant, or the models weren't good enough, to even consider it.

_Opus 4.6 changed me, for sure_.

As a sidenote, after trying multiple code editors, like aforementioned Zed, Neovim or Cursor, I decided to finally stick with VSCode. I'm really proficient with it, and spending time to learn different editors felt like a waste of time, especially since all of them are similar but very different. I will probably write a post about it in the future, and if I do I'll link it here.

In March I also tried diving more into backend, trying to reproduce PostHog's session replays with rrweb and Fastify. Touched some Java and PHP and since we started to plan the wedding, and my spatial imagination is worse than a 7-year-old's - I started to write easywed. and that's what taught me the most this year.

## April - October (being the product owner?)

easywed. started as something to just visualize how much space we'd have for the dancefloor given constraints of the wedding hall and amount of guests we'd invite to our wedding. It would then evolve to whatever was needed for our wedding - who is seated at which table, how much room we have, how many kids are there and who's vegetarian (of course we didn't mark everyone correctly).

It was such a great journey, we had so much fun planning our wedding with a tool I had total control over. easywed. evolved so much that I was willing to showcase it to other people - I was showing it to family, friends, and even recruiters that wanted me to work on different projects.

As a person that always seeks opportunity to make their own product, I thought to myself - this is it. That's finally something I was looking for ever since I started programming. Vibecoded tool, rewritten manually, back to AI development, back to refactoring, evolving into a whole startup with CRM for wedding venues and wedding planners... I was really proud of it.

I started to reach out to wedding planners and... nothing! no response but a few likes and a few dms exchanged. I offered this product for free to wedding planners and got no answer, even when I tailored it for the needs I saw on their Instagram stories, with no further recognition.

I think that if a person doesn't need to invest anything in your product - it has no value to them. So I changed my strategy. I started to offer it for free to couples, or to anyone on the internet, and decided I'd develop a CRM for wedding venues, since they still operate on outdated Excel sheets or pieces of paper.

Changes were made, easywed. was deployed and I started to make some videos with Remotion, posting on Instagram and TikTok and wedding planners signed up on their own - even ones who never replied when I reached out months earlier. Social media has a real influence, even if you don't think of it this way.

easywed. gained momentum, I felt that too. I applied for startup programmes for PostHog and Web Summit. Got accepted for both. It really felt amazing.
