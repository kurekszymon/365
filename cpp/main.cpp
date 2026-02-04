#include <print>

#include "helpers/returnNumber.h"
#include "imageprocessing/blurFace.h"
#include "imageprocessing/removeBackground.h"

int main() {
  int number = sk::helpers::returnNumber();
  std::print("hello from print {}", number);

  sk::imageprocessing::removeBackground();
  sk::imageprocessing::blurFace();

  return 0;
}
