#/bin/bash

# check we have our deps
command -v git > /dev/null || { echo "missing git"; exit 1; }
command -v jq > /dev/null || { echo "missing jq"; exit 1; }
command -v npm > /dev/null || { echo "missing npm"; exit 1; }

function git_dirty {
  [[ $(git diff --shortstat 2> /dev/null | tail -n1) != "" ]]
}

# check there's nothing unstaged/uncommited in working dir
git_dirty && echo "unstaged/commited changes" && exit 1

VERSION="$1"

# strips off the v from your input
VERSION=$(echo $VERSION | sed 's/^v//g')

if [ "${VERSION}" = "" ]; then
    echo "version argument required"
    exit 1
fi

# give user a chance to cancel process
echo "v${VERSION} ok? (exit if not)"
read OK

# update package.json version
cat package.json | jq ".version = \"${VERSION}\"" > tmp.$$.json && mv tmp.$$.json package.json

# commit package.json change
git commit -m "v${VERSION}" package.json || exit 1

# npm install for latest deps before we grunt build
npm install || exit 1

# grunt build
grunt build || exit 1

# commit grunt build
git commit -am "build for release" || exit 1

# tag version
git tag v${VERSION} || exit 1

# push with tags
git push || exit 1
git push --tags || exit 1

# publish to npm
npm publish
