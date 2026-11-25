---
title: "04: create your tickets kids"
description: "impact is measured in tickets, not fixes"
pubDate: "Nov 24, 2026"
---

I don't like doing things around the stuff I need to do. I don't like ironing my shirts, I don't like to peel mushrooms and I don't like Jira. I get _why_ you should do all that, but I just think of these as a waste of time.

When I first notice a bug or potential improvement I try to unblock others or make my product better for those who use it. So I often backfill tasks and Jira is happy.

Recently I was asked if I can unblock another engineer at work. The product that I'm responsible for developing is a VSCode extension that helps with local development of other internal products. Because of a bug, the internal project couldn't be opened: the server returned 404 and the extension didn't know how to handle it.

The naive solution was to wrap the call in a try/catch. Resources can be downloaded on demand anyway, so if one is missing, just leave it on the remote.

It couldn't break anything else, and it fixed a bug that made it _impossible_ to do anything.

Got it reviewed and merged in under 30 minutes, told the reporter he could install the latest version (as easy as running `> Check for updates` from command palette). I wasn't expecting a thank you, but I also wasn't expecting him to ask:

> Is there any PR / QA testing process in your team?

Brother. PR has a video of it working.

So for the next time I should probably create a ticket, add it for planning and let the guy wait two weeks.

Create your tickets kids, corporate Szymon is back.
