#include "SeriesFactory.h"

#include <memory>
#include <boost/foreach.hpp>
// #include <json/value.h>
#include <json/json.h>
#include <Core/OrthancException.h>
#include <Core/Toolbox.h>

using namespace Orthanc;

namespace {
  // void _removeInstancesRelatedTags(DicomMap& tags);
}

SeriesFactory::SeriesFactory(std::auto_ptr<IAvailableQualityPolicy> availableQualityPolicy)
    : _availableQualityPolicy(availableQualityPolicy)
{

}

std::auto_ptr<Series> SeriesFactory::CreateSeries(const std::string& seriesId,
                                                  const Json::Value& slicesShort,
                                                  const Orthanc::DicomMap& metaInfoTags,
                                                  const Json::Value& otherTags,
                                                  const Json::Value& instancesTags)
{
  // Retrieve available image formats
  std::set<ImageQuality> imageQualities;
  try {
    imageQualities = _availableQualityPolicy->retrieveByTags(metaInfoTags, otherTags);
  }
  // If the series' middle instance is not an `image` instance, do not propose
  // available image qualities. This may happen when the instance is a PDF 
  // embedded within a DICOM instance for example.
  catch(const std::exception &e) {
    // @todo Rethrow if not a PDF
    // Keep imageQualities empty
  }
  
  // Create the series
  return std::auto_ptr<Series>(new Series(seriesId, otherTags, instancesTags, slicesShort, imageQualities));
}

namespace {

  // void _removeInstancesRelatedTags(DicomMap& tags) {
  //   DicomTag instanceTags[] = {
  //     DicomTag(0x0008, 0x0012),   // InstanceCreationDate
  //     DicomTag(0x0008, 0x0013),   // InstanceCreationTime
  //     DicomTag(0x0020, 0x0012),   // AcquisitionNumber
  //     DICOM_TAG_IMAGE_INDEX,
  //     DICOM_TAG_INSTANCE_NUMBER,
  //     DICOM_TAG_NUMBER_OF_FRAMES,
  //     DICOM_TAG_TEMPORAL_POSITION_IDENTIFIER,
  //     DICOM_TAG_SOP_INSTANCE_UID,
  //     DICOM_TAG_IMAGE_POSITION_PATIENT,    // New in db v6
  //     DICOM_TAG_IMAGE_COMMENTS             // New in db v6
  //   };

  //   BOOST_FOREACH(const DicomTag& tag, instanceTags) {
  //     tags.Remove(tag);
  //   }
  // }

}