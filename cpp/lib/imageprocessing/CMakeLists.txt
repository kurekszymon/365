add_library(imageprocessing)

target_include_directories(imageprocessing
  PUBLIC
  ${CMAKE_CURRENT_SOURCE_DIR}/export
  PRIVATE
  ${CMAKE_CURRENT_SOURCE_DIR}
)

find_package(OpenCV REQUIRED)

target_link_libraries(imageprocessing
  PRIVATE
  opencv::opencv
)

target_sources(imageprocessing
  PRIVATE
  export/imageprocessing/blurFace.cpp
  export/imageprocessing/blurFace.h

  export/imageprocessing/removeBackground.cpp
  export/imageprocessing/removeBackground.h
)
