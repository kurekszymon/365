cmake_minimum_required(VERSION 4.1.2)

project(SK/Tools)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

add_subdirectory(lib)

find_package(OpenCV REQUIRED)

add_executable(tools)

target_link_libraries(tools
  PRIVATE
  helpers

  opencv::opencv
)

target_sources(tools
  PRIVATE
  main.cpp
)
