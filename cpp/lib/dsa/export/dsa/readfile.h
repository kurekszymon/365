#pragma once

#include <filesystem>
#include <string>

namespace sk::dsa {
std::string read_file_contents(const std::filesystem::path &filepath);
}
