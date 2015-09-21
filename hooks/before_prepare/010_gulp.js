#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var sys = require('sys');
var exec = require('child_process').exec;
var rootdir = process.argv[2];

if (rootdir) {
    exec("gulp");
}
