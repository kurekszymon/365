# git got gut


## preface
*you need to be familiar with git* - that's just the requirement nowadays - whether you are an experienced engineer or just getting started.
using it doesn't need to be complicated - it was created in 3 days, after all - but sometimes can be overwhelming.
there are countless videos, articles, tips and tricks on how to use `git` efficiently, but all those materials rarely touch on the fact that made using it easier for me mentally - *almost* everything is reversible.

if you were to follow a *proper* route of learning `git` and after [downloading git](https://git-scm.com/install/) you'd click on [Learn->Book](https://git-scm.com/book/en/v2), and read it, you would learn how to [undo things](https://git-scm.com/book/en/v2/Git-Basics-Undoing-Things) or [how to rewrite history](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History) or [that you shouldn't be worried to use reset](https://git-scm.com/book/en/v2/Git-Tools-Reset-Demystified) and that is super useful! I don't know anyone who did it though.

whether you are using cli or some desktop client like Sourcetree or GitHub Desktop I think being aware of reversibility of commands can be beneficial for your work with this tool.

## ⚠️ note

this will be solely based on my experience and the way I like to work with git. it's not the cleanest, most perfect way of doing that, it's just super comfortable for the user (me).

## assumption

like in all cases, one needs to make *some* assumptions about the end user / consumer. while I don't expect any consumers of this article (besides those I've forcefully requested to read it - sorry guys - and github does have statistics for page views, so I will be able to tell whether or not you opened a link).

I would the reader knows at least basics of git.
- pull
- switch / checkout
- add
- commit
- push

other than that I think it should be fairly easy to understand what I'm trying to convey

## revert (and why it's not what you may think)

When I initially stumbled upon `git revert` I thought that's exactly what I need - to revert changes I pushed making a fool out of myself. Pocketing my pride I typed `git log`, copied first hash that appeared in my terminal and passed it to `git revert {hash}`.
```sh
[master 478a0082a] Revert "shameful commit"
 2 files changed, 5 insertions(+), 21 deletions(-)
```
looks pretty darn good if you ask me. Time to `git push` that thing.

```sh
commit 478a0082a638ecf5bb290fd967def009596e31b8 (HEAD -> master)
Author: Szymon Kurek
Date:   Wed Jan 28 17:52:37 2026 +0100

    Revert "shameful commit"

    This reverts commit ce3a42a28266959497bfb4e9a0c84114029d2eab.

commit ce3a42a28266959497bfb4e9a0c84114029d2eab
Author: Szymon Kurek
Date:   Sun Jan 28 16:59:41 2026 +0100

    shameful commit
```

Oh my lord - now there are two commits showing what an incompetent dev I am :'(.

---

while I find using `revert` good for actually reverting changes that introduce bugs and problems on master/RC branch (to be explicit about the intent), using revert on your local branch is usually not the solution you're looking for.

what I really needed in this case was good ol'

## reset
