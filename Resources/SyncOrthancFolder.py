#!/usr/bin/python

#
# This maintenance script updates the content of the "Orthanc" folder
# to match the latest version of the Orthanc source code.
#

import os
import shutil

SOURCE = '/home/jodogne/Subversion/Orthanc'
TARGET = os.path.join(os.path.dirname(__file__), '..', 'Orthanc')

FILES = [
    'Core/ChunkedBuffer.cpp',
    'Core/ChunkedBuffer.h',
    'Core/Enumerations.cpp',
    'Core/Enumerations.h',
    'Core/FileStorage/FilesystemStorage.cpp',
    'Core/FileStorage/FilesystemStorage.h',
    'Core/FileStorage/IStorageArea.h',
    'Core/IDynamicObject.h',
    'Core/ImageFormats/ImageAccessor.cpp',
    'Core/ImageFormats/ImageAccessor.h',
    'Core/ImageFormats/ImageBuffer.cpp',
    'Core/ImageFormats/ImageBuffer.h',
    'Core/ImageFormats/ImageProcessing.cpp',
    'Core/ImageFormats/ImageProcessing.h',
    'Core/ImageFormats/PngReader.cpp',
    'Core/ImageFormats/PngReader.h',
    'Core/ImageFormats/PngWriter.cpp',
    'Core/ImageFormats/PngWriter.h',
    'Core/MultiThreading/SharedMessageQueue.cpp',
    'Core/MultiThreading/SharedMessageQueue.h',
    'Core/OrthancException.cpp',
    'Core/OrthancException.h',
    'Core/PrecompiledHeaders.cpp',
    'Core/PrecompiledHeaders.h',
    'Core/SQLite/Connection.cpp',
    'Core/SQLite/Connection.h',
    'Core/SQLite/FunctionContext.cpp',
    'Core/SQLite/FunctionContext.h',
    'Core/SQLite/IScalarFunction.h',
    'Core/SQLite/ITransaction.h',
    'Core/SQLite/NonCopyable.h',
    'Core/SQLite/OrthancSQLiteException.h',
    'Core/SQLite/Statement.cpp',
    'Core/SQLite/Statement.h',
    'Core/SQLite/StatementId.cpp',
    'Core/SQLite/StatementId.h',
    'Core/SQLite/StatementReference.cpp',
    'Core/SQLite/StatementReference.h',
    'Core/SQLite/Transaction.cpp',
    'Core/SQLite/Transaction.h',
    'Core/Toolbox.cpp',
    'Core/Toolbox.h',
    'Core/Uuid.cpp',
    'Core/Uuid.h',
    'Resources/EmbedResources.py',
    'Resources/MinGWToolchain.cmake',
    'Resources/MinGW-W64-Toolchain32.cmake',
    'Resources/MinGW-W64-Toolchain64.cmake',
    'Resources/CMake/AutoGeneratedCode.cmake',
    'Resources/CMake/BoostConfiguration.cmake',
    'Resources/CMake/Compiler.cmake',
    'Resources/CMake/DownloadPackage.cmake',
    'Resources/CMake/GoogleTestConfiguration.cmake',
    'Resources/CMake/JsonCppConfiguration.cmake',
    'Resources/CMake/LibPngConfiguration.cmake',
    'Resources/CMake/SQLiteConfiguration.cmake',
    'Resources/CMake/ZlibConfiguration.cmake',
    'Resources/ThirdParty/base64/base64.cpp',
    'Resources/ThirdParty/base64/base64.h',
    'Resources/ThirdParty/md5/md5.c',
    'Resources/ThirdParty/md5/md5.h',
    'Resources/ThirdParty/minizip/NOTES',
    'Resources/ThirdParty/minizip/crypt.h',
    'Resources/ThirdParty/minizip/ioapi.c',
    'Resources/ThirdParty/minizip/ioapi.h',
    'Resources/ThirdParty/minizip/zip.c',
    'Resources/ThirdParty/minizip/zip.h',
    'Resources/ThirdParty/VisualStudio/stdint.h',
]

for f in FILES:
    source = os.path.join(SOURCE, f)
    target = os.path.join(TARGET, f)
    try:
        os.makedirs(os.path.dirname(target))
    except:
        pass

    shutil.copy(source, target)