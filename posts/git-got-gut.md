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

## amend (don't let them know you've been working overnight)

Amending a commit is the most lightweight version of reversibility used by me. To me it somehow resembles this plane taking off without passengers meme - changes are commited, but not complete. 
Amend works in both cases (local / pushed to remote) - with a difference of a force push (local changes you can just amend, when you are amending commit that's already pushed to the remote, you edit tip of your HEAD, meaning you need to overwrite origin HEAD). 
Whenever you forget to add tracked files, stage changes, you've misspeled your commit message, or (my personal favorite) you don't want your colleagues to know that you've been working over time so you want to overwrite commit date - `git commit --amend` is your friend. 

```sh
git commit --amend # adds staged changes and opens default text editor so you can change message
git commit --amend --no-edit # adds staged changes to your last commit without changing message
git commit --amend -m "message" -m "description" -m "paragraph" # adds staged changes to your last commit and edit commit message in place
```

--- 

Out of every method resolving around reversibility, I think amend is my most commonly used command. Whether I forget to stage files, want to overwrite commit date, or don't want to run CI/CD more than once (commit -> build -> squash -> build -> merge ), I'd just amend commit and force push it to the remote presquashed. It's not a must have tool in your belt, but it's pretty convenient if you ask me. 

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

## reset (the goat)

`git reset` allows you to reverse what you did in previous commits (including staged and unstaged changes, depending on the flag you pass to it)

while writing this article I looked up docs for git reset, to confirm if I was using it correctly, and I learned there are three more flags on top of what I use (five in total).

I'll only focus on the three options I use (I incorporated `--mixed` after looking at the docs), skipping remaining two since I don't want to cover something I don't know.

- soft (`git reset --soft HEAD~X`) rewinds current branch by *X* commits but keeps all your work (files/changes) in your working tree and staged - known by git basically. After running this command you can run `git commit -m 'msg'` to effectively SQUASH your commits. (I'd also choose this over `git rebase -i HEAD~x`)
- mixed (`git reset --mixed HEAD~X`) is the default option, it works similarly to `soft`, but your files won't be on the index (staged), so running `git add` before `commit` is necessary.
- hard (`git reset --hard HEAD~X`) can be dangereous. In addition to rewinding commits, you will also lose *all* uncommited and *all* untracked changes. As far as I know there is no way to recover them.

---

Personally I use `git reset` in various situations. Whether I want to squash my changes, or I need to rebase and I don't want to deal with not important conflicts I'd do
```sh
git reset --soft HEAD~X && git stash && git rebase <target> && git stash apply
```

Just remember, that after rewinding your commits with reset, you'd need to `push --force` or `push --force-with-lease`.
Not everything goes smoothly with resets and rebases, sometimes you push wrong state to the remote branch, and that's why you can always rely on the bookkeeping:

## reflog (time machine)

Whatever (that changes HEAD) you do in git is being tracked. Fortunately for you, it's not your personal data, processed by some company, but local history of your edits. One can see it as a safety net, where all else has failed you.

result of `git reflog` 
```sh
5f6e9f4 (HEAD -> main, origin/main, chore/show-reflog) HEAD@{0}: checkout: moving from main to chore/show-reflog
5f6e9f4 (HEAD -> main, origin/main, chore/show-reflog) HEAD@{1}: commit: posts: git-got-gut small tweaks
2be797d HEAD@{2}: commit: mds: [WIP] git-got-gut
5f99db1 HEAD@{3}: commit: mds: [WIP] git-got-gut: reset
```

what's most interesting there for the user is the hash on the left hand side that let you go back in time to specific HEAD change. It does allow you to "revert" something you've already force pushed to remote.

going back in time using `git reflog`: 
```sh
git reset --hard 2be797d 
git log 
# should display changes FROM the commit you've passed to git reset --hard

commit 2be797ded3e9bea998ffd1d79771fc7b92f0e1e7
Author: Szymon Kurek
Date:   Thu Jan 29 22:37:03 2026 +0100

    mds: [WIP] git-got-gut

commit 5f99db1202fbf09128b5098fd87ca9daead0b3df
Author: Szymon Kurek
Date:   Thu Jan 29 22:34:12 2026 +0100

    mds: [WIP] git-got-gut: reset
```
