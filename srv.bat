@echo off

cls
title MWS Restaurant Stage-3
IF "%~1" == "" GOTO DB ELSE GOTO SRV

:DB
REM replace yarn with npm to use npm
start "MWS Restaurant Stage-3 backend server" /D %1 yarn start
GOTO SRV

:SRV
start "" http://localhost:8000/
REM remove below line for python 2.x
start "MWS Restaurant Stage-3 main server" python -m http.server 8000
REM uncomment below line for python 2.x
REM start "MWS Restaurant Stage-3 main server" python -m SimpleHTTPServer 8000
exit