@echo off

cls
title MWS Restaurant Stage-1
start "" http://localhost:8000/

@echo on

python -m http.server 8000