# cpp

over 2025 i did get a chance to work on project using WebAssembly (C++), which got me interested in it, for god know's why.

i want to keep journal on what I did each day for this part especially to see if I get better understanding of a language or will I drop it soon after.

## goals

goals for this part of the repo would probably be changed / added over the time i will work on this.

initially I wanted to have a set of tools to just do "fun" stuff, like image/video processing, with opencv and ffmpeg.
with my background in web development I do like to have web version of a project im working on, and with opencv and ffmpeg it's not so easy to have it working with webassembly.
I've decided I will work on this project from time to time instead, to work on my DSA skills, using problems from leetcode.
To not only solve leetcode problems I would like to have it working with emscripten (and native) in a way that I could run the program and have working leetcode solution for the passed number, like `leet(168)`, copied to clipboard.

## build

```sh
cmake -G Ninja -B build
cd build && ninja
./cpproblem
```

## run with wasm

tbd

### 06.02

- have easy leet problem solved to have an example for file reading
- have easy file reader, to be improved with comment stripping, etc.
- stop compiling helpers, use it only for example purposes
- add structure for dsa lib

### 05.02

- tried to compile the app with emscripten so it could be demoed easily.
- OpenCV is not the easiest thing to compile for webassembly, so after spending some time doing that (for now created `emscripten.profile` on `emsdk` branch) i decided to look for some alternatives for image processing that can be compiled from cpp to js
- revamped goals section [commit ref](4483445a054549061a3a344a4b2784f4d7f6e114)
- removed conan and opencv deps

### 04.02

- moved code related to opencv to seperate lib

### 03.02

- added background removal with grabcut (only work with single face right now)
- background removal attempts face detection using haar cascade (model in fixtures), if no face is found it will fall back to centered rectangle (70% of the screen)
- create 3 version of the image to choose from - either decide on one or make it return all three, or return rgbas for this, so it can be recreated by open cv or canvas on the frontend.
- still using `cv::imshow` + `cv::waitKey()` for local debugging, need to be removed when using it in apps.

todos:

- ~~move opencv related code to `lib/` folder, create own `CMakeLists.txt`~~ -> 04.02
- compile with emscripten
- combine with index.html demo (+ canvas)

### 02.02

- cv::Mat is always a rectangle, in order to achieve oval blur over faces, you need to create an oval-shaped mask and blend it with original image
- steps to do that are:
  - create blurred version of the face (`cv::Mat blurredFace; cv::GaussianBlur(faceROI, blurredFace, cv::Size(101, 101), 0);`)
  - create a black mask (`cv::Mat mask = cv::Mat::zeros(faceROI.size(), faceROI.type());`)
  - draw a white filled oval on that mask (`cv::ellipse(mask, center, axes, 0, 0, 360, cv::Scalar(255, 255, 255), -1);`)
  - use the mask to copy onle the oval part of blurred image back onto the original (`blurredFace.copyTo(faceROI, mask);)`
- oval fits the square are, by setting axes to half of the width and height of the face box
- rest of the code is ensuring only the oval part is blurred instead of everything "inside the face box"

### 01.02

- FetchContent requires you to manually build the dependency on your local machine (failed for me for OpenCV, used conan instead)
- sample face blurring app in main.cpp (move to seperate lib)
- use conan to install opencv
- use conan presets to build the app `cmake --build --preset conan-release`

### 27.01

- added preferred folder structure for libraries
- setup project with basic cmake and main.cpp
