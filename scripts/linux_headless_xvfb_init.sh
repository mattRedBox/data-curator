#!/bin/bash
Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
export DISPLAY=':99.0'
export NODE_OPTIONS="--max-old-space-size=8192"