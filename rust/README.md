# rust

## project

- get familiar with rust fundamentals with [the book](https://doc.rust-lang.org/book/)
- write my own code editor (crazy idea probably)
  - [x] use GUI framework (~~floem (lapce)~~ / GPUI)
  - [x] text editor
  - [x] file explorer
  - [ ] git explorer
  - [ ] global search with regex
  - [x] command palette (`> Format document` + custom commands)
  - [x] file palette (open any file with cmd p, jump to line `:42`)

## 03.03

- add history of changes to support undo/redo operation (snapshot stack)

## 02.03

- replace String FsNode.rel_path with Arc<str> to not clone a value for each member of a file tree
- add mouse/touch interaction - click to navigate, drag to select, select line on gutter click
- backdrop for command palette (click outside to close)

## 01.03

- split code to smaller modules
- add command/file/actions palette

## 28.02

- add ability to save a file
- create a new file with native dialog

## 27.02

- add option to collapse dirs
- add collapse/expand all dirs
- use `FsNode` instead of tuple to represent filetree
- update file-tree docs to use `FsNode` and `PathBuf.join`

## 26.02

- add scrollbar for editor and file explorer
- add drag to scroll
- add click to scroll

## 25.02

- add option to scroll the editor using `on_scroll_wheel`
- cache file tree, add virtual scroll for performance

## 24.02

- added autoscroll for x and y plane (only keyboard)
- show files from current directory in file explorer

## 23.02

- limit copies (new allocations) for rope->string
- don't hide cursor on selection

## 22.02

- split main to logical chunks - editor and workspace
- add docs for (row, col) -> char offset change
- fix selection width

## 21.02

- refactor editor to use char-based cursor with selection support

## 20.02

- add base ui
- replace `Vec<String>` with `Rope`

## 19.02

- [book] chapter 9 - Error Handling
- `vvscode`: init

## 18.02

- [book] chapter 7 - Managing Growing Projects with Packages, Crates, and Modules
- [book] chapter 8 - Common Collections
- rustlings C5

## 17.02

- [book] chapter 5 - Using Structs to Structure Related Data
- [book] chapter 6 - Enums and Pattern Matching

## 16.02

- [book] chapter 4 - Understanding Ownership
- rustlings C4

## 15.02

- [book] complete chapter 3 - Common Programming Concepts
- rustlings for functions and ifs + quiz

## 14.02

- get started with the book and `rustlings`
- [book] first two chapters
- book chapters 3.1, 3.2
