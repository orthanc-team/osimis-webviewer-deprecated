#include <string>
#include <orthanc/OrthancCPlugin.h>
#include <json/writer.h>
#include <boost/lexical_cast.hpp>
#include <boost/thread/lock_guard.hpp> 
#include <boost/scope_exit.hpp>

#include "../../Orthanc/Core/OrthancException.h" // for throws
#include "../../Orthanc/Core/DicomFormat/DicomMap.h"
#include "../ViewerToolbox.h" // for OrthancPlugins::get*FromOrthanc && OrthancPluginImage
#include "../BenchmarkHelper.h" // for BENCH(*)
#include "../OrthancContextManager.h" // for context_ global

#include "ImageRepository.h"
#include "ImageContainer/RawImageContainer.h" // For orthanc frame retrieval
#include "ImageContainer/CornerstoneKLVContainer.h" // For cached image retrieval
#include "ImageContainer/CompressedImageContainer.h" // For orthanc pixeldata retrieval
#include "ImageProcessingPolicy/PixelDataQualityPolicy.h" // For orthanc pixeldata retrieval
#include "ScopedBuffers.h"

namespace
{
void _loadDicomTags(Json::Value& jsonOutput, const std::string& instanceId);
std::string _getAttachmentNumber(int frameIndex, const IImageProcessingPolicy* policy);
}

ImageRepository::ImageRepository(DicomRepository* dicomRepository)
  : _cachedImageStorageEnabled(true), _dicomRepository(dicomRepository)
{
}


Image* ImageRepository::GetImage(const std::string& instanceId, uint32_t frameIndex, IImageProcessingPolicy* policy, bool enableCache) const
{
  // Return uncached image
  if (!enableCache || !isCachedImageStorageEnabled()) {
    return this->_LoadImageFromOrthanc(instanceId, frameIndex, policy);
  }
  // Return cached image (& save in cache if uncached)
  else {
    // Define attachment name based upon policy
    std::string attachmentNumber = _getAttachmentNumber(frameIndex, policy);

    // Retrieve cached image
    Image* image = this->_GetProcessedImageFromCache(attachmentNumber, instanceId, frameIndex);
    
    // Load & cache image if not found
    if (image == 0) {
      // Load image
      image = this->_LoadImageFromOrthanc(instanceId, frameIndex, policy);

      // Cache image
      this->_CacheProcessedImage(attachmentNumber, image);
    }

    // Return image
    return image;
  }

}

void ImageRepository::CleanImageCache(const std::string& instanceId, uint32_t frameIndex, IImageProcessingPolicy* policy) const
{
  // set cache url
  std::string attachmentNumber = _getAttachmentNumber(frameIndex, policy);
  std::string url = "/instances/" + instanceId + "/attachments/" + attachmentNumber;

  // send clean url request
  OrthancPluginErrorCode error;
  {
    BENCH(FILE_CACHE_CLEAN);
    error = OrthancPluginRestApiDelete(OrthancContextManager::Get(), url.c_str());
    // @todo manage error
  }
}

Image* ImageRepository::_LoadImageFromOrthanc(const std::string& instanceId, uint32_t frameIndex, IImageProcessingPolicy* policy) const {
  BENCH_LOG(IMAGE_FORMATING, "");

  // boost::lock_guard<boost::mutex> guard(mutex_); // make sure the memory amount doesn't overrise

  // Load dicom tags
  Json::Value dicomTags;
  _loadDicomTags(dicomTags, instanceId);

  // Load frame - Either directly from orthanc (without decompression/recompression; when PixelData route is called),
  // or with a compression done by the plugin (when Policy is not PixelData; slower)
  Image* image = 0;

  // Load already compressed instance frame (if the policy type is PixelDataQuality, because it's faster
  // then loading the dicom file & checking the transferSyntax tag)
  if (dynamic_cast<PixelDataQualityPolicy*>(policy) != NULL) {
    BENCH(GET_FRAME_FROM_DICOM__RAW);
    //boost::lock_guard<boost::mutex> guard(mutex_); // check what happens if only one thread asks for frame at a time

    // Retrieve dicom header tags (for transferSyntax which determine PixelData format)
    //   Get instance's dicom file
    OrthancPluginMemoryBuffer dicom; // no need to free - memory managed by dicomRepository
    _dicomRepository->getDicomFile(instanceId, dicom);

    //   Clean dicom file (at scope end)
    BOOST_SCOPE_EXIT(_dicomRepository, &instanceId) {
      _dicomRepository->decrefDicomFile(instanceId);
    } BOOST_SCOPE_EXIT_END;
    //   Get instance's tags (the DICOM meta-informations)
    Orthanc::DicomMap headerTags;
    if (!Orthanc::DicomMap::ParseDicomMetaInformation(headerTags, reinterpret_cast<const char*>(dicom.data), dicom.size))
    {
      throw Orthanc::OrthancException(static_cast<Orthanc::ErrorCode>(OrthancPluginErrorCode_CorruptedFile));
    }

    // Retrieve the frame as Raw PixelData
    OrthancPluginMemoryBuffer frame;
    std::string url = "/instances/" + instanceId + "/frames/" + boost::lexical_cast<std::string>(frameIndex) + "/raw";
    OrthancPluginErrorCode error = OrthancPluginRestApiGet(OrthancContextManager::Get(), &frame, url.c_str());

    // Throw exception on error
    if (error != OrthancPluginErrorCode_Success) {
      throw Orthanc::OrthancException(static_cast<Orthanc::ErrorCode>(error));
    }

    // Store the frame inside
    CompressedImageContainer* data = new CompressedImageContainer(frame);
 
    image = new Image(instanceId, frameIndex, data, headerTags, dicomTags);
  }
  // Load bitmap orthanc instance frame
  else {
    BENCH(GET_FRAME_FROM_DICOM);

    //boost::lock_guard<boost::mutex> guard(mutex_); // check what happens if only one thread asks for frame at a time

    // Retrieve dicom file
    OrthancPluginMemoryBuffer dicom;
    _dicomRepository->getDicomFile(instanceId, dicom);

    // @note dicom tags could be gathered from DICOM instance in this case

    // Retrieve frame from dicom file
    OrthancPluginImage* frame = OrthancPluginDecodeDicomImage(OrthancContextManager::Get(),
                  reinterpret_cast<const void*>(dicom.data), dicom.size, frameIndex);

    // Clean DICOM file memory once the frame has been retrieved from the dicom file - @todo call on exception
    _dicomRepository->decrefDicomFile(instanceId);

    // Store the frame inside a container
    RawImageContainer* data = new RawImageContainer(frame);

    image = new Image(instanceId, frameIndex, data, dicomTags);
  }

  if (policy != NULL) {
    image->ApplyProcessing(policy);
  }

  return image;
}

Image* ImageRepository::_GetProcessedImageFromCache(const std::string &attachmentNumber, const std::string& instanceId, uint32_t frameIndex) const {
  // if not found - create
  // if found - retrieve
  OrthancPluginMemoryBuffer getResultBuffer; // will be adopted by CornerstoneKLVContainer if the request succeeds
  getResultBuffer.data = NULL;

  // store attachment
  // /{resourceType}/{id}/attachments/{name}
  // -> no result
  // -> data : Unknown Resource
  // -> unregistered attachment name : inexistent item

  // Get attachment content
  OrthancPluginErrorCode error;
  std::string url = "/instances/" + instanceId + "/attachments/" + attachmentNumber + "/data";
  {
    BENCH(FILE_CACHE_RETRIEVAL);
    error = OrthancPluginRestApiGet(OrthancContextManager::Get(), &getResultBuffer, url.c_str());
  }

  // Except Orthanc to accept attachmentNumber (it should be a number > 1024)
  assert(error != OrthancPluginErrorCode_InexistentItem);

  // Cache available - send retrieved file
  if (error == OrthancPluginErrorCode_Success)
  {
    // NO METADATA ?
    // unstable...
    CornerstoneKLVContainer* data = new CornerstoneKLVContainer(getResultBuffer); // takes getResultBuffer memory ownership
    Image* image = new Image(instanceId, frameIndex, data); // takes data memory ownership
    
    return image;
  }
  // No cache available
  else if (error == OrthancPluginErrorCode_UnknownResource) {
    // Make sure there won't be any leak since getResultBuffer is not deleted if not adopted by the KLV Container
    assert(getResultBuffer.data == NULL);
    return 0;
  }
  // Unknown error - throw
  else
  {
    // Make sure there won't be any leak since getResultBuffer is not deleted if not adopted by the KLV Container
    assert(getResultBuffer.data == NULL);
    throw Orthanc::OrthancException(static_cast<Orthanc::ErrorCode>(error));
  }
}

void ImageRepository::_CacheProcessedImage(const std::string &attachmentNumber, const Image* image) const {
  // Create content & save cache
  BENCH(FILE_CACHE_CREATION);

  // Save file
  ScopedOrthancPluginMemoryBuffer putResultBuffer(OrthancContextManager::Get());
  std::string url = "/instances/" + image->GetId() + "/attachments/" + attachmentNumber; // no "/data"
  // @todo avoid Orthanc throwing PluginsManager.cpp:194] Exception while invoking plugin service 3001: Unknown resource
  OrthancPluginErrorCode error = OrthancPluginRestApiPut(OrthancContextManager::Get(), putResultBuffer.getPtr(), url.c_str(), image->GetBinary(), image->GetBinarySize());

  // Throw exception on error
  if (error != OrthancPluginErrorCode_Success) {
    throw Orthanc::OrthancException(static_cast<Orthanc::ErrorCode>(error));
  }
}

namespace
{
using namespace OrthancPlugins;

void _loadDicomTags(Json::Value& jsonOutput, const std::string& instanceId)
{
  BENCH(LOAD_JSON);
  if (!GetJsonFromOrthanc(jsonOutput, OrthancContextManager::Get(), "/instances/" + instanceId + "/simplified-tags")) {
    throw Orthanc::OrthancException(Orthanc::ErrorCode_UnknownResource);
  }
}

std::string _getAttachmentNumber(int frameIndex, const IImageProcessingPolicy* policy)
{
  assert(policy != NULL);

  std::string attachmentNumber;
  std::string policyString = policy->ToString();
  int attachmentPrefix = 10000;
  int maxFrameCount = 1000; // @todo use adaptative maxFrameCount !

  // Except to cache only specified policies
  assert(policyString == "pixeldata-quality" || policyString == "high-quality" || policyString == "medium-quality" ||
         policyString == "low-quality");

  if (policyString == "pixeldata-quality") {
    attachmentNumber = boost::lexical_cast<std::string>(attachmentPrefix + maxFrameCount * 3 + frameIndex);
  }
  else if (policyString == "high-quality") {
    attachmentNumber = boost::lexical_cast<std::string>(attachmentPrefix + maxFrameCount * 0 + frameIndex);
  }
  else if (policyString == "medium-quality") {
    attachmentNumber = boost::lexical_cast<std::string>(attachmentPrefix + maxFrameCount * 1 + frameIndex);
  }
  else if (policyString == "low-quality") {
    attachmentNumber = boost::lexical_cast<std::string>(attachmentPrefix + maxFrameCount * 2 + frameIndex);
  }

  return attachmentNumber;
}
}