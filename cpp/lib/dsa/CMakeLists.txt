add_library(dsa)

target_include_directories(dsa
  PUBLIC
  ${CMAKE_CURRENT_SOURCE_DIR}/export
  PRIVATE
  ${CMAKE_CURRENT_SOURCE_DIR}
)

target_sources(dsa
  PRIVATE
  export/dsa/readfile.cpp
  export/dsa/readfile.h
)
