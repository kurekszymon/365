#include <filesystem>
#include <print>

#include "dsa/readfile.h"

int main() {
  // accept the file from the client
  std::string filepath = std::filesystem::absolute(
      "../lib/dsa/internal/dsa/88-merge-sorted-array.cpp");
  std::string file_contents = sk::dsa::read_file_contents(filepath);
  std::print("hello from print {}", file_contents);

  return 0;
}
