#include <print>
#include <format>

#include "helpers/returnNumber.h"

int main()
{
  int number = sk::helpers::returnNumber();
  std::print("hello from print {}", number);

  return 0;
}