Lookback_Defects_By_Priority
============================

Defects by priority chart using the Rally Lookback API.

Generate App-debug.html by running:
rake debug

Generate ./deploy/App.html by running:
rake build

To run JSLint checks, do the following before running rake build:
export ENABLE_JSLINT='true'
Note, that this won't work at the moment though, as lumenzie currently requires us to use require(), which isn't recognized as declared.

