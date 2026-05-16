cmake_minimum_required(VERSION 3.10)
project(tracking_core)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)

# OpenCV 4.10 chưa nhận diện Visual Studio 2026, nên ta sẽ ép CMake dùng thư viện của bản cũ (Tương thích 100% ABI)
set(OpenCV_INCLUDE_DIRS "C:/opencv/build/include")

include_directories(${OpenCV_INCLUDE_DIRS})

# Build DLL
add_library(tracking_core SHARED src/Tracker.cpp)

# Link trực tiếp tới file lib của OpenCV thay vì dùng find_package
target_link_libraries(tracking_core "C:/opencv/build/x64/vc16/lib/opencv_world4100.lib")

# Tự động xuất C-API ra file DLL
set_target_properties(tracking_core PROPERTIES WINDOWS_EXPORT_ALL_SYMBOLS ON)
