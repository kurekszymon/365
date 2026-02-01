#include <print>

#include <opencv2/opencv.hpp>
#include <iostream>

#include "helpers/returnNumber.h"

int main()
{
  int number = sk::helpers::returnNumber();
  std::print("hello from print {}", number);

  std::string imagePath = "fixtures/input.jpg";
  cv::Mat img = cv::imread(imagePath);

  if (img.empty())
  {
    std::cerr << "Could not open or find the image!" << std::endl;
    return -1;
  }

  cv::CascadeClassifier faceCascade;
  if (!faceCascade.load("fixtures/haarcascade_frontalface_default.xml"))
  {
    // https://github.com/opencv/opencv/blob/master/data/haarcascades/haarcascade_frontalface_default.xml
    std::cerr << "Error loading cascade file!" << std::endl;
    return -1;
  }

  std::vector<cv::Rect> faces;
  cv::Mat gray;
  cv::cvtColor(img, gray, cv::COLOR_BGR2GRAY); // detection works better in grayscale
  faceCascade.detectMultiScale(gray, faces, 1.1, 10);

  for (const auto &face : faces)
  {
    cv::Mat faceROI = img(face);

    cv::GaussianBlur(faceROI, faceROI, cv::Size(51, 51), 0);
  }

  cv::imwrite("output.jpg", img);
  cv::imshow("Blurred Faces", img);
  cv::waitKey(0);

  return 0;
}