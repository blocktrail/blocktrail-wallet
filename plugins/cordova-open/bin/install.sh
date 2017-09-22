#!/bin/bash
set -ev

# Go to Cordova project directory
cd $HOME/testApp

# Build Android APK
cordova build android

# Install APK
adb install platforms/android/build/outputs/apk/android-debug.apk
