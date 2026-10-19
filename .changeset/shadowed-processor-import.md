---
'@wyw-in-js/transform': patch
---

Stop treating calls to local bindings that shadow a processor import as processor usages. A parameter or inner variable that happens to share the imported name is no longer matched as a processor call.
