#include "readfile.h"
#include <fstream>
#include <sstream>
#include <stdexcept>

namespace sk::dsa {

std::string read_file_contents(const std::filesystem::path &filepath) {
  std::ifstream file(filepath);
  if (!file) {
    throw std::runtime_error("Failed to open file: " + filepath.string());
  }

  std::ostringstream buffer;
  buffer << file.rdbuf();
  std::string content = buffer.str();

  // TODO: strip comments based on argument

  return content;
}

} // namespace sk::dsa
