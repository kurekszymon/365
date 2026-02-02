# cpp

over 2025 i did get a chance to work on project using WebAssembly (C++), which got me interested in it, for god know's why.

i want to keep journal on what I did each day for this part especially to see if I get better understanding of a language or will I drop it soon after.

## goals

goals for this part of the repo would probably be changed / added over the time i will work on this.
ideally it would be a set of tools that i will use
initially I have thought that I would like to create an app with

- proper division on libs / apps / core project
- use CMake to build project (wanted to try bazel but just from reading about it, it doesn't seem to be a popular choice - want to have ease of finding materials on why things won't build)
- probably use conan to manage dependencies (probably as I needed to migrate off of conan in my first cpp project, as FTXUI was outdated at that time in conan artifactory, so I replaced with FetchContent) - [commit ref](https://github.com/kurekszymon/eddy.sh.cpp/commit/a18de8ad5606f3561d0b921ddebb235cb8c0177e)
- i most certainly want to:
  - use sqlite to check how to talk to DB with cpp (are there any orms?)
  - use ffmpeg (app idea to have a shared cpp backend and build it per platform with bridges like swig/wasm) - make it easy to record and stack clips (i dont want to learn any graphics software)
  - use opencv for various tasks i.e. blurring faces

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
