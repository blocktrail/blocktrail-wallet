BlockTrail NodeJS SDK Release Process
=====================================

 - update `docs/CHANGELOG.md` to moving 'Next Release' things into `vX` section

 - `./node_modules/jscs/bin/jscs main.js lib/ test/ && ./node_modules/jscs/bin/jscs main.js main.js lib/ test/`

 - `git submodule update --init --recursive`

 - `grunt build`
 
 - `git commit -m "build for release" build/`

 - `npm version "major|minor|patch|prerelease"`
 
 - `npm publish`

 - `git push; git push --tags`
