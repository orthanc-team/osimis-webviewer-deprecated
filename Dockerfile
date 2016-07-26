# Warning:
# This docker file does not build the frontend but download the latest available one from aws
# It does build the backend however

FROM jodogne/orthanc-plugins:1.1.0

RUN DEBIAN_FRONTEND=noninteractive apt-get update; apt-get -y install libgdcm2-dev libjpeg-dev git; rm -rf /var/lib/apt/lists/*

ADD . /root/osimis-webviewer

RUN bash /root/osimis-webviewer/scripts/buildCppLibraryFromDocker.sh "default"

EXPOSE 4242
EXPOSE 8042

ENTRYPOINT [ "Orthanc" ]
CMD [ "/etc/orthanc/orthanc.json" ]
