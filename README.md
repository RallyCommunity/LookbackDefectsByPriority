Lookback_Defects_By_Priority
============================

Defects by priority chart using the Rally Lookback API.

Generate App-debug.html by running
rake debug

Generate App.html by running
rake build

Note, due to having to use require() for lumenize at the moment, you'll have to first do
export DISABLE_JSLINT='true'
to disable the failing JSLint check.

