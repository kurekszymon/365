add_library(helpers)

target_include_directories(helpers
  PUBLIC
  ${CMAKE_CURRENT_SOURCE_DIR}/export
  PRIVATE
  ${CMAKE_CURRENT_SOURCE_DIR}
)

target_sources(helpers
  PRIVATE
  export/helpers/returnNumber.cpp
  export/helpers/returnNumber.h

  internal/helpers/returnInternalNumber.cpp
  internal/helpers/returnInternalNumber.h
)
