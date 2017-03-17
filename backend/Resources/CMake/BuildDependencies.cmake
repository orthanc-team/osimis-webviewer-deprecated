# This configure and build all dependencies (including some copied orthanc files)
# Note that the include_directories command affects and is meant for every targets (including those outside of this .cmake file)

# Build dependencies
set(ORTHANC_ROOT ${ORTHANC_DIR}) # required by orthanc's cmake
set(ORTHANC_DISABLE_PATCH ON)  # No need for the "patch" command-line tool
set(USE_SYSTEM_GOOGLE_TEST ON CACHE BOOL "Use the system version of Google Test")
set(USE_GTEST_DEBIAN_SOURCE_PACKAGE OFF CACHE BOOL "Use the sources of Google Test shipped with libgtest-dev (Debian only)")
mark_as_advanced(USE_GTEST_DEBIAN_SOURCE_PACKAGE)
include(CheckIncludeFiles)
include(CheckIncludeFileCXX)
include(CheckLibraryExists)
include(FindPythonInterp)
include(${ORTHANC_DIR}/Resources/CMake/Compiler.cmake)
include(${ORTHANC_DIR}/Resources/CMake/DownloadPackage.cmake) # Required by boost
include(${ORTHANC_DIR}/Resources/CMake/BoostConfiguration.cmake)
include(${ORTHANC_DIR}/Resources/CMake/JsonCppConfiguration.cmake)
include(${ORTHANC_DIR}/Resources/CMake/SQLiteConfiguration.cmake)
include(${ORTHANC_DIR}/Resources/CMake/AutoGeneratedCode.cmake)
include(${RESOURCES_DIR}/CMake/GdcmConfiguration.cmake)
include(${ORTHANC_DIR}/Resources/CMake/GoogleTestConfiguration.cmake)

# Set orthanc config
add_definitions(
  -DORTHANC_SQLITE_STANDALONE=1
  )

add_definitions(
  -DORTHANC_ENABLE_MD5=0
  -DORTHANC_ENABLE_BASE64=0
  -DORTHANC_ENABLE_LOGGING=0
  )

# Include orthanc
include_directories(${ORTHANC_DIR})

# Include GIL boost library - adobe version with numeric extensions
include_directories(SYSTEM ${LOCAL_DEPENDENCIES_DIR}/boost-1_60_0/)
include_directories(SYSTEM ${LOCAL_DEPENDENCIES_DIR}/gil-2_1_1/)

# Check that the Orthanc SDK headers are available or download them
if (STATIC_BUILD OR NOT USE_SYSTEM_ORTHANC_SDK)
  include_directories(${ORTHANC_DIR}/Sdk-1.1.0)
else ()
  CHECK_INCLUDE_FILE_CXX(orthanc/OrthancCPlugin.h HAVE_ORTHANC_H)
  if (NOT HAVE_ORTHANC_H)
    message(FATAL_ERROR "Please install the headers of the Orthanc plugins SDK")
  endif()
endif()

# Build dependencies which are not already considered as external libs (everything else from GCDM, cf. boost, JsonCpp and SQLite)
add_library(WebViewerDependencies
  STATIC

  ${BOOST_SOURCES}
  ${SQLITE_SOURCES}
  ${JSONCPP_SOURCES}

  # Sources inherited from Orthanc core
  ${ORTHANC_DIR}/Core/ChunkedBuffer.cpp
  ${ORTHANC_DIR}/Core/Enumerations.cpp
  ${ORTHANC_DIR}/Core/FileStorage/FilesystemStorage.cpp
  ${ORTHANC_DIR}/Core/Images/ImageAccessor.cpp
  ${ORTHANC_DIR}/Core/Images/ImageBuffer.cpp
  ${ORTHANC_DIR}/Core/Images/ImageProcessing.cpp
  ${ORTHANC_DIR}/Core/MultiThreading/SharedMessageQueue.cpp
  ${ORTHANC_DIR}/Core/SQLite/Connection.cpp
  ${ORTHANC_DIR}/Core/SQLite/FunctionContext.cpp
  ${ORTHANC_DIR}/Core/SQLite/Statement.cpp
  ${ORTHANC_DIR}/Core/SQLite/StatementId.cpp
  ${ORTHANC_DIR}/Core/SQLite/StatementReference.cpp
  ${ORTHANC_DIR}/Core/SQLite/Transaction.cpp
  ${ORTHANC_DIR}/Core/Toolbox.cpp
  ${ORTHANC_DIR}/Core/Uuid.cpp
  ${ORTHANC_DIR}/Core/DicomFormat/DicomMap.cpp
  ${ORTHANC_DIR}/Core/DicomFormat/DicomTag.cpp
  ${ORTHANC_DIR}/Core/DicomFormat/DicomValue.cpp
  ${ORTHANC_DIR}/Core/DicomFormat/DicomArray.cpp
  ${ORTHANC_DIR}/Resources/ThirdParty/base64/base64.cpp

  # The following files depend on GDCM
  ${ORTHANC_DIR}/Plugins/Samples/GdcmDecoder/GdcmImageDecoder.cpp
  ${ORTHANC_DIR}/Plugins/Samples/GdcmDecoder/GdcmDecoderCache.cpp
  ${ORTHANC_DIR}/Plugins/Samples/GdcmDecoder/OrthancImageWrapper.cpp
)

# bind WebViewerDependencies to GDCM so any executable/library embedding 
# WebViewerDependencies.a also embed GDCM.
if (STATIC_BUILD OR NOT USE_SYSTEM_GDCM)
  add_dependencies(WebViewerDependencies GDCM)
endif()
target_link_libraries(WebViewerDependencies ${GDCM_LIBRARIES})

# If using gcc, build WebViewerDependencies with the "-fPIC" argument to allow its
# embedding into the shared library containing the Orthanc plugin
if (${CMAKE_SYSTEM_NAME} STREQUAL "Linux" OR
    ${CMAKE_SYSTEM_NAME} STREQUAL "FreeBSD" OR
    ${CMAKE_SYSTEM_NAME} STREQUAL "kFreeBSD")
  get_target_property(Flags WebViewerDependencies COMPILE_FLAGS)
  if(Flags STREQUAL "Flags-NOTFOUND")
    SET(Flags "-fPIC -ldl")
  else()
    SET(Flags "${Flags} -fPIC")
  endif()
  set_target_properties(WebViewerDependencies PROPERTIES
      COMPILE_FLAGS ${Flags})
  target_link_libraries(WebViewerDependencies -ldl)
endif()