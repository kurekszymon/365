#include "blurFace.h"

#include <iostream>
#include <string>

#include <opencv2/opencv.hpp>

namespace sk::imageprocessing {

int blurFace() {
  std::string imagePath = "fixtures/input.jpg";
  cv::Mat img = cv::imread(imagePath);

  if (img.empty()) {
    std::cerr << "Could not open or find the image!" << std::endl;
    return -1;
  }

  cv::CascadeClassifier faceCascade;
  if (!faceCascade.load("fixtures/haarcascade_frontalface_default.xml")) {
    // https://github.com/opencv/opencv/blob/master/data/haarcascades/haarcascade_frontalface_default.xml
    std::cerr << "Error loading cascade file!" << std::endl;
    return -1;
  }

  std::vector<cv::Rect> faces;
  cv::Mat gray;
  cv::cvtColor(img, gray,
               cv::COLOR_BGR2GRAY); // detection works better in grayscale
  faceCascade.detectMultiScale(gray, faces, 1.1, 10);

  for (const auto &face : faces) {
    cv::Mat faceROI = img(face);

    cv::Mat blurredFace;
    cv::GaussianBlur(faceROI, blurredFace, cv::Size(101, 101),
                     0); // cv::Size dictates how blurred the face should be

    cv::Mat mask = cv::Mat::zeros(faceROI.size(), faceROI.type());
    cv::Point center(faceROI.cols / 2, faceROI.rows / 2);
    cv::Size axes(faceROI.cols / 2, faceROI.rows / 2);

    cv::ellipse(mask, center, axes, 0, 0, 360, cv::Scalar(255, 255, 255), -1);

    blurredFace.copyTo(faceROI, mask);
  }

  cv::imwrite("fixtures/output.jpg", img);
  cv::imshow("Blurred Faces", img);
  cv::waitKey(0);
  return 0;
}

} // namespace sk::imageprocessing
