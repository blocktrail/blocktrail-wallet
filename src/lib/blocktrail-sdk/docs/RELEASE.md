BlockTrail NodeJS SDK Release Process
=====================================

 - update `docs/CHANGELOG.md` to moving 'Next Release' things into `vX` section

 - `git submodule update --init --recursive`

 - `grunt build`
 
 - `git commit -m "build for release" build/`

 - `npm version "major|minor|patch|prerelease"`
 
 - `npm publish`

 - `git push; git push --tags`
