#!/usr/bin/env bash

conan install . --output-folder=conan --build=missing -c tools.cmake.cmaketoolchain:generator=Ninja