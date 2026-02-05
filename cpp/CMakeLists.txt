cmake_minimum_required(VERSION 4.1.2)

project(SK/DSA)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

add_subdirectory(lib)

add_executable(cpproblem)

target_link_libraries(cpproblem
  PRIVATE
  dsa
)

target_sources(cpproblem
  PRIVATE
  main.cpp
)
