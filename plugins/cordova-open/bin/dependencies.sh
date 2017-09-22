#!/bin/bash
set -ev

# Install Cordova
npm install -g cordova

# Create Cordova project
cordova create $HOME/testApp com.disusered.test Test
cd $HOME/testApp

# Install Android platform
cordova platform add android

# Install test framework
cordova plugin add \
  http://git-wip-us.apache.org/repos/asf/cordova-plugin-test-framework.git

# Add plugin and tests
cordova plugin add $TRAVIS_BUILD_DIR
cordova plugin add $TRAVIS_BUILD_DIR/tests
