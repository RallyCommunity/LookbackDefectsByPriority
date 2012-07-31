Lookback_Defects_By_Priority
============================

Defects by priority chart using the Rally Lookback API.

Generate App-debug.html by running:
rake debug

Generate ./deploy/App.html by running:
rake build

To run JSLint checks, do the following before running rake build:
export ENABLE_JSLINT='true'

To run the app from outside Rally, you need to run it from Chrome with the cross-site scripting security disabled by doing the following on Windows:

    %LOCALAPPDATA%\Google\Chrome\Application\chrome.exe --disable-web-security --allow-file-access-from-files --allow-cross-origin-auth-prompt

On Mac:

    cd /Applications
    open Google\ Chrome.app --args --disable-web-security --allow-file-access-from-files --allow-cross-origin-auth-prompt
