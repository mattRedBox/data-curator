#!/bin/bash
set -ev
unset -f cd
shell_session_update() { :; }
if [ "${TRAVIS_BRANCH}" == "ci" ] || [ "${TRAVIS_BRANCH}" == "testci" ]; then
  git remote set-branches --add origin develop || exit
  git fetch origin develop || exit
  git checkout --track origin/develop || exit
  git checkout ${TRAVIS_BRANCH} || exit
  git merge develop || exit
  sudo rm -Rf rm /tmp/.X*
  export DISPLAY=':99.0'
  Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
  yarn run clean && yarn run pack && yarn run cucumber:postpack:witharg $@
fi
set +e