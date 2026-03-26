# EasyWed — Development Log

## 26.03.2026

After building a prototype I am happy with, I started to clean up the code to the point I feel good about maintaining it.

Started with project / structure setup and making some assumptions about the project based off a prototype.
I want to keep it simple for as long as possible as well as ofcourse try some new things, like `zustand`.

- Set up a `planner-refactor` route to build a planner with less code and more maintainability.
- Set up zustand and small stores for `global` values, `planner` tied to Planner route and a `dialog` store to centralize dialog controls (like I mentioned in the comment in dialog store - I don't know particular caveats of using dialogs like this, so wanted to pick up my poison of this taste)
