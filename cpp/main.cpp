#include <algorithm>
#include <iostream>
#include <print>
#include <string>

#include <opencv2/opencv.hpp>

#include "helpers/returnNumber.h"

int removeBgWithGrabCut() {
  std::string imagePath = "fixtures/input.jpg";
  cv::Mat img = cv::imread(imagePath, cv::IMREAD_COLOR);
  if (img.empty()) {
    return -1;
  }

  cv::Rect initRect;
  bool haveRect = false;
  cv::CascadeClassifier faceCascade;
  if (faceCascade.load("fixtures/haarcascade_frontalface_default.xml")) {
    cv::Mat gray;
    cv::cvtColor(img, gray, cv::COLOR_BGR2GRAY);
    std::vector<cv::Rect> faces;
    faceCascade.detectMultiScale(gray, faces, 1.1, 6);
    if (!faces.empty()) {
      auto face = *std::max_element(faces.begin(), faces.end(),
                                    [](const cv::Rect &a, const cv::Rect &b) {
                                      return a.area() < b.area();
                                    });
      int padX = static_cast<int>(face.width * 0.5);
      int padY = static_cast<int>(face.height * 0.9);
      initRect = face;
      initRect.x = std::max(0, initRect.x - padX / 2);
      initRect.y = std::max(0, initRect.y - padY / 2);
      initRect.width = std::min(img.cols - initRect.x, initRect.width + padX);
      initRect.height = std::min(img.rows - initRect.y, initRect.height + padY);
      haveRect = true;
    }
  }

  if (!haveRect) {
    int w = static_cast<int>(img.cols * 0.7);
    int h = static_cast<int>(img.rows * 0.7);
    initRect = cv::Rect((img.cols - w) / 2, (img.rows - h) / 2, w, h);
  }

  cv::Mat mask(img.rows, img.cols, CV_8UC1, cv::Scalar(cv::GC_BGD));
  cv::Mat bgdModel, fgdModel;
  cv::grabCut(img, mask, initRect, bgdModel, fgdModel, 5,
              cv::GC_INIT_WITH_RECT);

  // apparently not perfect since it relies on boolean-to-uint and clamping
  // under the hood, according to llms should use inRange + bitwise_or, but it's
  // much more verbose. #todo, do some research
  cv::Mat foregroundMask = (mask == cv::GC_FGD) | (mask == cv::GC_PR_FGD);
  foregroundMask.convertTo(foregroundMask, CV_8UC1, 255);

  // alpha only png
  cv::imwrite("fixtures/output_with_alpha.png", foregroundMask);

  //  BGRA image with alpha = foregroundMask
  cv::Mat bgra;
  cv::cvtColor(img, bgra, cv::COLOR_BGR2BGRA);
  std::vector<cv::Mat> ch;
  cv::split(bgra, ch);
  ch[3] = foregroundMask;
  cv::merge(ch, bgra);
  cv::imwrite("fixtures/output_4_channel.png", bgra);

  // composite onto white bg with mask
  cv::Mat white(img.size(), img.type(), cv::Scalar(255, 255, 255));
  cv::Mat composited = white.clone();
  img.copyTo(composited, foregroundMask);
  cv::imwrite("fixtures/output_composited.png", composited);

  cv::imshow("Label!", composited);
  cv::waitKey(0);
  return 0;
}

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

int main() {
  int number = sk::helpers::returnNumber();
  std::print("hello from print {}", number);

  removeBgWithGrabCut();
  blurFace();

  return 0;
}
