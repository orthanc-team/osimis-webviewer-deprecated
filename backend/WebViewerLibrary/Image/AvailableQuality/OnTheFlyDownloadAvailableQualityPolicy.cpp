#include "OnTheFlyDownloadAvailableQualityPolicy.h"

#include <boost/regex.hpp>
#include <boost/lexical_cast.hpp>
#include <orthanc/OrthancCPlugin.h>
#include <Core/OrthancException.h>
#include <Core/Toolbox.h>
#include "../../BenchmarkHelper.h"
#include "ViewerToolbox.h"

bool OnTheFlyDownloadAvailableQualityPolicy::_isLargerThan(
                                                              uint32_t width,
                                                              uint32_t height,
                                                              const Json::Value& otherTags)
{
  int columns = boost::lexical_cast<int>(OrthancPlugins::SanitizeTag("Columns", otherTags["Columns"]).asString());
  int rows = boost::lexical_cast<int>(OrthancPlugins::SanitizeTag("Rows", otherTags["Rows"]).asString());

  return columns > width && rows > height;
}

bool OnTheFlyDownloadAvailableQualityPolicy::_isAlreadyCompressedWithinDicom(
                                                              const Json::Value& headerTags)
{
  using namespace Orthanc;

  // Retrieve transfer syntax
  std::string transferSyntax = headerTags["TransferSyntax"].asString();

  BENCH_LOG("TRANSFER_SYNTAX", transferSyntax);

  // Add either PIXELDATA or LOSSLESS quality based on transfer syntax
  boost::regex regexp("^1\\.2\\.840\\.10008\\.1\\.2\\.4\\.(\\d\\d)$");
  boost::cmatch matches;
  try {
    // Provide direct raw file if the raw is already compressed.
    // Only accept formats that are supported by the frontend.
    if (boost::regex_match(transferSyntax.c_str(), matches, regexp) && (
        // see http://www.dicomlibrary.com/dicom/transfer-syntax/
        boost::lexical_cast<uint32_t>(matches[1]) == 50 || // Lossy JPEG 8-bit Image Compression
        // boost::lexical_cast<uint32_t>(matches[1]) == 51 || // Lossy JPEG 12-bit Image Compression
        // boost::lexical_cast<uint32_t>(matches[1]) == 57 || // JPEG Lossless, Nonhierarchical (Processes 14) 
        boost::lexical_cast<uint32_t>(matches[1]) == 70 )// || // JPEG Lossless, Nonhierarchical, First-Order Prediction (Default Transfer Syntax for Lossless JPEG Image Compression)
        // boost::lexical_cast<uint32_t>(matches[1]) == 80 || // JPEG-LS Lossless Image Compression
        // boost::lexical_cast<uint32_t>(matches[1]) == 81 || // JPEG-LS Lossy (Near- Lossless) Image Compression
        // boost::lexical_cast<uint32_t>(matches[1]) == 90 || // JPEG 2000 Image Compression (Lossless Only)
        // boost::lexical_cast<uint32_t>(matches[1]) == 91 || // JPEG 2000 Image Compression
        // boost::lexical_cast<uint32_t>(matches[1]) == 92 || // JPEG 2000 Part 2 Multicomponent Image Compression (Lossless Only)
        // boost::lexical_cast<uint32_t>(matches[1]) == 93 ) // JPEG 2000 Part 2 Multicomponent Image Compression

        // boost::lexical_cast<uint32_t>(matches[1]) == 94 || // JPIP Referenced 
        // boost::lexical_cast<uint32_t>(matches[1]) == 95 )  // JPIP Referenced Deflate
    ) {
      return true;
    }
    // Compress data manually if the raw format is not supported
    else {
      return false;
    }
  }
  catch (const boost::bad_lexical_cast&) {
    assert(false); // should not happen (because of regex)
    return false;
  }
}

std::set<ImageQuality> OnTheFlyDownloadAvailableQualityPolicy::retrieveByTags(
                                                              const Json::Value& headerTags,
                                                              const Json::Value& otherTags)
{
  using namespace Orthanc;

  std::set<ImageQuality> result;

  // Decompressing<->Recompression takes time, so we avoid recompressing dicom images at all cost
  if (_isAlreadyCompressedWithinDicom(headerTags)) {
    // Set thumbnails only on medium sized images
    if (_isLargerThan(750, 750, otherTags["TagsSubset"])) {
      result.insert(ImageQuality(ImageQuality::LOW)); // 150x150 jpeg80
      BENCH_LOG("QUALITY", "low");
    }

    // Always set HQ/RAW (for medical reasons)
    result.insert(ImageQuality(ImageQuality::PIXELDATA)); // raw file (unknown format)
    BENCH_LOG("QUALITY", "pixeldata");
  }
  // When image is present in RAW format within dicom, we do additional compression
  else {
    // Always provide thumbnail quality image (even if image is <150x150 since optimization includes
    // dynamic reduction and lq jpeg compression instead of lossless)
    result.insert(ImageQuality(ImageQuality::LOW)); // 150x150 jpeg80
    BENCH_LOG("QUALITY", "low");

    // Set MQ on large images
    if (_isLargerThan(1000, 1000, otherTags["TagsSubset"])) {
      result.insert(ImageQuality(ImageQuality::MEDIUM)); // 1000x1000 jpeg80
      BENCH_LOG("QUALITY", "medium");
    }

    // Always set HQ/Lossless (for medical reasons)
    result.insert(ImageQuality(ImageQuality::LOSSLESS)); // lossless png
    BENCH_LOG("QUALITY", "lossless");
  }

  return result;
}
