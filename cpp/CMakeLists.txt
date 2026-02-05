cmake_minimum_required(VERSION 4.1.2)

project(SK/Tools)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

add_subdirectory(lib)

add_executable(tools)

target_link_libraries(tools
  PRIVATE
  helpers
)

target_sources(tools
  PRIVATE
  main.cpp
)
